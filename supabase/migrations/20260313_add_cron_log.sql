CREATE TABLE IF NOT EXISTS cron_log (
  id BIGSERIAL PRIMARY KEY,
  job_name TEXT NOT NULL,
  target TEXT,
  status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed')),
  candidates INT,
  stored INT,
  error_msg TEXT,
  duration_ms INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cron_log_job_created
  ON cron_log (job_name, created_at DESC);
