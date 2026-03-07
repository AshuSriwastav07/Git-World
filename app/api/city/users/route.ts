// API: Read slim city data from Supabase
import { NextResponse } from 'next/server';
import { loadSlimCity } from '@/lib/supabaseDb';

export async function GET() {
  try {
    const users = await loadSlimCity();
    return NextResponse.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
