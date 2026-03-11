-- ============================================================================
-- Replace Tesla with OpenAI in Silicon Valley Park
-- Update company CHECK constraint to swap 'tesla' for 'openai'
-- ============================================================================

-- 1. Drop old constraint first (it blocks 'openai' values)
ALTER TABLE sv_contributors DROP CONSTRAINT IF EXISTS sv_contributors_company_check;

-- 2. Migrate existing tesla rows now that constraint is gone
UPDATE sv_contributors SET company = 'openai' WHERE company = 'tesla';

-- 3. Add new constraint allowing 'openai' instead of 'tesla'
ALTER TABLE sv_contributors ADD CONSTRAINT sv_contributors_company_check
  CHECK (company IN ('apple','google','nvidia','meta','amazon','microsoft','openai','netflix'));
