# GIT WORLD � PRODUCT REQUIREMENTS DOCUMENT (PRD)
## Interactive 3D GitHub Developer City
### Version 2.0 | For Next.js 16 + React Three Fiber + Supabase | Developer: Ashusriwastav07

---

# EXECUTIVE SUMMARY

**Git World** is an interactive 3D city where every GitHub developer becomes a permanent Minecraft-style building. The city grows automatically as new developers are discovered, updates in real time, and never resets. Users can explore on foot, fly in an airplane, visit themed tech parks, and discover trending repositories � all inside a beautiful pixel-art city powered by real GitHub data.

---

# 1. PRODUCT VISION

## What Players See

When you open Git World, you see a **sprawling 3D city** built on a grid of thousands of buildings, each representing a real GitHub developer. The tallest buildings are in the center (top-ranked devs), and the skyline tapers toward the edges. Every building is colored by that developer''s primary programming language, has lit windows representing their star count, and shows their username if you click on it.

The city feels alive:
- **In the day**, buildings are brightly colored with realistic shadows
- **At night**, thousands of windows glow with warm amber light
- **In real time**, new buildings appear as developers join
- **A scrolling ticker** at the bottom announces new joins and ranking changes

Users can experience the city in **5 different ways**:

| Mode | Experience |
|------|-------------|
| **??? Explore** | Orbit around the city, walk through streets with WASD, click buildings for profiles |
| **?? Fly** | Take off in a 3D airplane and soar freely over every district |
| **?? Trending** | Jump to a dedicated district showcasing GitHub''s top 20 trending repos of the week |
| **?? Find** | Search any GitHub username � the camera flies to their building |
| **?? Leaderboard** | View the top 100 ranked developers with detailed stats |

---

# 2. THE FIVE GEOGRAPHIC DISTRICTS

## 2.1 Main City Grid (145�145 Slots)

A tightly-packed grid of developer buildings forming the heart of Git World.

### Building Appearance Rules

**Height** = GitHub Activity Score:
- Score = (estimated commits � 3) + (total stars � 2) + (followers � 1) + (public repos � 0.5) + (recent activity � 10)
- Rank #1: 70-80 blocks tall with gold-crowned spire, beacon, antenna � visible from anywhere
- Rank 2-10: 35-55 blocks (towers with roof features)
- Rank 11-200: 15-35 blocks (tall buildings forming main skyline)
- Rank 201-5000: 5-15 blocks (standard city buildings)
- Rank 5000+: 2-5 blocks (small buildings filling outer edges)

**Width** = Repository Count (3�3 to 9�9 units, scales with repos)

**Color** = Primary Programming Language

**Window Glow** = Stars (night-time glow intensity proportional to star count)

---

## 2.2 Tech Park (50�50 Green Area)

A beautiful park where the 60 most recently active developers gather as animated characters.

**Features:**
- Grass ground, white picket fence, TECH PARK gold banner
- 10 oak trees with benches, central fountain with blue water glow
- Desk clusters and flower patches
- Lamp posts with warm orange glow (night)
- **60 Animated Developer Characters** walking paths or sitting, colored by language
- Character usernames show when camera is within 45 units
- Click any character to view full GitHub profile

Refreshes every 30 minutes with most recently active developers.

---

## 2.3 Silicon Valley Park (200�200 Dedicated Zone)

A massive tech-themed park with two sections:

### North: Four Company Campuses

**?? Apple Campus** (West)
- Circular ring building inspired by Apple Park
- 40 top Apple open-source contributors
- Silver/gray night glow

**?? Google Campus** (West-Center)  
- Colorful glass blocks in Google brand colors
- 40 top Google open-source contributors
- Google blue night glow

**?? NVIDIA Campus** (East-Center)
- Wave-roofed HQ with green glass banding
- 40 top NVIDIA open-source contributors
- Bright green night glow

**?? Meta Campus** (East)
- Modern gridded glass tower
- 40 top Meta open-source contributors
- Bright blue night glow

### Central Landmark: Burj Khalifa Tower
- 104-unit tall tower with tri-petal base
- Horizontal banding with "GIT WORLD" panels
- Tall antenna spire with glowing beacon tip
- Visible from anywhere in city

**Flying Banners:** Three promotional banners orbit the tower at different speeds showing "Git World", creator credit, and live developer count.

### South: Eight Language Programming Districts

