# TRIV101 — polish backlog (next-agent handoff)

The system is **live and working end to end**: the game (`/triv101/`), the
community survey stream (Cloudflare Worker, server-rendered, live via Ably),
moderation (`/admin`), and the loop where confirmed survey answers graduate into
the game via `/api/game-bank`. Nav is done (**★ Featured!** dropdown). See
`CLAUDE.md` for the architecture and hosting facts.

This is the "make it shine" list. Nothing here is blocking; pick by impact.

## Game polish (from the owner's original task list — mostly frontend)
These live in `triv101/index.html`, `style.css`, `script.js`.
- [ ] **Mobile-responsive layout** — the dartboard/game is desktop-first; make
      it play on phones/tablets. (Biggest one.)
- [ ] Copy pass on the setup screen (rules/how-to; tighten the intro).
- [ ] Correct-answer **sound effect** (a `wrong.mp3` already exists in assets).
- [ ] **Game progress indicator** and clearer **turn indicator**.
- [ ] Clarify how the score is calculated on screen (points = number × answers).
- [ ] **Pause** and **undo / take-back** for the host.
- [ ] Finish/enable **Exact mode** (commented out in `index.html`/`script.js`).
- [ ] **Win celebration** animation.
- [ ] Remove the **MD5** dependency (only used to hash team names) and delete
      commented-out dead code.
- [ ] A short README for the game.

## Survey stream & backend polish (`triv101-api/`)
- [ ] **Anti-spam / rate limiting** on `POST /api/answer|comment|suggest`
      (currently only length caps + one-vote-per-voter via cookie, which is
      easily reset — consider a stronger anonymous identity or Turnstile).
- [ ] Basic **profanity/dup filtering** on answers & comments.
- [ ] Empty-state and pagination when there are many prompts.
- [ ] A "recently graduated into the game" section on the stream.
- [ ] Improve the bare-bones **`/admin`** panel: pagination, bulk approve,
      edit/merge answers, reorder, and a proper login page.
- [ ] **Formspree**: wire `FORMSPREE_ENDPOINT` so new suggestions email the
      owner (optional; steps in `triv101-api/README.md`).
- [ ] Decide whether the in-game "Take a Survey" button (currently links to the
      stream) should also allow quick in-game submissions to the Worker.

## Deploy / infra hygiene
- [ ] **Connect the Worker to Git (Workers Builds)** so code changes deploy on
      push instead of manual dashboard re-paste. Needs the D1 `database_id` in
      `triv101-api/wrangler.toml` (get it from CF → D1 → triv101). Ends the
      re-paste cycle for good.
- [ ] **Branded survey URL (optional):** to get `surveys.fatcityentertainment.com`
      the domain's DNS must move from **Namecheap → Cloudflare** (one-time
      nameserver change; recreate existing records; GitHub Pages keeps working).
      Then add the Worker Custom Domain and update three refs to it: `API_BASE`
      in `triv101/survey.js`, the redirect in `triv101/surveys.html`, and the
      `<link rel="canonical">` in the Worker's SSR page.

## Trivia Generator (currently a "coming soon" page)
- [ ] Build the actual generator (owner wants it **AI-powered**; it lives in a
      separate repo). The endpoint is model-agnostic — owner floated **Kimi K2**
      (Moonshot); Claude is the other strong option for reliable structured
      output. When ready, repoint `/trivia-generator.html` from the teaser to
      the app.

## SEO / housekeeping
- [x] `/features.html` added to `sitemap.xml` (needed for the Green Room's
      discussion content to be indexed).
- [ ] Still missing from `sitemap.xml`: `/triv101/`, `/trivia-generator.html`,
      `/triv101/surveys.html`.
- [ ] **Live SEO bug:** the Triv 101 survey stream and `/triv101/surveys.html`
      name each other as canonical (`triv101-api/src/index.js:195` vs
      `triv101/surveys.html:12`), and `surveys.html` is a content-free redirect
      that isn't in the sitemap. Circular canonicals get discarded, so the
      survey discussion is probably not indexing. Fix by making
      `surveys.html` a real baked page — the Worker's canonical already points
      at it. See GREENROOM-PLAN.md §3.
- [ ] Revisit the **Featured!** gold-star styling if the owner wants more/less
      pop (in `assets/css/site-extras.css`, class `.fce-featured`).

## Content
- [ ] Expand/curate the 100 survey prompts in `triv101/survey-prompts.js`
      (owner may want spicier, on-brand "Fat Bottom" style ones).
