import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';

export interface ProjectInfo {
  name: string;
  path: string;
  source: string;
  isSymlink: boolean;
  targetPath?: string;
  usesPostgres: boolean;
  usesRedis: boolean;
  usesQdrant: boolean;
  connectedDbs: string[];
  detectedVars: string[];
  services: string[];
}

const EXCLUDE_DIRS = new Set([
  'node_modules',
  '.git',
  '.next',
  '.turbo',
  'dist',
  'build',
  'db-dashboard',
  '.DS_Store',
  '.angular',
  '.vscode',
  '.idea',
  '.cache',
  '.venv',
  '__pycache__',
  'assets',
]);

const CODE_CONFIG_NAMES = new Set([
  'docker-compose.yml',
  'docker-compose.yaml',
  'database.py',
  'db.py',
  'settings.py',
  'config.py',
  'models.py',
  'database.ts',
  'database.js',
  'db.ts',
  'db.js',
  'ormconfig.ts',
  'ormconfig.js',
  'drizzle.config.ts',
  'knexfile.js',
  'knexfile.ts',
]);

function findConfigFiles(dir: string, depth = 0, maxDepth = 5): string[] {
  if (depth > maxDepth) return [];
  const results: string[] = [];
  try {
    const entries = fsSync.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (EXCLUDE_DIRS.has(entry.name)) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...findConfigFiles(fullPath, depth + 1, maxDepth));
      } else if (
        entry.name.startsWith('.env') ||
        entry.name.endsWith('.prisma') ||
        CODE_CONFIG_NAMES.has(entry.name)
      ) {
        results.push(fullPath);
      }
    }
  } catch {
    // Skip unreadable directories
  }
  return results;
}

