# Git World — Product Requirements Document (v2)

**Revision Date:** January 2026  
**Status:** Implementation Complete — As-Built Documentation

---

## 1. Product Overview

### 1.1 What It Is
Git World is a 3D Minecraft-styled city where every building represents a real GitHub developer. The city grows automatically as the system discovers active GitHub users through periodic searches. Users can explore the city in day or night mode, fly over buildings in airplane mode, search for their own building, view live leaderboards, and visit three special districts:

1. **Main City Grid** — 145×145 spiral layout with up to 21,025 building slots
2. **Silicon Valley Park** (200×200) — Features 4 company campuses (Apple, Google, NVIDIA, Meta) and 8 language districts (Python, JavaScript, TypeScript, Java, Rust, Go, C++, Kotlin), plus a Burj Khalifa tower in the center
3. **Trending District** (100×100) — Displays the top 20 trending GitHub repositories of the week as buildings with billboard signage

### 1.2 Who It's For
- GitHub developers who want to see their profile visualized as a 3D building
- Developer community explorers curious about top contributors by company or language
- Anyone interested in discovering trending GitHub projects through a gamified interface

### 1.3 Core Value Proposition
Git World transforms abstract GitHub activity data into a visually engaging, explorable 3D space. Developers are automatically added to the city without manual registration. Building height, width, and visual decoration reflect real metrics: commits, stars, followers, repositories, and recent activity. The system updates daily and maintains a live leaderboard showing real-time rankings.

---

## 2. Website URL & Identity

- **Domain:** Not specified in code — deployment uses Vercel hosting
- **Title:** Git World
- **Meta Description:** "Your GitHub activity, visualized as a Minecraft city. Explore developers as 3D buildings ranked by commits, stars, and contributions. Built by Ashusriwastav07."
- **Favicon:** `/favicon.png`
- **Open Graph Image:** `/Logo.png`
- **Creator Credit:** Ashusriwastav07 (displayed in cinematic intro and footer)

---

## 3. User Journey

### 3.1 Initial Visit (First 32.5 Seconds)

#### Phase 1: Loading Screen (0–2.5s)
- Black screen with breathing glow animation
- Progress bar at bottom

#### Phase 2: Typewriter Quote (2.5–10s)
- Centered quote with typewriter effect:
  > "Every line of code is a brick in the foundation of innovation."

#### Phase 3: Statistics Count-Up (10–16s)
- Three animated counters:
  - Number of developers in city
  - Total buildings built
  - Programming languages represented

#### Phase 4: Title Card (16–21s)
- Large pixelated "GIT WORLD" logo
- Subtitle: "BUILT BY ASHUSRIWASTAV07"

#### Phase 5: Fade-Out (21–25s)
- Screen fades to black
- 3D city begins rendering behind overlay at 15 seconds
- Buildings rise from ground (cinematic animation) at 25 seconds

#### Phase 6: Camera Sweep (15–32.5s)
- Camera automatically descends from altitude 250 to altitude 55
- Orbits 320° around city center
- Stops on any user interaction (mouse, keyboard, touch)

#### Phase 7: Mode Menu (32.5s+)
- Five mode buttons appear:
  1. **EXPLORE CITY** (🏙️) — Free camera navigation with WASD
  2. **FLY OVER CITY** (✈️) — First-person airplane mode with physics
  3. **TRENDING REPOS** (📊) — Auto-fly to Trending District
  4. **FIND MY BUILDING** (🔍) — Search bar to locate user by GitHub login
  5. **LEADERBOARD** (🏆) — Full-screen rankings chart

### 3.2 Explore Mode (default)
- **Camera:** Orbital third-person view
- **Controls:**
  - **Mouse Drag:** Rotate camera
  - **Scroll Wheel:** Zoom in/out
  - **WASD Keys:** Pan camera horizontally
  - **Right-Click Drag:** Pan camera
  - **N Key:** Toggle day/night
  - **R Key:** Open rankings panel
  - **Esc Key:** Close panels / return to menu
