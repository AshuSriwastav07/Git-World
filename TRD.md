# GIT WORLD – TECHNICAL REQUIREMENTS DOCUMENT (TRD)
## Complete Architecture & Implementation Specification
### Version 3.0 (Code-Accurate) | Next.js 16 + React 19 + Three.js + Supabase | Creator: Ashusriwastav07

---

# EXECUTIVE SUMMARY

**Git World** uses a client-rendered 3D architecture with real-time data synchronization. Frontend: Next.js 16 with React Three Fiber for 3D rendering and Zustand for state. Backend: Supabase PostgreSQL for persistence, GitHub API for data, Vercel cron for daily jobs. All buildings render via InstancedMesh (2 GPU draw calls). Supabase realtime subscriptions push new users to all connected clients instantly.

**Core Facts:**
- Memory cap: 10,000 users (Zustand enforces)
- Building height formula: Rank + commit logarithmic factor
- Window texture: Procedurally generated, cached by stats bucket
- City grid: Spiral layout, 140×140 slots, SLOT_PITCH=5.0
- Three.js: InstancedMesh for main buildings, separate geometries for parks/trending
- GitHub API: 28 parallel searches, 5000/hr per token × 3 = 15K/hr capacity

---

# 1. TECH STACK & DEPENDENCIES

## 1.1  Frontend Dependencies

```json
{
  "dependencies": {
    "@react-three/drei": "^10.7.7",
    "@react-three/fiber": "^9.5.0",
    "@supabase/supabase-js": "^2.98.0",
    "next": "16.1.6",
    "react": "19.2.3",
    "react-dom": "19.2.3",
    "three": "^0.183.2",
    "zustand": "^5.0.11"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "@types/three": "^0.183.1",
    "eslint": "^9",
    "eslint-config-next": "16.1.6",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
```

### Key Versions:
- **Next.js 16.1.6**: App Router, API routes, server-side features
- **React 19.2.3**: New hooks, concurrent features
- **React Three Fiber 9.5.0**: React bindings for Three.js, Canvas, useFrame, useThree
- **Drei 10.7.7**: Sky, Stars, OrbitControls, Html, AdaptiveDpr, SceneErrorBoundary
- **Three.js 0.183.2**: 3D graphics, materials, geometry, InstancedMesh
- **Zustand 5.0.11**: Lightweight state management, no boilerplate
- **@supabase/supabase-js 2.98.0**: PostgreSQL client + realtime subscriptions
- **TypeScript 5**: Strict mode enabled
- **Tailwind CSS 4**: Utility styling

## 1.2 Fonts
- **Press Start 2P**: Pixel-art aesthetic (header, titles, UI text)
- **Space Mono**: Monospace (body text, code-like UI)

---

# 2. REPOSITORY STRUCTURE

