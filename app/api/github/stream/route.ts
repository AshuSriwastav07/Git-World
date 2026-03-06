// SSE Discovery — 30 parallel queries to find thousands of developers
import { NextRequest } from 'next/server';
import { githubFetch } from '@/lib/githubTokens';
import { getAllStoredUsernames } from '@/lib/firestore';

export const dynamic = 'force-dynamic';

interface SearchQuery {
  q: string;
  label: string;
  maxPages: number;
}

const SEARCH_QUERIES: SearchQuery[] = [
  // Follower brackets
  { q: 'followers:>100000', label: 'followers>100k', maxPages: 3 },
  { q: 'followers:50000..100000', label: 'followers50k-100k', maxPages: 3 },
  { q: 'followers:20000..50000', label: 'followers20k-50k', maxPages: 5 },
  { q: 'followers:10000..20000', label: 'followers10k-20k', maxPages: 5 },
  { q: 'followers:5000..10000', label: 'followers5k-10k', maxPages: 5 },
  { q: 'followers:2000..5000', label: 'followers2k-5k', maxPages: 5 },
  { q: 'followers:1000..2000', label: 'followers1k-2k', maxPages: 5 },
  { q: 'followers:500..1000', label: 'followers500-1k', maxPages: 5 },
  { q: 'followers:200..500', label: 'followers200-500', maxPages: 3 },
  { q: 'followers:100..200', label: 'followers100-200', maxPages: 3 },
  // Language-specific
  { q: 'language:javascript followers:>200', label: 'lang-js', maxPages: 3 },
  { q: 'language:typescript followers:>200', label: 'lang-ts', maxPages: 3 },
  { q: 'language:python followers:>200', label: 'lang-py', maxPages: 3 },
  { q: 'language:rust followers:>200', label: 'lang-rust', maxPages: 3 },
  { q: 'language:go followers:>200', label: 'lang-go', maxPages: 3 },
  { q: 'language:ruby followers:>200', label: 'lang-ruby', maxPages: 3 },
  { q: 'language:java followers:>200', label: 'lang-java', maxPages: 3 },
  { q: 'language:cpp followers:>200', label: 'lang-cpp', maxPages: 3 },
  { q: 'language:swift followers:>200', label: 'lang-swift', maxPages: 3 },
  { q: 'language:kotlin followers:>200', label: 'lang-kotlin', maxPages: 3 },
  { q: 'language:php followers:>200', label: 'lang-php', maxPages: 3 },
  { q: 'language:csharp followers:>200', label: 'lang-csharp', maxPages: 3 },
  // Repo count
  { q: 'repos:>500', label: 'repos>500', maxPages: 3 },
  { q: 'repos:200..500', label: 'repos200-500', maxPages: 3 },
  { q: 'repos:100..200', label: 'repos100-200', maxPages: 3 },
  // Rising stars
  { q: 'followers:>500 created:>2022-01-01', label: 'rising-2022', maxPages: 3 },
  { q: 'followers:>200 created:>2023-01-01', label: 'rising-2023', maxPages: 3 },
  { q: 'followers:>100 created:>2024-01-01', label: 'rising-2024', maxPages: 3 },
  // Organizations
  { q: 'type:org followers:>5000', label: 'org-big', maxPages: 2 },
  { q: 'type:org followers:1000..5000', label: 'org-mid', maxPages: 2 },
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
        logins.push(item.login);
      }
    } catch {
      break;
    }
  }
  return logins;
}

async function fetchProfile(login: string): Promise<Record<string, unknown> | null> {
  try {
    const [userRes, reposRes, eventsRes] = await Promise.all([
      githubFetch(`https://api.github.com/users/${encodeURIComponent(login)}`),
      githubFetch(`https://api.github.com/users/${encodeURIComponent(login)}/repos?per_page=100&sort=updated`),
      githubFetch(`https://api.github.com/users/${encodeURIComponent(login)}/events/public?per_page=100`),
    ]);

    if (!userRes.ok) return null;
    const user = await userRes.json();
    const repos = reposRes.ok ? await reposRes.json() : [];
    const events = eventsRes.ok ? await eventsRes.json() : [];

    let totalStars = 0, totalForks = 0;
    const langCount: Record<string, number> = {};
    const languages: string[] = [];
    const topRepos: { name: string; stars: number; forks: number; language: string | null; description: string | null; url: string }[] = [];

    if (Array.isArray(repos)) {
      for (const repo of repos) {
        totalStars += repo.stargazers_count || 0;
        totalForks += repo.forks_count || 0;
        if (repo.language) {
          langCount[repo.language] = (langCount[repo.language] || 0) + 1;
          if (!languages.includes(repo.language)) languages.push(repo.language);
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

    const totalScore =
      estimatedCommits * 3 + totalStars * 2 + (user.followers || 0) * 1 +
      (user.public_repos || 0) * 0.5 + recentActivity * 10;

    return {
      login: user.login,
      name: user.name,
      avatarUrl: user.avatar_url,
      bio: user.bio,
      location: user.location,
      company: user.company,
      publicRepos: user.public_repos || 0,
      followers: user.followers || 0,
      following: user.following || 0,
      createdAt: user.created_at,
      totalStars,
      totalForks,
      topLanguage,
      estimatedCommits,
      recentActivity,
      topRepos,
      languages,
      totalScore,
    };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  const seen = new Set<string>();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      send({ type: 'status', message: 'Loading stored users...', total: SEARCH_QUERIES.length });

      // Load already-stored usernames to avoid re-fetching from GitHub
      let storedUsernames = new Set<string>();
      try {
        storedUsernames = await getAllStoredUsernames();
      } catch {
        // If Firebase read fails, proceed without dedup
      }

      send({ type: 'status', message: `Starting discovery (${storedUsernames.size} already stored)...`, total: SEARCH_QUERIES.length });

      // Run all searches in parallel
      const searchResults = await Promise.allSettled(
        SEARCH_QUERIES.map((sq) => searchUsers(sq))
      );

      const allLogins: string[] = [];
      searchResults.forEach((result, i) => {
        if (result.status === 'fulfilled') {
          for (const login of result.value) {
            const key = login.toLowerCase();
            if (!seen.has(key) && !storedUsernames.has(key)) {
              seen.add(key);
              allLogins.push(login);
            }
          }
        }
      });

      send({ type: 'status', message: `Found ${allLogins.length} new users (skipped ${storedUsernames.size} stored), fetching profiles...` });

      // Fetch profiles in batches of 5
      let completed = 0;
      for (let i = 0; i < allLogins.length; i += 5) {
        const batch = allLogins.slice(i, i + 5);
        const profiles = await Promise.all(batch.map(fetchProfile));
        for (const profile of profiles) {
          if (profile) {
            send({ type: 'user', data: profile });
            completed++;
          }
        }
        if (completed % 50 === 0) {
          send({ type: 'progress', completed, total: allLogins.length });
        }
      }

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
