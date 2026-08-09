# greenroom-api — Cloudflare Worker + D1 backend for The Green Room

## What this is

The Green Room is the comment layer for hosts and venue managers talking
about pay rates, pitching bars, and what actually works on a Tuesday. It's
backed by its own Cloudflare Worker and D1 database, separate from the
Triv 101 survey backend (`triv101-api/`), so changes here never touch that
live system.

**Live today:** the `green-room` thread on `/features.html`. The embed div
for a `hosting` thread already sits on `/gameshowhosts.html` but the thread
itself isn't launched yet — see `GREENROOM-PLAN.md` §8a for what's next.

## Architecture in brief

- **Worker + D1** (`greenroom-api/`) holds the comments, votes, flags, and the
  pay/theme/occasion index. This is the only writable copy of the data.
- **`assets/js/greenroom-widget.js`** is a plain JS file served from **GitHub
  Pages, not the Worker**. It fetches from the Worker and renders the live,
  interactive thread in the browser.
- **`_tools/bake-green-room.js`** writes each thread's current comments into
  the page HTML at build time, between marker comments, as real static HTML.
  That's what makes the discussion indexable on
  `www.fatcityentertainment.com` — a `<script src>` widget alone would put the
  content behind a fetch, which search engines read unreliably at best. If
  the Worker is down, the baked content is what's still on the page; the
  widget just fails to hydrate over it.

## First deploy, in order

Already done for the live `fatcity-greenroom` Worker and `greenroom` D1
database — kept below as the reference for standing up a new environment
(a fork, a second brand, disaster recovery) or for the "adding a new
thread later" steps further down, which reuse the same Worker.

1. **Create the D1 database.**
   ```bash
   npx wrangler d1 create greenroom
   ```
   or Cloudflare dashboard → Workers & Pages → D1 → Create database → name it
   `greenroom`. Either way, copy the printed `database_id` and paste it over
   the placeholder in `greenroom-api/wrangler.toml` (same
   `REPLACE_WITH_D1_DATABASE_ID` pattern `triv101-api/wrangler.toml` uses).

2. **Run the schema migration.**
   ```bash
   npx wrangler d1 execute greenroom --remote --file=greenroom-api/migrations/0001_init.sql
   ```
   or paste the contents of that file into the D1 console's query box in the
   dashboard (Workers & Pages → D1 → greenroom → Console).

3. **Create the Worker and paste in the code.** Dashboard → Workers & Pages →
   Create → Create Worker. Name it `fatcity-greenroom` (the name is what
   makes the URL come out as `fatcity-greenroom.dustinramsbottom.workers.dev`
   — see fact below). Open the online editor, paste in the full contents of
   `greenroom-api/src/index.js`, Save and Deploy. It's one file on purpose —
   see the note under Troubleshooting/deploy method below.

