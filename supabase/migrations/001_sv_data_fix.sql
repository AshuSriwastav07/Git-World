-- ============================================================================
-- Silicon Valley Park — Data Architecture Fix
-- Ensures every SV park character is first a city resident in city_users,
-- then stored in sv_contributors / sv_language_devs as park metadata.
-- ============================================================================

-- ── 1. sv_contributors: links a city_users resident to a company quadrant ──
CREATE TABLE IF NOT EXISTS sv_contributors (
  login        TEXT PRIMARY KEY REFERENCES city_users(login) ON DELETE CASCADE,
  company      TEXT NOT NULL CHECK (company IN ('apple','google','nvidia','meta')),
  contributions INTEGER NOT NULL DEFAULT 0,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sv_contributors_company ON sv_contributors(company);

-- ── 2. sv_language_devs: links a city_users resident to a language district ──
CREATE TABLE IF NOT EXISTS sv_language_devs (
  login        TEXT PRIMARY KEY REFERENCES city_users(login) ON DELETE CASCADE,
  language     TEXT NOT NULL,
  contributions INTEGER NOT NULL DEFAULT 0,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sv_language_devs_language ON sv_language_devs(language);

-- ── 3. View: sv_contributors joined with city_users (read API) ──
CREATE OR REPLACE VIEW sv_contributors_full AS
SELECT
  c.login,
  c.company,
  c.contributions,
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

-- ── 4. View: sv_language_devs joined with city_users (read API) ──
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

-- ── 5. Data integrity check queries (run manually) ──
-- Check for sv_contributors with no city_users row:
--   SELECT s.login FROM sv_contributors s LEFT JOIN city_users u ON u.login = s.login WHERE u.login IS NULL;
-- Check for city_users with null rank:
--   SELECT login, city_rank FROM city_users WHERE city_rank IS NULL OR city_rank = 999999;
-- Check for city_users with null slot:
--   SELECT login, city_slot FROM city_users WHERE city_slot IS NULL;
