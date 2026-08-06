CREATE TABLE IF NOT EXISTS comments (
  id          TEXT PRIMARY KEY,
  thread      TEXT NOT NULL,
  parent_id   TEXT,
  handle      TEXT NOT NULL,
  role_tag    TEXT,
  market      TEXT,
  body        TEXT NOT NULL,
  votes       INTEGER NOT NULL DEFAULT 0,
  flags       INTEGER NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'visible',
  ip_hash     TEXT,
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_thread      ON comments (thread, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_thread_parent ON comments (thread, parent_id);
CREATE TABLE IF NOT EXISTS votes (
  comment_id  TEXT NOT NULL,
  voter_hash  TEXT NOT NULL,
  created_at  INTEGER NOT NULL,
  PRIMARY KEY (comment_id, voter_hash)
);
CREATE TABLE IF NOT EXISTS flags (
  comment_id   TEXT NOT NULL,
  flagger_hash TEXT NOT NULL,
  created_at   INTEGER NOT NULL,
  PRIMARY KEY (comment_id, flagger_hash)
);
CREATE TABLE IF NOT EXISTS rate_limits (
  key          TEXT PRIMARY KEY,
  count        INTEGER NOT NULL,
  window_start INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rl_window ON rate_limits (window_start);
CREATE TABLE IF NOT EXISTS unlocks (
  id     INTEGER PRIMARY KEY,
  thread TEXT NOT NULL,
  body   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_unlocks_thread ON unlocks (thread);
CREATE TABLE IF NOT EXISTS datapoints (
  id          TEXT PRIMARY KEY,
  thread      TEXT NOT NULL,
  comment_id  TEXT,
  kind        TEXT NOT NULL,
  num_value   REAL,
  text_value  TEXT,
  unit        TEXT,
  meta        TEXT,
  market      TEXT,
  status      TEXT NOT NULL DEFAULT 'visible',
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_dp_thread ON datapoints (thread, status, created_at DESC);
