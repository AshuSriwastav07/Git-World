# GIT WORLD — TECHNICAL REQUIREMENTS DOCUMENT (TRD)
## Complete Architecture & Implementation Spec
### Version 2.0 | For Next.js 16 + Supabase + React Three Fiber | Developer: Ashusriwastav07

---

# EXECUTIVE SUMMARY 

This document defines the complete technical architecture for Git World — a 3D interactive city rendered in the browser where every GitHub developer becomes a building. All decisions flow from three immutable rules: HEIGHT=commits, WIDTH=repos, COLOR=language.

**Core Stack:**
- Frontend: Next.js 16 (App Router), React 19, TypeScript 5
- 3D: Three.js r190+, React Three Fiber, Drei  
- State: Zustand for client state
- Database: Supabase (PostgreSQL + PostgREST + Realtime)
- GitHub APIv4 (GraphQL) with token rotation
- Styling: Tailwind CSS 4, Press Start 2P font

**Key Architecture Decisions:**
- InstancedMesh for 5000+ buildings (2 GPU draw calls total)
- Server-Sent Events (SSE) for real-time discovery stream
- Canvas-generated textures for all architecture
- Pre-allocated Vector3/Quaternion objects (zero GC pressure in render loop)
- Supabase realtime subscriptions for live city updates
- Edge Function cron jobs for nightly rank recalculation

---

# 1. SYSTEM ARCHITECTURE

## 1.1 High-Level Diagram

```
+-------------------------------------------------------------+
¦                      BROWSER (Client)                        ¦
¦  Next.js App (React 19 + TypeScript)                         ¦
¦  +------------------------------------------------------+   ¦
¦  ¦ /app/page.tsx                                        ¦   ¦
¦  ¦ +- CityScene (R3F Canvas)                            ¦   ¦
¦  ¦ ¦  +- CityGrid (InstancedMesh, 5000 buildings)      ¦   ¦
¦  ¦ ¦  +- TechPark (60 animated characters)             ¦   ¦
¦  ¦ ¦  +- SiliconValleyPark (4 campuses + 8 languages)  ¦   ¦
¦  ¦ ¦  +- TrendingDistrict (top 20 repos)               ¦   ¦
¦  ¦ ¦  +- AirplaneMode (flyable 3D plane)               ¦   ¦
¦  ¦ ¦  +- CameraController (orbit + WASD + cinematic)  ¦   ¦
¦  ¦ +- HUD (React DOM overlay)                          ¦   ¦
¦  ¦    +- ModeMenu (5-way experience picker)            ¦   ¦
¦  ¦    +- SearchBar, ProfileModal, RankChart           ¦   ¦
¦  ¦    +- MiniMap, TopFiveWidget, LiveFeed             ¦   ¦
¦  ¦    +- IntroOverlay (cinematic sequence)             ¦   ¦
¦  ¦                                                       ¦   ¦
¦  ¦ Zustand Store (cityStore.ts):                        ¦   ¦
¦  ¦ +- users Map<string, SlimUser>                      ¦   ¦
¦  ¦ +- activeMode: "menu" | "explore" | "fly" ...       ¦   ¦
¦  ¦ +- isNight, flightMode, selectedBuilding            ¦   ¦
¦  ¦ +- Realtime subscriptions                           ¦   ¦
¦  +------------------------------------------------------+   ¦
+-------------------------------------------------------------+
                            ? HTTP/WebSocket
+-------------------------------------------------------------+
¦            EDGE RUNTIME (Next.js API Routes)                 ¦
¦  /api/github/[username]     - Single user profile            ¦
¦  /api/github/stream         - SSE discovery stream           ¦
¦  /api/silicon-valley        - SV park data (companies/langs) ¦
¦  /api/trending              - Top 20 repos of week           ¦
¦  /api/city/users            - Paginated city users           ¦
¦  /api/city/add              - Add/update developer           ¦
+-------------------------------------------------------------+
                            ? Network
+--------------------------------------------------------------+
¦          BACKEND: Supabase (Cloud PostgreSQL)                ¦
¦  Database Schema:                                            ¦
¦  +- public.city_users (all developers)                       ¦
¦  +- public.trending_repos (top 20 weekly)                    ¦
¦  +- public.sv_contributors (company/language devs)           ¦
¦  +- Realtime tables with PostgreSQL subscriptions            ¦
¦                                                               ¦
¦  Auth: Anonymous (no login required)                         ¦
¦  Storage: Avatar images cached via Supabase CDN              ¦
+--------------------------------------------------------------+
            ?
+--------------------------------------------------------------+
¦         EXTERNAL APIs: GitHub API v4 (GraphQL)               ¦
¦  Token rotation (3 PATs × 5000 req/hr = 15000 total)         ¦
¦  Discovery queries (30 parallel searches)                    ¦
¦  User profile enrichment (repos, events, stats)              ¦
+--------------------------------------------------------------+
```

