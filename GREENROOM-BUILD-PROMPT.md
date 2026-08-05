# Build Prompt — "The Green Room" comment layer for Fat City Entertainment

Paste this into Claude Code from the root of `tooniebuckerooni/fat-city-entertainment`.

---

## Context

Fat City Entertainment runs trivia nights, music bingo, and sells downloadable game packs. The site currently has a `/features.html` page listing three free interactive tools:

- **Triv 101** — `/triv101/` — survey-style countdown game show, question bank grows from player surveys
- **Trivia Generator** — `/trivia-generator.html` — AI question generator, currently "coming soon"
- **Bingo Card Generator** — `https://bingocardgenerator.online/` — separate domain, free printable cards

These pages get traffic but are read-only. The people landing on them are trivia hosts, music bingo hosts, bar and restaurant managers, and event planners — an audience that talks constantly among themselves about pay rates, venue deals, and what actually works on a Tuesday night, but has nowhere good to do it. Reddit's r/triviahosts is the closest thing and it's thin.

The job: turn these four surfaces into a lightweight, welcoming discussion layer without turning the site into a forum product. This is a comment layer with opinionated seeding, not a community platform.

**Read first, before writing anything:** the existing CSS and page templates in the repo. Every design decision below must inherit from what's already there.

---

## What to build

A drop-in comment widget called **The Green Room** — the room where performers wait before going on. It appears on four threads:

| Thread key | Surface |
|---|---|
| `green-room` | `/features.html` — the main thread |
| `hosting` | `/gameshowhosts.html` — the craft-and-business thread |
| `triv101` | `/triv101/` |
| `trivia-generator` | `/trivia-generator.html` |
| `bingo` | `bingocardgenerator.online` |

One script, one embed pattern, five threads. The widget must work when dropped into a raw HTML page **and** when pasted into a Weebly embed block, because parts of the site are mid-migration:

```html
<div data-fc-thread="green-room"></div>
<script src="https://fatcity-greenroom.<subdomain>.workers.dev/widget.js" defer></script>
```

---

## Stack — decided, do not re-litigate

- **Backend:** Cloudflare Worker + **D1** (SQLite). Free tier covers this many times over, and the Cloudflare account already exists.
- **Deploy target:** the `*.workers.dev` subdomain for v1. Do **not** set up a custom domain — the DNS for `fatcityentertainment.com` sits at Squarespace Domains and that's a separate errand. Leave a comment in `wrangler.toml` noting the custom-domain path for later.
- **Spam:** Cloudflare Turnstile, same account, free.
- **Frontend:** vanilla JS, no framework, no build step. Target under 15KB gzipped for `widget.js` including CSS.
- **Do not use:** JSONBin (single-blob writes will lose comments under concurrency), Disqus, Giscus (requires GitHub accounts — this audience does not have them), or any hosted comment SaaS.

---

## Data model

```sql
CREATE TABLE comments (
  id          TEXT PRIMARY KEY,
  thread      TEXT NOT NULL,
  parent_id   TEXT,                          -- one level of replies only
  handle      TEXT NOT NULL,                 -- pseudonym, 2-24 chars
  role_tag    TEXT,                          -- 'host' | 'operator' | 'venue' | 'player' | NULL
  market      TEXT,                          -- optional free text, 40 char cap
  body        TEXT NOT NULL,                 -- plaintext, 6000 char cap
  votes       INTEGER NOT NULL DEFAULT 0,
  flags       INTEGER NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'visible', -- 'visible' | 'hidden' | 'pinned'
  ip_hash     TEXT,                          -- salted SHA-256, never the raw IP
  created_at  INTEGER NOT NULL
);
CREATE INDEX idx_thread ON comments(thread, status, created_at DESC);

CREATE TABLE votes (
  comment_id  TEXT NOT NULL,
  voter_hash  TEXT NOT NULL,
  created_at  INTEGER NOT NULL,
  PRIMARY KEY (comment_id, voter_hash)
);

CREATE TABLE rate_limits (
  key         TEXT PRIMARY KEY,              -- ip_hash + action
  count       INTEGER NOT NULL,
  window_start INTEGER NOT NULL
);
```

Never store a raw IP address. Hash with a salt held as a Worker secret.

---

## Ranking

Default sort is **Top**, but not naive vote-count — pure vote sorting freezes the first week's comments at the summit forever and new arrivals never surface, which kills a board this size. Use a Hacker News-style decay, computed at read time in the Worker:

```
score = (votes) / pow(hours_since_created + 2, 1.5)
```

