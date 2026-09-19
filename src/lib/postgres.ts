import { Pool } from 'pg';

const pools = new Map<string, Pool>();

function getConnectionString(dbName?: string): string {
  const base = process.env.DATABASE_URL || 'postgresql://postgres:postgrespassword@localhost:5432/postgres';
  const target = dbName || 'postgres';
  try {
    const url = new URL(base);
    url.pathname = `/${target}`;
    return url.toString();
  } catch {
    return `postgresql://postgres:postgrespassword@localhost:5432/${target}`;
  }
}

export function getPool(dbName?: string): Pool {
  const key = dbName || 'postgres';
  if (!pools.has(key)) {
    const pool = new Pool({
      connectionString: getConnectionString(key),
      connectionTimeoutMillis: 3000,
      max: 5,
      idleTimeoutMillis: 15000,
    });
    pools.set(key, pool);
  }
  return pools.get(key)!;
}

export interface DatabaseInfo {
  name: string;
  size: string;
  sizeBytes: number;
  tablesCount: number;
}

export interface TableInfo {
  database: string;
  schema: string;
  name: string;
  rowEstimate: number;
  columnCount: number;
  totalSize: string;
}

export interface ExtensionInfo {
  name: string;
  version: string;
}

export async function getPostgresStatus(): Promise<{
  online: boolean;
  latencyMs?: number;
  databasesCount?: number;
  error?: string;
}> {
  const start = Date.now();
  try {
    const pool = getPool();
    const [_, countRes] = await Promise.all([
      pool.query('SELECT 1'),
      pool.query(
        `SELECT count(*)::int as cnt FROM pg_database WHERE datistemplate = false AND datallowconn = true`
      ),
    ]);
    const cnt = countRes.rows[0]?.cnt ?? 0;
    return { online: true, latencyMs: Date.now() - start, databasesCount: cnt };
  } catch (err) {
    return { online: false, error: (err as Error).message };
  }
}

export async function listDatabases(): Promise<DatabaseInfo[]> {
  const pool = getPool();
  const res = await pool.query(`
    SELECT
      datname,
      pg_size_pretty(pg_database_size(datname)) AS size,
      pg_database_size(datname)::bigint AS size_bytes
    FROM pg_database
    WHERE datistemplate = false AND datallowconn = true
    ORDER BY datname
  `);

  const dbs: DatabaseInfo[] = [];

  for (const row of res.rows) {
    let tablesCount = 0;
    try {
      const dbPool = getPool(row.datname);
      const countRes = await dbPool.query(`
        SELECT count(*)::int AS cnt
        FROM pg_tables
        WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
      `);
      tablesCount = countRes.rows[0]?.cnt ?? 0;
    } catch {
      // If unable to query specific database, skip count
    }

    dbs.push({
      name: row.datname,
      size: row.size,
      sizeBytes: Number(row.size_bytes),
      tablesCount,
    });
  }

  return dbs;
}

export async function listExtensions(dbName?: string): Promise<ExtensionInfo[]> {
  const pool = getPool(dbName);
  const res = await pool.query(`SELECT extname, extversion FROM pg_extension ORDER BY extname`);
  return res.rows.map((r: { extname: string; extversion: string }) => ({
    name: r.extname,
    version: r.extversion,
  }));
}

export async function isPgVectorInstalled(dbName?: string): Promise<boolean> {
  const pool = getPool(dbName);
  const res = await pool.query(`SELECT 1 FROM pg_extension WHERE extname = 'vector'`);
  return (res.rowCount ?? 0) > 0;
}