```
minecraft-gitcity/
├── app/
│   ├── api/
│   │   ├── city/
│   │   │   ├── add/route.ts           # POST: Add/update user
│   │   │   └── users/route.ts         # GET: Paginated city users
│   │   ├── cron/
│   │   │   └── recalculate-ranks/route.ts  # GET: Recalc ranks daily
│   │   ├── daily-refresh/route.ts     # GET: Combined cron
│   │   ├── github/
│   │   │   ├── [username]/route.ts    # GET: Single user profile
│   │   │   └── stream/route.ts        # GET: SSE discovery
│   │   ├── silicon-valley/
│   │   │   ├── contributors/route.ts  # GET: Company/language devs
│   │   │   ├── refresh/route.ts       # POST: Refresh SV data
│   │   │   └── seed/route.ts          # POST: Seed SV data
│   │   └── trending/
│   │       ├── refresh/route.ts       # POST: Refresh trending repos
│   │       └── route.ts               # GET: Active trending repos
│   ├── page.tsx                       # Root page, orchestrates loading
│   ├── layout.tsx                     # <html>, fonts, OG tags
│   └── globals.css                    # Tailwind + reset
├── components/
│   ├── city/
│   │   ├── Building.tsx               # Single building mesh
│   │   ├── BuildingSpotlight.tsx      # God ray effect
│   │   ├── CameraController.tsx       # Orbit + keyboard controls
│   │   ├── CityGrid.tsx               # InstancedMesh for all buildings
│   │   ├── CityGround.tsx             # Minecraft grass plane
│   │   ├── CityScene.tsx              # Canvas wrapper, scene setup
│   │   ├── GodRaySpotlight.tsx        # Blue spotlight, pulsing halo
│   │   ├── ParkCharacter.tsx          # Tech Park character (stub)
│   │   ├── PocketPark.tsx             # Tech Park (stub)
│   │   ├── PromoBannerPlanes.tsx      # Flying banners
│   │   ├── SceneErrorBoundary.tsx     # 3D error boundary
│   │   ├── SiliconValleyPark.tsx      # SV Park container
│   │   ├── TechPark.tsx               # Tech Park container (stub)
│   │   ├── TrendingDistrict.tsx       # Trending repos district
│   │   ├── WindowSparkleLayer.tsx     # Glitter effect (optional)
│   │   ├── airplane/
│   │   │   ├── Airplane.tsx           # Plane mesh
│   │   │   ├── AirplaneMode.tsx       # Flight system
│   │   │   └── FlightCamera.ts        # 3rd-person camera logic
│   │   └── svpark/
│   │       ├── AppleQuadrant.tsx      # Apple campus
│   │       ├── BurjKhalifaTower.tsx   # Central tower
│   │       ├── FlyingBanners.tsx      # Orbiting banners
│   │       ├── GoogleQuadrant.tsx     # Google campus
│   │       ├── LanguageDistrict.tsx   # Language zones (8)
│   │       ├── LanguageMonument.tsx   # Language marker
│   │       ├── MetaQuadrant.tsx       # Meta campus
│   │       └── NvidiaQuadrant.tsx     # NVIDIA campus
│   ├── intro/
│   │   └── CinematicIntro.tsx         # 25s intro sequence
│   └── ui/
│       ├── AirplaneHUD.tsx            # Flight HUD
│       ├── Controls.tsx               # Keyboard help modal
│       ├── GitHubStars.tsx            # Star count widget
│       ├── GitWorldLogo.tsx           # Logo component
│       ├── HUD.tsx                    # Main HUD wrapper
│       ├── IntroButtons.tsx           # Intro button row
│       ├── IntroOverlay.tsx           # Intro background
│       ├── JoinToast.tsx              # New user notification
│       ├── LiveFeed.tsx               # Event ticker
│       ├── LoadingScreen.tsx          # Loading bar overlay
│       ├── MiniMap.tsx                # Overhead view
│       ├── ModeMenu.tsx               # 5-way mode selector
│       ├── ProfileModal.tsx           # Developer profile card
│       ├── RankChart.tsx              # Top 100 leaderboard table
│       ├── RepoProfilePanel.tsx       # Trending repo details
│       ├── SearchBar.tsx              # GitHub username search
│       └── TopFiveWidget.tsx          # Top 5 mini leaderboard
├── lib/
│   ├── buildingGeometry.ts            # Mesh specs for building parts
│   ├── cityLayout.ts                  # Slot→world mapping, building dimensions
│   ├── cityStore.ts                   # Zustand store (central state)
│   ├── cityStream.ts                  # SSE stream consumer
│   ├── githubTokens.ts                # Token rotation logic
│   ├── supabase.ts                    # Supabase client config
│   ├── supabaseDb.ts                  # Database query functions
│   ├── textureGenerator.ts            # Window texture generation
│   └── trendingStore.ts               # Zustand trending repos store
├── supabase/
│   └── migrations/
│       ├── 001_sv_data_fix.sql        # SV park schema
│       ├── 002_sv_source_column.sql   # Language devs schema
│       └── 20260308_trending_repos.sql # Trending repos schema
├── public/
│   ├── favicon.png
│   └── Logo.png
├── .env.local                         # Secrets (not in repo)
├── eslint.config.mjs
├── next.config.ts                     # Next.js config
├── package.json
├── postcss.config.mjs
├── tsconfig.json
├── tsconfig.tsbuildinfo
├── vercel.json                        # Cron job definitions
├── PRD.md                             # Product requirements (v3.0)
├── TRD.md                             # Technical requirements (v3.0)
├── README.md                          # User-facing overview
└── CONTRIBUTING.md                    # Dev guidelines
```

---

# 3. SUPABASE SCHEMA (PostgreSQL)

## 3.1 city_users Table

**Primary table:** All developer profiles and city rankings.

