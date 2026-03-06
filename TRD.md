# TECHNICAL REQUIREMENTS DOCUMENT (TRD)
## Minecraft GitHub City — Production Build
### Version 1.0 | For Claude Opus 4.6 | Developer: Ashusriwastav07

---

## DOCUMENT PURPOSE

This TRD is a complete, self-contained technical specification. Feed this entire document to Claude Opus 4.6 and it will build the complete project from scratch without needing any clarification. Every architectural decision, every file, every function signature, every edge case, and every performance requirement is defined here.

---

# CHAPTER 1 — SYSTEM OVERVIEW

## 1.1 What Is Being Built

A browser-based 3D interactive city where every public GitHub developer has a permanent Minecraft-style voxel building. The city is backed by Firebase Firestore and scales to 20,000 developers. Buildings update in real time as GitHub stats change. Users can fly over the city in an airplane, search any developer, click buildings for profile data, and see live rankings.

The visual reference is thegitcity.com — a site that renders thousands of GitHub developer buildings using Three.js InstancedMesh. This project replicates that technical approach exactly, adds a full Minecraft block texture aesthetic, a Firebase persistence layer, and several additional features.

## 1.2 The Three Fundamental Visual Rules

Every technical decision flows from these three rules:

**Rule 1 — HEIGHT equals commits.** A developer with more commits has a taller building. Uses percentile-based scaling so the distribution always looks visually balanced. Only one building reaches maximum height.

**Rule 2 — FOOTPRINT equals repos.** A developer with more public repositories has a wider building base. Fixed at 3×3 world units minimum, scales to 9×9 maximum.

**Rule 3 — WINDOW GLOW equals stars.** A developer with more stars has more lit windows at night. Window brightness and density directly represents GitHub star count.

## 1.3 System Architecture Diagram

```
BROWSER
├── Next.js App Router (React 18)
│   ├── CityScene (React Three Fiber Canvas)
│   │   ├── CityGrid — renders all buildings via InstancedMesh
│   │   ├── TechPark — park area with developer characters
│   │   ├── Airplane — user-controlled flyable plane
│   │   └── CameraController — orbit + fly-to + WASD
│   └── HUD Overlay (React DOM)
│       ├── SearchBar, ProfileModal, RankChart
│       ├── MiniMap, LiveFeed, TopFiveWidget
│       └── LoadingScreen
│
SERVER (Next.js API Routes — Node.js runtime)
├── /api/github/stream — SSE discovery stream (all real users)
├── /api/github/[username] — single user profile fetch
├── /api/github/refresh — batch stats refresh
└── /api/city/* — Firebase read/write operations
│
FIREBASE
├── Firestore — persistent developer profiles + city slots
├── Realtime Database — live event feed (new joins, rank changes)
└── (No Auth required for read — anonymous for writes)
│
GITHUB API
├── Search API — discovers real developers dynamically
├── Users API — full profile data
├── Repos API — stars, forks, languages
└── Events API — recent activity data
```

---

# CHAPTER 2 — TECHNOLOGY STACK

## 2.1 Complete Dependency List

```json
{
  "dependencies": {
    "next": "^15.0.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "three": "^0.169.0",
    "@react-three/fiber": "^8.17.0",
    "@react-three/drei": "^9.115.0",
    "zustand": "^5.0.0",
    "firebase": "^11.0.0"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "@types/node": "^22.0.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@types/three": "^0.169.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "eslint": "^9.0.0",
    "@typescript-eslint/eslint-plugin": "^8.0.0"
  }
}
```

## 2.2 Install Commands (Run Exactly in This Order)

```bash
# 1. Create Next.js project
npx create-next-app@latest minecraft-gitcity \
  --typescript \
  --tailwind \
  --app \
  --eslint \
  --src-dir \
  --import-alias "@/*" \
  --no-turbopack

# 2. Enter project directory
cd minecraft-gitcity

# 3. Install 3D rendering libraries
npm install three @react-three/fiber @react-three/drei

# 4. Install state management
npm install zustand

# 5. Install Firebase
npm install firebase

# 6. Install Three.js type definitions
npm install --save-dev @types/three

# 7. Verify installation
npm run dev
# Must open at localhost:3000 with no errors
```

## 2.3 Environment Variables

Create file `.env.local` in project root. Claude must ask the developer for these values before writing any code:

```bash
# ─── FIREBASE ─────────────────────────────────────────────
# Get from: Firebase Console → Project Settings → Web App → Config
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_DATABASE_URL=
# Realtime DB URL format: https://[project-id]-default-rtdb.firebaseio.com

# ─── GITHUB TOKENS ────────────────────────────────────────
# Get from: github.com → Settings → Developer Settings → Personal Access Tokens → Classic
# Select ONLY: public_repo scope
# Create 3 separate tokens for rate limit rotation
# Each token = 5,000 requests/hour. 3 tokens = 15,000/hour
GITHUB_TOKEN_1=ghp_xxxxxxxxxxxxxxxxxxxx
GITHUB_TOKEN_2=ghp_xxxxxxxxxxxxxxxxxxxx
GITHUB_TOKEN_3=ghp_xxxxxxxxxxxxxxxxxxxx

# ─── APP ──────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 2.4 next.config.js

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['avatars.githubusercontent.com'],
  },
  async headers() {
    return [
      {
        source: '/api/github/stream',
        headers: [
          { key: 'Cache-Control', value: 'no-cache' },
          { key: 'Content-Type', value: 'text/event-stream' },
          { key: 'Connection', value: 'keep-alive' },
          { key: 'X-Accel-Buffering', value: 'no' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

---

# CHAPTER 3 — COMPLETE FILE STRUCTURE

Every file that must exist in the project, with its exact purpose:

```
minecraft-gitcity/
├── .env.local                              ← secrets (never commit)
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
│
├── src/
│   ├── app/
│   │   ├── layout.tsx                      ← root layout, Press Start 2P font
│   │   ├── page.tsx                        ← main page assembly
│   │   ├── globals.css                     ← Tailwind + Minecraft CSS vars
│   │   └── api/
│   │       ├── github/
│   │       │   ├── stream/
│   │       │   │   └── route.ts            ← SSE: discovers all real users
│   │       │   ├── [username]/
│   │       │   │   └── route.ts            ← single user full profile
│   │       │   └── refresh/
│   │       │       └── route.ts            ← batch stats refresh
│   │       └── city/
│   │           ├── users/
│   │           │   └── route.ts            ← read users from Firestore
│   │           └── add/
│   │               └── route.ts            ← add/update user in Firestore
│   │
│   ├── components/
│   │   ├── city/
│   │   │   ├── CityScene.tsx               ← R3F Canvas + lights + sky
│   │   │   ├── CityGrid.tsx                ← renders all buildings
│   │   │   ├── Building.tsx                ← single building component
│   │   │   ├── InstancedBuildings.tsx      ← InstancedMesh for performance
│   │   │   ├── TechPark.tsx                ← park with all elements
│   │   │   ├── ParkCharacter.tsx           ← sitting dev character model
│   │   │   ├── Airplane.tsx                ← flyable plane + controls
│   │   │   ├── VaporTrail.tsx              ← plane contrail effect
│   │   │   ├── CameraController.tsx        ← orbit + WASD + fly-to
│   │   │   └── Ground.tsx                  ← city ground plane
│   │   │
│   │   └── ui/
│   │       ├── SearchBar.tsx               ← search any GitHub user
│   │       ├── ProfileModal.tsx            ← dev profile popup
│   │       ├── RankChart.tsx               ← top 100 leaderboard panel
│   │       ├── MiniMap.tsx                 ← 180×180 city overview
│   │       ├── TopFiveWidget.tsx           ← always-visible rank 1–5
│   │       ├── LiveFeed.tsx                ← scrolling event ticker
│   │       ├── LoadingScreen.tsx           ← progress overlay
│   │       ├── AirplaneHUD.tsx             ← flight instruments overlay
│   │       ├── Controls.tsx                ← keyboard hint panel
│   │       └── HUD.tsx                     ← assembles all UI
│   │
│   ├── lib/
│   │   ├── firebase.ts                     ← Firebase singleton init
│   │   ├── firestore.ts                    ← all Firestore operations
│   │   ├── realtimeDb.ts                   ← Realtime DB listeners
│   │   ├── githubTokens.ts                 ← token rotation pool
│   │   ├── cityLayout.ts                   ← grid math + slot positions
│   │   ├── buildingGeometry.ts             ← mesh generation per tier
│   │   ├── textureGenerator.ts             ← canvas block textures
│   │   ├── cityStore.ts                    ← Zustand global store
│   │   └── cityStream.ts                   ← SSE consumer + cache
│   │
│   └── types/
│       └── index.ts                        ← all TypeScript interfaces
```

---

# CHAPTER 4 — TYPESCRIPT TYPES

## 4.1 Complete Type Definitions (`src/types/index.ts`)

```typescript
// ─── GITHUB DATA ──────────────────────────────────────────

