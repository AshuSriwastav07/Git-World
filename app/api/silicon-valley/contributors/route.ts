// API: Read SV park contributors + language devs from Supabase views
// No GitHub API calls — all data comes from sv_contributors_full / sv_language_devs_full
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase';

export const revalidate = 3600; // ISR: revalidate every hour

const VALID_COMPANIES = new Set(['apple', 'google', 'nvidia', 'meta']);

export async function GET(request: NextRequest) {
  const sb = getSupabaseServer();
  const company = request.nextUrl.searchParams.get('company')?.toLowerCase();

  // If company is specified, return that company's contributors
  if (company) {
    if (!VALID_COMPANIES.has(company)) {
      return NextResponse.json(
        { error: 'Invalid company. Use: apple, google, nvidia, meta' },
        { status: 400 }
      );
    }

    const { data, error } = await sb
      .from('sv_contributors_full')
      .select('*')
      .eq('company', company)
      .order('contributions', { ascending: false })
      .limit(30);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const contributors = (data ?? []).map((row: Record<string, unknown>) => ({
      login: row.login as string,
      avatarUrl: (row.avatar_url as string) ?? '',
      topLanguage: (row.top_language as string) ?? 'Unknown',
      contributions: (row.contributions as number) ?? 0,
      citySlot: (row.city_slot as number) ?? 0,
      cityRank: (row.city_rank as number) ?? 9999,
      totalScore: (row.total_score as number) ?? 0,
      estimatedCommits: (row.estimated_commits as number) ?? 0,
      totalStars: (row.total_stars as number) ?? 0,
      publicRepos: (row.public_repos as number) ?? 0,
    }));

    return NextResponse.json(
      { company, contributors },
      { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=1800' } }
    );
  }

  // No company specified — return all companies + language devs
  const [contribRes, langRes] = await Promise.all([
    sb.from('sv_contributors_full').select('*').order('contributions', { ascending: false }),
    sb.from('sv_language_devs_full').select('*').order('contributions', { ascending: false }),
  ]);

  if (contribRes.error) {
    return NextResponse.json({ error: contribRes.error.message }, { status: 500 });
  }

  // Group company contributors (cap at 30 per company)
  const companies: Record<string, unknown[]> = { apple: [], google: [], nvidia: [], meta: [] };
  for (const row of (contribRes.data ?? []) as Record<string, unknown>[]) {
    const c = (row.company as string) ?? '';
    if (companies[c] && companies[c].length < 30) {
      companies[c].push({
        login: row.login as string,
        avatarUrl: (row.avatar_url as string) ?? '',
        topLanguage: (row.top_language as string) ?? 'Unknown',
        contributions: (row.contributions as number) ?? 0,
        citySlot: (row.city_slot as number) ?? 0,
        cityRank: (row.city_rank as number) ?? 9999,
        totalScore: (row.total_score as number) ?? 0,
        estimatedCommits: (row.estimated_commits as number) ?? 0,
        totalStars: (row.total_stars as number) ?? 0,
        publicRepos: (row.public_repos as number) ?? 0,
      });
    }
  }

  // Group language devs
  const languages: Record<string, unknown[]> = {};
  for (const row of (langRes.data ?? []) as Record<string, unknown>[]) {
    const lang = (row.language as string) ?? '';
    if (!languages[lang]) languages[lang] = [];
    languages[lang].push({
      login: row.login as string,
      avatarUrl: (row.avatar_url as string) ?? '',
      topLanguage: (row.top_language as string) ?? lang,
      citySlot: (row.city_slot as number) ?? 0,
      cityRank: (row.city_rank as number) ?? 9999,
      totalScore: (row.total_score as number) ?? 0,
    });
  }

  return NextResponse.json(
    { companies, languages },
    { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=1800' } }
  );
}
