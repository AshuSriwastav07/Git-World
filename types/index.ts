// ============================================
// Minecraft GitHub City — TypeScript Interfaces
// ============================================

export interface GitHubUser {
  login: string;
  name: string | null;
  avatarUrl: string;
  bio: string | null;
  location: string | null;
  company: string | null;
  publicRepos: number;
  followers: number;
  following: number;
  createdAt: string;
}

export interface RepoInfo {
  name: string;
  stars: number;
  forks: number;
  language: string | null;
  description: string | null;
  url: string;
}

export interface DeveloperProfile extends GitHubUser {
  totalStars: number;
  totalForks: number;
  topLanguage: string;
  estimatedCommits: number;
  recentActivity: number;
  topRepos: RepoInfo[];
  languages: string[];
}

export interface CityDeveloper extends DeveloperProfile {
  citySlot: number;
  cityRank: number;
  totalScore: number;
  firstAddedAt: number;
  lastUpdatedAt: number;
  addedBy: 'discovery' | 'search';
}

export interface CityMeta {
  totalUsers: number;
  nextSlot: number;
  lastDiscoveryRun: number;
}

export interface LiveEvent {
  type: 'join' | 'grow' | 'rankUp';
  login: string;
  detail: string;
  timestamp: number;
}

export type BuildingTier = 1 | 2 | 3 | 4 | 5;

export interface BuildingData {
  developer: CityDeveloper;
  tier: BuildingTier;
  height: number;
  footprint: number;
  gridX: number;
  gridZ: number;
  worldX: number;
  worldZ: number;
  color: string;
}

export interface CityStoreState {
  users: Map<string, CityDeveloper>;
  buildings: BuildingData[];
  sortedLogins: string[];
  gridSize: number;
  isNightMode: boolean;
  isAirplaneMode: boolean;
  isRankChartOpen: boolean;
  selectedUser: CityDeveloper | null;
  isLoading: boolean;
  loadingProgress: number;
  loadingMessage: string;
  flyToTarget: { x: number; y: number; z: number } | null;
  firebaseLoaded: number;
  newDevsLoaded: number;
  initialLoadAt: number;

  addUser: (user: CityDeveloper) => void;
  addUsers: (users: CityDeveloper[]) => void;
  setBuildings: (buildings: BuildingData[]) => void;
  selectUser: (user: CityDeveloper | null) => void;
  toggleNightMode: () => void;
  toggleAirplaneMode: () => void;
  setRankChartOpen: (open: boolean) => void;
  setSelectedUser: (user: CityDeveloper | null) => void;
  setLoading: (loading: boolean) => void;
  setLoadingProgress: (progress: number, message?: string) => void;
  setFlyToTarget: (target: { x: number; y: number; z: number } | null) => void;
  setFirebaseLoaded: (n: number) => void;
  setNewDevsLoaded: (n: number) => void;
  setInitialLoadAt: (t: number) => void;
  getUserByLogin: (login: string) => CityDeveloper | undefined;
  getTopUsers: (count: number) => CityDeveloper[];
  getRandomUser: () => CityDeveloper | undefined;
}

export const LANGUAGE_COLORS: Record<string, string> = {
  JavaScript: '#f0db4f',
  TypeScript: '#3178c6',
  Python: '#3776ab',
  Rust: '#ce422b',
  Go: '#00acd7',
  Ruby: '#cc342d',
  Java: '#b07219',
  'C++': '#f34b7d',
  C: '#555555',
  Swift: '#fa7343',
  Kotlin: '#a97bff',
  PHP: '#777bb4',
  'C#': '#178600',
  Shell: '#89e051',
  HTML: '#e34c26',
};

export const DEFAULT_LANGUAGE_COLOR = '#4a90d9';

export function getLanguageColor(language: string): string {
  return LANGUAGE_COLORS[language] || DEFAULT_LANGUAGE_COLOR;
}

export const GRID_SIZE = 145;
export const SLOT_SIZE = 5;
export const CITY_EXTENT = GRID_SIZE * SLOT_SIZE; // 725