export interface GitHubRepo {
  name: string;
  description: string | null;
  stars: number;
  forks: number;
  language: string | null;
  url: string;
  updatedAt: string;
}

export interface GitHubUser {
  // Identity
  login: string;
  name: string | null;
  avatarUrl: string;
  bio: string | null;
  location: string | null;
  company: string | null;
  blog: string | null;
  twitterUsername: string | null;

  // GitHub stats (all fetched live, never hardcoded)
  publicRepos: number;
  followers: number;
  following: number;
  createdAt: string;           // ISO date string

  // Aggregated stats (calculated from repos + events)
  totalStars: number;          // sum of stargazers across all repos
  totalForks: number;          // sum of forks across all repos
  topLanguage: string;         // most-used language by repo count
  estimatedCommits: number;    // calculated from push events + repos
  recentActivity: number;      // 0–100 score based on last 30 days events
  
  // Processed data
  topRepos: GitHubRepo[];      // top 5 by stars
  languages: LanguageStat[];   // top 5 languages with percentages
}

export interface LanguageStat {
  language: string;
  count: number;
  percentage: number;
}

// ─── CITY DATA ────────────────────────────────────────────

export interface CityUser extends GitHubUser {
  // City-specific data (stored in Firebase, never changes once set)
  citySlot: number;            // permanent slot number, 0–21024
  cityRank: number;            // current rank by totalScore
  totalScore: number;          // scoring formula result
  
  // Timestamps
  firstAddedAt: number;        // unix timestamp ms
  lastUpdatedAt: number;       // unix timestamp ms
  addedBy: 'discovery' | 'search' | 'admin';
  
  // Derived (computed client-side from citySlot)
  worldX: number;
  worldZ: number;
}

// ─── BUILDING CALCULATION ─────────────────────────────────

export type BuildingTier = 1 | 2 | 3 | 4 | 5;
export type BuildingArchetype = 
  | 'skyscraper'    // tier 1 only
  | 'tower'         // tier 2
  | 'tall'          // tier 3
  | 'standard'      // tier 4
  | 'small';        // tier 5

export interface BuildingConfig {
  login: string;
  tier: BuildingTier;
  archetype: BuildingArchetype;
  heightBlocks: number;        // 2–80
  footprintUnits: number;      // 3–9 world units
  primaryColor: string;        // hex, based on topLanguage
  windowDensity: number;       // 0–1, based on stars percentile
  windowLitRatio: number;      // 0–1, based on recentActivity
  hasLedStrips: boolean;       // true for tier 1 and 2
  roofType: 'flat' | 'parapet' | 'feature' | 'crown' | 'tapered';
  worldX: number;
  worldZ: number;
}

// ─── GRID ─────────────────────────────────────────────────

export interface GridSlot {
  slotIndex: number;
  gridX: number;
  gridZ: number;
  worldX: number;
  worldZ: number;
}

// ─── EVENTS ───────────────────────────────────────────────

export interface CityEvent {
  id: string;
  type: 'join' | 'grow' | 'rankUp' | 'search';
  login: string;
  detail: string;
  timestamp: number;
}

// ─── STORE ────────────────────────────────────────────────

export interface CityStoreState {
  users: Map<string, CityUser>;
  sortedLogins: string[];
  totalLoaded: number;
  isStreaming: boolean;
  isNight: boolean;
  selectedUser: CityUser | null;
  cameraMode: 'overview' | 'airplane';
  flyTarget: [number, number, number] | null;
  
  addUser: (user: CityUser) => void;
  updateUser: (user: Partial<CityUser> & { login: string }) => void;
  selectUser: (user: CityUser | null) => void;
  setNight: (v: boolean) => void;
  setStreaming: (v: boolean) => void;
  setCameraMode: (mode: 'overview' | 'airplane') => void;
  flyToUser: (login: string) => void;
}
```

---

# CHAPTER 5 — FIREBASE SETUP

## 5.1 Manual Setup Steps

Before any code is written, the developer must complete these steps in the Firebase Console:

**Step 1:** Go to console.firebase.google.com → Add Project → Name: "minecraft-gitcity" → Continue → Enable Google Analytics: optional → Create Project.

**Step 2:** In the project dashboard, click "Firestore Database" → Create database → Start in production mode → Choose closest region (e.g., us-central1 for USA, asia-south1 for India) → Enable.

**Step 3:** Click "Realtime Database" → Create Database → Choose same region → Start in locked mode → Enable.

**Step 4:** Click "Authentication" → Get started → Sign-in method → Anonymous → Enable → Save.

**Step 5:** Click the gear icon → Project Settings → General → scroll to "Your apps" → Web app icon → Register app with nickname "web" → Copy the config object.

**Step 6:** Paste the config values into `.env.local`.

## 5.2 Firestore Security Rules

In Firebase Console → Firestore → Rules tab, paste exactly:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Anyone can read city data — it's a public city
    match /city_users/{userId} {
      allow read: if true;
      allow create, update: if false;
      allow delete: if false;
    }
    match /city_meta/{docId} {
      allow read: if true;
      allow write: if false;
    }
    match /rank_history/{docId} {
      allow read: if true;
      allow write: if false;
    }
  }
}
```

## 5.3 Realtime Database Rules

In Firebase Console → Realtime Database → Rules tab, paste:

```json
{
  "rules": {
    "live": {
      ".read": true,
      ".write": false,
      "recentEvents": {
        ".read": true,
        ".write": false
      }
    }
  }
}
```

## 5.4 Firestore Indexes

In Firebase Console → Firestore → Indexes → Create composite index:

**Index 1:**
- Collection: `city_users`
- Fields: `cityRank` ASC, `firstAddedAt` DESC
- Query scope: Collection

**Index 2:**
- Collection: `city_users`
- Fields: `recentActivity` DESC, `lastUpdatedAt` DESC
- Query scope: Collection

**Index 3:**
- Collection: `city_users`
- Fields: `totalScore` DESC, `login` ASC
- Query scope: Collection

## 5.5 Firestore Data Schema

### Collection: `city_users`
Document ID = GitHub username (always lowercase).

```typescript
// Every field in every document:
{
  login: string,              // "torvalds" (document ID, also stored as field)
  name: string,               // "Linus Torvalds"
  avatarUrl: string,          // "https://avatars.githubusercontent.com/u/1024025"
  bio: string,                // "Just a dude who creates" (empty string if null)
  location: string,           // "Portland, OR" (empty string if null)
  company: string,            // "@linux" (empty string if null)
  blog: string,               // "https://example.com" (empty string if null)
  twitterUsername: string,    // "torvalds" (empty string if null)
  publicRepos: number,        // 6
  followers: number,          // 230000
  following: number,          // 0
  createdAt: string,          // "2011-09-03T15:26:22Z"
  totalStars: number,         // calculated sum
  totalForks: number,         // calculated sum
  topLanguage: string,        // "C"
  estimatedCommits: number,   // calculated
  recentActivity: number,     // 0-100
  topRepos: [                 // array of up to 5 objects
    {
      name: string,
      description: string,
      stars: number,
      forks: number,
      language: string,
      url: string,
      updatedAt: string
    }
  ],
  languages: [                // top 5 languages
    { language: string, count: number, percentage: number }
  ],
  citySlot: number,           // 0-21024, PERMANENT
  cityRank: number,           // current rank
  totalScore: number,         // commits*3 + stars*2 + followers*1 + repos*0.5
  firstAddedAt: number,       // Date.now() unix ms
  lastUpdatedAt: number,      // Date.now() unix ms
  addedBy: string,            // "discovery" | "search"
}
```

### Collection: `city_meta`
Single document with ID `main`:

```typescript
{
  totalUsers: number,        // current count of city_users documents
  nextSlot: number,          // next available slot, increments atomically
  lastDiscoveryRun: number,  // timestamp of last discovery batch
  cityVersion: number,       // increments on schema changes
}
```

### Collection: `rank_history`
Document ID = date string "YYYY-MM-DD":