---

# 2. TECH STACK DETAILS

## 2.1 Frontend Dependencies

| Package | Version | Purpose  |
|---------|---------|----------|
| next | 16.1.6 | App Router, API routes, SSR |
| react | 19 | UI library |
| typescript | 5 | Type safety |
| @react-three/fiber | ^8 | React bindings for Three.js |
| @react-three/drei | ^9 | Helpers (Sky, Stars, OrbitControls, Html, AdaptiveDpr) |
| three | 0.183+ | 3D rendering engine |
| zustand | ^4 | Lightweight state management |
| @supabase/supabase-js | ^2 | Supabase client |
| tailwindcss | 4 | Utility CSS framework |
| google-fonts | (Press Start 2P) | Minecraft aesthetic typography |

## 2.2 Development Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| @types/node | ^20 | Node.js type definitions |
| @types/three | ^0.183 | Three.js types |
| @types/react | 19 | React types |
| tailwindcss | 4 | CSS framework dev |
| typescript | 5 | TypeScript compiler |
| eslint | ^9 | Linting |

---

# 3. DATABASE SCHEMA (Supabase PostgreSQL)

## 3.1 city_users Table

```sql
CREATE TABLE public.city_users (
  -- GitHub Profile
  login TEXT PRIMARY KEY,
  name TEXT,
  avatar_url TEXT,
  bio TEXT,
  location TEXT,
  company TEXT,
  github_join_year INTEGER,
  
  -- Metrics
  public_repos INTEGER DEFAULT 0,
  followers INTEGER DEFAULT 0,
  following INTEGER DEFAULT 0,
  total_stars INTEGER DEFAULT 0,
  total_forks INTEGER DEFAULT 0,
  top_language TEXT,
  estimated_commits INTEGER DEFAULT 0,
  recent_activity INTEGER DEFAULT 0,  -- 0-100 score
  
  -- City Assignment
  city_slot INTEGER UNIQUE,  -- Permanent position (0-21024)
  city_rank INTEGER,         -- Updates when sorting changes
  total_score FLOAT DEFAULT 0,  -- commits×3 + stars×2 + followers + repos×0.5
  
  -- Metadata
  added_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  added_by TEXT,  -- "discovery" | "search" | "admin"
  
  CONSTRAINT city_slot_unique CHECK (city_slot IS NOT NULL OR city_slot IS NULL)
);

CREATE INDEX idx_city_users_rank ON public.city_users(city_rank ASC);
CREATE INDEX idx_city_users_score ON public.city_users(total_score DESC);
CREATE INDEX idx_city_users_activity ON public.city_users(recent_activity DESC);
CREATE INDEX idx_city_users_lang ON public.city_users(top_language);
```

## 3.2 trending_repos Table

```sql
CREATE TABLE public.trending_repos (
  id TEXT PRIMARY KEY,  -- "{owner}/{repo}"
  name TEXT,
  owner TEXT,
  url TEXT,
  description TEXT,
  language TEXT,
  stars INTEGER,
  forks INTEGER,
  this_week_stars INTEGER,  -- Stars earned in past 7 days
  trending_rank INTEGER,    -- 1-20
  week_of_date DATE,        -- Monday of the week
  updated_at TIMESTAMPTZ,
  
  CONSTRAINT trending_rank_check CHECK (trending_rank >= 1 AND trending_rank <= 20)
);

CREATE INDEX idx_trending_week ON public.trending_repos(week_of_date DESC);
CREATE INDEX idx_trending_rank ON public.trending_repos(trending_rank ASC);
```

## 3.3 sv_contributors Table

```sql
CREATE TABLE public.sv_contributors (
  id SERIAL PRIMARY KEY,
  login TEXT (references city_users),
  company TEXT,  -- "apple" | "google" | "nvidia" | "meta"
  language TEXT,  -- null or "python" | "javascript" | ...
  top_language TEXT,
  stars INTEGER,
  commits INTEGER,
  github_rank INTEGER,
  added_at TIMESTAMPTZ,
  
  -- Only top 40 per company, top N per language
  CONSTRAINT company_check CHECK (company IN (''apple'', ''google'', ''nvidia'', ''meta''))
);

CREATE INDEX idx_sv_company ON public.sv_contributors(company);
CREATE INDEX idx_sv_language ON public.sv_contributors(language);
```

