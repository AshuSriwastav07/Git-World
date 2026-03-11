// API: Refresh Silicon Valley park data — ORG MEMBERS ONLY
// Fetches VERIFIED public members of GitHub organizations.
// Phase 1 — Fetch public members from org APIs (/orgs/{org}/members)
// Phase 2 — Fetch profiles, sort by (followers×2 + total_stars×1), take top 30
// Phase 3 — Cross-company deduplication
// Phase 4 — Upsert into city_users + sv_contributors
// Phase 5 — Language devs from city_users by top_language (no GitHub calls)
// Phase 6 — Recalculate ranks
import { NextResponse } from 'next/server';
import { githubFetch } from '@/lib/githubTokens';
import { upsertUser, recalculateRanks } from '@/lib/supabaseDb';
import { getSupabaseServer } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// ── Company config: multiple orgs + search fallback terms per company ────────

interface CompanySource {
  orgs: string[];
  searchTerms: string[];
  /** Substrings to match against a GitHub profile's `company` field */
  profileCompanyMatch: string[];
}

const COMPANY_CONFIG: Record<string, CompanySource> = {
  apple: {
    orgs: ['apple'],
    searchTerms: ['Apple'],
    profileCompanyMatch: ['apple'],
  },
  google: {
    orgs: ['google', 'GoogleCloudPlatform'],
    searchTerms: ['Google'],
    profileCompanyMatch: ['google'],
  },
  nvidia: {
    orgs: ['NVIDIA-AI-IOT', 'NVIDIAGameWorks', 'NVIDIA-Omniverse'],
    searchTerms: ['NVIDIA'],
    profileCompanyMatch: ['nvidia'],
  },
  meta: {
    orgs: ['facebookresearch', 'meta-llama'],
    searchTerms: ['Meta', 'Facebook'],
    profileCompanyMatch: ['meta', 'facebook'],
  },
  amazon: {
    orgs: ['amzn', 'aws'],
    searchTerms: ['Amazon', 'AWS'],
    profileCompanyMatch: ['amazon', 'aws'],
  },
  microsoft: {
    orgs: ['microsoft', 'Azure'],
    searchTerms: ['Microsoft'],
    profileCompanyMatch: ['microsoft'],
  },
  tesla: {
    orgs: ['teslamotors'],
    searchTerms: ['Tesla'],
    profileCompanyMatch: ['tesla'],
  },
  netflix: {
    orgs: ['Netflix'],
    searchTerms: ['Netflix'],
    profileCompanyMatch: ['netflix'],
  },
};

const LANGUAGE_LIST = ['Python', 'JavaScript', 'TypeScript', 'Java', 'Rust', 'Go', 'C++', 'Kotlin'];

// ── Bot detection ───────────────────────────────────────────────────────────

const BOT_PATTERNS = [
  '[bot]', '-bot', 'bot-', '_bot', 'bot_',
  '[automation]', 'dependabot', 'renovate', 'github-actions',
  'semantic-release', 'snyk-bot', 'codecov', 'coveralls',
  'greenkeeper', 'mergify',
];

function isBot(login: string): boolean {
  const lower = login.toLowerCase();
  return BOT_PATTERNS.some(p => lower.includes(p));
}

// ── Types ───────────────────────────────────────────────────────────────────

interface OrgMember {
  login: string;
  avatar_url: string;
  type: string;
}

interface ProfileData {
  login: string; name: string; avatarUrl: string; bio: string;
  location: string; company: string; publicRepos: number; followers: number;
  following: number; githubCreatedAt: string; totalStars: number; totalForks: number;
  topLanguage: string; estimatedCommits: number; recentActivity: number;
  totalScore: number;
  topRepos: { name: string; stars: number; forks: number; language: string; description: string; url: string }[];
}

// ── Fallback: search users by company name when org API fails ───────────────

async function searchUsersByCompany(companyName: string): Promise<OrgMember[]> {
  const members: OrgMember[] = [];
  const query = encodeURIComponent(`company:${companyName} type:user repos:>0`);
  const url = `https://api.github.com/search/users?q=${query}&per_page=100&sort=followers&order=desc`;
  try {
    const res = await githubFetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return members;
    const data = await res.json();
    if (data.items && Array.isArray(data.items)) {
      for (const item of data.items) {
        if (item.type === 'User') {
          members.push({ login: item.login, avatar_url: item.avatar_url, type: item.type });
        }
      }
    }
  } catch {
    // fallback silently fails
  }
  return members;
}