export async function scanProjects(): Promise<ProjectInfo[]> {
  const projectsEnv =
    process.env.PROJECTS_DIR ||
    '/Users/andrey/Development/projects,/Users/andrey/Development/playground';

  const baseDirs = projectsEnv
    .split(',')
    .map((d) => d.trim())
    .filter(Boolean);

  const projects: ProjectInfo[] = [];

  for (const baseDir of baseDirs) {
    let entries;
    try {
      entries = await fs.readdir(baseDir, { withFileTypes: true });
    } catch {
      continue;
    }

    const sourceName = path.basename(baseDir);

    for (const entry of entries) {
      if (EXCLUDE_DIRS.has(entry.name)) continue;
      if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;

      const projectPath = path.join(baseDir, entry.name);
      let realPath = projectPath;
      let targetPath: string | undefined = undefined;

      try {
        if (entry.isSymbolicLink()) {
          targetPath = await fs.readlink(projectPath);
        }
        realPath = fsSync.realpathSync(projectPath);
      } catch {
        // Continue with original path if resolve fails
      }

      const configFiles = findConfigFiles(realPath, 0, 5);
      const envVars: Record<string, string> = {};
      const connectedDbs = new Set<string>();
      const services = new Set<string>();

      for (const filePath of configFiles) {
        const rel = path.relative(realPath, filePath);
        const parts = rel.split(path.sep);
        if (parts.length > 1) {
          const serviceName = parts[parts.length - 2];
          if (serviceName && serviceName !== '.' && !serviceName.startsWith('.')) {
            services.add(serviceName);
          }
        }

        const fileName = path.basename(filePath);

        try {
          const content = await fs.readFile(filePath, 'utf8');

          // 1. Line-by-line parsing for env files
          if (fileName.startsWith('.env')) {
            for (const line of content.split('\n')) {
              const trimmed = line.trim();
              if (!trimmed || trimmed.startsWith('#')) continue;
              const eqIndex = trimmed.indexOf('=');
              if (eqIndex === -1) continue;
              const key = trimmed.slice(0, eqIndex).trim();
              const value = trimmed.slice(eqIndex + 1).trim().replace(/^["']|["']$/g, '');
              envVars[key] = value;
            }
          }

          // 2. Scan entire file content for PostgreSQL connection URIs (handles .env, database.py, settings.py, etc.)
          const pgMatches = content.match(
            /postgres(?:ql)?(?:\+[a-z0-9_]+)?:\/\/[^\s"'`),;]+/gi
          );
          if (pgMatches) {
            for (const match of pgMatches) {
              const cleanUrl = match.replace(
                /^postgres(?:ql)?\+[a-z0-9_]+:\/\//i,
                'postgresql://'
              );
              try {
                const parsedUrl = new URL(cleanUrl);
                const dbName = parsedUrl.pathname.replace(/^\//, '').split('?')[0];
                if (dbName && dbName !== 'postgres') {
                  connectedDbs.add(dbName);
                }
              } catch {
                const nameMatch = cleanUrl.match(/\/([a-zA-Z0-9_-]+)(?:\?|$)/);
                if (nameMatch && nameMatch[1] && nameMatch[1] !== 'postgres') {
                  connectedDbs.add(nameMatch[1]);
                }
              }
            }
            envVars[`DB_CONFIG (${fileName})`] = 'PostgreSQL';
          }

          // 3. Scan for Redis
          if (
            content.includes('redis://') ||
            content.includes('6379') ||
            fileName.includes('redis')
          ) {
            const redisMatches = content.match(/redis(?:\+tls)?:\/\/[^\s"'`),;]+/gi);
            if (redisMatches || content.includes('6379')) {
              envVars[`REDIS_CONFIG (${fileName})`] = 'Redis';
            }
          }

          // 4. Scan for Qdrant
          if (
            content.includes('6333') ||
            content.toLowerCase().includes('qdrant')
          ) {
            envVars[`QDRANT_CONFIG (${fileName})`] = 'Qdrant';
          }

          // 5. Prisma postgres check
          if (fileName.endsWith('.prisma') && content.includes('postgresql')) {
            envVars['PRISMA_POSTGRES'] = 'true';
          }
        } catch {
          // Unreadable file, skip
        }
      }

      const allValues = Object.values(envVars).join(' ').toLowerCase();
      const allKeys = Object.keys(envVars).join(' ').toLowerCase();
      const combined = allValues + ' ' + allKeys;

      const usesPostgres =
        combined.includes('postgres') ||
        combined.includes('5432') ||
        combined.includes('database_url') ||
        connectedDbs.size > 0;
      const usesRedis = combined.includes('redis') || combined.includes('6379');
      const usesQdrant = combined.includes('qdrant') || combined.includes('6333');

      // Filter display variables
      const detectedVars = Object.keys(envVars).filter((k) => {
        const kl = k.toLowerCase();
        const vl = (envVars[k] || '').toLowerCase();
        return (
          kl.includes('database') ||
          kl.includes('postgres') ||
          kl.includes('prisma') ||
          kl.includes('redis') ||
          kl.includes('qdrant') ||
          kl.includes('config') ||
          vl.includes('5432') ||
          vl.includes('6379') ||
          vl.includes('6333')
        );
      });

      projects.push({
        name: entry.name,
        path: projectPath,
        source: sourceName,
        isSymlink: entry.isSymbolicLink(),
        targetPath,
        usesPostgres,
        usesRedis,
        usesQdrant,
        connectedDbs: Array.from(connectedDbs),
        detectedVars,
        services: Array.from(services).slice(0, 3),
      });
    }
  }

  return projects.sort((a, b) => {
    // Sort projects with databases first, then alphabetically
    const aScore = (a.usesPostgres ? 1 : 0) + (a.usesRedis ? 1 : 0) + (a.usesQdrant ? 1 : 0);
    const bScore = (b.usesPostgres ? 1 : 0) + (b.usesRedis ? 1 : 0) + (b.usesQdrant ? 1 : 0);
    if (bScore !== aScore) return bScore - aScore;
    return a.name.localeCompare(b.name);
  });
}
