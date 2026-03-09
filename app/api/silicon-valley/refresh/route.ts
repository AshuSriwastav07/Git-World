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

  while (page <= 10) { // safety cap at 1000 members
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
// POST handler — full Silicon Valley refresh (org members)
// ══════════════════════════════════════════════════════════════════════════════

export async function POST() {
  const sb = getSupabaseServer();
  const log: string[] = [];

  try {
    // ── PHASE 1: Fetch public org members + profiles, rank, take top 30 per company ──

    // company → { login, profile, score, source }[]
    const companyRanked = new Map<string, { login: string; profile: ProfileData; score: number; source: string }[]>();

    for (const [company, config] of Object.entries(COMPANY_CONFIG)) {
      const seenLogins = new Set<string>();
      let allMembers: { member: OrgMember; source: string; orgName: string }[] = [];

      // Step 1: Try each org in the list
      for (const orgName of config.orgs) {
        const orgMembers = await fetchOrgMembers(orgName);
        log.push(`Phase 1: ${company} — org '${orgName}' returned ${orgMembers.length} members`);
        for (const m of orgMembers) {
          const key = m.login.toLowerCase();
          if (!seenLogins.has(key)) {
            seenLogins.add(key);
            allMembers.push({ member: m, source: 'org_member', orgName });
          }
        }
      }

      log.push(`Phase 1: ${company} — ${seenLogins.size} unique members after all orgs`);

      // Step 2: If still below 30, supplement with search queries
      if (seenLogins.size < 30) {
        for (const term of config.searchTerms) {
          if (seenLogins.size >= 60) break; // enough candidates
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
          log.push(`Phase 1: ${company} — search '${term}' added ${added} new users`);
        }
      }

      // Filter: type=User, not a bot
      const validMembers = allMembers.filter(
        m => m.member.type === 'User' && !isBot(m.member.login)
      );
      log.push(`Phase 1: ${company} — ${validMembers.length} after User+bot filter`);

      // Fetch profiles in batches of 5
      const scored: { login: string; profile: ProfileData; score: number; source: string }[] = [];

      for (let i = 0; i < validMembers.length; i += 5) {
        const batch = validMembers.slice(i, i + 5);
        const profiles = await Promise.all(batch.map(m => fetchProfile(m.member.login)));

        for (let j = 0; j < profiles.length; j++) {
          const profile = profiles[j];
          if (!profile) continue;

          const entry = batch[j];

          // For search-sourced users, verify their profile company field
          if (entry.source === 'profile_search' && profile.company) {
            const profileCo = profile.company.toLowerCase().replace(/^@/, '');
            const matches = config.profileCompanyMatch.some(
              match => profileCo.includes(match)
            );
            if (!matches) {
              log.push(`Phase 1: ${company} — skipping ${profile.login} (company: '${profile.company}' doesn't match)`);
              continue;
            }
          }

          // Ranking score: followers×2 + total_stars×1
          const score = (profile.followers * 2) + profile.totalStars;
          scored.push({ login: profile.login, profile, score, source: entry.source });
        }
      }

      // Sort by score desc, take top 30
      scored.sort((a, b) => b.score - a.score);
      companyRanked.set(company, scored.slice(0, 30));

      log.push(`Phase 1: ${company} — ${scored.length} profiles scored, top ${Math.min(scored.length, 30)} selected`);
    }

    // ── PHASE 2: Cross-company deduplication ───────────────────────────────

    const loginCompanies = new Map<string, { company: string; score: number; source: string }[]>();

    for (const [company, ranked] of companyRanked) {
      for (const entry of ranked) {
        const key = entry.login.toLowerCase();
        const entries = loginCompanies.get(key) ?? [];
        entries.push({ company, score: entry.score, source: entry.source });
        loginCompanies.set(key, entries);
      }
    }

    const removals = new Map<string, Set<string>>();

    for (const [loginKey, entries] of loginCompanies) {
      if (entries.length <= 1) continue;
      entries.sort((a, b) => b.score - a.score);
      const keepCompany = entries[0].company;

      for (let i = 1; i < entries.length; i++) {
        const removeFrom = entries[i].company;
        if (!removals.has(removeFrom)) removals.set(removeFrom, new Set());
        removals.get(removeFrom)!.add(loginKey);
      }

      log.push(`Phase 2: Dedup — ${loginKey} kept in ${keepCompany}, removed from ${entries.slice(1).map(e => e.company).join(', ')}`);
    }

    for (const [company, loginsToRemove] of removals) {
      const ranked = companyRanked.get(company);
      if (!ranked) continue;
      companyRanked.set(
        company,
        ranked.filter(e => !loginsToRemove.has(e.login.toLowerCase()))
      );
    }

    // ── PHASE 3: Upsert profiles into city_users + sv_contributors ─────────

    const finalContribs: { company: string; login: string; score: number; source: string }[] = [];

    // Delete ALL existing sv_contributors (old data)
    await sb.from('sv_contributors').delete().neq('login', '');

    for (const [company, ranked] of companyRanked) {
      let upserted = 0;

      for (const entry of ranked) {
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
            org_name: COMPANY_CONFIG[company]?.orgs[0] ?? company,
            source: entry.source,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'login' });

          if (upsertErr) {
            log.push(`Phase 3: ERROR upserting ${result.login} — ${upsertErr.message}`);
            console.error(`[sv-refresh] sv_contributors upsert failed for ${result.login}:`, upsertErr.message);
          } else {
            finalContribs.push({ company, login: result.login, score: entry.score, source: entry.source });
            upserted++;
          }
        }
      }

      log.push(`Phase 3: ${company} — upserted ${upserted} verified members`);
    }

    log.push(`Phase 3: Total ${finalContribs.length} contributors inserted`);

    // ── PHASE 4: Language devs — query city_users by top_language ───────────

    await sb.from('sv_language_devs').delete().neq('login', '');

    const languageResults: Record<string, number> = {};

    for (const language of LANGUAGE_LIST) {
      // Query existing city_users who have this top_language
      const { data: langUsers } = await sb
        .from('city_users')
        .select('login, avatar_url, top_language, total_stars, followers, estimated_commits, total_score, public_repos, city_slot, city_rank')
        .eq('top_language', language)
        .order('total_score', { ascending: false })
        .limit(20);

      let count = 0;
      if (langUsers && Array.isArray(langUsers)) {
        const topLogins = new Set<string>();
        for (const user of langUsers) {
          const { error: langErr } = await sb.from('sv_language_devs').upsert({
            login: user.login,
            language,
            contributions: user.total_score ?? 0,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'login' });

          if (langErr) {
            log.push(`Phase 4: ERROR upserting ${user.login} for ${language} — ${langErr.message}`);
          } else {
            topLogins.add(user.login);
            count++;
          }
        }

        // Delete stale language devs not in current top 20
        const { data: allLangDevs } = await sb
          .from('sv_language_devs')
          .select('login')
          .eq('language', language);
        if (allLangDevs) {
          const staleLogins = allLangDevs
            .filter(d => !topLogins.has(d.login))
            .map(d => d.login);
          if (staleLogins.length > 0) {
            await sb.from('sv_language_devs').delete().in('login', staleLogins);
          }
        }
      }

      languageResults[language] = count;
    }

    log.push(`Phase 4: Language devs — ${JSON.stringify(languageResults)}`);

    // ── PHASE 5: Recalculate ranks ─────────────────────────────────────────

    await recalculateRanks();
    log.push('Phase 5: Ranks recalculated');

    // ── Build result summary ───────────────────────────────────────────────

    const companySummary: Record<string, { count: number; logins: string[] }> = {};
    for (const company of Object.keys(COMPANY_CONFIG)) {
      const entries = finalContribs.filter(e => e.company === company);
      companySummary[company] = {
        count: entries.length,
        logins: entries.map(e => e.login),
      };
    }

    return NextResponse.json({
      success: true,
      totalContributors: finalContribs.length,
      companies: companySummary,
      languages: languageResults,
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
export async function GET() {
  return POST();
}
