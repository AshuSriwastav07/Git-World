# Git World — Technical Requirements Document (v2)

**Revision Date:** January 2026  
**Status:** Implementation Complete — As-Built Technical Specification

---

## 1. Technology Stack (Exact Versions)

### 1.1 Core Framework
- **Next.js:** `16.1.6` (App Router, React Server Components, API routes, SSR)
- **React:** `19.2.3` (concurrent features, Suspense, automatic batching)
- **React DOM:** `19.2.3` (client hydration, server rendering)
- **TypeScript:** `5` (strict mode, full type coverage)
- **Node.js:** `18.x+` (runtime requirement)

### 1.2 3D Rendering
- **Three.js:** `0.183.2` (WebGL 2, InstancedMesh, BufferGeometry, logarithmicDepthBuffer)
- **React Three Fiber:** `9.5.0` (React renderer for Three.js, hooks-based API)
- **@react-three/drei:** `10.7.7` (helper components: OrbitControls, Sky, Stars, Html, AdaptiveDpr)

### 1.3 Database & Backend
- **Supabase Client:** `2.98.0` (PostgreSQL client, realtime subscriptions, RLS, RPC functions)
- **PostgreSQL:** `15.x` (hosted by Supabase, JSONB columns, materialized views, triggers)

### 1.4 State Management
- **Zustand:** `5.0.11` (zero-boilerplate store, ref-based batching, no Provider needed)

### 1.5 Styling
- **Tailwind CSS:** `4.0.0` (utility-first, custom config)
- **PostCSS:** `8.x` (CSS processing pipeline)

### 1.6 Fonts (Google Fonts)
- **Press Start 2P:** Weight 400 (pixel/retro aesthetic for titles and UI)
- **Space Mono:** Weights 400, 700 (monospace for body text)

### 1.7 Build & Deployment
- **Vercel:** Deployment platform (cron jobs, edge functions, ISR)
- **ESLint:** `9.x` (code linting with Next.js config)

---

## 2. Repository Structure

```
minecraft-gitcity/
├── app/
│   ├── layout.tsx              Root layout (fonts, metadata)
│   ├── page.tsx                Main entry point (intro + city lifecycle)
│   ├── globals.css             Global Tailwind styles
│   ├── api/
│   │   ├── city/
│   │   │   ├── add/route.ts             POST: Upsert user
│   │   │   └── users/route.ts           GET: Slim city data
│   │   ├── github/
│   │   │   ├── stream/route.ts          SSE: Discovery stream
│   │   │   └── [username]/route.ts      GET: User profile from GitHub
│   │   ├── silicon-valley/
│   │   │   └── contributors/route.ts    GET: SV park data (ISR 3600s)
│   │   ├── trending/
│   │   │   ├── route.ts                 GET: Active trending repos (ISR 3600s)
│   │   │   └── refresh/route.ts         POST: 6-phase trending refresh
│   │   └── cron/
│   │       ├── recalculate-ranks/route.ts   POST: Rank recalc cron
│   │       └── sv-refresh/route.ts          POST: SV refresh cron
├── components/
│   ├── city/
│   │   ├── CityScene.tsx                Canvas root, lights, scene graph
│   │   ├── CityGrid.tsx                 InstancedMesh rendering (8K buildings)
│   │   ├── Building.tsx                 [DEPRECATED] Individual building (unused)
│   │   ├── CameraController.tsx         OrbitControls + WASD + fly-to
│   │   ├── TechPark.tsx                 50×50 tech park component
│   │   ├── SiliconValleyPark.tsx        200×200 SV park with 4 campuses + 8 languages
│   │   ├── TrendingDistrict.tsx         100×100 trending repos district
│   │   ├── airplane/
│   │   │   ├── AirplaneMode.tsx         Flight system with physics
│   │   │   ├── FlightCamera.ts          3rd-person camera controller
│   │   │   └── AirplaneHUD.tsx          ALT/HDG/SPD display
│   │   └── [other city components...]
│   ├── ui/
│   │   ├── HUD.tsx                      UI assembly (search, profile, rankings, minimap)
│   │   ├── ModeMenu.tsx                 5-mode selection overlay
│   │   ├── ProfileModal.tsx             User profile right panel
│   │   ├── RepoProfilePanel.tsx         Repo details panel
│   │   ├── RankChart.tsx                Full-screen leaderboard
│   │   ├── SearchBar.tsx                GitHub username search
│   │   ├── MiniMap.tsx                  Top-down 2D city map
│   │   ├── TopFiveWidget.tsx            Top 5 users display
│   │   ├── LiveFeed.tsx                 Bottom ticker with join events
│   │   └── [other UI components...]
│   └── intro/
│       ├── CinematicIntro.tsx           25-second intro sequence
│       ├── LoadingScreen.tsx            Initial loading overlay
│       ├── IntroButtons.tsx             Mode selection buttons
│       └── GitWorldLogo.tsx             ASCII logo component
├── lib/
│   ├── cityStore.ts                Zustand store (32 state fields, 23 actions)
│   ├── trendingStore.ts            Trending repos state (3 fields, 3 actions)
│   ├── cityLayout.ts               Geometry functions (slotToWorld, getBuildingDimensions, getTier, calculateScore, isInsidePark)
│   ├── buildingGeometry.ts         BuildingMeshSpec system for decorations
│   ├── supabase.ts                 Browser/server client factory
│   ├── supabaseDb.ts               All database operations (loadSlimCity, upsertUser, recalculateRanks, subscribeToNewUsers)
│   ├── textureGenerator.ts         32×32 window texture generation
│   ├── githubTokens.ts             3-token rotation system
│   └── cityStream.ts               SSE consumer, addUserToCity helper
├── supabase/
│   └── migrations/
│       ├── 001_sv_data_fix.sql               sv_contributors, sv_language_devs tables + views
│       ├── 002_sv_source_columns.sql         Add source tracking to sv_contributors
│       ├── 002_sv_source_column.sql          [duplicate of above]
│       └── 20260308_trending_repos.sql       trending_repos table schema
├── public/
│   ├── favicon.png                Site icon
│   └── Logo.png                   OG image
├── package.json                   Dependencies
├── tsconfig.json                  TypeScript config
├── next.config.ts                 Next.js config (empty)
├── postcss.config.mjs             PostCSS config
├── eslint.config.mjs              ESLint config
├── vercel.json                    Cron jobs config
├── PRD.md                         Original product doc
├── TRD.md                         Original technical doc
├── PRD-v2.md                      This revision (product)
├── TRD-v2.md                      This revision (technical)
└── README.md                      Repository readme
```

---

## 3. Environment Variables (Required)

### 3.1 Supabase (Database)
- **`NEXT_PUBLIC_SUPABASE_URL`**  
  Public Supabase project URL (e.g., `https://xyz.supabase.co`)  
  Used by browser and server
  
- **`NEXT_PUBLIC_SUPABASE_ANON_KEY`**  
  Supabase anonymous (public) API key  
  Used by browser client for read-only operations with RLS policies
  
- **`SUPABASE_SERVICE_ROLE_KEY`**  
  Supabase service role key (bypasses RLS)  
  Used by server for write operations (upsert, rank recalc)  
  **MUST be kept secret** — never exposed to browser

### 3.2 GitHub API (Discovery & Profile Fetching)
- **`GITHUB_TOKEN_1`**  
  GitHub Personal Access Token #1  
  Scope: `public_repo`, `read:user`  
  Rate limit: 5,000 requests/hour
  
- **`GITHUB_TOKEN_2`**  
  GitHub Personal Access Token #2  
  Same scope as TOKEN_1  
  Rate limit: 5,000 requests/hour
  
- **`GITHUB_TOKEN_3`**  
  GitHub Personal Access Token #3  
  Same scope as TOKEN_1  
  Rate limit: 5,000 requests/hour
  
  **Total capacity:** 15,000 requests/hour via round-robin rotation

### 3.3 Cron Security
- **`CRON_SECRET`**  
  Bearer token for authenticating cron job requests  
  Example: `Bearer cron_secret_xyz123`  
  Checked in `/api/cron/*` routes via `Authorization` header

---

## 4. Database Schema (Complete & Exact)

### 4.1 `city_users` Table (Main User Data)

#### Columns (22 total)
```sql
login              TEXT PRIMARY KEY
name               TEXT
avatar_url         TEXT
bio                TEXT
location           TEXT
company            TEXT
public_repos       INTEGER DEFAULT 0
followers          INTEGER DEFAULT 0
following          INTEGER DEFAULT 0
github_created_at  TIMESTAMPTZ
total_stars        INTEGER DEFAULT 0
total_forks        INTEGER DEFAULT 0
top_language       TEXT DEFAULT 'Unknown'
estimated_commits  INTEGER DEFAULT 0
recent_activity    INTEGER DEFAULT 0
total_score        INTEGER DEFAULT 0
top_repos          JSONB DEFAULT '[]'::jsonb
city_slot          INTEGER UNIQUE NOT NULL
city_rank          INTEGER DEFAULT 999999
first_added_at     TIMESTAMPTZ DEFAULT now()
last_updated_at    TIMESTAMPTZ DEFAULT now()
added_by           TEXT DEFAULT 'discovery'
```

#### Indexes (Inferred from Queries)
```sql
PRIMARY KEY (login)
UNIQUE (city_slot)
INDEX ON (city_rank)              -- For ORDER BY city_rank queries
INDEX ON (total_score DESC)       -- For leaderboard sorting
INDEX ON (login) USING BTREE      -- For ilike searches
```

#### Constraints
- `login` is lowercased before insert/update
- `city_slot` assigned atomically via `claim_next_slot()` RPC
- `city_rank` recalculated daily via `recalculate_ranks()` RPC
- `top_repos` JSONB array limited to 10 items

#### RLS Policies (Inferred)
- **PUBLIC READ:** All users can SELECT from city_users
- **SERVICE WRITE:** Only service role key can INSERT/UPDATE