```typescript
{
  date: string,
  top100: Array<{
    rank: number,
    login: string,
    totalScore: number,
    estimatedCommits: number,
    totalStars: number,
    topLanguage: string,
  }>,
  createdAt: number,
}
```

## 5.6 Firebase Initialization (`src/lib/firebase.ts`)

```typescript
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL!,
};

// Prevent double-initialization in Next.js dev mode
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const db = getFirestore(app);
export const rtdb = getDatabase(app);
export default app;
```

---

# CHAPTER 6 — CITY GRID MATHEMATICS

## 6.1 Grid Specification

```
Grid dimensions:    145 × 145 = 21,025 total slots
Cell size:          5 world units per slot
  └── Building occupies: 3 × 3 world units (fixed for all buildings)
  └── Gap on right:      1 world unit
  └── Gap on bottom:     1 world unit
  
City world span:    145 × 5 = 725 world units in each direction
City center:        slot 0 at grid position (72, 72)
                    world position (0, 0, 0)

Reserved slots:     Tech Park = 10×10 = 100 slots
                    (grid positions 85–94 on both axes)
Available for buildings: 21,025 - 100 = 20,925 slots
```

## 6.2 Slot-to-World-Position Formula

```typescript
const CELL_SIZE = 5;        // world units per slot
const GRID_SIZE = 145;      // slots per side
const HALF_GRID = 72;       // Math.floor(GRID_SIZE / 2)
const TECH_PARK_GRID_X = 85;
const TECH_PARK_GRID_Z = 85;
const TECH_PARK_SIZE = 10;

function slotIndexToGridPosition(slotIndex: number): { gridX: number; gridZ: number } {
  // Spiral algorithm — starts at center, spirals outward
  // The spiral order matches city rank order:
  // slot 0 = center = rank 1 developer
  // slot 1 = one step from center = rank 2 developer
  // etc.
  let x = 0, z = 0, dx = 0, dz = -1;
  for (let i = 0; i < slotIndex; i++) {
    if (x === z || (x < 0 && x === -z) || (x > 0 && x === 1 - z)) {
      [dx, dz] = [-dz, dx];
    }
    x += dx; z += dz;
  }
  return { gridX: HALF_GRID + x, gridZ: HALF_GRID + z };
}

function gridPositionToWorldPosition(gridX: number, gridZ: number): [number, number, number] {
  const worldX = (gridX - HALF_GRID) * CELL_SIZE;
  const worldZ = (gridZ - HALF_GRID) * CELL_SIZE;
  return [worldX, 0, worldZ];  // Y is always 0 (ground level)
}

function isInTechPark(gridX: number, gridZ: number): boolean {
  return (
    gridX >= TECH_PARK_GRID_X && 
    gridX < TECH_PARK_GRID_X + TECH_PARK_SIZE &&
    gridZ >= TECH_PARK_GRID_Z && 
    gridZ < TECH_PARK_GRID_Z + TECH_PARK_SIZE
  );
}

// Pre-compute all valid slots at startup (excluding Tech Park)
function precomputeValidSlots(): GridSlot[] {
  const slots: GridSlot[] = [];
  for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
    const { gridX, gridZ } = slotIndexToGridPosition(i);
    if (isInTechPark(gridX, gridZ)) continue;
    const [worldX, , worldZ] = gridPositionToWorldPosition(gridX, gridZ);
    slots.push({ slotIndex: i, gridX, gridZ, worldX, worldZ });
  }
  return slots;
}
```

## 6.3 Building Height Formula

```typescript
// Uses percentile rank so visual distribution is always balanced
// regardless of how extreme the top developers are

function calculateBuildingHeight(
  estimatedCommits: number,
  cityRank: number,
  totalUsers: number
): number {
  const percentile = 1 - (cityRank / totalUsers);
  
  // Tier 1: top 0.005% (rank 1 only) = 70–80 blocks
  if (cityRank === 1) return 80;
  
  // Tier 2: top 0.05% (ranks 2–10) = 40–65 blocks
  if (cityRank <= 10) {
    return Math.round(40 + (10 - cityRank) * 2.7);
  }
  
  // Tier 3: top 1% (ranks 11–200) = 18–40 blocks
  if (cityRank <= 200) {
    return Math.round(18 + (200 - cityRank) * 0.115);
  }
  
  // Tier 4: top 25% (ranks 201–5000) = 6–18 blocks
  if (cityRank <= 5000) {
    return Math.round(6 + (5000 - cityRank) * 0.00245);
  }
  
  // Tier 5: everything else = 2–6 blocks
  return Math.max(2, Math.round(6 - (cityRank - 5000) * 0.0002));
}
```

## 6.4 Building Footprint Formula

```typescript
// footprint in world units (3 = smallest, 9 = largest)
// NOTE: Footprint affects the visual size of the building on the grid
// but ALL buildings sit in the same 5×5 world unit cell
// Larger footprint = building fills more of that cell

function calculateBuildingFootprint(
  publicRepos: number,
  totalStars: number
): number {
  // Primary: repos
  if (publicRepos === 0) return 3;
  if (publicRepos < 5) return 3;
  if (publicRepos < 20) return 4;
  if (publicRepos < 50) return 5;
  if (publicRepos < 100) return 6;
  if (publicRepos < 200) return 7;
  if (publicRepos < 500) return 8;
  return 9;
}
```

## 6.5 Total Score Formula

```typescript
// Score determines city rank. Higher score = lower slot number = closer to center
function calculateTotalScore(user: GitHubUser): number {
  return (
    (user.estimatedCommits * 3) +
    (user.totalStars * 2) +
    (user.followers * 1) +
    (user.publicRepos * 0.5) +
    (user.recentActivity * 10)  // bonus for currently active devs
  );
}
```

---

# CHAPTER 7 — GITHUB API LAYER

## 7.1 Token Rotation (`src/lib/githubTokens.ts`)

```typescript
const TOKENS = [
  process.env.GITHUB_TOKEN_1,
  process.env.GITHUB_TOKEN_2,
  process.env.GITHUB_TOKEN_3,
].filter(Boolean) as string[];

let index = 0;

export function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'MCGitCity/1.0',
  };
  if (TOKENS.length > 0) {
    headers['Authorization'] = `Bearer ${TOKENS[index++ % TOKENS.length]}`;
  }
  return headers;
}

// Check remaining rate limit — call this before bulk operations
export async function checkRateLimit(): Promise<{remaining: number; reset: number}> {
  const res = await fetch('https://api.github.com/rate_limit', { headers: getAuthHeaders() });
  const data = await res.json();
  return {
    remaining: data.resources?.search?.remaining ?? 0,
    reset: data.resources?.search?.reset ?? 0,
  };
}
```

## 7.2 Single User Profile Route (`src/app/api/github/[username]/route.ts`)

