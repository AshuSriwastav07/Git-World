// Cron: Daily Silicon Valley park data refresh — processes one company at a time
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const COMPANIES = ['apple', 'google', 'nvidia', 'meta', 'amazon', 'microsoft', 'tesla', 'netflix'];

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const origin = new URL(request.url).origin;
  const results: Record<string, { success: boolean; count?: number; error?: string }> = {};

  for (const company of COMPANIES) {
    try {
      const res = await fetch(`${origin}/api/silicon-valley/refresh?company=${company}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      results[company] = { success: data.success, count: data.count };
    } catch (error) {
      results[company] = { success: false, error: error instanceof Error ? error.message : 'Unknown' };
    }
    // 3s delay between companies to avoid GitHub rate limits
    await new Promise(r => setTimeout(r, 3000));
  }

  // Trigger language devs + rank recalculation via a full refresh (no company param)
  // Since all companies are already refreshed, this will just redo them —
  // Instead, call recalculate-ranks directly
  try {
    await fetch(`${origin}/api/cron/recalculate-ranks`, {
      method: 'GET',
      headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
    });
  } catch {
    // non-critical
  }

  return NextResponse.json({ ok: true, results });
}
