-- TRIV101 survey backend — schema
-- Prompts are the survey questions. Answers accrue votes; comments are free
-- discussion. Suggested prompts stay hidden until a moderator approves them;
-- answers and comments are visible immediately and moderated by removal.

CREATE TABLE IF NOT EXISTS prompts (
  id           TEXT PRIMARY KEY,
  text         TEXT NOT NULL,
  source       TEXT NOT NULL DEFAULT 'suggested',  -- 'seed' | 'suggested'
  status       TEXT NOT NULL DEFAULT 'suggested',  -- 'suggested' | 'surveying' | 'confirmed' | 'rejected'
  created_at   INTEGER NOT NULL,
  confirmed_at INTEGER
);

CREATE TABLE IF NOT EXISTS answers (
  id         TEXT PRIMARY KEY,
  prompt_id  TEXT NOT NULL,
  text       TEXT NOT NULL,
  norm       TEXT NOT NULL,                       -- lowercased/trimmed, for dedupe + ranking
  votes      INTEGER NOT NULL DEFAULT 0,
  status     TEXT NOT NULL DEFAULT 'visible',     -- 'visible' | 'hidden'
  created_at INTEGER NOT NULL,
  UNIQUE (prompt_id, norm)
);

CREATE TABLE IF NOT EXISTS votes (
  id         TEXT PRIMARY KEY,
  answer_id  TEXT NOT NULL,
  voter      TEXT NOT NULL,                       -- anon cookie id
  created_at INTEGER NOT NULL,
  UNIQUE (answer_id, voter)
);

CREATE TABLE IF NOT EXISTS comments (
  id         TEXT PRIMARY KEY,
  prompt_id  TEXT NOT NULL,
  name       TEXT,
  text       TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'visible',     -- 'visible' | 'hidden'
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_answers_prompt  ON answers (prompt_id);
CREATE INDEX IF NOT EXISTS idx_comments_prompt ON comments (prompt_id);
CREATE INDEX IF NOT EXISTS idx_prompts_status  ON prompts (status);