## 3.4 Realtime Subscriptions

Tables are published for realtime subscription at row level:

```
city_users — all rows readable, writes only server
trending_repos — all rows readable, writes only server  
sv_contributors — all rows readable, writes only server
```

---

# 4. API ROUTES

## 4.1 GET /api/github/[username]

**Purpose:** Fetch a single GitHub user''s profile and calculate all metrics.

**Query Parameters:** `username` (GitHub login, case-insensitive)

**Response:**
```typescript
{
  login: string
  name: string
  avatarUrl: string
  bio: string
  location: string
  company: string
  publicRepos: number
  followers: number
  following: number
  totalStars: number  // sum of all repo stars
  topLanguage: string // most common language
  estimatedCommits: number // calculated from pushEvents
  recentActivity: number // last 30 days activity score (0-100)
  topRepos: [{
    name: string
    stars: number
    forks: number
    language: string
    description: string
    url: string
  }]
  citySlot?: number
  cityRank?: number
  totalScore?: number
  addedAt?: string
}
```

**Implementation:**
1. Fetch `/users/{username}` from GitHub API
2. Fetch `/users/{username}/repos?per_page=100&sort=stars` (all repos)
3. Fetch `/users/{username}/events/public?per_page=100` (recent activity)
4. Calculate: totalStars = sum(repo.stars), topLanguage = mode of repo languages
5. Calculate: estimatedCommits = repos.length × 30 + pushEvents × 15
6. Calculate: recentActivity = (events in 30 days / max possible) × 100
7. If in database, return city data; otherwise return null for citySlot/Rank/Score

---

## 4.2 GET /api/github/stream

**Purpose:** Real-time SSE stream of continuously discovered GitHub developers.

**Query Parameters:** None

**Response Format:** Server-Sent Events (text/event-stream)

```
event: user
data: {"login":"username","name":"Full Name",...}

event: user
data: {"login":"username2",...}
```

**Implementation:**
1. Run 30 discovery queries in parallel (followers brackets, languages, recently active)
2. Deduplicate results
3. For each user not in database, fetch full profile (parallel)
4. Write Supabase via `/api/city/add` (atomically assigns slot)
5. SSE-send the user data to client
6. Client receives and immediately renders new building

---

## 4.3 POST /api/city/add

**Purpose:** Add or update a developer in the city (atomic slot assignment).

**Body:**
```typescript
{
  login: string
  // ...all user profile fields...
}
```

**Response:**
```typescript
{
  success: boolean
  citySlot: number  // newly assigned or existing
  cityRank: number
  message: string
}
```

**Implementation:**
1. Check if user exists in database
2. If exists: UPDATE stats, return existing citySlot
3. If new: 
   - Call Supabase RPC `claim_next_slot()` (atomicallygetsNext slot)
   - INSERT user with assigned slot
   - TRIGGER `recalculate_ranks()` RPC to re-sort all users
4. Return response

---

## 4.4 GET /api/city/users

**Purpose:** Paginated list of all developers in city (for realtime subscriptions or browsing).

**Query Parameters:**
- `limit` (default 100, max 500)
- `offset` (default 0)
- `sortBy` (default "rank") — "rank" | "score" | "activity"

**Response:**
```typescript
{
  users: SlimUser[]  // returned based on sorting
  total: number      // total users in city
  page: number
  pageSize: number
}
```

---

## 4.5 GET /api/silicon-valley/contributors

**Purpose:** Fetch all SV park contributor data (companies and languages).

**Response:**
```typescript
{
  companies: {
    apple: [{login, avatarUrl, topLanguage, stars, commits}],
    google: [...],
    nvidia: [...],
    meta: [...]
  },
  languages: {
    python: [{...}],
    javascript: [{...}],
    ... (8 language districts)
  }
}
```

---

## 4.6 GET /api/trending

**Purpose:** Fetch current week''s top 20 trending repos.

**Response:**
```typescript
{
  repos: [{
    id: string
    name: string
    owner: string
    language: string
    stars: number
    thisWeekStars: number
    description: string
    trendingRank: number  // 1-20
  }],
  weekOf: string  // ISO date of Monday
}
```

---

# 5. FRONT-END STATE MANAGEMENT (Zustand)

## 5.1 cityStore.ts