### 4.2 `sv_contributors` Table (Silicon Valley Company Data)

#### Columns (6 total)
```sql
login                TEXT PRIMARY KEY REFERENCES city_users(login) ON DELETE CASCADE
company              TEXT NOT NULL CHECK (company IN ('apple','google','nvidia','meta'))
contributions        INTEGER NOT NULL DEFAULT 0
source               TEXT NOT NULL DEFAULT 'org_member' CHECK (source IN ('org_member', 'profile_search'))
membership_verified  BOOLEAN NOT NULL DEFAULT true
org_name             TEXT
updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
```

#### Indexes
```sql
PRIMARY KEY (login)
INDEX ON (company)
FOREIGN KEY (login) REFERENCES city_users(login) ON DELETE CASCADE
```

### 4.3 `sv_language_devs` Table (Silicon Valley Language Data)

#### Columns (4 total)
```sql
login          TEXT PRIMARY KEY REFERENCES city_users(login) ON DELETE CASCADE
language       TEXT NOT NULL
contributions  INTEGER NOT NULL DEFAULT 0
updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
```

#### Indexes
```sql
PRIMARY KEY (login)
INDEX ON (language)
FOREIGN KEY (login) REFERENCES city_users(login) ON DELETE CASCADE
```

### 4.4 `trending_repos` Table (Weekly Trending Repos)

#### Columns (24 total)
```sql
id                 SERIAL PRIMARY KEY
repo_full_name     TEXT UNIQUE NOT NULL
owner_login        TEXT NOT NULL
repo_name          TEXT NOT NULL
description        TEXT
primary_language   TEXT
total_stars        INTEGER DEFAULT 0
weekly_stars       INTEGER DEFAULT 0
forks              INTEGER DEFAULT 0
open_issues        INTEGER DEFAULT 0
watchers           INTEGER DEFAULT 0
github_url         TEXT
homepage_url       TEXT
topics             TEXT[] DEFAULT '{}'::text[]
daily_stars        JSONB DEFAULT '[]'::jsonb
top_contributors   JSONB DEFAULT '[]'::jsonb
trending_rank      INTEGER CHECK (trending_rank >= 1 AND trending_rank <= 20)
district_slot      INTEGER CHECK (district_slot >= 0 AND district_slot <= 19)
building_height    FLOAT
building_width     FLOAT DEFAULT 3.0
last_refreshed     TIMESTAMPTZ DEFAULT now()
is_active          BOOLEAN DEFAULT true
created_at         TIMESTAMPTZ DEFAULT now()
updated_at         TIMESTAMPTZ DEFAULT now()
```

#### Indexes
```sql
PRIMARY KEY (id)
UNIQUE (repo_full_name)
UNIQUE (trending_rank) WHERE is_active = true
INDEX ON (is_active, trending_rank)
```

#### Constraints
- `trending_rank` must be 1–20 (district has 20 slots)
- `district_slot` must be 0–19 (maps to 5×4 grid position)
- Only one repo can hold each `trending_rank` when `is_active = true`

#### RLS Policies
```sql
POLICY "Public read access" ON trending_repos
  FOR SELECT USING (true);
```

### 4.5 `live_events` Table (Activity Feed)

#### Columns (Inferred from Insert Code)
```sql
id          SERIAL PRIMARY KEY
type        TEXT NOT NULL              -- e.g., 'join', 'update', 'trending_refresh'
login       TEXT                       -- GitHub username (nullable for system events)
detail      TEXT                       -- Human-readable message
created_at  TIMESTAMPTZ DEFAULT now()
```

#### Indexes
```sql
PRIMARY KEY (id)
INDEX ON (created_at DESC)   -- For ORDER BY created_at DESC queries
```

#### RLS Policies (Inferred)
- **PUBLIC READ:** All users can SELECT
- **SERVICE WRITE:** Only service role can INSERT

### 4.6 Database Views

#### `sv_contributors_full`
```sql
CREATE OR REPLACE VIEW sv_contributors_full AS
SELECT
  c.login,
  c.company,
  c.contributions,
  c.source,
  c.membership_verified,
  c.org_name,
  u.avatar_url,
  u.top_language,
  u.city_slot,
  u.city_rank,
  u.total_score,
  u.estimated_commits,
  u.total_stars,
  u.public_repos
FROM sv_contributors c
JOIN city_users u ON u.login = c.login
ORDER BY c.company, c.contributions DESC;
```

#### `sv_language_devs_full`
```sql
CREATE OR REPLACE VIEW sv_language_devs_full AS
SELECT
  d.login,
  d.language,
  d.contributions,
  u.avatar_url,
  u.top_language,
  u.city_slot,
  u.city_rank,
  u.total_score,
  u.estimated_commits,
  u.total_stars,
  u.public_repos
FROM sv_language_devs d
JOIN city_users u ON u.login = d.login
ORDER BY d.language, d.contributions DESC;
```

### 4.7 Database Functions (RPC)

#### `claim_next_slot()`
**Purpose:** Atomically assigns the next available city_slot to prevent race conditions during concurrent user inserts.

**Return Type:** `INTEGER` (the claimed slot number)

**Implementation (Inferred):** 
```sql
-- Pseudocode (exact SQL not in codebase)
CREATE OR REPLACE FUNCTION claim_next_slot()
RETURNS INTEGER AS $$
DECLARE
  next_slot INTEGER;
BEGIN
  SELECT COALESCE(MAX(city_slot), -1) + 1 INTO next_slot
  FROM city_users;
  RETURN next_slot;
END;
$$ LANGUAGE plpgsql;
```

**Usage in Code:**
```typescript
const { data: slotData, error: slotError } = await sb.rpc('claim_next_slot');
const citySlot: number = slotData;
```

#### `recalculate_ranks()`
**Purpose:** Updates `city_rank` for all users based on `total_score` (descending). Runs daily via cron at 19:45 UTC.

**Return Type:** `VOID`

**Implementation (Inferred):**
```sql
-- Pseudocode (exact SQL not in codebase)
CREATE OR REPLACE FUNCTION recalculate_ranks()
RETURNS VOID AS $$
BEGIN
  WITH ranked_users AS (
    SELECT
      login,
      ROW_NUMBER() OVER (ORDER BY total_score DESC, first_added_at ASC) AS new_rank
    FROM city_users
  )
  UPDATE city_users
  SET city_rank = ranked_users.new_rank
  FROM ranked_users
  WHERE city_users.login = ranked_users.login;
END;
$$ LANGUAGE plpgsql;
```

**Usage in Code:**
```typescript
export async function recalculateRanks(): Promise<void> {
  const sb = getSupabaseServer();
  await sb.rpc('recalculate_ranks');
}
```

---

## 5. API Routes (All Endpoints)

### 5.1 `POST /api/city/add`
**Purpose:** Add or update a GitHub user in the city

**Request Body:**
```json
{
  "login": "octocat",
  "name": "The Octocat",
  "avatarUrl": "https://github.com/octocat.png",
  "bio": "GitHub mascot",
  "location": "San Francisco",
  "company": "@github",
  "publicRepos": 8,
  "followers": 4000,
  "following": 9,
  "githubCreatedAt": "2011-01-25T18:44:36Z",
  "totalStars": 12500,
  "totalForks": 8000,
  "topLanguage": "TypeScript",
  "estimatedCommits": 2500,
  "recentActivity": 45,
  "totalScore": 16790,
  "topRepos": [...],
  "addedBy": "manual_search"
}
```

**Response:**
```json
{
  "user": {
    "login": "octocat",
    "citySlot": 4237,
    "cityRank": 12,
    ...
  }
}
```

**Implementation:**
1. Calls `upsertUser()` from `lib/supabaseDb.ts`
2. Calls `recalculateRanks()` to update all ranks
3. Re-fetches user to get updated `city_rank`
4. Returns full `CityUser` object

**Auth:** None required (public endpoint)

**Cache:** No cache headers

---

### 5.2 `GET /api/city/users`
**Purpose:** Fetch all users in the city (slim version for 3D rendering)

**Query Params:** None

**Response:**
```json
{
  "users": [
    {
      "login": "torvalds",
      "citySlot": 0,
      "cityRank": 1,
      "totalScore": 99999,
      "topLanguage": "C",
      "estimatedCommits": 50000,
      "totalStars": 200000,
      "publicRepos": 120,
      "recentActivity": 80,
      "avatarUrl": "https://...",
      "firstAddedAt": "2024-01-01T00:00:00Z"
    },
    ...
  ]
}
```

**Implementation:**
1. Calls `loadSlimCity()` from `lib/supabaseDb.ts`
2. Paginates through all users 500 at a time on server
3. Orders by `city_slot` (not `city_rank` — rank sorting is too slow for 8K rows)
4. Returns flattened array (not paginated on client)

**Auth:** None required

**Cache:** No cache headers (always fresh)

---

### 5.3 `GET /api/github/stream`
**Purpose:** Server-Sent Events (SSE) stream for background user discovery

**Query Params:** None

**Response:** SSE stream with events:
```
event: user
data: {"login":"username","citySlot":123,...}

event: progress
data: {"phase":"Searching followers:1000-2000","count":1250,"total":29}

event: done
data: {"message":"Discovery complete","usersAdded":1482}
```

**Implementation:**
1. Runs 29 parallel GitHub user searches (followers ranges, languages, repos counts, recent activity)
2. Example queries: `followers:1000..2000`, `language:python followers:500+`, `repos:>100`, `created:2024-01-01..2024-12-31`
3. Skips users already in `city_users` (calls `getAllStoredLogins()`)
4. Fetches profiles in batches of 5 via `/api/github/[username]`
5. Upserts directly to Supabase via `upsertUser()`
6. Sends SSE event for each user added
7. Sends progress events every N users
8. Calls `recalculateRanks()` at end
9. Sends `done` event
10. Closes stream

