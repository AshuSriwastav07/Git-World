// lib/supabaseDb.ts
// Every database read/write function for Git World.
// Replaces firebase.ts, firestore.ts, and realtimeDb.ts entirely.

import { getSupabaseBrowser, getSupabaseServer } from './supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ── TYPE DEFINITIONS ─────────────────────────────────────────────────────────

export interface CityUser {
  login:            string;
  name:             string;
  avatarUrl:        string;
  bio:              string;
  location:         string;
  company:          string;
  publicRepos:      number;
  followers:        number;
  following:        number;
  githubCreatedAt:  string;
  totalStars:       number;
  totalForks:       number;
  topLanguage:      string;
  estimatedCommits: number;
  recentActivity:   number;
  totalScore:       number;
  topRepos:         TopRepo[];
  citySlot:         number;
  cityRank:         number;
  firstAddedAt:     string;
  lastUpdatedAt:    string;
  addedBy:          string;
}

export interface TopRepo {
  name:        string;
  stars:       number;
  forks:       number;
  language:    string;
  description: string;
  url:         string;
}

// Slim version — only what's needed to render the building
export interface SlimUser {
  login:            string;
  citySlot:         number;
  cityRank:         number;
  totalScore:       number;
  topLanguage:      string;
  estimatedCommits: number;
  totalStars:       number;
  publicRepos:      number;
  recentActivity:   number;
  avatarUrl:        string;
  firstAddedAt:     string;
}

// ── DB COLUMN → CAMELCASE MAPPING ────────────────────────────────────────────

function rowToUser(row: Record<string, unknown>): CityUser {
  return {
    login:            row.login            as string,
    name:             (row.name            as string) ?? (row.login as string),
    avatarUrl:        (row.avatar_url      as string) ?? '',
    bio:              (row.bio             as string) ?? '',
    location:         (row.location        as string) ?? '',
    company:          (row.company         as string) ?? '',
    publicRepos:      (row.public_repos    as number) ?? 0,
    followers:        (row.followers       as number) ?? 0,
    following:        (row.following       as number) ?? 0,
    githubCreatedAt:  (row.github_created_at as string) ?? '',
    totalStars:       (row.total_stars     as number) ?? 0,
    totalForks:       (row.total_forks     as number) ?? 0,
    topLanguage:      (row.top_language    as string) ?? 'Unknown',
    estimatedCommits: (row.estimated_commits as number) ?? 0,
    recentActivity:   (row.recent_activity as number) ?? 0,
    totalScore:       (row.total_score     as number) ?? 0,
    topRepos:         Array.isArray(row.top_repos) ? row.top_repos as TopRepo[] : [],
    citySlot:         (row.city_slot       as number) ?? 0,
    cityRank:         (row.city_rank       as number) ?? 9999,
    firstAddedAt:     (row.first_added_at  as string) ?? '',
    lastUpdatedAt:    (row.last_updated_at as string) ?? '',
    addedBy:          (row.added_by        as string) ?? 'discovery',
  };
}

function rowToSlim(row: Record<string, unknown>): SlimUser {
  return {
    login:            row.login            as string,
    citySlot:         (row.city_slot       as number) ?? 0,
    cityRank:         (row.city_rank       as number) ?? 9999,
    totalScore:       (row.total_score     as number) ?? 0,
    topLanguage:      (row.top_language    as string) ?? 'Unknown',
    estimatedCommits: (row.estimated_commits as number) ?? 0,
    totalStars:       (row.total_stars     as number) ?? 0,
    publicRepos:      (row.public_repos    as number) ?? 0,
    recentActivity:   (row.recent_activity as number) ?? 0,
    avatarUrl:        (row.avatar_url      as string) ?? '',
    firstAddedAt:     (row.first_added_at  as string) ?? '',
  };
}

// ── READ OPERATIONS (browser-safe, anon key) ─────────────────────────────────

const SLIM_COLS = 'login, city_slot, city_rank, total_score, top_language, estimated_commits, total_stars, public_repos, recent_activity, avatar_url, first_added_at';
const PAGE_SIZE = 500;

/**
 * Load ALL slim city data by paginating in batches of 500.
 * Orders by city_slot (indexed integer) instead of city_rank to avoid
 * expensive full-table sorts that cause statement timeouts.
 * The client re-sorts by totalScore anyway in computeSortedLogins.
 * Calls onBatch after each page so the UI can render progressively.
 */