```sql
CREATE TABLE public.city_users (
  login TEXT PRIMARY KEY,
  name TEXT,
  avatar_url TEXT,
  bio TEXT,
  location TEXT,
  company TEXT,
  github_created_at TEXT,
  public_repos INTEGER DEFAULT 0,
  followers INTEGER DEFAULT 0,
  following INTEGER DEFAULT 0,
  total_stars INTEGER DEFAULT 0,
  total_forks INTEGER DEFAULT 0,
  top_language TEXT DEFAULT 'Unknown',
  estimated_commits INTEGER DEFAULT 0,
  recent_activity INTEGER DEFAULT 0,
  total_score FLOAT DEFAULT 0,
  top_repos JSONB DEFAULT '[]',
  city_slot INTEGER UNIQUE,
  city_rank INTEGER,
  first_added_at TIMESTAMPTZ DEFAULT now(),
  last_updated_at TIMESTAMPTZ DEFAULT now(),
  added_by TEXT DEFAULT 'discovery'
);

CREATE INDEX idx_city_users_rank ON public.city_users(city_rank ASC);
CREATE INDEX idx_city_users_score ON public.city_users(total_score DESC);
CREATE INDEX idx_city_users_activity ON public.city_users(recent_activity DESC);
CREATE INDEX idx_city_users_lang ON public.city_users(top_language);
```

**Key Fields:**
- **login**: GitHub username, primary key, case-insensitive search via ILIKE
- **total_score**: Computed formula (commits×3 + stars×2 + followers + repos×0.5 + activity×10)
- **estimated_commits**: Heuristic from public_repos + followers
- **recent_activity**: 0-100 scale based on activity
- **top_repos**: JSONB array [{name, stars, forks, language, description, url}, ...]
- **city_slot**: Permanent slot number (never reassigned)
- **city_rank**: Position in sorted leaderboard (recalculated daily)

**RLS Policies:** Public read (anon + authenticated), no write from public.

## 3.2 trending_repos Table

**Trending repositories:** Top 20 weekly repos.

```sql
CREATE TABLE public.trending_repos (
  id SERIAL PRIMARY KEY,
  repo_full_name TEXT NOT NULL UNIQUE,
  owner_login TEXT NOT NULL,
  owner_type TEXT NOT NULL DEFAULT 'User',
  repo_name TEXT NOT NULL,
  description TEXT,
  primary_language TEXT DEFAULT 'Unknown',
  total_stars INTEGER DEFAULT 0,
  weekly_stars INTEGER DEFAULT 0,
  forks INTEGER DEFAULT 0,
  open_issues INTEGER DEFAULT 0,
  watchers INTEGER DEFAULT 0,
  github_url TEXT NOT NULL,
  homepage_url TEXT,
  topics TEXT[] DEFAULT '{}',
  daily_stars JSONB DEFAULT '[]',
  top_contributors JSONB DEFAULT '[]',
  trending_rank INTEGER NOT NULL,
  district_slot INTEGER NOT NULL,
  building_height FLOAT DEFAULT 8,
  building_width FLOAT DEFAULT 2,
  last_refreshed TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);

CREATE UNIQUE INDEX idx_trending_rank ON public.trending_repos(trending_rank) WHERE is_active = true;
CREATE INDEX idx_trending_active ON public.trending_repos(is_active, trending_rank);
```

**Key Fields:**
- **repo_full_name**: "owner/repo", unique key
- **trending_rank**: 1-20 position
- **weekly_stars**: Stars earned in past 7 days
- **top_contributors**: JSONB [{login, avatarUrl, contributions, city_rank}, ...]
- **daily_stars**: JSONB [{date, count}, ...] for last 7 days
- **is_active**: Boolean, false = dropped off trending

**RLS Policies:** Public read only.

## 3.3 sv_contributors Table

**Silicon Valley Park contributor mapping.**

```sql
CREATE TABLE public.sv_contributors (
  login TEXT PRIMARY KEY REFERENCES city_users(login) ON DELETE CASCADE,
  company TEXT NOT NULL CHECK (company IN ('apple','google','nvidia','meta')),
  contributions INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sv_contributors_company ON public.sv_contributors(company);
```

**Key Fields:**
- **login**: Foreign key to city_users
- **company**: One of 4 tech companies
- **contributions**: Commit count (heuristic or actual)

## 3.4 sv_language_devs Table

**Silicon Valley Park language district mapping.**

```sql
CREATE TABLE public.sv_language_devs (
  login TEXT PRIMARY KEY REFERENCES city_users(login) ON DELETE CASCADE,
  language TEXT NOT NULL,
  contributions INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sv_language_devs_language ON public.sv_language_devs(language);
```

