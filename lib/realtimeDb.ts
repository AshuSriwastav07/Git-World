// Firebase Realtime Database — Live event feed
import { ref, push, onChildAdded, query as rtQuery, limitToLast, off } from 'firebase/database';
import { getRtdb } from './firebase';
import type { LiveEvent } from '@/types';

const LIVE_PATH = 'live/recentEvents';

export function pushLiveEvent(event: Omit<LiveEvent, 'timestamp'>): void {
  const db = getRtdb();
  const evRef = ref(db, LIVE_PATH);
  push(evRef, { ...event, timestamp: Date.now() });
}

export function subscribeToLiveEvents(
  callback: (event: LiveEvent) => void,
  count = 50
): () => void {
  const db = getRtdb();
  const evRef = rtQuery(ref(db, LIVE_PATH), limitToLast(count));
  const handler = onChildAdded(evRef, (snapshot) => {
    const data = snapshot.val() as LiveEvent;
    if (data) callback(data);
  });
  return () => off(evRef, 'child_added');
}