Pinned comments always sort first. Offer a **Newest** toggle next to Top. Persist the reader's choice in `localStorage`.

Replies sort by votes only, no decay, capped at one nesting level. If someone tries to reply to a reply, it attaches to the parent.

### Long comments are the point

The highest-value posts in this space run 500–800 words — someone walking through their entire process for cold-pitching a bar, or exactly how they structure a two-weeks-free trial. Do not design against that. Cap the body at 6,000 characters, and in the UI fold anything past roughly 800 characters behind an inline "Read the rest" that expands in place without a reload. The compose box grows with typing; no character counter until 5,000, then a quiet one.

### The go-first reward

The blocker on a board like this is not that people lack things to say — it's that nobody wants to be the first to disclose. So posting has to pay off immediately.

When a comment posts successfully, replace the compose box with a short confirmation that includes one genuinely useful thing from Fat City that a lurker would not have seen. Pull it from a small `unlocks` table keyed by thread, rotating so a repeat poster gets a different one:

```sql
CREATE TABLE unlocks (
  id     INTEGER PRIMARY KEY,
  thread TEXT NOT NULL,
  body   TEXT NOT NULL   -- plaintext, 400 char cap
);
```

Render it as: **"You went first. Here's one we don't usually give away —"** followed by the unlock.

This is a reward, never a gate. Reading is always open to everyone, ungated, indexable. Do not build a "post to reveal" wall on the comments themselves; it would cost the SEO and kill the thread before it starts. [Dusty to write 3–4 real unlocks per thread before launch — these have to be things worth having, or the mechanic reads as a bait-and-switch and does more damage than not having it.]

---

## API

All endpoints on the Worker. CORS allowlist exactly: `https://www.fatcityentertainment.com`, `https://fatcityentertainment.com`, `https://bingocardgenerator.online`, `http://localhost:*`.

- `GET  /api/comments?thread=&sort=top|new&limit=25&cursor=` → comments + reply children, plus `total`
- `POST /api/comments` → requires valid Turnstile token; returns the created comment
- `POST /api/comments/:id/vote` → idempotent per `voter_hash`; returns new count
- `POST /api/comments/:id/flag` → increments flags; at 3 flags auto-set `status='hidden'` and surface in the admin queue
- `GET  /api/admin/queue` → bearer-token auth via Worker secret
- `POST /api/admin/comments/:id` → `{action: 'hide'|'restore'|'pin'|'unpin'|'delete'}`

Return real HTTP status codes and JSON error bodies with a `message` the widget can display verbatim.

---

## Abuse controls

No accounts, no email, no login. That's deliberate — this audience will not sign up for anything. Which means the spam defenses have to carry the whole load:

- Turnstile token verified server-side on every POST
- Hidden honeypot field; any submission that fills it gets a 200 and goes nowhere
- Minimum 8-second dwell time between widget load and first submit
- Per-`ip_hash` limits: 5 comments/hour, 40 votes/hour, 10 flags/hour
- Body is **plaintext only** — escape on render, no HTML, no markdown. Auto-link at most one bare URL per comment, `rel="nofollow ugc noopener"`. Comments with 2+ URLs post as `hidden` pending review.
- Handle blocklist for impersonation: `fatcity`, `admin`, `moderator`, `official`, and case/spacing variants
- Votes deduped by `voter_hash` (salted hash of IP + thread) **and** `localStorage`, so the obvious double-vote paths are both closed

Moderation is **post-hoc, not pre-hoc**. Comments appear immediately. A board where posts sit in a queue for six hours is a dead board, and dead is the actual failure mode here — not spam.

---

## Seeded questions — the part that matters most

Each thread opens with one pinned question from Fat City. These are not decoration; they're the entire reason the thing works. Each one does double duty as product research.

**`green-room` (features.html)** — pinned, posted as `Fat City` with `role_tag: operator`:

> **What do you get paid per game — and what's actually included?**
>
> Rates for this work are all over the map and nobody can find out what anything is worth without asking a stranger. So: what's your number, what's the format, how long is the game, and does the venue cover your tab?
>
> We'll go first. [Dusty to fill in real Fat City numbers before launch — this must be a real disclosure, not a placeholder.]

**`hosting` (gameshowhosts.html)** — pinned, posted as `Fat City` with `role_tag: operator`:

> **How do you walk into a bar that doesn't have trivia yet?**
>
> Everybody's process is different and most of us worked ours out alone. What do you actually say, who do you say it to, and how many times do you go back before you write the place off?
>
> Our angle on this is sideways — before this was a trivia company it was fifteen years of managing bars and restaurants, which means we've been the manager getting pitched far more often than the host doing the pitching. So we'll go first with what that side of the bar is actually thinking. [Dusty — this is the anchor post. Write it long. It is the single strongest thing Fat City can put in this room and nobody else in the space can write it.]