**Key Fields:**
- **login**: Foreign key to city_users
- **language**: Programming language name
- **contributions**: Heuristic metric

## 3.5 Views

**sv_contributors_full**: Join cv_contributors + city_users (read API)
**sv_language_devs_full**: Join sv_language_devs + city_users (read API)

---

# 4. ZUSTAND STORES

## 4.1 cityStore (lib/cityStore.ts)

**Central state management for app.**

```typescript
type ActiveMode = 'menu' | 'explore' | 'fly' | 'trending' | 'search' | 'leaderboard';

interface CityStoreState {
  // User data
  users: Map<string, SlimUser>;
  sortedLogins: string[];

  // UI state
  isNight: boolean;
  isAirplaneMode: boolean;  // Legacy, may be deprecated
  isRankChartOpen: boolean;
  selectedUser: SlimUser | null;
  activeMode: ActiveMode;
  flyTarget: {x: number; y: number; z: number} | null;

  // Loading state
  isLoading: boolean;
  loadingProgress: number;  // 0..1
  loadingMessage: string;

  // Intro stage
  introStage: 'loading' | 'cinematic' | 'title' | 'buttons' | 'done';
  introStartTime: number;    // ms timestamp
  introProgress: number;     // 0..1
  userInteracted: boolean;   // Disables auto-rotate

  // Flight
  flightMode: boolean;

  // Actions
  addUser(user: SlimUser): void;
  addUsers(users: SlimUser[]): void;
  updateUser(user: SlimUser): void;
  selectUser(user: SlimUser | null): void;
  toggleNight(): void;
  toggleAirplaneMode(): void;
  setRankChartOpen(open: boolean): void;
  setLoading(loading: boolean): void;
  setLoadingProgress(progress: number, message?: string): void;
  setFlyTarget(target: {x: number; y: number; z: number} | null): void;
  getUserByLogin(login: string): SlimUser | undefined;
  getTopUsers(count: number): SlimUser[];
  getRandomUser(): SlimUser | undefined;
  setIntroStage(stage: ...): void;
  setIntroStartTime(time: number): void;
  setIntroProgress(progress: number): void;
  setUserInteracted(): void;
  setActiveMode(mode: ActiveMode): void;
  setFlightMode(active: boolean): void;
}
```

**Key Implementation Details:**
- `users` Map capped at 10,000 (enforced in `addUsers()` action)
- `addUser()` buffers in `pendingBuffer`, flushed every 2000ms (BATCH_MS)
- `sortedLogins` computed from `users` Map (sorted by totalScore DESC)
- During loading, sorted list not recomputed (expensive operation deferred until `setLoading(false)`)
- `selectUser()` calculates `flyTarget` position using `slotToWorld()` + `getBuildingDimensions()`

## 4.2 trendingStore (lib/trendingStore.ts)

**Trending repos state.**

```typescript
interface TrendingRepo {
  id: number;
  repo_full_name: string;
  owner_login: string;
  owner_type: string;
  repo_name: string;
  description: string;
  primary_language: string;
  total_stars: number;
  weekly_stars: number;
  forks: number;
  open_issues: number;
  watchers: number;
  github_url: string;
  homepage_url?: string;
  topics: string[];
  daily_stars: {date: string; count: number}[];
  top_contributors: {login: string; avatarUrl: string; contributions: number; city_rank: number}[];
  trending_rank: number; // 1-20
  district_slot: number;
  building_height: number;
  building_width: number;
  last_refreshed: string; // datetime
  is_active: boolean;
}

interface TrendingStoreState {
  trendingRepos: TrendingRepo[];
  selectedRepo: TrendingRepo | null;
  repoPanelOpen: boolean;

  setTrendingRepos(repos: TrendingRepo[]): void;
  selectRepo(repo: TrendingRepo | null): void;
  closeRepoPanel(): void;
}
```

**Usage:**
- Fetched from `/api/trending` GET (cached 3600s server-side, 1800s stale-while-revalidate)
- Updated weekly Monday UTC via `/api/trending/refresh` cron

---

# 5. API ROUTES

## 5.1 /api/github/stream (GET, SSE)

**Server-Sent Events discovery stream. Finds new devs via 28 parallel GitHub API searches.**

**Duration:** 5 minutes (STREAM_MAX_MS = 5×60×1000)