```typescript
export const runtime = 'nodejs';

export async function GET(
  req: Request,
  { params }: { params: { username: string } }
) {
  const { username } = params;
  const headers = getAuthHeaders();

  try {
    // Fetch user + repos + events in parallel
    const [userRes, reposRes, eventsRes] = await Promise.all([
      fetch(`https://api.github.com/users/${username}`, { headers }),
      fetch(`https://api.github.com/users/${username}/repos?per_page=100&sort=updated`, { headers }),
      fetch(`https://api.github.com/users/${username}/events/public?per_page=100`, { headers }),
    ]);

    // Handle errors
    if (userRes.status === 404) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }
    if (userRes.status === 403 || userRes.status === 429) {
      const resetTime = userRes.headers.get('X-RateLimit-Reset');
      return Response.json(
        { error: 'rate_limited', resetAt: resetTime },
        { status: 429 }
      );
    }
    if (!userRes.ok) {
      return Response.json({ error: 'GitHub API error' }, { status: 502 });
    }

    const user = await userRes.json();
    const repos = reposRes.ok ? await reposRes.json() : [];
    const events = eventsRes.ok ? await eventsRes.json() : [];

    // Calculate aggregated stats
    const totalStars = repos.reduce((s: number, r: any) => s + (r.stargazers_count || 0), 0);
    const totalForks = repos.reduce((s: number, r: any) => s + (r.forks_count || 0), 0);

    // Language frequency map (weighted by repo size)
    const langMap: Record<string, number> = {};
    repos.forEach((r: any) => {
      if (r.language) {
        langMap[r.language] = (langMap[r.language] || 0) + 1;
      }
    });
    const sortedLangs = Object.entries(langMap).sort((a, b) => b[1] - a[1]);
    const topLanguage = sortedLangs[0]?.[0] ?? 'Unknown';
    const totalLangCount = sortedLangs.reduce((s, [, c]) => s + c, 0);
    const languages = sortedLangs.slice(0, 5).map(([language, count]) => ({
      language,
      count,
      percentage: Math.round((count / totalLangCount) * 100),
    }));

    // Commit estimation from push events
    const pushEvents = events.filter((e: any) => e.type === 'PushEvent');
    const recentCommitsFromEvents = pushEvents.reduce(
      (s: number, e: any) => s + (e.payload?.commits?.length || 0), 0
    );
    const estimatedCommits = Math.max(
      repos.length * 30,          // baseline: average 30 commits per repo
      recentCommitsFromEvents * 15, // scale up from recent 100 events sample
      user.public_repos * 20,
      10
    );

    // Recent activity score
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recentEventCount = events.filter(
      (e: any) => new Date(e.created_at).getTime() > thirtyDaysAgo
    ).length;
    const recentActivity = Math.min(100, recentEventCount);

    // Top repos
    const topRepos = repos
      .sort((a: any, b: any) => b.stargazers_count - a.stargazers_count)
      .slice(0, 5)
      .map((r: any) => ({
        name: r.name,
        description: r.description?.slice(0, 120) ?? '',
        stars: r.stargazers_count,
        forks: r.forks_count,
        language: r.language,
        url: r.html_url,
        updatedAt: r.updated_at,
      }));

    const result: GitHubUser = {
      login: user.login,
      name: user.name ?? null,
      avatarUrl: user.avatar_url,
      bio: user.bio ?? null,
      location: user.location ?? null,
      company: user.company ?? null,
      blog: user.blog ?? null,
      twitterUsername: user.twitter_username ?? null,
      publicRepos: user.public_repos,
      followers: user.followers,
      following: user.following,
      createdAt: user.created_at,
      totalStars,
      totalForks,
      topLanguage,
      estimatedCommits,
      recentActivity,
      topRepos,
      languages,
    };

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

## 7.3 Discovery Stream Route (`src/app/api/github/stream/route.ts`)

```typescript
// Server-Sent Events route — streams discovered users to browser in real time
// Runs 30 GitHub Search queries simultaneously
// Each discovered user is fully enriched and sent immediately
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ALL 30 DISCOVERY QUERIES — cover all follower brackets + languages + activity
// No hardcoded usernames anywhere — all users discovered dynamically
const DISCOVERY_QUERIES = [
  // Follower brackets (overlapping to maximize coverage)
  'followers:>100000',
  'followers:>50000 followers:<=100000',
  'followers:>20000 followers:<=50000',
  'followers:>10000 followers:<=20000',
  'followers:>5000 followers:<=10000',
  'followers:>2000 followers:<=5000',
  'followers:>1000 followers:<=2000',
  'followers:>500 followers:<=1000',
  'followers:>200 followers:<=500',
  'followers:>100 followers:<=200',
  // Language-specific
  'language:javascript followers:>300',
  'language:typescript followers:>200',
  'language:python followers:>300',
  'language:rust followers:>100',
  'language:go followers:>200',
  'language:java followers:>200',
  'language:cpp followers:>200',
  'language:swift followers:>100',
  'language:kotlin followers:>100',
  'language:ruby followers:>200',
  // Repo count leaders
  'repos:>300 followers:>50',
  'repos:>100 followers:>100',
  // Recent rising stars
  'followers:>500 created:>2022-01-01',
  'followers:>200 created:>2023-01-01',
  'followers:>100 created:>2024-01-01',
  // Organizations
  'type:org followers:>5000',
  'type:org followers:>1000 followers:<=5000',
  // Recently active
  'repos:>50 followers:>200 pushed:>2025-01-01',
  // Star-based discovery
  'stars:>1000 followers:>50',
  'stars:>5000',
];

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch (e) {
          // Client disconnected
        }
      };

      const seen = new Set<string>();
      let totalSent = 0;
      const MAX_USERS = 5000; // cap to prevent browser overload

      send({ type: 'start', queries: DISCOVERY_QUERIES.length });

      // Run all queries in parallel
      await Promise.allSettled(
        DISCOVERY_QUERIES.map(async (query, qi) => {
          for (let page = 1; page <= 10; page++) { // max 1000 per query
            if (totalSent >= MAX_USERS) return;

            try {
              const url = `https://api.github.com/search/users?q=${encodeURIComponent(query)}&sort=followers&order=desc&per_page=100&page=${page}`;
              const res = await fetch(url, { headers: getAuthHeaders() });

              if (res.status === 422) break; // no more results
              if (res.status === 403 || res.status === 429) {
                // Rate limited — wait and retry
                await new Promise(r => setTimeout(r, 30000));
                page--;
                continue;
              }
              if (!res.ok) break;

              const data = await res.json();
              if (!data.items?.length) break;

              // Enrich each user with full profile in parallel batches of 5
              const newLogins = data.items
                .map((u: any) => u.login as string)
                .filter((l: string) => !seen.has(l));

              for (let i = 0; i < newLogins.length; i += 5) {
                if (totalSent >= MAX_USERS) return;
                const batch = newLogins.slice(i, i + 5);

                await Promise.allSettled(batch.map(async (login: string) => {
                  if (seen.has(login) || totalSent >= MAX_USERS) return;
                  seen.add(login);

                  try {
                    const profileRes = await fetch(
                      `${process.env.NEXT_PUBLIC_APP_URL}/api/github/${login}`
                    );
                    if (!profileRes.ok) return;
                    const profile = await profileRes.json();
                    if (profile.error) return;

                    send({ type: 'user', data: profile });
                    totalSent++;
                    send({ type: 'progress', count: totalSent });
                  } catch {}
                }));

                await new Promise(r => setTimeout(r, 100)); // pace requests
              }

              await new Promise(r => setTimeout(r, 200)); // between pages
            } catch {
              break;
            }
          }
        })
      );

      send({ type: 'complete', total: totalSent });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

---

# CHAPTER 8 — FIRESTORE OPERATIONS

## 8.1 All Firestore Functions (`src/lib/firestore.ts`)

