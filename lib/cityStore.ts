// Zustand store: city state management
'use client';

import { create } from 'zustand';
import type { CityStoreState, CityDeveloper, BuildingData } from '@/types';
import { GRID_SIZE } from '@/types';
import { buildBuildingData, slotToWorld, getBuildingDimensions } from '@/lib/cityLayout';

function computeSortedLogins(users: Map<string, CityDeveloper>): string[] {
  return Array.from(users.values())
    .sort((a, b) => b.totalScore - a.totalScore)
    .map(u => u.login.toLowerCase());
}

export const useCityStore = create<CityStoreState>((set, get) => ({
  users: new Map(),
  buildings: [],
  sortedLogins: [],
  gridSize: GRID_SIZE,
  isNightMode: false,
  isAirplaneMode: false,
  isRankChartOpen: false,
  selectedUser: null,
  isLoading: true,
  loadingProgress: 0,
  loadingMessage: 'Initializing...',
  flyToTarget: null,
  firebaseLoaded: 0,
  newDevsLoaded: 0,
  initialLoadAt: Date.now(),

  addUser: (user: CityDeveloper) => {
    set((state) => {
      const newUsers = new Map(state.users);
      newUsers.set(user.login.toLowerCase(), user);
      const totalUsers = newUsers.size;
      const newBuilding = buildBuildingData(user, totalUsers);
      const sortedLogins = computeSortedLogins(newUsers);
      return {
        users: newUsers,
        buildings: [...state.buildings.filter(b => b.developer.login !== user.login), newBuilding],
        sortedLogins,
      };
    });
  },

  addUsers: (users: CityDeveloper[]) => {
    set((state) => {
      const newUsers = new Map(state.users);
      for (const u of users) {
        newUsers.set(u.login.toLowerCase(), u);
      }
      const totalUsers = newUsers.size;
      const allBuildings = Array.from(newUsers.values()).map(u => buildBuildingData(u, totalUsers));
      const sortedLogins = computeSortedLogins(newUsers);
      return { users: newUsers, buildings: allBuildings, sortedLogins };
    });
  },

  setBuildings: (buildings: BuildingData[]) => set({ buildings }),

  selectUser: (user: CityDeveloper | null) => {
    set({ selectedUser: user });
    if (user) {
      const pos = slotToWorld(user.citySlot);
      const dims = getBuildingDimensions(user.cityRank, user.citySlot, user);
      set({ flyToTarget: { x: pos.x, y: dims.height / 2, z: pos.z } });
    }
  },

  toggleNightMode: () => set((s) => ({ isNightMode: !s.isNightMode })),

  toggleAirplaneMode: () => set((s) => ({ isAirplaneMode: !s.isAirplaneMode })),

  setRankChartOpen: (open: boolean) => set({ isRankChartOpen: open }),

  setSelectedUser: (user: CityDeveloper | null) => set({ selectedUser: user }),

  setLoading: (loading: boolean) => set({ isLoading: loading }),

  setLoadingProgress: (progress: number, message?: string) =>
    set({ loadingProgress: progress, ...(message ? { loadingMessage: message } : {}) }),

  setFlyToTarget: (target) => set({ flyToTarget: target }),

  setFirebaseLoaded: (n: number) => set({ firebaseLoaded: n }),

  setNewDevsLoaded: (n: number) => set({ newDevsLoaded: n }),

  setInitialLoadAt: (t: number) => set({ initialLoadAt: t }),

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
}));
