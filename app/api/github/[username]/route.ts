import { NextRequest, NextResponse } from 'next/server';
import { githubFetch } from '@/lib/githubTokens';
import { getSupabaseServer } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;

  try {
    const userRes = await githubFetch(`https://api.github.com/users/${encodeURIComponent(username)}`, {
      signal: AbortSignal.timeout(8000),
    });

    if (userRes.status === 404) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
    if (userRes.status === 403 || userRes.status === 429) {
      // Fallback: return cached data from database if available
      const sb = getSupabaseServer();
      const { data: dbUser } = await sb
        .from('city_users')
        .select('*')
        .eq('login', username.toLowerCase())
        .single();

      if (dbUser) {
        return NextResponse.json({
          login: dbUser.login,
          name: dbUser.name || '',
          avatarUrl: dbUser.avatar_url || '',
          bio: dbUser.bio || '',
          location: dbUser.location || '',
          company: dbUser.company || '',
          publicRepos: dbUser.public_repos || 0,
          followers: dbUser.followers || 0,
          following: dbUser.following || 0,
          githubCreatedAt: dbUser.github_created_at || '',
          totalStars: dbUser.total_stars || 0,
          totalForks: dbUser.total_forks || 0,
          topLanguage: dbUser.top_language || 'Unknown',
          estimatedCommits: dbUser.estimated_commits || 0,
          recentActivity: dbUser.recent_activity || 0,
          topRepos: dbUser.top_repos || [],
          totalScore: dbUser.total_score || 0,
        });
      }

      const retryAfter = userRes.headers.get('retry-after') ?? '60';
      return NextResponse.json({ error: 'rate_limited', retryAfter: Number(retryAfter) }, { status: 429 });
    }
    if (!userRes.ok) {
      return NextResponse.json({ error: 'github_error' }, { status: 502 });
    }

    const user = await userRes.json();
    if (user.type !== 'User') {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const [reposResult, eventsResult] = await Promise.allSettled([
      githubFetch(`https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&sort=stars`, {
        signal: AbortSignal.timeout(7000),
      }).then((response) => (response.ok ? response.json() : [])),
      githubFetch(`https://api.github.com/users/${encodeURIComponent(username)}/events/public?per_page=100`, {
        signal: AbortSignal.timeout(7000),
      }).then((response) => (response.ok ? response.json() : [])),
    ]);

    const repos = reposResult.status === 'fulfilled' ? reposResult.value : [];
    const events = eventsResult.status === 'fulfilled' ? eventsResult.value : [];

    let totalStars = 0;
    let totalForks = 0;
    const langCount: Record<string, number> = {};
    const topRepos: { name: string; stars: number; forks: number; language: string; description: string | null; url: string }[] = [];

    if (Array.isArray(repos)) {
      for (const repo of repos) {
        totalStars += repo.stargazers_count || 0;
        totalForks += repo.forks_count || 0;
        if (repo.language) {
          langCount[repo.language] = (langCount[repo.language] || 0) + 1;
        }
      }

      const sortedRepos = [...repos].sort(
        (a: { stargazers_count: number }, b: { stargazers_count: number }) =>
          b.stargazers_count - a.stargazers_count,
      );
      for (const repo of sortedRepos.slice(0, 5)) {
        topRepos.push({
          name: repo.name,
          stars: repo.stargazers_count ?? 0,
          forks: repo.forks_count ?? 0,
          language: repo.language ?? 'Unknown',
          description: repo.description?.slice(0, 80) || null,
          url: repo.html_url,
        });
      }
    }

    const topLanguage =
      Object.entries(langCount).sort(([, a], [, b]) => b - a)[0]?.[0] || 'Unknown';

    let estimatedCommits = 0;
    let recentActivity = 0;
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    if (Array.isArray(events)) {
      for (const event of events) {
        if (event.type === 'PushEvent') {
          const count = event.payload?.commits?.length || 0;
          estimatedCommits += count;
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

    return NextResponse.json({
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
    });
  } catch (error: unknown) {
    console.error('GitHub API error:', error);
    if (error instanceof DOMException && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
      return NextResponse.json({ error: 'timeout' }, { status: 504 });
    }
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
