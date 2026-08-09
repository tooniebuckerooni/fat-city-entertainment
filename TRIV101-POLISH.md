# TRIV101 — polish backlog (next-agent handoff)

The system is **live and working end to end**: the game (`/triv101/`), the
community survey stream (Cloudflare Worker, server-rendered, live via Ably),
moderation (`/admin`), and the loop where confirmed survey answers graduate into
the game via `/api/game-bank`. Nav is done (**★ Featured!** dropdown). See
`CLAUDE.md` for the architecture and hosting facts.

This is the "make it shine" list. Nothing here is blocking; pick by impact.

## Game polish (from the owner's original task list — mostly frontend)
These live in `triv101/index.html`, `style.css`, `script.js`.
- [x] **Mobile-responsive layout** — was desktop-first (dartboard sized in
      raw `vh`, so it overflowed any portrait phone). Fixed: board/buttons
      switched to `vmin`, layout stacks to a column under ~760px or a
      portrait-ish aspect ratio, button positions recompute on resize so a
      mid-game rotation doesn't lose progress. Verified at 320/390/768px.
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

## Trivia Generator — done, now Trivia Show Maker
Built and live at `/trivia-show-maker/`, AI Studio add-on running on Claude
Haiku 4.5 via a Cloudflare Worker. `/trivia-generator.html` is now a 301
redirect stub to it. See `TRIVIA-SHOW-MAKER-HANDOFF.md` for what's still open
there (nothing major as of this writing).

## SEO / housekeeping
- [x] `/features.html` added to `sitemap.xml`.
- [x] `/triv101/` and `/triv101/surveys.html` added to `sitemap.xml`.
      `/trivia-generator.html` is a redirect stub, not a destination — no
      sitemap entry needed; `/trivia-show-maker/` (its target) is already in.
- [x] **Circular-canonical bug, partially fixed:** `/triv101/surveys.html` no
      longer names the Worker as canonical — it's self-canonical now, so the
      two pages don't contradict each other. **Still open:** the real fix per
      GREENROOM-PLAN.md §3 is baking actual survey content into the page
      (it's currently still a content-free meta-refresh redirect, just no
      longer a circularly-canonical one). See "Keep moving forward" below.
- [ ] Revisit the **Featured!** gold-star styling if the owner wants more/less
      pop (in `assets/css/site-extras.css`, class `.fce-featured`).

## Content
- [ ] Expand/curate the 100 survey prompts in `triv101/survey-prompts.js`
      (owner may want spicier, on-brand "Fat Bottom" style ones).

## Keep moving forward: the survey data itself

Two ideas that were noted in passing in old session handoffs and never given
a real home — both premised on the survey system actually working, which it
now does:

- [ ] **Publish aggregate survey results as their own public pages.** Original
      user-generated data (what people actually voted the most popular answer
      to a prompt) is exactly what AI answer engines and Google both cite —
      it's not available anywhere else. Right now it's only visible live,
      inside the stream. A baked, indexable "here's what people said" page per
      graduated prompt (or a rolling digest) turns the survey into a content
      engine that runs on the players themselves, the same indexability
      pattern the Green Room already proves out (`_tools/bake-green-room.js`
      is a template for this, not a rewrite).
- [ ] **Finish the `/triv101/surveys.html` bake** (see the SEO item above) —
      it's the same underlying idea: real survey content, statically
      rendered, indexable. Doing both at once is likely less work than doing
      them separately.
