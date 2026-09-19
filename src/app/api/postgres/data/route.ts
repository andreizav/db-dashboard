import { NextRequest, NextResponse } from 'next/server';
import {
  getTableData,
  updateTableRow,
  deleteTableRow,
  insertTableRow,
  truncateTable,
  dropTable,
} from '@/lib/postgres';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const db = searchParams.get('db');
    const table = searchParams.get('table');
    const schema = searchParams.get('schema') || 'public';
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    if (!db || !table) {
      return NextResponse.json(
        { error: 'Missing required parameters: db and table are required' },
        { status: 400 }
      );
    }

    const data = await getTableData(db, schema, table, limit, offset);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { db, schema = 'public', table, pkColumn, pkValue, updates } = body;

    if (!db || !table || !pkColumn || pkValue === undefined || !updates) {
      return NextResponse.json(
        { error: 'Missing required parameters (db, table, pkColumn, pkValue, updates)' },
        { status: 400 }
      );
    }

    await updateTableRow(db, schema, table, pkColumn, pkValue, updates);
    return NextResponse.json({ success: true, message: 'Record updated successfully' });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { db, schema = 'public', table, record } = body;

    if (!db || !table || !record) {
      return NextResponse.json(
        { error: 'Missing required parameters (db, table, record)' },
        { status: 400 }
      );
    }

    await insertTableRow(db, schema, table, record);
    return NextResponse.json({ success: true, message: 'Record inserted successfully' });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { db, schema = 'public', table, action, pkColumn, pkValue } = body;

    if (!db || !table) {
      return NextResponse.json(
        { error: 'Missing required parameters (db, table)' },
        { status: 400 }
      );
    }

    if (action === 'truncate') {
      await truncateTable(db, schema, table);
      return NextResponse.json({ success: true, message: `Table ${table} truncated successfully` });
    }

    if (action === 'drop') {
      await dropTable(db, schema, table);
      return NextResponse.json({ success: true, message: `Table ${table} dropped successfully` });
    }

    // Default: Delete single row
    if (!pkColumn || pkValue === undefined) {
      return NextResponse.json(
        { error: 'Missing primary key info for row deletion (pkColumn, pkValue)' },
        { status: 400 }
      );
    }

    await deleteTableRow(db, schema, table, pkColumn, pkValue);
    return NextResponse.json({ success: true, message: 'Record deleted successfully' });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
