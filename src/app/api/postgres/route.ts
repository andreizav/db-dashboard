import { NextRequest, NextResponse } from 'next/server';
import { listDatabases, listTables, listExtensions, isPgVectorInstalled } from '@/lib/postgres';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const db = searchParams.get('db') || undefined;

    const [databases, tables, extensions, pgvectorInstalled] = await Promise.all([
      listDatabases(),
      listTables(db),
      listExtensions(db && db !== 'all' ? db : undefined),
      isPgVectorInstalled(db && db !== 'all' ? db : undefined),
    ]);

    return NextResponse.json({
      selectedDb: db || 'all',
      databases,
      tables,
      extensions,
      pgvectorInstalled,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: (err as Error).message,
        databases: [],
        tables: [],
        extensions: [],
        pgvectorInstalled: false,
      },
      { status: 500 }
    );
  }
}
