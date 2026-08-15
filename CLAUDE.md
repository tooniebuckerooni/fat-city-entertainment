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
- **Long-form copy on a Weebly page** goes in `_content/copy/<name>.html` as plain
  semantic HTML, and `node _tools/add-page-copy.js --write` injects it before the
  footer inside `<!-- fce:copy -->` markers (styled by `.fce-copy`). Edit the
  partial and re-run to update. Never type prose into the page itself — those
  pages are nested multicol `<table>` scaffolding with inline `<font>` tags, and
  hand-editing them is how a live layout gets broken.
- New content pages are cloned from a live page's shell (see
  `_tools/new-content-page.js` / `make-*-page.js`) so they inherit nav/footer.
- Top-level nav: **Trivia Store (dropdown) · ★ Featured! (dropdown) · Our
  Games (dropdown) · Bingo Card Maker (dropdown) · Blog · Contact**. **Trivia
  Store** dropdown (added Aug 13 2026, via `_tools/add-trivia-store-nav.js`)
  holds Music Bingo Card Downloads, Eras, Pre-made Trivia Shows, Bundles,
  Virtual Events. **Featured!** dropdown holds Triv 101, Trivia Generator
  (coming soon), and Bingo Card Generator (external link to
  https://bingocardgenerator.online/). Hub page: `/features.html`. **Bingo
  Card Maker** dropdown (added Aug 13 2026, via
  `_tools/add-bingocardmaker-nav.js`) holds Free Generator, Generator Pro
  (Lifetime Access), Generator 2, Music Bingo Rules. **Blog** was reverted to
  a flat link — its dropdown held one stale 2024 post, dropped via
  `_tools/drop-blog-nav-dropdown.js`.

## URL shape — the one rule that must not drift
**Directory pages always end in a trailing slash: `/triviahostresources/<slug>/`,
never `/triviahostresources/<slug>`.** That applies to `rel=canonical`,
`og:url`, JSON-LD `url`/`mainEntityOfPage`, share links, internal `href`s and
`sitemap.xml` — all of them, or none of it works.

GitHub Pages serves `foo/index.html` at *both* `/foo` and `/foo/`, so every
directory page has two live URLs and always will; Pages can't redirect. The only
thing that keeps them from competing is the site saying the same thing
everywhere. It stopped doing that and Google spent Jul–Aug 2026 dropping posts
that had no technical problem at all — see `SEO-CRAWL-HANDOFF.md` for the full
mechanism. Enforced by `_tools/canonicalize-trailing-slash.js` (idempotent, safe
to re-run any time; it only adds a slash where `<path>/index.html` really
exists). Run it after anything that generates or clones pages.

Same idea, different character: `_tools/normalize-url-encoding.js` keeps the
four store files with `,`/`&` in their names on the percent-encoded form
(`%2C`/`%26`), because `,` and `%2C` are different URLs to a crawler.

Extensionless `.html` URLs are a *third* live form (`/store/p63/hairbands`
serves `hairbands.html`) — Pages does that too. Don't link that way; always
write the `.html`.

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
- **Live and taking real comments**: `green-room` thread on **`/features.html`**
  (above the tool entrances). Embed is `<div data-fc-thread="KEY">` + a script
  tag; place it with `_tools/add-green-room.js` (idempotent), never by hand.
- `hosting` (foot of `/gameshowhosts.html`) has its embed div in place but the
  thread itself isn't launched yet — see `GREENROOM-PLAN.md` §8a.
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
- `GREENROOM-PLAN.md` is the design rationale (incl. what's still not
  launched and why — §8a); `README-greenroom.md` is the technical reference
  (secrets, vars, embedding a thread, adding a new one, troubleshooting).

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
- **FAQ + diagram (GEO/direct-answer posts):** every "show-the-work"/GEO post
  should carry an end-of-post FAQ — it's the highest-leverage add for answer
  engines. Write `_content/faq/<slug>.json` (`[{ "q":…, "a":… }]`; the `.json`
  existing is what triggers injection, so a new post is picked up
  automatically) and, for visual posts, an optional
  `_content/diagrams/<slug>.html` (a `<figure class="fce-diagram">` with **inline
  SVG** — no asset upload needed). Then `node _tools/add-post-faq.js --write`
  injects the FAQ section, the optional diagram, and a self-contained
  `FAQPage` JSON-LD between `<!-- fce:faq -->` markers (idiom like fce:copy;
  styled by `.fce-extras`/`.fce-faq`/`.fce-diagram` in `site-extras.css`).
  Idempotent, and it **skips not-yet-published posts**, so it's safe to run
  during a drip. It owns the per-post `FAQPage`; `add-jsonld.js` still emits
  `BlogPosting` + `BreadcrumbList` (both on one page is valid).
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
  it does not add new ones), then `node _tools/canonicalize-trailing-slash.js
  --write` (see "URL shape" above — cheap insurance, and a no-op if the new
  page was already written correctly). Finish with `node
  _tools/check-links.js` (needs `npm install --prefix _tools` once) — 0 broken
  refs is the bar.