4. **Set the three secrets.** See the [Secrets](#secrets) table.

5. **Set the vars.** See the [Vars](#vars) table.

6. **Turnstile.** Dashboard → Turnstile → Add widget. Add
   `www.fatcityentertainment.com` (and any other domain that will embed a
   thread — e.g. `bingocardgenerator.online` once that surface launches) as
   an allowed domain. Note the **site key** (public — goes into the widget
   config and the `TURNSTILE_SITE_KEY` var) and the **secret key** (goes into
   the `TURNSTILE_SECRET` Worker secret, never the widget).

7. **Seed the pinned questions and unlocks.**
   ```bash
   node greenroom-api/seed/seed.js
   ```
   This reads `greenroom-api/seed/threads.json` and prints the SQL to insert
   each `"launch": true` thread's pinned question and unlocks. **It refuses
   to emit SQL while any `[OWNER: ...]` placeholder is still unresolved in
   that file** — that's intentional, same guard `_tools/publish-post.js` uses
   for unresolved bracket links. Resolve the placeholders first, then run it
   and execute the SQL it prints against D1 (dashboard console, or
   `npx wrangler d1 execute greenroom --remote --file=<the sql it produced>`).

8. **Smoke test with curl.** See [Curl smoke tests](#curl-smoke-tests) below.

## Secrets

Set in the Cloudflare dashboard under **Workers & Pages → fatcity-greenroom →
Settings → Variables and Secrets** (mark each one "Encrypt"). Never commit
these anywhere, and never put them in `CLAUDE.md` — that file is served
publicly by GitHub Pages.

| Secret | What it's for | Notes |
|---|---|---|
| `IP_SALT` | Salts the IP hash used for rate limiting and vote/flag dedupe | Random string, 32+ characters. Rotating it resets all rate limiting and vote/flag dedupe for everyone — don't rotate it casually. |
| `ADMIN_TOKEN` | Bearer token that unlocks `/admin/green-room.html` and the `/api/admin/*` endpoints | Treat it like a password. |
| `TURNSTILE_SECRET` | Server-side key the Worker uses to verify a comment's `turnstile_token` with Cloudflare | Pairs with the public `TURNSTILE_SITE_KEY` var below — this one is never public. |

## Vars

Non-secret, dashboard-editable, same Settings screen as above.

| Var | Example value | Notes |
|---|---|---|
| `ALLOWED_ORIGINS` | `https://www.fatcityentertainment.com,https://fatcityentertainment.com,https://bingocardgenerator.online,http://localhost` | Comma-separated. See below. |
| `TURNSTILE_SITE_KEY` | *(the public key from step 6)* | Public — safe to also hardcode in the widget config. |
| `DEV_BYPASS_TURNSTILE` | unset, or `"0"` in production | See warning below. |

**Why `ALLOWED_ORIGINS` matters:** because it's a var and not code, adding a
new site later — a Trivia Generator on its own domain, `wordjab.io`,
`bingocardgenerator.online` — is a text edit in the dashboard, **not** a
re-paste of the Worker. Origins are matched exact-string except
`http://localhost`, which matches by prefix so you don't have to list every
local dev port separately.

**`DEV_BYPASS_TURNSTILE` must be unset or `"0"` on the live Worker.** When
it's `"1"` the Worker skips Turnstile verification entirely — that flag
exists only so the code path can be exercised in the sandbox, which can't
reach `challenges.cloudflare.com` to do a real check. Left on in production
it means anyone can post without solving the challenge, which defeats the
entire point of having Turnstile.

## Embedding a thread

```html
<div data-fc-thread="green-room"></div>
<script src="https://www.fatcityentertainment.com/assets/js/greenroom-widget.js" defer></script>
```

This works dropped into a raw HTML page, pasted into a Weebly embed/code
block, or included from a page on a completely different domain (as long as
that domain is in `ALLOWED_ORIGINS`) — it's just a script tag and a div.

`data-fc-thread` is the thread's `key` from `greenroom-api/seed/threads.json`.
`green-room` (on `/features.html`) is live and taking real comments.
`hosting` (embedded on `/gameshowhosts.html`), `trivia-generator`, `bingo`,
and `triv101` are configured in that same file but not yet launched
(`"launch": false`) — see `GREENROOM-PLAN.md` §8a for what's blocking each
one.

## Adding a new thread later

1. Add an entry to `greenroom-api/seed/threads.json` with `"launch": true`
   and fill in the pinned question, unlocks, and harvest config — resolve
   every `[OWNER: ...]` placeholder.
2. Run `node greenroom-api/seed/seed.js` and execute the SQL it prints
   against D1 (same as first-deploy step 7).
3. Drop the embed div (above) on whatever page the thread belongs to, with
   `data-fc-thread` set to the new key.
4. Run `_tools/bake-green-room.js` so the thread has real static content on
   that page for search engines and JS-disabled visitors, not just the live
   widget.

## Moderation

`/admin/green-room.html` — not linked from site nav, `noindex`, excluded
from the sitemap and `_tools/check-links.js`. Paste the `ADMIN_TOKEN` in once
per session; it's sent as `Authorization: Bearer <token>` on every admin
call.

Comments appear immediately and are moderated by removal, not pre-approval —
a moderation queue is how a room like this dies. The one thing that queues
automatically: a comment that collects **three flags** auto-hides and drops
into the admin queue for review.

## Curl smoke tests

Replace `$WORKER` with `https://fatcity-greenroom.dustinramsbottom.workers.dev`
and `$ADMIN_TOKEN` with the real token before running these.

```bash
WORKER="https://fatcity-greenroom.dustinramsbottom.workers.dev"

# Read a thread
curl "$WORKER/api/comments?thread=green-room&sort=top&limit=25"

# Post a comment (website must stay empty — it's a honeypot; dwell is
# milliseconds since the widget loaded and must be >= 8000)
curl -X POST "$WORKER/api/comments" \
  -H "Content-Type: application/json" \
  -H "X-GR-Voter: smoke-test-voter-1" \
  -d '{
    "thread": "green-room",
    "handle": "SmokeTest",
    "role_tag": "operator",
    "market": "",
    "body": "curl smoke test, safe to delete",
    "parent_id": null,
    "website": "",
    "dwell": 9000,
    "turnstile_token": "PASTE_A_REAL_TOKEN_OR_USE_DEV_BYPASS_LOCALLY"
  }'

# Vote on a comment (swap COMMENT_ID for one returned above)
curl -X POST "$WORKER/api/comments/COMMENT_ID/vote" \
  -H "X-GR-Voter: smoke-test-voter-1"

# Flag a comment
curl -X POST "$WORKER/api/comments/COMMENT_ID/flag" \
  -H "X-GR-Voter: smoke-test-voter-1"

# Read the pay/theme/occasion index for a thread
curl "$WORKER/api/index?thread=green-room"

# Admin queue (flagged comments awaiting review)
curl "$WORKER/api/admin/queue" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Widget silently fails, browser console shows a CORS error | The embedding page's origin isn't in `ALLOWED_ORIGINS` | Add it (dashboard var edit, no re-paste needed) |
| `429` on posting/voting/flagging | Rate limit hit: 5 comments/hour, 40 votes/hour, 10 flags/hour, per IP hash | Working as intended — wait out the window. If it's firing on legitimate traffic, check `IP_SALT` wasn't just rotated (that alone doesn't cause false positives, but a very short window would) |
| Comment post rejected as a Turnstile failure | Missing/invalid `turnstile_token`, or `TURNSTILE_SECRET` doesn't match the widget's `TURNSTILE_SITE_KEY` | Confirm both keys come from the same Turnstile widget in the dashboard; confirm `DEV_BYPASS_TURNSTILE` isn't accidentally masking a real problem in a non-prod environment |
| A coding agent can't deploy this or curl the live Worker | The sandbox's egress proxy blocks `api.cloudflare.com` and `*.workers.dev` (403) | Expected — same as `triv101-api`. Deploys, dashboard changes, and live curl checks are always an owner action in a real browser, not something an agent here can do |

## Custom domain, later (optional — not needed for v1)

The Worker's URL, `fatcity-greenroom.dustinramsbottom.workers.dev`, works
fine as-is — the widget and bake script just call that URL directly. A
prettier custom domain (e.g. something under `fatcityentertainment.com`)
isn't available today because **DNS for the domain lives at Namecheap, not
Cloudflare**, and Cloudflare's "custom domain for a Worker" button only works
for zones Cloudflare is authoritative for.

To unlock it: move the domain's nameservers from Namecheap to Cloudflare,
recreating the existing DNS records there first (GitHub Pages keeps working
throughout — its records just move hosts). This is the same errand
`triv101-api` has been deferring. Once done, both Workers can get a real
subdomain instead of a `workers.dev` URL, and `wrangler deploy` /
Workers Builds become viable as a deploy path (Workers Builds also separately
needs the D1 `database_id` filled into `wrangler.toml`, done in step 1 above,
before it can connect to Git at all).

TODO: no target subdomain has been decided for this (e.g.
`greenroom.fatcityentertainment.com`) — pick one when this is actually
scheduled.
