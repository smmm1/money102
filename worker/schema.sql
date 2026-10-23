-- Cloudflare D1 schema for money102 app snapshots.
-- Supabase Auth remains the identity provider; user_id is verified by the Worker.
CREATE TABLE IF NOT EXISTS user_app_data (
  user_id TEXT NOT NULL,
  bucket TEXT NOT NULL CHECK (bucket = 'app_state'),
  payload TEXT NOT NULL CHECK (json_valid(payload)),
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, bucket)
);

CREATE INDEX IF NOT EXISTS idx_user_app_data_updated_at
  ON user_app_data(updated_at);
