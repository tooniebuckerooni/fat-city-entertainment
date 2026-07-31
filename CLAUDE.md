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
- Feature branch: `claude/fatcity-nav-setup-ajaify`.
- Pages only serves `main`, so to preview live we **fast-forward merge the
  branch into `main`** (`git push origin <branch>:main`). Changes so far are
  additive/low-risk; the site owner is OK merging to main for preview.

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

## Sandbox gotcha (important for coding agents)
- This environment's egress proxy **blocks `api.cloudflare.com` and
  `*.workers.dev`** (403). So an agent here **cannot deploy to or fetch the
  Worker** — those steps happen in the owner's browser/Cloudflare dashboard.
  Don't try to route around it.

## Planning docs
- `TRIV101-PLAN.md` — original relaunch thinking.
- `TRIV101-BACKEND-PLAN.md` — the survey backend design.
- `TRIV101-POLISH.md` — the current backlog / next-agent handoff.