**Duration:** 300 seconds max (`maxDuration = 300`)

**Auth:** None required

**Cache:** No cache (streaming response)

---

### 5.4 `GET /api/github/[username]`
**Purpose:** Fetch GitHub user profile with stats calculation

**Route Params:** `username` (GitHub login)

**Response:**
```json
{
  "login": "octocat",
  "name": "The Octocat",
  "avatarUrl": "https://...",
  "bio": "...",
  "location": "San Francisco",
  "company": "@github",
  "publicRepos": 8,
  "followers": 4000,
  "following": 9,
  "githubCreatedAt": "2011-01-25T18:44:36Z",
  "totalStars": 12500,
  "totalForks": 8000,
  "topLanguage": "TypeScript",
  "estimatedCommits": 2500,
  "recentActivity": 45,
  "totalScore": 16790,
  "topRepos": [...]
}
```

**Implementation:**
1. Fetches `/users/:username` from GitHub API
2. Fetches `/users/:username/repos?per_page=100&sort=stars`
3. Fetches `/users/:username/events?per_page=100` (last 90 days)
4. Calculates `estimatedCommits = countEvents(PushEvent, PullRequestEvent, IssuesEvent) * 3.5`
5. Calculates `recentActivity = countEvents(last 30 days)` (capped at 100)
6. Calculates `totalStars = sum(repo.stargazers_count)` for all repos
7. Calculates `totalForks = sum(repo.forks_count)`
8. Determines `topLanguage` = most common language across repos
9. Selects `topRepos` = top 10 by stars
10. Calculates `totalScore = floor(estimatedCommits*3 + totalStars*2 + followers*1 + publicRepos*0.5 + recentActivity*10)`

**Fallback:**
- On **404 Not Found:** Returns cached data from Supabase if exists
- On **429 Rate Limit:** Returns cached data from Supabase if exists
- On **500 Server Error:** Returns cached data from Supabase if exists

**Auth:** GitHub token rotation (3 tokens, round-robin)

**Cache:** No cache headers

---

### 5.5 `GET /api/silicon-valley/contributors`
**Purpose:** Fetch Silicon Valley Park company and language data

**Query Params:**
- `company` (optional): Filter to single company (e.g., `?company=apple`)

**Response:**
```json
{
  "companies": {
    "apple": [
      {
        "login": "lattner",
        "contributions": 5000,
        "avatar_url": "...",
        "top_language": "Swift",
        "city_rank": 45
      },
      ...
    ],
    "google": [...],
    "nvidia": [...],
    "meta": [...]
  },
  "languages": {
    "Python": [...],
    "JavaScript": [...],
    "TypeScript": [...],
    "Java": [...],
    "Rust": [...],
    "Go": [...],
    "C++": [...],
    "Kotlin": [...]
  }
}
```

**Implementation:**
1. Queries `sv_contributors_full` view
2. Queries `sv_language_devs_full` view
3. Groups by company and language
4. Limits to 30 contributors per company (if `?company=` filter used)
5. Limits to 30 developers per language

**Auth:** None required

**Cache:** ISR with `revalidate = 3600` (1 hour)

---

### 5.6 `GET /api/trending`
**Purpose:** Fetch active trending repositories for the week

**Query Params:** None

**Response:**
```json
{
  "repos": [
    {
      "id": 1,
      "repo_full_name": "facebook/react",
      "owner_login": "facebook",
      "repo_name": "react",
      "description": "A declarative, efficient...",
      "primary_language": "JavaScript",
      "total_stars": 230000,
      "weekly_stars": 1500,
      "forks": 47000,
      "topics": ["react", "javascript", "ui"],
      "daily_stars": [{"date":"2024-01-20","count":214},...],
      "top_contributors": [{"login":"zpao","city_rank":1200},...],
      "trending_rank": 1,
      "district_slot": 0,
      "building_height": 72,
      "building_width": 3
    },
    ...
  ]
}
```

**Implementation:**
```sql
SELECT * FROM trending_repos
WHERE is_active = true
ORDER BY trending_rank ASC
LIMIT 20;
```

**Auth:** None required

**Cache:** ISR with `revalidate = 3600` (1 hour)

---

### 5.7 `POST /api/trending/refresh`
**Purpose:** 6-phase trending repos refresh pipeline (called by cron)

**Request Body:** None

**Request Headers:**
```
Authorization: Bearer <CRON_SECRET>
```

**Response:**
```json
{
  "success": true,
  "message": "Trending repos refreshed",
  "reposAdded": 20
}
```

**Implementation (6 Phases):**

**Phase 1 — GitHub Search:**
```
Query: created:>30_days_ago stars:>50
Filters: NOT spam keywords (spam, bot, template, boilerplate, fork)
Limit: Top 200 repos by stars
```

**Phase 2 — Fetch Details:**
For each repo:
- Fetch `/repos/:owner/:repo` (description, language, stars, forks, issues, watchers, topics, homepage)
- Fetch `/repos/:owner/:repo/contributors?per_page=10` (top contributors)
- Fetch `/repos/:owner/:repo/stats/commit_activity` (weekly commit count)

**Phase 3 — Scoring:**
```
score = total_stars * 2 + weekly_commits * 50 + forks * 1
```
Sort by score descending, take top 20

**Phase 4 — Height Mapping:**
Fixed table maps `trending_rank` (1–20) to `building_height`:
```
Rank 1  → 72 units
Rank 2  → 66 units
Rank 3  → 61 units
Rank 4  → 57 units
Rank 5  → 53 units
Rank 6  → 50 units
Rank 7  → 47 units
Rank 8  → 44 units
Rank 9  → 42 units
Rank 10 → 40 units
Rank 11 → 38 units
Rank 12 → 36 units
Rank 13 → 34 units
Rank 14 → 32 units
Rank 15 → 30 units
Rank 16 → 28 units
Rank 17 → 26 units
Rank 18 → 22 units
Rank 19 → 19 units
Rank 20 → 16 units
```

**Phase 5 — Upsert to Database:**
- Mark all existing repos `is_active = false`
- Insert/update top 20 repos with `is_active = true`
- Calculate `district_slot = trending_rank - 1` (0-indexed)
- Lookup `city_rank` for each contributor in `top_contributors` array

**Phase 6 — Live Event:**
Insert event into `live_events`:
```sql
INSERT INTO live_events (type, login, detail)
VALUES ('trending_refresh', NULL, 'Trending repos refreshed with 20 new repositories');
```

**Duration:** 300 seconds max (`maxDuration = 300`)

**Auth:** Bearer token (checks `process.env.CRON_SECRET`)

**Cache:** No cache

---

### 5.8 `POST /api/cron/recalculate-ranks`
**Purpose:** Recalculate `city_rank` for all users (called daily by Vercel cron)

**Request Body:** None

**Request Headers:**
```
Authorization: Bearer <CRON_SECRET>
```

**Response:**
```json
{
  "success": true,
  "message": "Ranks recalculated"
}
```

**Implementation:**
```typescript
await recalculateRanks(); // calls supabase.rpc('recalculate_ranks')
```

**Schedule:** Daily at 19:45 UTC (see `vercel.json`)

**Auth:** Bearer token

**Cache:** No cache

---

### 5.9 `POST /api/cron/sv-refresh`
**Purpose:** Refresh Silicon Valley Park contributor data (called daily by Vercel cron)

**Request Body:** None

**Request Headers:**
```
Authorization: Bearer <CRON_SECRET>
```

**Response:**
```json
{
  "success": true,
  "message": "Silicon Valley park refreshed"
}
```

**Implementation:** (Not fully shown in code, inferred to):
1. Fetch org members from GitHub `/orgs/:org/members` for apple, google, nvidia, meta
2. Fetch top language contributors via `/search/users?q=language:python` queries
3. Upsert to `sv_contributors` and `sv_language_devs` tables
4. Update contribution counts

**Schedule:** Daily at 19:30 UTC (see `vercel.json`)

**Auth:** Bearer token

**Cache:** No cache

---

### 5.10 `GET /api/search`
**Purpose:** Search for users by login prefix (auto-complete)

**Query Params:**
- `q`: Search query (minimum 2 characters)
- `limit` (optional): Max results (default 10)

**Response:**
```json
{
  "results": [
    {
      "login": "octocat",
      "citySlot": 123,
      "cityRank": 45,
      "avatarUrl": "..."
    },
    ...
  ]
}
```

**Implementation:**
```sql
SELECT login, city_slot, city_rank, total_score, avatar_url
FROM city_users
WHERE login ILIKE 'query%'
ORDER BY city_rank ASC
LIMIT 10;
```

**Auth:** None required

**Cache:** No cache

---

## 6. Zustand Store (State Management)

### 6.1 `cityStore.ts` (Main Store)

#### State Fields (32 total)
```typescript
{
  users: Map<string, SlimUser>,                // All users in city (keyed by login)
  sortedLogins: string[],                       // Cached array of logins sorted by rank
  selectedUser: SlimUser | null,                // Currently selected building
  isLoading: boolean,                           // Initial city load state
  loadingProgress: number,                      // 0-100 percentage
  isNight: boolean,                             // Day/night mode toggle
  flyTarget: THREE.Vector3 | null,              // Camera fly-to target
  introStage: 'loading' | 'cinematic' | 'title' | 'buttons' | 'done',
  activeMode: 'menu' | 'explore' | 'fly' | 'trending' | 'search' | 'leaderboard',
  isAirplaneMode: boolean,                      // Airplane mode active
  flightMode: boolean,                          // Synonym for isAirplaneMode
  selectedRepo: TrendingRepo | null,            // Selected repo building (trending district)
  repoPanelOpen: boolean,                       // Repo profile panel visible
  rankingsOpen: boolean,                        // Leaderboard overlay visible
  profileModalOpen: boolean,                    // User profile panel visible
  searchQuery: string,                          // Current search bar text
  searchResults: SlimUser[],                    // Search auto-complete results
  miniMapVisible: boolean,                      // Minimap visibility toggle
  controlsVisible: boolean,                     // Controls legend visibility toggle
  devCharactersVisible: boolean,                // Dev character models in SV park (not implemented)
  godRayIntensity: number,                      // God ray effect intensity (not implemented)
  fogDensity: number,                           // Fog density multiplier
  ambientMusicPlaying: boolean,                 // Background music state (not implemented)
  soundEnabled: boolean,                        // Sound effects toggle (not implemented)
  cameraAutoRotate: boolean,                    // Auto-rotate during intro
  debugMode: boolean,                           // Debug overlays (not implemented)
  performanceMode: 'low' | 'medium' | 'high',   // Graphics quality (not implemented)
  ...
}
```

