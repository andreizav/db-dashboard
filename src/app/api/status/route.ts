import { NextResponse } from 'next/server';
import { getPostgresStatus } from '@/lib/postgres';
import { getRedisStatus } from '@/lib/redis';
import { getQdrantStatus } from '@/lib/qdrant';
import { scanProjects } from '@/lib/project-scanner';

export const dynamic = 'force-dynamic';

export async function GET() {
  const [pg, redis, qdrant, projects] = await Promise.allSettled([
    getPostgresStatus(),
    getRedisStatus(),
    getQdrantStatus(),
    scanProjects(),
  ]);

  const unwrap = <T>(result: PromiseSettledResult<T>, fallback: T): T => {
    if (result.status === 'fulfilled') return result.value;
    return fallback;
  };

  const projectList = unwrap(projects, []);
  const withDbCount = projectList.filter(
    (p) => p.usesPostgres || p.usesRedis || p.usesQdrant
  ).length;

  return NextResponse.json({
    postgres: unwrap(pg, { online: false, error: 'Postgres unreachable' }),
    redis: unwrap(redis, { online: false, error: 'Redis unreachable' }),
    qdrant: unwrap(qdrant, { online: false, error: 'Qdrant unreachable' }),
    projects: {
      total: projectList.length,
      withDb: withDbCount,
    },
  });
}