- **Interactions:**
  - **Click building:** Show profile panel on right side (avatar, name, bio, stats, top repos)
  - **Click ground or sky:** Deselect building, close panel
- **HUD Elements:**
  - Top bar: Logo, building count, LIVE indicator, GitHub stars badge, RANKINGS button, day/night toggle
  - Bottom-left: MENU button, controls legend, minimap
  - Bottom-right: Top 5 users widget
  - Bottom-center: Search bar
  - Bottom ticker: Live feed of new users joining

### 3.3 Fly Over City (Airplane Mode)
- **Entry:** Click FLY OVER CITY button in mode menu
- **Plane:** 3rd-person view of procedurally generated airplane
- **Physics:**
  - Speed: 40 units/sec (constant forward motion)
  - Altitude speed: 20 units/sec
  - Min altitude: 5 units
  - Max altitude: 300 units
- **Controls:**
  - **W/S:** Pitch up/down
  - **A/D:** Yaw left/right
  - **Q/E:** Increase/decrease altitude
  - **Esc:** Exit airplane mode
- **HUD:** Shows ALT (altitude), HDG (heading 0–360°), SPD (speed 40)
- **Exit Animation:** Plane fades out, camera smoothly transitions back to explore mode

### 3.4 Trending Repos Mode
- **Entry:** Click TRENDING REPOS button
- **Auto-Fly:** Camera flies to Trending District at coordinates (-120, 120)
- **District Layout:** 5×4 grid (20 slots) with 15-unit spacing
- **Buildings:** Each represents one of the top 20 trending repos this week
- **Billboard:** "This Week Famous Repos" entrance sign
- **Interactions:** Click building to view repo panel (name, stars, forks, language, topics, contributors, daily star history chart)

### 3.5 Find My Building (Search)
- **Entry:** Click FIND MY BUILDING button or use bottom-center search bar
- **Search:** Type GitHub username (auto-complete suggestions)
- **Result:** Camera flies to user's building (offset right for panel visibility), displays profile panel
- **Fallback:** If user not in city, shows "Join Toast" button to manually add them via discovery API

### 3.6 Leaderboard Mode
- **Entry:** Click LEADERBOARD button or press R key
- **Display:** Full-screen overlay with scrollable rankings
- **Columns:** Rank, Avatar, Name, Score, Stars, Commits, Language
- **Sorting:** By total_score (commits×3 + stars×2 + followers×1 + repos×0.5 + activity×10)
- **Exit:** Click X or press Esc

---

## 4. Mode System (5 Modes)

### 4.1 Menu Mode
- **When Active:** After intro completes (32.5s+) or when user presses Esc from explore mode
- **State:** `activeMode = 'menu'`
- **Behavior:** Shows 5-button mode selection overlay, hides HUD

### 4.2 Explore Mode
- **When Active:** Default after picking EXPLORE CITY, or when Esc pressed during intro sweep
- **State:** `activeMode = 'explore'`, `flightMode = false`
- **Behavior:** Full HUD visible, orbital camera with WASD panning

### 4.3 Fly Mode
- **When Active:** After clicking FLY OVER CITY
- **State:** `activeMode = 'fly'`, `flightMode = true`
- **Behavior:** Airplane physics active, flight HUD replaces standard HUD, explore HUD hidden

### 4.4 Trending Mode
- **When Active:** After clicking TRENDING REPOS
- **State:** `activeMode = 'trending'`
- **Behavior:** Camera flies to (-120, 120), HUD visible, trending district highlighted

### 4.5 Search Mode
- **When Active:** After clicking FIND MY BUILDING
- **State:** `activeMode = 'search'`
- **Behavior:** Search bar focused, HUD visible, results auto-fly to buildings

### 4.6 Leaderboard Mode (UI-only, not a camera mode)
- **When Active:** Rankings panel open (via R key or RANKINGS button)
- **State:** `rankingsOpen = true` (separate from activeMode)
- **Behavior:** Full-screen overlay, explore mode still active underneath

