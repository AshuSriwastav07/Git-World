// API: Read SV language district devs from Supabase view
import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase';

export const revalidate = 3600;

export async function GET() {
  const sb = getSupabaseServer();

  const { data, error } = await sb
    .from('sv_language_devs_full')
    .select('*')
    .order('contributions', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const languages: Record<string, { login: string; avatarUrl: string; topLanguage: string; citySlot: number; cityRank: number }[]> = {};

  for (const row of (data ?? []) as Record<string, unknown>[]) {
    const lang = (row.language as string) ?? '';
    if (!languages[lang]) languages[lang] = [];
    languages[lang].push({
      login: row.login as string,
      avatarUrl: (row.avatar_url as string) ?? '',
      topLanguage: (row.top_language as string) ?? lang,
      citySlot: (row.city_slot as number) ?? 0,
      cityRank: (row.city_rank as number) ?? 9999,
    });
  }

  return NextResponse.json(
    { languages },
    { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=1800' } }
  );
}
