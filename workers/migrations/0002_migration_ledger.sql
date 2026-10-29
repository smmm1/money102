-- Apply after 0000_auth_snapshot.sql and 0001_daytogether.sql.
-- D1 has no native row-level security; isolation is enforced in the Worker by
-- deriving user_id from the validated bearer session and filtering every query.
CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TEXT NOT NULL
);
INSERT OR IGNORE INTO schema_migrations(version, name, applied_at) VALUES
  ('0000', '0000_auth_snapshot.sql', CURRENT_TIMESTAMP),
  ('0001', '0001_daytogether.sql', CURRENT_TIMESTAMP),
  ('0002', '0002_migration_ledger.sql', CURRENT_TIMESTAMP);
