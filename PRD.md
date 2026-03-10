# GIT WORLD – PRODUCT REQUIREMENTS DOCUMENT (PRD)
## Complete Feature Specification & User Guide
### Version 3.0 (Code-Accurate) | Next.js 16 + React 19 + Three.js

---

# EXECUTIVE SUMMARY

**Git World** is an interactive 3D city visualization of the global developer community. Developers appear as skyscrapers with height proportional to their GitHub activity. Users can explore the city in multiple modes: orbital exploration, first-person flight, trending repo visualization, developer search, and leaderboard ranking. Data is fetched from GitHub's public API and persisted in Supabase, with real-time updates as new developers are discovered. The experience begins with a 25-second cinematic intro, then presents a mode-select menu.

**Current Implementation Status:** All 5 core modes fully implemented and playable. All 4 geographic districts populated with data. Real-time streaming discovery active. Leaderboard updates daily. Tech Park character rendering is an incomplete stub. All major game mechanics and rendering are production-ready.

---

# 1. CORE MODES (5 Total)

## 1.1 EXPLORE MODE (GOLDEN)

**Description:** Orbital camera view of the entire city. Inspect individual developers, see their GitHub profiles, understand their activity metrics.

**Launch:** Main mode menu → EXPLORE button (gold #f5c518) or press `1`

**Camera System:**
- Orbit view: Developer city center (0, 0, 0)
- Zoom: Mouse wheel (scroll). Range: 50u to 500u radius
- Rotation: Right-click + drag or arrow keys (Left/Right)
- Vertical tilt: Arrow keys (Up/Down)
- Damping: 0.02 (smooth inertia, natural feel)
- Auto-rotate: Enabled when inactive >10 seconds (smooth constant rotation at 0.2°/frame)

**Developer Profile Inspection (Click on Building):**

| Metric | Display | Calculation Notes |
|--------|---------|-------------------|
| Name | GitHub username | Linked to GitHub profile |
| Avatar | 64×64 GitHub avatar | Auto-loaded, CDN |
| City Rank | #1–#10,000+ | Daily recalculated ranking |
| Total Score | Numeric value | commits×3 + stars×2 + followers + repos×0.5 + activity×10 |
| Languages | Primary language | Detected from top repositories |
| Followers | Count | GitHub followers |
| Repositories | Count | GitHub public_repos |
| Stars | Total across all repos | sum(repo.stargazers_count) |
| Bio | Text | GitHub user bio |
| Location | Text | GitHub user location |
| Company | Text | GitHub user company field |
| Recent Activity | Percentage 0–100 | Last 30 days public events |
| Top Repos | List of 5 | Sorted by star count |

**Profile Modal UI:**
- Window: 450px × 600px centered
- Font: Press Start 2P (10px) for labels, Space Mono for data
- Background: Translucent dark vignette with border
- Actions: Click "View on GitHub" (orange button) → Opens new tab
- Close: Click ✕ button or press Escape

**Building Appearance:**
- Height: Rank-based (Rank #1 = 78u always, rank 2-10 = 38-56u, rank 11+ = 14-4u)
- Color: Language-based (JavaScript=yellow, Python=blue, Rust=orange, etc.)
- Texture: Windows with lit/unlit ratio (night: 92-94%, day: 82-85%)
- Animation: Rise on initial load (7s easeOutBack, staggered by load order)
- Selection: Blue spotlight cone + pulsing ring on cursor hover
- Glow: Night only (language-colored, intensity 0.2)

**HUD Elements:**
- Top-left: **LOADING PROGRESS** (if city still loading, shows %)
- Bottom-right: **MINI MAP** (overhead view, white dot = camera, green dots = buildings)
- Center-bottom: **LIVE FEED** (new users ticker, max 5 items, scrolls up)
- Mode indicator: "EXPLORE" text (gold, 20px Press Start 2P, top-right corner)

**Day/Night Cycle:**
- Triggered: Click "TOGGLE NIGHT" button in HUD
- Duration: Smooth 3-second transition
- Lighting Changes:
  - Day: Bright ambient (1.1), warm directional (3.0), Sky component, white fog (#c9e8ff)
  - Night: Dark ambient (0.8, blue tint), cool directional (1.8), Stars (1500 count), navy fog (#0d0818)
  - Building emissive: ON (day: black 0, night: language color 0.2)
  - Windows: More lit at night (~92%), fewer during day (~82%)

**Performance:**
- Drawing: InstancedMesh + GPU rendering (2 draw calls total)
- Max buildings: 8,000 (hard capacity)
- Current city: Usually 5,000–7,000 developers
- Frame rate: 60fps target on modern GPUs

**Keyboard Shortcuts (Explore Mode):**
- Arrow keys: Rotate camera left/right, tilt up/down
- Mouse wheel: Zoom in/out
- Right-click + drag: Free camera rotation
- "T": Toggle night/day
- "H": Toggle HUD visibility
- Click building: Select developer
- Escape: Deselect / close profile

---

## 1.2 FLY MODE (CYAN)

**Description:** First-person flight simulation. Pilot a virtual aircraft through the 3D city. Experience the city from a dynamic, immersive perspective.

**Launch:** Main mode menu → FLY button (cyan #38bdf8) or press `2`

**Flight Physics:**

| Parameter | Value | Unit | Notes |
|-----------|-------|------|-------|
| Base speed | 40 | u/s | Forward movement speed |
| Vertical speed | 20 | u/s | Up/down movement speed |
| Bank angle limit | 60 | ° | Max roll rotation |
| Pitch rate | 0.6 | °/frame | Nose up/down rotation speed |
| Yaw rate | 0.7 | °/frame | Left/right heading rotation speed |
| Speed change | 0.5 | factor | Shift for sprint (1.5× speed) |
| Min altitude | 5 | u | Floor constraint |
| Max altitude | 300 | u | Ceiling constraint |
| Camera distance | 8 | u | 3rd-person distance behind aircraft |
| Camera height | 2.5 | u | Camera offset above fuselage |
| Camera lerp | 0.08 | factor | Smooth follow speed |

**All physics stored in refs (not React state) for zero GC during flight.**

**Controls:**

| Input | Action |
|-------|--------|
| W | Pitch nose UP |
| S | Pitch nose DOWN |
| A | Roll LEFT (bank) |
| D | Roll RIGHT (bank) |
| Q | Yaw LEFT (turn heading) |
| E | Yaw RIGHT (turn heading) |
| Space | Increase altitude (climb) |
| Ctrl | Decrease altitude (descend) |
| Shift | Sprint (1.5× speed multiplier) |
| Arrow Keys | Alternative controls (same as WASD/QE) |
| Escape | Exit flight, return to orbital camera |

**Camera:**
- Type: Third-person (aircraft visible ahead)
- Position: 8 units behind aircraft, 2.5 units above fuselage
- Follows with 0.08 lerp (smooth, not snappy)
- Yaw/pitch: Matches aircraft attitude automatically
- Look-ahead: Points toward nose direction

**Flight HUD (Top-left corner):**

```
ALT: 45u
HDG: 270°
SPD: 35 u/s
```

- Font: 20px Press Start 2P, golden color (#ffd700)
- Updates every frame
- Fades after 8s inactivity (hint text)
- Shows keyboard hints on first 5 seconds

**Exit Flight:**
- Press Escape
- Aircraft smoothly descends over 3 seconds
- Position lerps to EXIT_TARGET (80u, 55u, 160u) and rotates back to orbital view
- Smooth transition back to Explore mode

**Terrain Avoidance:**
- Minimum altitude enforced (can touch ground, not go below)
- Maximum altitude enforced (ceiling at 300u)
- No collision detection with buildings (can fly through)

**Lighting:**
- Follows day/night state from Explore mode
- Lighting updates in real-time
- Stars visible only at night (when altitude >100u)
- Fog respects day/night (blue day, navy night)

**Performance:**
- Frame rate: 60fps on modern hardware
- Physics refs pre-allocated: zero GC during flight
- Camera follows via lerp (smooth, not twitchy)

**Keyboard Shortcuts (Flight Mode):**
- All controls listed above
- Escape: Return to explore
- "T": Toggle night/day (while flying)
- "H": Toggle HUD (hide hints)

---

## 1.3 TRENDING MODE (ORANGE)

**Description:** Explore top trending repositories from the past week. Each repo appears as a building in a dedicated "Trending District." See real-time stats on repositories gaining popularity.

**Launch:** Main mode menu → TRENDING button (orange #fb923c) or press `3`

**Data Source:**
- Endpoint: `/api/trending` (cached 1 hour server-side)
- Update frequency: Weekly Monday UTC
- Refresh method: Automated cron job at 19:30 UTC

**Trending Repository List (Top 20):**

| Rank | Field | Display | Notes |
|------|-------|---------|-------|
| 1 | Repository | repo_full_name | owner/repo format |
| 2 | Primary Language | primary_language | Programming language |
| 3 | Weekly Stars | weekly_stars | Stars earned past 7 days |
| 4 | Total Stars | total_stars | All-time stars |
| 5 | Trending Position | trending_rank | 1–20 |
| 6 | Top Contributors | top_contributors | JSONB [{login, city_rank, contributions}, ...] |
| 7 | Description | description | GitHub repo description |
| 8 | Topics | topics | Tags/topics array |

**Building Representation:**
- Individual building per repo (in Trending District)
- Height: Fixed by rank (rank 1 = 78u, rank 2-5 = 60-70u, rank 6-10 = 50-60u, rank 11-20 = 40-50u)
- Color: Primary language color
- Position: Grid layout in Trending District (not spiral)
- Texture: Windows showing activity (lit ratio = weekly_stars / 1000, clamped 0.5–0.95)

**Trending District Views:**

**Main Repo Profile (Click on Trending Building):**
```
┌──────────────────────────────────┐
│  repo_full_name                  │
│  [View on GitHub] [Homepage]     │
│                                  │
│  Primary Language: TypeScript    │
│  Weekly Stars: 1,234             │
│  Total Stars: 45,678             │
│  Description: ...                │
│  Topics: api, framework, ...     │
│                                  │
│  Top Contributors:               │
│  1. @user1 (city_rank: 42)       │
│  2. @user2 (city_rank: 1234)     │
│  3. @user3 (city_rank: 567)      │
│                                  │
│  Activity (Last 7 Days):         │
│  [Chart: daily stars timeline]   │
└──────────────────────────────────┘
```

- Modal: 500px × 700px
- Font: Press Start 2P (labels), Space Mono (data)
- Close: Escape key or ✕ button

**Weekly Activity Chart:**
- 7 horizontal bars (one per day, Sun–Sat)
- Height proportional to daily_stars value
- Color: Language-based gradient
- Tooltip: Hover to see exact stars for that day

**Spotlight Highlight:**
- Selected repo building: Blue cone spotlight + pulsing ring glow
- Selection persists until new selection or close modal

**HUD (Trending District):**
- Top-left: **"TRENDING DISTRICT"** label (orange, 16px Press Start 2P)
- Bottom-right: **Legend** (language colors mapped)
- Center-left: **Repo counter** (e.g., "Showing 20 / 20 repos")
- Mode indicator: "TRENDING" (orange, top-right)

**Camera Behavior:**
- Orbital camera centered on Trending District (different center than main city)
- Zoom range: 30u–150u (tighter range, district is smaller)
- Recommended starting zoom: 80u

**Keyboard Shortcuts (Trending Mode):**
- Arrow keys: Rotate camera
- Mouse wheel: Zoom
- Right-click + drag: Free rotation
- Escape: Close any open repo modal
- Click repo: Open detailed profile
- "T": Toggle night/day
- "H": Toggle HUD

---

## 1.4 SEARCH MODE (GREEN)

**Description:** Find any GitHub user and add them to the city if not already present. Real-time search with instant feedback. See building appear on city grid.

**Launch:** Main mode menu → SEARCH button (green #34d399) or press `4`

**Search Bar UI:**
- Position: Center-right side panel
- Dimensions: 300px × 80px
- Background: Dark translucent vignette
- Font: Press Start 2P (14px)
- Placeholder: "Enter GitHub username..."
- Color theme: Green (#34d399)

**Search Interaction:**
1. Type GitHub username (case-insensitive)
2. Press Enter or click "SEARCH" button
3. API call to `/api/github/[username]`
4. If user not in city_users: POST to `/api/city/add`
5. If successful: Profile appears, building spawns on grid (animated rise)
6. If not found: Error message "User not found" (red text)
7. If already in city: Message "User already in city at #RANK" (yellow text)

**Profile Result (On Success):**
```
Found: ashusriwastav07
Location: San Francisco, CA
Company: Vercel
Followers: 1,234
Repos: 42
Stars: 5,678
Languages: TypeScript, Python, JavaScript
Added to city at slot #2,345
Building rising (7s animation)...
```

- Result box: 400px × 300px, centered
- Auto-close after 5s or on new search
- Manual close: Escape key or ✕ button

**Rate Limiting:**
- GitHub API rate: 5,000 req/hr per token
- Rotation: 3 PATs = 15,000 req/hr total capacity
- Per-user cooldown: None (new searches throttled client-side to 1/sec)

**Building Spawn (Found User):**
- Appears immediately in main city grid
- Position: Next available spiral slot
- Rise animation: 7 seconds (easeOutBack, full scale)
- Building stats: Calculated from fetched GitHub profile
- Immediately selectable in Explore mode

**HUD (Search Mode):**
- Top-left: **"SEARCH MODE"** label (green, 16px Press Start 2P)
- Below search bar: **Status** (searching..., found/not found, etc.)
- Mode indicator: "SEARCH" (green, top-right)

**Keyboard Shortcuts (Search Mode):**
- Enter: Submit search
- Escape: Clear search, return to menu
- Text input: Standard (backspace, arrow keys, etc.)

---

## 1.5 LEADERBOARD MODE (PURPLE)

**Description:** View the global ranking of developers by total_score. Sortable table with detailed stats. Real-time rank updates (recalculated daily at 19:45 UTC).

**Launch:** Main mode menu → LEADERBOARD button (purple #c084fc) or press `5`

**Data Source:**
- Query: `SELECT * FROM city_users ORDER BY total_score DESC LIMIT 100`
- Update frequency: Daily recalculation (19:45 UTC cron)
- Ranking formula: `totalScore = (commits×3) + (stars×2) + (followers×1) + (repos×0.5) + (activity×10)`

**Leaderboard Table Layout:**

| Column | Width | Type | Notes |
|--------|-------|------|-------|
| Rank | 60px | Numeric | 1–10,000+ |
| Avatar | 50px | Image | 48×48 GitHub avatar |
| Username | 150px | Link | GitHub username, clickable |
| Score | 100px | Numeric | Total score (sortable) |
| City Rank | 80px | Numeric | Position in city |
| Languages | 120px | List | Primary language |
| Followers | 100px | Numeric | GitHub followers (sortable) |
| Stars | 100px | Numeric | Total repo stars (sortable) |
| Last Updated | 120px | Timestamp | HH:MM:SS UTC |

**Table Features:**
- Sortable columns: Click header to sort ascending/descending
- Rows: 100 maximum (top developers)
- Scrollable: Vertical scroll if >15 visible rows
- Row height: 50px (includes avatar)
- Font: Space Mono (10px body, Press Start 2P for headers)
- Padding: 10px per cell
- Colors: White text on dark background, rank color gradient (gold for #1–#10, silver for #11–#100)

**Row Interaction (Click):**
- Opens developer profile modal (same as Explore mode)
- Shows full details: bio, location, company, top repos, etc.
- Close: Escape key or ✕

**Navigation & Pagination:**
- Buttons: "< PREVIOUS 100" and "NEXT 100 >" at bottom
- Shows: "Showing 1–100 of 10,234 total developers"
- Looping: Back button from rank 1–100 loops to final page

**HUD (Leaderboard Mode):**
- Top-left: **Search/filter box** (filter by language, company, etc.) – TODO (not yet implemented)
- Top-right: **Mode indicator** "LEADERBOARD" (purple, 16px Press Start 2P)
- Bottom-center: **Pagination controls** (as above)
- Status: **Last recalculated** timestamp (e.g., "Updated 14:30 UTC")

**Keyboard Shortcuts (Leaderboard Mode):**
- Arrow keys: Scroll table up/down
- Enter: Select highlighted row (open profile)
- Escape: Close any open profile modal
- "R": Refresh table (client-side, no new server call)
- Click row: Open profile directly

---

# 2. GEOGRAPHIC DISTRICTS (4 Total)

## 2.1 Main Developer City (Spiral Grid)

**Description:** The primary 3D city where all discovered developers are placed. Uses Ulam spiral layout to organize developers by ranking.

**Coordinates:** Center: (0, 0, 0)
**Grid Dimensions:** 145 × 145 slots
**Slot Spacing:** SLOT_PITCH = 5.0 units
**Total Area:** ~725 × 725 units

**Building Placement Algorithm:**
1. Assign slot number (0, 1, 2, ...) based on discovery order
2. Convert slot → spiral grid coordinates (Ulam spiral)
3. Check if inside park zone (skip if yes)
4. Convert → world coordinates (multiply by SLOT_PITCH)
5. Cache valid position
6. Calculate building dimensions (rank, commits, starred repos determine height)

**Height Variation by Rank:**
- Rank #1: Always 78u (visual anchor)
- Rank #2–10: 38–56u (with setback decorators)
- Rank #11–200: 14–35u (tall buildings)
- Rank #201–5,000: 4–15u (medium buildings)
- Rank #5,001+: 2–5u (filler buildings)

**Width & Depth:**
- Formula: `width = base + repos / max_repos × variation`
- Width range: 0.7u–2.5u
- Depth range: 0.6u–2.4u
- Randomness: Deterministic per-slot (same slot = same building) using seed-based pseudo-random

**Texture Details (Window Patterns):**
- 32×32 pixel canvas, 6×6 window grid
- Lit windows: 45% language-colored (language hue), 55% random accent (from 24-color palette)
- Unlit windows: Colored darkness (accent at 15–25% opacity on dark background)
- Noise pattern: 60 random white pixels overlaid
- Scanlines: Horizontal 8px spacing (retro aesthetic)
- Vignette: Dark gradient on right edge

**Lighting & Emissive:**
- Day: MeshLambertMaterial, no emissive, white ambient
- Night: MeshLambertMaterial, language-colored emissive (0.2 intensity), blue ambient
- Smooth transition: 3 seconds between states

**Park Zones (Collision Detection):**
- Tech Park (northwest corner): Skipped during spiral placement
- Silicon Valley Park (northeast corner): Skipped during spiral placement
- Ensures buildings never render inside park areas

**Street Lights:**
- PointLights placed every 4 slots
- Orange color (#ff8c00), 1.5 intensity
- Visible both day and night
- Add ambient street-level lighting

**Minecraft Aesthetic Ground:**
- 64×64 pixel canvas with grass texture pattern
- Repeating pattern (green grass top + brown dirt sides)
- NearestFilter for blocky pixel appearance
- Covers entire ground plane

**Performance:**
- All buildings: InstancedMesh (single GPU draw call)
- Camera: Orbital controls with damping
- Max buildings: 8,000 (hard limit, capacity)
- Typical city: 5,000–7,000 developers at any time

---

## 2.2 Silicon Valley Park (SV District)

**Description:** Dedicated zone representing the tech giants. Four company campuses (Apple, Google, NVIDIA, Meta) along with eight language programming districts.

**Location:** Northeast corner of main city
**Coordinates:** Center: (200, 0, 200)
**Size:** ~150u × 150u

**Four Tech Campuses:**

### Apple Quadrant
- Position: Northwest quadrant of SV Park
- Theme: Sleek, minimalist design
- Buildings: Top Apple-affiliated open-source contributors
- Color: Silver/white
- Spotlight: Cool white

### Google Quadrant
- Position: Northeast quadrant of SV Park
- Theme: Colorful, multi-language focus
- Buildings: Google engineers across all languages
- Color: Multi-color (Google brand colors)
- Spotlight: Warm gold

### NVIDIA Quadrant
- Position: Southeast quadrant of SV Park
- Theme: Technical computing, GPU-focused
- Buildings: NVIDIA/AI-focused developers
- Color: Green (brand color)
- Spotlight: Bright cyan

### Meta Quadrant
- Position: Southwest quadrant of SV Park
- Theme: Social infrastructure
- Buildings: Meta engineers
- Color: Blue (brand color)
- Spotlight: Electric blue

**Eight Language Districts:**

Around the park perimeter, eight programming languages are represented:

| Language | Color | Sample 3 | Features |
|----------|-------|---------|----------|
| JavaScript | #FFD700 (gold) | 1,500+ devs | Most popular |
| Python | #3776AB (blue) | 1,200+ devs | Data science |
| Rust | #CE422B (red) | 800+ devs | Systems |
| Go | #00ADD8 (cyan) | 600+ devs | Backend |
| TypeScript | #3178C6 (blue) | 1,000+ devs | Type-safe |
| Java | #FF7F00 (orange) | 900+ devs | Enterprise |
| C++ | #00599C (blue) | 700+ devs | Performance |
| C# | #239120 (green) | 650+ devs | .NET |

**Language Monument:**
- Central structure: LanguageMonument component
- Displays top contributor per language
- Rotating/pulsing animation
- Clickable: Open top 10 devs for that language

**Burj Khalifa Tower (Central Landmark):**
- Tallest building in SV Park
- Position: Center
- Height: 150u (visual anchor)
- Color: Gradient (gold at base → white at top)
- Lighting: Always emits (day/night)
- Function: Visual landmark, reset camera position

**Flying Banners:**
- 3 orbiting banners around central tower
- Text: "Silicon Valley Dev Summit" (animated scroll)
- Colors: Cycle through company colors
- Orbit speed: 0.5 rev/min
- Height: 80–120u

**Data Population:**
- Endpoint: `/api/silicon-valley/contributors`
- Update: Daily 19:30 UTC cron job
- Company buildings: Top 15 devs per company
- Language buildings: Top 15 devs per language

**Camera Behavior (if visiting SV Park):**
- Zoom focuses on park center (Burj tower)
- Zoom range: 40u–180u
- Default orbit point: (200, 0, 200) instead of (0, 0, 0)

---

## 2.3 Trending District

**Description:** Dedicated zone for trending repositories. 20 buildings representing top trending repositories from past 7 days.

**Location:** Southwest corner of main city
**Coordinates:** Center: (-150, 0, -150)
**Size:** ~120u × 80u

**Building Layout:**
- Grid arrangement: 5 columns × 4 rows
- Spacing: 20u between buildings
- Heights: Fixed per rank (rank 1 = 78u, 2–5 = 60–70u, 6–10 = 50–60u, 11–20 = 40–50u)
- Colors: Primary language hue

**Building Appearance:**
- Texture: Windows lit based on weekly_stars (higher stars = more lit)
- Animation: Pulsing glow proportional to weekly activity
- Hover: Spotlight + selection ring (same as main city buildings)
- Click: Opens trending repo profile modal

**Trending Details Panel:**

When clicking a trending repo building:

```
┌─────────────────────────────────────────────┐
│ owner/repo                                   │
│ [GitHub] [Homepage]                          │
│                                              │
│ Primary Language: TypeScript                 │
│ Weekly Stars: +1,234                         │
│ Total Stars: 45,678                          │
│ Forks: 2,345                                 │
│ Open Issues: 89                              │
│                                              │
│ Description: ...                             │
│ Topics: api, framework, cli, ...             │
│                                              │
│ Top Contributors:                            │
│   1. @user1 (city_rank: 42)                 │
│   2. @user2 (city_rank: 567)                │
│   3. @user3 (city_rank: 1,234)              │
│                                              │
│ Activity Chart (Last 7 Days):               │
│ ▁ ▂ ▃ ▄ ▅ ▆ ▇                               │
│ Sun Mon Tue Wed Thu Fri Sat                 │
└─────────────────────────────────────────────┘
```

- Modal: 550px × 750px
- Sortable columns: No (display only)
- Close: Escape or ✕

**Top Contributors Linking:**
- Click contributor name → Opens main city, centers camera on that developer
- Building highlights with spotlight
- Profile modal opens
- Allows exploration of contributors

**Update Frequency:**
- Source: `/api/trending` endpoint
- Server cache: 3600s (1 hour)
- Refresh: Weekly Monday UTC via `/api/trending/refresh` cron
- Manual refresh: Not available to users

**Camera Behavior (if visiting Trending District):**
- Zoom focuses on Trending District center
- Zoom range: 30u–150u
- Default orbit point: (-150, 0, -150)

---

## 2.4 Tech Park (Incomplete / Placeholder)

**Description:** Area designated for interactive experiences, educational content, and community features.

**Location:** Northwest corner of main city
**Coordinates:** Center: (-200, 0, -200)
**Status:** STUB IMPLEMENTATION (component exists, but features not complete)

**Intended Features (Planned, Not Implemented):**
- Animated character/avatar (incomplete)
- Educational content panels
- Community events display
- Interactive games/mini-games
- Achievement showcase

**Current Implementation:**
- PocketPark component renders static landscape
- ParkCharacter component is placeholder (no animation)
- Buildings grid area exists but empty
- Camera zoom works same as other districts

**Future Development:**
- Character rigging and animation
- Content management interface
- Interactive event system
- Performance optimization for complex geometries

---

# 3. CINEMATIC INTRO (25 Seconds)

**Description:** Immersive opening sequence that Sets the tone, explains the concept, and transitions to interactive mode. Plays automatically on first page load.

**Total Duration:** 25 seconds

**Timeline Breakdown:**

| Time | Screen | Content | Animation | Audio |
|------|--------|---------|-----------|-------|
| 0.0–2.5s | Darkness | Fade in from black | Alpha blend (0→1) | Ambient hum |
| 2.5–10.0s | Quote | "The GitHub city..." | Typewriter effect (45ms/char) | Soft piano |
| 10.0–16.0s | Stats | Total devs, repos, stars | Count-up animation (easeOutExpo) | Data blip sfx |
| 16.0–21.0s | Title | "GIT WORLD" title | Fade in + scale (0.8→1.0) | Uplifting music |
| 21.0–25.0s | Descent | Camera descends, city rises | Buildings rise animation (7s start) | Music crescendo |

**Font & Styling:**
- Primary font: Press Start 2P (pixel aesthetic)
- Color: White text on dark background
- Text size: 24px–48px depending on screen
- Smooth fade transitions: 0.4s between screens

**Key Events:**

**Canvas Mount:**
- Triggered: 15 seconds into intro
- Action: Three.js Canvas mounts to DOM
- Effect: City rendering begins, initial building load starts

**Buildings Rise:**
- Triggered: 21 seconds into intro (building starts)
- Duration: 7 seconds (overlaps final 4 seconds of intro)
- Effect: All buildings scale up from 0.001 → 1.0 (easeOutBack)
- Stagger: Each building delayed 20ms from previous (smooth spread)

**Skip Intro:**
- Triggered: Any mouse click during intro
- Action: Jump immediately to mode menu
- Buttons appear: 5 mode buttons (Explore, Fly, Trending, Search, Leaderboard)

**Ending Transition:**
- Auto-play: Plays in full unless skipped
- Next screen: Mode menu (5 buttons)
- Auto-close: Mode menu waits for user selection (no timeout)

---

# 4. MODE SELECTION MENU

**Description:** Simple overlay with 5 buttons, one per playable mode. Appears after intro or on demand (press M).

**UI Layout:**
- Position: Center of screen
- Dimensions: 500px × 350px
- Background: Dark translucent vignette, 95% opacity
- Border: Thin golden line (2px)
- Font: Press Start 2P (20px)

**Five Mode Buttons:**

```
┌───────────────────────────────────┐
│       CHOOSE YOUR MODE            │
├───────────────────────────────────┤
│  [EXPLORE]      – Orbit the city  │
│  [FLY]          – Pilot aircraft  │
│  [TRENDING]     – Top repos       │
│  [SEARCH]       – Find developers │
│  [LEADERBOARD]  – Top 100 devs    │
└───────────────────────────────────┘
```

**Button Styling:**

| Button | Color | Hex | Description |
|--------|-------|-----|-------------|
| EXPLORE | Gold | #f5c518 | Default, orbital camera |
| FLY | Cyan | #38bdf8 | Flight simulator mode |
| TRENDING | Orange | #fb923c | Top repos visual |
| SEARCH | Green | #34d399 | Find users |
| LEADERBOARD | Purple | #c084fc | Rankings table |

**Button Interaction:**
- Hover: Highlight with glow effect
- Click: Launch selected mode
- Keyboard: No hotkey (must click or use arrow nav)

**Navigation:**
- Arrow keys: Up/down to select different buttons
- Enter: Activate selected button
- Escape: Keep menu open (no return to previous mode once game started)

**First Load Behavior:**
- Shows after cinematic intro completes
- Default selection: EXPLORE button (highlighted)
- Keyboard focus: Enabled (arrow keys work immediately)

---

# 5. HUD OVERLAYS

## 5.1 Main HUD (All Modes)

**Components Present in Every Mode:**

**Top-Left Corner:**
- Mode indicator (EXPLORE / FLY / TRENDING / SEARCH / LEADERBOARD)
- Font: 16px Press Start 2P, golden color
- Loading progress (if city loading): "80% Loading..."

**Bottom-Right Corner:**
- Mini map (overhead view, 200×200px)
- White dot: Current camera position
- Green dots: Buildings (if exploring)
- Scale: 1px = 4 units
- Update: Every frame

**Center-Bottom:**
- Live feed ticker (new users joining city)
- Max items: 5 visible
- Scroll direction: Upward (newest at bottom)
- Font: Space Mono (10px)
- Format: "@username joined the city! (Rank #2,345)"
- Fade out: After 10s displayed

**Bottom-Left:**
- FPS counter (optional, dev build only)
- Format: "60 FPS"
- Font: Space Mono (10px)

**Toggle HUD:**
- Press: H key
- Effect: Hides all overlays except mode indicator
- Use case: Screenshot, video recording

---

## 5.2 Explore HUD Additions

**Profile Modal** (when developer selected):
- Position: Center (modal overlay)
- Dimensions: 450px × 600px
- Font: Press Start 2P (labels), Space Mono (data)
- Buttons: "View on GitHub" (orange), close (✕)

---

## 5.3 Flight HUD Additions

**Aircraft Instruments** (top-left, golden):
```
ALT: 45u
HDG: 270°
SPD: 35 u/s
```
- Updates every frame
- Fades after 8s idle (hint: "Press F1 for help")
- Font: 20px Press Start 2P

**Flight Controls Display:**
```
W/↑ UP     S/↓ DOWN
A/← LEFT   D/→ RIGHT
Q TURN LEFT  E TURN RIGHT
SPACE: Climb   CTRL: Descend
SHIFT: Sprint
ESC: Exit
```
- Appears on first flight enter
- Auto-hides after 5 seconds of flight
- Reappear: Idle for 10s or press F1

---

## 5.4 Leaderboard HUD Additions

**Pagination Controls** (bottom-center):
- Previous 100 button (if not on first page)
- Next 100 button (if not on last page)
- Current page indicator: "Page 1 of 104" (showing 1–100 of 10,400 devs)

**Last Updated Timestamp:**
- Format: "Last updated 14:30 UTC"
- Updates annually at 19:45 UTC when cron recalcs

---

# 6. KEYBOARD SHORTCUTS (All Modes)

| Key | Action | Mode Availability |
|-----|--------|-------------------|
| Arrow Keys | Camera rotate / move | Explore, Flight (alt controls) |
| Mouse Wheel | Zoom camera | Explore, Trending |
| Right-click + Drag | Free camera rotation | Explore, Trending |
| T | Toggle night/day cycle | All |
| H | Toggle HUD visibility | All |
| M | Open mode menu | Explore, Fly (from orbital) |
| Escape | Close modals / exit mode | All |
| Click Building | Select developer / open profile | Explore, Trending |
| W/S/A/D | Pitch / roll aircraft (Flight) | Flight only |
| Q/E | Yaw aircraft | Flight only |
| Space/Ctrl | Climb / descend | Flight only |
| Shift | Sprint (1.5× speed) | Flight only |
| Enter | Submit search / Select leaderboard row | Search, Leaderboard |
| 1–5 | Quick-select mode (buttons may not be available) | Menu (future feature) |

---

# 7. DATA UPDATES & REFRESH CYCLES

## Real-Time Updates

**New User Discovery:**
- Endpoint: `/api/github/stream` (SSE)
- Frequency: Continuous (5-minute streams)
- Trigger: Every 5 minutes (cron job)
- Transport: Server-Sent Events (no polling)
- Effect: New building appears in city, live feed ticker updates

**New Trending Repos:**
- Endpoint: `/api/trending`
- Frequency: Weekly Monday UTC
- Trigger: `/api/trending/refresh` cron at 19:30 UTC
- Effect: Trending District buildings update

**Daily Rank Recalculation:**
- Endpoint: `/api/cron/recalculate-ranks`
- Frequency: Daily
- Trigger: 19:45 UTC cron job
- Effect: All city_rank values updated, leaderboard re-sorted

**Silicon Valley Park Refresh:**
- Endpoint: `/api/silicon-valley/refresh`
- Frequency: Daily
- Trigger: 19:30 UTC cron job
- Effect: Company campus and language district buildings re-populated with top contributors

---

# 8. BROWSER COMPATIBILITY

**Officially Tested:**
- Chrome 120+ (recommended)
- Firefox 121+
- Safari 16+
- Edge 120+

**Recommended Specs:**
- GPU: Dedicated graphics card (3D rendering)
- Memory: 4GB RAM minimum
- CPU: Modern multi-core (2020+)
- Internet: Broadband (10+ Mbps for GitHub API calls)

**Known Limitations:**
- Mobile touch controls not implemented (keyboard-only)
- Service worker not implemented (no offline mode)
- Audio not implemented (silent app)

---

# 9. PERFORMANCE CHARACTERISTICS

| Metric | Value | Note |
|--------|-------|------|
| City load time | 5–15s | Depends on internet, GitHub API rate |
| Initial render | <1s | After load complete |
| Camera movement | 60 FPS target | Most modern GPUs |
| Flight mode | 60 FPS target | Physics in refs (low GC) |
| New user render | <100ms | InstancedMesh update |
| Building texture generation | <50ms per building | Cached by stats bucket |

---

# 10. LIMITATIONS & KNOWN ISSUES

### Not Implemented (By Design):
- User authentication (public explore-only)
- Custom user profiles / bio editing
- Comment system / social features
- Sound/audio engine
- Mobile touch controls
- Service worker / offline mode
- Avatar CDN optimization / compression
- Auto-save / session persistence

### Incomplete Features (Stub/Placeholder):
- Tech Park character animation (model exists, animation missing)
- Tech Park interactive content (structure exists, no content)
- Building mesh decorators (specs exist, simplified rendering)
- Language filtering on leaderboard (UI not implemented)

### Technical Debt:
- Magic numbers hardcoded (50+ constants throughout code)
- No API input validation (silently corrupt data possible)
- Minimal error boundaries (only 3D scene covered)
- No client-side logging/telemetry
- GitHub token rotation untested at production scale
- No automated tests (unit, integration, E2E)
- Zustand store mutations could be cleaner
- Supabase schema missing some indexes

---

# 11. FUTURE ROADMAP (Planned)

✅ All core modes implemented and playable
✅ All geographic districts populated
❌ Tech Park character animation
❌ Leaderboard filtering/sorting UI
❌ Sound effects and background music
❌ Mobile touch controls
❌ User authentication and profiles
❌ Social features (comments, follows, etc.)

---

**END OF PRD v3.0 (Code-Accurate)**
