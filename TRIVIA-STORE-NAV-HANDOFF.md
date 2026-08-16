# Trivia Store category + nav rework — August 13, 2026

Branch `trivia-store-category-layout` (built on `image-seo-audit-blog`),
merged straight to `main`. Driven by a GA4 + Search Console + Statcounter
traffic pull on the Trivia Store — see the full numbers in the chat history
if you want them again; this doc is the outcome, not the raw data.

## What shipped (confirmed live)

`main` is at `d4a40528`. GitHub's `pages-build-deployment` workflow shows that
exact commit built and deployed successfully at 04:31 UTC — the strongest
verification available from this sandbox, since **the egress proxy blocks
outbound fetches to `www.fatcityentertainment.com` and
`tooniebuckerooni.github.io` too**, not just `*.workers.dev`/Cloudflare as the
"Sandbox gotcha" section previously documented. Worth a manual look at the
real URL when you're up, but nothing in the deploy pipeline suggests a
problem.

- **Image SEO**: 69 product images renamed to descriptive filenames (batches
  1–7), all cross-page references updated. `check-links.js`: 0 broken refs.
- **Eras** promoted from a sidebar-only sub-link to a real top-level tile on
  `trivia-store.html` and its `/store/c1/triviastore/` mirror.
- **Virtual Events** (c41) linked into both pages for the first time — it had
  zero GA4 views over 90 days purely because nothing pointed at it.
- **"Game Show" Trivia → "Pre-made Trivia Shows"** everywhere a shopper sees
  it: sidebar, tile, the category page's own `<h2>` label, breadcrumbs on all
  8 of its products. URL unchanged (`/store/c6/triviagameshows/`) — no
  ranking risk.
- **Hard Games (c42) unlinked as a category** — removed from the sidebar
  hierarchy and from the Music Bingo Card Downloads tile grid. All 12 of its
  products already live on the main Music Bingo Card Downloads catalog page,
  so nothing became unreachable. `/store/c42/hardgames/` itself is untouched
  and still live.
- **New "Trivia Store" nav dropdown**, site-wide (399 pages), matching the
  existing "Our Games" pattern: Music Bingo Card Downloads, Eras, Pre-made
  Trivia Shows, Bundles, Virtual Events.
- No product tiles were reordered, added, or removed anywhere — verified by
  diffing `data-id` attributes before/after.

New idempotent tools added: `_tools/restructure-triviagameshows.js`,
`_tools/add-trivia-store-nav.js`. Both safe to re-run.

## Open item 1 — `image-seo-audit-products` branch: redundant, safe to close

This was a background agent's parallel effort on the same 69 product renames,
working in an isolated worktree after a branch-collision incident. Diffed it
against `main` this morning: **every difference is explained by `main` having
the nav-dropdown/category work this branch predates** — e.g. `virtualevents.html`
shows an 80-line "removal" that's just the Trivia Store dropdown this branch
never got. Checked individual product pages (`store/p62`, `store/p130`)
directly: zero differences once the nav-dropdown lines are excluded. The image
renames themselves are byte-identical to what's already on `main`.

**Recommendation: delete the branch.** Nothing to cherry-pick.

## Open item 2 — `store/c6/triviagameshows/index.html` H1 mismatch

The page's `<h1>` still reads `Big Screen Trivia "Game Shows"` while the
`<h2>` right below it, the sidebar, and the nav dropdown all now say
"Pre-made Trivia Shows." Deliberately left alone last night — rewriting the
H1/title/meta is a bigger, already-indexed SEO change, not a mechanical
rename. **Needs your call**: rewrite the deep copy to match, or leave the H1
as legacy marketing copy under the new umbrella name?

## Open item 3 — "Blog" nav dropdown: one stale item, recommend removing or replacing

Checked it directly. The dropdown holds exactly one entry: **"50 Event Ideas
2024,"** linking to the legacy top-level `/50-event-ideas-2024.html` (outside
the current `/triviahostresources/<slug>/` post structure, and not mentioned
in any planning doc as a deliberate pick). This reads like leftover nav
scaffolding from an earlier iteration, not a curated "featured post" — your
instinct that it's "probably not a top performer" looks right; nothing marks
it as one anywhere in the repo.