```typescript
interface SlimUser {
  login: string
  name: string
  avatarUrl: string
  topLanguage: string
  publicRepos: number
  followers: number
  totalStars: number
  estimatedCommits: number
  recentActivity: number
  citySlot: number
  cityRank: number
  totalScore: number
  addedAt: string
  bio?: string
  location?: string
  tompRepos?: Repo[]
}

interface CityStore {
  // User data
  users: Map<string, SlimUser>
  setUsers: (users: SlimUser[]) => void
  addUser: (user: SlimUser) => void
  updateUser: (user: SlimUser) => void
  
  // City state
  isNight: boolean
  toggleIsNight: () => void
  activeMode: ActiveMode
  setActiveMode: (mode: ActiveMode) => void
  flightMode: boolean
  setFlightMode: (on: boolean) => void
  
  // UI state
 selectedBuilding?: string  // username
  setSelectedBuilding: (login?: string) => void
  rankChartOpen: boolean
  setRankChartOpen: (open: boolean) => void
  
  // Realtime subscriptions
  subscribeToUsers: () => void
  unsubscribeFromUsers: () => void
}

type ActiveMode = "menu" | "explore" | "fly" | "trending" | "search" | "leaderboard"
```

---

# 6. COMPONENT STRUCTURE

## 6.1 Core Components

```
app/
  page.tsx — Main page, initializes stores, boots intro
  layout.tsx — Root layout with metadata

components/
  city/
    CityScene.tsx — R3F Canvas wrapper, lighting, sky
    CityGrid.tsx — InstancedMesh rendering (main city)
    CameraController.tsx — Orbit + WASD + cinematic camera
    TechPark.tsx — Park area with 60 characters
    SiliconValleyPark.tsx — 4 company campuses + 8 languages
    TrendingDistrict.tsx — Top 20 trending repos as buildings
    
    airplane/
      AirplaneMode.tsx — Flyable 3D plane with controls
      FlightCamera.ts — 3rd-person follow camera logic
    
    svpark/
      AppleQuadrant.tsx, GoogleQuadrant.tsx, etc.
      LanguageDistrict.tsx
      BurjKhalifaTower.tsx
      FlyingBanners.tsx
  
  ui/
    ModeMenu.tsx — 5-way mode selection after intro
    SearchBar.tsx — GitHub username search
    ProfileModal.tsx — Developer profile details
    RankChart.tsx — Top 100 leaderboard
    MiniMap.tsx — 180×180 overhead canvas map
    TopFiveWidget.tsx — Mini leaderboard (top 5)
    LiveFeed.tsx — Scrolling event ticker
    HUD.tsx — Top bar, buttons, layout assembly
    IntroOverlay.tsx — Cinematic intro sequence
  
  city/
    GodRaySpotlight.tsx — Blue neon spotlight effect

lib/
  cityStore.ts — Zustand store (state management)
  cityLayout.ts — Grid calculations, slot-to-position
  supabaseDb.ts — Supabase queries and realtime setup
  supabase.ts — Supabase client initialization
  textureGenerator.ts — Canvas texture generation + LANGUAGE_COLORS
  githubTokens.ts — Token rotation logic
  cityStream.ts — SSE stream connection
  trendingStore.ts — Zustand store for trending repos
```

---

# 7. PERFORMANCE OPTIMIZATION

## 7.1 InstancedMesh Rendering

All 5000+ building bodies use a single InstancedMesh:
- One BufferGeometry (simple box)
- 5000+ instances with unique transformation matrices
- One material (repeated for all instances)
- **Result: 2 GPU draw calls total** (body + glow/emissive)

Each instance stores position, scale, rotation, and color via instanceColor attribute.

## 7.2 Texture Generation

Building textures created once via canvas (150ms), cached in memory:
- 256×256 canvas, drawn once per building''s first render
- NearestFilter applied for pixelated look
- Reused across multiple building instances where properties are identical

## 7.3 Memory Allocation

Pre-allocated reusable objects at module scope (zero GC pressure in render loop):
- Vector3 objects for camera movement (WASD)
- Quaternion objects for rotation
- Euler objects for orientation
- Matrix4 objects for transformations used per frame
- All object pools reset with `.copy()` or `.set()` instead of `new`

## 7.4 Canvas & Texture Optimization

- Use `LinearFilter` for distant buildings, `NearestFilter` for close-ups  
- One neutral window texture tinted per-building via `instanceColor` (not per-texture)
- Grass/noise generated once on startup, shared across all ground planes
- Avatar images fetched from Supabase CDN with aggressive caching headers

## 7.5 Culling & LOD

- Frustum culling handled by Three.js (disabled on InstancedMesh, it handles internally)
- LOD: nearby buildings detailed geometry, distant buildings simplified
- Airplane and park characters use simplified geometry when far away
- Trending buildings deactivated if outside screen bounds

