import { NextResponse } from 'next/server';
import { listCollections } from '@/lib/qdrant';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const collections = await listCollections();
    return NextResponse.json({ collections });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message, collections: [] }, { status: 500 });
  }
}
