// Firestore read/write functions for city_users and city_meta
import {
  doc, getDoc, setDoc, updateDoc, collection,
  query, orderBy, limit, getDocs, runTransaction,
  serverTimestamp, where, startAfter,
} from 'firebase/firestore';
import { getDb } from './firebase';
import type { CityDeveloper, CityMeta } from '@/types';

const USERS_COLLECTION = 'city_users';
const META_COLLECTION = 'city_meta';
const META_DOC = 'main';

export async function getCityMeta(): Promise<CityMeta> {
  const db = getDb();
  const snap = await getDoc(doc(db, META_COLLECTION, META_DOC));
  if (snap.exists()) {
    return snap.data() as CityMeta;
  }
  // Initialize meta doc
  const initial: CityMeta = { totalUsers: 0, nextSlot: 0, lastDiscoveryRun: 0 };
  await setDoc(doc(db, META_COLLECTION, META_DOC), initial);
  return initial;
}

export async function getUser(login: string): Promise<CityDeveloper | null> {
  const db = getDb();
  const snap = await getDoc(doc(db, USERS_COLLECTION, login.toLowerCase()));
  return snap.exists() ? (snap.data() as CityDeveloper) : null;
}

export async function addOrUpdateUser(
  profile: Omit<CityDeveloper, 'citySlot' | 'cityRank' | 'firstAddedAt'> & {
    cityRank: number;
    addedBy: 'discovery' | 'search';
  }
): Promise<CityDeveloper> {
  const db = getDb();
  const loginKey = profile.login.toLowerCase();
  const userRef = doc(db, USERS_COLLECTION, loginKey);
  const metaRef = doc(db, META_COLLECTION, META_DOC);

  // Check if user already exists
  const existing = await getDoc(userRef);
  if (existing.exists()) {
    const data = existing.data() as CityDeveloper;
    // Update stats but keep permanent slot
    const updated: Partial<CityDeveloper> = {
      ...profile,
      citySlot: data.citySlot, // NEVER change slot
      firstAddedAt: data.firstAddedAt, // NEVER change first added
      lastUpdatedAt: Date.now(),
    };
    await updateDoc(userRef, updated);
    return { ...data, ...updated } as CityDeveloper;
  }

  // New user — atomic slot assignment
  const developer = await runTransaction(db, async (transaction) => {
    const metaSnap = await transaction.get(metaRef);
    let meta: CityMeta;
    if (metaSnap.exists()) {
      meta = metaSnap.data() as CityMeta;
    } else {
      meta = { totalUsers: 0, nextSlot: 0, lastDiscoveryRun: 0 };
    }

    const slot = meta.nextSlot;
    const now = Date.now();

    const dev: CityDeveloper = {
      ...profile,
      login: loginKey,
      citySlot: slot,
      firstAddedAt: now,
      lastUpdatedAt: now,
    } as CityDeveloper;

    transaction.set(userRef, dev);
    transaction.set(metaRef, {
      totalUsers: meta.totalUsers + 1,
      nextSlot: slot + 1,
      lastDiscoveryRun: meta.lastDiscoveryRun,
    });

    return dev;
  });

  return developer;
}

export async function getAllUsers(limitCount?: number): Promise<CityDeveloper[]> {
  const db = getDb();
  const q = limitCount
    ? query(collection(db, USERS_COLLECTION), orderBy('totalScore', 'desc'), limit(limitCount))
    : query(collection(db, USERS_COLLECTION), orderBy('totalScore', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as CityDeveloper);
}

export async function getTopUsers(count: number): Promise<CityDeveloper[]> {
  return getAllUsers(count);
}

export async function getUserCount(): Promise<number> {
  const meta = await getCityMeta();
  return meta.totalUsers;
}

export async function updateDiscoveryTimestamp(): Promise<void> {
  const db = getDb();
  await updateDoc(doc(db, META_COLLECTION, META_DOC), {
    lastDiscoveryRun: Date.now(),
  });
}

export async function batchUpdateRanks(users: CityDeveloper[]): Promise<void> {
  const db = getDb();
  // Update ranks based on score ordering
  const sorted = [...users].sort((a, b) => b.totalScore - a.totalScore);
  const batch: Promise<void>[] = [];
  sorted.forEach((user, index) => {
    const rank = index + 1;
    if (user.cityRank !== rank) {
      batch.push(
        updateDoc(doc(db, USERS_COLLECTION, user.login.toLowerCase()), {
          cityRank: rank,
          lastUpdatedAt: Date.now(),
        })
      );
    }
  });
  await Promise.all(batch);
}

/**
 * Returns a Set of all GitHub usernames already stored in Firestore.
 * Called once at startup so the stream route skips known users.
 */
/**
 * FAST LOADER — reads all users in batches from Firestore client SDK.
 * Progressive: UI refreshes after each batch of 500.
 */
export async function loadSlimCity(
  onBatch: (users: CityDeveloper[]) => void,
  onProgress: (loaded: number) => void,
): Promise<void> {
  const BATCH_SIZE = 500;
  const db = getDb();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let lastDoc: any = null;
  let totalLoaded = 0;

  while (true) {
    const q = lastDoc
      ? query(collection(db, USERS_COLLECTION), orderBy('totalScore', 'desc'), startAfter(lastDoc), limit(BATCH_SIZE))
      : query(collection(db, USERS_COLLECTION), orderBy('totalScore', 'desc'), limit(BATCH_SIZE));

    const snap = await getDocs(q);
    if (snap.empty) break;

    const users = snap.docs.map(d => d.data() as CityDeveloper);
    onBatch(users);
    totalLoaded += users.length;
    onProgress(totalLoaded);

    lastDoc = snap.docs[snap.docs.length - 1];
    if (snap.docs.length < BATCH_SIZE) break;
    await new Promise(r => setTimeout(r, 0)); // yield for React
  }
}

/**
 * PROFILE LOADER — fetch full profile for one user on demand.
 */
export async function loadUserProfile(login: string): Promise<CityDeveloper | null> {
  const db = getDb();
  const snap = await getDoc(doc(db, USERS_COLLECTION, login.toLowerCase()));
  return snap.exists() ? (snap.data() as CityDeveloper) : null;
}

export async function getAllStoredUsernames(): Promise<Set<string>> {
  const db = getDb();
  const stored = new Set<string>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let lastDoc: any = null;
  let hasMore = true;

  while (hasMore) {
    const q = lastDoc
      ? query(collection(db, USERS_COLLECTION), orderBy('firstAddedAt'), startAfter(lastDoc), limit(500))
      : query(collection(db, USERS_COLLECTION), orderBy('firstAddedAt'), limit(500));

    const snap = await getDocs(q);
    if (snap.empty) break;
    snap.docs.forEach(d => stored.add(d.id));
    lastDoc = snap.docs[snap.docs.length - 1];
    hasMore = snap.docs.length === 500;
  }

  return stored;
}
