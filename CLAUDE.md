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
  holds Music Bingo Card Downloads, **Free Song Lists** (added Aug 27 2026 via
  `_tools/add-song-lists-nav.js` — a separate insert-into-existing-dropdown
  script, because `add-trivia-store-nav.js` only builds the dropdown whole and
  skips any page that already has one), Eras, Pre-made Trivia Shows, Bundles,
  Virtual Events. **Featured!** dropdown holds Triv 101, Trivia Generator
  (coming soon), and Bingo Card Generator (external link to
  https://bingocardgenerator.online/). Hub page: `/features.html`. **Bingo
  Card Maker** dropdown (added Aug 13 2026, via
  `_tools/add-bingocardmaker-nav.js`) holds Free Generator, Generator Pro
  (Lifetime Access), All-Purpose Generator (renamed from "Generator 2" Aug 18
  2026 via `_tools/rename-generator2-nav.js`; still links to
  `/bingocardgenerator2.html`), Music Bingo Rules. **Blog** was reverted to
  a flat link — its dropdown held one stale 2024 post, dropped via
  `_tools/drop-blog-nav-dropdown.js`.
- **Promo discounts auto-apply at checkout**: while a promo is live,
  `promo-bar.js` exposes `window.FCE_PROMO` and `ls-buy.js` appends
  LemonSqueezy's `checkout[discount_code]` prefill param to every buy-button
  href. Self-expires with the promo's `END` date — to run a new sale, edit
  the constants in `promo-bar.js` only, and make sure the code exists in the
  LemonSqueezy dashboard (both sites share the one
  `bingocardgenerator.lemonsqueezy.com` store, so scope codes per-product
  there if a sale shouldn't hit the Generator subscriptions).
- **Store cross-sells** (`_tools/add-cross-sell.js`, idempotent): block under
  the buy area between `<!-- fce:cross-sell -->` markers — bundle pages list
  their components, bundle members point at their bundle *with the per-game
  arithmetic*, stand-alone packs get a Gold Club line. Edit the copy/maps in
  the script and re-run (it replaces blocks in place). `--preview` prints the
  rendered copy. p166 and p108 are excluded (staged / ambiguous membership);
  styles in `site-extras.css` (`.fce-cross-sell`).
- **Store price ladder** (`_tools/add-price-ladder.js`): the tier-comparison
  table on `trivia-store.html`, in a `<!-- fce:price-ladder -->` block placed
  *before* `<!-- fce:copy -->` — inside the copy markers `add-page-copy.js`
  would overwrite it. Styles are `.fce-ladder*`.
- **Repricing a product is a four-step job, in this order:**
  1. change it in **LemonSqueezy first** — the site only *displays* prices, LS
     charges them, and a page promising less than the checkout takes is the
     one failure mode worth avoiding;
  2. `node _tools/set-usd-price.js pNN <price> [<sale>]` — updates the product
     page, every listing block, and the `ls-links.js` reference comment;
  3. fix any **hand-written price in body copy** — the club pages carry a value
     stack ("*$116.89 of value. In this pack, it's $79.00 — save $37.89*") that
     no tool owns. `set-usd-price.js` now warns with a line number when the old
     amount survives in the copy, which is how a stale `$89.00` was caught;
  4. re-run `add-cross-sell.js --write`, `add-price-ladder.js --write`,
     `build-song-library.js --write`, `add-jsonld.js --write`,
     `bake-buy-links.js --write`.
- Both cross-sell and ladder **bake prices into HTML**, read from each product
  page's own `itemprop="price"`. Neither ever quotes a sale price in prose it
  can't refresh; both report which tiers are on sale at the end of a run, and
  the ladder prints a **LADDER INVERSION** warning naming any rung that costs
  more per game than the rung above it. Two are currently expected (Bronze
  $7.90 and Silver $7.95 both sit above the Holidays 6-pack's $7.83) — see
  `HOLIDAY-PLAN.md`. The copy therefore claims only that multi-packs beat
  singles, never "buy more, pay less per game".

## Email campaign pages (`/go/<campaign>/`)
Landing pages for the Sender sends, built by `_tools/build-campaign-pages.js`
from `_content/campaigns.json`. `/go/halloween/` shipped 28 Aug 2026.

- **`noindex,follow` and deliberately absent from `sitemap.xml`.** They restate
  product copy; keeping them out of the index is what stops them competing with
  the store. Don't "fix" either.
- Standalone pages — own CSS, no Weebly shell. 9KB against a product page's
  39KB. Swapping visual direction means swapping a `THEMES` entry, which is the
  whole mechanism `EMAIL-CAMPAIGNS.md` uses to narrow a look across four sends.
- Prices and checkout links are read from the product pages and `ls-links.js` at
  build time. **On the re-run-after-repricing list** with the other three tools.
- Buy buttons keep `class="ls-buy" data-product="pNN"` plus `data-fce-name` /
  `data-fce-price`, so the promo prefill, `bake-buy-links.js` and the tracking
  all work. `<body data-fce-campaign="slug">` is what makes `track.js` report
  `view_item_list` and `origin: campaign-<slug>` instead of guessing.

## Analytics & conversion tracking
- **One tag on the live site: GA4 `G-LYMVV05F3X`**, on 459 pages, plus a
  StatCounter pixel (project `12764046`) on 457. The `AW-`/`UA-`/second-`G-` IDs
  you'll find by grepping are only in `_tools/scraped/` — the archived original
  Weebly scrape, not served. **Grep with filenames** (`grep -rn`, not `-rh`)
  when auditing this, or the `_tools/scraped` filter silently does nothing and
  the archive's tags look live.
- Until 28 Aug 2026 that tag fired `gtag('config')` and **nothing else** — no
  events, no ecommerce, nine months of pageviews and zero data about money.
- **Microsoft Clarity** (project `y99er61yhf`) rides in the same
  `<!-- fce:tracking -->` block, on 458 pages. Session recordings and heatmaps.
  It's inline rather than folded into `track.js` because `track.js` is deferred
  and anything before it loads isn't recorded. It is the *right* instrument at
  ~380 visits/month: an A/B test needs thousands of sessions per arm, watching
  forty recordings needs forty sessions.
- `assets/js/track.js` (injected everywhere by `_tools/add-tracking.js`, marker
  `<!-- fce:tracking -->`) now sends GA4 ecommerce events: `view_item` on
  product pages, **`begin_checkout` on every buy-button click**, `select_item`
  on internal links into a product, and `view_song_list` on library pages. Each
  carries an `origin` (`cross-sell`, `price-ladder`, `song-list-page`,
  `product-tracklist`, `nav`, …) so you can tell which block produced a click.
- **`begin_checkout` is a proxy, not a sale.** LemonSqueezy checkout is on
  `lemonsqueezy.com`, so a tag on this domain physically cannot see a purchase.
  Real revenue data needs LemonSqueezy's own Google Analytics integration
  pointed at the same `G-` ID — an owner dashboard step, not a repo change.
- Tracking must never break a buy button: every send is wrapped and no-ops if
  `gtag` is missing, blocked, or not yet loaded. Keep it that way.
- **GA4's "Tag quality: Needs Attention → Some of your pages are not tagged" is
  expected here, and must not be chased to zero.** As of 28 Aug 2026 it lists 14
  URLs, and every one is either a `http-equiv="refresh"` stub (`/gameshows.html`,
  `/store/c34/Starter_Packs.html`, `/triv101/surveys.html`, the legacy `/4/`,
  `/inspiration/` and blog-taxonomy shells) or a URL that no longer exists and is
  caught by `404.html` (the retired `/whatsnew/` tree, and four dead Weebly
  `/store/status/<hash>/confirmation` order pages). Google's checker crawls URLs
  and can't tell a stub from a page a human reads. Tagging them would log
  pageviews nobody made — inflating sessions, deflating conversion rate, and
  inventing entry pages. `add-tracking.js` skips redirect stubs on purpose.
  The one real gap the report found was `/triv101/`, fixed 28 Aug.
- The GA4 property is "Fat City 2" under a **Wordjab** Google account the
  owner's login can't see. Either get Viewer on it, or create a property the
  owner controls and add a second `gtag('config', …)`. Nothing in the repo
  depends on which.

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

## The Song List Library (`/music-bingo-song-lists/`)
Shipped Aug 27 2026 — a hub plus one page per game pack, **50 packs / 1,674
songs**, every song list published in full and free. Built by
`_tools/build-song-library.js` from `_content/song-lists.json`; re-running
rebuilds every page from the JSON, so **edit the data, never the generated
HTML**.

- **What may be published: `song` and `by` only.** The puzzle-answer columns —
  Anagram, Antonym Clue, Acronym, Nickname, Soundalike Pair, Country — are
  stripped when the JSON is generated and must never reach a page. Those columns
  *are* the game. The song list satisfies the search; the clue stays with the
  product. Same rule as `add-tracklists.js`, and for the same reason.
- **The full callsheet PDFs still must never be committed.** This repo is
  public. `_content/song-lists.json` is the published excerpt, nothing more.
- Packs with no Artist column (TV Themes, Video Games) use their identifying
  column instead, and their JSON-LD omits `byArtist` rather than calling a show
  title an artist.
- **Sitemap entries are managed, unlike everywhere else on the site**: the tool
  owns a `<!-- fce:song-lists -->` block in `sitemap.xml` and replaces it
  wholesale. Fifty pages rebuilt from JSON is the case where the hand-add rule
  stops making sense. `sitemap-lastmod.js` is unaffected — it only refreshes
  dates on URLs already present.
- Order matters: **`build-song-library.js --write` first, then
  `add-jsonld.js --write`** — the build regenerates each page from the template
  shell, which drops any `fce:jsonld` block.
- Entry points, so the library can't end up orphaned the way the PDF did: the
  Trivia Store nav dropdown, `trivia-store.html` body copy, and a "See all N
  songs" link in every product page's sample tracklist (`add-tracklists.js`
  matches product→library on URL, falling back to an exact pack-name match;
  **never fuzzy-match** — an early attempt paired Countries with Halloween
  Party, which would have sent buyers to the wrong list).
- **`uploads/.../music-doboff-answer-sheet-anagrams.pdf` stays live — owner's
  decision, 27 Aug 2026. Don't delete it, and don't re-open the question.** The
  file publishes the Anagrams pack's *Anagram column* (the answers) and ranks at
  position 1 for ~91 clicks a quarter; it's the reason the library exists and
  also the one pack whose game is given away. The owner weighed that and chose
  to keep the ranking. `404.html` carries a dormant rule forwarding the URL to
  `/music-bingo-song-lists/anagrams/`, so removal stays a one-step option if
  they ever change their mind — but that is theirs to raise, not an agent's.

## Weekly health check (`.github/workflows/site-health.yml`)
Runs every tool in dry-run each Monday and **opens a GitHub issue if anything
drifted** — which reaches the owner by email and on a phone, with no laptop and
no sandbox. It closes the issue automatically when things are clean again.

- The signal it exists for: almost every tool bakes derived data into HTML, so a
  price changed in LemonSqueezy without re-running them leaves the site quoting a
  number the checkout won't honour. A drifted tool is that, caught in a week
  instead of by a customer.
- **If you add a tool to the loop, simulate a real drift and confirm it fires.**
  The first version of the matcher understood two output formats and silently
  missed a simulated price change in two of the three tools that should have
  caught it. A health check with blind spots is worse than none — it reads as an
  all-clear.
- `build-song-library.js` and `build-campaign-pages.js` regenerate
  unconditionally, so they report `(N would change)` against what's on disk
  rather than a write count. The library comparison strips the `fce:jsonld`
  block, because `add-jsonld.js` runs after it by design.
- **LADDER INVERSION is deliberately not a failure.** Two rungs are knowingly
  inverted; firing weekly would train everyone to ignore the issue. It's printed
  in the report body instead.

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
- `HOLIDAY-PLAN.md` — the Aug 26 2026 revenue plan aimed at Christmas: the
  Song List Library funnel (50 callsheets → 50 pages), the AOV ladder, seasonal
  timing, and the email lever. **Start here for "what are we building next."**
- `EMAIL-CAMPAIGNS.md` — the `/go/<campaign>/` landing pages for the Sender
  sends, and the plan for narrowing a visual direction across four campaigns.
  Includes why that is explicitly *not* an A/B test at this traffic, and the
  results table to fill in as each send goes out.
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
