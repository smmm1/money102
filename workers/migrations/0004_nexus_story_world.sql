-- NEXUS world and story persistence. Existing owner auth tables are not modified.
CREATE TABLE IF NOT EXISTS story_worlds (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK(length(trim(title)) BETWEEN 1 AND 120),
  setting_json TEXT NOT NULL CHECK(json_valid(setting_json)),
  state_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(state_json)),
  image_settings_json TEXT NOT NULL DEFAULT '{"enabled":false,"auto":false}' CHECK(json_valid(image_settings_json)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(id,user_id)
);
CREATE INDEX IF NOT EXISTS idx_story_worlds_user_updated ON story_worlds(user_id,updated_at DESC);
CREATE TABLE IF NOT EXISTS story_turns (
  id TEXT PRIMARY KEY,
  world_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK(role IN ('player','narrator')),
  content TEXT NOT NULL CHECK(length(content)<=12000),
  metadata_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(metadata_json)),
  created_at TEXT NOT NULL,
  FOREIGN KEY(world_id,user_id) REFERENCES story_worlds(id,user_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_story_turns_world_created ON story_turns(world_id,user_id,created_at);
