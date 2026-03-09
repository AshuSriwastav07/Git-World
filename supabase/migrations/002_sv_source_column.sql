-- ============================================================================
-- Add source tracking columns to sv_contributors
-- Tracks whether a contributor was sourced via org member API or profile search
-- ============================================================================

ALTER TABLE sv_contributors
  ADD COLUMN IF NOT EXISTS membership_verified BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE sv_contributors
  ADD COLUMN IF NOT EXISTS org_name TEXT;

ALTER TABLE sv_contributors
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'org_member'
    CHECK (source IN ('org_member', 'profile_search'));

-- Update the full view to include new columns
CREATE OR REPLACE VIEW sv_contributors_full AS
SELECT
  c.login,
  c.company,
  c.contributions,
  c.membership_verified,
  c.org_name,
  c.source,
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
