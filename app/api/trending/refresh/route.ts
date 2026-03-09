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

const SPAM_NAMES = /^(test|demo|example|tutorial|awesome-list|awesome|learn|course|interview|cheatsheet|100-days|roadmap|free|handbook|guide)$/i;
const SPAM_OWNERS = /^(dependabot|renovate|github-actions|greenkeeper)$/i;

// Fixed height-by-rank table: rank 1 = 72, rank 20 = 16
const RANK_HEIGHTS = [72, 66, 61, 56, 52, 48, 44, 40, 37, 34, 31, 29, 27, 25, 24, 22, 20, 18, 17, 16];

export async function POST() {
  const sb = getSupabaseServer();
  const results: string[] = [];

  try {
    // ── PHASE 1: Search GitHub for repos created in the last 30 days ──
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
    const searchUrl = `https://api.github.com/search/repositories?q=created:>${thirtyDaysAgo}+stars:>50+fork:false+archived:false&sort=stars&order=desc&per_page=60`;

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
      if (SPAM_OWNERS.test(r.owner.login)) return false;
      return true;
    });

    results.push(`Phase 1: Found ${filtered.length} candidate repos (created <30 days)`);

    // ── PHASE 2: Fetch details + contributors + weekly commit activity ──
    const repoDetails: {
      repo: SearchRepo;
      topics: string[];
      contributors: { login: string; avatarUrl: string; contributions: number; city_rank: number | null }[];
      weeklyCommits: number;
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

      // Fetch weekly commit activity via punch_card (last 7 days of commits)
      let weeklyCommits = 0;
      try {
        const statsRes = await githubFetch(
          `https://api.github.com/repos/${repo.full_name}/stats/participation`
        );
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          // participation.all is an array of 52 weekly commit counts; last entry = most recent week
          const allWeeks: number[] = statsData.all ?? [];
          weeklyCommits = allWeeks.length > 0 ? allWeeks[allWeeks.length - 1] : 0;
        }
      } catch { /* default 0 */ }

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

      repoDetails.push({ repo, topics, contributors, weeklyCommits });
    }

    results.push(`Phase 2: Fetched details for ${repoDetails.length} repos`);

    // ── PHASE 3: Calculate trending scores ──
    // Score = (total_stars × 2) + (weekly_commits × 50) + (forks × 1)
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

    const scored = repoDetails.map(({ repo, topics, contributors, weeklyCommits }) => {
      const existing = existingMap.get(repo.full_name);
      const weeklyStars = existing
        ? Math.max(0, repo.stargazers_count - existing.total_stars)
        : Math.round(repo.stargazers_count * 0.05);

      let dailyStars = existing?.daily_stars ?? [];
      const todayEntry = { date: today, count: weeklyStars > 0 ? Math.round(weeklyStars / 7) : 0 };
      dailyStars = [...dailyStars.filter(d => d.date !== today), todayEntry].slice(-7);

      const trendingScore = (repo.stargazers_count * 2) + (weeklyCommits * 50) + (repo.forks_count * 1);

      return {
        repo,
        topics,
        contributors,
        weeklyStars,
        weeklyCommits,
        dailyStars,
        trendingScore,
      };
    });

    // Sort by trending score descending, take top 20
    scored.sort((a, b) => b.trendingScore - a.trendingScore);
    const top20 = scored.slice(0, 20);

    results.push(`Phase 3: Scored and ranked repos`);

    // ── PHASE 4: Calculate building dimensions using fixed rank table ──
    const upsertData = top20.map((item, idx) => {
      const rank = idx + 1;
      const height = RANK_HEIGHTS[idx] ?? 16;
      const width = 5; // consistent width for all trending buildings

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
        building_height: height,
        building_width: width,
        last_refreshed: new Date().toISOString(),
        is_active: true,
      };
    });

    results.push(`Phase 4: Calculated dimensions for ${upsertData.length} buildings`);

    // ── PHASE 5: Upsert into trending_repos ──
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