#### Key Actions (23 total)
```typescript
addUser(user: SlimUser)                           // Add single user (2s batch buffer)
addUsers(users: SlimUser[])                       // Add multiple users (10K cap)
selectUser(login: string | null)                  // Select building by login
deselectUser()                                    // Deselect current building
toggleNight()                                      // Toggle day/night
setLoading(loading: boolean, progress?: number)   // Set loading state (computes sortedLogins once)
getUserByLogin(login: string)                     // Get user from Map
getTopUsers(count: number)                        // Get top N users by rank
setActiveMode(mode: ActiveMode)                   // Change camera/UI mode
setFlightMode(active: boolean)                    // Toggle airplane mode
setIntroStage(stage: IntroStage)                  // Update intro progress
setFlyTarget(target: THREE.Vector3 | null)        // Set camera fly-to target
setSearchQuery(query: string)                     // Update search bar text
setSearchResults(results: SlimUser[])             // Update search auto-complete
toggleMiniMap()                                    // Show/hide minimap
toggleControls()                                   // Show/hide controls legend
openRankings()                                     // Open leaderboard
closeRankings()                                    // Close leaderboard
openProfileModal(user: SlimUser)                  // Open user profile panel
closeProfileModal()                                // Close user profile panel
setRepoPanelOpen(open: boolean)                   // Show/hide repo profile panel
selectRepo(repo: TrendingRepo | null)             // Select trending repo building
setCameraAutoRotate(rotate: boolean)              // Enable/disable auto-rotate
```

#### Batching Strategy
```typescript
// addUser() uses 2-second batch buffer to avoid excessive re-renders
let batchBuffer: SlimUser[] = [];
let batchTimer: NodeJS.Timeout | null = null;

const addUser = (user: SlimUser) => {
  batchBuffer.push(user);
  if (!batchTimer) {
    batchTimer = setTimeout(() => {
      set((state) => {
        const newUsers = new Map(state.users);
        batchBuffer.forEach(u => newUsers.set(u.login, u));
        batchBuffer = [];
        batchTimer = null;
        return { users: newUsers };
      });
    }, 2000);
  }
};
```

### 6.2 `trendingStore.ts` (Trending Repos Store)

#### State Fields (3 total)
```typescript
{
  trendingRepos: TrendingRepo[],         // Array of 20 trending repos
  selectedRepo: TrendingRepo | null,     // Currently selected repo building
  repoPanelOpen: boolean,                // Repo profile panel visible
}
```

#### Actions (3 total)
```typescript
setTrendingRepos(repos: TrendingRepo[])       // Replace all trending repos
selectRepo(repo: TrendingRepo | null)         // Select repo building
setRepoPanelOpen(open: boolean)               // Show/hide repo panel
```

---

## 7. Three.js Scene Architecture

### 7.1 Canvas Configuration
```typescript
<Canvas
  frameloop="always"                    // Continuous rendering (no demand mode)
  dpr={[1, 1.5]}                        // Device pixel ratio clamped to 1-1.5
  camera={{
    fov: 50,                             // Field of view 50°
    near: 0.5,                           // Near clipping plane 0.5 units
    far: 2500,                           // Far clipping plane 2500 units
    position: [200, 250, 200],           // Initial camera position (intro start)
  }}
  gl={{
    logarithmicDepthBuffer: true,       // Prevents z-fighting at long distances
    antialias: false,                    // Anti-aliasing disabled (performance)
    powerPreference: "high-performance", // Request discrete GPU
  }}
  shadows={false}                        // Shadow mapping disabled (performance)
>
```

### 7.2 Building Rendering (InstancedMesh)

#### Implementation
```typescript
// CityGrid.tsx
const MAX_BUILDINGS = 8000;

// TWO InstancedMeshes:
<instancedMesh ref={bodyMeshRef} args={[geometry, bodyMaterial, MAX_BUILDINGS]} />
<instancedMesh ref={glowMeshRef} args={[geometry, glowMaterial, MAX_BUILDINGS]} />

// Single shared geometry (no LOD):
const geometry = new THREE.BoxGeometry(1, 1, 1);

// Pre-built materials (day and night, swapped not recreated):
const bodyMaterialDay = new THREE.MeshStandardMaterial({
  map: neutralWindowTexture,
  roughness: 0.6,
  metalness: 0.1,
});

const bodyMaterialNight = new THREE.MeshStandardMaterial({
  map: neutralWindowTexture,
  roughness: 0.6,
  metalness: 0.1,
  emissive: new THREE.Color(0xffffff),
  emissiveIntensity: 0.4,
});

const glowMaterial = new THREE.MeshBasicMaterial({
  color: 0xffffff,
  transparent: true,
  opacity: 0.3,
  blending: THREE.AdditiveBlending,
});
```

#### Per-Instance Attributes
```typescript
// For each building:
const matrix = new THREE.Matrix4();
const position = slotToWorld(user.citySlot);
const { height, width, depth } = getBuildingDimensions(user.cityRank, user.estimatedCommits);

matrix.makeScale(width, height, depth);
matrix.setPosition(position.x, height / 2, position.z);

bodyMeshRef.current.setMatrixAt(index, matrix);
bodyMeshRef.current.setColorAt(index, languageColor(user.topLanguage));
glowMeshRef.current.setMatrixAt(index, matrix);
```

#### Window Texture Generation
```typescript
// lib/textureGenerator.ts
const TEXTURE_SIZE = 32;           // 32×32 pixel canvas
const WINDOW_SIZE = 6;             // 6×6 pixels per window
const GAP = 1;                     // 1 pixel gap between windows

// 26 language colors (predefined map):
const LANGUAGE_COLORS: Record<string, string> = {
  JavaScript: '#f1e05a',
  Python: '#3572A5',
  TypeScript: '#2b7489',
  Java: '#b07219',
  C: '#555555',
  'C++': '#f34b7d',
  'C#': '#178600',
  Ruby: '#701516',
  Go: '#00ADD8',
  Rust: '#dea584',
  Kotlin: '#A97BFF',
  Swift: '#ffac45',
  PHP: '#4F5D95',
  Shell: '#89e051',
  Scala: '#c22d40',
  Dart: '#00B4AB',
  Lua: '#000080',
  Perl: '#0298c3',
  Haskell: '#5e5086',
  Elixir: '#6e4a7e',
  'Objective-C': '#438eff',
  R: '#198CE7',
  Julia: '#a270ba',
  Nim: '#ffc200',
  Zig: '#ec915c',
  Unknown: '#999999',
};

// Texture generation:
// 1. Fill with 60 random background stars (1-2px dots)
// 2. Draw 6×6px windows in grid pattern with 1px gaps
// 3. 45% windows use language color, 55% use random accent colors (mosaic effect)
// 4. Day mode: 85% windows lit (semi-transparent)
// 5. Night mode: 94% windows lit (emissive glow intensity 0.4)
// 6. Cache texture per user (Map<login, texture>)
```

#### Selection Ring
```typescript
// Yellow circle at base of selected building:
<mesh position={[selectedPos.x, 0.05, selectedPos.z]} rotation={[-Math.PI / 2, 0, 0]}>
  <ringGeometry args={[width * 0.5, width * 0.7, 32]} />
  <meshBasicMaterial color={0xffff00} transparent opacity={0.8} />
</mesh>
```

#### Tier 1 Crown (Rank 1 Only)
```typescript
// 3-level setback crown + beacon + antenna + 4 LED strips:
if (user.cityRank === 1) {
  // Level 1 — full width base
  <mesh position={[x, height + 5, z]}>
    <boxGeometry args={[width, 10, width]} />
    <meshStandardMaterial color={0xffd700} metalness={0.8} />
  </mesh>
  
  // Level 2 — 80% width
  <mesh position={[x, height + 15, z]}>
    <boxGeometry args={[width * 0.8, 10, width * 0.8]} />
    <meshStandardMaterial color={0xffd700} metalness={0.8} />
  </mesh>
  
  // Level 3 — 60% width
  <mesh position={[x, height + 25, z]}>
    <boxGeometry args={[width * 0.6, 10, width * 0.6]} />
    <meshStandardMaterial color={0xffd700} metalness={0.8} />
  </mesh>
  
  // Beacon (glowing sphere on top)
  <mesh position={[x, height + 35, z]}>
    <sphereGeometry args={[width * 0.2, 16, 16]} />
    <meshBasicMaterial color={0x00ffff} emissive={0x00ffff} emissiveIntensity={2.0} />
  </mesh>
  
  // Antenna (thin cylinder)
  <mesh position={[x, height + 45, z]}>
    <cylinderGeometry args={[0.1, 0.1, 20, 8]} />
    <meshStandardMaterial color={0xcccccc} />
  </mesh>
  
  // 4 LED strips (vertical blue lines on each corner)
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2;
    const ledX = x + Math.cos(angle) * (width * 0.4);
    const ledZ = z + Math.sin(angle) * (width * 0.4);
    <mesh position={[ledX, height / 2, ledZ]}>
      <boxGeometry args={[0.5, height, 0.5]} />
      <meshBasicMaterial color={0x0088ff} emissive={0x0088ff} emissiveIntensity={1.5} />
    </mesh>
  }
}
```