---

## 5. Features Specification

### 5.1 Main City Grid

#### 5.1.1 Layout Geometry
- **Grid Size:** 145×145 (21,025 total slots)
- **Slot Pitch:** 5 units between building centers
- **Building Size:** 3 units base width/depth
- **Gap:** 2 units minimum between buildings
- **Coordinate System:** Spiral layout starting from center (0, 0), radiating outward
- **Reserved Zones:**
  - **Tech Park:** 50×50 square centered at (0, 0) — slots 0–2499 reserved
  - **Silicon Valley Park:** 200×200 rectangle centered at (75, 75) — slots subtracted from spiral
  - **Trending District:** 100×100 rectangle centered at (-120, 120) — slots subtracted from spiral

#### 5.1.2 Building Dimensions Formula
- **Input:** `cityRank` (user's position in global score ranking), `estimatedCommits`
- **Base Height:** Inverse of rank → `1000 / (cityRank + 10)`
- **Commit Bonus:** `(estimatedCommits / 500) * 5` capped at +20 units
- **Final Height:** Base + Commit Bonus
- **Width/Depth:** Fixed at 3 units for all buildings

#### 5.1.3 Building Tiers (5 Levels)
- **Tier 1 (Rank 1–10):** 3-level setback crown, golden beacon antenna, 4 vertical LED strips, blue emissive glow
- **Tier 2 (Rank 11–20):** No decoration
- **Tier 3 (Rank 21–30):** No decoration
- **Tier 4 (Rank 31–40):** No decoration
- **Tier 5 (Rank 41+):** No decoration

*Note: Original design planned decorations for tiers 2–5 (spires, antennas, neon signs, rooftop gardens) but only Tier 1 crown is currently implemented.*

#### 5.1.4 Building Materials
- **Day Mode:**
  - Body: Procedurally generated window texture with language-themed accent colors
  - Windows: 85% lit (semi-transparent grid pattern)
  - Base tint: Language color (26 predefined colors mapped to programming languages)
  - Background: 60 random stars per texture
- **Night Mode:**
  - Body: Same window texture
  - Windows: 94% lit with emissive glow (intensity 0.4)
  - Texture cached per user for performance (single 32×32 canvas texture)

#### 5.1.5 Rendering Method
- **System:** InstancedMesh with 2 instances (body + glow layer)
- **Max Capacity:** 8,000 buildings rendered simultaneously
- **Geometry:** Single shared BoxGeometry for all instances
- **Materials:** Pre-built day/night materials (swapped on toggle, never recreated)
- **Tinting:** Per-instance color via `instanceColor` attribute
- **Selection Ring:** Yellow circle appears at base of selected building
- **Rise Animation:** Buildings scale from 0 to 1 during cinematic intro (easeOutBack easing, triggered at 25s)

#### 5.1.6 Score Calculation
```
total_score = floor(
  estimated_commits * 3
  + total_stars * 2
  + followers * 1
  + public_repos * 0.5
  + recent_activity * 10
)
```
- **estimated_commits:** Count of PushEvent, PullRequestEvent, IssuesEvent in last 90 days × 3.5
- **recent_activity:** Count of any events in last 30 days (capped at 100)

#### 5.1.7 Ground & Environment
- **Ground Plane:** 2000×2000 Minecraft grass texture (64×64 procedural canvas with green blocks)
- **Street Lights:** Positioned every N units along grid axes (not in code — placeholder feature)
- **Sky (Day):** `<Sky />` component from @react-three/drei with default sun position
- **Sky (Night):** 1500 white stars (`<Stars />` component) + dark blue fog (#0d0818, 200–800 range)
- **Fog (Day):** Light blue (#c9e8ff, 300–1000 range)

#### 5.1.8 Lighting
**Day Mode:**
- Ambient: #ffffff × 1.1
- Directional (sun): #fffcee × 3.0 at position (100, 200, -50)
- Directional (fill): #ccddff × 0.8 at position (-100, 150, 100)

**Night Mode:**
- Ambient: #445577 × 0.8
- Directional (moon): #6688cc × 1.8 at position (50, 150, 100)
- Point light (orange): #ff5500 × 2.5 at (-200, 100, -200)
- Point light (blue): #4488ff × 1.5 at (200, 80, 200)

---

### 5.2 Profile Panel (Building Details)

#### 5.2.1 Trigger
- Click any building in main city or Silicon Valley Park
- Search for a username and select result

#### 5.2.2 Display Position
- Right side of screen (fixed overlay)
- Camera automatically offsets right when flying to selected building

#### 5.2.3 Information Shown
- **Avatar:** 128×128 GitHub profile image
- **Name:** Display name (or login if name is null)
- **Login:** @username
- **Bio:** User bio (if available)
- **Location:** Geographic location (if available)
- **Company:** Company name (if available)
- **Stats Row:**
  - Public Repos
  - Total Stars
  - Followers
  - Estimated Commits
  - Recent Activity (30-day event count)
  - Total Score
- **Top Repositories:** List of up to 10 repos with stars, forks, language, description
- **GitHub Created:** Year joined GitHub
- **City Slot:** Building slot number in spiral grid
- **City Rank:** Global ranking position

#### 5.2.4 Interactions
- **Click anywhere outside panel:** Close panel, deselect building
- **Esc key:** Close panel
- **"View on GitHub" button:** Opens user's GitHub profile in new tab

---

### 5.3 Silicon Valley Park

#### 5.3.1 Location & Size
- **Center:** (75, 75) in world coordinates
- **Dimensions:** 200×200 units
- **Elevation:** Ground level (y=0)

#### 5.3.2 North Half — Company Campuses
- **Layout:** Single horizontal row of 4 company zones
- **Companies:** Apple, Google, NVIDIA, Meta
- **Data Source:** API route `/api/silicon-valley/contributors` with `?company=` filter
- **Characters:** Up to 30 developers per company displayed as smaller building models
- **Selection:** Each company quadrant shows top contributors by contribution count
- **Display:** Developer avatars, names, contribution counts, city ranks

#### 5.3.3 South Half — Language Districts
- **Layout:** 2×4 grid (8 districts total)
- **Languages:** Python, JavaScript, TypeScript, Java, Rust, Go, C++, Kotlin
- **Data Source:** Same API route, language-filtered
- **Characters:** Top developers for each language (contribution-based ranking)
- **Monuments:** Each language district has a decorative monument with language icon

#### 5.3.4 Burj Khalifa Tower
- **Position:** Between north and south halves (center of park)
- **Purpose:** Visual landmark, no data function
- **Model:** Tall procedural geometry mimicking Burj Khalifa silhouette

#### 5.3.5 Flying Banners
- **Count:** Multiple banners flying in circular paths above park
- **Content:** Company logos or language icons
- **Animation:** Constant rotation around park center

#### 5.3.6 Perimeter Fence
- **Style:** Rectangular border with gaps for entry
- **Material:** Glowing accent posts

---

### 5.4 Trending District

#### 5.4.1 Location & Size
- **Center:** (-120, 120) in world coordinates
- **Dimensions:** 100×100 units
- **Elevation:** Ground level (y=0)

#### 5.4.2 Layout
- **Grid:** 5 columns × 4 rows = 20 slots
- **Spacing:** 15 units between building centers
- **Slot Assignment:** `trending_rank` (1–20) maps to grid position

#### 5.4.3 Building Data
Each building represents one trending repository with these properties:
- **repo_full_name** (e.g., "facebook/react")
- **owner_login** (e.g., "facebook")
- **repo_name** (e.g., "react")
- **description** (short text)
- **primary_language** (e.g., "JavaScript")
- **total_stars** (cumulative GitHub stars)
- **weekly_stars** (stars gained this week)
- **forks** (fork count)
- **open_issues** (issue count)
- **watchers** (watcher count)
- **topics** (array of topic tags)
- **daily_stars** (7-day array of daily star gain JSONB)
- **top_contributors** (array of top 10 contributors with city_rank lookups)
- **trending_rank** (1–20, determines slot position)
- **district_slot** (0–19, internal slot index)
- **building_height** (fixed height from rank-based table)
- **building_width** (always 3 units)

#### 5.4.4 Building Height Mapping (Fixed Table)
- Rank 1: 72 units
- Rank 2: 66 units
- Rank 3: 61 units
- Rank 4: 57 units
- Rank 5: 53 units
- Rank 6: 50 units
- Rank 7: 47 units
- Rank 8: 44 units
- Rank 9: 42 units
- Rank 10: 40 units
- Rank 11: 38 units
- Rank 12: 36 units
- Rank 13: 34 units
- Rank 14: 32 units
- Rank 15: 30 units
- Rank 16: 28 units
- Rank 17: 26 units
- Rank 18: 22 units
- Rank 19: 19 units
- Rank 20: 16 units

#### 5.4.5 Repo Profile Panel
- **Trigger:** Click any repo building in trending district
- **Display Position:** Right side overlay (same as user profile panel)
- **Information Shown:**
  - Repository full name
  - Owner avatar
  - Description
  - Primary language
  - Total stars, weekly stars, forks, issues, watchers
  - Topics (tag list)
  - Top contributors (with city ranks)
  - Daily star history chart (7-day line graph)
  - "View on GitHub" button

#### 5.4.6 Billboard Sign
- **Position:** Entrance to district
- **Text:** "This Week Famous Repos"
- **Style:** Large standing sign with pixelated font

#### 5.4.7 Perimeter Posts
- **Style:** Glowing accent posts marking district boundary
- **Material:** Emissive blue/orange glow

#### 5.4.8 Refresh Schedule
- **Frequency:** Daily via cron job at 19:30 UTC
- **Route:** `/api/trending/refresh`
- **Duration:** Up to 300 seconds (5 minutes)

---

### 5.5 Burj Khalifa (Standalone Feature)

#### 5.5.1 Purpose
- Visual landmark in Silicon Valley Park
- Represents highest achievement / aspirational goal

#### 5.5.2 Design
- Tall tapered tower geometry (procedurally generated)
- Positioned at center of SV park between company and language sections
- No interactive data — purely decorative

---

### 5.6 Airplane Mode

#### 5.6.1 Entry
- Click "FLY OVER CITY" button in mode menu
- State changes to `flightMode = true`, `activeMode = 'fly'`

#### 5.6.2 Airplane Model
- **Geometry:** Procedural mesh (fuselage, wings, tail fins, engines, cockpit)
- **Materials:**
  - Body: #e8e8f0 (light gray)
  - Engines: #2a2a3a (dark gray)
  - Cockpit: #7eceff (cyan) with emissive glow
- **Size:** Fuselage length ~12 units, wingspan ~18 units
- **Camera:** 3rd-person view from behind and above plane

#### 5.6.3 Flight Physics
- **Forward Speed:** 40 units/sec (constant, no acceleration/deceleration)
- **Altitude Speed:** 20 units/sec (climb/descend)
- **Pitch Rate:** Adjustable via W/S keys
- **Yaw Rate:** Adjustable via A/D keys
- **Min Altitude:** 5 units (ground collision prevention)
- **Max Altitude:** 300 units (ceiling)
- **Physics Update:** Every frame via refs (zero React state in render loop)

#### 5.6.4 Controls
- **W:** Pitch up (nose up, ascend)
- **S:** Pitch down (nose down, descend)
- **A:** Yaw left (turn left)
- **D:** Yaw right (turn right)
- **Q:** Increase altitude (climb)
- **E:** Decrease altitude (descend)
- **Esc:** Exit airplane mode

#### 5.6.5 HUD (Flight Display)
- **ALT:** Current altitude (0–300)
- **HDG:** Current heading (0–360°, 0=north)
- **SPD:** Current speed (always 40)
- **Update Rate:** 10 FPS (performance optimization)

#### 5.6.6 Exit Animation
- **Trigger:** Press Esc
- **Effect:** Plane fades to transparent (opacity → 0 over 1 second)
- **Camera:** Lerps back to default explore mode position
- **State Change:** `flightMode = false`, `activeMode = 'explore'`

---

### 5.7 Search & Discovery

#### 5.7.1 Search Bar (Bottom-Center)
- **Visibility:** Always visible in explore/trending/search modes
- **Placeholder:** "Search GitHub username..."
- **Auto-Complete:** Queries API `/api/city/search?q=` after 2+ characters typed
- **Results:** Dropdown list of matching users (login, avatar, rank)
- **Selection:** Click result → camera flies to building, profile panel opens

#### 5.7.2 Join Toast (User Not Found)
- **Trigger:** Search for username not in city database
- **Display:** Bottom-center toast message
- **Text:** "[username] not found in city. Add them?"
- **Button:** "ADD TO CITY"
- **Action:** Calls `/api/city/add` with GitHub username, then `/api/github/[username]` to fetch profile
- **Post-Add:** User appears in city shortly after (may require page refresh)

#### 5.7.3 Background Discovery Stream
- **Start Time:** Page load (runs for 5 minutes)
- **Route:** `/api/github/stream` (Server-Sent Events)
- **Searches:** 29 parallel GitHub user queries (followers ranges, languages, repos, recent activity)
- **Add Rate:** Batches of 5 users fetched and upserted every few seconds
- **UI Feedback:** Live feed ticker shows "[username] joined Git World at slot #[slot]"

---

### 5.8 Leaderboard (Rankings)

#### 5.8.1 Access
- Press **R** key
- Click **RANKINGS** button in top bar
- Click **LEADERBOARD** button in mode menu

#### 5.8.2 Display
- **Layout:** Full-screen overlay with semi-transparent dark background
- **Columns:**
  1. Rank #
  2. Avatar (64×64)
  3. Name (@login)
  4. Total Score
  5. Total Stars
  6. Estimated Commits
  7. Top Language
- **Sorting:** By `total_score` descending
- **Scroll:** Infinite scroll (loads 100 users at a time)
- **Close:** Click X button or press Esc

#### 5.8.3 Data Source
- API route: `/api/city/users` (returns all users sorted by city_rank)
- Updated on page load
- Re-fetch on manual refresh

---

### 5.9 Day/Night Cycle

#### 5.9.1 Toggle Method
- **N Key:** Press to toggle
- **Sun/Moon Button:** Click icon in top-right of HUD
- **Default:** Day mode

#### 5.9.2 Day Mode Visual Changes
- Sky: Blue gradient with sun (`<Sky />` component)
- Fog: Light blue (#c9e8ff), far distance (300–1000)
- Ambient light: Bright white (#ffffff × 1.1)
- Directional sun: Warm white (#fffcee × 3.0)
- Building windows: 85% lit, no emissive glow
- Materials: Standard MeshStandardMaterial

#### 5.9.3 Night Mode Visual Changes
- Sky: Black space with 1500 stars
- Fog: Dark blue-purple (#0d0818), closer range (200–800)
- Ambient light: Dim blue (#445577 × 0.8)
- Directional moon: Cool blue (#6688cc × 1.8)
- Point lights: Orange and blue accent lights at city edges
- Building windows: 94% lit, emissive glow (intensity 0.4)
- Materials: Same MeshStandardMaterial with increased emissive

#### 5.9.4 Transition
- Instant swap (no animated transition)
- All light parameters change simultaneously
- Building materials swapped from pre-built day/night material pool

---

### 5.10 HUD (Heads-Up Display)

#### 5.10.1 Top Bar (Always Visible)
- **Left Side:**
  - "GIT WORLD" logo (Press Start 2P font)
  - Building count badge (e.g., "12,345 Buildings")
  - LIVE red dot indicator (pulsing animation)
- **Right Side:**
  - GitHub stars badge (links to repo)
  - RANKINGS button (opens leaderboard)
  - Day/Night toggle button (sun/moon icon)

#### 5.10.2 Bottom-Left Corner
- **MENU Button:** Returns to 5-mode selection screen
- **Controls Legend:** Keyboard/mouse shortcuts reference card
- **MiniMap:** Top-down 2D view of city with user position indicator

#### 5.10.3 Bottom-Right Corner
- **Top 5 Widget:** Shows current top 5 ranked users with avatars and scores

#### 5.10.4 Bottom-Center
- **Search Bar:** GitHub username search with auto-complete

#### 5.10.5 Bottom Ticker
- **Live Feed:** Horizontal scrolling text showing recent join events
- **Data Source:** `/api/live/events` (last 50 events)
- **Update:** Real-time via Supabase realtime subscription

#### 5.10.6 Footer Credit
- **Text:** "Built by Ashusriwastav07"
- **Link:** GitHub profile link

---

## 6. Data Sources

### 6.1 GitHub API
- **Endpoints Used:**
  - `/users/:username` (profile data)
  - `/users/:username/repos` (repository list)
  - `/users/:username/events` (activity history)
  - `/search/users` (discovery queries)
  - `/search/repositories` (trending repo search)
- **Token Rotation:** 3 GitHub Personal Access Tokens cycle on every request
- **Rate Limit:** 5,000 requests/hour per token × 3 = 15,000 requests/hour total
- **Fallback:** On 429 rate limit error, returns cached data from Supabase

### 6.2 Supabase (PostgreSQL)
- **Tables:**
  - `city_users` (main user data, 22 columns)
  - `sv_contributors` (Silicon Valley company links)
  - `sv_language_devs` (language district links)
  - `trending_repos` (weekly trending repos)
  - `live_events` (join/update activity feed)
- **Views:**
  - `sv_contributors_full` (joins contributors with city_users)
  - `sv_language_devs_full` (joins language devs with city_users)
- **Functions:**
  - `claim_next_slot()` (atomic slot assignment)
  - `recalculate_ranks()` (global rank recalculation)
- **Realtime:** Subscriptions to `city_users` and `live_events` for live updates

### 6.3 Cron Jobs (Vercel)
- **Daily Refresh:** 19:30 UTC
  - `/api/daily-refresh` (general city refresh)
  - `/api/cron/sv-refresh` (Silicon Valley park refresh)
- **Rank Recalculation:** 19:45 UTC
  - `/api/cron/recalculate-ranks` (updates all city_rank values)

---

## 7. Performance Characteristics

### 7.1 Initial Load Time
- **First Contentful Paint:** 1.5–2.5 seconds (depends on network)
- **3D Scene Render:** Starts at 15 seconds (during cinematic intro)
- **Full City Load:** 25–45 seconds (8,000 buildings + textures)
- **Intro Completion:** 32.5 seconds (mode menu appears)

### 7.2 Frame Rate Targets
- **Desktop (High-End GPU):** 60 FPS
- **Desktop (Integrated GPU):** 30–45 FPS
- **Mobile (Flagship):** 20–30 FPS (not optimized)
- **Mobile (Budget):** 10–20 FPS (not recommended)

### 7.3 Rendering Optimizations Implemented
- **InstancedMesh:** 8,000 buildings rendered as 2 draw calls (body + glow)
- **Texture Caching:** Window textures generated once per user, reused
- **Logarithmic Depth Buffer:** Prevents z-fighting at long distances
- **Device Pixel Ratio Limit:** Capped at [1, 1.5] to reduce pixel count
- **Canvas Frame Loop:** `frameloop="always"` (continuous rendering, no demand mode)

### 7.4 Rendering Optimizations NOT Implemented
- **Frustum Culling:** All 8,000 buildings always rendered (GPU wastes cycles on offscreen geometry)
- **Level of Detail (LOD):** Same geometry for near and far buildings
- **Octree Spatial Indexing:** No spatial partitioning for click detection
- **Asset Compression:** Textures not compressed (no KTX2 or Basis format)
- **Web Worker Offloading:** All calculations run on main thread

### 7.5 Data Loading Strategy
- **Initial Load:** Fetches all users from `/api/city/users` (one request, paginated 500 at a time on server)
- **Pagination:** Client receives full batch (no client-side pagination)
- **Realtime Updates:** Supabase subscription adds new users as they join
- **Cache Strategy:** No cache headers or ISR on main city data (always fresh)

---

## 8. Known Limitations

### 8.1 Performance Issues
- **Large Cities (8,000+ buildings):** Frame rate drops significantly on low-end hardware
- **Mobile Devices:** Poor performance due to lack of mobile-specific optimizations
- **Initial Load:** 25–45 second wait before city is fully rendered and interactive

### 8.2 Discovery System
- **No Manual Registration:** Users cannot add themselves directly (must wait for background discovery or someone searches for them)
- **Discovery Delay:** Takes 5 minutes for background stream to discover ~hundreds of users
- **Manual Add:** "Join" button exists but requires another user to search and add them

### 8.3 Data Accuracy
- **Estimated Commits:** Not real commit count (derived from event history × 3.5 multiplier)
- **Stale Rankings:** Ranks only update once daily at 19:45 UTC via cron
- **Missing Users:** Many GitHub users never discovered if they don't match search queries

### 8.4 Missing Features from Design Docs
- **Tier 2–5 Decorations:** Only Tier 1 crown implemented (spires, antennas, gardens not built)
- **Street Lights:** Mentioned in code comments but not rendered
- **Character Models:** No walking dev characters or avatars in parks (only buildings)
- **Animated Banners:** Silicon Valley banners exist but no animation implemented

### 8.5 Browser Compatibility
- **WebGL 2 Required:** No fallback for older browsers
- **Desktop Chrome/Edge:** Best performance
- **Firefox:** Works but slower
- **Safari:** WebGL bugs possible (not extensively tested)
- **Mobile Safari:** Poor performance, touch controls not optimized

### 8.6 Accessibility
- **No Screen Reader Support:** 3D canvas is a black box to assistive tech
- **No Keyboard-Only Navigation:** Requires mouse for building selection
- **No Color Blind Modes:** Language colors and tier glows may be indistinguishable

---

## 9. Browser & Device Support

### 9.1 Officially Supported
- **Chrome 90+** (desktop)
- **Edge 90+** (desktop)
- **Firefox 88+** (desktop)

### 9.2 Partially Supported
- **Safari 14+** (desktop) — WebGL rendering works, some visual bugs
- **Chrome Android** — Renders but slow (not optimized)
- **Safari iOS** — Renders but very slow, touch controls rough

### 9.3 Not Supported
- **Internet Explorer** (any version)
- **Chrome < 90**
- **Firefox < 88**
- **Safari < 14**
- **Any browser without WebGL 2 support**

### 9.4 Minimum Hardware
- **Desktop:** Dedicated GPU with 2GB VRAM, 8GB system RAM, quad-core CPU
- **Mobile:** Flagship device from 2021+ (Snapdragon 888 or Apple A14 equivalent)

---

## 10. Success Metrics (Not Implemented)

*The following metrics are not tracked in the current implementation. This section describes what SHOULD be measured if analytics were added.*

### 10.1 Engagement
- Daily active users
- Average session duration
- Buildings clicked per session
- Mode usage distribution (explore vs fly vs trending vs search)

### 10.2 Performance
- Average FPS across devices
- p50 / p95 / p99 initial load time
- Time to interactive (cinematic intro → first interaction)

### 10.3 Discovery
- Users added via background stream vs manual search
- Search success rate (found vs not found)
- Click-through rate on "Add to City" button

### 10.4 Growth
- New buildings added per day
- Total unique GitHub users in city
- Churn rate (users returning after first visit)

---

**End of Product Requirements Document v2**
