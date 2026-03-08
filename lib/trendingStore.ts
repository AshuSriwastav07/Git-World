// Zustand store for Trending Repositories District
'use client';

import { create } from 'zustand';

export interface TrendingRepo {
  id: number;
  repo_full_name: string;
  owner_login: string;
  owner_type: string;
  repo_name: string;
  description: string | null;
  primary_language: string;
  total_stars: number;
  weekly_stars: number;
  forks: number;
  open_issues: number;
  watchers: number;
  github_url: string;
  homepage_url: string | null;
  topics: string[];
  daily_stars: { date: string; count: number }[];
  top_contributors: {
    login: string;
    avatarUrl: string;
    contributions: number;
    city_rank: number | null;
  }[];
  trending_rank: number;
  district_slot: number;
  building_height: number;
  building_width: number;
  last_refreshed: string;
  is_active: boolean;
}

interface TrendingStoreState {
  trendingRepos: TrendingRepo[];
  selectedRepo: TrendingRepo | null;
  repoPanelOpen: boolean;

  setTrendingRepos: (repos: TrendingRepo[]) => void;
  selectRepo: (repo: TrendingRepo | null) => void;
  closeRepoPanel: () => void;
}

export const useTrendingStore = create<TrendingStoreState>((set) => ({
  trendingRepos: [],
  selectedRepo: null,
  repoPanelOpen: false,

  setTrendingRepos: (repos) => set({ trendingRepos: repos }),

  selectRepo: (repo) => set({
    selectedRepo: repo,
    repoPanelOpen: repo !== null,
  }),

  closeRepoPanel: () => set({
    selectedRepo: null,
    repoPanelOpen: false,
  }),
}));