**Search Queries (28 total):**
- Followers brackets: >100k, 50k-100k, 20k-50k, 10k-20k, 5k-10k, 2k-5k, 1k-2k, 500-1k, 200-500, 100-200
- Languages: JavaScript, TypeScript, Python, Rust, Go, Ruby, Java, C++, C#, Swift, Kotlin, PHP, Shell, HTML, Vue, Dart
- Activity: repos>200, repos>100, recent pushes, rising stars

**Per User Found:**
1. GET `/users/{login}` (profile)
2. GET `/users/{login}/repos` (top repos)
3. GET `/users/{login}/events/public` (recent activity)
4. Compute: totalScore, topLanguage, topRepos, estimatedCommits
5. POST `/api/city/add` (upsert into city_users)
6. Emit SSE: `data: {user JSON}\n\n`

**Token Rotation:** 3 PATs, cycle through, respect Rate-Limit headers

## 5.2 /api/github/[username] (GET)

**Single user profile endpoint. Callable from SearchBar.**

**Response:**
```json
{
  "login": "ashusriwastav07",
  "name": "Ashus Riwastav",
  "avatarUrl": "https://...",
  "bio": "...",
  "location": "...",
  "company": "...",
  "publicRepos": 42,
  "followers": 1234,
  "following": 56,
  "totalStars": 5678,
  "totalForks": 89,
  "topLanguage": "TypeScript",
  "estimatedCommits": 12345,
  "recentActivity": 75,
  "totalScore": 67890.5,
  "topRepos": [{name, stars, forks, language, description, url}, ...]
}
```

**Rate Limiting:** Token rotation, 5000 req/hr per token

## 5.3 /api/city/add (POST)

**Add or update user in city_users. Called by SearchBar or discovery stream.**

**Request Body:**
```json
{
  "login": "username",
  "name": "Full Name",
  "avatarUrl": "https://...",
  ... (all CityUser fields),
  "addedBy": "search" | "discovery"
}
```

**Response:**
```json
{
  "user": {
    "login": "username",
    "citySlot": 42,
    "cityRank": 1234,
    ... (SlimUser fields)
  }
}
```

**Process:**
1. Upsert into city_users (INSERT ON CONFLICT UPDATE)
2. Calculate citySlot if new (next available spiral slot)
3. Calculate cityRank via `recalculateRanks()` (expensive, deferred to cron)
4. Return SlimUser for immediate rendering

## 5.4 /api/silicon-valley/contributors (GET)

**SV park contributors (companies + languages).**

**Response:**
```json
{
  "companies": {
    "apple": [{login, avatarUrl, topLanguage, citySlot, cityRank, totalScore, ...}, ...],
    "google": [...],
    "nvidia": [...],
    "meta": [...]
  },
  "languages": {
    "python": [{...}, ...],
    "javascript": [...],
    ... (8 languages)
  }
}
```

**Caching:** Cached in-memory or Supabase view query

## 5.5 /api/silicon-valley/refresh (POST)

**Refresh SV park data (company + language contributor lists).**

**Trigger:** Daily cron job (19:30 UTC)

**Process:**
1. Query GitHub for each company's top open-source contributors
2. Fetch their profiles, compute stats
3. Upsert into sv_contributors table
4. Query city_users by top_language, upsert into sv_language_devs
5. Return {updatedCompanies, updatedLanguages, timestamp}

## 5.6 /api/trending (GET)

**Active trending repos (top 20, cached).**

**Response:**
```json
{
  "repos": [
    {
      "id": 1,
      "repo_full_name": "vercel/next.js",
      "trending_rank": 1,
      "primary_language": "TypeScript",
      "weekly_stars": 500,
      "building_height": 72,
      ... (all TrendingRepo fields)
    },
    ... (20 repos)
  ]
}
```

**Caching:** 3600s server-side cache, 1800s stale-while-revalidate

## 5.7 /api/trending/refresh (POST)

**Refresh trending repos list.**

**Trigger:** Weekly Monday UTC, or manually by admin

**6-Phase Process:**
1. Search GitHub for repos created <30 days, stars>50, not fork/archived
2. Filter: Has description, not spam names (test, demo, example, etc.)
3. Fetch contributors, weekly commit activity
4. Top 20 by weekly stars gain
5. Calculate building_height via RANK_HEIGHTS array
6. Upsert into trending_repos, mark old repos is_active=false

