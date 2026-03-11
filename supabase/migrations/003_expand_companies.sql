-- ============================================================================
-- Expand Silicon Valley Park to 8 companies & fix rendering bug
-- 1. Drop and re-add company CHECK constraint to include all 8 companies
-- 2. Recreate sv_contributors_full view with LEFT JOIN (fixes rendering gap)
-- 3. Recreate sv_language_devs_full view with LEFT JOIN
-- ============================================================================

-- ── 1. Expand company CHECK constraint ──────────────────────────────────────

ALTER TABLE sv_contributors DROP CONSTRAINT IF EXISTS sv_contributors_company_check;
ALTER TABLE sv_contributors ADD CONSTRAINT sv_contributors_company_check
  CHECK (company IN ('apple','google','nvidia','meta','amazon','microsoft','tesla','netflix'));

-- ── 2. Fix sv_contributors_full: INNER JOIN → LEFT JOIN ─────────────────────
-- The old INNER JOIN silently dropped contributors without a matching
-- city_users row, causing the "30 in DB but 17 on map" rendering gap.

DROP VIEW IF EXISTS sv_contributors_full;
CREATE VIEW sv_contributors_full AS
SELECT
  c.login,
  c.company,
  c.contributions,
  c.source,
  c.membership_verified,
  c.org_name,
  COALESCE(u.avatar_url, '') AS avatar_url,
  COALESCE(u.top_language, 'Unknown') AS top_language,
  COALESCE(u.city_slot, 0) AS city_slot,
  COALESCE(u.city_rank, 9999) AS city_rank,
  COALESCE(u.total_score, 0) AS total_score,
  COALESCE(u.estimated_commits, 0) AS estimated_commits,
  COALESCE(u.total_stars, 0) AS total_stars,
  COALESCE(u.public_repos, 0) AS public_repos
FROM sv_contributors c
LEFT JOIN city_users u ON u.login = c.login
ORDER BY c.company, c.contributions DESC;

-- ── 3. Fix sv_language_devs_full: INNER JOIN → LEFT JOIN ────────────────────

DROP VIEW IF EXISTS sv_language_devs_full;
CREATE VIEW sv_language_devs_full AS
SELECT
  d.login,
  d.language,
  d.contributions,
  COALESCE(u.avatar_url, '') AS avatar_url,
  COALESCE(u.top_language, d.language) AS top_language,
  COALESCE(u.city_slot, 0) AS city_slot,
  COALESCE(u.city_rank, 9999) AS city_rank,
  COALESCE(u.total_score, 0) AS total_score,
  COALESCE(u.estimated_commits, 0) AS estimated_commits,
  COALESCE(u.total_stars, 0) AS total_stars,
  COALESCE(u.public_repos, 0) AS public_repos
FROM sv_language_devs d
LEFT JOIN city_users u ON u.login = d.login
ORDER BY d.language, d.contributions DESC;
