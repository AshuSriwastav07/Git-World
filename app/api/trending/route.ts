// API: Read active trending repos from Supabase
import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase';

export const revalidate = 3600; // 1 hour cache

export async function GET() {
  const sb = getSupabaseServer();

  const { data, error } = await sb
    .from('trending_repos')
    .select('*')
    .eq('is_active', true)
    .order('trending_rank', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { repos: data ?? [] },
    { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=1800' } }
  );
}
