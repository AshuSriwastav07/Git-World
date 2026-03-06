// API: Batch refresh stats for existing users
import { NextRequest, NextResponse } from 'next/server';
import { githubFetch } from '@/lib/githubTokens';

export async function POST(request: NextRequest) {
  try {
    const { logins } = await request.json() as { logins: string[] };
    if (!Array.isArray(logins) || logins.length === 0) {
      return NextResponse.json({ error: 'logins array required' }, { status: 400 });
    }

    const results: Record<string, unknown>[] = [];

    // Process in batches of 5
    for (let i = 0; i < Math.min(logins.length, 50); i += 5) {
      const batch = logins.slice(i, i + 5);
      const profiles = await Promise.all(
        batch.map(async (login) => {
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
            if (Array.isArray(repos)) {
              for (const repo of repos) {
                totalStars += repo.stargazers_count || 0;
                totalForks += repo.forks_count || 0;
                if (repo.language) langCount[repo.language] = (langCount[repo.language] || 0) + 1;
              }
            }
            const topLanguage = Object.entries(langCount).sort(([, a], [, b]) => b - a)[0]?.[0] || 'Unknown';

            let estimatedCommits = 0, recentActivity = 0;
            const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
            if (Array.isArray(events)) {
              for (const event of events) {
                if (event.type === 'PushEvent') estimatedCommits += event.payload?.commits?.length || 0;
                if (new Date(event.created_at).getTime() > thirtyDaysAgo) recentActivity++;
              }
            }
            estimatedCommits = Math.round(estimatedCommits * 3.5);
            recentActivity = Math.min(recentActivity, 100);

            return {
              login: user.login,
              followers: user.followers,
              publicRepos: user.public_repos,
              totalStars,
              totalForks,
              topLanguage,
              estimatedCommits,
              recentActivity,
              totalScore: estimatedCommits * 3 + totalStars * 2 + (user.followers || 0) + (user.public_repos || 0) * 0.5 + recentActivity * 10,
            };
          } catch {
            return null;
          }
        })
      );
      results.push(...profiles.filter(Boolean) as Record<string, unknown>[]);
    }

    return NextResponse.json({ updated: results });
  } catch (error) {
    console.error('Refresh error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