| Language | Color | District |
|----------|-------|----------|
| ?? Python | Blue (#3776ab) | Top Python contributors |
| ?? JavaScript | Yellow (#f7df1e) | Top JS contributors |
| ?? TypeScript | Blue (#3178c6) | Top TS contributors |
| ? Java | Orange (#ed8b00) | Top Java contributors |
| ?? Rust | Copper (#dea584) | Top Rust contributors |
| ?? Go | Cyan (#00add8) | Top Go contributors |
| ?? C++ | Dark Blue (#00599c) | Top C++ contributors |
| ?? Kotlin | Purple (#7f52ff) | Top Kotlin contributors |

Each district has: language monument, developer buildings, banner, and brand-colored night lighting.

### Infrastructure
- **Main Boulevard** (z=-28): Golden road connecting all areas
- **Central Road** (z=17): Between companies and languages
- **Entrance Arches**: "SILICON VALLEY" and "GIT WORLD" signage
- **Ambient Lighting**: Brand-colored lights at each campus (night mode)

---

## 2.4 Trending Repos District (100�100)

Top 20 GitHub trending repositories of the current week displayed as buildings.

**Features:**
- **Real-time building heights**: Scale with weekly star count
- **Colorful perimeter posts**: Each language color represented
- **5�4 grid layout** of repo buildings
- **Billboard entrance**: "? This Week Famous Repos ?"
- **Click buildings**: View repo details, stars, language, description
- **Night glow**: Language-colored building glow

Updates weekly on Monday UTC; buildings grow live as repos earn stars.

---

# 3. USER INTERFACE DETAILS

## 3.1 Five-Way Experience Menu

After cinematic intro, centered overlay menu:
```
+---------------------------------------+
�   HOW DO YOU WANT TO EXPLORE?         �
�---------------------------------------�
� [???  EXPLORE CITY]   (gold)          �
� [??  FLY OVER]        (sky blue)      �
� [??  TRENDING REPOS]  (orange)        �
� [??  FIND MY BUILDING] (green)        �
� [??  LEADERBOARD]     (purple)        �
+---------------------------------------+
```

- **420px wide, 64px buttons**
- Dark translucent background, 3px gold border
- Press Start 2P font
- Color-coded accents match button function
- Escape = defaults to Explore

---

## 3.2 Main HUD

**Top Bar:**
- Logo: "?? GIT WORLD" (gold, Press Start 2P)
- Live indicator: ?? LIVE (breathing red dot)
- Developer count: e.g., "[4,721 developers]"
- Day/Night toggle: ?? / ?? (3-second smooth transition)
- Settings icon: ??
- Menu/Rankings buttons (context-aware)

**Bottom-Left:** Minimap (180�180px overhead view, click to jump)

**Bottom-Right:** Top 5 Mini-Leaderboard (clickable cards)

**Bottom-Center:** Search Bar (Minecraft chest style, gold border)

**Live Feed Ticker:** Scrolling events (right-to-left) showing real-time activity

**Credit:** "Built by Ashusriwastav07" always visible

---

## 3.3 Airport Mode Controls

Press **F** to pilot a Minecraft-style airplane.

**Airplane Design:**
- White fuselage, rectangular wings, vertical tail fin, spinning propeller
- Cyan cockpit windshield
- "ASHUSRIWASTAV07 AIR" fuselage marking
- Red/green wingtip lights, white strobe (night)
- Vapor trail (white fading spheres)

**Flight Controls:**
- **W/S**: Throttle up/down (40 units/sec base, 20 vertical)
- **A/D**: Turn left/right (with banking roll)
- **Q/E**: Pitch nose up/down
- **Arrow Keys**: Alternative pitch/yaw
- **Shift**: Speed boost (2�)
- **Esc or F**: Exit (smooth camera return)

**Flight HUD** (top-left, golden Press Start 2P):
- ALT: Altitude (5-300m range)
- HDG: Heading (0-359�)
- SPD: Speed
- Hints: "W/S: Pitch � A/D: Turn � Q/E: Alt � ESC: Exit" (fades after 8s)

**Camera:** 3rd-person, 8 units behind / 2.5 units above, smooth 0.08 lerp

---

## 3.4 Profile Modal

Opened by clicking any building, character, or ranking.

**Contents:**
- Avatar (80px, pixelated), username, real name
- Bio (2 lines), location, company, GitHub join year
- **Building Stats**: Rank, city slot, height, footprint, tier name
- **Activity Bars**: Commits, stars, repos, followers (proportional bars)
- Language badge, activity level (Very Active / Active / Quiet)
- **Top 5 Repos**: Clickable cards (name, stars, language, fork count)
- Buttons: "?? View on GitHub" (green) | "?? Fly to Building"
- Data freshness: "Updated X minutes ago"

**Styling:** Dark background, 4px border in developer''s language color, Press Start 2P

---

## 3.5 Rankings Panel (Top 100)

Opened by "RANKINGS" button or press **R**.

**Tabs:**
- ?? ALL-TIME (default)
- ?? THIS MONTH
- ?? THIS WEEK

**Each Row Shows:**
- Rank number (gold)
- Avatar (24�24px, pixelated)
- Username (clickable)
- Language badge
- Score proportional bar
- Trend indicator (? / ? / ?)

**Features:**
- 100 rows per page (or paginated)
- Click row to fly to building
- Sortable columns (rank, score)
- Quick search filter
- 500px width (responsive)

---

# 4. DAY & NIGHT CYCLE

## Day Mode (Bright & Energetic)
- Sky component with warm sun
- Strong directional light (realistic shadows)
- Full-saturation building colors
- Minimal lit windows
- Business hours ambiance
- Intensity: Directional 3.0, Ambient 1.1

## Night Mode (Atmospheric & Glowing)
- 1500 stars scattered across sky sphere
- Dark navy blue sky
- Cool blue directional light (moonlight)
- **Windows glow amber** (intensity proportional to star count)
- Emissive building materials active
- Street lamps emit warm orange glow
- Tech Park sign glows gold
- Fountain glows blue
- Company campuses glow in brand colors
- Orange haze at ground level from thousands of windows
- Intensity: Directional 1.8 (cool blue), Ambient 0.8

**Transition:** Smooth 3-second interpolation of lighting, sky, and emissive materials.

---

# 5. CINEMATIC INTRO

New visitors see an animated intro before mode menu:

1. **Particles & Loading Bar** (2s)
   - Falling block particles
   - "Generating City... 45%" text

2. **Game Title** (2s)
   - "?? GIT WORLD" zooms in
   - "Every Developer Has a Building" subtitle
   - Dramatic sound effect

3. **City Cinematic** (3s)
   - 3D city loads and renders
   - Camera flies over city
   - Music begins (optional)

4. **Mode Menu**
   - User selects how to explore

**Skip Option:** Click anywhere to jump to mode menu.

---

# 6. REAL-TIME FEATURES

## 6.1 Live City Growth
- **Background discovery**: SSE stream continuously finds new developers
- **Instant buildings**: New developers appear in real-time via Supabase
- **Rank updates**: Buildings grow/shrink as stats update
- **Live notification**: Greeting message when new developer joins in real-time

## 6.2 Live Feed Ticker
- "X joined the city!"
- "Y climbed to rank #45!"
- "Z earned their Xth star!"
- Scrolls right-to-left, updates every ~50-200ms

## 6.3 Live Count Widget
- Developer count updates live
- Shows as "[4,721 developers]" in top bar
- Red breathing ?? LIVE indicator

---

# 7. PERFORMANCE TARGETS

- **Load time**: Full interactive city within 3 seconds (fast 4G)
- **Frame rate**: Steady 60fps on modern hardware
- **Building capacity**: 5,000+ buildings rendered via InstancedMesh
- **Memory**: < 150MB for full city state
- **Network**: 400KB initial bundle, 50KB per city update
- **Responsive**: Works on 320px - 2560px screens

---

# 8. SEARCH & DISCOVERY

## Search Bar
- Input: Any GitHub username
- **If in city**: Camera flies to building (1.5s), pulsing gold ring, welcome message
- **If on GitHub but not in city**: Fetch profile, add to database, building grows (800ms animation), fly to it
- **If not found**: Red border flash, error message
- **If rate-limited**: Countdown shown ("Retrying in 23s...")

## Random Player
- **[?? Random] button**: Jumps to random developer''s building

---

# 9. SPECIAL VISUAL EFFECTS

## God Ray Spotlight
- Blue neon cone descending from sky
- Pulsing halo ring at building base
- Rotating concentric circles
- Upward cone marker
- Activates when building selected
- Creates dramatic "focus" effect

## Building Growth Animation
- Blocks rise bottom-to-top
- Duration: 800ms
- Glow while materializing
- Optional "construction" sound

## Rank Change Notification
- Building brightens for 2 seconds
- Trend indicator (?/?) shows change
- Visual pulse in language color
- Optional chime sound

---

# 10. SUCCESS METRICS

### User Engagement
- Click rate on buildings (target: 70%+)
- Average session: 5+ minutes
- Repeat visitors within 7 days: 40%+  
- Favorite feature usage distribution

### City Growth
- Daily new developers: 100+ per day
- Weekly rank churn: 20%+
- Monthly stat updates: 50%+
- SV park/trending refresh: timely

### Technical  
- Server uptime: 99.9%
- Realtime latency: < 2 seconds
- API response: < 200ms median
- Asset cache hit rate: > 95%

---

END OF PRODUCT REQUIREMENTS DOCUMENT (PRD)
