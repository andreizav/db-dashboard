import { NextResponse } from 'next/server';
import { scanProjects } from '@/lib/project-scanner';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const projects = await scanProjects();
    return NextResponse.json({ projects });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message, projects: [] }, { status: 500 });
  }
}
