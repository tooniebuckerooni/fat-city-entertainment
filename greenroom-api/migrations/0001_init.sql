-- The Green Room — schema.
--
-- Comments are plaintext, one level of replies, visible immediately and
-- moderated by removal. Never store a raw IP: everything identity-shaped is a
-- salted hash (IP_SALT, a Worker secret).
--
-- Two identities, deliberately different:
--   voter_hash / flagger_hash  = per-BROWSER token (localStorage), so two hosts
--                                on the same bar wifi are two people.
--   ip_hash                    = salted hash of the IP, used ONLY as a
--                                rate-limit key and for admin triage.

CREATE TABLE IF NOT EXISTS comments (
  id          TEXT PRIMARY KEY,
  thread      TEXT NOT NULL,
  parent_id   TEXT,                             -- one level of replies only
  handle      TEXT NOT NULL,                    -- pseudonym, 2-24 chars
  role_tag    TEXT,                             -- 'host'|'operator'|'venue'|'player'|NULL
  market      TEXT,                             -- optional free text, 40 char cap
  body        TEXT NOT NULL,                    -- plaintext, 6000 char cap
  votes       INTEGER NOT NULL DEFAULT 0,
  flags       INTEGER NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'visible',  -- 'visible'|'hidden'|'pinned'
  ip_hash     TEXT,                             -- salted SHA-256, never the raw IP
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

-- Flags are deduped the same way votes are. Without this one person can hit
-- flag three times and hide any comment on the board.
CREATE TABLE IF NOT EXISTS flags (
  comment_id   TEXT NOT NULL,
  flagger_hash TEXT NOT NULL,
  created_at   INTEGER NOT NULL,
  PRIMARY KEY (comment_id, flagger_hash)
);

CREATE TABLE IF NOT EXISTS rate_limits (
  key          TEXT PRIMARY KEY,                -- ip_hash + ':' + action
  count        INTEGER NOT NULL,
  window_start INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rl_window ON rate_limits (window_start);

-- The go-first reward. Rotated per thread so a repeat poster gets a new one.
CREATE TABLE IF NOT EXISTS unlocks (
  id     INTEGER PRIMARY KEY,
  thread TEXT NOT NULL,
  body   TEXT NOT NULL                          -- plaintext, 400 char cap
);
CREATE INDEX IF NOT EXISTS idx_unlocks_thread ON unlocks (thread);

-- The Index. One optional structured fact harvested after a successful post,
-- one field per thread. Three shapes cover every thread:
--   'number'   -> an index      (median/range; e.g. pay rate)
--   'category' -> a share       (percentage breakdown; e.g. how you got the gig)
--   'item'     -> a ranked list (votes; e.g. most-wanted themes)
CREATE TABLE IF NOT EXISTS datapoints (
  id          TEXT PRIMARY KEY,
  thread      TEXT NOT NULL,
  comment_id  TEXT,
  kind        TEXT NOT NULL,                    -- 'number'|'category'|'item'
  num_value   REAL,                             -- kind='number'
  text_value  TEXT,                             -- kind='category'|'item'
  unit        TEXT,                             -- e.g. 'usd_per_show'
  meta        TEXT,                             -- e.g. show length in minutes
  market      TEXT,
  status      TEXT NOT NULL DEFAULT 'visible',  -- 'visible'|'hidden'
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_dp_thread ON datapoints (thread, status, created_at DESC);
