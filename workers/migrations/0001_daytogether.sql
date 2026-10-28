-- DayTogether normalized data model for Cloudflare D1.
-- Apply only after backing up the database. Existing app_state snapshots are preserved.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES app_users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT '',
  timezone TEXT NOT NULL DEFAULT 'Asia/Bangkok',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(id, user_id)
);

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id TEXT PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
  app_name TEXT NOT NULL DEFAULT 'DayTogether',
  theme TEXT NOT NULL DEFAULT 'system' CHECK(theme IN ('light','dark','system')),
  privacy_hidden INTEGER NOT NULL DEFAULT 0 CHECK(privacy_hidden IN (0,1)),
  dashboard_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(dashboard_json)),
  timezone TEXT NOT NULL DEFAULT 'Asia/Bangkok',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS savings_goals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK(length(trim(title)) BETWEEN 1 AND 120),
  target_cents INTEGER NOT NULL CHECK(target_cents > 0),
  due_date TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','done','archived')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_savings_goals_user_status ON savings_goals(user_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS savings_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  goal_id TEXT,
  type TEXT NOT NULL CHECK(type IN ('deposit','withdrawal','opening_balance')),
  amount_cents INTEGER NOT NULL CHECK(amount_cents > 0),
  entry_date TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '' CHECK(length(note) <= 2000),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(goal_id, user_id) REFERENCES savings_goals(id, user_id) ON DELETE RESTRICT,
  UNIQUE(id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_savings_transactions_user_date ON savings_transactions(user_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_savings_transactions_goal_date ON savings_transactions(goal_id, entry_date DESC);

CREATE TABLE IF NOT EXISTS health_preferences (
  user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  metric TEXT NOT NULL CHECK(metric IN ('weight','blood_pressure','sleep','water','symptom','legacy')),
  enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0,1)),
  daily_goal INTEGER CHECK(daily_goal IS NULL OR daily_goal > 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY(user_id, metric)
);

CREATE TABLE IF NOT EXISTS health_entries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  metric TEXT NOT NULL CHECK(metric IN ('weight','blood_pressure','sleep','water','symptom')),
  measured_at TEXT NOT NULL,
  value_real REAL,
  systolic INTEGER,
  diastolic INTEGER,
  pulse INTEGER,
  bedtime TEXT,
  wake_time TEXT,
  sleep_quality TEXT CHECK(sleep_quality IS NULL OR sleep_quality IN ('good','okay','poor')),
  title TEXT,
  severity INTEGER CHECK(severity IS NULL OR severity BETWEEN 1 AND 5),
  note TEXT NOT NULL DEFAULT '' CHECK(length(note) <= 4000),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK(
    (metric='weight' AND value_real > 0 AND systolic IS NULL AND diastolic IS NULL) OR
    (metric='water' AND value_real > 0 AND systolic IS NULL AND diastolic IS NULL) OR
    (metric='blood_pressure' AND systolic > 0 AND diastolic > 0 AND (pulse IS NULL OR pulse > 0)) OR
    (metric='sleep' AND bedtime IS NOT NULL AND wake_time IS NOT NULL) OR
    (metric='symptom' AND title IS NOT NULL AND length(trim(title)) > 0)
  )
);
CREATE INDEX IF NOT EXISTS idx_health_entries_user_metric_date ON health_entries(user_id, metric, measured_at DESC);

CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'ไม่มีชื่อ' CHECK(length(title) <= 240),
  body TEXT NOT NULL DEFAULT '' CHECK(length(body) <= 100000),
  kind TEXT NOT NULL DEFAULT 'note' CHECK(kind IN ('note','diary')),
  entry_date TEXT NOT NULL,
  mood TEXT NOT NULL DEFAULT '' CHECK(mood IN ('','ดีใจ','เฉยๆ','เศร้า')),
  pinned INTEGER NOT NULL DEFAULT 0 CHECK(pinned IN (0,1)),
  archived INTEGER NOT NULL DEFAULT 0 CHECK(archived IN (0,1)),
  version INTEGER NOT NULL DEFAULT 1 CHECK(version > 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_notes_user_updated ON notes(user_id, archived, pinned DESC, updated_at DESC);

CREATE TABLE IF NOT EXISTS note_tags (
  note_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  tag TEXT NOT NULL CHECK(length(trim(tag)) BETWEEN 1 AND 60),
  PRIMARY KEY(note_id, user_id, tag),
  FOREIGN KEY(note_id, user_id) REFERENCES notes(id, user_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_note_tags_user_tag ON note_tags(user_id, tag);

CREATE TABLE IF NOT EXISTS split_bills (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK(length(trim(title)) BETWEEN 1 AND 160),
  bill_date TEXT NOT NULL,
  shop TEXT NOT NULL DEFAULT '' CHECK(length(shop) <= 200),
  note TEXT NOT NULL DEFAULT '' CHECK(length(note) <= 4000),
  service_rate_basis_points INTEGER NOT NULL DEFAULT 0 CHECK(service_rate_basis_points BETWEEN 0 AND 10000),
  tax_rate_basis_points INTEGER NOT NULL DEFAULT 0 CHECK(tax_rate_basis_points BETWEEN 0 AND 10000),
  subtotal_cents INTEGER NOT NULL DEFAULT 0 CHECK(subtotal_cents >= 0),
  discount_cents INTEGER NOT NULL DEFAULT 0 CHECK(discount_cents >= 0),
  total_cents INTEGER NOT NULL CHECK(total_cents >= 0),
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','settling','settled')),
  version INTEGER NOT NULL DEFAULT 1 CHECK(version > 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_split_bills_user_date ON split_bills(user_id, bill_date DESC);

CREATE TABLE IF NOT EXISTS split_participants (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  bill_id TEXT NOT NULL,
  display_name TEXT NOT NULL CHECK(length(trim(display_name)) BETWEEN 1 AND 100),
  is_me INTEGER NOT NULL DEFAULT 0 CHECK(is_me IN (0,1)),
  created_at TEXT NOT NULL,
  FOREIGN KEY(bill_id, user_id) REFERENCES split_bills(id, user_id) ON DELETE CASCADE,
  UNIQUE(id, bill_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_split_participants_bill ON split_participants(user_id, bill_id);

CREATE TABLE IF NOT EXISTS split_expenses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  bill_id TEXT NOT NULL,
  title TEXT NOT NULL CHECK(length(trim(title)) BETWEEN 1 AND 180),
  amount_cents INTEGER NOT NULL CHECK(amount_cents > 0),
  split_method TEXT NOT NULL CHECK(split_method IN ('equal','custom','percentage','selected')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(bill_id, user_id) REFERENCES split_bills(id, user_id) ON DELETE CASCADE,
  UNIQUE(id, bill_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_split_expenses_bill ON split_expenses(user_id, bill_id);

CREATE TABLE IF NOT EXISTS split_expense_payers (
  expense_id TEXT NOT NULL,
  bill_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  participant_id TEXT NOT NULL,
  amount_cents INTEGER NOT NULL CHECK(amount_cents > 0),
  PRIMARY KEY(expense_id, participant_id),
  FOREIGN KEY(expense_id, bill_id, user_id) REFERENCES split_expenses(id, bill_id, user_id) ON DELETE CASCADE,
  FOREIGN KEY(participant_id, bill_id, user_id) REFERENCES split_participants(id, bill_id, user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS split_expense_shares (
  expense_id TEXT NOT NULL,
  bill_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  participant_id TEXT NOT NULL,
  share_cents INTEGER NOT NULL CHECK(share_cents >= 0),
  percentage_basis_points INTEGER CHECK(percentage_basis_points IS NULL OR percentage_basis_points BETWEEN 0 AND 10000),
  PRIMARY KEY(expense_id, participant_id),
  FOREIGN KEY(expense_id, bill_id, user_id) REFERENCES split_expenses(id, bill_id, user_id) ON DELETE CASCADE,
  FOREIGN KEY(participant_id, bill_id, user_id) REFERENCES split_participants(id, bill_id, user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS split_settlements (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  bill_id TEXT NOT NULL,
  from_participant_id TEXT NOT NULL,
  to_participant_id TEXT NOT NULL,
  amount_cents INTEGER NOT NULL CHECK(amount_cents > 0),
  paid_at TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '' CHECK(length(note) <= 2000),
  reversed_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY(bill_id, user_id) REFERENCES split_bills(id, user_id) ON DELETE CASCADE,
  FOREIGN KEY(from_participant_id, bill_id, user_id) REFERENCES split_participants(id, bill_id, user_id) ON DELETE CASCADE,
  FOREIGN KEY(to_participant_id, bill_id, user_id) REFERENCES split_participants(id, bill_id, user_id) ON DELETE CASCADE,
  CHECK(from_participant_id <> to_participant_id)
);
CREATE INDEX IF NOT EXISTS idx_split_settlements_bill ON split_settlements(user_id, bill_id, paid_at DESC);

CREATE TABLE IF NOT EXISTS bbq_visits (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  shop_name TEXT NOT NULL CHECK(length(trim(shop_name)) BETWEEN 1 AND 200),
  title TEXT NOT NULL DEFAULT '',
  visit_at TEXT NOT NULL,
  branch_area TEXT NOT NULL DEFAULT '',
  friends_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(friends_json)),
  people_count INTEGER NOT NULL DEFAULT 1 CHECK(people_count > 0),
  total_cents INTEGER CHECK(total_cents IS NULL OR total_cents >= 0),
  personal_cost_cents INTEGER CHECK(personal_cost_cents IS NULL OR personal_cost_cents >= 0),
  rating INTEGER CHECK(rating IS NULL OR rating BETWEEN 1 AND 5),
  menu_text TEXT NOT NULL DEFAULT '' CHECK(length(menu_text) <= 4000),
  memory_text TEXT NOT NULL DEFAULT '' CHECK(length(memory_text) <= 10000),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_bbq_visits_user_date ON bbq_visits(user_id, visit_at DESC);

CREATE TABLE IF NOT EXISTS bbq_photos (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  visit_id TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  mime_type TEXT NOT NULL CHECK(mime_type IN ('image/jpeg','image/png','image/webp')),
  byte_size INTEGER NOT NULL CHECK(byte_size > 0 AND byte_size <= 8000000),
  created_at TEXT NOT NULL,
  FOREIGN KEY(visit_id, user_id) REFERENCES bbq_visits(id, user_id) ON DELETE CASCADE,
  UNIQUE(user_id, storage_key)
);

CREATE TABLE IF NOT EXISTS bbq_bill_links (
  user_id TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  visit_id TEXT NOT NULL,
  bill_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY(user_id, visit_id),
  UNIQUE(user_id, bill_id),
  FOREIGN KEY(visit_id, user_id) REFERENCES bbq_visits(id, user_id) ON DELETE CASCADE,
  FOREIGN KEY(bill_id, user_id) REFERENCES split_bills(id, user_id) ON DELETE CASCADE
);
