import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 10;

const TARGET_PER_LANGUAGE = 20;
const LANGUAGES = ['JavaScript', 'TypeScript', 'Python', 'Rust', 'Go', 'Java', 'C++', 'Kotlin'] as const;

type Language = (typeof LANGUAGES)[number];

type CronLogInput = {
  job_name: string;
  target: string;
  status: 'started' | 'completed' | 'failed';
  candidates?: number;
  stored?: number;
  error_msg?: string;
  duration_ms?: number;
};

function isLanguage(value: string | null): value is Language {
  return value !== null && LANGUAGES.includes(value as Language);
}

function pickLeastFilled(counts: Record<Language, number>): Language {
  return LANGUAGES.reduce((min, current) => (counts[current] < counts[min] ? current : min), LANGUAGES[0]);
}

async function writeCronLog(input: CronLogInput) {
  try {
    const sb = getSupabaseServer();
    await sb.from('cron_log').insert(input);
  } catch {
    // Keep cron resilient even if cron_log table is missing.
  }
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const adminHeader = request.headers.get('x-admin-secret');
  const isCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;
  const isManual = Boolean(process.env.ADMIN_SECRET) && adminHeader === process.env.ADMIN_SECRET;

  if (process.env.NODE_ENV === 'production' && !isCron && !isManual) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const start = Date.now();
  const sb = getSupabaseServer();
  const url = new URL(request.url);
  const requestedLanguageParam = url.searchParams.get('lang');

  if (requestedLanguageParam && !isLanguage(requestedLanguageParam)) {
    return NextResponse.json(
      { error: `Unsupported language '${requestedLanguageParam}'`, valid: LANGUAGES },
      { status: 400 },
    );
  }

  const requestedLanguage = isLanguage(requestedLanguageParam) ? requestedLanguageParam : null;

  const counts: Record<Language, number> = {
    JavaScript: 0,
    TypeScript: 0,
    Python: 0,
    Rust: 0,
    Go: 0,
    Java: 0,
    'C++': 0,
    Kotlin: 0,
  };

  const { data: existingRows, error: existingError } = await sb.from('sv_language_devs').select('language');
  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }

  for (const row of existingRows ?? []) {
    const language = String(row.language ?? '');
    if (isLanguage(language)) {
      counts[language] += 1;
    }
  }

  const target: Language = requestedLanguage ?? pickLeastFilled(counts);
  await writeCronLog({ job_name: 'language-devs', target, status: 'started' });

  try {
    const { data: sourceUsers, error: sourceError } = await sb
      .from('city_users')
      .select('login, total_score')
      .eq('top_language', target)
      .order('total_score', { ascending: false })
      .limit(TARGET_PER_LANGUAGE);

    if (sourceError) {
      throw new Error(sourceError.message);
    }

    if (!sourceUsers || sourceUsers.length === 0) {
      throw new Error(`No city_users rows found for ${target}`);
    }

    const logins = sourceUsers.map((row) => String(row.login));
    const now = new Date().toISOString();
    const rows = sourceUsers.map((row) => ({
      login: String(row.login),
      language: target,
      contributions: Number(row.total_score ?? 0),
      updated_at: now,
    }));

    const { error: deleteByLanguageError } = await sb.from('sv_language_devs').delete().eq('language', target);
    if (deleteByLanguageError) {
      throw new Error(deleteByLanguageError.message);
    }

    const { error: deleteByLoginError } = await sb.from('sv_language_devs').delete().in('login', logins);
    if (deleteByLoginError) {
      throw new Error(deleteByLoginError.message);
    }

    const { error: insertError } = await sb.from('sv_language_devs').insert(rows);
    if (insertError) {
      throw new Error(insertError.message);
    }

    await writeCronLog({
      job_name: 'language-devs',
      target,
      status: 'completed',
      candidates: sourceUsers.length,
      stored: rows.length,
      duration_ms: Date.now() - start,
    });

    return NextResponse.json({
      ok: true,
      target,
      beforeCount: counts[target],
      candidates: sourceUsers.length,
      stored: rows.length,
      duration_ms: Date.now() - start,
      remaining: LANGUAGES.map((language) => ({
        language,
        current: language === target ? rows.length : counts[language],
        needed: Math.max(0, TARGET_PER_LANGUAGE - (language === target ? rows.length : counts[language])),
      })).filter((entry) => entry.needed > 0),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    await writeCronLog({
      job_name: 'language-devs',
      target,
      status: 'failed',
      error_msg: msg,
      duration_ms: Date.now() - start,
    });
    return NextResponse.json({ ok: false, target, error: msg }, { status: 500 });
  }
}
