// Cron: Legacy SV refresh entrypoint (kept for backward compatibility)
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const origin = new URL(request.url).origin;
    const res = await fetch(`${origin}/api/cron/sv-contributors`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
    });
    const data = await res.json();
    return NextResponse.json({ ok: true, result: data });
  } catch (error) {
    console.error('SV refresh cron error:', error);
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 });
  }
}