#### Rise Animation (Cinematic Intro)
```typescript
// Triggered at 25 seconds into intro:
// Buildings scale from 0 to 1 using easeOutBack easing
// Order: distance from center (closest rise first)

const easeOutBack = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

// For each building:
const distanceFromCenter = Math.sqrt(position.x ** 2 + position.z ** 2);
const delay = (distanceFromCenter / maxDistance) * 5000; // 0-5 second delay
const duration = 2000; // 2 second rise

setTimeout(() => {
  const startTime = Date.now();
  const animate = () => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const scale = easeOutBack(progress);
    
    matrix.makeScale(width * scale, height * scale, depth * scale);
    matrix.setPosition(position.x, (height / 2) * scale, position.z);
    bodyMeshRef.current.setMatrixAt(index, matrix);
    bodyMeshRef.current.instanceMatrix.needsUpdate = true;
    
    if (progress < 1) requestAnimationFrame(animate);
  };
  animate();
}, delay);
```

### 7.3 City Layout (Geometry Calculations)

#### Constants (lib/cityLayout.ts)
```typescript
const SLOT_PITCH = 5;              // 5 units between building centers
const BUILDING_SIZE = 3;           // 3 units base width/depth
const GAP = 2;                     // 2 units minimum between buildings (SLOT_PITCH - BUILDING_SIZE)
const GRID_SIZE = 145;             // 145×145 spiral grid (21,025 slots)
const PARK_HALF = 25;              // Tech Park is 50×50 centered at (0,0)
const SV_CENTER = { x: 75, z: 75 };
const SV_HALF = 100;               // Silicon Valley Park is 200×200
const TRENDING_CENTER = { x: -120, z: 120 };
const TRENDING_HALF = 50;          // Trending District is 100×100
```

#### `slotToWorld(slot: number): Vector3`
**Purpose:** Convert spiral grid slot index to world coordinates

**Algorithm:**
1. Start at center (0, 0)
2. Spiral outward in rings (right → up → left → down → right...)
3. Skip slots inside reserved parks (Tech Park, SV Park, Trending District)
4. Return `{ x: col * SLOT_PITCH, y: 0, z: row * SLOT_PITCH }`

**Implementation (Pseudocode):**
```typescript
function slotToWorld(slot: number): Vector3 {
  let x = 0, z = 0;
  let ring = 0;
  let slotCounter = 0;
  
  while (slotCounter < slot) {
    // Traverse spiral in 4 directions per ring
    // Skip if (x, z) is inside a park
    if (!isInsidePark(x, z)) {
      slotCounter++;
    }
    // Move to next grid position
  }
  
  return new Vector3(x * SLOT_PITCH, 0, z * SLOT_PITCH);
}
```

#### `getBuildingDimensions(rank: number, commits: number)`
**Returns:** `{ height, width, depth, tier }`

**Formula:**
```typescript
const baseHeight = 1000 / (rank + 10);
const commitBonus = Math.min((commits / 500) * 5, 20);
const height = baseHeight + commitBonus;
const width = BUILDING_SIZE;
const depth = BUILDING_SIZE;
const tier = getTier(rank);
return { height, width, depth, tier };
```

#### `getTier(rank: number): 1 | 2 | 3 | 4 | 5`
```typescript
if (rank <= 10) return 1;
if (rank <= 20) return 2;
if (rank <= 30) return 3;
if (rank <= 40) return 4;
return 5;
```

#### `calculateScore(user: Partial<CityUser>): number`
```typescript
const score = Math.floor(
  (user.estimatedCommits ?? 0) * 3
  + (user.totalStars ?? 0) * 2
  + (user.followers ?? 0) * 1
  + (user.publicRepos ?? 0) * 0.5
  + (user.recentActivity ?? 0) * 10
);
return score;
```

#### `isInsidePark(x: number, z: number): boolean`
```typescript
// Tech Park (50×50 centered at 0,0)
if (Math.abs(x) <= PARK_HALF && Math.abs(z) <= PARK_HALF) return true;

// Silicon Valley Park (200×200 centered at 75,75)
if (Math.abs(x - SV_CENTER.x) <= SV_HALF && Math.abs(z - SV_CENTER.z) <= SV_HALF) return true;

// Trending District (100×100 centered at -120,120)
if (Math.abs(x - TRENDING_CENTER.x) <= TRENDING_HALF && Math.abs(z - TRENDING_CENTER.z) <= TRENDING_HALF) return true;

return false;
```

### 7.4 Camera System (OrbitControls + Custom Behaviors)

#### OrbitControls Configuration
```typescript
<OrbitControls
  enableDamping={true}
  dampingFactor={0.05}
  minDistance={10}
  maxDistance={800}
  minPolarAngle={0}
  maxPolarAngle={Math.PI / 2.2}    // Prevent camera from going below ground
  autoRotate={cameraAutoRotate}    // Enabled during intro, disabled on interaction
  autoRotateSpeed={0.5}
  enablePan={true}
  panSpeed={1.0}
  enableZoom={true}
  zoomSpeed={1.0}
  mouseButtons={{
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.PAN,
  }}
/>
```

#### WASD Panning
```typescript
// Pre-allocated vectors (no GC allocations):
const panVector = new THREE.Vector3();
const cameraDirection = new THREE.Vector3();

useFrame((state) => {
  if (keysPressed.has('w')) panVector.z -= 2;
  if (keysPressed.has('s')) panVector.z += 2;
  if (keysPressed.has('a')) panVector.x -= 2;
  if (keysPressed.has('d')) panVector.x += 2;
  
  if (panVector.lengthSq() > 0) {
    state.camera.getWorldDirection(cameraDirection);
    const right = new THREE.Vector3().crossVectors(cameraDirection, state.camera.up);
    
    controls.current.target.addScaledVector(cameraDirection, -panVector.z);
    controls.current.target.addScaledVector(right, panVector.x);
    
    panVector.set(0, 0, 0);
  }
});
```

#### Fly-To Animation (on selectUser)
```typescript
const flyTo = (target: Vector3) => {
  const startPos = camera.position.clone();
  const startTarget = controls.target.clone();
  
  // Offset right by 20 units for profile panel visibility:
  const endPos = target.clone().add(new Vector3(20, 30, 20));
  const endTarget = target.clone();
  
  const duration = 1500; // 1.5 seconds
  const startTime = Date.now();
  
  const animate = () => {
    const elapsed = Date.now() - startTime;
    const t = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
    
    camera.position.lerpVectors(startPos, endPos, eased);
    controls.target.lerpVectors(startTarget, endTarget, eased);
    
    if (t < 1) requestAnimationFrame(animate);
  };
  animate();
};
```

#### Cinematic Camera Sweep (Intro)
```typescript
// Duration: 15 seconds (starts at intro 15s mark, ends at 32.5s)
// Animation: Descend from y=250 to y=55, radius 200→90, orbit 320°

const introCameraSweep = () => {
  const startTime = Date.now();
  const duration = 17500; // 17.5 seconds (15s intro + 2.5s buffer)
  
  const startY = 250;
  const endY = 55;
  const startRadius = 200;
  const endRadius = 90;
  const orbitAngle = (320 / 180) * Math.PI; // 320° in radians
  
  const animate = () => {
    if (userInteracted) {
      cameraAutoRotate.set(false);
      return; // Stop on any interaction
    }
    
    const elapsed = Date.now() - startTime;
    const t = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - t, 4); // easeOutQuart
    
    const y = startY + (endY - startY) * eased;
    const radius = startRadius + (endRadius - startRadius) * eased;
    const angle = orbitAngle * eased;
    
    camera.position.set(
      Math.cos(angle) * radius,
      y,
      Math.sin(angle) * radius
    );
    camera.lookAt(0, 0, 0);
    
    if (t < 1) requestAnimationFrame(animate);
    else cameraAutoRotate.set(false);
  };
  animate();
};
```

#### Keyboard Shortcuts
```typescript
window.addEventListener('keydown', (e) => {
  if (e.key === 'n' || e.key === 'N') toggleNight();
  if (e.key === 'r' || e.key === 'R') openRankings();
  if (e.key === 'Escape') {
    if (rankingsOpen) closeRankings();
    else if (profileModalOpen) closeProfileModal();
    else if (repoPanelOpen) setRepoPanelOpen(false);
    else if (activeMode === 'fly') exitAirplaneMode();
    else setActiveMode('menu');
  }
});
```

### 7.5 Silicon Valley Park (Technical Details)

#### Layout
```typescript
const SV_CENTER = { x: 75, z: 75 };
const SV_SIZE = 200;
const HALF_SIZE = 100;

// North half (company campuses):
// Single row, 4 quadrants: Apple, Google, NVIDIA, Meta
const COMPANY_ROW_Z = SV_CENTER.z + 50; // North side
const COMPANY_SPACING = 40;
const COMPANIES = ['apple', 'google', 'nvidia', 'meta'];

COMPANIES.forEach((company, i) => {
  const x = SV_CENTER.x - 60 + (i * COMPANY_SPACING);
  const z = COMPANY_ROW_Z;
  
  // 30 contributors per company (fetched from sv_contributors_full view)
  // Displayed as smaller building models (height = contributions / 100)
});

// South half (language districts):
// 2×4 grid: Python, JavaScript, TypeScript, Java (top row)
//           Rust, Go, C++, Kotlin (bottom row)
const LANGUAGE_GRID_Z_TOP = SV_CENTER.z - 30;
const LANGUAGE_GRID_Z_BOTTOM = SV_CENTER.z - 70;
const LANGUAGE_SPACING = 45;
const LANGUAGES_TOP = ['Python', 'JavaScript', 'TypeScript', 'Java'];
const LANGUAGES_BOTTOM = ['Rust', 'Go', 'C++', 'Kotlin'];

// Each district has:
// - Monument (decorative pillar with language icon)
// - 30 developer characters (smaller buildings, height = contributions / 100)
```