**`triv101`:**

> **What's the question your room always gets wrong?**
>
> The Triv 101 bank grows from real player surveys. Tell us the one that reliably splits a room and we'll build a survey round around it.

**`trivia-generator`:**

> **What theme do you wish you had a ready-made round for?**
>
> The generator's still in the shop. Tell us what you'd type into it and we'll make sure it can answer.

**`bingo`:**

> **What are you making cards for?**
>
> Classroom, baby shower, bar night, staff party — we're curious what people are actually printing.

---

## Positioning guardrails — non-negotiable

Fat City is an *operator* hosting a discussion where pay rates get discussed. That's fine and useful, but it has to be framed carefully:

1. **Host-first framing throughout.** This is hosts sharing what they earn. Operators and venues are welcome participants, not the audience.
2. **Never seed, and never let stand as a pinned prompt, anything shaped like "what should we all be paying?"** Individuals disclosing their own rates is transparency. A room of operators converging on a number is a different thing with a different smell. If a thread starts drifting that way it gets unpinned, not featured.
3. **Disclosure line in the widget footer:** "The Green Room is hosted by Fat City Entertainment. We run trivia too — we're in here as participants, and we post our own numbers."
4. **One posted norm, shown once above the compose box:** "Share your own numbers. Don't tell anyone else what to charge."

---

## Design direction

Inherit the site's existing palette, type, and spacing — read the CSS in the repo and derive from it. Do not introduce a new visual system; this is a graft, not a transplant.

Spend the one bold move on the **thread header**: a small marquee-bulb or backstage-door treatment that makes "The Green Room" read as a place rather than a comments section. Everything below it stays quiet — comments are text, votes are a single subtle control, no avatars, no badges, no gamification, no karma scores.

Copy is plain and active. Empty state is an invitation, not an apology: "Nobody's said anything yet. Go first." Errors say what happened and what to do.

Quality floor, unannounced: responsive to 360px, visible keyboard focus, `aria-live="polite"` on the comment list, `prefers-reduced-motion` respected, works with JS disabled (degrade to the pinned question rendered server-side as static HTML with a note).

---

## Admin

Single page at `/admin/green-room.html`, not linked from anywhere in the site nav. Bearer token entered once and held in `sessionStorage`. Shows: flagged queue, hidden comments, recent 50 across all threads, and hide/restore/pin/delete controls. Plain and fast — this is a tool for one person on a phone behind a bar, not a dashboard.

---

## Explicitly out of scope

No user accounts. No email capture. No notifications. No nesting past one level. No rich text, images, or file uploads. No DMs. No search. No separate forum site. No structured rate-submission form yet — that's the obvious next step once the free-text thread proves people will actually post, and building it now guesses at fields before we know them.

---

## Acceptance criteria

1. `widget.js` loads and renders on all five surfaces, including cross-domain on `bingocardgenerator.online`
2. A comment posted from a clean browser appears in the list without a page reload
3. Posting returns a go-first unlock, and a second post from the same browser returns a different one
4. A 4,000-character comment saves intact and folds correctly, expanding in place
5. Voting works, dedupes, and survives a page refresh
6. Top and Newest both sort correctly; a fresh comment with 2 votes outranks a two-week-old comment with 5
7. Turnstile rejects a POST with a missing or replayed token
8. Rate limits return 429 with a readable message
9. Flagging three times hides a comment and it appears in the admin queue
10. Widget passes an axe-core scan with zero critical issues
11. `widget.js` under 15KB gzipped
12. No raw IP addresses anywhere in D1

---

## Deliverables

- `worker/` — Worker source, `wrangler.toml`, D1 schema migration
- `worker/widget.js` — the embeddable widget, CSS inlined
- `admin/green-room.html`
- Updated `features.html`, `gameshowhosts.html`, `triv101/index.html`, `trivia-generator.html` with the embed div
- A standalone embed snippet in `README-greenroom.md` for pasting into Weebly and into `bingocardgenerator.online`
- Seed script that inserts the five pinned questions and the `unlocks` rows
- `README-greenroom.md`: deploy steps, secrets to set (`IP_SALT`, `ADMIN_TOKEN`, `TURNSTILE_SECRET`), and how to add the custom domain later

Build the Worker and schema first, verify the API with curl, then the widget, then wire the pages. Show me the pinned-question copy rendered in the widget before wiring all four surfaces.
