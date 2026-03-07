// SSE consumer + search add helper
'use client';

import type { SlimUser } from '@/lib/supabaseDb';

/** Add a searched user — calls /api/city/add which upserts in Supabase */
export async function addUserToCity(
  profile: Record<string, unknown>
): Promise<SlimUser | null> {
  const res = await fetch('/api/city/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...profile, addedBy: 'search' }),
  });
  if (!res.ok) return null;
  const { user } = await res.json();
  if (!user) return null;
  return {
    login:            user.login,
    citySlot:         user.citySlot,
    cityRank:         user.cityRank,
    totalScore:       user.totalScore,
    topLanguage:      user.topLanguage,
    estimatedCommits: user.estimatedCommits,
    totalStars:       user.totalStars,
    publicRepos:      user.publicRepos,
    recentActivity:   user.recentActivity,
    avatarUrl:        user.avatarUrl,
    firstAddedAt:     user.firstAddedAt ?? '',
  };
}

/**
 * Connect to /api/github/stream SSE and call onUser for each new user.
 * The stream route already upserts to Supabase so we just add to store.
 */
export function startDiscoveryStream(
  onUser: (user: SlimUser) => void,
  onProgress: (completed: number, total: number, message: string) => void,
  onDone: () => void
): () => void {
  let aborted = false;
  const controller = new AbortController();

  (async () => {
    try {
      const res = await fetch('/api/github/stream', { signal: controller.signal });
      if (!res.ok || !res.body) { onDone(); return; }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (!aborted) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.type === 'user' && parsed.data) {
              const d = parsed.data;
              onUser({
                login:            d.login ?? '',
                citySlot:         d.citySlot ?? 0,
                cityRank:         d.cityRank ?? 0,
                totalScore:       d.totalScore ?? 0,
                topLanguage:      d.topLanguage ?? 'Unknown',
                estimatedCommits: d.estimatedCommits ?? 0,
                totalStars:       d.totalStars ?? 0,
                publicRepos:      d.publicRepos ?? 0,
                recentActivity:   d.recentActivity ?? 0,
                avatarUrl:        d.avatarUrl ?? '',
                firstAddedAt:     d.firstAddedAt ?? '',
              });
            } else if (parsed.type === 'progress') {
              onProgress(parsed.completed, parsed.total, `Loaded ${parsed.completed} developers...`);
            }
          } catch {
            // Parse error — skip line
          }
        }
      }
    } catch (err) {
      if (!aborted) console.error('Discovery stream error:', err);
    }
    onDone();
  })();

  return () => {
    aborted = true;
    controller.abort();
  };
}
