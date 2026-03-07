// lib/supabase.ts
// Two clients:
// 1. Browser client — uses anon key, for realtime subscriptions and reads
// 2. Server client — uses service role key, for writes (API routes only)

import { createClient } from '@supabase/supabase-js';

const URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SVC  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Browser client — safe to use in React components (anon key only)
let browserClient: ReturnType<typeof createClient> | null = null;
export function getSupabaseBrowser() {
  if (!browserClient) {
    browserClient = createClient(URL, ANON, {
      realtime: { params: { eventsPerSecond: 10 } },
    });
  }
  return browserClient;
}

// Server client — ONLY use in API routes (app/api/**)
// Uses service role key which bypasses RLS — never expose to browser
export function getSupabaseServer() {
  return createClient(URL, SVC, {
    auth: { persistSession: false },
  });
}
