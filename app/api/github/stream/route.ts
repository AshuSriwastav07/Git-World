// SSE Discovery — parallel queries to find developers, upsert directly to Supabase
import { githubFetch } from '@/lib/githubTokens';
import { getAllStoredLogins, upsertUser, recalculateRanks } from '@/lib/supabaseDb';

export const dynamic = 'force-dynamic';

interface SearchQuery {
  q: string;
  label: string;
  maxPages: number;
}

const SEARCH_QUERIES: SearchQuery[] = [
  { q: 'followers:>100000 type:user', label: 'followers>100k', maxPages: 3 },
  { q: 'followers:50000..100000 type:user', label: 'followers50k-100k', maxPages: 3 },
  { q: 'followers:20000..50000 type:user', label: 'followers20k-50k', maxPages: 5 },
  { q: 'followers:10000..20000 type:user', label: 'followers10k-20k', maxPages: 5 },
  { q: 'followers:5000..10000 type:user', label: 'followers5k-10k', maxPages: 5 },
  { q: 'followers:2000..5000 type:user', label: 'followers2k-5k', maxPages: 5 },
  { q: 'followers:1000..2000 type:user', label: 'followers1k-2k', maxPages: 5 },
  { q: 'followers:500..1000 type:user', label: 'followers500-1k', maxPages: 5 },
  { q: 'followers:200..500 type:user', label: 'followers200-500', maxPages: 3 },
  { q: 'followers:100..200 type:user', label: 'followers100-200', maxPages: 3 },
  { q: 'language:javascript followers:>200 type:user', label: 'lang-js', maxPages: 3 },
  { q: 'language:typescript followers:>150 type:user', label: 'lang-ts', maxPages: 3 },
  { q: 'language:python followers:>300 type:user', label: 'lang-py', maxPages: 3 },
  { q: 'language:rust followers:>80 type:user', label: 'lang-rust', maxPages: 3 },
  { q: 'language:go followers:>150 type:user', label: 'lang-go', maxPages: 3 },
  { q: 'language:ruby followers:>150 type:user', label: 'lang-ruby', maxPages: 3 },
  { q: 'language:java followers:>150 type:user', label: 'lang-java', maxPages: 3 },
  { q: 'language:cpp followers:>80 type:user', label: 'lang-cpp', maxPages: 3 },
  { q: 'language:csharp followers:>80 type:user', label: 'lang-csharp', maxPages: 3 },
  { q: 'language:swift followers:>80 type:user', label: 'lang-swift', maxPages: 3 },
  { q: 'language:kotlin followers:>60 type:user', label: 'lang-kotlin', maxPages: 3 },
  { q: 'language:php followers:>150 type:user', label: 'lang-php', maxPages: 3 },
  { q: 'language:shell followers:>100 type:user', label: 'lang-shell', maxPages: 3 },
  { q: 'language:html followers:>100 type:user', label: 'lang-html', maxPages: 3 },
  { q: 'repos:>200 followers:>50 type:user', label: 'repos>200', maxPages: 3 },
  { q: 'repos:>100 followers:>100 type:user', label: 'repos>100', maxPages: 3 },
  { q: 'followers:>300 created:>2022-01-01 type:user', label: 'rising-2022', maxPages: 3 },
  { q: 'followers:>100 created:>2023-01-01 type:user', label: 'rising-2023', maxPages: 3 },
  { q: 'repos:>50 followers:>50 pushed:>2025-01-01 type:user', label: 'recent-active', maxPages: 3 },
];

async function searchUsers(searchQuery: SearchQuery): Promise<string[]> {
  const logins: string[] = [];
  for (let page = 1; page <= searchQuery.maxPages; page++) {
    try {
      const res = await githubFetch(
        `https://api.github.com/search/users?q=${encodeURIComponent(searchQuery.q)}&per_page=100&page=${page}`
      );
      if (!res.ok) break;
      const data = await res.json();
      if (!data.items || data.items.length === 0) break;
      for (const item of data.items) {
        if (item.type !== 'User') continue;
        logins.push(item.login);
      }
    } catch {
      break;
    }
  }
  return logins;
}

interface ProfileData {
  login: string; name: string; avatarUrl: string; bio: string;
  location: string; company: string; publicRepos: number; followers: number;
  following: number; githubCreatedAt: string; totalStars: number; totalForks: number;
  topLanguage: string; estimatedCommits: number; recentActivity: number;
  totalScore: number; topRepos: { name: string; stars: number; forks: number; language: string; description: string; url: string }[];
}