```typescript
import { db } from './firebase';
import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc,
  query, orderBy, limit, startAfter, runTransaction,
  onSnapshot, increment, serverTimestamp, where,
  DocumentSnapshot, QueryDocumentSnapshot
} from 'firebase/firestore';

const USERS_COL = 'city_users';
const META_COL = 'city_meta';
const META_DOC = 'main';

// ─── READ OPERATIONS ──────────────────────────────────────

// Load first N users sorted by cityRank — call on page load
export async function loadTopUsers(
  limitCount: number = 2000,
  onUser: (user: CityUser) => void
): Promise<void> {
  const q = query(
    collection(db, USERS_COL),
    orderBy('cityRank', 'asc'),
    limit(limitCount)
  );
  const snapshot = await getDocs(q);
  snapshot.forEach(doc => onUser(doc.data() as CityUser));
}

// Load additional users with cursor pagination
export async function loadMoreUsers(
  afterDoc: QueryDocumentSnapshot,
  limitCount: number = 500,
  onUser: (user: CityUser) => void
): Promise<QueryDocumentSnapshot | null> {
  const q = query(
    collection(db, USERS_COL),
    orderBy('cityRank', 'asc'),
    startAfter(afterDoc),
    limit(limitCount)
  );
  const snapshot = await getDocs(q);
  snapshot.forEach(doc => onUser(doc.data() as CityUser));
  return snapshot.docs[snapshot.docs.length - 1] ?? null;
}

// Get a single user by login
export async function getUserByLogin(login: string): Promise<CityUser | null> {
  const docRef = doc(db, USERS_COL, login.toLowerCase());
  const snap = await getDoc(docRef);
  return snap.exists() ? (snap.data() as CityUser) : null;
}

// Get top 100 by totalScore for rank chart
export async function getTop100(): Promise<CityUser[]> {
  const q = query(
    collection(db, USERS_COL),
    orderBy('totalScore', 'desc'),
    limit(100)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => d.data() as CityUser);
}

// Get most recently active users for Tech Park
export async function getMostActiveUsers(limitCount: number = 20): Promise<CityUser[]> {
  const q = query(
    collection(db, USERS_COL),
    orderBy('recentActivity', 'desc'),
    limit(limitCount)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => d.data() as CityUser);
}

// ─── WRITE OPERATIONS ─────────────────────────────────────

// Add a new user to the city atomically (assigns permanent slot)
export async function addUserToCity(
  githubUser: GitHubUser,
  addedBy: 'discovery' | 'search'
): Promise<CityUser> {
  const metaRef = doc(db, META_COL, META_DOC);
  const userRef = doc(db, USERS_COL, githubUser.login.toLowerCase());

  // Check if user already exists (prevents duplicates)
  const existing = await getDoc(userRef);
  if (existing.exists()) {
    return existing.data() as CityUser;
  }

  // Atomic transaction: read nextSlot → assign → increment
  const cityUser = await runTransaction(db, async (transaction) => {
    const metaSnap = await transaction.get(metaRef);
    
    let nextSlot = 0;
    let totalUsers = 0;

    if (!metaSnap.exists()) {
      // Initialize meta document on first user
      transaction.set(metaRef, {
        totalUsers: 0,
        nextSlot: 0,
        lastDiscoveryRun: Date.now(),
        cityVersion: 1,
      });
    } else {
      nextSlot = metaSnap.data().nextSlot ?? 0;
      totalUsers = metaSnap.data().totalUsers ?? 0;
    }

    const totalScore = calculateTotalScore(githubUser);
    const newCityUser: CityUser = {
      ...githubUser,
      citySlot: nextSlot,
      cityRank: totalUsers + 1, // will be re-ranked but initial value needed
      totalScore,
      firstAddedAt: Date.now(),
      lastUpdatedAt: Date.now(),
      addedBy,
      worldX: 0, // calculated client-side from slot
      worldZ: 0,
    };

    transaction.set(userRef, newCityUser);
    transaction.update(metaRef, {
      nextSlot: increment(1),
      totalUsers: increment(1),
    });

    return newCityUser;
  });

  return cityUser;
}

// Update existing user's stats (does NOT change citySlot)
export async function refreshUserStats(
  login: string,
  updatedStats: Partial<GitHubUser>
): Promise<void> {
  const userRef = doc(db, USERS_COL, login.toLowerCase());
  const totalScore = calculateTotalScore(updatedStats as GitHubUser);
  
  await updateDoc(userRef, {
    ...updatedStats,
    totalScore,
    lastUpdatedAt: Date.now(),
  });
}

// ─── REAL-TIME LISTENERS ──────────────────────────────────

// Subscribe to new user additions — fires in every browser when someone joins
export function subscribeToNewUsers(
  onNewUser: (user: CityUser) => void
): () => void {
  const q = query(
    collection(db, USERS_COL),
    orderBy('firstAddedAt', 'desc'),
    limit(1)
  );
  
  return onSnapshot(q, snapshot => {
    snapshot.docChanges().forEach(change => {
      if (change.type === 'added') {
        onNewUser(change.doc.data() as CityUser);
      }
    });
  });
}
```

---

# CHAPTER 9 — BUILDING RENDERING SYSTEM

## 9.1 Language Color Map (`src/lib/textureGenerator.ts`)

```typescript
export const LANGUAGE_COLORS: Record<string, string> = {
  'JavaScript':  '#f0db4f',  // golden yellow
  'TypeScript':  '#3178c6',  // steel blue
  'Python':      '#3776ab',  // ocean blue
  'Rust':        '#ce422b',  // burnt orange-red
  'Go':          '#00acd7',  // bright cyan
  'Ruby':        '#cc342d',  // crimson
  'Java':        '#b07219',  // earthy brown
  'C++':         '#f34b7d',  // metallic pink
  'C':           '#555555',  // dark grey
  'Swift':       '#fa7343',  // vivid orange
  'Kotlin':      '#a97bff',  // soft purple
  'PHP':         '#777bb4',  // lavender
  'C#':          '#178600',  // forest green
  'Dart':        '#00b4ab',  // teal
  'HTML':        '#e34c26',  // orange-red
  'CSS':         '#563d7c',  // dark purple
  'Shell':       '#89e051',  // lime
  'Scala':       '#dc322f',  // scala red
  'Haskell':     '#5e5086',  // haskell purple
  'R':           '#198ce7',  // R blue
  'Unknown':     '#4a90d9',  // default slate blue
};
```

## 9.2 Canvas Texture Generation

```typescript
// Creates a Minecraft-look block texture using canvas API
// NearestFilter is THE critical setting — makes textures pixelated not blurry

export function createBlockTexture(
  baseColor: string,
  windowLitRatio: number,    // 0–1: how many windows are lit
  windowDensity: number,     // 0–1: how dense the window grid is
  heightBlocks: number       // used to vary window row count
): THREE.CanvasTexture {
  const SIZE = 32; // 32×32 pixels
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d')!;

  // 1. Base color fill
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // 2. Pixel noise (Minecraft texture variation)
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (Math.random() < 0.3) {
        const brightness = Math.random() < 0.5 ? 20 : -20;
        const hex = adjustBrightness(baseColor, brightness);
        ctx.fillStyle = hex;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  // 3. Floor division lines (horizontal dark bands every 5 pixels)
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  for (let y = 5; y < SIZE; y += 5) {
    ctx.fillRect(0, y, SIZE, 1);
  }

  // 4. Window grid
  const windowRows = Math.max(2, Math.min(6, Math.floor(heightBlocks / 6)));
  const windowCols = Math.max(2, Math.round(windowDensity * 4 + 1));
  const winW = 3, winH = 3;
  const colGap = Math.floor(SIZE / windowCols);
  const rowGap = Math.floor(SIZE / windowRows);

  for (let row = 0; row < windowRows; row++) {
    for (let col = 0; col < windowCols; col++) {
      const wx = col * colGap + 2;
      const wy = row * rowGap + 2;
      const isLit = Math.random() < windowLitRatio;
      ctx.fillStyle = isLit ? '#ffee88' : '#1a2a3a';
      ctx.fillRect(wx, wy, winW, winH);
      // Window border
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(wx - 1, wy - 1, winW + 2, 1);
      ctx.fillRect(wx - 1, wy - 1, 1, winH + 2);
    }
  }

  // 5. Block edge definition
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, SIZE - 1, SIZE - 1);

  // Create Three.js texture with NearestFilter (CRITICAL for Minecraft look)
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;  // pixelated = Minecraft look
  texture.minFilter = THREE.NearestFilter;  // must set both
  texture.needsUpdate = true;
  return texture;
}
```

## 9.3 Building Mesh Construction (Per Tier)

```typescript
// src/lib/buildingGeometry.ts
// Returns a THREE.Group ready to add to the scene

export function createBuildingMesh(config: BuildingConfig): THREE.Group {
  const group = new THREE.Group();
  group.userData = {
    login: config.login,
    buildingConfig: config,
  };

  const texture = createBlockTexture(
    config.primaryColor,
    config.windowLitRatio,
    config.windowDensity,
    config.heightBlocks
  );
  const mat = new THREE.MeshLambertMaterial({
    map: texture,
    emissive: new THREE.Color(config.primaryColor),
    emissiveIntensity: 0,  // will animate on hover/night
  });

  const fp = config.footprintUnits;
  const h = config.heightBlocks;

  // ── MAIN BODY ────────────────────────────────────
  const bodyGeo = new THREE.BoxGeometry(fp, h, fp);
  const body = new THREE.Mesh(bodyGeo, mat);
  body.position.y = h / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // ── TIER-SPECIFIC ADDITIONS ──────────────────────

  if (config.tier <= 3) {
    // Roof cap (slightly wider than building, flat or parapet)
    const roofGeo = new THREE.BoxGeometry(fp + 0.3, 0.4, fp + 0.3);
    const roofMat = new THREE.MeshLambertMaterial({ color: adjustHex(config.primaryColor, -20) });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = h + 0.2;
    group.add(roof);
  }

  if (config.tier <= 2) {
    // Corner LED strips (4 thin vertical boxes at corners)
    const ledColor = new THREE.Color(config.primaryColor).offsetHSL(0.5, 0, 0); // complementary
    const ledMat = new THREE.MeshLambertMaterial({
      color: ledColor,
      emissive: ledColor,
      emissiveIntensity: 0.8,
    });
    const ledGeo = new THREE.BoxGeometry(0.2, h, 0.2);
    const offsets: [number, number][] = [
      [fp/2 + 0.1, fp/2 + 0.1],
      [-fp/2 - 0.1, fp/2 + 0.1],
      [fp/2 + 0.1, -fp/2 - 0.1],
      [-fp/2 - 0.1, -fp/2 - 0.1],
    ];
    offsets.forEach(([ox, oz]) => {
      const led = new THREE.Mesh(ledGeo, ledMat);
      led.position.set(ox, h/2, oz);
      group.add(led);
    });

    // Roof feature: helipad or penthouse
    if (config.roofType === 'feature') {
      const phGeo = new THREE.BoxGeometry(fp * 0.5, 1.5, fp * 0.5);
      const phMat = new THREE.MeshLambertMaterial({ color: 0x444444 });
      const ph = new THREE.Mesh(phGeo, phMat);
      ph.position.y = h + 0.7;
      group.add(ph);
    }
  }

  if (config.tier === 1) {
    // Tapered crown: 3 sections narrowing to point
    const taperSections = [
      { size: fp * 0.8, height: h + 4 },
      { size: fp * 0.5, height: h + 9 },
      { size: fp * 0.2, height: h + 14 },
    ];
    taperSections.forEach(({ size, height }) => {
      const geo = new THREE.BoxGeometry(size, 5, size);
      const tapMat = new THREE.MeshLambertMaterial({
        color: new THREE.Color(config.primaryColor).offsetHSL(0, 0, 0.2),
      });
      const mesh = new THREE.Mesh(geo, tapMat);
      mesh.position.y = height;
      group.add(mesh);
    });

    // Antenna
    const antGeo = new THREE.BoxGeometry(0.2, 8, 0.2);
    const antMat = new THREE.MeshLambertMaterial({ color: 0xaaaaaa });
    const ant = new THREE.Mesh(antGeo, antMat);
    ant.position.y = h + 18;
    group.add(ant);

    // Beacon (glowing top block)
    const beaconGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const beaconMat = new THREE.MeshLambertMaterial({
      color: 0xffd700,
      emissive: new THREE.Color(0xffd700),
      emissiveIntensity: 1.0,
    });
    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
    beacon.position.y = h + 22.5;
    group.add(beacon);

    // PointLight at beacon position
    const light = new THREE.PointLight(0xffd700, 2, 50);
    light.position.y = h + 22;
    group.add(light);
  }

  return group;
}
```

