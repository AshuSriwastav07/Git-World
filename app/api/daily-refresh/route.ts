// Combined daily refresh: SV park + Trending repos + Rank recalculation
// Single cron endpoint to stay within Vercel hobby tier limits
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const origin = new URL(request.url).origin;
  const results: Record<string, unknown> = {};

  try {
    // 1. Refresh Silicon Valley park data
    try {
      const svRes = await fetch(`${origin}/api/silicon-valley/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      results.svRefresh = await svRes.json();
    } catch (err) {
      results.svRefresh = { error: String(err) };
    }

    // 2. Refresh trending repos
    try {
      const trendingRes = await fetch(`${origin}/api/trending/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      results.trendingRefresh = await trendingRes.json();
    } catch (err) {
      results.trendingRefresh = { error: String(err) };
    }

    // 3. Recalculate ranks
    try {
      const rankRes = await fetch(`${origin}/api/cron/recalculate-ranks`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
      });
      results.rankRecalc = await rankRes.json();
    } catch (err) {
      results.rankRecalc = { error: String(err) };
    }

    // 4. Warm CDN snapshot after ranks are fresh
    try {
      const snapRes = await fetch(`${origin}/api/city/snapshot`);
      results.snapshotWarm = { status: snapRes.status, ok: snapRes.ok };
    } catch (err) {
      results.snapshotWarm = { error: String(err) };
    }

    return NextResponse.json({ ok: true, results });
  } catch (error) {
    console.error('Daily refresh error:', error);
    return NextResponse.json({ error: 'Daily refresh failed', results }, { status: 500 });
  }
}