**Response:** {phase1Results, phase2Results, ..., success, timestamp}

## 5.8 /api/cron/recalculate-ranks (GET)

**Recalculate city_rank for all users.**

**Trigger:** Daily 19:45 UTC

**Process:**
1. SELECT * FROM city_users (all users)
2. Sort by total_score DESC
3. UPDATE city_rank = position for each user
4. Return {success, updatedCount, averageRank, runtime_seconds}

**Duration:** 10-30s depending on city size

## 5.9 /api/daily-refresh (GET)

**Combined cron endpoint (SV refresh + Trending refresh + Rank recalc).**

**Trigger:** Daily 19:30 UTC (main endpoint)

**Process:**
1. Call /api/silicon-valley/refresh
2. Call /api/trending/refresh
3. Call /api/cron/recalculate-ranks
4. Return {results: {svRefresh, trendingRefresh, rankRecalc}, success}

---

# 6. AUTHENTICATION & AUTHORIZATION

**No user authentication required.** App is public, anonymous access via Supabase.

**Row-Level Security (RLS):**
- city_users: Public read (SELECT * allowed for anon), no public write
- trending_repos: Public read only
- sv_contributors: Public read only
- sv_language_devs: Public read only

**GitHub API:**
- Token rotation (3 PATs, cycling)
- No specific user association (stateless, read-only)

---

# 7. CLIENT STATE MANAGEMENT (Zustand)

## Data Flow:

```
page.tsx (entry point)
  ↓
loadSlimCity() [Supabase query, batched]
  ↓
addUsers() [buffered, flushed every 2s]
  ↓
useCityStore.users Map [capped 10K]
  ↓
CityGrid / Building components [render via InstancedMesh]
```

## Real-Time Updates:

```
subscribeToNewUsers() [Supabase realtime]
  ↓
onInsert event [user inserted in Supabase]
  ↓
addUser() callback [buffered]
  ↓
CityGrid re-renders [new building appears]
```

## Batching:

- `addUser()` pushes SlimUser to `pendingBuffer`
- `flushTimer` set if not already pending
- After 2000ms: `flushPending()` → `addUsers(batch)` → Zustand setState
- Batching reduces rendered updates, improves performance

---

# 8. 3D RENDERING (Three.js, React Three Fiber)

## Scene Structure (CityScene.tsx)

```
Canvas
├── Lights
│   ├── ambientLight (day: white 1.1, night: blue 0.8)
│   ├── directionalLight (day: warm 3.0, night: cool 1.8)
│   └── pointLights (streets, campuses)
├── Sky
│   ├── Sky component (day) [sunny, warm]
│   └── Stars + fog (night) [1500 stars, navy background]
├── CityGrid [InstancedMesh for all buildings]
├── TechPark
├── SiliconValleyPark
├── TrendingDistrict
├── AirplaneMode (if flightMode=true)
├── GodRaySpotlight [selected building glow]
└── CameraController [orbital or flight]
```

## InstancedMesh (CityGrid.tsx)

**Main renderinmg approach for 5,000+ buildings.**

**Benefits:**
- Single draw call for all buildings
- GPU instancing (massive performance gain)
- One material, multiple transforms

**Constraints:**
- Must use same geometry for all instances
- Transforms applied via `updateMatrix()` per frame
- MAX_BUILDINGS = 8000 (buffer capacity)
- If >8000 loaders, some omitted from render (fallback)

**Implementation:**
```typescript
const instancedMeshRef = useRef<THREE.InstancedMesh>(null);

useFrame(() => {
  for (let i = 0; i < userCount; i++) {
    const user = users[i];
    const pos = slotToWorld(user.citySlot);
    const dims = getBuildingDimensions(user.cityRank, user.citySlot, user);
    
    position.set(pos.x, dims.height / 2, pos.z);
    quaternion.identity();
    scale.set(dims.width, dims.height, dims.depth);
    const m = new Matrix4().compose(position, quaternion, scale);
    
    instancedMeshRef.current.setMatrixAt(i, m);
  }
  instancedMeshRef.current.instanceMatrix.needsUpdate = true;
});
```

## Textures (textureGenerator.ts)

**Window texture generation (per-building).**

**Canvas:** 32×32 pixels
**Content:** Grid of 6×6 windows
**Colors:**
- Lit windows: 45% language-colored, 55% random accent palette
- Unlit windows: Colored darkness (accent at 15-25% opacity)
- Accent palette: 24 vibrant colors (red, green, yellow, pink, cyan, etc.)

