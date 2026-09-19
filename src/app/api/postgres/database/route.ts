import { NextRequest, NextResponse } from 'next/server';
import { dropDatabase } from '@/lib/postgres';

export const dynamic = 'force-dynamic';

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { dbName } = body;

    if (!dbName) {
      return NextResponse.json({ error: 'Missing dbName parameter' }, { status: 400 });
    }

    if (['postgres', 'template0', 'template1'].includes(dbName)) {
      return NextResponse.json({ error: 'Cannot delete system database' }, { status: 403 });
    }

    await dropDatabase(dbName);
    return NextResponse.json({ success: true, message: `Database ${dbName} dropped successfully` });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
