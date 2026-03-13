import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_COMPANIES = new Set(['apple', 'google', 'nvidia', 'meta', 'amazon', 'microsoft', 'openai', 'netflix']);

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ company: string }> }
) {
  const { company: companyParam } = await params;
  const secret = request.headers.get('x-admin-secret');
  if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const company = decodeURIComponent(companyParam).toLowerCase();
  if (!ALLOWED_COMPANIES.has(company)) {
    return NextResponse.json({ error: `Unsupported company '${company}'` }, { status: 400 });
  }

  const origin = new URL(request.url).origin;
  const url = `${origin}/api/silicon-valley/refresh?company=${encodeURIComponent(company)}&skipLanguages=1`;
  const res = await fetch(url, { method: 'POST' });
  const payload = await res.json();

  if (!res.ok || payload?.success === false) {
    return NextResponse.json({ ok: false, company, payload }, { status: 500 });
  }

  return NextResponse.json({ ok: true, company, payload });
}