**Dynamic Properties:**
- **litRatio**: Varies by night (92-94%) vs day (82-85%)
- **Increase by**: totalStars/3000 × 6%, recentActivity/100 × 8%
- **Unlit window tint**: Random accent color from ACCENT_POOL

**Caching Key:** `{langColor}_{starBucket}_{activityBucket}_{isNight}`
- Star buckets: 0-8 (every 500 stars)
- Activity buckets: 0-5 (every 20 activity points)
- Max 8×5×2 = 80 unique cached textures per language

**Material:**
- MeshLambertMaterial (diffuse shading)
- magFilter/minFilter: NearestFilter (pixel art aesthetic)
- Emissive: language-colored (night only, intensity 0.2)
- Emissive: black (day, intensity 0)

---

# 9. CITY LAYOUT & BUILDING DIMENSIONS

## Spiral Grid System (lib/cityLayout.ts)

**Slot Mapping:**

```typescript
function spiralCoords(slot: number): [number, number] {
  // Ulam spiral: starting from center, spiraling outward
  // slot 0 → (0, 0)
  // slot 1 → (1, 0)
  // slot 2 → (1, 1)
  // ... spiraling in square rings
}

function slotToWorld(slot: number): {x: number; z: number} {
  // 1. Get spiral grid coordinates
  const [gx, gz] = spiralCoords(slot);
  // 2. Scale by SLOT_PITCH = 5.0
  const wx = gx * SLOT_PITCH;
  const wz = gz * SLOT_PITCH;
  // 3. Check if inside park, skip if needed
  if (!isInsidePark(wx, wz)) {
    return {x: wx, z: wz};
  }
  // 4. Return next valid position (cached spiral iterator)
}
```

**Park-Aware Positioning:**
- _validWorldPos cache: array of positions outside parks
- _validPosProbe iterator: scans spiral until N valid positions found
- Ensures buildings never render inside Tech Park or SV Park zones

**Constants:**
- SLOT_PITCH = 5.0 (spacing between slots in world units)
- BUILDING_SIZE = 3.0 (base footprint scale)
- GAP = 2.0 (space between adjacent buildings)
- GRID_SIZE = 145 (max grid dimension)

## Building Dimensions Formula

```typescript
function getBuildingDimensions(
  rank: number,
  slot: number,
  user: {estimatedCommits, publicRepos, totalStars}
) {
  // Deterministic randomness per slot
  const r1 = sr(slot × 7 + 1);  // repeatable "random" values
  const r2 = sr(slot × 13 + 2);
  const r3 = sr(slot × 17 + 3);

  // Commit factor (logarithmic scale)
  const commits = user.estimatedCommits || 100;
  const logFactor = Math.log10(Math.max(commits, 10)) / Math.log10(50000);
  
  if (rank === 1) {
    // Rank #1 special: always tall with crown
    return {height: 78, width: 2.4, depth: 2.4, tier: 1};
  } else if (rank <= 10) {
    // Tier 2: towers with setbacks
    height = Math.round(38 + r1 × 18 + logFactor × 5);
    width = 1.7 + r2 × 0.7;
    depth = 1.6 + r3 × 0.7;
    return {height, width, depth, tier: 2};
  } else if (rank <= 200) {
    // Tier 3: tall buildings
    height = Math.round(14 + r1 × 16 + logFactor × 6);
    ... (similar pattern)
  } else if (rank <= 5000) {
    // Tier 4: medium buildings
    ... (similar)
  } else {
    // Tier 5: tiny filler buildings
    height = Math.round(2 + r1 × 3);
    ... (minimal variation)
  }
}

// Deterministic pseudo-random function
function sr(seed: number): number {
  let h = (seed × 2654435761) >>> 0;  // FNV-1a hash constants
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 0xffffffff;  // normalized to [0, 1)
}
```

**Key Points:**
- Width increases with publicRepos (0.7-2.5 clamped)
- Depth increases with publicRepos/followers ratio
- Height increases with estimatedCommits (logarithmic)
- Randomness per slot ensures visual variety even for same rank
- Tier 1 always 78u, serves as visual anchor
- Randomness is deterministic (same slot always produces same building)

---

# 10. PERFORMANCE OPTIMIZATIONS

## Memory Management

