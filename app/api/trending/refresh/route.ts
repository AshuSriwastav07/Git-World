// API: Refresh trending repos — 6-phase pipeline
// Called by cron daily or manually by admin
import { NextResponse } from 'next/server';
import { githubFetch } from '@/lib/githubTokens';
import { getSupabaseServer } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

interface SearchRepo {
  full_name: string;
  name: string;
  owner: { login: string; type: string; avatar_url: string };
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  watchers_count: number;
  html_url: string;
  homepage: string | null;
  topics: string[];
  fork: boolean;
  archived: boolean;
}

interface ContributorRaw {
  login: string;
  avatar_url: string;
  contributions: number;
}

const SPAM_NAMES = /^(test|demo|example|tutorial)$/i;

export async function POST() {
  const sb = getSupabaseServer();
  const results: string[] = [];

  try {
    // ── PHASE 1: Search GitHub for trending repos ──
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    const searchUrl = `https://api.github.com/search/repositories?q=pushed:>${weekAgo}+stars:>50+fork:false&sort=stars&order=desc&per_page=30`;

    const searchRes = await githubFetch(searchUrl);
    if (!searchRes.ok) {
      return NextResponse.json({ error: `GitHub search failed: ${searchRes.status}` }, { status: 502 });
    }

    const searchData = await searchRes.json();
    const rawRepos: SearchRepo[] = searchData.items ?? [];

    // Filter out spam/archived/no-description repos
    const filtered = rawRepos.filter((r) => {
      if (!r.description) return false;
      if (r.fork || r.archived) return false;
      if (r.stargazers_count < 50) return false;
      if (SPAM_NAMES.test(r.name)) return false;
      return true;
    }).slice(0, 20);

    results.push(`Phase 1: Found ${filtered.length} trending repos`);

    // ── PHASE 2: Fetch details + contributors for each repo ──
    const repoDetails: {
      repo: SearchRepo;
      topics: string[];
      contributors: { login: string; avatarUrl: string; contributions: number; city_rank: number | null }[];
    }[] = [];

    for (const repo of filtered) {
      // Fetch full repo details (topics, homepage, etc.)
      let topics = repo.topics || [];
      let homepage = repo.homepage;
      try {
        const detailRes = await githubFetch(`https://api.github.com/repos/${repo.full_name}`);
        if (detailRes.ok) {
          const detail = await detailRes.json();
          topics = detail.topics ?? topics;
          homepage = detail.homepage ?? homepage;
        }
      } catch { /* use defaults */ }

      // Fetch top 5 contributors
      const contributors: { login: string; avatarUrl: string; contributions: number; city_rank: number | null }[] = [];
      try {
        const contribRes = await githubFetch(
          `https://api.github.com/repos/${repo.full_name}/contributors?per_page=5`
        );
        if (contribRes.ok) {
          const contribData: ContributorRaw[] = await contribRes.json();
          for (const c of contribData.slice(0, 5)) {
            // Check if contributor is in city_users
            const { data: cityUser } = await sb
              .from('city_users')
              .select('city_rank')
              .eq('login', c.login.toLowerCase())
              .single();

            contributors.push({
              login: c.login,
              avatarUrl: c.avatar_url,
              contributions: c.contributions,
              city_rank: cityUser?.city_rank ?? null,
            });
          }
        }
      } catch { /* skip contributors */ }

      repoDetails.push({ repo, topics, contributors });
    }

    results.push(`Phase 2: Fetched details for ${repoDetails.length} repos`);

    // ── PHASE 3: Calculate trending scores + weekly stars ──
    // Get existing entries for delta calculation
    const { data: existingRepos } = await sb
      .from('trending_repos')
      .select('repo_full_name, total_stars, daily_stars');

    const existingMap = new Map<string, { total_stars: number; daily_stars: { date: string; count: number }[] }>();
    for (const er of existingRepos ?? []) {
      existingMap.set(er.repo_full_name, {
        total_stars: er.total_stars,
        daily_stars: (er.daily_stars as { date: string; count: number }[]) ?? [],
      });
    }

    const today = new Date().toISOString().split('T')[0];

    const scored = repoDetails.map(({ repo, topics, contributors }) => {
      const existing = existingMap.get(repo.full_name);
      const weeklyStars = existing
        ? Math.max(0, repo.stargazers_count - existing.total_stars)
        : Math.round(repo.stargazers_count * 0.05); // estimate 5% for first-time

      // Update daily_stars array (keep last 7 days)
      let dailyStars = existing?.daily_stars ?? [];
      const todayEntry = { date: today, count: weeklyStars > 0 ? Math.round(weeklyStars / 7) : 0 };
      dailyStars = [...dailyStars.filter(d => d.date !== today), todayEntry].slice(-7);

      const trendingScore = (weeklyStars * 3) + (repo.forks_count * 1) + (repo.open_issues_count * 0.2);

      return {
        repo,
        topics,
        contributors,
        weeklyStars,
        dailyStars,
        trendingScore,
      };
    });

    // Sort by trending score descending
    scored.sort((a, b) => b.trendingScore - a.trendingScore);

    results.push(`Phase 3: Scored and ranked repos`);

    // ── PHASE 4: Calculate building dimensions ──
    const upsertData = scored.map((item, idx) => {
      const rank = idx + 1;
      const height = Math.min(65, Math.max(8, 8 + (item.weeklyStars / 100)));
      const width = Math.min(6, Math.max(2, 2 + (item.repo.stargazers_count / 25000)));

      return {
        repo_full_name: item.repo.full_name,
        owner_login: item.repo.owner.login,
        owner_type: item.repo.owner.type,
        repo_name: item.repo.name,
        description: item.repo.description,
        primary_language: item.repo.language ?? 'Unknown',
        total_stars: item.repo.stargazers_count,
        weekly_stars: item.weeklyStars,
        forks: item.repo.forks_count,
        open_issues: item.repo.open_issues_count,
        watchers: item.repo.watchers_count,
        github_url: item.repo.html_url,
        homepage_url: item.repo.homepage || null,
        topics: item.topics.slice(0, 6),
        daily_stars: item.dailyStars,
        top_contributors: item.contributors,
        trending_rank: rank,
        district_slot: rank - 1,
        building_height: Math.round(height * 10) / 10,
        building_width: Math.round(width * 10) / 10,
        last_refreshed: new Date().toISOString(),
        is_active: true,
      };
    });

    results.push(`Phase 4: Calculated dimensions for ${upsertData.length} buildings`);

    // ── PHASE 5: Upsert into trending_repos ──
    // First deactivate ALL active repos to avoid unique index conflict on trending_rank
    await sb
      .from('trending_repos')
      .update({ is_active: false })
      .eq('is_active', true);

    const activeNames: string[] = [];
    for (const row of upsertData) {
      activeNames.push(row.repo_full_name);
      const { error } = await sb
        .from('trending_repos')
        .upsert(row, { onConflict: 'repo_full_name' });

      if (error) {
        console.error(`Upsert error for ${row.repo_full_name}:`, error.message);
      }
    }

    results.push(`Phase 5: Upserted ${activeNames.length} repos`);

    // ── PHASE 6: Insert live event ──
    const newRepoCount = upsertData.filter(r => !existingMap.has(r.repo_full_name)).length;
    await sb.from('live_events').insert({
      type: 'trending_update',
      login: 'system',
      detail: `Trending repos updated! ${newRepoCount} new repos in the district.`,
    });

    results.push(`Phase 6: Live event inserted`);

    return NextResponse.json({ ok: true, results, count: upsertData.length });
  } catch (error) {
    console.error('Trending refresh error:', error);
    return NextResponse.json({ error: 'Refresh failed', results }, { status: 500 });
  }
}