async function fetchProfile(login: string): Promise<ProfileData | null> {
  try {
    const userRes = await githubFetch(`https://api.github.com/users/${encodeURIComponent(login)}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!userRes.ok) return null;
    const user = await userRes.json();
    if (user.type !== 'User') return null;
    if ((user.public_repos ?? 0) === 0 && (user.followers ?? 0) === 0) return null;

    const [reposResult, eventsResult] = await Promise.allSettled([
      githubFetch(`https://api.github.com/users/${encodeURIComponent(login)}/repos?per_page=100&sort=updated`, {
        signal: AbortSignal.timeout(7000),
      }).then((response) => (response.ok ? response.json() : [])),
      githubFetch(`https://api.github.com/users/${encodeURIComponent(login)}/events/public?per_page=100`, {
        signal: AbortSignal.timeout(7000),
      }).then((response) => (response.ok ? response.json() : [])),
    ]);

    const repos = reposResult.status === 'fulfilled' ? reposResult.value : [];
    const events = eventsResult.status === 'fulfilled' ? eventsResult.value : [];

    let totalStars = 0, totalForks = 0;
    const langCount: Record<string, number> = {};
    const topRepos: { name: string; stars: number; forks: number; language: string | null; description: string | null; url: string }[] = [];

    if (Array.isArray(repos)) {
      for (const repo of repos) {
        totalStars += repo.stargazers_count || 0;
        totalForks += repo.forks_count || 0;
        if (repo.language) {
          langCount[repo.language] = (langCount[repo.language] || 0) + 1;
        }
      }
      const sorted = [...repos].sort((a: { stargazers_count: number }, b: { stargazers_count: number }) => b.stargazers_count - a.stargazers_count);
      for (const repo of sorted.slice(0, 5)) {
        topRepos.push({
          name: repo.name,
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          language: repo.language,
          description: repo.description?.slice(0, 80) || null,
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
      totalStars,
      totalForks,
      topLanguage,
      estimatedCommits,
      recentActivity,
      topRepos: topRepos.map(r => ({ ...r, language: r.language || '', description: r.description || '' })),
      totalScore,
    };
  } catch {
    return null;
  }
}

export async function GET() {
  const encoder = new TextEncoder();
  const seen = new Set<string>();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      send({ type: 'status', message: 'Loading stored users...', total: SEARCH_QUERIES.length });

      let storedLogins = new Set<string>();
      try {
        storedLogins = await getAllStoredLogins();
      } catch {
        // proceed without dedup
      }

      send({ type: 'status', message: `Starting discovery (${storedLogins.size} already stored)...`, total: SEARCH_QUERIES.length });

      // Run all searches in parallel
      const searchResults = await Promise.allSettled(
        SEARCH_QUERIES.map((sq) => searchUsers(sq))
      );

      const allLogins: string[] = [];
      searchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          for (const login of result.value) {
            const key = login.toLowerCase();
            if (!seen.has(key) && !storedLogins.has(key)) {
              seen.add(key);
              allLogins.push(login);
            }
          }
        }
      });

      send({ type: 'status', message: `Found ${allLogins.length} new users (skipped ${storedLogins.size} stored), fetching profiles...` });

      // Fetch profiles in batches of 5 and upsert directly
      let completed = 0;
      for (let i = 0; i < allLogins.length; i += 5) {
        const batch = allLogins.slice(i, i + 5);
        const profiles = await Promise.all(batch.map(fetchProfile));
        for (const profile of profiles) {
          if (!profile) continue;
          try {
            const saved = await upsertUser({ ...profile, addedBy: 'stream' });
            if (saved) {
              send({ type: 'user', data: {
                login: saved.login,
                citySlot: saved.citySlot,
                cityRank: saved.cityRank,
                topLanguage: saved.topLanguage,
                totalScore: saved.totalScore,
                avatarUrl: saved.avatarUrl,
                estimatedCommits: saved.estimatedCommits,
                totalStars: saved.totalStars,
                publicRepos: saved.publicRepos,
                recentActivity: saved.recentActivity,
                firstAddedAt: saved.firstAddedAt,
              } });
              completed++;
            }
          } catch { /* skip */ }
        }
        if (completed % 50 === 0) {
          send({ type: 'progress', completed, total: allLogins.length });
        }
      }

      // Recalculate ranks after all users have been added
      try { await recalculateRanks(); } catch { /* best effort */ }

      send({ type: 'done', total: completed });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
