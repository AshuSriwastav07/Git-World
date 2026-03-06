# MINECRAFT GITHUB CITY
## Complete PRD + TRD — The Definitive Build Document
### For Claude Opus 4.6 | VS Code | Next.js 15 + React Three Fiber + Firebase
### Reference: thegitcity.com | Developer Credit: Ashusriwastav07

---

# PRODUCT REQUIREMENTS DOCUMENT (PRD)

---

## 1. PRODUCT VISION

Build an interactive 3D city in the browser where every public GitHub developer has a Minecraft-style pixel-art building. The city looks and feels exactly like thegitcity.com but with a full Minecraft voxel aesthetic instead of generic pixel art. The city is persistent (Firebase-backed), scales to 20,000 users, updates in real time, and never empties — every developer who joins stays forever.

The reference site thegitcity.com uses instanced meshes, LOD systems, and React Three Fiber. This project uses the exact same technical approach but with Minecraft block textures, Minecraft pixel font, Minecraft UI panels, and a richer feature set.

---

## 2. THE EXACT VISUAL TARGET

### What thegitcity.com Does (and What to Match)

Git City transforms every GitHub profile into a unique pixel art building where height is based on contributions, width is based on repos, and lit windows represent activity. It has free flight mode, profile pages, achievement system, and building customization.

The project uses Three.js's Instanced Mesh technology to handle a large number of repetitive building structures and introduces a LOD (Level of Detail) system. Buildings are rendered close up with full detail and animated windows; distant buildings use simplified geometry.

### What This Project Adds on Top

- Full Minecraft block texture aesthetic on every building face (not generic pixel art)
- Press Start 2P pixel font throughout the entire UI
- Minecraft-style UI panels (dark with pixel borders, inventory style)
- Firebase Firestore backend — city is permanent, never resets
- 20,000 user capacity with persistent slot assignment
- Tech Park with 20 sitting developer characters
- Top 100 rank leaderboard panel
- Flyable Minecraft-style airplane the user pilots
- Day/night cycle with full window glow at night
- Live activity ticker at the bottom of screen
- "Developed by Ashusriwastav07" credit always visible

---

## 3. CORE BUILDING RULES (These Never Change)

These are the fundamental rules that define how every building looks:

**HEIGHT = commits.** More commits = taller building. The formula uses a percentile rank so the top 1% of developers get the tallest buildings (up to 80 blocks) and the bottom 50% get 2 to 5 blocks. Only ONE building reaches the absolute maximum height of 80 blocks — that is always the rank 1 developer by total score. Height equals contributions, width equals repos, brightness equals stars.

**WIDTH = repos.** More public repositories = wider building footprint. Scale from 1×1 (0 repos) to 6×6 (200+ repos). In this system the base footprint is always 3×3 world units for the smallest and scales up. The gap between every pair of adjacent buildings is always exactly 2 world units — never changes.

**WINDOW BRIGHTNESS = stars.** More GitHub stars = more lit windows. At night, a developer with 10,000 stars has almost every window lit up warm amber. A developer with 0 stars has completely dark windows.

**COLOR = primary programming language.** This is the dominant color of the building facade. JavaScript = golden yellow, TypeScript = steel blue, Python = ocean blue, Rust = burnt orange, Go = bright cyan, Ruby = crimson, Java = earthy brown, C++ = metallic pink, Swift = vivid orange, Kotlin = soft purple, unknown = slate blue.

---

## 4. CITY GRID SPECIFICATION

### Dimensions for 20,000 Users

The grid is 145 × 145 = 21,025 total slots. Each slot is 5 world units wide (3 units for the building footprint + 2 units for the gap on the right and bottom). The city spans 725 × 725 world units. The Tech Park reserves a 10 × 10 block area.

### The 3+2 Grid Rule (Visual Priority)

Every row and column of the city follows this exact pattern: building occupies 3 units, gap occupies 2 units, next building occupies 3 units, gap occupies 2 units, and so on. There are NO roads. NO wide empty strips. The gaps between buildings are never more than 2 units wide. This creates the dense urban grid the user wants.

Looking from the default camera position (above and behind the center at a 40-degree angle), the city appears as a completely packed grid of buildings. The center skyline rises dramatically. The edges taper down.

### Slot Assignment (Spiral from Center)