#### Burj Khalifa Position
```typescript
const BURJ_X = SV_CENTER.x;
const BURJ_Z = SV_CENTER.z; // Exact center of park
const BURJ_HEIGHT = 150;    // Tallest structure in city
```

#### Flying Banners
```typescript
// 8 banners circling park at radius 120 units:
const bannerCount = 8;
const bannerRadius = 120;
const bannerHeight = 80;

for (let i = 0; i < bannerCount; i++) {
  const angle = (i / bannerCount) * Math.PI * 2;
  const x = SV_CENTER.x + Math.cos(angle) * bannerRadius;
  const z = SV_CENTER.z + Math.sin(angle) * bannerRadius;
  
  // Banner rotation speed: 0.001 rad/frame
  angleRef.current += 0.001;
}
```

#### Perimeter Fence
```typescript
// Rectangular fence with 4 gaps (one per side):
const FENCE_HEIGHT = 3;
const POST_SPACING = 10;
const GAP_WIDTH = 30;

// Top edge (North):
for (let x = -HALF_SIZE; x <= HALF_SIZE; x += POST_SPACING) {
  if (Math.abs(x) < GAP_WIDTH / 2) continue; // Skip gap at center
  <mesh position={[SV_CENTER.x + x, FENCE_HEIGHT / 2, SV_CENTER.z + HALF_SIZE]}>
    <boxGeometry args={[POST_SPACING * 0.8, FENCE_HEIGHT, 0.5]} />
    <meshStandardMaterial color={0x888888} />
  </mesh>
}
// Repeat for other 3 edges...
```

### 7.6 Trending District (Technical Details)

#### Grid Layout
```typescript
const TRENDING_CENTER = { x: -120, z: 120 };
const GRID_COLS = 5;
const GRID_ROWS = 4;
const SLOT_SPACING = 15;
const TOTAL_SLOTS = 20; // 5×4

// Slot position calculation:
function slotToPosition(slot: number): { x: number, z: number } {
  const col = slot % GRID_COLS;
  const row = Math.floor(slot / GRID_COLS);
  
  const x = TRENDING_CENTER.x - ((GRID_COLS - 1) * SLOT_SPACING / 2) + (col * SLOT_SPACING);
  const z = TRENDING_CENTER.z - ((GRID_ROWS - 1) * SLOT_SPACING / 2) + (row * SLOT_SPACING);
  
  return { x, z };
}
```

#### Building Rendering
```typescript
// Each repo building:
const { x, z } = slotToPosition(repo.district_slot);
const height = repo.building_height; // From fixed rank table
const width = repo.building_width;   // Always 3

<mesh position={[x, height / 2, z]}>
  <boxGeometry args={[width, height, width]} />
  <meshStandardMaterial
    map={generateRepoTexture(repo.primary_language)}
    color={getLanguageColor(repo.primary_language)}
    roughness={0.7}
    metalness={0.2}
  />
</mesh>

// Floating label above building:
<Html position={[x, height + 5, z]} center>
  <div style={{ fontSize: '12px', color: 'white', textAlign: 'center' }}>
    {repo.repo_name}
  </div>
</Html>
```

#### Billboard Sign
```typescript
const BILLBOARD_X = TRENDING_CENTER.x;
const BILLBOARD_Z = TRENDING_CENTER.z + 60; // 60 units north of center
const BILLBOARD_HEIGHT = 20;
const BILLBOARD_WIDTH = 50;

<mesh position={[BILLBOARD_X, BILLBOARD_HEIGHT / 2, BILLBOARD_Z]}>
  <boxGeometry args={[BILLBOARD_WIDTH, BILLBOARD_HEIGHT, 1]} />
  <meshStandardMaterial color={0x222222} />
</mesh>

<Html position={[BILLBOARD_X, BILLBOARD_HEIGHT / 2, BILLBOARD_Z + 0.6]} center>
  <div style={{
    fontSize: '24px',
    fontFamily: 'Press Start 2P',
    color: 'yellow',
    textShadow: '0 0 10px black'
  }}>
    This Week<br/>Famous Repos
  </div>
</Html>
```

#### Perimeter Posts
```typescript
// 4 corners with glowing accent posts:
const corners = [
  { x: TRENDING_CENTER.x - 50, z: TRENDING_CENTER.z - 50 },
  { x: TRENDING_CENTER.x + 50, z: TRENDING_CENTER.z - 50 },
  { x: TRENDING_CENTER.x - 50, z: TRENDING_CENTER.z + 50 },
  { x: TRENDING_CENTER.x + 50, z: TRENDING_CENTER.z + 50 },
];

corners.forEach(({ x, z }) => {
  <mesh position={[x, 10, z]}>
    <cylinderGeometry args={[1, 1, 20, 8]} />
    <meshBasicMaterial color={0xff5500} emissive={0xff5500} emissiveIntensity={1.5} />
  </mesh>
});
```

### 7.7 Airplane Mode (Technical Details)

#### Airplane Model
```typescript
// Procedural geometry (no external model file):
const fuselageLength = 12;
const fuselageRadius = 1.2;
const wingSpan = 18;
const wingChord = 4;
const tailHeight = 3;

const airplane = new THREE.Group();

// Fuselage (elongated cylinder):
const fuselageGeometry = new THREE.CylinderGeometry(fuselageRadius, fuselageRadius * 0.7, fuselageLength, 16);
const fuselageMaterial = new THREE.MeshStandardMaterial({ color: 0xe8e8f0 });
const fuselage = new THREE.Mesh(fuselageGeometry, fuselageMaterial);
fuselage.rotation.x = Math.PI / 2; // Point along Z axis
airplane.add(fuselage);

// Wings (flat boxes):
const wingGeometry = new THREE.BoxGeometry(wingSpan, 0.5, wingChord);
const wing = new THREE.Mesh(wingGeometry, fuselageMaterial);
wing.position.y = -0.5;
airplane.add(wing);

// Tail fins (vertical and horizontal):
const vTailGeometry = new THREE.BoxGeometry(0.5, tailHeight, 2);
const vTail = new THREE.Mesh(vTailGeometry, fuselageMaterial);
vTail.position.set(0, tailHeight / 2, -fuselageLength / 2);
airplane.add(vTail);

const hTailGeometry = new THREE.BoxGeometry(6, 0.5, 2);
const hTail = new THREE.Mesh(hTailGeometry, fuselageMaterial);
hTail.position.set(0, tailHeight, -fuselageLength / 2);
airplane.add(hTail);

// Engines (2 cylinders under wings):
const engineGeometry = new THREE.CylinderGeometry(0.6, 0.6, 3, 12);
const engineMaterial = new THREE.MeshStandardMaterial({ color: 0x2a2a3a });

const leftEngine = new THREE.Mesh(engineGeometry, engineMaterial);
leftEngine.position.set(-6, -1.5, 0);
leftEngine.rotation.x = Math.PI / 2;
airplane.add(leftEngine);

const rightEngine = leftEngine.clone();
rightEngine.position.set(6, -1.5, 0);
airplane.add(rightEngine);

// Cockpit (cyan glass):
const cockpitGeometry = new THREE.SphereGeometry(1.5, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
const cockpitMaterial = new THREE.MeshStandardMaterial({
  color: 0x7eceff,
  transparent: true,
  opacity: 0.6,
  emissive: 0x7eceff,
  emissiveIntensity: 0.5,
});
const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial);
cockpit.position.set(0, 1, fuselageLength / 2 - 1);
airplane.add(cockpit);
```

#### Flight Physics
```typescript
// State stored in refs (no React state in render loop):
const positionRef = useRef(new THREE.Vector3(0, 50, 0));
const velocityRef = useRef(new THREE.Vector3(0, 0, 0));
const pitchRef = useRef(0);
const yawRef = useRef(0);
const speedRef = useRef(40); // Constant forward speed

const SPEED = 40;
const ALT_SPEED = 20;
const PITCH_RATE = 0.02;
const YAW_RATE = 0.03;
const MIN_ALT = 5;
const MAX_ALT = 300;

useFrame((state, delta) => {
  // Read keyboard input:
  if (keys.w) pitchRef.current += PITCH_RATE * delta;
  if (keys.s) pitchRef.current -= PITCH_RATE * delta;
  if (keys.a) yawRef.current += YAW_RATE * delta;
  if (keys.d) yawRef.current -= YAW_RATE * delta;
  if (keys.q) positionRef.current.y += ALT_SPEED * delta;
  if (keys.e) positionRef.current.y -= ALT_SPEED * delta;
  
  // Clamp altitude:
  positionRef.current.y = Math.max(MIN_ALT, Math.min(MAX_ALT, positionRef.current.y));
  
  // Clamp pitch:
  pitchRef.current = Math.max(-Math.PI / 4, Math.min(Math.PI / 4, pitchRef.current));
  
  // Update velocity based on yaw and pitch:
  const forward = new THREE.Vector3(
    Math.sin(yawRef.current),
    Math.sin(pitchRef.current),
    Math.cos(yawRef.current)
  ).normalize().multiplyScalar(SPEED * delta);
  
  positionRef.current.add(forward);
  
  // Update airplane mesh:
  airplaneMesh.current.position.copy(positionRef.current);
  airplaneMesh.current.rotation.set(pitchRef.current, yawRef.current, 0);
  
  // Update camera (3rd-person offset):
  const cameraOffset = new THREE.Vector3(0, 5, -15);
  cameraOffset.applyQuaternion(airplaneMesh.current.quaternion);
  state.camera.position.copy(positionRef.current).add(cameraOffset);
  state.camera.lookAt(positionRef.current);
});
```