// ── Fetch all public members of an org (paginated) ──────────────────────────

async function fetchOrgMembers(org: string): Promise<OrgMember[]> {
  const members: OrgMember[] = [];
  let page = 1;

  while (page <= 3) { // safety cap at 300 members (we only need ~50 candidates)
    const url = `https://api.github.com/orgs/${encodeURIComponent(org)}/members?filter=all&role=member&per_page=100&page=${page}`;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await githubFetch(url, { signal: AbortSignal.timeout(10000) });

        if (res.status === 404) {
          console.warn(`[sv-refresh] Org not found: ${org}`);
          return members;
        }

        if ((res.status === 403 || res.status === 429) && attempt === 0) {
          console.warn(`[sv-refresh] Rate limited on org ${org}, retrying in 1s...`);
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }

        if (!res.ok) return members;

        const data = await res.json();
        if (!Array.isArray(data) || data.length === 0) return members;

        members.push(...(data as OrgMember[]));

        if (data.length < 100) return members; // last page
        page++;
        await new Promise(r => setTimeout(r, 200));
        break;
      } catch {
        if (attempt === 0) {
          await new Promise(r => setTimeout(r, 500));
          continue;
        }
        return members;
      }
    }
  }

  return members;
}

// ── Quick-score: single /users call for pre-ranking (1 API call) ─────────────

interface QuickScore {
  login: string;
  followers: number;
  publicRepos: number;
  company: string;
  avatarUrl: string;
  score: number;
}