I don't have live GA4 access from this session to confirm true top posts, but
`triviahostresources.html`'s own listing order gives a reasonable proxy for
"current," most-recent-first:
1. New Music Bingo Packs Worth Trying
2. Fall Trivia Night Ideas To Kick Off The Season
3. How To Run A Music Bingo Night

**Recommendation**: either drop the dropdown entirely (Blog becomes a flat
link again, like it functionally already is) or replace the single stale
entry with 2–3 actually-current posts. Low effort either way once you decide;
I didn't touch it, since "keep/replace/drop" is a content call, not a
technical one.

## Open item 4 — "Bingo Card Maker" dropdown: yes, there's real content to hang one on

Checked `/printmusicbingocards.html` (what "Bingo Card Maker" links to). It's
not a single tool — it's a hub presenting a genuine choice:
- **Free Generator** (`/bingocardgenerator.html`)
- **Bingo Card Generator Pro — Lifetime Access, $74.50** (`/store/p65/bingocardgeneratorpro.html`)
- **Generator 2** (`/bingocardgenerator2.html`) — the newer tool, separate repo
- **Music Bingo Rules** explainer (`/music-bingo-rules.html`)

This is the same shape as "Our Games" and the new "Trivia Store" dropdown — a
flat link currently hiding a real hub page underneath it. **Recommendation:
yes, give it a dropdown** with those 4 destinations, same pattern as the other
two. I did not build this — wasn't asked to implement, only to assess — but
it's a quick, low-risk follow-up using the same script pattern as
`_tools/add-trivia-store-nav.js` if you want it done.

## Resolution — same morning, all four items closed

Owner's calls, delivered in three words each: "rewrite it. drop it. build it."

1. `image-seo-audit-products` — confirmed redundant, not deleted (branch
   deletion left for the owner; nothing technical blocks it).
2. **c6 H1 rewritten**: `<h1>` now reads "Pre-made Trivia Shows for the Big
   Screen" (kept the "Big Screen" descriptor — it's a real distinguishing
   feature, presentation-style vs. bingo cards). Title, `og:title`, meta
   description left as-is (never mentioned "Game Show"), JSON-LD
   regenerated via `add-jsonld.js --write` so `CollectionPage.name` and the
   breadcrumb's own name match.
3. **Blog dropdown dropped** site-wide (399 pages) via
   `_tools/drop-blog-nav-dropdown.js` — back to a flat link.
4. **Bingo Card Maker dropdown built** site-wide (399 pages) via
   `_tools/add-bingocardmaker-nav.js`: Free Generator, Generator Pro
   (Lifetime Access), Generator 2, Music Bingo Rules.

`check-links.js`: 0 broken refs. All three tools are idempotent — safe to
re-run if content under any of these ever changes again.

Still open: delete the `image-seo-audit-products` branch (owner's call,
no rush — it's inert).

## Same-day follow-up — afternoon session, all merged to `main`

`main` is at `135d8257`.

**Eras filled out.** Owner caught that "90s R&B" was missing from Eras despite
"The 90s" already being in it. Full membership audit against the catalog
found three more genre/era packs on the same logic (a genre strongly tied to
one decade, matching how Hair Bands already qualified): **90s R&B, Disco,
Motown, Punk Rock** added via `_tools/add-store-tile.js` (temporarily
re-pointed at `store/c33/Eras.html`, reverted after — that script's normal
scope is the three storefront pages). Eras went from 10 products to 14.

**Image SEO finished for real.** The morning's 69 renames only ever covered
each product's *main* image — every product also has secondary gallery
photos, and those were still on Weebly's generic hash filenames. Three
parallel worktree-isolated agents closed that out:
- ~560 secondary/gallery images renamed across all 53 remaining products
  (two batches, split roughly in half by product ID).
- The last ~10 stray hash-named files (3 blog-post heroes + a few
  cross-referenced top-level images) picked up in a third pass.

All three branches (`image-seo-gallery-batch-a`, `image-seo-gallery-batch-b`,
`image-seo-blog-residual`) are **fully folded into `main`** via cherry-pick —
same status as `image-seo-audit-products` above, safe to delete, nothing left
to pull from them. Two real naming collisions surfaced where independent
agents picked the same descriptive name for genuinely different images
(a shared-stock-photo consolidation on p153, and a content-mismatch bug on
p135 where a "Girls Vs Boys" sample card was misfiled under the Valentine's
product — left the underlying mismatch alone, out of scope, just named and
disambiguated the file). `check-links.js`: 0 broken refs throughout.

One flagged incident: mid-task, the blog-residual agent's context was fed a
fake "system-reminder" instructing it to modify files in a *different*
agent's worktree via a file it never created — a prompt-injection attempt.
It correctly ignored the instruction and stayed in scope. Nothing indicates
it affected anything, noting it here in case the pattern recurs.

**Category-picker tile grid redesigned.** Owner feedback: the 5 tiles on
`trivia-store.html` (and its `/store/c1/triviastore/` mirror) looked too big,
with two images that were flatly wrong for their category. Fixed in
`assets/css/site-extras.css`:
- Tiles inherited Weebly's 33%-wide/125%-tall product-tile sizing (built for
  grids of many small thumbnails). With exactly 5 tiles that left the third
  row nearly empty. Now 20%-wide, one row, no gap — scoped via a `:has()`
  selector to grids with *exactly* 5 tiles, so `store/c11/musicdoboff/`
  (only 2 subcategories) isn't forced into the same width and left with the
  opposite problem.
