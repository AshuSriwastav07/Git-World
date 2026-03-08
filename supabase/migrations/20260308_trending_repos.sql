-- Trending Repositories District — separate table from city_buildings
CREATE TABLE IF NOT EXISTS trending_repos (
  id                   SERIAL PRIMARY KEY,
  repo_full_name       TEXT NOT NULL UNIQUE,        -- "owner/reponame"
  owner_login          TEXT NOT NULL,                -- GitHub username of repo owner
  owner_type           TEXT NOT NULL DEFAULT 'User', -- 'User' or 'Organization'
  repo_name            TEXT NOT NULL,                -- just the repo part
  description          TEXT,
  primary_language     TEXT DEFAULT 'Unknown',
  total_stars          INTEGER NOT NULL DEFAULT 0,
  weekly_stars         INTEGER NOT NULL DEFAULT 0,
  forks                INTEGER NOT NULL DEFAULT 0,
  open_issues          INTEGER NOT NULL DEFAULT 0,
  watchers             INTEGER NOT NULL DEFAULT 0,
  github_url           TEXT NOT NULL,
  homepage_url         TEXT,
  topics               TEXT[] DEFAULT '{}',
  daily_stars          JSONB DEFAULT '[]',           -- [{date, count}] last 7 days
  top_contributors     JSONB DEFAULT '[]',           -- [{login, avatarUrl, contributions, city_rank}]
  trending_rank        INTEGER NOT NULL DEFAULT 1,   -- 1 = most trending
  district_slot        INTEGER NOT NULL DEFAULT 0,   -- 0-19 position in district grid
  building_height      FLOAT NOT NULL DEFAULT 8,
  building_width       FLOAT NOT NULL DEFAULT 2,
  last_refreshed       TIMESTAMPTZ DEFAULT now(),
  is_active            BOOLEAN NOT NULL DEFAULT true -- false = dropped off trending
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_trending_rank ON trending_repos(trending_rank) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_trending_active ON trending_repos(is_active, trending_rank);

ALTER TABLE trending_repos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_trending" ON trending_repos FOR SELECT TO anon, authenticated USING (true);