Slots are numbered 0 to 21,024. They are assigned in a spiral starting from the center (slot 0 = position 72, 72 in the grid). Slot 1 is one step north. Slot 2 is one step northeast. The spiral continues outward.

When users are sorted by their total score (commits × 3 + stars × 2 + followers × 1 + repos × 0.5), the highest-scoring developer gets slot 0 (dead center), the second highest gets slot 1, and so on. This means the center of the city is always the most impressive skyline.

Slot numbers stored in Firebase never change. A developer's position in the city is permanent.

---

## 5. BUILDING APPEARANCE DETAILS

### The Minecraft Look

Each building is made of a small number of clean box meshes. The faces of each box mesh display a canvas-drawn texture that shows the Minecraft block pattern. The texture is generated procedurally using the `canvas` API with `NearestFilter` applied. This gives every building face a pixelated, blocky, authentic Minecraft look.

The texture on each face shows:
- A base color matching the developer's programming language
- A subtle pixel noise pattern (1 to 3 pixel variations in shade) to simulate Minecraft's block texture randomness
- A grid of windows drawn as small bright rectangles in regular rows across the face
- Darker horizontal bands every 5 block heights simulating floor divisions
- Optional vertical LED strip elements on corner columns for top-ranked buildings

### The 5 Building Tiers Based on Rank

**Tier 1 (Rank 1 only — THE SKYSCRAPER):** This single building is 70 to 80 blocks tall. It has a tapered crown — the top 15 blocks narrow from 3×3 to 1×1. Four vertical gold LED strips run the full height of the building. The roof has a glowing gold beacon block. An antenna pole extends 6 blocks above the crown. This building is visible from anywhere in the city. It belongs to the developer with the highest total score.

**Tier 2 (Ranks 2 to 10 — TOWERS):** These buildings are 35 to 55 blocks tall. They have distinctive roof features — either a helipad marking or a small penthouse box on the roof. Their corner columns have colored LED strips in their primary language color. From the city overview, these form the impressive inner skyline ring.

**Tier 3 (Ranks 11 to 200 — TALL BUILDINGS):** 15 to 35 blocks tall. Clean rectangular building with standard window grid. A simple flat roof or a 2-block tall parapet around the roof edge. These fill the inner and middle districts of the city and make up most of the visible skyline.

**Tier 4 (Ranks 201 to 5,000 — STANDARD BUILDINGS):** 5 to 15 blocks tall. Regular rectangular buildings with window textures. No special roof features. These are the backbone of the city, filling the middle and outer rings.

**Tier 5 (Ranks 5,001 to 20,000 — SMALL BUILDINGS):** 2 to 5 blocks tall. Simple squat buildings. Minimal window detail. These fill the outer edges of the city and make the city feel populated all the way to its boundaries.

### Building Variety Within Each Tier

Even within the same tier, no two buildings look identical because they differ by: height (precise blocks based on exact commit count), width (precise footprint based on exact repo count), primary language color, window density (based on stars), window lit ratio (based on recent activity), and a deterministic random variation in window pattern seeded by the developer's username.

---

## 6. TECH PARK

### Location and Size

The Tech Park occupies a reserved 10×10 slot area (50×50 world units) positioned approximately 120 world units northeast of the city center. It is clearly visible from the default camera position.

### Park Elements