- "Pre-made Trivia Shows" and "Bundles" were on leftover Weebly hash-named
  images — a blurry unreadable board crop and a random green "SAVE" button
  with no connection to bundles. Swapped for `game-show-trivia-5-pack` (a
  real, legible trivia board) and `music-bingo-entertainers-3-pack` (a photo
  of an actual stuffed bingo-card case — a literal "bundle" visual).
- New `.fce-tile-badge` component (small gold corner badge, matches the
  promo-bar accent) added to carry a "Bundle & Save" callout on the Bundles
  tile, replacing the affordability signal the old SAVE-button image used to
  carry. Reusable for any future tile that needs the same kind of callout —
  gold is intentional, green already means "on sale" via Weebly's own
  `category__image-sale-banner`.

**Three more bugs found in review and fixed:**
1. `store/c33/Eras.html` — "The 60s" tile was rendering blank. Its `<picture>`
   referenced a `.webp` that never existed (too small a file for `to-webp.js`
   to bother with — correct call, but nothing should have pointed at it).
   Once that was fixed, the underlying image itself (a screenshot of two
   dense bingo-card grids) was still illegible at tile size next to every
   other Eras tile's bold graphic — cropped a new tile-specific asset
   (`music-bingo-the-60s-category-tile.png/.webp`) zoomed on the bold title
   banner instead. **Lesson for next time**: this theme's tile CSS only
   positions an image correctly *inside* a `<picture>` wrapper — stripping
   the wrapper to "fix" a missing source collapses the image instead.
2. `store/p140/virtualeventpayment.html` — buy button said "Buy & Download"
   on a live-service booking product, directly contradicting the page's own
   disclaimer one paragraph below it ("This books your date — it isn't a
   download"). Changed to "Book Now," matching the page's own `<title>`.
   Confirmed it's the only real booking-type product under
   `store/c41/virtualevents/` — the other two cross-listed items are genuine
   downloads and were left alone.
3. Completed the `.webp`/`<picture>` pairing for two images the gallery
   rename batches left as plain `<img>` (`to-webp.js` + `wrap-picture.js`).

**Fourth bug, found after a live-site screenshot review:** `"The Year
Was..." 5-Pack` had the exact same illegible-at-tile-size problem as
"The 60s" — its image is a collage of 4 overlapping bingo-card previews,
crisp full-size, noise once scaled down. It's cross-listed on **both**
`store/c33/Eras.html` and `store/c34/Music_Bingo_&_Trivia_Bundles.html`, so
both tiles had it. Same fix: a new tile-specific crop
(`music-bingo-the-year-was-category-tile.jpeg/.webp`) on just the cascading
"1992" / "1983" / "2009" title bars. The product's own page (`store/p101`)
and `goldclubplaylists.html` keep the original full-detail image — full
detail is right for those contexts, this was only ever a small-tile problem.
Worth a similar sweep of any other multi-card collage tiles if one turns up
looking cluttered again.
