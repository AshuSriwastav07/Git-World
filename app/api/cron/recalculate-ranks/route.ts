// Cron: Recalculate city ranks every 6 hours
import { NextResponse } from 'next/server';
import { recalculateRanks } from '@/lib/supabaseDb';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await recalculateRanks();
    return NextResponse.json({ ok: true, message: 'Ranks recalculated' });
  } catch (error) {
    console.error('Recalculate ranks cron error:', error);
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 });
  }
}