async function quickScoreUser(login: string): Promise<QuickScore | null> {
  try {
    const res = await githubFetch(
      `https://api.github.com/users/${encodeURIComponent(login)}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return null;
    const user = await res.json();
    if (user.type !== 'User') return null;
    if (!user.avatar_url) return null;
    if ((user.public_repos ?? 0) === 0) return null;

    return {
      login: user.login,
      followers: user.followers || 0,
      publicRepos: user.public_repos || 0,
      company: user.company || '',
      avatarUrl: user.avatar_url || '',
      score: (user.followers || 0) * 2 + (user.public_repos || 0),
    };
  } catch {
    return null;
  }
}

// ── Fetch full GitHub profile for enrichment ────────────────────────────────

async function fetchProfile(login: string): Promise<ProfileData | null> {
  try {
    const userRes = await githubFetch(
      `https://api.github.com/users/${encodeURIComponent(login)}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!userRes.ok) return null;
    const user = await userRes.json();

    if (user.type !== 'User') return null;
    if (!user.avatar_url) return null;
    if ((user.public_repos ?? 0) === 0) return null;

    const [reposResult, eventsResult] = await Promise.allSettled([
      githubFetch(
        `https://api.github.com/users/${encodeURIComponent(login)}/repos?per_page=100&sort=updated`,
        { signal: AbortSignal.timeout(7000) }
      ).then(r => r.ok ? r.json() : []),
      githubFetch(
        `https://api.github.com/users/${encodeURIComponent(login)}/events/public?per_page=100`,
        { signal: AbortSignal.timeout(7000) }
      ).then(r => r.ok ? r.json() : []),
    ]);

    const repos = reposResult.status === 'fulfilled' ? reposResult.value : [];
    const events = eventsResult.status === 'fulfilled' ? eventsResult.value : [];

    let totalStars = 0, totalForks = 0;
    const langCount: Record<string, number> = {};
    const topRepos: ProfileData['topRepos'] = [];

    if (Array.isArray(repos)) {
      for (const repo of repos) {
        totalStars += repo.stargazers_count || 0;
        totalForks += repo.forks_count || 0;
        if (repo.language) {
          langCount[repo.language] = (langCount[repo.language] || 0) + 1;
        }
      }
      const sorted = [...repos].sort(
        (a: { stargazers_count: number }, b: { stargazers_count: number }) =>
          b.stargazers_count - a.stargazers_count
      );
      for (const repo of sorted.slice(0, 5)) {
        topRepos.push({
          name: repo.name,
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          language: repo.language || '',
          description: (repo.description || '').slice(0, 80),
          url: repo.html_url,
        });
      }
    }

    const topLanguage = Object.entries(langCount).sort(([, a], [, b]) => b - a)[0]?.[0] || 'Unknown';

    let estimatedCommits = 0;
    let recentActivity = 0;
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    if (Array.isArray(events)) {
      for (const event of events) {
        if (event.type === 'PushEvent') {
          estimatedCommits += event.payload?.commits?.length || 0;
        }
        if (new Date(event.created_at).getTime() > thirtyDaysAgo) {
          recentActivity++;
        }
      }
    }
    estimatedCommits = Math.round(estimatedCommits * 3.5) || 0;
    recentActivity = Math.min(recentActivity, 100) || 0;
    totalStars = totalStars || 0;
    totalForks = totalForks || 0;

    const totalScore = Math.round(
      estimatedCommits * 3 + totalStars * 2 + (user.followers || 0) * 1 +
      (user.public_repos || 0) * 0.5 + recentActivity * 10
    ) || 0;

    return {
      login: user.login,
      name: user.name || '',
      avatarUrl: user.avatar_url || '',
      bio: user.bio || '',
      location: user.location || '',
      company: user.company || '',
      publicRepos: user.public_repos || 0,
      followers: user.followers || 0,
      following: user.following || 0,
      githubCreatedAt: user.created_at || '',
      totalStars, totalForks, topLanguage, estimatedCommits, recentActivity, totalScore, topRepos,
    };
  } catch {
    return null;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// POST handler — Silicon Valley refresh
// ?company=apple  → refresh ONE company (fast, fits in timeout)
// (no param)      → refresh ALL companies sequentially via internal per-company calls
// ══════════════════════════════════════════════════════════════════════════════

async function refreshSingleCompany(company: string) {
  const config = COMPANY_CONFIG[company];
  if (!config) throw new Error(`Unknown company: ${company}`);

  const sb = getSupabaseServer();
  const log: string[] = [];

  const seenLogins = new Set<string>();
  let allMembers: { member: OrgMember; source: string; orgName: string }[] = [];

  // Step 1: Fetch org members
  for (const orgName of config.orgs) {
    const orgMembers = await fetchOrgMembers(orgName);
    log.push(`${company} — org '${orgName}' returned ${orgMembers.length} members`);
    for (const m of orgMembers) {
      const key = m.login.toLowerCase();
      if (!seenLogins.has(key)) {
        seenLogins.add(key);
        allMembers.push({ member: m, source: 'org_member', orgName });
      }
    }
  }

  // Step 2: Supplement with search if needed
  if (seenLogins.size < 30) {
    for (const term of config.searchTerms) {
      if (seenLogins.size >= 60) break;
      const searchMembers = await searchUsersByCompany(term);
      let added = 0;
      for (const m of searchMembers) {
        const key = m.login.toLowerCase();
        if (!seenLogins.has(key)) {
          seenLogins.add(key);
          allMembers.push({ member: m, source: 'profile_search', orgName: term });
          added++;
        }
      }
      log.push(`${company} — search '${term}' added ${added} new users`);
    }
  }

  // Filter bots, cap candidates
  const validMembers = allMembers
    .filter(m => m.member.type === 'User' && !isBot(m.member.login))
    .slice(0, 50);
  log.push(`${company} — ${validMembers.length} after User+bot filter`);

  // Quick-score in batches of 10
  const quickScored: { login: string; qs: QuickScore; source: string }[] = [];
  for (let i = 0; i < validMembers.length; i += 10) {
    const batch = validMembers.slice(i, i + 10);
    const results = await Promise.all(batch.map(m => quickScoreUser(m.member.login)));
    for (let j = 0; j < results.length; j++) {
      const qs = results[j];
      if (!qs) continue;
      const entry = batch[j];
      if (entry.source === 'profile_search' && qs.company) {
        const profileCo = qs.company.toLowerCase().replace(/^@/, '');
        const matches = config.profileCompanyMatch.some(match => profileCo.includes(match));
        if (!matches) continue;
      }
      quickScored.push({ login: qs.login, qs, source: entry.source });
    }
    // Small delay between batches to avoid rate limits
    if (i + 10 < validMembers.length) await new Promise(r => setTimeout(r, 300));
  }

  // Top 35 for full profile
  quickScored.sort((a, b) => b.qs.score - a.qs.score);
  const topCandidates = quickScored.slice(0, 35);
  log.push(`${company} — ${quickScored.length} quick-scored, top ${topCandidates.length} for full profile`);

  // Full profile fetch in batches of 5 (slower but safer)
  const scored: { login: string; profile: ProfileData; score: number; source: string }[] = [];
  for (let i = 0; i < topCandidates.length; i += 5) {
    const batch = topCandidates.slice(i, i + 5);
    const profiles = await Promise.all(batch.map(c => fetchProfile(c.login)));
    for (let j = 0; j < profiles.length; j++) {
      const profile = profiles[j];
      if (!profile) continue;
      const score = (profile.followers * 2) + profile.totalStars;
      scored.push({ login: profile.login, profile, score, source: batch[j].source });
    }
    if (i + 5 < topCandidates.length) await new Promise(r => setTimeout(r, 500));
  }

  scored.sort((a, b) => b.score - a.score);
  const top30 = scored.slice(0, 30);
  log.push(`${company} — ${scored.length} full profiles, top ${top30.length} selected`);

  // Delete old contributors for THIS company only, then upsert new ones
  await sb.from('sv_contributors').delete().eq('company', company);

  let upserted = 0;
  for (const entry of top30) {
    const result = await upsertUser({
      ...entry.profile,
      addedBy: `silicon-valley-${company}`,
    });
    if (result) {
      const { error: upsertErr } = await sb.from('sv_contributors').upsert({
        login: result.login,
        company,
        contributions: entry.score,
        membership_verified: entry.source === 'org_member',
        org_name: config.orgs[0] ?? company,
        source: entry.source,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'login' });
      if (upsertErr) {
        log.push(`ERROR upserting ${result.login} — ${upsertErr.message}`);
      } else {
        upserted++;
      }
    }
  }

  log.push(`${company} — upserted ${upserted} contributors`);

  return { company, count: upserted, log };
}

async function refreshLanguageDevs() {
  const sb = getSupabaseServer();
  const log: string[] = [];

  await sb.from('sv_language_devs').delete().neq('login', '');

  const languageResults: Record<string, number> = {};
  for (const language of LANGUAGE_LIST) {
    const { data: langUsers } = await sb
      .from('city_users')
      .select('login, avatar_url, top_language, total_stars, followers, estimated_commits, total_score, public_repos, city_slot, city_rank')
      .eq('top_language', language)
      .order('total_score', { ascending: false })
      .limit(20);

    let count = 0;
    if (langUsers && Array.isArray(langUsers)) {
      for (const user of langUsers) {
        const { error: langErr } = await sb.from('sv_language_devs').upsert({
          login: user.login,
          language,
          contributions: user.total_score ?? 0,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'login' });
        if (!langErr) count++;
      }
    }
    languageResults[language] = count;
  }

  log.push(`Language devs — ${JSON.stringify(languageResults)}`);
  return { languages: languageResults, log };
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const companyParam = url.searchParams.get('company');

  // ── Single-company mode ──────────────────────────────────────────────────
  if (companyParam) {
    if (!COMPANY_CONFIG[companyParam]) {
      return NextResponse.json(
        { error: `Unknown company. Valid: ${Object.keys(COMPANY_CONFIG).join(', ')}` },
        { status: 400 }
      );
    }

    try {
      const result = await refreshSingleCompany(companyParam);
      return NextResponse.json({ success: true, ...result });
    } catch (error) {
      console.error(`[sv-refresh] Error refreshing ${companyParam}:`, error);
      return NextResponse.json(
        { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  }

  // ── Full refresh: iterate companies one by one ───────────────────────────
  const log: string[] = [];
  const companySummary: Record<string, { count: number }> = {};

  for (const company of Object.keys(COMPANY_CONFIG)) {
    log.push(`── Starting ${company} ──`);
    try {
      const result = await refreshSingleCompany(company);
      companySummary[company] = { count: result.count };
      log.push(...result.log);
      // Delay between companies to avoid GitHub rate limits
      await new Promise(r => setTimeout(r, 2000));
    } catch (error) {
      log.push(`ERROR: ${company} failed — ${error instanceof Error ? error.message : 'Unknown'}`);
      companySummary[company] = { count: 0 };
    }
  }

  // Language devs + ranks
  try {
    const langResult = await refreshLanguageDevs();
    log.push(...langResult.log);

    await recalculateRanks();
    log.push('Ranks recalculated');

    const totalContributors = Object.values(companySummary).reduce((sum, c) => sum + c.count, 0);

    return NextResponse.json({
      success: true,
      totalContributors,
      companies: companySummary,
      languages: langResult.languages,
      log,
    });
  } catch (error) {
    console.error('[sv-refresh] Fatal error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error', log },
      { status: 500 }
    );
  }
}

// GET handler — allows triggering refresh from browser URL bar
export async function GET(request: Request) {
  return POST(request);
}
