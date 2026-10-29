-- DayTogether Phase 2 foundation for a dedicated Cloudflare D1 database.
-- All user data is scoped by authenticated user_id in Worker queries.
CREATE TABLE IF NOT EXISTS app_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS app_sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_app_sessions_user ON app_sessions(user_id);
CREATE TABLE IF NOT EXISTS user_app_data (
  user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  bucket TEXT NOT NULL CHECK(bucket = 'app_state'),
  payload TEXT NOT NULL CHECK(json_valid(payload)),
  updated_at TEXT NOT NULL,
  PRIMARY KEY(user_id, bucket)
);
