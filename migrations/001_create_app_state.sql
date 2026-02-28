CREATE TABLE IF NOT EXISTS app_state (
  id SMALLINT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (id = 1)
);

CREATE INDEX IF NOT EXISTS idx_app_state_updated_at ON app_state (updated_at);