#### Exit Animation
```typescript
const exitAirplaneMode = () => {
  const startOpacity = 1;
  const startCameraPos = camera.position.clone();
  const endCameraPos = new THREE.Vector3(90, 55, 90); // Default explore position
  
  const duration = 1000;
  const startTime = Date.now();
  
  const animate = () => {
    const elapsed = Date.now() - startTime;
    const t = Math.min(elapsed / duration, 1);
    
    // Fade plane:
    airplaneMesh.current.traverse((child) => {
      if (child.material) {
        child.material.opacity = 1 - t;
        child.material.transparent = true;
      }
    });
    
    // Lerp camera:
    camera.position.lerpVectors(startCameraPos, endCameraPos, t);
    
    if (t < 1) requestAnimationFrame(animate);
    else {
      setFlightMode(false);
      setActiveMode('explore');
      scene.remove(airplaneMesh.current);
    }
  };
  animate();
};
```

---

## 8. Data Flow (Complete Lifecycle)

### 8.1 Initial Page Load
```
1. User visits site
2. app/page.tsx renders
3. <CinematicIntro> mounts, starts 25-second sequence
4. At 0s: LoadingScreen with progress bar
5. At 2.5s: Typewriter quote
6. At 10s: Statistics count-up
7. At 15s: <Canvas> mounts behind overlay, starts rendering city
8. At 16s: Title card "GIT WORLD"
9. At 15-32.5s: Camera sweep animation (y=250→55, orbit 320°)
10. At 25s: Buildings rise from ground (easeOutBack, distance-based delay)
11. At 32.5s: Intro overlay fades out, <ModeMenu> appears
```

### 8.2 City Data Loading
```
1. page.tsx calls loadSlimCity() on mount
2. loadSlimCity() paginates through city_users 500 rows at a time
3. Orders by city_slot (not city_rank — sorting 8K rows by rank is slow)
4. Calls onProgress callback every 500 rows (updates loading bar)
5. Returns full array of SlimUser objects
6. cityStore.addUsers(users) batches into Map (10K cap)
7. Computes sortedLogins = Array.from(users.values()).sort((a,b) => a.cityRank - b.cityRank).map(u => u.login)
8. CityGrid.tsx receives users Map, renders InstancedMesh
9. For each user:
   a. slotToWorld(user.citySlot) → position
   b. getBuildingDimensions(user.cityRank, user.estimatedCommits) → height/width/depth
   c. Set instance matrix and color
10. bodyMeshRef.current.instanceMatrix.needsUpdate = true
```

### 8.3 Realtime Updates (Supabase Subscription)
```
1. page.tsx calls subscribeToNewUsers() on mount
2. Creates Supabase channel 'city_users_changes'
3. Listens for INSERT events on city_users table
4. On new user:
   a. Parse row to SlimUser
   b. cityStore.addUser(user) — batched with 2s buffer
   c. After 2s: addUsers([...batchBuffer]) merges into Map
   d. CityGrid re-renders (only new instances added)
   e. LiveFeed component shows "username joined Git World at slot #123"
5. Also subscribes to live_events table:
   a. On INSERT: Adds event to ticker
   b. Types: 'join', 'trending_refresh', 'rank_update'
```

### 8.4 Background Discovery Stream (SSE)
```
1. page.tsx starts cityStream.startDiscovery() 3 seconds after mount
2. Connects to /api/github/stream (EventSource)
3. Server runs 29 parallel GitHub searches:
   - followers:1000..2000, followers:2000..5000, ...
   - language:python followers:500+, language:javascript followers:500+, ...
   - repos:>100, repos:>200, ...
   - created:2024-01-01..2024-12-31
4. For each search result:
   a. Check if user already in city (skip if exists)
   b. Fetch profile via /api/github/[username]
   c. Upsert to Supabase via upsertUser()
   d. Send SSE event: { type: 'user', data: user }
5. Client receives SSE event:
   a. cityStream.addUserToCity(user) → cityStore.addUser(user)
   b. After 2s batch: CityGrid re-renders with new building
6. After 5 minutes or all searches complete:
   a. Server calls recalculateRanks()
   b. Sends SSE event: { type: 'done', data: { usersAdded: 1482 }}
   c. Closes stream
```

### 8.5 User Search Flow
```
1. User types in SearchBar (bottom-center)
2. After 2 characters, debounced query to /api/search?q=username
3. SQL: SELECT * FROM city_users WHERE login ILIKE 'username%' ORDER BY city_rank LIMIT 10
4. Returns array of SlimUser objects
5. SearchBar shows dropdown with results
6. User clicks result:
   a. cityStore.selectUser(login)
   b. cityStore.setFlyTarget(slotToWorld(user.citySlot))
   c. CameraController.flyTo(target) — 1.5s lerp with offset +20 units right
   d. ProfileModal.open(user) — shows right panel
   e. Selection ring appears at building base
7. If user not found in results:
   a. Show JoinToast: "[username] not found. Add them?"
   b. User clicks ADD TO CITY button
   c. POST /api/city/add with GitHub username
   d. Route calls /api/github/[username] to fetch profile
   e. Calls upsertUser() to insert/update
   f. Calls recalculateRanks()
   g. Re-fetches user with updated city_rank
   h. Returns user object
   i. cityStore.addUser(user)
   j. CityGrid re-renders with new building
   k. Auto-fly to new building
```

### 8.6 Trending District Refresh (Daily Cron)
```
1. Vercel cron triggers POST /api/trending/refresh at 19:30 UTC daily
2. Checks Authorization: Bearer <CRON_SECRET>
3. Phase 1 — GitHub Search:
   a. Query: created:>30_days_ago stars:>50
   b. Filter spam keywords
   c. Fetch top 200 repos by stars
4. Phase 2 — Fetch Details:
   a. For each repo: GET /repos/:owner/:repo
   b. GET /repos/:owner/:repo/contributors?per_page=10
   c. GET /repos/:owner/:repo/stats/commit_activity (weekly commits)
5. Phase 3 — Scoring:
   a. score = total_stars * 2 + weekly_commits * 50 + forks * 1
   b. Sort by score descending
   c. Take top 20
6. Phase 4 — Height Mapping:
   a. Assign trending_rank 1–20
   b. Map to building_height via fixed table (rank 1 → 72, rank 20 → 16)
   c. Set district_slot = trending_rank - 1 (0-indexed)
7. Phase 5 — Upsert to Database:
   a. UPDATE trending_repos SET is_active = false WHERE is_active = true (deactivate old)
   b. For each new repo:
      - INSERT INTO trending_repos (...) ON CONFLICT (repo_full_name) DO UPDATE
      - SET is_active = true, trending_rank = X, district_slot = X, building_height = X, ...
      - Lookup city_rank for top_contributors (cross-reference with city_users)
8. Phase 6 — Live Event:
   a. INSERT INTO live_events (type, detail) VALUES ('trending_refresh', 'Trending repos refreshed with 20 new repositories')
9. Return success response
10. Client (if page is open):
    a. Supabase realtime subscription fires on live_events INSERT
    b. LiveFeed shows "Trending repos refreshed"
    c. Page re-fetches /api/trending (ISR cache = 1 hour, but manually invalidated)
    d. trendingStore.setTrendingRepos(newRepos)
    e. TrendingDistrict re-renders with new buildings
```

### 8.7 Rank Recalculation (Daily Cron)
```
1. Vercel cron triggers POST /api/cron/recalculate-ranks at 19:45 UTC
2. Checks Authorization: Bearer <CRON_SECRET>
3. Calls recalculateRanks() → supabase.rpc('recalculate_ranks')
4. SQL function:
   a. WITH ranked_users AS (
        SELECT login, ROW_NUMBER() OVER (ORDER BY total_score DESC, first_added_at ASC) AS new_rank
        FROM city_users
      )
   b. UPDATE city_users SET city_rank = ranked_users.new_rank FROM ranked_users WHERE city_users.login = ranked_users.login
5. All city_rank values updated atomically
6. Return success response
7. Client (if page is open):
   a. No automatic refresh (requires page reload to see new ranks)
   b. buildingGeometry.ts recalculates height based on new city_rank
   c. CityGrid re-renders with updated building heights
```

---

## 9. GitHub API Usage (Token Rotation & Rate Limits)

### 9.1 Token Rotation System
```typescript
// lib/githubTokens.ts
const tokens = [
  process.env.GITHUB_TOKEN_1,
  process.env.GITHUB_TOKEN_2,
  process.env.GITHUB_TOKEN_3,
].filter(Boolean);

let tokenIndex = 0;

export function getNextToken(): string {
  const token = tokens[tokenIndex];
  tokenIndex = (tokenIndex + 1) % tokens.length;
  return token;
}
```

### 9.2 Rate Limits (Per Token)
- **Unauthenticated:** 60 requests/hour
- **Authenticated:** 5,000 requests/hour
- **Search API:** 30 requests/minute (separate limit)

**Total Capacity with 3 Tokens:**
- Standard API: 15,000 requests/hour
- Search API: 90 requests/minute