---

# 8. REALTIME ARCHITECTURE

## 8.1 Supabase Realtime Subscriptions

Client-side subscription setup:

```typescript
const channel = supabase
  .channel('city_users_changes')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'city_users' },
    (payload) => {
      if (payload.eventType === 'INSERT') {
        // New user added — render building, update count
      } else if (payload.eventType === 'UPDATE') {
        // User stats updated — update building appearance, rank
      }
    }
  )
  .subscribe()
```

## 8.2 SSE Discovery Stream

Client-side, running on app mount:

```typescript
const eventSource = new EventSource('/api/github/stream')
eventSource.addEventListener('user', (event) => {
  const user = JSON.parse(event.data)
  // Add to Zustand store, building appears
})
```

---

# 9. CACHING STRATEGY

## 9.1 Avatar Images

- CDN URL: Supabase Storage or direct GitHub URL
- Cache header: `max-age=86400` (24 hours)
- Fallback: Generic placeholder if image 404s

## 9.2 API Responses

- GitHub API results cached in-memory for 5 minutes
- Supabase query results cached in Zustand (in-memory)
- Building textures cached after first generation

## 9.3 Browser Cache

- Service Worker caches CSS, JS bundles (with version hash)
- Assets fingerprinted via Next.js built-in optimization

---

# 10. ERROR HANDLING

## 10.1 Network Errors

- **GitHub API unreachable**: Show cached data if available; fallback to "GitHub unavailable" message
- **Supabase unreachable**: Show existing local data; disable new searches
- **SSE stream drops**: Auto-reconnect every 5 seconds with exponential backoff
- **Search fails**: Show red border on search bar, retry on next input

## 10.2 Data Validation

- All Supabase responses validated against TypeScript interfaces
- GitHub API responses checked for required fields
- Invalid geometry dimensions logged but don''t crash
- Component error boundaries catch React errors

---

# 11. DEPLOYMENT & OPERATIONS

## 11.1 Next.js Build

```bash
npm run build  # Next.js compilation + optimization
npm run start  # Production server
npm run dev    # Development with Turbopack
```

## 11.2 Environment Variables

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=****

# GitHub API
GITHUB_TOKENS=ghp_token1,ghp_token2,ghp_token3

# App
NEXT_PUBLIC_APP_URL=https://gitworld.app
```

## 11.3 Database Maintenance

**Nightly (via Supabase Edge Function cron):**
```sql
-- Recalculate all ranks based on current total_score
SELECT recalculate_ranks();

-- Archive old trending_repos (keep 52 weeks only)
DELETE FROM trending_repos 
WHERE week_of_date < NOW() - INTERVAL ''52 weeks'';
```

**Weekly (manual or scheduled):**
- Refresh top 40 SV contributors per company
- Refresh top N per language
- Refresh top 20 trending repos (runs hourly actually)

---

# 12. SECURITY

## 12.1 Supabase RLS (Row-Level Security)

```sql
-- Only server can write; all can read
CREATE POLICY "city_users_read" ON public.city_users
  FOR SELECT USING (true);

CREATE POLICY "city_users_write" ON public.city_users
  FOR INSERT, UPDATE USING (false);  -- disabled for client
```

## 12.2 GitHub API

- PATs stored server-side in env vars, never exposed to client
- Tokens rotated on every call to balance rate limit usage
- No sensitive scopes requested (public_repo only)

## 12.3 CORS & CSP

- Next.js handles CORS for own API routes
- Supabase CORS configured to allow `gitworld.app` domain
- Content-Security-Policy header set to restrict external script loads

---

# 13. MONITORING & ANALYTICS (Optional)

## 13.1 Metrics to Track

- **Realtime developer count**: broadcast via live_update every 5 minutes
- **API response times**: log to Supabase via edge function
- **Build times**: logged in CI/CD pipeline
- **Client errors**: Sentry integration (optional)
- **User engagement**: Google Analytics events (optional)

---

# 14. TESTING STRATEGY

## 14.1 Unit Tests

- cityStore.ts actions (Vitest)
- Layout calculations (Vitest)
- Texture generation (Vitest)

## 14.2 Integration Tests

- API routes (Supabase sandbox environment)
- Realtime subscription (local Supabase)

## 14.3 E2E Tests

- User journey: search ? load profile ? fly ? run
- Discovery stream delivers buildings
- Rank changes update building height

---

END OF TECHNICAL REQUIREMENTS DOCUMENT (TRD)