---

# CHAPTER 10 — REACT THREE FIBER SCENE

## 10.1 CityScene Component (`src/components/city/CityScene.tsx`)

```typescript
// Key technical requirements for this component:
// 1. Must be client-side only: 'use client' directive required
// 2. Page.tsx must import this with: dynamic(() => import('./CityScene'), { ssr: false })
// 3. Canvas div must have: style={{ width: '100vw', height: '100vh' }}
// 4. Scene MUST have both ambientLight and directionalLight — without these
//    MeshLambertMaterial renders as pure black (invisible)
// 5. Camera starting position: [0, 180, 280] looking at [0, 0, 0]
//    This gives the "impressive city reveal" angle

// The CityScene mounts:
// - Canvas with shadows enabled, antialias: false (Minecraft look + performance)
// - Day: <Sky> component from drei + warm directional light
// - Night: <Stars> component + dim blue directional light
// - <Fog> always present: starts at 500 units, full at 1500 units
// - <CityGrid /> — all buildings
// - <TechPark /> — park area
// - <Airplane /> — user's plane (hidden until F pressed)
// - <CameraController /> — orbit + WASD + fly-to
// - <Ground /> — city ground plane
// All React Three Fiber components use useFrame for per-frame animation
// All use MeshLambertMaterial (not MeshStandardMaterial) for performance
```

## 10.2 Camera Requirements (`src/components/city/CameraController.tsx`)

```typescript
// The camera controller must support these behaviors:

// OVERVIEW MODE (default):
// - OrbitControls from @react-three/drei
// - Left click + drag = rotate around city
// - Right click + drag = pan (move city sideways)
// - Scroll wheel = zoom in/out
// - WASD keys = pan camera left/right/forward/back
// - Shift + WASD = fast pan
// - Min zoom distance: 5 units
// - Max zoom distance: 800 units  
// - Cannot orbit below ground (maxPolarAngle = Math.PI / 2.05)
// - screenSpacePanning: false (pans parallel to ground, feels natural)

// FLY-TO ANIMATION:
// - Called when: building clicked, leaderboard row clicked, search result found
// - Duration: 1500ms
// - Easing: cubic ease-in-out
// - Camera moves from current position to 25 units from target building
// - Camera target (what it looks at) moves to the building's base
// - Uses requestAnimationFrame loop with lerp for smoothness

// AIRPLANE MODE (press F):
// - OrbitControls disabled
// - Camera attaches 22 units behind + 9 units above airplane
// - Camera lerps toward target position each frame (factor 0.07)
// - camera.lookAt() called each frame toward airplane position + [0,2,0]
// - When exiting airplane mode, camera lerps back to overview position

// KEYBOARD BINDINGS:
// - W/S/A/D: pan in overview, throttle/turn in airplane
// - Q/E: pitch up/down in airplane
// - Shift: fast pan (overview) / boost (airplane)
// - F: toggle airplane mode
// - N: toggle night mode
// - Escape: close modal / exit airplane mode
// - R: toggle rank chart panel
```

## 10.3 Airplane Component (`src/components/city/Airplane.tsx`)

```typescript
// The airplane model uses ONLY BoxGeometry — no external 3D models

// AIRPLANE PARTS (all box meshes):
// Fuselage:            BoxGeometry(7, 2.2, 2.2) — white, main body
// Cockpit:             BoxGeometry(2, 1.4, 2.0) — cyan glass color, on top-front of fuselage
// Left wing:           BoxGeometry(1.2, 0.4, 9) — white, extends left
// Right wing:          BoxGeometry(1.2, 0.4, 9) — white, extends right
// Vertical tail fin:   BoxGeometry(2.2, 2.2, 0.4) — white, at tail
// Left stabilizer:     BoxGeometry(0.4, 0.3, 3.2) — white, horizontal at tail
// Right stabilizer:    BoxGeometry(0.4, 0.3, 3.2) — white, horizontal at tail
// Engine nacelle:      BoxGeometry(1.5, 1.5, 1.5) — grey, at front
// Propeller blade 1:   BoxGeometry(0.3, 4.5, 0.2) — dark grey
// Propeller blade 2:   same, rotated 90° on Z axis
// Fuselage banner:     BoxGeometry(0.1, 0.8, 3) — canvas texture: "ASHUSRIWASTAV07 AIR"

// NIGHT-ONLY ELEMENTS:
// Left wingtip light:  PointLight(red, 1.5, 8) at left wing tip
// Right wingtip light: PointLight(green, 1.5, 8) at right wing tip
// Tail strobe:         PointLight(white, 2, 5) at tail, flashes on/off every 1.5s
// Headlight:           SpotLight(white, 3) pointing forward from nose

// VAPOR TRAIL (VaporTrail.tsx — separate component):
// 25 small sphere sprites
// Each spawns at the airplane's previous position
// Fades from opacity 0.6 to 0 over 2 seconds
// Grows from scale 1 to scale 2.5 as it fades
// Uses SpriteMaterial with transparent: true

// FLIGHT PHYSICS (in useFrame with delta time):
// throttle:    0–1, controlled by W/S keys
// yaw:         controlled by A/D keys, turn rate 1.2 rad/s
// pitch:       controlled by Q/E keys, pitch rate 0.8 rad/s, clamped ±0.6 rad
// speed:       lerp from MIN_SPEED(8) to MAX_SPEED(50) based on throttle
// boost:       Shift key multiplies speed by 2
// position:    updated by velocity vector each frame
// velocity:    lerp toward (forward × speed) each frame, factor 0.04
// banking:     mesh.rotation.z = A/D banking, lerp factor 0.08
// altitude:    clamped MIN(15) to MAX(400)
// propeller:   rotation.x += delta * (8 + throttle * 22)
```

---

# CHAPTER 11 — USER DISCOVERY AND CACHING

## 11.1 SSE Consumer (`src/lib/cityStream.ts`)

