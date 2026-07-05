// GET /api/city/snapshot — full slim city in one CDN-cached response.
// Replaces 16+ sequential client-side Supabase pages with a single request
// that Vercel's edge cache serves for 5 minutes (SWR for a day).

import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const SLIM_COLS =
  'login, city_slot, city_rank, total_score, top_language, estimated_commits, total_stars, public_repos, recent_activity, avatar_url, first_added_at';
const PAGE_SIZE = 1000;
const MAX_ROWS = 12000;

export async function GET() {
  const sb = getSupabaseServer();
  const all: Record<string, unknown>[] = [];
  let from = 0;

  try {
    while (from < MAX_ROWS) {
      const { data, error } = await sb
        .from('city_users')
        .select(SLIM_COLS)
        .order('city_slot', { ascending: true })
        .range(from, from + PAGE_SIZE - 1);

      if (error) {
        // Partial data is still useful; stop paginating on error
        console.error('[snapshot] page error at offset', from, error.message);
        break;
      }
      if (!data || data.length === 0) break;
      all.push(...(data as Record<string, unknown>[]));
      if (data.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }

    if (all.length === 0) {
      return NextResponse.json(
        { error: 'no data' },
        { status: 503, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    return NextResponse.json(all, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=86400',
      },
    });
  } catch (e) {
    console.error('[snapshot] fatal:', e);
    return NextResponse.json(
      { error: 'snapshot failed' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
