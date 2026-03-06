// SSE consumer + localStorage cache + parallel loading
'use client';

import type { CityDeveloper, DeveloperProfile } from '@/types';
import { calculateScore } from '@/lib/cityLayout';

const CACHE_KEY = 'minecraft-gitcity-cache';
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours

interface CachedData {
  users: CityDeveloper[];
  timestamp: number;
}

export function getCachedUsers(): CityDeveloper[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached: CachedData = JSON.parse(raw);
    if (Date.now() - cached.timestamp > CACHE_DURATION) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return cached.users;
  } catch {
    return null;
  }
}

export function setCachedUsers(users: CityDeveloper[]): void {
  try {
    const data: CachedData = { users, timestamp: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // Storage full — ignore
  }
}

export async function loadUsersFromFirebase(): Promise<CityDeveloper[]> {
  const res = await fetch('/api/city/users');
  if (!res.ok) return [];
  const { users } = await res.json();
  return users || [];
}

export async function addUserToCity(profile: DeveloperProfile): Promise<CityDeveloper | null> {
  const res = await fetch('/api/city/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile, addedBy: 'search' }),
  });
  if (!res.ok) return null;
  const { developer } = await res.json();
  return developer;
}

/**
 * Parallel two-track loading:
 *  Track 1 — read all Firebase users (fast, already processed)
 *  Track 2 — discover new GitHub users NOT in Firebase
 */
export function initCityLoad(
  onUser: (user: CityDeveloper) => void,
  onFirebaseProgress: (loaded: number) => void,
  onNewDevProgress: (loaded: number) => void,
  onDone: () => void
): () => void {
  let aborted = false;
  let stopStream: (() => void) | null = null;

  // Track 1: Firebase load
  const firebasePromise = (async () => {
    try {
      const users = await loadUsersFromFirebase();
      let loaded = 0;
      const batchSize = 100;
      for (let i = 0; i < users.length && !aborted; i += batchSize) {
        const batch = users.slice(i, i + batchSize);
        batch.forEach(u => { onUser(u); loaded++; });
        onFirebaseProgress(loaded);
        await new Promise(r => setTimeout(r, 10)); // yield for React
      }
      return loaded;
    } catch {
      return 0;
    }
  })();

  // Track 2: SSE discovery stream
  const streamPromise = new Promise<void>((resolve) => {
    let newCount = 0;
    stopStream = startDiscoveryStream(
      (user: CityDeveloper) => {
        if (aborted) return;
        onUser(user);
        newCount++;
        onNewDevProgress(newCount);
      },
      () => {},
      () => resolve()
    );
  });

  Promise.allSettled([firebasePromise, streamPromise]).then(() => {
    if (!aborted) onDone();
  });

  return () => {
    aborted = true;
    if (stopStream) stopStream();
  };
}

export function startDiscoveryStream(
  onUser: (user: CityDeveloper) => void,
  onProgress: (completed: number, total: number, message: string) => void,
  onDone: () => void
): () => void {
  let aborted = false;
  const controller = new AbortController();

  (async () => {
    try {
      const res = await fetch('/api/github/stream', { signal: controller.signal });
      if (!res.ok || !res.body) {
        onDone();
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let profileQueue: Record<string, unknown>[] = [];

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
              profileQueue.push(parsed.data);
              if (profileQueue.length >= 10) {
                const batch = profileQueue.splice(0, 10);
                for (const p of batch) {
                  if (aborted) break;
                  try {
                    const addRes = await fetch('/api/city/add', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ profile: p, addedBy: 'discovery', skipEvent: true }),
                    });
                    if (addRes.ok) {
                      const { developer } = await addRes.json();
                      onUser(developer);
                    }
                  } catch {
                    // Continue on individual failures
                  }
                }
              }
            } else if (parsed.type === 'progress') {
              onProgress(parsed.completed, parsed.total, `Loaded ${parsed.completed} developers...`);
            } else if (parsed.type === 'done') {
              for (const p of profileQueue) {
                if (aborted) break;
                try {
                  const addRes = await fetch('/api/city/add', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ profile: p, addedBy: 'discovery', skipEvent: true }),
                  });
                  if (addRes.ok) {
                    const { developer } = await addRes.json();
                    onUser(developer);
                  }
                } catch {
                  // Continue
                }
              }
              profileQueue = [];
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