```typescript
// Called in CityScene useEffect to start city population

export function connectCityStream(
  onUser: (user: GitHubUser) => void,
  onProgress: (count: number) => void,
  onComplete: () => void,
  signal: AbortSignal
): void {
  // Phase 1: Load from Firebase first (instant)
  // Phase 2: Start SSE stream for new discoveries
  // Phase 3: Cache everything to localStorage for next visit

  // CACHE: Load from localStorage immediately (sub-100ms)
  const cached = getLocalCache();
  if (cached.length > 0) {
    cached.forEach(u => onUser(u));
    onProgress(cached.length);
  }

  // SSE STREAM: Open connection to /api/github/stream
  const evtSource = new EventSource('/api/github/stream');
  
  evtSource.onmessage = (e) => {
    if (signal.aborted) { evtSource.close(); return; }
    try {
      const msg = JSON.parse(e.data);
      if (msg.type === 'user') {
        saveToLocalCache(msg.data);
        onUser(msg.data);
      }
      if (msg.type === 'progress') {
        onProgress(msg.count);
      }
      if (msg.type === 'complete') {
        onComplete();
        evtSource.close();
      }
    } catch {}
  };

  evtSource.onerror = () => {
    evtSource.close();
    onComplete();
  };

  signal.addEventListener('abort', () => evtSource.close());
}

// CACHE: Stores all discovered users with 6-hour TTL
// Key: 'mc_city_cache_v2'
// Value: { users: GitHubUser[], timestamp: number }
// On next visit, 2000+ users load in under 200ms from localStorage
function getLocalCache(): GitHubUser[] {
  try {
    const raw = localStorage.getItem('mc_city_cache_v2');
    if (!raw) return [];
    const { users, timestamp } = JSON.parse(raw);
    const SIX_HOURS = 6 * 60 * 60 * 1000;
    if (Date.now() - timestamp > SIX_HOURS) return [];
    return users;
  } catch { return []; }
}

function saveToLocalCache(user: GitHubUser): void {
  try {
    const raw = localStorage.getItem('mc_city_cache_v2');
    const existing = raw ? JSON.parse(raw) : { users: [], timestamp: Date.now() };
    const map = new Map(existing.users.map((u: GitHubUser) => [u.login, u]));
    map.set(user.login, user);
    existing.users = [...map.values()];
    localStorage.setItem('mc_city_cache_v2', JSON.stringify(existing));
  } catch {}
}
```

---

# CHAPTER 12 — UI COMPONENTS SPECIFICATION

## 12.1 Profile Modal Specification

```typescript
// Triggered by: click on any building OR click on park character
// Behavior: centered modal with dark overlay behind it
// Close: Escape key OR click X button OR click overlay

// Modal layout (top to bottom):
// 1. Developer avatar (80×80px, image-rendering: pixelated CSS)
//    Alongside: @username in large Press Start 2P font
//    Below username: real name (smaller)
//    Below real name: bio text (max 150 chars, truncated with "...")
//    Below bio: location, company, join year in small tags

// 2. Building Info section:
//    Title: "🏗️ CITY BUILDING"
//    Building type (e.g., "Tier 2 Tower" or "Legendary Skyscraper")
//    City Rank: "#14 out of 4,721 developers"
//    Height: "38 blocks (based on commits)"
//    City Slot: "#847 (permanent)"
//    Member since: "[year] ([X] years ago)"

// 3. Stats section (5 stats with pixel bars):
//    Each stat: [icon] [label] [pixel bar] [number]
//    ⚔️ Est. Commits  ████████░░  12,400
//    ⭐ Total Stars   ██████░░░░   8,200
//    📦 Repos         ████░░░░░░     87
//    👥 Followers     ████████░░  52,000
//    Language badge with hex color background
//    Activity: "🔥 Very Active" or "✅ Active" or "💤 Quiet"

// 4. Top Repos section (up to 5 cards):
//    Each card: repo name | ⭐ stars | language | description (80 chars max)
//    Card background: slightly lighter than modal background
//    Clicking a card opens the repo URL in a new tab

// 5. Footer buttons:
//    [🌐 View on GitHub] — opens https://github.com/{login} in new tab
//    [✈️ Fly to Building] — closes modal, flies camera to building
//    [✕ Close] — closes modal

// Modal border color = developer's primary language color
// Font: Press Start 2P throughout
// Background: rgba(18, 18, 28, 0.97)
```

## 12.2 Search Bar Specification

```typescript
// Position: fixed, bottom center of screen
// Appearance: dark panel with 3px gold border, Press Start 2P font

// Input field + 2 buttons: [Find] (green) and [🎲 Random] (grey)

// On search:
// STEP 1: Check Zustand store — is user already loaded in city?
//         YES → fly to their building immediately, show "Welcome back!"
// STEP 2: Check Firebase — is user in the database?
//         YES → load from Firebase, add to store, fly to building, show slot info
// STEP 3: Call /api/github/[username]
//         SUCCESS → call /api/city/add → Firebase → add to store → construction animation → fly to building
//         404 → red flash, "Developer not found on GitHub"
//         429 → "GitHub is busy — retrying in Xs" with countdown
//         ERROR → "Something went wrong — try again"

// Random button: picks random user from currently loaded city users
// and flies camera to their building

// Status messages shown below the input:
// Loading: "⏳ Mining profile data for [username]..."
// Success new: "🏗️ [username] joined the city! Slot #[N] is yours forever."
// Success existing: "✅ Welcome back [username]! City since [date]."
// Not found: "❌ GitHub user '[username]' not found."
// Rate limited: "⚠️ GitHub rate limit — retrying in [N]s"
```

## 12.3 Rank Chart Panel Specification

```typescript
// Triggered by clicking "RANKINGS" button in top nav bar
// Appears as a panel sliding in from the right (CSS transform translateX transition)
// Width: 380px, height: 100vh, position: fixed right 0
// Background: rgba(10, 10, 20, 0.97), border-left: 3px solid gold

// Header: "🏆 GITHUB CITY TOP 100" in gold Press Start 2P
// Subtitle: "Live rankings — updated every 5 min"

// Three tabs:
// [ALL TIME] [THIS WEEK] [NEWEST]
// Active tab highlighted with gold border-bottom

// Each row (100 total):
// [Rank number] [24×24 pixelated avatar] [username] [language badge] [score bar] [trend ↑↓—]
// Row height: 36px
// Alternating row background: #0a0a14 / #0f0f1e
// Hover: row background brightens, cursor: pointer
// Click: panel closes, camera flies to that building

// Rank 1 row: gold text + gold left border 4px
// Ranks 2–3: silver text
// Ranks 4–10: bronze text
// Rest: white text

// Score bar: proportional fill 0–100% relative to rank 1's score
// Trend: up arrow (green) if rank improved since last check, down (red) if dropped, dash if same

// Bottom: "Refreshes every 5 minutes • [lastUpdated timestamp]"
// [Close X] button top right
```

## 12.4 MiniMap Specification

```typescript
// Position: fixed, bottom-left corner
// Size: 180×180px
// Border: 3px solid rgba(212, 160, 23, 0.8) (gold)
// Background: rgba(5, 5, 15, 0.9)

// Drawn on a <canvas> element, redrawn every 2 seconds
// Scale: entire 725×725 world space → 180×180 pixels
//        scale factor = 180 / 725 ≈ 0.248

// What is drawn on the minimap:
// 1. Dark background
// 2. Tech Park: bright green rectangle at park world position
// 3. All buildings: 1×1 or 2×2 pixel dots
//    Color = developer's primary language color
//    Tier 1 (rank 1): bright gold, 3×3 pixels
//    Tier 2 (ranks 2–10): brighter than normal, 2×2 pixels
//    All others: 1×1 pixel
// 4. Camera viewport: white rectangle showing current visible frustum
//    Calculated by projecting camera frustum corners onto minimap
// 5. Airplane: ✈ text character at airplane's world position (when in airplane mode)
// 6. Tech Park label: tiny "TECH PARK" text

// Interaction: clicking on minimap flies camera to that world position
// Click handler: convert minimap pixel click → world position → camera.flyTo()
```

## 12.5 Tech Park Character Specification

```typescript
// ParkCharacter.tsx — Minecraft-style sitting developer

// Character parts (all box geometry, MeshLambertMaterial):
// HEAD: BoxGeometry(0.8, 0.8, 0.8), position Y=2.2
//   Material: skin color #ffcc99, hover: emissive gold
// BODY: BoxGeometry(0.7, 0.9, 0.4), position Y=1.4
//   Material: developer's language color (their building color)
// LEFT ARM: BoxGeometry(0.25, 0.7, 0.25), position X=-0.5, Y=1.5
//   Rotation: slight outward angle (conversation pose)
// RIGHT ARM: same, mirrored
// LEGS: BoxGeometry(0.3, 0.7, 0.3) EACH
//   Rotation: X = -Math.PI/2 (legs extended forward = sitting pose)
//   Position: in front of body base

// Username label (THREE.Sprite):
//   Only visible when camera is within 45 world units
//   Canvas-drawn with Press Start 2P font, dark background pill
//   Floats 1.5 units above head

// useFrame idle animation:
//   Head slowly oscillates: rotation.y = sin(time * 0.4) * 0.15
//   Every 5 seconds randomly: arm raises briefly (rotation.z animation)

// onClick: same as building click — opens ProfileModal with this dev's data
// onPointerOver: head emissive brightens, cursor: pointer
// onPointerOut: emissive resets
```

