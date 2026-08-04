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
npx wrangler secret put RESEND_API_KEY  # optional — powers the email-capture gate
```
Also set `RESEND_AUDIENCE_ID` and `RESEND_FROM_EMAIL` in `wrangler.toml`'s
`[vars]` (not secrets — see the comments there). If this Worker was deployed
by pasting `src/index.js` into the Cloudflare dashboard rather than via the
CLI above, set all of these the same way: **Workers → triv101-api →
Settings → Variables and Secrets**.

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

**Resend** (email-capture gate on `bingocardgenerator.html` — optional)
1. Sign in at https://resend.com/.
2. **Domains** → add and verify `fatcityentertainment.com` (or a subdomain
   like `mail.fatcityentertainment.com`) — required before Resend will send
   from an `@fatcityentertainment.com` address. DNS is on Namecheap; add the
   TXT/DKIM/MX records Resend gives you there.
3. **API Keys** → create one with **Sending access** → `wrangler secret put
   RESEND_API_KEY` and paste it.
4. **Audiences** → create one (e.g. "Generator signups") → copy its ID into
   `RESEND_AUDIENCE_ID`. This is what future segmented sends (the weekly
   host email, seasonal announcements) target — those go out from Resend's
   own dashboard as **Broadcasts**, no code needed per send.
5. Set `RESEND_FROM_EMAIL` to the verified address, e.g. `"Fat City
   Entertainment <cards@fatcityentertainment.com>"`.
6. Test: submit an email on `/bingocardgenerator.html`'s gate, confirm it
   lands in the Audience and the welcome email arrives.

## Moderation
Visit `/admin` (HTTP basic auth: user `admin`, password = `ADMIN_PASS`).
- Approve/reject **suggested** questions (hidden from the public feed until
  approved).
- **Confirm** a prompt that's hit its vote quota → its top 3 snapshot into the
  game bank.
- Hide individual answers/comments (both are visible immediately, moderated by
  removal).
