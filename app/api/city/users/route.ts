// API: Read users from Firestore
import { NextRequest, NextResponse } from 'next/server';
import { getAllUsers, getUser, getUserCount } from '@/lib/firestore';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const login = searchParams.get('login');
    const limitStr = searchParams.get('limit');
    const countOnly = searchParams.get('countOnly');

    if (countOnly === 'true') {
      const count = await getUserCount();
      return NextResponse.json({ count });
    }

    if (login) {
      const user = await getUser(login);
      if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json({ user });
    }

    const limitNum = limitStr ? parseInt(limitStr, 10) : undefined;
    const users = await getAllUsers(limitNum);
    return NextResponse.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
