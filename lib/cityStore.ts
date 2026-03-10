// Zustand store: city state management
'use client';

import { create } from 'zustand';
import type { SlimUser } from '@/lib/supabaseDb';
import { slotToWorld, getBuildingDimensions } from '@/lib/cityLayout';

export type ActiveMode = 'menu' | 'explore' | 'fly' | 'trending' | 'search' | 'leaderboard';

interface CityStoreState {
  users: Map<string, SlimUser>;
  sortedLogins: string[];
  isNight: boolean;
  isAirplaneMode: boolean;
  isRankChartOpen: boolean;
  selectedUser: SlimUser | null;
  isLoading: boolean;
  loadingProgress: number;
  loadingMessage: string;
  flyTarget: { x: number; y: number; z: number } | null;
  /** Intro stage: 'loading' | 'cinematic' | 'title' | 'buttons' | 'done' */
  introStage: 'loading' | 'cinematic' | 'title' | 'buttons' | 'done';
  /** Timestamp when cinematic stage started (for building rise + camera sync) */
  introStartTime: number;
  /** 0..1 progress of the cinematic intro */
  introProgress: number;
  /** True when user has interacted (clicked/touched/keypress) — stops auto-rotate */
  userInteracted: boolean;
  /** Current active mode — drives menu, flight, panels */
  activeMode: ActiveMode;
  /** True when airplane flight system is running */
  flightMode: boolean;

  addUser: (user: SlimUser) => void;
  addUsers: (users: SlimUser[]) => void;
  updateUser: (user: SlimUser) => void;
  selectUser: (user: SlimUser | null) => void;
  toggleNight: () => void;
  toggleAirplaneMode: () => void;
  setRankChartOpen: (open: boolean) => void;
  setSelectedUser: (user: SlimUser | null) => void;
  setLoading: (loading: boolean) => void;
  setLoadingProgress: (progress: number, message?: string) => void;
  setFlyTarget: (target: { x: number; y: number; z: number } | null) => void;
  getUserByLogin: (login: string) => SlimUser | undefined;
  getTopUsers: (count: number) => SlimUser[];
  getRandomUser: () => SlimUser | undefined;
  setIntroStage: (stage: CityStoreState['introStage']) => void;
  setIntroStartTime: (time: number) => void;
  setIntroProgress: (progress: number) => void;
  setUserInteracted: () => void;
  setActiveMode: (mode: ActiveMode) => void;
  setFlightMode: (active: boolean) => void;
}

function computeSortedLogins(users: Map<string, SlimUser>): string[] {
  return Array.from(users.values())
    .sort((a, b) => b.totalScore - a.totalScore)
    .map(u => u.login.toLowerCase());
}

/* ── Batched addUser buffer ────────────────────────────────────────────── */
let pendingBuffer: SlimUser[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const BATCH_MS = 2000;

function flushPending() {
  flushTimer = null;
  if (pendingBuffer.length === 0) return;
  const batch = pendingBuffer;
  pendingBuffer = [];
  useCityStore.getState().addUsers(batch);
}

export const useCityStore = create<CityStoreState>((set, get) => ({
  users: new Map(),
  sortedLogins: [],
  isNight: true,
  isAirplaneMode: false,
  isRankChartOpen: false,
  selectedUser: null,
  isLoading: true,
  loadingProgress: 0,
  loadingMessage: 'Initializing...',
  flyTarget: null,
  introStage: 'loading',
  introStartTime: 0,
  introProgress: 0,
  userInteracted: false,
  activeMode: 'menu' as ActiveMode,
  flightMode: false,

  addUser: (user: SlimUser) => {
    pendingBuffer.push(user);
    if (!flushTimer) flushTimer = setTimeout(flushPending, BATCH_MS);
  },

  addUsers: (users: SlimUser[]) => {
    set((state) => {
      const newUsers = new Map(state.users);
      for (const u of users) {
        newUsers.set(u.login.toLowerCase(), u);
      }
      // Cap at 10K users to prevent unbounded memory growth
      if (newUsers.size > 10000) {
        const entries = Array.from(newUsers.entries());
        const sorted = entries.sort((a, b) => b[1].totalScore - a[1].totalScore);
        const capped = new Map(sorted.slice(0, 10000));
        if (state.isLoading) return { users: capped };
        return { users: capped, sortedLogins: computeSortedLogins(capped) };
      }
      // During initial loading, skip expensive sort — computed once in setLoading(false)
      if (state.isLoading) {
        return { users: newUsers };
      }
      const sortedLogins = computeSortedLogins(newUsers);
      return { users: newUsers, sortedLogins };
    });
  },

  updateUser: (user: SlimUser) => {
    set((state) => {
      const newUsers = new Map(state.users);
      newUsers.set(user.login.toLowerCase(), user);
      const sortedLogins = computeSortedLogins(newUsers);
      return { users: newUsers, sortedLogins };
    });
  },

  selectUser: (user: SlimUser | null) => {
    set({ selectedUser: user });
    if (user) {
      const pos = slotToWorld(user.citySlot);
      const dims = getBuildingDimensions(user.cityRank, user.citySlot, user);
      set({ flyTarget: { x: pos.x, y: dims.height / 2, z: pos.z } });
    }
  },

  toggleNight: () => set((s) => ({ isNight: !s.isNight })),

  toggleAirplaneMode: () => set((s) => ({ isAirplaneMode: !s.isAirplaneMode })),

  setRankChartOpen: (open: boolean) => set({ isRankChartOpen: open }),

  setSelectedUser: (user: SlimUser | null) => set({ selectedUser: user }),

  setLoading: (loading: boolean) => {
    if (!loading) {
      // Loading finished — compute sorted logins once for all accumulated users
      const users = get().users;
      const sortedLogins = computeSortedLogins(users);
      set({ isLoading: false, sortedLogins });
    } else {
      set({ isLoading: loading });
    }
  },

  setLoadingProgress: (progress: number, message?: string) =>
    set({ loadingProgress: progress, ...(message ? { loadingMessage: message } : {}) }),

  setFlyTarget: (target) => set({ flyTarget: target }),

  getUserByLogin: (login: string) => get().users.get(login.toLowerCase()),

  getTopUsers: (count: number) => {
    const all = Array.from(get().users.values());
    return all.sort((a, b) => b.totalScore - a.totalScore).slice(0, count);
  },

  getRandomUser: () => {
    const all = Array.from(get().users.values());
    if (all.length === 0) return undefined;
    return all[Math.floor(Math.random() * all.length)];
  },

  setIntroStage: (stage) => set({ introStage: stage }),

  setIntroStartTime: (time) => set({ introStartTime: time }),

  setIntroProgress: (progress) => set({ introProgress: progress }),

  setUserInteracted: () => set({ userInteracted: true }),

  setActiveMode: (mode: ActiveMode) => set({
    activeMode: mode,
    // Sync legacy flags for backward compat
    isAirplaneMode: mode === 'fly',
    flightMode: mode === 'fly',
  }),

  setFlightMode: (active: boolean) => set({
    flightMode: active,
    isAirplaneMode: active,
    activeMode: active ? 'fly' : 'menu',
  }),
}));