export async function loadSlimCity(
  onBatch?: (batch: SlimUser[], totalSoFar: number) => void
): Promise<SlimUser[]> {
  const sb = getSupabaseBrowser();
  const all: SlimUser[] = [];
  let from = 0;

  while (true) {
    let data: Record<string, unknown>[] | null = null;
    let lastError: string | null = null;

    // Try up to 2 times per page (retry once on timeout)
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await sb
        .from('city_users')
        .select(SLIM_COLS)
        .order('city_slot', { ascending: true })
        .range(from, from + PAGE_SIZE - 1);

      if (!res.error) {
        data = res.data as Record<string, unknown>[] | null;
        lastError = null;
        break;
      }
      lastError = res.error.message;
      console.warn(`[loadSlimCity] page ${from} attempt ${attempt + 1} error: ${lastError}`);
      // Brief pause before retry
      await new Promise((r) => setTimeout(r, 500));
    }

    if (lastError) {
      console.error(`[loadSlimCity] skipping page at offset ${from} after retries: ${lastError}`);
      // Skip to next page rather than giving up entirely
      from += PAGE_SIZE;
      // Safety: stop after 20 consecutive empty/failed pages
      if (from > all.length + PAGE_SIZE * 20) break;
      continue;
    }

    if (!data || data.length === 0) break;

    const batch = data.map(rowToSlim);
    all.push(...batch);
    onBatch?.(batch, all.length);

    if (data.length < PAGE_SIZE) break; // last page
    from += PAGE_SIZE;
  }

  return all;
}

/** Fast single-user lookup by exact login — used by search before hitting GitHub */
export async function lookupSlimUser(login: string): Promise<SlimUser | null> {
  const sb = getSupabaseBrowser();
  const { data, error } = await sb
    .from('city_users')
    .select(SLIM_COLS)
    .eq('login', login.toLowerCase())
    .single();

  if (error || !data) return null;
  return rowToSlim(data);
}

/** Load full profile for one user — called when they click a building */
export async function loadUserProfile(login: string): Promise<CityUser | null> {
  const sb = getSupabaseBrowser();
  const { data, error } = await sb
    .from('city_users')
    .select('*')
    .eq('login', login.toLowerCase())
    .single();

  if (error || !data) return null;
  return rowToUser(data);
}

/** Get all stored logins — used by stream route to skip already-stored users.
 *  Paginates to get ALL logins (Supabase caps at 1000 per request). */
export async function getAllStoredLogins(): Promise<Set<string>> {
  const sb = getSupabaseServer();
  const logins = new Set<string>();
  let from = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await sb
      .from('city_users')
      .select('login')
      .range(from, from + pageSize - 1);

    if (error) {
      console.error('[getAllStoredLogins] error:', error.message);
      break;
    }
    if (!data || data.length === 0) break;

    for (const r of data) {
      logins.add((r as Record<string, unknown>).login as string);
    }
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return logins;
}

/** Load top N users by rank */
export async function loadTopUsers(n = 100): Promise<CityUser[]> {
  const sb = getSupabaseBrowser();
  const { data, error } = await sb
    .from('city_users')
    .select('*')
    .order('city_rank', { ascending: true })
    .limit(n);

  if (error) return [];
  return (data ?? []).map(rowToUser);
}

/** Search users by login prefix — for search bar autocomplete */
export async function searchUsers(query: string, limit = 10): Promise<SlimUser[]> {
  const sb = getSupabaseBrowser();
  const { data, error } = await sb
    .from('city_users')
    .select('login, city_slot, city_rank, total_score, top_language, estimated_commits, total_stars, public_repos, recent_activity, avatar_url')
    .ilike('login', `${query.toLowerCase()}%`)
    .order('city_rank', { ascending: true })
    .limit(limit);

  if (error) return [];
  return (data ?? []).map(rowToSlim);
}

