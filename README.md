# Git World

Git World is a 3D voxel-style developer city built with Next.js, React Three Fiber, Three.js, and Supabase. Each building represents a GitHub developer profile, with city layout, building size, lighting, and rankings driven by GitHub activity and stored city data.

The app loads saved developers from Supabase, renders them as a navigable city, and keeps discovering new developers in the background through GitHub-powered API routes.

## Features

- 3D developer city rendered with React Three Fiber and Three.js
- GitHub developer profiles converted into buildings with ranks, tiers, and score-based scaling
- Real-time city growth using Supabase Realtime
- Search and add developers directly into the city
- Background GitHub discovery stream for continuously expanding the city
- Day and night visual modes
- Airplane mode for free-flight exploration
- Ranking widgets, minimap, live feed, profile modal, and camera fly-to interactions
- Performance-focused rendering with InstancedMesh and layered effects

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Three.js
- @react-three/fiber
- @react-three/drei
- Supabase
- Zustand
- Tailwind CSS 4

## How It Works

The application boots in two phases:

1. It loads saved developer data from Supabase and renders the existing city quickly.
2. It starts a background discovery stream that searches GitHub for additional developers and adds them into the city over time.

Each developer is transformed into city data that includes:

- GitHub profile stats
- estimated activity score
- city slot and world position
- building tier, footprint, and height
- ranking and visual metadata

## Scoring Model

Buildings are based on a combined developer score derived from values such as:

- estimated commits
- total stars
- follower count
- public repository count
- recent activity

That score affects rank placement and the size or tier of the building in the city.

## Main UI Elements

- City scene with camera controls and exploration modes
- HUD with live counts, night toggle, rankings access, and search
- Search bar for importing GitHub users into the city
- Profile modal for detailed developer stats and top repositories
- Live feed for join, growth, and rank-up events
- Top rankings widget and full rank chart
- Minimap for fast navigation

## Project Structure

```text
app/
	api/                     Next.js API routes for GitHub and city data
	globals.css              Global styling
	layout.tsx               Root layout
	page.tsx                 App bootstrap entry

components/
	city/                    3D scene, buildings, lighting, parks, effects
	ui/                      HUD, search, profile modal, charts, minimap

lib/
	cityLayout.ts            Building placement and score-derived layout logic
	cityStore.ts             Zustand state management
	cityStream.ts            Client-side city bootstrap and stream logic
	firebase.ts              Firebase initialization
	firestore.ts             Firestore reads/writes and city persistence
	githubTokens.ts          GitHub token rotation helper
	realtimeDb.ts            Live event streaming helpers

types/
	index.ts                 Shared application types and constants
```

## API Routes

- `GET /api/github/[username]`: fetch a single GitHub user profile, repositories, and activity summary
- `GET /api/github/stream`: discover batches of GitHub users and stream them into the client
- `POST /api/github/refresh`: refresh stored user stats in batches
- `GET /api/city/users`: read city users from Firebase
- `POST /api/city/add`: add or update a city user and emit live events

## Local Setup

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Environment Variables

Create `.env.local` with your Firebase and GitHub configuration.

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
