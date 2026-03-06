// API: Fetch single GitHub user profile + repos + events
import { NextRequest, NextResponse } from 'next/server';
import { githubFetch } from '@/lib/githubTokens';
import type { DeveloperProfile, RepoInfo } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;

  try {
    const signal = AbortSignal.timeout(8000);
    const [userRes, reposRes, eventsRes] = await Promise.all([
      githubFetch(`https://api.github.com/users/${encodeURIComponent(username)}`, { signal }),
      githubFetch(`https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&sort=updated`, { signal }),
      githubFetch(`https://api.github.com/users/${encodeURIComponent(username)}/events/public?per_page=100`, { signal }),
    ]);

    if (userRes.status === 404) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    if (userRes.status === 403 || userRes.status === 429) {
      const reset = userRes.headers.get('x-ratelimit-reset');
      return NextResponse.json(
        { error: 'Rate limited', resetAt: reset ? Number(reset) * 1000 : null },
        { status: 429 }
      );
    }
    if (!userRes.ok) {
      return NextResponse.json({ error: 'GitHub API error' }, { status: userRes.status });
    }

    const user = await userRes.json();
    const repos = reposRes.ok ? await reposRes.json() : [];
    const events = eventsRes.ok ? await eventsRes.json() : [];

    // Calculate stats
    let totalStars = 0;
    let totalForks = 0;
    const langCount: Record<string, number> = {};
    const languages: string[] = [];
    const topRepos: RepoInfo[] = [];

    for (const repo of repos) {
      totalStars += repo.stargazers_count || 0;
      totalForks += repo.forks_count || 0;
      if (repo.language) {
        langCount[repo.language] = (langCount[repo.language] || 0) + 1;
        if (!languages.includes(repo.language)) languages.push(repo.language);
      }
    }

    // Top repos by stars
    const sortedRepos = [...repos].sort(
      (a: { stargazers_count: number }, b: { stargazers_count: number }) =>
        b.stargazers_count - a.stargazers_count
    );
    for (const repo of sortedRepos.slice(0, 5)) {
      topRepos.push({
        name: repo.name,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        language: repo.language,
        description: repo.description?.slice(0, 80) || null,
        url: repo.html_url,
      });
    }

    const topLanguage =
      Object.entries(langCount).sort(([, a], [, b]) => b - a)[0]?.[0] || 'Unknown';

    // Estimated commits from push events
    let estimatedCommits = 0;
    let recentActivity = 0;
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    for (const event of events) {
      if (event.type === 'PushEvent') {
        const count = event.payload?.commits?.length || 0;
        estimatedCommits += count;
      }
      if (new Date(event.created_at).getTime() > thirtyDaysAgo) {
        recentActivity++;
      }
    }
    // Scale commits (events only show recent, multiply for estimate)
    estimatedCommits = Math.round(estimatedCommits * 3.5);
    recentActivity = Math.min(recentActivity, 100);

    const profile: DeveloperProfile = {
      login: user.login,
      name: user.name,
      avatarUrl: user.avatar_url,
      bio: user.bio,
      location: user.location,
      company: user.company,
      publicRepos: user.public_repos,
      followers: user.followers,
      following: user.following,
      createdAt: user.created_at,
      totalStars,
      totalForks,
      topLanguage,
      estimatedCommits,
      recentActivity,
      topRepos,
      languages,
    };

    return NextResponse.json(profile);
  } catch (error) {
    console.error('GitHub API error:', error);
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      return NextResponse.json({ error: 'GitHub request timed out' }, { status: 504 });
    }
    if (error instanceof DOMException && error.name === 'AbortError') {
      return NextResponse.json({ error: 'Request aborted' }, { status: 504 });
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