/** Get recent live events — for the bottom ticker on page load */
export async function getRecentEvents(limit = 50) {
  const sb = getSupabaseBrowser();
  const { data } = await sb
    .from('live_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data ?? []).reverse();
}

// ── WRITE OPERATIONS (server-side only) ─────────────────────────────────────

/** In-flight upsert locks per login to avoid race conditions */
const upsertLocks = new Map<string, Promise<CityUser | null>>();

/** Add or update a user in the city. Claims slot atomically for new users. */
export async function upsertUser(userData: Omit<CityUser, 'citySlot' | 'cityRank' | 'firstAddedAt' | 'lastUpdatedAt'>): Promise<CityUser | null> {
  const key = userData.login.toLowerCase();

  // If there's already an in-flight upsert for this login, wait for it
  const existing = upsertLocks.get(key);
  if (existing) {
    return existing;
  }

  const promise = doUpsert(userData);
  upsertLocks.set(key, promise);
  try {
    return await promise;
  } finally {
    upsertLocks.delete(key);
  }
}

/** Sanitize top_repos to guarantee valid JSON for Supabase jsonb column */
function sanitizeRepos(repos: unknown): TopRepo[] {
  if (!Array.isArray(repos)) return [];
  return repos
    .filter((r): r is Record<string, unknown> => r !== null && typeof r === 'object')
    .slice(0, 10)
    .map(r => ({
      name:        String(r.name ?? ''),
      stars:       Number(r.stars) || 0,
      forks:       Number(r.forks) || 0,
      language:    String(r.language ?? ''),
      description: String(r.description ?? ''),
      url:         String(r.url ?? ''),
    }));
}

async function doUpsert(userData: Omit<CityUser, 'citySlot' | 'cityRank' | 'firstAddedAt' | 'lastUpdatedAt'>): Promise<CityUser | null> {
  const sb = getSupabaseServer();

  // Round all numeric values to avoid "invalid input for type integer" errors
  const nums = {
    public_repos:      Math.round(userData.publicRepos ?? 0),
    followers:         Math.round(userData.followers ?? 0),
    following:         Math.round(userData.following ?? 0),
    total_stars:       Math.round(userData.totalStars ?? 0),
    total_forks:       Math.round(userData.totalForks ?? 0),
    estimated_commits: Math.round(userData.estimatedCommits ?? 0),
    recent_activity:   Math.round(userData.recentActivity ?? 0),
    total_score:       Math.round(userData.totalScore ?? 0),
  };

  const updatePayload = {
    name:              String(userData.name ?? ''),
    avatar_url:        String(userData.avatarUrl ?? ''),
    bio:               String(userData.bio ?? ''),
    location:          String(userData.location ?? ''),
    company:           String(userData.company ?? ''),
    ...nums,
    top_language:      String(userData.topLanguage ?? 'Unknown'),
    top_repos:         sanitizeRepos(userData.topRepos),
    last_updated_at:   new Date().toISOString(),
  };

  // Ensure entire payload is valid JSON (strips undefined, NaN, Infinity, etc.)
  const cleanPayload = JSON.parse(JSON.stringify(updatePayload)) as typeof updatePayload;

  // Check if user already exists
  const { data: existing } = await sb
    .from('city_users')
    .select('login, city_slot, city_rank, first_added_at')
    .eq('login', userData.login.toLowerCase())
    .single();

  if (existing) {
    // User exists — update stats only, never change city_slot
    const { data, error } = await sb
      .from('city_users')
      .update(cleanPayload)
      .eq('login', userData.login.toLowerCase())
      .select()
      .single();

    if (error) { console.error('[upsertUser] update error:', error.message); return null; }
    return rowToUser(data);
  }

  // New user — claim a slot atomically
  const { data: slotData, error: slotError } = await sb
    .rpc('claim_next_slot');

  if (slotError) {
    console.error('[upsertUser] slot error:', slotError.message);
    return null;
  }

  const citySlot: number = slotData;

  // Insert new user (retry once on transient JSON errors)
  const insertPayload = {
    login:             userData.login.toLowerCase(),
    ...cleanPayload,
    github_created_at: userData.githubCreatedAt || new Date().toISOString(),
    city_slot:         citySlot,
    city_rank:         999999,
    added_by:          userData.addedBy ?? 'discovery',
  };

  let data: Record<string, unknown> | null = null;
  let error: { message: string } | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await sb
      .from('city_users')
      .insert(insertPayload)
      .select()
      .single();
    data = res.data;
    error = res.error;
    if (!error) break;
    if (error.message.includes('Empty or invalid json') && attempt === 0) {
      await new Promise(r => setTimeout(r, 200));
      continue;
    }
    break;
  }

  if (error) {
    // Handle race condition: duplicate key means another request inserted first
    if (error.message.includes('duplicate key')) {
      const { data: fallback, error: fbErr } = await sb
        .from('city_users')
        .update(cleanPayload)
        .eq('login', userData.login.toLowerCase())
        .select()
        .single();
      if (fbErr) return null;
      return rowToUser(fallback);
    }
    console.error('[upsertUser] insert error:', error.message);
    return null;
  }

  if (!data) return null;

  // Push a live event
  await sb.from('live_events').insert({
    type:   'join',
    login:  userData.login,
    detail: `${userData.login} joined Git World at slot #${citySlot}`,
  });

  return rowToUser(data);
}

/** Recalculate city_rank for all users by total_score (fast SQL) */
export async function recalculateRanks(): Promise<void> {
  const sb = getSupabaseServer();
  await sb.rpc('recalculate_ranks');
}

// ── REALTIME SUBSCRIPTIONS (browser) ─────────────────────────────────────────

/** Subscribe to new users being added */
export function subscribeToNewUsers(
  onUser: (user: SlimUser) => void
): RealtimeChannel {
  const sb = getSupabaseBrowser();
  const channel = sb
    .channel('city_users_inserts')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'city_users' },
      (payload) => { onUser(rowToSlim(payload.new as Record<string, unknown>)); }
    )
    .subscribe();
  return channel;
}

/** Subscribe to user stats updates */
export function subscribeToUserUpdates(
  onUpdate: (user: SlimUser) => void
): RealtimeChannel {
  const sb = getSupabaseBrowser();
  const channel = sb
    .channel('city_users_updates')
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'city_users' },
      (payload) => { onUpdate(rowToSlim(payload.new as Record<string, unknown>)); }
    )
    .subscribe();
  return channel;
}

/** Subscribe to live events for the ticker */
export function subscribeToLiveEvents(
  onEvent: (event: { type: string; login: string; detail: string }) => void
): RealtimeChannel {
  const sb = getSupabaseBrowser();
  const channel = sb
    .channel('live_events_feed')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'live_events' },
      (payload) => {
        onEvent(payload.new as { type: string; login: string; detail: string });
      }
    )
    .subscribe();
  return channel;
}