The park ground is bright Minecraft grass green (#5a9e28). A 1-block tall white fence outlines the full perimeter.

The TECH PARK sign is the centerpiece landmark. It consists of individual letter blocks spelling "TECH PARK" mounted on a raised frame 3 world units above the ground. Each letter is 3 units tall and made of gold-colored emissive blocks. The sign faces the city center so it is readable from the default camera. It glows slightly at night.

Inside the park there are 8 oak trees placed around the edges. Each tree has a 2-unit tall brown wood trunk and a 5×5×3 cluster of green leaf blocks.

A fountain sits at the center — a stone ring 8 units in diameter with blue glass water blocks inside. A 3-block tall center column rises from the water. At night the water emits a soft blue glow.

Three wooden benches face the fountain. Each bench is a horizontal plank supported by two short posts.

Small flower patches — single colored wool blocks — are scattered around the benches and tree bases.

Lamp posts (3-unit iron pole topped with a glowstone block) stand at the park corners and along the fence every 15 units. At night these emit warm orange point lights.

### The Developer Characters in the Park

The 20 most recently active developers (highest recent activity score from GitHub events) are shown as simple Minecraft-style character figures standing near the benches and fountain path.

Each character is built from 6 box meshes: head (0.8 × 0.8 × 0.8 units), body (0.7 × 0.9 × 0.4 units), left arm, right arm, left leg, right leg. The body color matches their primary language color. Characters face the fountain.

A tiny floating username label appears above each character's head ONLY when the camera is within 45 world units of the park — it never shows from far away.

Clicking any park character opens the same profile modal as clicking a building. The profile modal shows all their GitHub stats and includes a working "View on GitHub" button that opens their profile in a new tab.

The park refreshes its 20 characters every 30 minutes — whoever became most recently active replaces the least active among the current 20.

---

## 7. SEARCH BAR

The search bar sits at the bottom center of the screen. It has a Minecraft chest-style appearance — dark panel with 3-pixel gold border, Press Start 2P font.

When a user types a GitHub username and submits:

**If the user is already in the city (Firebase):** Camera smoothly flies to their building over 1.5 seconds. A pulsing gold ring appears at the base of their building. A message says "Welcome back, [username]! Your city slot is #[number]."

**If the user exists on GitHub but is not yet in the city:** Their GitHub profile is fetched immediately. They are added to Firebase with the next available slot. Their building rises from the ground in a block-by-block construction animation (800ms). Camera flies to the new building. Message says "You just joined GitHub City permanently! Slot #[number] is yours."

**If the username does not exist:** The search bar border flashes red. Message says "GitHub user not found."

**If rate limited:** A countdown appears saying "GitHub is busy — retrying in [seconds]."

---

## 8. RANK CHART (TOP 100)

A "RANKINGS" button in the top navigation opens a sliding panel from the right side.

The panel is 380px wide, full screen height, dark semi-transparent background with a 3-pixel gold border. Title reads "GITHUB CITY TOP 100" in gold Press Start 2P font.

Three tabs at the top: ALL TIME (default), THIS WEEK, NEWEST.

Each of the 100 rows shows: rank number in gold, developer avatar (24×24 pixelated), username, language badge, score bar (proportional to rank 1), trend arrow (up/down/neutral since last refresh).

Clicking any row closes the panel and flies the camera to that developer's building.

---

## 9. AIRPLANE MODE

Press F to enter airplane mode. A Minecraft-styled white airplane appears above the city and the camera attaches behind it.

**Controls while flying:**
- W / S: throttle up / down
- A / D: turn left / right (with visible banking tilt)
- Q / E: pitch nose up / down
- Shift: speed boost (2× speed)
- F or Escape: exit airplane mode

The airplane is built from box geometry: elongated white fuselage, flat wings, vertical tail fin, horizontal stabilizers, spinning propeller at nose, cyan cockpit windshield. A small panel on the fuselage reads "ASHUSRIWASTAV07 AIR" in canvas-drawn texture.

At night: red point light on left wingtip, green on right, white strobe on tail, warm yellow glow from cockpit windows.

A vapor trail follows the airplane — 25 semi-transparent white sphere sprites that spawn at the plane's recent positions and fade over 2 seconds.

When flying within 25 units of a building, a small HUD tooltip shows the developer's username. Clicking while near a building opens the profile modal in airplane mode.

---

## 10. DAY / NIGHT CYCLE

A toggle button in the top bar switches between day and night over a 3-second smooth transition.

**Day:** React Three Fiber's `<Sky>` component with warm sun position. Strong directional light from the sun direction. Buildings show their full color with realistic shadows. Ground is dark charcoal between buildings.

**Night:** `<Stars>` component (800 count). Sky is dark navy. Directional light is dim cool blue (moonlight). Every building with recent activity has emissive amber windows. The top-ranked buildings have animated LED strips. Street lamps in the Tech Park emit warm orange point lights. The fountain glows blue. The TECH PARK sign glows gold. The overall scene looks like a glowing city at night — the window light from thousands of buildings creates an atmospheric orange haze at ground level.

---

## 11. PROFILE MODAL

When clicking any building or park character, a centered modal appears.

The modal has a dark background, 4-pixel solid border in the developer's primary language color, Press Start 2P font throughout.

Contents:
- Pixelated avatar (CSS image-rendering: pixelated applied)
- Username large, real name smaller
- Bio, location, company, GitHub join year
- Building info: archetype name, height in blocks, footprint, city rank, city slot number
- Stats bars: commits, stars, repos, followers — each with a proportional pixel bar and number
- Language badge, activity status (Very Active / Active / Quiet)
- Top 5 repositories — each a clickable card showing name, stars, forks, language, description
- "View on GitHub →" button (green Minecraft button style) — opens their GitHub profile in new tab
- "Fly to Building" button — closes modal and flies camera to their building
- Close button (red X, top right), also Escape key closes

Data freshness shown at bottom: "Data refreshed X minutes ago"

---

## 12. HUD LAYOUT

```
┌─────────────────────────────────────────────────────────┐
│ [🧱 MINECRAFT GITHUB CITY]    [4,721 devs 🔴 LIVE]    │
│ [RANKINGS button]              [☀️ / 🌙 toggle]        │
└─────────────────────────────────────────────────────────┘
│                                                         │
│              [  3D CITY CANVAS  ]                       │
│                                                         │
│ [minimap 180×180]              [top 5 leaderboard mini] │
└─────────────────────────────────────────────────────────┘
│ [⛏️ Search any GitHub username...] [Find] [🎲 Random]  │
└─────────────────────────────────────────────────────────┘
│ [📡 Live feed: user joined... user grew taller...]     │
└─────────────────────────────────────────────────────────┘
│                        [Built by Ashusriwastav07 🐱]   │
└─────────────────────────────────────────────────────────┘
```

The minimap (bottom left) is a 180×180 canvas showing the full city from above. User dots are colored by language. The airplane position shows as a tiny ✈ symbol. Clicking the minimap flies the camera to that position. The top 5 mini-leaderboard (bottom right) always shows rank 1–5 with username and score, each row clickable.

The live feed ticker at the very bottom scrolls right-to-left showing real-time events from Firebase: new users joining, rank changes, buildings growing.

"Built by Ashusriwastav07" credit is always visible in the bottom right, links to github.com/Ashusriwastav07.

Controls hint (collapsible ℹ icon, bottom left above minimap):
- Overview: Left drag = rotate | Right drag = pan | Scroll = zoom | WASD = pan
- F = Airplane mode | W/S = Throttle | A/D = Turn | Q/E = Pitch | Shift = Boost
- Click any building = Profile | N = Night toggle | R = Open Rankings

---

# TECHNICAL REQUIREMENTS DOCUMENT (TRD)

---

## 1. TECH STACK

| Layer | Technology | Why |
|---|---|---|
| Framework | Next.js 15 (App Router) | Same as thegitcity.com |
| 3D Engine | React Three Fiber + Drei | Same as thegitcity.com — React-idiomatic Three.js |
| Rendering | Three.js r160+ | WebGL, instanced meshes, LOD |
| State | Zustand | Lightweight, works perfectly with R3F |
| Backend DB | Firebase Firestore | Persistent city, real-time listeners |
| Live Updates | Firebase Realtime Database | Instant cross-browser city events |
| Styling | Tailwind CSS | Utility-first |
| Font | Press Start 2P (Google Fonts) | Minecraft aesthetic |
| Language | TypeScript strict | Type safety throughout |
| Package Manager | npm |  |

---

## 2. INSTALL COMMANDS (Run in Order)

```bash
# Step 1: Create project
npx create-next-app@latest minecraft-gitcity \
  --typescript --tailwind --app --eslint \
  --src-dir --import-alias "@/*"

cd minecraft-gitcity

# Step 2: Install 3D + state dependencies
npm install three @react-three/fiber @react-three/drei zustand

# Step 3: Install Firebase
npm install firebase

# Step 4: Type definitions
npm install --save-dev @types/three

# Step 5: Verify everything installed
cat package.json
```

---

## 3. ENVIRONMENT VARIABLES

Create `.env.local` in project root. Claude must ask you for these values before writing code:

```
# Firebase (get from Firebase Console → Project Settings → Web App)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_DATABASE_URL=

# GitHub tokens — get 3 free ones at github.com → Settings → Developer Settings → PAT → Classic → public_repo scope only
GITHUB_TOKEN_1=
GITHUB_TOKEN_2=
GITHUB_TOKEN_3=

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 4. FIREBASE SETUP (Do This Before Running Code)

### In Firebase Console:
1. Create project "minecraft-gitcity"
2. Enable **Firestore Database** (start in production mode)
3. Enable **Realtime Database**
4. Enable **Authentication → Anonymous** (sign-in method)
5. Go to Project Settings → General → Your Apps → Add Web App → copy config

### Firestore Collections:

**`city_users` collection** — one document per developer, document ID = GitHub username (lowercase)

Fields per document:
```
login: string
name: string  
avatarUrl: string
bio: string
location: string
company: string
publicRepos: number
followers: number
following: number
createdAt: string (ISO date)
totalStars: number
totalForks: number
topLanguage: string
estimatedCommits: number
recentActivity: number (0-100)
topRepos: array of {name, stars, forks, language, description, url}
citySlot: number (PERMANENT — assigned once, never changes)
cityRank: number (updates as stats change)
totalScore: number (commits×3 + stars×2 + followers×1 + repos×0.5)
firstAddedAt: timestamp
lastUpdatedAt: timestamp
addedBy: string ("discovery" | "search" | "admin")
```

**`city_meta` collection** — single document "main"
```
totalUsers: number
nextSlot: number (auto-increments atomically)
lastDiscoveryRun: timestamp
```

**`rank_history` collection** — daily snapshot documents (ID = date string "2025-03-06")
```
top100: array of {rank, login, score, totalStars, estimatedCommits}
```

### Firestore Indexes Required:
- `city_users`: composite index on `cityRank` ASC + `firstAddedAt` DESC
- `city_users`: index on `recentActivity` DESC
- `city_users`: index on `totalScore` DESC

### Realtime Database Structure:
```
/live/
  userCount: number
  lastUpdate: timestamp
  recentEvents: {
    [pushKey]: {
      type: "join" | "grow" | "rankUp"
      login: string
      detail: string
      timestamp: number
    }
  }
```

### Firestore Security Rules:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /city_users/{userId} {
      allow read: if true;
      allow write: if false; // server only
    }
    match /city_meta/{doc} {
      allow read: if true;
      allow write: if false; // server only
    }
    match /rank_history/{doc} {
      allow read: if true;
      allow write: if false; // server only
    }
  }
}
```

---

## 5. GITHUB API STRATEGY

### Token Rotation (lib/githubTokens.ts)

Three GitHub PATs stored in env vars. Every API call rotates to the next token. Three tokens × 5,000 requests/hour = 15,000 requests/hour. Enough for discovery + enrichment + refresh without ever hitting rate limits.

### User Discovery Strategy (No Hardcoded Names)

The `/api/github/discover` route runs these searches in parallel:

**Follower brackets** (overlapping to catch everyone):
- followers > 100,000
- followers 50,000–100,000
- followers 20,000–50,000
- followers 10,000–20,000
- followers 5,000–10,000
- followers 2,000–5,000
- followers 1,000–2,000
- followers 500–1,000
- followers 200–500
- followers 100–200

**Language-specific top developers** (10 languages × ~500 users each = 5,000):
- JavaScript, TypeScript, Python, Rust, Go, Ruby, Java, C++, Swift, Kotlin

**Repo count leaders** (prolific builders):
- repos > 500
- repos 200–500
- repos 100–200

**Recent rising stars**:
- followers > 500 created after 2022-01-01
- followers > 200 created after 2023-01-01

**Organizations**:
- type:org followers > 2,000

**Recently active**:
- repos > 50, followers > 100, pushed after 2025-01-01

Running 30 queries × up to 1,000 results each (10 pages × 100 per page) = up to 30,000 discovered users before deduplication. After deduplication realistically 8,000–15,000 unique real developers.

### Server-Sent Events Stream Route (`/api/github/stream`)

This is the key to fast loading. The route:
1. Runs all 30 discovery queries simultaneously using `Promise.allSettled`
2. For each discovered username not already in Firebase, fetches their full profile (user + repos + events) in a single batch of 3 parallel calls
3. Writes to Firebase Firestore with atomic slot assignment
4. Immediately sends the user data to the browser via SSE
5. Browser receives a new building every 50–200ms
6. City fills up visually as data streams in

### Single User Profile Route (`/api/github/[username]`)

Fetches: user profile + all repos (paginated, up to 100) + last 100 public events — all in parallel. Calculates: totalStars (sum all repo stars), topLanguage (most used by repo count), estimatedCommits (repos × 30 + push events × 15), recentActivity (events in last 30 days / max 100 × 100).

---

## 6. BUILDING GEOMETRY SYSTEM

### The Exact Building Construction

Each building is constructed from the minimum number of meshes needed for its tier:

**Tier 5 (tiny buildings, ranks 5001–20000):** 1 mesh — just the main body box. No roof feature. Canvas texture on faces showing simple window grid.

**Tier 4 (standard, ranks 201–5000):** 2 meshes — main body + flat roof cap (slightly wider than body, 0.5 units tall). Canvas texture on body faces.

**Tier 3 (tall, ranks 11–200):** 3 meshes — main body + roof cap + one roof feature (either helipad or small penthouse box). Canvas texture on body faces with horizontal floor bands.

**Tier 2 (towers, ranks 2–10):** 4–5 meshes — main body + floor band at 60% height + roof cap + roof feature + corner column LED strips (4 thin vertical boxes at corners, emissive). Canvas texture with floor divisions.

**Tier 1 (skyscraper, rank 1 only):** 6–8 meshes — main body + taper section + crown + 4 corner LED columns (full height, emissive gold) + antenna pole + beacon top block. The only building with a true tapered crown that narrows from 3×3 to 1×1 over 15 blocks.

### Canvas Texture Generation (lib/textureGenerator.ts)

Every building texture is generated once and cached. The texture is a 32×32 pixel canvas:

1. Fill with base language color at 80% brightness
2. Add pixel noise — randomly lighten or darken individual pixels by ±15% to simulate Minecraft's texture variation
3. Draw horizontal dark lines every 5 pixels (floor divisions)
4. Draw window grid: small 3×4 pixel bright rectangles in regular rows and columns. Window brightness depends on stars count. Window lit ratio (how many are bright) depends on recentActivity score.
5. Apply `THREE.NearestFilter` as magFilter and minFilter — this is THE most important setting for Minecraft look. Without it textures blur.
6. Apply to MeshLambertMaterial (NOT MeshStandardMaterial — Lambert is 3× faster and gives flat Minecraft shading)

### InstancedMesh Architecture

Buildings of the same geometric size (same height + same footprint) share one InstancedMesh. This is how thegitcity.com achieves performance. With 20,000 buildings, there might be 200 unique height/footprint combinations. 200 InstancedMesh instances render all 20,000 buildings in about 200 draw calls.

Each InstancedMesh has a maximum pre-allocated instance count of 200 to handle all developers of that size class.

Building position, color, and emissive state are passed through instance matrices and instance colors.

### LOD (Level of Detail) System

Using React Three Fiber's `<Lod>` component or a manual system:
- Within 80 units: full detail with all tier-appropriate meshes
- 80–200 units: simplified — just main body + roof cap, no detail meshes
- Beyond 200 units: single box only, colored appropriately, no texture detail

---

## 7. FIREBASE CLIENT INTEGRATION (lib/firebase.ts and lib/firestore.ts)

### Initialization

Firebase is initialized once in a singleton module. The config comes from environment variables. `getApps()` check prevents double-initialization in Next.js dev mode.

### Key Firestore Functions

**loadInitialCity(onUser, onProgress):** Reads the first 2,000 users from Firestore sorted by `cityRank`. Uses cursor-based pagination in batches of 200. Calls `onUser` for each one so buildings appear progressively. Takes 1–3 seconds for 2,000 users over a fast connection.

**subscribeToNewUsers(onUser):** Sets up a Firestore `onSnapshot` listener on `city_users` ordered by `firstAddedAt` descending, limit 10. Every time a new user is added anywhere in the world, this fires and the browser renders their building immediately.

**addUserToCity(userData, nextSlot):** Runs a Firestore transaction that atomically reads `nextSlot` from `city_meta`, assigns it to the user, writes the user document, and increments `nextSlot`. The transaction guarantees no two users ever get the same slot.

**refreshUserStats(login):** Updates an existing user's stats fields (estimatedCommits, totalStars, recentActivity, topRepos, cityRank, lastUpdatedAt) without changing their citySlot.

### Real-Time Database Feed

A Realtime Database listener on `/live/recentEvents` fires whenever a new event is pushed. The browser renders it in the bottom ticker within milliseconds. This is the live feed showing "user joined", "building grew", "rank changed" events scrolling at the bottom of the screen.

---

## 8. ZUSTAND STORE (lib/cityStore.ts)

The store holds the complete city state:

```typescript
{
  // All loaded users, keyed by login
  users: Map<string, GitHubUser>
  
  // Sorted array of logins by totalScore descending — determines slot assignment
  sortedLogins: string[]
  
  // Current city grid size
  gridSize: number // starts at 50, grows to 145
  
  // Pre-computed spiral slot positions
  slots: Array<{x: number, z: number, worldX: number, worldZ: number}>
  
  // UI state
  selectedUser: GitHubUser | null
  isNight: boolean
  isStreaming: boolean
  totalLoaded: number
  cameraMode: 'overview' | 'airplane'
  flyTarget: [number, number, number] | null
  
  // Actions
  addUser(user): void        // adds to map, re-sorts, may expand grid
  updateUser(user): void     // updates stats, triggers building re-render
  selectUser(user): void
  flyToUser(login): void
  setNight(v): void
}
```

When `addUser` is called, it adds to the Map, re-sorts `sortedLogins` by totalScore, and checks if `gridSize` needs to expand. Grid expands at 100, 500, 1000, 2500, 5000, 10000, 20000 users with predefined sizes up to 145×145.

---

## 9. PERFORMANCE TARGETS AND OPTIMIZATIONS

### Targets
- 60fps on modern desktop with 5,000 visible buildings
- 30fps on modern laptop with 10,000 visible buildings
- Initial city render in under 3 seconds (first 500 users from Firebase)
- Full 5,000 user city loaded in under 15 seconds

### Mandatory Optimizations

**InstancedMesh grouping:** All buildings of the same size use one InstancedMesh. 200 unique sizes × 100 instances each = 20,000 buildings in 200 draw calls.

**Frustum culling:** Three.js default, no extra work needed. At any camera angle, 50–70% of buildings are behind the camera and not rendered.

**LOD at 3 distances:** 80, 200, and 400 units. Only buildings within 80 units show full texture detail.

**Shadow optimization:** Shadow maps at 1024×1024 (not 2048). Only buildings within 100 units cast shadows. Shadows disabled on mobile.

**Texture atlas:** All building textures packed into one 512×512 atlas texture. One texture bind for all buildings.

**Lazy Firebase loading:** First load reads 2,000 users. Additional users load in batches of 500 as the user scrolls or moves the camera to new areas.

**React.memo on Building component:** Prevents re-render of unchanged buildings when any single building updates.

**frameloop demand on Canvas:** When the user is not moving (camera still, no animation), the Canvas stops rendering frames completely. Switches back to `always` on interaction or when airplane mode is active.

---

## 10. FILE STRUCTURE

```
src/
├── app/
│   ├── layout.tsx                    # Root layout: fonts, metadata
│   ├── page.tsx                      # Main page: city canvas + all HUD
│   └── api/
│       ├── github/
│       │   ├── [username]/route.ts   # Single user fetch + enrich
│       │   ├── stream/route.ts       # SSE: discovers + streams users
│       │   └── refresh/route.ts     # Refresh stats for user batch
│       └── city/
│           ├── users/route.ts        # Read from Firebase
│           └── add/route.ts          # Add user to Firebase
├── components/
│   ├── city/
│   │   ├── CityScene.tsx             # R3F Canvas, lights, sky, fog
│   │   ├── CityGrid.tsx              # Renders all buildings + gaps
│   │   ├── Building.tsx              # Single building: meshes, hover, click
│   │   ├── TechPark.tsx              # Park area, characters, fountain
│   │   ├── SittingCharacter.tsx      # Park dev character model
│   │   ├── Airplane.tsx              # Flyable plane model + controls
│   │   └── CameraController.tsx      # OrbitControls + fly-to animations
│   └── ui/
│       ├── SearchBar.tsx             # Search GitHub users
│       ├── ProfileModal.tsx          # Dev stats popup
│       ├── RankChart.tsx             # Top 100 leaderboard panel
│       ├── MiniMap.tsx               # 180×180 city overview canvas
│       ├── TopFiveWidget.tsx         # Always-visible rank 1–5 widget
│       ├── LiveFeed.tsx              # Bottom scrolling event ticker
│       ├── LoadingScreen.tsx         # Progress overlay while loading
│       ├── HUD.tsx                   # Assembles all UI overlays
│       └── Controls.tsx              # Collapsible controls hint
├── lib/
│   ├── firebase.ts                   # Firebase init singleton
│   ├── firestore.ts                  # All Firestore read/write functions
│   ├── realtimeDb.ts                 # Realtime DB listeners
│   ├── githubTokens.ts               # Token rotation pool
│   ├── cityLayout.ts                 # Grid math, slot → world position
│   ├── buildingGeometry.ts           # Building mesh + texture generation
│   ├── textureGenerator.ts           # Canvas-based block textures
│   ├── cityStore.ts                  # Zustand global store
│   ├── cityStream.ts                 # SSE consumer + localStorage cache
│   └── cityRefresh.ts               # Auto-refresh loop
└── types/
    └── index.ts                      # All TypeScript interfaces
```

---

## 11. BUILD ORDER FOR CLAUDE

Claude must build in this exact order to avoid import errors:

```
1.  Ask for Firebase config + GitHub tokens → create .env.local
2.  lib/githubTokens.ts → token rotation
3.  lib/firebase.ts → Firebase singleton
4.  lib/firestore.ts → all Firestore functions
5.  lib/realtimeDb.ts → Realtime DB listeners
6.  types/index.ts → all TypeScript types
7.  app/api/github/[username]/route.ts → working single user fetch
8.  app/api/github/stream/route.ts → SSE discovery stream
9.  lib/textureGenerator.ts → canvas block textures with NearestFilter
10. lib/buildingGeometry.ts → mesh generation for all 5 tiers
11. lib/cityLayout.ts → grid math + spiral slots
12. lib/cityStore.ts → Zustand store
13. lib/cityStream.ts → SSE consumer
14. components/city/CityScene.tsx → R3F Canvas (verify test box renders first)
15. components/city/Building.tsx → single building with hover + click
16. components/city/CityGrid.tsx → all buildings rendered side by side
17. components/city/TechPark.tsx → park with all elements
18. components/city/SittingCharacter.tsx → seated park characters
19. components/city/Airplane.tsx → plane model + flight physics
20. components/city/CameraController.tsx → full camera freedom
21. components/ui/ProfileModal.tsx → profile card with GitHub link
22. components/ui/SearchBar.tsx → search + permanent slot assignment
23. components/ui/RankChart.tsx → top 100 panel
24. components/ui/MiniMap.tsx → city overview canvas
25. components/ui/LiveFeed.tsx → ticker + Firebase listener
26. components/ui/TopFiveWidget.tsx → rank 1–5 widget
27. components/ui/HUD.tsx → assemble all UI
28. app/page.tsx → final assembly with dynamic import (ssr:false) for CityScene
29. Day/night transition system
30. InstancedMesh optimization pass
31. LOD system
32. Mobile touch controls
33. Final polish + performance testing
```

---

## 12. CRITICAL RULES THAT CANNOT BE BROKEN

1. `THREE.NearestFilter` on ALL textures — this alone makes buildings look like Minecraft instead of blurry
2. `MeshLambertMaterial` everywhere — flat shading = Minecraft aesthetic + 3× better performance vs MeshStandardMaterial
3. `'use client'` directive on every component that uses Three.js or React Three Fiber
4. CityScene must use `dynamic(() => import('./CityScene'), { ssr: false })` in page.tsx
5. The Canvas div must have explicit `width: '100vw', height: '100vh'` — without this nothing renders
6. Scene must have at least `<ambientLight>` and `<directionalLight>` — without lights, Lambert materials render pure black
7. Every building Group must have `userData.username` and `userData.user` set — required for click detection
8. Raycasting click handler must walk up the `.parent` chain to find the Group with userData
9. InstancedMesh `instanceMatrix.needsUpdate = true` must be called after setting any matrix
10. Firebase `citySlot` is set exactly ONCE and NEVER updated afterward — it is permanent
11. GitHub token rotation must be used on every API call — never use a single token
12. `NearestFilter` must be set AFTER creating the CanvasTexture, not before
13. Buildings 200+ units from camera must not show texture detail — pure colored box only
14. The "Built by Ashusriwastav07" credit must be present in the bottom of the UI at all times

---

## 13. WHAT TO SAY TO CLAUDE OPUS 4.6

Paste this entire document and start with:

*"Read this entire PRD and TRD. Before writing any code, ask me for my Firebase config values and GitHub PAT tokens. Create the .env.local file with my secrets first. Then follow the build order exactly as listed in section 11. After completing each step, confirm it works before moving to the next. Start with step 1: ask me for my secrets."*
```