import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const COMPANIES = ['apple', 'google', 'nvidia', 'meta', 'amazon', 'microsoft', 'openai', 'netflix'] as const;

type Company = (typeof COMPANIES)[number];

async function writeCronLog(input: {
  job_name: string;
  target: string;
  status: 'started' | 'completed' | 'failed';
  candidates?: number;
  stored?: number;
  error_msg?: string;
  duration_ms?: number;
}) {
  try {
    const sb = getSupabaseServer();
    await sb.from('cron_log').insert(input);
  } catch {
    // Keep cron resilient even if cron_log table is missing.
  }
}

function pickLeastFilled(counts: Record<Company, number>): Company {
  return COMPANIES.reduce((min, current) => (counts[current] < counts[min] ? current : min), COMPANIES[0]);
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const start = Date.now();
  const sb = getSupabaseServer();

  const counts: Record<Company, number> = {
    apple: 0,
    google: 0,
    nvidia: 0,
    meta: 0,
    amazon: 0,
    microsoft: 0,
    openai: 0,
    netflix: 0,
  };

  const { data } = await sb.from('sv_contributors').select('company');
  for (const row of data ?? []) {
    const company = String(row.company ?? '').toLowerCase() as Company;
    if (company in counts) {
      counts[company] += 1;
    }
  }

  const target = pickLeastFilled(counts);
  await writeCronLog({ job_name: 'sv-contributors', target, status: 'started' });

  try {
    const origin = new URL(request.url).origin;
    const refreshUrl = `${origin}/api/silicon-valley/refresh?company=${encodeURIComponent(target)}&skipLanguages=1`;
    const res = await fetch(refreshUrl, { method: 'POST' });
    const payload = await res.json();

    if (!res.ok || payload?.success === false) {
      const msg = payload?.error ? String(payload.error) : `Refresh failed with ${res.status}`;
      await writeCronLog({
        job_name: 'sv-contributors',
        target,
        status: 'failed',
        error_msg: msg,
        duration_ms: Date.now() - start,
      });
      return NextResponse.json({ ok: false, target, error: msg, payload }, { status: 500 });
    }

    const stored = Number(payload?.companies?.[target]?.count ?? 0);
    await writeCronLog({
      job_name: 'sv-contributors',
      target,
      status: 'completed',
      stored,
      duration_ms: Date.now() - start,
    });

    return NextResponse.json({ ok: true, target, beforeCount: counts[target], stored, payload });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    await writeCronLog({
      job_name: 'sv-contributors',
      target,
      status: 'failed',
      error_msg: msg,
      duration_ms: Date.now() - start,
    });
    return NextResponse.json({ ok: false, target, error: msg }, { status: 500 });
  }
}
