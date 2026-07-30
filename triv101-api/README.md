# triv101-api — Cloudflare Worker + D1 backend for the survey stream

Powers the Community Surveys stream: shared question bank, answers, one-vote-
per-voter, comments, suggestions, moderation, and the confirmed-questions feed
the game reads. Optional realtime via Ably.

## What's here
- `src/index.js` — the Worker (SSR stream + JSON API + moderation admin).
- `migrations/0001_init.sql` — schema.
- `migrations/0002_seed_prompts.sql` — the 100 survey prompts (source=seed).
- `wrangler.toml` — config. Secrets are **not** here (set via `wrangler secret`).

## Local dev (already verified)
```bash
npm install
npm run migrate:local     # applies schema + seed to a local SQLite D1
echo "ADMIN_PASS=testpass" > .dev.vars
npm run dev               # http://127.0.0.1:8787
```

## Deploy to Cloudflare

**1. Auth.** Either interactive browser login:
```bash
npx wrangler login
```
…or set a scoped API token (Workers Scripts: Edit, D1: Edit) as
`CLOUDFLARE_API_TOKEN` in your shell env — do **not** paste it into files.

**2. Create the D1 database** and paste the printed `database_id` into
`wrangler.toml`:
```bash
npx wrangler d1 create triv101
```

**3. Apply schema + seed to the real DB:**
```bash
npx wrangler d1 execute triv101 --remote --file=migrations/0001_init.sql
npx wrangler d1 execute triv101 --remote --file=migrations/0002_seed_prompts.sql
```

**4. Set secrets:**
```bash
npx wrangler secret put ADMIN_PASS      # password for /admin (user is "admin")
npx wrangler secret put ABLY_API_KEY    # optional — enables live updates
```

**5. Deploy:**
```bash
npx wrangler deploy
```

**6. Give it a URL.** In the Cloudflare dashboard → Workers → triv101-api →
Settings → Domains & Routes, add a custom domain (e.g.
`surveys.fatcityentertainment.com`) or a route on the zone.

## Wire the site to it
- The static preview at `/triv101/surveys.html` can redirect to the Worker URL
  (or map the Worker to `/triv101/surveys*` via a route) so the live,
  SEO-rendered stream replaces the sample-data preview.
- Point the game's question bank at `GET /api/game-bank` so confirmed questions
  flow into play (small change to `triv101/survey.js`'s `getQuestions`).

## Getting the keys

**Ably** (realtime — optional but recommended)
1. Sign in at https://ably.com/ → **Create app** (e.g. "triv101").
2. Open the app → **API Keys** → copy the **Root** key (looks like
   `xxxx.yyyy:zzzz`).
3. `npx wrangler secret put ABLY_API_KEY` and paste it. The key stays server-
   side; browsers only ever get short-lived tokens from `/api/ably-token`.

**Formspree** (early suggestion-intake email — optional)
1. Sign in at https://formspree.io/ → **New form** → copy its endpoint
   (`https://formspree.io/f/xxxx…`).
2. Put it in `wrangler.toml` under `FORMSPREE_ENDPOINT`, or reuse the form
   already on the site.

## Moderation
Visit `/admin` (HTTP basic auth: user `admin`, password = `ADMIN_PASS`).
- Approve/reject **suggested** questions (hidden from the public feed until
  approved).
- **Confirm** a prompt that's hit its vote quota → its top 3 snapshot into the
  game bank.
- Hide individual answers/comments (both are visible immediately, moderated by
  removal).
