# Fat City Entertainment — project notes for agents

Durable facts so nobody has to re-ask. Keep this current; **never put secrets
here** — the repo is served publicly by GitHub Pages.

## What this is / how it's hosted
- Static, **Weebly-exported** marketing site. **GitHub Pages** serves the
  `main` branch; custom domain **www.fatcityentertainment.com** via `CNAME`
  (+ `.nojekyll`).
- **Repo:** `tooniebuckerooni/fat-city-entertainment` (GitHub).
- **DNS is on Namecheap**, not Cloudflare. Cloudflare only runs the survey
  Worker (below). So Cloudflare's "custom domain for a Worker" button does NOT
  work for us without moving DNS to Cloudflare first.
- No server or database for the marketing site — it's just files.

## Branch / deploy workflow
- Feature branches come and go (check `git branch --show-current`) — don't
  hardcode a name here.
- Pages only serves `main`, so to preview live we **fast-forward merge the
  branch into `main`** (`git push origin <branch>:main`). The site owner has
  repeatedly been OK merging low-risk, additive work straight to main for
  preview — but confirm before merging anything that touches pricing, buy
  links, or removes/hides something already live.

## Site-wide edits (nav, favicons, etc.)
- The nav is **duplicated on ~397 live pages** (a desktop + a mobile copy each).
  **Never hand-edit nav across pages** — use/extend the idempotent Node scripts
  in `_tools/` (e.g. `add-app-nav.js`, `restyle-featured-nav.js`). Match the
  "Trivia Store" item by its link, not its `<li>` id (Weebly rewrites the id to
  `active` on the current page).
- `assets/css/site-extras.css` is linked on all pages — put global CSS there.
- New content pages are cloned from a live page's shell (see
  `_tools/new-content-page.js` / `make-*-page.js`) so they inherit nav/footer.
