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
