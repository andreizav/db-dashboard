import { NextResponse } from 'next/server';
import { getRedisInfo } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const stats = await getRedisInfo();
    return NextResponse.json(stats);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
