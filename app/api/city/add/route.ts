// API: Add or update a user in Firebase city
import { NextRequest, NextResponse } from 'next/server';
import { addOrUpdateUser } from '@/lib/firestore';
import { pushLiveEvent } from '@/lib/realtimeDb';
import { calculateScore } from '@/lib/cityLayout';
import type { DeveloperProfile } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const profile = body.profile as DeveloperProfile;
    const addedBy = (body.addedBy as 'discovery' | 'search') || 'search';

    if (!profile || !profile.login) {
      return NextResponse.json({ error: 'profile required' }, { status: 400 });
    }

    const totalScore = calculateScore(profile);

    const developer = await addOrUpdateUser({
      ...profile,
      login: profile.login.toLowerCase(),
      totalScore,
      cityRank: body.cityRank || 0,
      addedBy,
      lastUpdatedAt: Date.now(),
    });

    // Push live event
    if (!body.skipEvent) {
      pushLiveEvent({
        type: 'join',
        login: developer.login,
        detail: `Slot #${developer.citySlot}`,
      });
    }

    return NextResponse.json({ developer });
  } catch (error) {
    console.error('Add user error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
