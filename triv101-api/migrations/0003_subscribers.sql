-- Email capture attribution.
--
-- The /api/subscribe endpoint has accepted a `source` field since the
-- generator's gate shipped on 1 Aug 2026, and has silently DISCARDED it ever
-- since: resendSubscribe() took only the address. So every contact in the
-- Resend audience looks identical, and there is no way to tell a generator
-- signup from a song-list signup, or which of the 50 song-list pages converts.
--
-- Resend's audience-contacts API takes email, first_name, last_name and
-- unsubscribed, and nothing else, so there is no honest field to put a source
-- in over there. Abusing last_name would put it into a personalised greeting.
-- This Worker already has a D1 binding, and D1 is the one store the owner can
-- actually read (the GA4 property is on an account their login cannot see), so
-- attribution is recorded here and Resend stays the sending list.
--
-- The row is also a backup of who subscribed, independent of Resend.
--
-- Writing it is best-effort in the Worker: a failure here must never be the
-- reason someone's cards page errors, which is the rule the gate has followed
-- from the start.

CREATE TABLE IF NOT EXISTS subscribers (
  email      TEXT PRIMARY KEY,                   -- lowercased by the endpoint
  source     TEXT NOT NULL DEFAULT 'unknown',    -- 'bingocardgenerator' | 'song-list-<slug>' | ...
  created_at INTEGER NOT NULL,
  resend_ok  INTEGER NOT NULL DEFAULT 0          -- 1 when the audience call returned ok
);

-- What converts, newest first:
--   SELECT source, COUNT(*) n FROM subscribers GROUP BY source ORDER BY n DESC;
CREATE INDEX IF NOT EXISTS subscribers_source ON subscribers (source);