### 9.3 Rate Limit Handling
```typescript
async function fetchGitHub(url: string): Promise<Response> {
  const token = getNextToken();
  const response = await fetch(`https://api.github.com${url}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });
  
  if (response.status === 429) {
    // Rate limit exceeded — fallback to cached data from Supabase
    console.warn('GitHub rate limit hit, using cached data');
    return null;
  }
  
  if (response.status === 404) {
    // User not found
    return null;
  }
  
  return response;
}
```

### 9.4 API Endpoints Used
```
GET /users/:username                          (1 request per user profile)
GET /users/:username/repos?per_page=100       (1 request per user)
GET /users/:username/events?per_page=100      (1 request per user)
GET /search/users?q=...                       (29 requests per discovery cycle)
GET /repos/:owner/:repo                       (1 request per trending repo)
GET /repos/:owner/:repo/contributors          (1 request per trending repo)
GET /repos/:owner/:repo/stats/commit_activity (1 request per trending repo)
GET /orgs/:org/members                        (1 request per SV company — not shown in code)
```

---

## 10. Cron Jobs (Vercel Configuration)

### 10.1 `vercel.json`
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

### 10.2 Cron Schedule (UTC)
- **19:30 UTC:** Daily city refresh + SV park refresh
- **19:45 UTC:** Rank recalculation (15 minutes after refresh to allow data to settle)

### 10.3 Cron Authentication
All cron routes check:
```typescript
const authHeader = request.headers.get('Authorization');
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return new Response('Unauthorized', { status: 401 });
}
```

---

## 11. Performance Implementation Assessment

### 11.1 ✅ IMPLEMENTED Optimizations

#### InstancedMesh Rendering
**Status:** ✅ FULLY IMPLEMENTED  
**Location:** `components/city/CityGrid.tsx`  
**Details:**
- 8,000 buildings rendered as 2 InstancedMesh instances (body + glow)
- Single shared BoxGeometry (no per-building geometry)
- Pre-built day/night materials (swapped, never recreated)
- Per-instance color tinting via `instanceColor` attribute
- Reduces draw calls from 16,000 (2 per building) to 2 total

#### Texture Caching
**Status:** ✅ FULLY IMPLEMENTED  
**Location:** `lib/textureGenerator.ts`  
**Details:**
- Window textures generated once per user
- Cached in Map<login, texture>
- 32×32 canvas textures (small memory footprint)
- Reused across day/night mode toggles

#### Logarithmic Depth Buffer
**Status:** ✅ FULLY IMPLEMENTED  
**Location:** `components/city/CityScene.tsx`  
**Details:**
- `logarithmicDepthBuffer: true` in Canvas config
- Prevents z-fighting at city scale (2500 unit far plane)
- Minimal performance cost on modern GPUs

#### Device Pixel Ratio Clamping
**Status:** ✅ FULLY IMPLEMENTED  
**Location:** `components/city/CityScene.tsx`  
**Details:**
- `dpr={[1, 1.5]}` caps pixel density at 1.5x
- Prevents excessive pixel counts on 4K displays
- Reduces GPU load by ~50% on high-DPI screens

#### Zustand Batch Buffering
**Status:** ✅ FULLY IMPLEMENTED  
**Location:** `lib/cityStore.ts`  
**Details:**
- `addUser()` batches updates with 2-second buffer
- Avoids re-rendering CityGrid on every single user add
- During SSE discovery: batches ~10-20 users per render

---

### 11.2 ❌ NOT IMPLEMENTED Optimizations

#### Frustum Culling
**Status:** ❌ NOT IMPLEMENTED  
**Impact:** GPU wastes cycles rendering ~6,000 offscreen buildings every frame  
**Reason:** InstancedMesh does not auto-cull instances; manual frustum checks not implemented  
**Fix Complexity:** Medium — would require per-instance frustum test + visibility buffer

#### Level of Detail (LOD)
**Status:** ❌ NOT IMPLEMENTED  
**Impact:** Far buildings render at same poly count as near buildings  
**Reason:** Single BoxGeometry used for all instances, no LOD system  
**Fix Complexity:** Medium — would require 3 LOD levels (high/med/low poly) + distance-based swapping

#### Octree Spatial Indexing
**Status:** ❌ NOT IMPLEMENTED  
**Impact:** Click detection tests all 8,000 buildings linearly (slow on large cities)  
**Reason:** No spatial partitioning structure built  
**Fix Complexity:** High — would require Octree or BVH construction + raycasting integration

#### Asset Compression (KTX2)
**Status:** ❌ NOT IMPLEMENTED  
**Impact:** Textures stored as raw PNG/Canvas, no GPU-native compression  
**Reason:** Three.js KTX2Loader not integrated  
**Fix Complexity:** Medium — would require texture baking pipeline + KTX2Loader setup

#### Web Worker Offloading
**Status:** ❌ NOT IMPLEMENTED  
**Impact:** All geometry calculations (slotToWorld, getBuildingDimensions) run on main thread  
**Reason:** No worker pool setup  
**Fix Complexity:** High — would require serialization of Vector3, matrix calculations in worker

#### Demand Rendering
**Status:** ❌ NOT IMPLEMENTED (Uses `frameloop="always"`)  
**Impact:** Renders 60 FPS continuously even when scene is static  
**Reason:** `frameloop="demand"` not used (airplane mode requires continuous updates)  
**Fix Complexity:** Low — could use `invalidate()` on state changes, but conflicts with airplane physics

#### Client-Side Pagination
**Status:** ❌ NOT IMPLEMENTED (Loads all 8K users at once)  
**Impact:** Initial load takes 25–45 seconds for full city  
**Reason:** No progressive loading (all users fetched before buildings render)  
**Fix Complexity:** Medium — would require distance-based loading (render nearby buildings first)

#### ISR Caching on City Data
**Status:** ❌ NOT IMPLEMENTED (Always fresh data, no cache headers)  
**Impact:** Every page load fetches all 8K users from Supabase  
**Reason:** No ISR or SWR strategy on `/api/city/users`  
**Fix Complexity:** Low — add `revalidate: 300` to route

---

### 11.3 Performance Budget (Actual vs. Target)

| Metric | Target | Actual (Desktop) | Actual (Mobile) |
|--------|--------|------------------|----------------|
| Initial Load | < 10s | 25–45s | 60–90s |
| FPS (Empty Scene) | 60 | 60 | 30–40 |
| FPS (8K Buildings) | 60 | 30–45 | 10–20 |
| Memory Usage | < 500MB | 800MB–1.2GB | 600MB–900MB |
| Draw Calls | < 10 | 2 | 2 |
| Triangles | < 100K | 96K (8K buildings × 12 tris) | 96K |

---

## 12. Known Technical Debt

### 12.1 TODO Comments in Code
```typescript
// lib/cityLayout.ts line 42
// TODO: Optimize spiral calculation with pre-computed lookup table

// components/city/CityGrid.tsx line 156
// TODO: Implement frustum culling for InstancedMesh

// components/city/Building.tsx line 1
// NOTE: This component is DEPRECATED — CityGrid uses InstancedMesh instead
// TODO: Remove this file entirely after verifying InstancedMesh stability

// lib/supabaseDb.ts line 387
// TODO: Investigate why JSON.stringify sometimes fails on repo objects with circular refs
```

### 12.2 Hardcoded Values (Not Environment Variables)
```typescript
// lib/cityLayout.ts
const SLOT_PITCH = 5;              // Magic number — should be configurable
const BUILDING_SIZE = 3;           // Magic number
const GRID_SIZE = 145;             // Max city size hardcoded

// components/city/CityGrid.tsx
const MAX_BUILDINGS = 8000;        // Arbitrary cap — could be dynamic

// lib/textureGenerator.ts
const TEXTURE_SIZE = 32;           // Fixed texture resolution

// app/api/github/stream/route.ts
export const maxDuration = 300;    // 5 minute timeout hardcoded
```

### 12.3 Console.log Statements (Should Use Proper Logging)
```typescript
// lib/supabaseDb.ts line 340
console.error('[upsertUser] payload serialization failed for:', userData.login, e);

// lib/supabaseDb.ts line 445
console.error('[upsertUser] update error:', error.message);

// lib/supabaseDb.ts line 453
console.warn('[upsertUser] retrying insert for:', userData.login, '— payload keys:', Object.keys(cleanInsertPayload));

// app/api/github/stream/route.ts line 67
console.log('[Discovery] Starting parallel searches...');
```

### 12.4 Missing TypeScript Types
```typescript
// lib/supabaseDb.ts line 60
function rowToUser(row: Record<string, unknown>): CityUser {
  // Should be typed as Database['public']['Tables']['city_users']['Row']

// app/api/github/[username]/route.ts line 23
const userData: any = await response.json();
  // Should be typed as GitHubUserResponse

// components/city/CityGrid.tsx line 89
const tempMatrix = new THREE.Matrix4();
  // Not exported/typed for reuse
```

### 12.5 Race Conditions (Mitigated but Not Eliminated)
```typescript
// lib/supabaseDb.ts line 295
// In-flight lock map prevents duplicate upsert calls, but:
// - Multiple server instances can still race on slot claiming
// - No distributed lock (Redis, etc.)
// - Relies on claim_next_slot() being atomic (assumed, not verified)

const upsertLocks = new Map<string, Promise<CityUser | null>>();
```

### 12.6 Unused State Fields in Zustand Store
```typescript
// lib/cityStore.ts
devCharactersVisible: boolean,        // Feature not implemented
godRayIntensity: number,              // Effect not implemented
ambientMusicPlaying: boolean,         // Audio not implemented
soundEnabled: boolean,                // Audio not implemented
debugMode: boolean,                   // Debug UI not implemented
performanceMode: 'low' | 'medium' | 'high',  // Quality settings not implemented
```

### 12.7 Deprecated Components (Not Removed)
```typescript
// components/city/Building.tsx
// This entire file is unused (CityGrid uses InstancedMesh instead)
// Should be deleted to reduce confusion
```

### 12.8 Missing Error Boundaries
```typescript
// app/page.tsx
// No error boundary wrapping city rendering
// City crash causes blank screen with no user feedback
```

### 12.9 No Analytics/Monitoring
```typescript
// No instrumentation for:
// - Performance metrics (FPS, memory, load time)
// - User interactions (clicks, searches, mode changes)
// - Error tracking (Sentry, etc.)
// - API response times
```

### 12.10 Missing Unit Tests
```typescript
// 0 test files in repository
// Critical functions with 0 test coverage:
// - lib/cityLayout.ts (slotToWorld, getBuildingDimensions, calculateScore)
// - lib/supabaseDb.ts (upsertUser, loadSlimCity)
// - lib/textureGenerator.ts (generateWindowTexture)
```

---

**End of Technical Requirements Document v2**
