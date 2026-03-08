// API: Refresh Silicon Valley park data
// Phase 1 — Fetch contributors from GitHub repos per company
// Phase 2 — Upsert each dev into city_users (full city resident)
// Phase 3 — Populate sv_contributors table
// Phase 4 — Populate sv_language_devs table
// Phase 5 — Recalculate ranks
import { NextResponse } from 'next/server';
import { githubFetch } from '@/lib/githubTokens';
import { upsertUser, recalculateRanks } from '@/lib/supabaseDb';
import { getSupabaseServer } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const COMPANY_REPOS: Record<string, string[]> = {
  apple: [
    'apple/swift', 'apple/swift-evolution',
    'apple/ml-stable-diffusion', 'apple/pkl', 'apple/foundationdb',
  ],
  google: [
    'google/jax', 'google/mediapipe', 'google/leveldb',
    'google/googletest', 'google/material-design-icons', 'google/flatbuffers',
  ],
  nvidia: [
    'NVIDIA/cuda-samples', 'NVIDIA/TensorRT', 'NVIDIA/apex',
    'NVIDIA/NeMo', 'NVIDIA/Megatron-LM',
  ],
  meta: [
    'facebook/react', 'facebook/pytorch', 'facebook/rocksdb',
    'facebookresearch/llama', 'facebook/folly',
  ],
};

const LANGUAGE_REPOS: Record<string, string[]> = {
  Python: ['python/cpython', 'pallets/flask', 'psf/requests'],
  JavaScript: ['nodejs/node', 'expressjs/express', 'lodash/lodash'],
  TypeScript: ['microsoft/TypeScript', 'microsoft/vscode', 'angular/angular'],
  Java: ['spring-projects/spring-boot', 'apache/kafka', 'elastic/elasticsearch'],
  Rust: ['rust-lang/rust', 'denoland/deno', 'alacritty/alacritty'],
  Go: ['golang/go', 'kubernetes/kubernetes', 'gohugoio/hugo'],
  'C++': ['opencv/opencv', 'grpc/grpc', 'nlohmann/json'],
  Kotlin: ['JetBrains/kotlin', 'square/okhttp', 'square/leakcanary'],
};

interface ContributorInfo {
  login: string;
  avatarUrl: string;
  contributions: number;
}

interface ProfileData {
  login: string; name: string; avatarUrl: string; bio: string;
  location: string; company: string; publicRepos: number; followers: number;
  following: number; githubCreatedAt: string; totalStars: number; totalForks: number;
  topLanguage: string; estimatedCommits: number; recentActivity: number;
  totalScore: number;
  topRepos: { name: string; stars: number; forks: number; language: string; description: string; url: string }[];
}

async function fetchRepoContributors(repo: string): Promise<ContributorInfo[]> {
  try {
    const res = await githubFetch(
      `https://api.github.com/repos/${repo}/contributors?per_page=30`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data
      .filter((c: { type?: string }) => c.type === 'User')
      .map((c: { login: string; avatar_url: string; contributions: number }) => ({
        login: c.login,
        avatarUrl: c.avatar_url,
        contributions: c.contributions ?? 0,
      }));
  } catch {
    return [];
  }
}

async function fetchProfile(login: string): Promise<ProfileData | null> {
  try {
    const userRes = await githubFetch(
      `https://api.github.com/users/${encodeURIComponent(login)}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!userRes.ok) return null;
    const user = await userRes.json();
    if (user.type !== 'User') return null;

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
    estimatedCommits = Math.round(estimatedCommits * 3.5);
    recentActivity = Math.min(recentActivity, 100);

    const totalScore = Math.round(
      estimatedCommits * 3 + totalStars * 2 + (user.followers || 0) * 1 +
      (user.public_repos || 0) * 0.5 + recentActivity * 10
    );

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

export async function POST() {
  const sb = getSupabaseServer();
  const results: Record<string, { upserted: number; logins: string[] }> = {};
  let totalUpserted = 0;

  // ── Phase 1 + 2: Fetch company contributors → upsert into city_users ──
  const companyContribs: Record<string, { login: string; contributions: number }[]> = {};

  for (const [company, repos] of Object.entries(COMPANY_REPOS)) {
    const allResults = await Promise.all(repos.map(fetchRepoContributors));

    const merged = new Map<string, ContributorInfo>();
    for (const contributors of allResults) {
      for (const c of contributors) {
        const key = c.login.toLowerCase();
        const existing = merged.get(key);
        if (existing) {
          existing.contributions += c.contributions;
        } else {
          merged.set(key, { ...c });
        }
      }
    }

    const top30 = Array.from(merged.values())
      .sort((a, b) => b.contributions - a.contributions)
      .slice(0, 30);

    const companyResult: string[] = [];
    const contribEntries: { login: string; contributions: number }[] = [];

    // Upsert into city_users in batches of 5
    for (let i = 0; i < top30.length; i += 5) {
      const batch = top30.slice(i, i + 5);
      const profiles = await Promise.all(batch.map(c => fetchProfile(c.login)));

      for (let j = 0; j < profiles.length; j++) {
        const profile = profiles[j];
        if (!profile) continue;

        const upserted = await upsertUser({
          ...profile,
          addedBy: `silicon-valley-${company}`,
        });

        if (upserted) {
          companyResult.push(upserted.login);
          contribEntries.push({ login: upserted.login, contributions: batch[j].contributions });
          totalUpserted++;
        }
      }
    }

    companyContribs[company] = contribEntries;
    results[company] = { upserted: companyResult.length, logins: companyResult };
  }

  // ── Phase 3: Populate sv_contributors ──
  for (const [company, entries] of Object.entries(companyContribs)) {
    for (const entry of entries) {
      await sb.from('sv_contributors').upsert({
        login: entry.login,
        company,
        contributions: entry.contributions,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'login' });
    }
  }

  // ── Phase 4: Language devs — fetch, upsert into city_users, then sv_language_devs ──
  const languageResults: Record<string, number> = {};

  for (const [language, repos] of Object.entries(LANGUAGE_REPOS)) {
    const allResults = await Promise.all(repos.map(fetchRepoContributors));

    const merged = new Map<string, ContributorInfo>();
    for (const contribs of allResults) {
      for (const c of contribs) {
        const key = c.login.toLowerCase();
        const existing = merged.get(key);
        if (existing) {
          existing.contributions += c.contributions;
        } else {
          merged.set(key, { ...c });
        }
      }
    }

    const top8 = Array.from(merged.values())
      .sort((a, b) => b.contributions - a.contributions)
      .slice(0, 8);

    let count = 0;
    for (let i = 0; i < top8.length; i += 5) {
      const batch = top8.slice(i, i + 5);
      const profiles = await Promise.all(batch.map(c => fetchProfile(c.login)));

      for (let j = 0; j < profiles.length; j++) {
        const profile = profiles[j];
        if (!profile) continue;

        const upserted = await upsertUser({
          ...profile,
          addedBy: `silicon-valley-lang-${language}`,
        });

        if (upserted) {
          await sb.from('sv_language_devs').upsert({
            login: upserted.login,
            language,
            contributions: batch[j].contributions,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'login' });
          count++;
        }
      }
    }

    languageResults[language] = count;
  }

  // ── Phase 5: Recalculate ranks ──
  await recalculateRanks();

  return NextResponse.json({
    success: true,
    totalUpserted,
    companies: results,
    languages: languageResults,
  });
}