- **Blog listing shells** (`category/`, `archives/`, `previous/N`, across
  `triviahostresources/` *and* the legacy `whatsnew|inspiration|blog|4` trees)
  must carry `noindex,follow` — `node _tools/noindex-blog-taxonomy.js --write`
  does all 245 of them. Legacy *post* duplicates are different: they get a
  `rel=canonical` to the live post and **no** noindex. Never both on one page —
  Google honours the noindex, drops the page, and the canonical never gets to
  pass its signals on.
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
- The proxy also blocks **`www.fatcityentertainment.com` and
  `tooniebuckerooni.github.io`** — an agent here cannot fetch the live site
  either, even to verify a deploy. Verify instead via the GitHub Actions API:
  the built-in `pages-build-deployment` workflow run for the commit SHA now on
  `main` — `status: completed` + `conclusion: success` confirms that exact
  commit deployed. Since Pages serves this repo's files with no build step,
  local testing of that commit is equivalent to testing what's live.
- **Whenever a Worker code change needs to be pasted into the Cloudflare
  dashboard, always give the owner the GitHub link to the updated file**
  (e.g. `https://github.com/tooniebuckerooni/fat-city-entertainment/blob/main/tgp-ai-gateway/worker.js`
  — swap in `triv101-api/` or `greenroom-api/src/index.js` for those Workers)
  so they can open and copy it directly, in addition to summarizing the diff.
- **Images the user pastes into chat are not reachable as files.** There's no
  path on disk to read or copy them from — ask for a URL or an upload
  (`_tools/` scripts take an `/uploads/...` path) instead of searching for it.

## Planning docs
Trimmed periodically — retired once a doc's content is either done, or fully
superseded by what's actually in the repo. If you're looking for a doc this
file used to mention and it's gone, check `git log -- <filename>`; it was
retired on purpose, not lost.

- `TRIV101-POLISH.md` — the current backlog for the game, the survey stream,
  and Green Room next steps. Start here for "what's left."
- `POST-LAUNCH.md` — the marketing/catalog punch list: pricing decisions,
  the fall acquisition campaign, blog drafts, open product decisions.
- `SEO-HANDOFF.md` — the Aug 1 2026 GSC-audit-to-content-pass session: what
  shipped, what's still open (owner action needed), tooling bugs found.
- `SEO-CRAWL-HANDOFF.md` — the Aug 9 2026 crawl/indexation fix: why ~380 pages
  had two competing URLs, what got normalised, and the 16 pages Google is
  declining to index for **content** reasons that no amount of tooling fixes.
- `TRIVIA-SHOW-MAKER-HANDOFF.md` — the Trivia Show Maker: as of 2026-08-10 the
  app (`trivia-show-maker/`) and its AI backend (`tgp-ai-gateway/`) are
  sourced in **this** repo — `trivia-generator-pro` is retired, don't edit
  there.
- `HANDOFF.md` — durable tooling lessons-learned (real bugs found in the
  `_tools/` scripts, still applicable) and a couple of "known and deliberate"
  notes. Not a task list.
- `TRIVIA-STORE-NAV-HANDOFF.md` — the Aug 13 2026 category/nav rework: Eras
  and Virtual Events promoted into the store front, "Game Show" Trivia
  renamed to "Pre-made Trivia Shows", Hard Games unlinked as a category, and
  a new "Trivia Store" nav dropdown. All four follow-up items (c6 H1 rewrite,
  Blog dropdown dropped, Bingo Card Maker dropdown built,
  `image-seo-audit-products` branch confirmed redundant) were resolved the
  same morning — see the doc for the full record.
- `GREENROOM-PLAN.md` / `README-greenroom.md` — see "The Green Room" above.
