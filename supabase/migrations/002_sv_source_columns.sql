-- ============================================================================
-- Add source tracking columns to sv_contributors
-- Required for the refresh route to track how each contributor was discovered
-- (org_member via /orgs API, or profile_search via /search/users fallback)
-- ============================================================================

-- Add new columns (safe: IF NOT EXISTS prevents errors on re-run)
ALTER TABLE sv_contributors ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'org_member'
  CHECK (source IN ('org_member', 'profile_search'));
ALTER TABLE sv_contributors ADD COLUMN IF NOT EXISTS membership_verified BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE sv_contributors ADD COLUMN IF NOT EXISTS org_name TEXT;

-- Update view to include new columns
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