- Top-level nav: **Trivia Store · ★ Featured! (dropdown) · Our Games · Bingo
  Card Maker · Blog · Contact**. The **Featured!** dropdown holds Triv 101,
  Trivia Generator (coming soon), and Bingo Card Generator (external link to
  https://bingocardgenerator.online/). Hub page: `/features.html`.

## Triv 101 (the game)
- Self-contained vanilla-JS game at **`/triv101/`** (host-run, one screen).
- `questions.js` = 149 **seed** game questions. `survey-prompts.js` = 100
  **survey** prompts (what users get surveyed on — separate from the game bank).
  `survey.js` = engine; on load it fetches confirmed questions from the Worker's
  `/api/game-bank` and folds them into play (falls back to seed if offline).
- `/triv101/surveys.html` just **redirects** to the live Worker stream.

## Survey backend (Cloudflare Worker + D1 + Ably)
- Source in **`triv101-api/`** (lives on the branch; not served by Pages).
- Live at **https://triv101-api.dustinramsbottom.workers.dev** — serves the
  server-rendered survey stream (for SEO) + JSON API + `/admin` moderation.
- **D1** database `triv101`. **Ably** provides live vote/comment updates.
  Secrets on the Worker: `ADMIN_PASS`, `ABLY_API_KEY` (set in the CF dashboard;
  NOT in the repo). Vars: `QUOTA=100`, `ADMIN_USER=admin`.
- Flow: users vote on answers / comment / suggest questions. Comments are
  visible immediately (moderated by removal). Suggested questions are hidden
  until approved in `/admin`. When a prompt hits the 100-vote quota, a moderator
  **confirms** it and its top 3 snapshot into `/api/game-bank` → the game.
- **The Worker was deployed by pasting code into the CF dashboard**, so Worker
  code changes don't go live until re-pasted — UNLESS someone connects it to
  Git (Workers Builds). Setting that up needs the D1 `database_id` in
  `triv101-api/wrangler.toml`.

## The Green Room (comment layer)
- Discussion widget on **`/features.html`** (thread `green-room`, above the
  tool entrances) and **`/gameshowhosts.html`** (thread `hosting`, at the foot
  of the content). Embed is `<div data-fc-thread="KEY">` + a script tag; place
  it with `_tools/add-green-room.js` (idempotent), never by hand.
- **Separate Worker** from Triv 101: source in `greenroom-api/`, live at
  **https://fatcity-greenroom.dustinramsbottom.workers.dev**, own D1 database
  `greenroom`. Kept separate so Green Room changes never mean re-pasting the
  live Triv 101 Worker. `src/index.js` is **one file on purpose** — deploys are
  dashboard pastes.
- Secrets on the Worker: `IP_SALT`, `ADMIN_TOKEN`, `TURNSTILE_SECRET`. Vars:
  `ALLOWED_ORIGINS` (comma-separated; a **var** so adding a domain later is a
  dashboard edit, not a re-paste), `TURNSTILE_SITE_KEY`, `DEV_BYPASS_TURNSTILE`
  (must be `0` in production).
- **`widget.js` is served from Pages**, not the Worker —
  `assets/js/greenroom-widget.js`. Keeps the Worker small enough to paste.
- **Indexability is the whole design.** Comments are client-rendered, which
  Google indexes unreliably, so `_tools/bake-green-room.js` writes each thread
  into the page as static HTML between `<!-- fce:greenroom:KEY -->` markers plus
  `DiscussionForumPosting` JSON-LD; the widget hydrates over it. Runs daily via
  `.github/workflows/bake-green-room.yml`. **The sandbox can't reach the Worker
  (403), so the fetch path only runs in the Action** — use
  `--from-file=_tools/greenroom-fixture.example.json` to test locally.
- Seed content lives in `greenroom-api/seed/threads.json`; `seed.js` generates
  SQL and **refuses to run while any `[OWNER: ...]` placeholder survives** (same
  idiom as `publish-post.js`). It emits a `.console.sql` twin because the
  Cloudflare D1 console strips `--` comments and then errors with "Requests
  without any query are not supported".
- Threads `trivia-generator`, `bingo`, `triv101` are configured but
  `"launch": false`. **`hosting` is also held back** until the owner replaces
  the generic bar-manager anchor post with their own experience.
- Moderation at `/admin/green-room.html` (bearer token, `noindex`, disallowed in
  `robots.txt`, not in the sitemap, not linked from nav).
- Identity: votes/flags key off a **per-browser token**, not the IP — two hosts
  on one venue's wifi must count as two people. The IP hash is rate-limiting
  only. Never store a raw IP.
- `GREENROOM-PLAN.md` is the design rationale; `DEPLOY-GREENROOM.md` is the
  click-by-click dashboard runbook; `README-greenroom.md` is the reference.

## Blog posts & store products (the Weebly-clone tooling)
Every blog post and product page is a full standalone HTML document (nav,
footer, theme, the lot) — never hand-write one from scratch, clone via the
`_tools/` scripts, in this order:

- **New blog post:** write a draft in `_content/drafts/` (SEO header fields +
  markdown — see any `blog0N-*.md` for the format), then
  `node _tools/publish-post.js <draft.md> <slug> --write`. It clones the Zoo
  Rock post as a template and refuses to publish if a `[bracket link]`
  placeholder doesn't resolve. **Manually add** the new post to the top of
  `triviahostresources.html` and to `sitemap.xml` — nothing does this for you,
  and pagination/archive/category pages are deliberately **not** regenerated
  (documented, low-risk gap — the post is still reachable from the landing
  page, sitemap, and other posts).
- **New store product:** add an entry to `_tools/new-products.json`, then
  `node _tools/new-product.js --write` (stages it: noindex, no tile, no
  sitemap entry). When it's ready to sell, set `"publish": true` in the spec
  and re-run with `--write --publish`, add the real checkout URL to
  `assets/js/ls-links.js`, then `node _tools/add-store-tile.js pNN --write`
  (listing-page tiles) and add a `sitemap.xml` entry by hand.
- **After either:** `node _tools/add-jsonld.js --write` (structured data),
  `node _tools/bake-buy-links.js --write` (bakes `ls-links.js` into every buy
  button — re-run this any time `ls-links.js` changes), `node
  _tools/sitemap-lastmod.js --write` (dates for URLs already in the sitemap;
  it does not add new ones). Finish with `node _tools/check-links.js` (needs
  `npm install --prefix _tools` once) — 0 broken refs is the bar.
- **Known landmine:** a staged/cloned product's buy button can inherit its
  *template's* live Lemon Squeezy link (real href, not hidden) if the new
  product has no `ls-links.js` entry yet — it'll look wired but charge for
  the wrong thing. `new-product.js` now resets it to the safe hidden/"contact
  us" state automatically, but always grep the rendered `ls-buy` href on
  anything just published or unstaged to be sure.
- `_tools/add-jsonld.js` also carries a **hand-maintained `MODIFIED` map**
  for blog `dateModified` — add a post's slug there only when its content is
  genuinely edited (title/meta/body), never in bulk. A modified date that
  doesn't reflect a real edit is a freshness signal Google discounts.

## Sandbox gotcha (important for coding agents)
- This environment's egress proxy **blocks `api.cloudflare.com` and
  `*.workers.dev`** (403). So an agent here **cannot deploy to or fetch the
  Worker** — those steps happen in the owner's browser/Cloudflare dashboard.
  Don't try to route around it.
- **Images the user pastes into chat are not reachable as files.** There's no
  path on disk to read or copy them from — ask for a URL or an upload
  (`_tools/` scripts take an `/uploads/...` path) instead of searching for it.

## Planning docs
- `TRIV101-PLAN.md` — original relaunch thinking.
- `TRIV101-BACKEND-PLAN.md` — the survey backend design.
- `TRIV101-POLISH.md` — the current backlog / next-agent handoff for the game.
- `LAUNCH-CHECKLIST.md` — the DNS-cutover runbook (historical; cutover is done).
- `POST-LAUNCH.md` — the marketing/catalog punch list: Gold Club pricing,
  the fall acquisition campaign, blog drafts, and open product decisions.
- `HANDOFF.md` — rolling session-to-session handoff notes (most recent first),
  mostly catalog/tooling-bug history.
- `SEO-HANDOFF.md` — the Aug 1 2026 GSC-audit-to-content-pass session: what
  shipped, what's still open (owner action needed), tooling bugs found.
