import { NextResponse } from 'next/server';

const ALLOWED_LANGUAGES = new Set(['JavaScript', 'TypeScript', 'Python', 'Rust', 'Go', 'Java', 'C++', 'Kotlin']);

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(
  request: Request,
  { params }: { params: { lang: string } }
) {
  const secret = request.headers.get('x-admin-secret');
  if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const lang = decodeURIComponent(params.lang);
  if (!ALLOWED_LANGUAGES.has(lang)) {
    return NextResponse.json({ error: `Unsupported language '${lang}'` }, { status: 400 });
  }

  const origin = new URL(request.url).origin;
  const url = `${origin}/api/cron/language-devs?lang=${encodeURIComponent(lang)}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: { 'x-admin-secret': secret ?? '' },
  });
  const payload = await res.json();

  if (!res.ok || payload?.success === false) {
    return NextResponse.json({ ok: false, lang, payload }, { status: 500 });
  }

  return NextResponse.json({ ok: true, lang, payload });
}