**Zustand Store Capping:**
- Hard limit: 10,000 users in `users` Map
- When exceeded, lowest-scoring 7,000 removed (keep top 10K)
- Enforced in `addUsers()` action

**Batching:**
- `addUser()` calls buffered for 2000ms
- Reduces Zustand listeners triggered per update
- Single `setState()` call instead of many

**Texture Caching:**
-  Textures cached by stats bucket, not per-developer
- Reused across buildings with same star/activity range
- Reduces GPU texture memory

## Rendering Optimizations

**InstancedMesh:**
- Single draw call for 5,000+ buildings
- ~2 GPU calls total (buildings + glow in separate passes)
- vs. default: 5,000+ draw calls (massive perf win)

**AdaptiveDpr:**
- Scales render resolution on mobile (devicePixelRatio adaptation)
- Maintains 60fps on lower-end tablets/phones

**Pixel Aesthetic:**
- CanvasTextures use NearestFilter (no subpixel blending)
- Lower texture memory, crisper appearance
- Reduces shader complexity

**OrbitControls:**
- Damping (0.02) for smooth inertia
- Auto-rotate disabled on user interaction
- Prevents unnecessary frame updates

**useFrame Ref State:**
- Airplane physics uses refs (not React state)
- Zero GC pressure during 60fps render loop
- Pre-allocated Vector3/Quaternion/Euler objects (reused every frame)

---

# 11. ENVIRONMENT VARIABLES

**.env.local (git-ignored, not in repo):**

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://...supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# GitHub API (3 PATs for token rotation)
GITHUB_TOKEN_1=ghp_...
GITHUB_TOKEN_2=ghp_...
GITHUB_TOKEN_3=ghp_...

# Vercel Cron (secret bearer token)
CRON_SECRET=your-secret-token-here

# Optional: Analytics, logging
NEXT_PUBLIC_GA_ID=G_...
```

**Used In:**
- /lib/supabase.ts: SUPABASE_URL, SUPABASE_ANON_KEY
- /lib/githubTokens.ts: GITHUB_TOKEN_1/2/3
- /app/api/daily-refresh/route.ts: CRON_SECRET

---

# 12. DEPLOYMENT & CRON JOBS

## Vercel Configuration (vercel.json)

```json
{
  "crons": [
    {
      "path": "/api/daily-refresh",
      "schedule": "30 19 * * *"
    },
    {
      "path": "/api/cron/sv-refresh",
      "schedule": "30 19 * * *"
    },
    {
      "path": "/api/cron/recalculate-ranks",
      "schedule": "45 19 * * *"
    }
  ]
}
```

**Cron Jobs:**

| Job | Schedule | Duration | Purpose |
|-----|----------|----------|---------|
| /api/daily-refresh | 19:30 UTC | 30-60s | Combined: SV refresh + trending + ranks |
| /api/cron/sv-refresh | 19:30 UTC (alt) | 15-30s | Refresh SV park contributors |
| /api/cron/recalculate-ranks | 19:45 UTC | 10-30s | Recalc leaderboard positions |

**Auth:** Bearer {CRON_SECRET} token required (checked in route handlers)

---

# 13. BUILD & RUN COMMANDS

```bash
# Install dependencies
npm install

# Development server (hot reload)
npm run dev
# Runs on http://localhost:3000

# Build for production
npm run build

# Start production server
npm start

# Linting
npm run lint
```

---

# 14. KNOWN LIMITATIONS & TECHNICAL DEBT

### Not Implemented:
- Tech Park animated characters (stub component only)
- Sound/audio (all placeholders)
- Mobile touch controls (keyboard only)
- Service worker / offline mode
- User authentication / custom profiles
- Comment system on developers
- Achievements / badges
- Private city instances
- API input validation / error handling

### Technical Debt:
- Magic numbers hardcoded throughout (SLOT_PITCH, MAX_BUILDINGS, PITCH_RATE)
- Minimal error boundaries (SceneErrorBoundary for 3D only, no root boundary)
- No logging/telemetry (difficult to debug production issues)
- Building dimensions formula is empirical, not data-driven
- GitHub token rotation not battle-tested at production scale
- No automated tests (unit, integration, E2E)
- Zustand store mutations could be cleaner (overlapping logic)
- Supabase schema lacks some indexes (e.g., ON city_users(added_by))
- TypeScript types could be stricter in some places
- No rate-limiting on client-side API calls

---

**END OF TRD v3.0 (Code-Accurate)**
