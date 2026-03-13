// Session-level cache for city snapshot data
// Avoids re-fetching on every page navigation within a session

const KEY = 'gitworld_v2';
const TTL = 4 * 60 * 1000; // 4 minutes

export function getSessionCache<T>(): T | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > TTL) return null;
    return data as T;
  } catch {
    return null;
  }
}

export function setSessionCache<T>(data: T): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ data, ts: Date.now() }));
  } catch {
    // quota exceeded — ignore silently
  }
}