async function fetchTablesForDatabase(dbName: string): Promise<TableInfo[]> {
  const dbPool = getPool(dbName);
  const query = `
    SELECT
      t.schemaname,
      t.tablename,
      COALESCE(
        NULLIF(
          (SELECT reltuples::bigint FROM pg_class c
           JOIN pg_namespace n ON n.oid = c.relnamespace
           WHERE c.relname = t.tablename AND n.nspname = t.schemaname),
          -1
        ),
        0
      ) AS row_estimate,
      pg_size_pretty(pg_total_relation_size(quote_ident(t.schemaname) || '.' || quote_ident(t.tablename))) AS total_size,
      (
        SELECT count(*)::int
        FROM information_schema.columns c
        WHERE c.table_schema = t.schemaname AND c.table_name = t.tablename
      ) AS column_count
    FROM pg_tables t
    WHERE t.schemaname NOT IN ('pg_catalog', 'information_schema')
    ORDER BY t.schemaname, t.tablename
  `;

  const res = await dbPool.query(query);
  const tables: TableInfo[] = [];

  for (const row of res.rows) {
    let rowCount = Number(row.row_estimate);
    // For small tables or if row_estimate is 0, fetch accurate count with quick query
    if (rowCount <= 0) {
      try {
        const countRes = await dbPool.query(
          `SELECT count(*)::bigint AS cnt FROM "${row.schemaname}"."${row.tablename}"`
        );
        rowCount = Number(countRes.rows[0]?.cnt ?? 0);
      } catch {
        // Fallback to row_estimate
      }
    }

    tables.push({
      database: dbName,
      schema: row.schemaname,
      name: row.tablename,
      rowEstimate: rowCount,
      columnCount: Number(row.column_count || 0),
      totalSize: row.total_size || '0 kB',
    });
  }

  return tables;
}

export async function listTables(dbName?: string): Promise<TableInfo[]> {
  if (dbName && dbName !== 'all') {
    return fetchTablesForDatabase(dbName);
  }

  // If 'all' or undefined, collect tables across all active databases
  const defaultPool = getPool();
  const dbsRes = await defaultPool.query(`
    SELECT datname FROM pg_database
    WHERE datistemplate = false AND datallowconn = true
    ORDER BY datname
  `);

  const allTables: TableInfo[] = [];
  for (const row of dbsRes.rows) {
    try {
      const dbTables = await fetchTablesForDatabase(row.datname);
      allTables.push(...dbTables);
    } catch {
      // Continue if one database is inaccessible
    }
  }

  return allTables;
}

export interface ColumnInfo {
  name: string;
  dataType: string;
  isNullable: boolean;
  defaultValue: string | null;
}

export interface TableDataResult {
  database: string;
  schema: string;
  table: string;
  primaryKeyColumn: string | null;
  columns: ColumnInfo[];
  rows: Record<string, unknown>[];
  totalCount: number;
  limit: number;
  offset: number;
}

function validateIdentifier(name: string): void {
  if (!/^[a-zA-Z0-9_]+$/.test(name)) {
    throw new Error(`Invalid identifier: "${name}"`);
  }
}

export async function getPrimaryKey(
  dbName: string,
  schema: string = 'public',
  tableName: string
): Promise<string | null> {
  validateIdentifier(schema);
  validateIdentifier(tableName);
  const pool = getPool(dbName);
  const res = await pool.query(
    `
    SELECT kcu.column_name
    FROM information_schema.table_constraints tco
    JOIN information_schema.key_column_usage kcu 
      ON kcu.constraint_name = tco.constraint_name
      AND kcu.constraint_schema = tco.constraint_schema
    WHERE tco.constraint_type = 'PRIMARY KEY'
      AND kcu.table_schema = $1
      AND kcu.table_name = $2
    LIMIT 1
  `,
    [schema, tableName]
  );
  return res.rows[0]?.column_name || null;
}

export async function getTableData(
  dbName: string,
  schema: string = 'public',
  tableName: string,
  limit: number = 50,
  offset: number = 0
): Promise<TableDataResult> {
  validateIdentifier(schema);
  validateIdentifier(tableName);
  const pool = getPool(dbName);

  const safeLimit = Math.min(Math.max(1, limit), 200);
  const safeOffset = Math.max(0, offset);

  const [colsRes, countRes, rowsRes, pkCol] = await Promise.all([
    pool.query(
      `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = $1 AND table_name = $2
      ORDER BY ordinal_position
    `,
      [schema, tableName]
    ),
    pool.query(`SELECT count(*)::bigint AS cnt FROM "${schema}"."${tableName}"`),
    pool.query(`SELECT * FROM "${schema}"."${tableName}" LIMIT $1 OFFSET $2`, [
      safeLimit,
      safeOffset,
    ]),
    getPrimaryKey(dbName, schema, tableName),
  ]);

  const columns: ColumnInfo[] = colsRes.rows.map((r: {
    column_name: string;
    data_type: string;
    is_nullable: string;
    column_default: string | null;
  }) => ({
    name: r.column_name,
    dataType: r.data_type,
    isNullable: r.is_nullable === 'YES',
    defaultValue: r.column_default,
  }));

  // Fallback to 'id' column if no explicit PK constraint
  const resolvedPk = pkCol || (columns.some((c) => c.name === 'id') ? 'id' : null);
  const totalCount = Number(countRes.rows[0]?.cnt ?? 0);

  return {
    database: dbName,
    schema,
    table: tableName,
    primaryKeyColumn: resolvedPk,
    columns,
    rows: rowsRes.rows,
    totalCount,
    limit: safeLimit,
    offset: safeOffset,
  };
}

