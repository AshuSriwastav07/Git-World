// API: Add or update a user in Supabase city
import { NextRequest, NextResponse } from 'next/server';
import { upsertUser, recalculateRanks } from '@/lib/supabaseDb';
import { getSupabaseServer } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body || !body.login) {
      return NextResponse.json({ error: 'login required' }, { status: 400 });
    }

    const saved = await upsertUser({
      login:            body.login.toLowerCase(),
      name:             body.name || '',
      avatarUrl:        body.avatarUrl || '',
      bio:              body.bio || '',
      location:         body.location || '',
      company:          body.company || '',
      publicRepos:      body.publicRepos || 0,
      followers:        body.followers || 0,
      following:        body.following || 0,
      githubCreatedAt:  body.githubCreatedAt || '',
      totalStars:       body.totalStars || 0,
      totalForks:       body.totalForks || 0,
      topLanguage:      body.topLanguage || 'Unknown',
      estimatedCommits: body.estimatedCommits || 0,
      recentActivity:   body.recentActivity || 0,
      totalScore:       Math.round(body.totalScore || 0),
      topRepos:         body.topRepos || [],
      addedBy:          body.addedBy || 'search',
    });

    if (!saved) {
      return NextResponse.json({ error: 'Upsert failed' }, { status: 500 });
    }

    // Recalculate ranks so the new user gets a proper rank
    await recalculateRanks();

    // Re-fetch to get the updated rank
    const sb = getSupabaseServer();
    const { data: updated } = await sb
      .from('city_users')
      .select('*')
      .eq('login', saved.login)
      .single();

    return NextResponse.json({ user: updated ? { ...saved, cityRank: updated.city_rank } : saved });
  } catch (error) {
    console.error('Add user error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
