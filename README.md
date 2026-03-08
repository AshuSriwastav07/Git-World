<img width="1024" height="1024" alt="Logo" src="https://github.com/user-attachments/assets/7bdecb3e-8486-4091-8fad-8f1600b3eecb" /><img width="1536" height="1024" alt="28f6d47e-0a65-4402-9a66-3b04bb1a38a3" src="https://github.com/user-attachments/assets/d565a2b1-e08a-4c02-88e4-fb639fad813b" />
<img width="1024" height="1024" alt="Logo" src="https://github.com/user-attachments/assets/87683918-0fdc-4f3d-9f44-5811233c50c2" />

# 🧱 Git World — Every Developer Has a Building

> **A 3D Minecraft-style city where every GitHub developer becomes a building.**
> The more you code, the taller your building grows. Explore thousands of developer buildings, fly through the city, and find your place in the skyline.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![Three.js](https://img.shields.io/badge/Three.js-0.183-black?logo=three.js)
![Supabase](https://img.shields.io/badge/Supabase-Database-3FCF8E?logo=supabase)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)

---

## 🌐 What is Git World?

Git World takes real GitHub developer profiles and turns them into a **living 3D city**. Every building you see represents a real developer. The building's **height, size, color, and position** are all based on that developer's actual GitHub activity — commits, stars, repos, followers, and more.

The city keeps growing automatically. New developers are discovered in the background and their buildings appear in real time. You can search for any GitHub username and add them to the city instantly.

**Think of it like a Minecraft city, but built entirely from GitHub data.**

---

## ✨ Features

### 🏗️ Every Developer is a Building
- Each building represents one GitHub developer
- Building height = developer's total score (commits + stars + followers + repos + activity)
- Building color = developer's top programming language (JavaScript = yellow, Python = blue, Rust = orange, etc.)
- Top-ranked developers get the tallest buildings in the center

### 🎮 Explore the City
- **Orbit** — Drag to rotate, scroll to zoom, right-click to pan
- **Walk** — Use W/A/S/D keys to move around the city
- **Fly** — Press F to enter Airplane Mode and fly freely through the skyline
- **Click any building** to see that developer's full GitHub profile

### ✈️ Airplane Mode
- Press **F** to toggle flight mode
- **Mouse** controls pitch (up/down) and roll (tilt left/right)
- Rolling automatically turns the plane (bank-to-turn, like a real airplane)
- **Q/E** for direct left/right turning
- **Shift** to boost speed, **Space** to slow down
- See your speed, altitude, and heading on the flight HUD

### 🌗 Day & Night Mode
- Click the ☀️/🌙 button or press **N** to switch
- At night, building windows glow with warm amber light
- Street lights turn on and the sky fills with stars

### 🔍 Search Any Developer
- Type any GitHub username in the search bar at the bottom
- If they're not in the city yet, Git World fetches their profile from GitHub and adds a new building for them
- Click the result to fly to their building

### 📊 Rankings & Stats
- Click **RANKINGS** or press **R** to see the full leaderboard
- Top 5 developers always visible in the bottom-right widget
- Every building you click shows a detailed profile: bio, location, top repos, stars, commits, and more

### 📡 Real-Time City Growth
- The city discovers new GitHub developers automatically in the background
- New buildings appear in real time via Supabase Realtime
- A live ticker at the bottom shows recent joins and rank changes
- Building count updates live as new developers are added

### 🗺️ Minimap
- Small overview map in the bottom-left corner
- Shows your current camera position in the city
- Click anywhere on the minimap to jump to that location

---

## 🖥️ How to Use Git World

### As a Visitor (Just Browsing)

1. **Open the site** — The city loads automatically with thousands of developer buildings
2. **Click anywhere** to skip the intro and start exploring immediately
3. **Click any building** to see that developer's GitHub profile, stats, and top repositories
4. **Search for a developer** — Type a GitHub username in the search bar to find or add them
5. **Switch to night mode** — Click the sun/moon icon to see the city glow at night
6. **Open rankings** — Click RANKINGS to see who has the tallest buildings

### As a Developer (Finding Your Building)

1. **Search your GitHub username** in the search bar
2. If you're already in the city, it flies to your building
3. If you're not in the city yet, Git World adds you automatically
4. Your building height depends on your GitHub activity — more commits, stars, and repos = taller building
5. Come back later and your building may have grown as your stats update

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| **W/A/S/D** | Move camera around the city |
| **Shift** | Sprint (faster movement) |
| **F** | Toggle Airplane Mode |
| **N** | Toggle Day/Night |
| **R** | Toggle Rankings |
| **Esc** | Close panels / Deselect building |
| **Q/E** | Yaw left/right (in Airplane Mode) |

---

## 🏗️ How Buildings Are Scored

Every developer gets a **total score** based on their real GitHub activity:

```
Score = (Estimated Commits × 3) + (Total Stars × 2) + (Followers × 1)
        + (Public Repos × 0.5) + (Recent Activity × 10)
```

This score determines:
- **Building height** — Higher score = taller building
- **City position** — Top-scored developers are placed near the center
- **Building tier** — The #1 developer gets a special gold crown with beacon and antenna

---

## 🛠️ Tech Stack

| Technology | Purpose |
|-----------|---------|
| **Next.js 16** | App Router, API routes, server-side rendering |
| **React 19** | UI components and state management |
| **Three.js** | 3D rendering engine |
| **React Three Fiber** | React bindings for Three.js |
| **@react-three/drei** | Camera controls, helpers, effects |
| **Supabase** | Database, realtime subscriptions, authentication |
| **Zustand** | Lightweight state management |
| **TypeScript** | Type safety across the entire codebase |
| **Tailwind CSS 4** | UI styling |
| **Press Start 2P** | Pixel art font for the retro Minecraft aesthetic |

---

## ⚡ Performance

Git World renders **5,000+ buildings at 60fps** using these optimizations:

- **InstancedMesh** — All buildings are drawn in just 2 GPU draw calls (body + glow) instead of thousands of individual objects
- **Batched state updates** — New users are buffered for 400ms and applied in a single re-render
- **Canvas textures** — Window patterns and grass are generated once on a `<canvas>` and cached
- **Neutral window texture** — One shared texture tinted per-building by `instanceColor` (no per-building texture creation)
- **Frustum culling disabled** — InstancedMesh handles all visibility internally

---

## 📁 Project Structure

```
app/
  api/
    city/add/route.ts        Add or update a developer building
    city/users/route.ts      Paginated user listing
    github/[username]/       Fetch a GitHub profile
    github/stream/route.ts   SSE discovery stream for new developers
  globals.css                Global styles
  layout.tsx                 Root layout with metadata
  page.tsx                   App bootstrap — loads city, starts streams

components/
  city/
    CityGrid.tsx             InstancedMesh rendering (main 3D scene)
    CityScene.tsx            Canvas setup, lighting, sky, stars
    CameraController.tsx     Orbit controls, auto-rotate, fly-to, WASD
    Airplane.tsx             Flight physics and airplane model
    TechPark.tsx             Park area with animated characters
    ...                      Fireworks, spotlights, banner planes, etc.
  ui/
    HUD.tsx                  Top bar, live count, night toggle, rankings
    SearchBar.tsx            GitHub username search + add
    ProfileModal.tsx         Developer profile popup
    RankChart.tsx            Full leaderboard
    IntroOverlay.tsx         Cinematic intro sequence
    IntroButtons.tsx         Action buttons (Explore, Airplane, etc.)
    ...                      MiniMap, LiveFeed, TopFive, Controls, etc.

lib/
  cityStore.ts               Zustand store — all app state
  cityLayout.ts              Spiral grid placement + building dimensions
  supabaseDb.ts              Database operations + realtime subscriptions
  supabase.ts                Supabase client helpers
  textureGenerator.ts        Canvas-based texture generation + caching
  cityStream.ts              Client-side SSE stream connection
  githubTokens.ts            GitHub API token rotation
```

---

## 🚀 Run Locally

### 1. Clone the Repository

```bash
git clone https://github.com/AshuSriwastav07/Git-World.git
cd Git-World
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Create a `.env.local` file in the project root:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# GitHub API (one or more personal access tokens for API rate limits)
GITHUB_TOKENS=ghp_token1,ghp_token2
```

### 4. Set Up Supabase Database

You need a `city_users` table and two RPC functions in your Supabase project:

- `claim_next_slot()` — atomically assigns the next available city slot
- `recalculate_ranks()` — updates all city_rank values by total_score

### 5. Run the Dev Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and your city will start loading.

---

## 🌍 API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/github/[username]` | GET | Fetch a GitHub profile with repos, stars, commits, and activity |
| `/api/github/stream` | GET | SSE stream that discovers new developers from GitHub search |
| `/api/city/users` | GET | Paginated list of all developers in the city |
| `/api/city/add` | POST | Add or update a developer (auto-assigns city slot) |

---

## 🎬 How the City Grows

1. **On first load** — Git World fetches all existing developers from Supabase and renders the city
2. **Background discovery** — An SSE stream searches GitHub for popular developers across 29 different queries (by followers, language, activity, etc.)
3. **Real-time updates** — When any new developer is added (by search or discovery), their building appears instantly via Supabase Realtime
4. **Continuous growth** — The discovery stream restarts every 3 minutes, so the city is always expanding

---

## 👤 Built By & Contact

**Ashu Sriwastav** — Developer from Delhi, India

**Contact:**
- **Email:** [ashusriwastav07@gmail.com](mailto:ashusriwastav07@gmail.com)
- **LinkedIn:** [ashu-sriwastav-949b09272](https://www.linkedin.com/in/ashu-sriwastav-949b09272/)
- **Instagram:** [@_ashu_shrivastav](https://www.instagram.com/_ashu_shrivastav/)
- **GitHub:** [AshuSriwastav07](https://github.com/AshuSriwastav07)

If you like this project, give it a ⭐ on GitHub!

---

## 📄 License

This project is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**.

You are free to use, modify, and distribute this software under the terms of the AGPL-3.0. If you run a modified version on a server that users interact with over a network, you must make the source code of your modified version available to those users.

See the [LICENSE](LICENSE) file for the full license text.

Required values:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_DATABASE_URL=

GITHUB_TOKEN_1=
GITHUB_TOKEN_2=
GITHUB_TOKEN_3=
```

`.env.local` is intentionally ignored by Git so secrets are not committed.

## Available Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Notes

- The project depends on Firebase for persistent city storage and live event updates.
- GitHub API requests use token rotation to reduce rate-limit pressure.
- Discovery and ranking behavior are designed around visual city growth rather than strict analytics precision.

## Repository Summary

This repository contains the full source code for a stylized interactive GitHub developer city experience that combines 3D rendering, data visualization, gamified ranking, and live backend-driven updates.