export async function updateTableRow(
  dbName: string,
  schema: string = 'public',
  tableName: string,
  pkColumn: string,
  pkValue: unknown,
  updates: Record<string, unknown>
): Promise<void> {
  validateIdentifier(schema);
  validateIdentifier(tableName);
  validateIdentifier(pkColumn);

  const pool = getPool(dbName);
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  for (const [col, val] of Object.entries(updates)) {
    validateIdentifier(col);
    if (col === pkColumn) continue; // Don't modify primary key directly
    setClauses.push(`"${col}" = $${paramIndex++}`);
    values.push(val);
  }

  if (setClauses.length === 0) return;

  values.push(pkValue);
  const query = `UPDATE "${schema}"."${tableName}" SET ${setClauses.join(', ')} WHERE "${pkColumn}" = $${paramIndex}`;
  await pool.query(query, values);
}

export async function deleteTableRow(
  dbName: string,
  schema: string = 'public',
  tableName: string,
  pkColumn: string,
  pkValue: unknown
): Promise<void> {
  validateIdentifier(schema);
  validateIdentifier(tableName);
  validateIdentifier(pkColumn);

  const pool = getPool(dbName);
  const query = `DELETE FROM "${schema}"."${tableName}" WHERE "${pkColumn}" = $1`;
  await pool.query(query, [pkValue]);
}

export async function insertTableRow(
  dbName: string,
  schema: string = 'public',
  tableName: string,
  record: Record<string, unknown>
): Promise<void> {
  validateIdentifier(schema);
  validateIdentifier(tableName);

  const pool = getPool(dbName);
  const colNames: string[] = [];
  const placeholders: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  for (const [col, val] of Object.entries(record)) {
    if (val === undefined || val === '') continue;
    validateIdentifier(col);
    colNames.push(`"${col}"`);
    placeholders.push(`$${paramIndex++}`);
    values.push(val);
  }

  if (colNames.length === 0) {
    throw new Error('Cannot insert empty record');
  }

  const query = `INSERT INTO "${schema}"."${tableName}" (${colNames.join(', ')}) VALUES (${placeholders.join(', ')})`;
  await pool.query(query, values);
}

export async function truncateTable(
  dbName: string,
  schema: string = 'public',
  tableName: string
): Promise<void> {
  validateIdentifier(schema);
  validateIdentifier(tableName);
  const pool = getPool(dbName);
  await pool.query(`TRUNCATE TABLE "${schema}"."${tableName}" CASCADE`);
}

export async function dropTable(
  dbName: string,
  schema: string = 'public',
  tableName: string
): Promise<void> {
  validateIdentifier(schema);
  validateIdentifier(tableName);
  const pool = getPool(dbName);
  await pool.query(`DROP TABLE "${schema}"."${tableName}" CASCADE`);
}

export async function dropDatabase(dbName: string): Promise<void> {
  validateIdentifier(dbName);
  const protectedDbs = new Set(['postgres', 'template0', 'template1']);
  if (protectedDbs.has(dbName)) {
    throw new Error(`Cannot drop system database "${dbName}"`);
  }

  if (pools.has(dbName)) {
    const p = pools.get(dbName);
    pools.delete(dbName);
    await p?.end().catch(() => {});
  }

  const defaultPool = getPool('postgres');
  // Terminate active connections
  await defaultPool.query(
    `
    SELECT pg_terminate_backend(pid)
    FROM pg_stat_activity
    WHERE datname = $1 AND pid <> pg_backend_pid()
  `,
    [dbName]
  );

  await defaultPool.query(`DROP DATABASE "${dbName}"`);
}