## 12.6 Live Feed Ticker Specification

```typescript
// Position: fixed, bottom of screen, full width
// Height: 28px
// Background: rgba(0, 0, 0, 0.85)
// Font: Press Start 2P 8px
// Text color: #ffdd44 (warm yellow)

// Events scroll from right to left continuously
// New events appear at the right edge
// Animation: CSS animation marquee or requestAnimationFrame scroll

// Event types and message formats:
// join:    "🏗️ [username] just joined GitHub City! Slot #[N]"
// grow:    "📈 [username]'s building grew taller! (⭐ +[N] stars)"
// rankUp:  "⬆️ [username] rose to rank #[N]!"
// search:  "🔍 Someone is looking for [username]..."

// Feed data source:
// Firebase Realtime Database listener on /live/recentEvents
// Keeps last 20 events in a ring buffer
// New events pushed from server whenever a new user joins or rank changes
```

---

# CHAPTER 13 — COMPLETE BUILD ORDER

Claude must build in this exact order. Each item must be working before starting the next.

```
PHASE 0: SETUP (must complete before any other phase)
  0.  Ask developer for Firebase config values and GitHub tokens
  0a. Create .env.local with all secrets
  0b. Run npm install commands
  0c. Verify npm run dev works at localhost:3000

PHASE 1: DATA LAYER
  1.  src/types/index.ts            — all TypeScript interfaces
  2.  src/lib/githubTokens.ts       — token rotation + headers
  3.  src/lib/firebase.ts           — Firebase singleton
  4.  src/lib/firestore.ts          — all Firestore operations

PHASE 2: API ROUTES
  5.  src/app/api/github/[username]/route.ts   — single user fetch
  6.  src/app/api/github/stream/route.ts       — SSE discovery stream
  7.  src/app/api/github/refresh/route.ts      — batch refresh
  8.  src/app/api/city/add/route.ts            — add to Firebase

PHASE 3: CITY MATH
  9.  src/lib/cityLayout.ts          — grid + spiral slot math
  10. src/lib/textureGenerator.ts    — canvas block textures + NearestFilter
  11. src/lib/buildingGeometry.ts    — mesh construction per tier
  12. src/lib/cityStore.ts           — Zustand store
  13. src/lib/cityStream.ts          — SSE consumer + localStorage cache

PHASE 4: 3D SCENE (verify each renders before moving on)
  14. src/components/city/Ground.tsx           — city ground plane
  15. src/components/city/CityScene.tsx        — R3F Canvas + lights + sky + fog
      CHECKPOINT: Open localhost:3000, confirm Canvas renders with a visible ground plane
  16. src/components/city/Building.tsx         — single building + hover + click
      CHECKPOINT: Add one test building to scene, confirm it renders with texture
  17. src/components/city/CityGrid.tsx         — renders all buildings from store
      CHECKPOINT: Add 10 test users to store, confirm 10 buildings appear side by side
  18. src/components/city/ParkCharacter.tsx    — sitting character model
  19. src/components/city/TechPark.tsx         — full park with all elements
  20. src/components/city/Airplane.tsx         — plane model + flight physics
  21. src/components/city/VaporTrail.tsx       — plane contrail
  22. src/components/city/CameraController.tsx — orbit + WASD + fly-to + airplane cam

PHASE 5: UI COMPONENTS
  23. src/components/ui/LoadingScreen.tsx      — progress overlay
  24. src/components/ui/ProfileModal.tsx       — full dev profile popup
  25. src/components/ui/SearchBar.tsx          — search + permanent slot
  26. src/components/ui/RankChart.tsx          — top 100 panel
  27. src/components/ui/MiniMap.tsx            — city overview canvas
  28. src/components/ui/TopFiveWidget.tsx      — always-visible rank 1–5
  29. src/components/ui/LiveFeed.tsx           — bottom ticker
  30. src/components/ui/AirplaneHUD.tsx        — flight instruments
  31. src/components/ui/Controls.tsx           — keyboard hints panel
  32. src/components/ui/HUD.tsx               — assemble all UI

PHASE 6: PAGES
  33. src/app/globals.css           — Tailwind + Minecraft CSS variables
  34. src/app/layout.tsx            — Press Start 2P font + metadata
  35. src/app/page.tsx              — final assembly with dynamic import

PHASE 7: INTEGRATION
  36. Wire CityScene useEffect → cityStream.connectCityStream
  37. Wire Firebase subscribeToNewUsers → Zustand addUser
  38. Wire Realtime DB listener → LiveFeed events
  39. Wire SearchBar → /api/github/[username] → /api/city/add → flyToUser
  40. Wire RankChart → Firestore getTop100
  41. Wire MiniMap → Zustand users map

PHASE 8: POLISH
  42. Day/night transition (3-second smooth lerp on all light values)
  43. Building hover glow (emissiveIntensity lerp in useFrame)
  44. Building spawn animation (height grows from 0 to target over 800ms)
  45. Building update animation (height lerps to new value when stats refresh)
  46. Auto-refresh loop (every 5 minutes, refresh 50 most active users)
  47. LOD system (3 detail levels at 80/200/400 units)
  48. Performance audit (target 60fps with 5000 buildings)
  49. Mobile touch controls
  50. Final visual pass
```

---

# CHAPTER 14 — HARD RULES (NEVER VIOLATE)

```
RENDERING:
1. THREE.NearestFilter on EVERY texture — this is what makes it look Minecraft
2. MeshLambertMaterial everywhere — flat shading = Minecraft + 3× faster than Standard
3. antialias: false on WebGLRenderer — pixelated = Minecraft aesthetic

NEXT.JS:
4. 'use client' directive on EVERY file that uses Three.js, R3F, or browser APIs
5. CityScene in page.tsx MUST be: dynamic(() => import(...), { ssr: false })
6. Canvas div MUST have: style={{ width: '100vw', height: '100vh' }}

LIGHTING:
7. Scene MUST have <ambientLight> AND <directionalLight>
8. Without both lights, MeshLambertMaterial renders pure black = invisible buildings

FIREBASE:
9. citySlot is set ONCE and NEVER updated — it is the developer's permanent city address
10. All Firestore writes go through /api/city/ routes — never write directly from browser
11. All reads use Firestore composite indexes — never use unindexed queries

GITHUB:
12. Token rotation must be used on EVERY API call — never call GitHub API without rotating
13. All GitHub usernames stored in Firebase must be lowercase
14. NO hardcoded GitHub usernames anywhere in the codebase

THREE.JS:
15. Every building Group MUST have userData.login and userData.user set for raycasting
16. Raycasting click handler MUST walk up .parent chain to find Group with userData
17. InstancedMesh instanceMatrix.needsUpdate = true must be called after every matrix set
18. dispose() geometries and materials in useEffect cleanup to prevent memory leaks

BRANDING:
19. "Built by Ashusriwastav07" with link to github.com/Ashusriwastav07 must always be visible
20. This credit cannot be conditional or hidden by any UI state

PERFORMANCE:
21. Never create new THREE.BoxGeometry inside useFrame — geometries must be created once
22. Never create new THREE.MeshLambertMaterial inside useFrame — materials must be memoized
23. Never call createBlockTexture more than once per unique (language + windowLitRatio) combination
```

---

# CHAPTER 15 — FIRST MESSAGE TO CLAUDE OPUS 4.6

Copy and paste this exactly:

---

*Read this entire TRD document completely before writing any code. Do not skip any section.*

*Before writing a single line of code, ask me for:*
*1. My Firebase project config (API key, auth domain, project ID, storage bucket, messaging sender ID, app ID, database URL)*
*2. My three GitHub Personal Access Tokens*

*Once I provide those, create the .env.local file first. Then follow the build order in Chapter 13 exactly — complete and verify each numbered step before moving to the next one.*

*At step 15 (CityScene), stop and tell me the canvas is rendering before continuing. At step 17 (CityGrid with test users), stop and confirm buildings are visible before continuing.*

*Every building must use MeshLambertMaterial with NearestFilter textures. The city must never have empty space — every grid slot is filled. The city grows from center outward as more users are discovered.*

*The developer credit "Built by Ashusriwastav07 | github.com/Ashusriwastav07" must be present in the UI from step 33 onward.*

---