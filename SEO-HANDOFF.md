# SEO / content handoff — August 1, 2026

Branch `claude/seo-report-damage-control-akwutt`, fast-forwarded to `main` —
everything below is **live** on fatcityentertainment.com. Started from a GSC
audit; grew into a full content + catalog pass. See `CLAUDE.md` for the
publish/product tooling pipeline this session leaned on.

---

## What shipped

### SEO damage control (from the GSC audit)
- Title/meta rewrites on the highest-ROI CTR gaps: christmas party bingo page,
  `trivia-store.html`, `gameshowhosts.html`, plus striking-distance blog posts.
- Fixed the 5-way "bingo card generator" cannibalization cluster — one real
  canonical page, four others differentiated by intent, cross-linked.
- Retargeted the off-topic music-streaming-comparison post; refreshed the "8
  tips" hosting post to match how people actually search.
- `noindex,follow` on 141 thin auto-generated category/archive pages.
- Title/meta fixes on the "crawled — not indexed" and stale-year buckets (7 +
  2 + 9 posts across three passes).
- Redirect stubs for legacy `/inspiration/`, `/whatsnew/`, `/blog/` schemes,
  6 dead top-level pages, and 6 renamed/retired store pages.
- Deferred render-blocking jQuery/plugins sitewide (397 pages).
- Retired Costume Performers (nav item + page + sitemap entry).
- Pointed outbound "generator" mentions at bingocardgenerator.online.
- All off-domain links now open in a new tab, sitewide (2,179 links / 352
  files).
- Diagnosed the mobile Core Web Vitals data blackout (flagged for you — see
  "Still open" below, it needed live GSC access to close out).

### Freshness signals
- Added a real `dateModified` to the JSON-LD of the **16 posts genuinely
  content-edited** this session (title/meta/H1/body actually changed) — not
  the other ~130 untouched posts. Backdating everything is the kind of
  freshness-signal-that-isn't-real that gets the whole field discounted;
  deliberately didn't do that. The list lives in `add-jsonld.js`'s `MODIFIED`
  map — add to it by hand, only when a post's content genuinely changes.

### New-product cross-links + 2 new posts
- Found the 90s R&B and Numbers blog posts had "download now" buttons
  pointing at the *generic store* instead of their own product — fixed both.
- Found **7 of the newest store products had zero blog posts linking to
  them at all** — directly the gap your own `_content/drafts/data-findings-
  memo.md` flags (decade packs declining, niche spinoffs are the play).
  Published two new posts:
  - **"6 New Music Bingo Packs Just Landed in the Trivia Store"** — rounds up
    Punk Rock, Around The World... And Beyond!, TV Themes 2, Word Games
    3-Pack, Acronyms, and Things In Songs. (Started as 7 incl. Party Starter;
    pulled per your note below.)
  - **"Fall Trivia Night Ideas to Kick Off the Season"** — evergreen,
    bar/restaurant + corporate + school angles. **Deliberately carries no
    promo/code** — see "Back-to-school promo" below for why.
- Both added to the blog landing page and `sitemap.xml` (pagination/archive/
  category pages intentionally not regenerated — documented, low-risk gap,
  same as the prior blog-cluster launch).
- Found and fixed a real bug in `publish-post.js`: it rewrote a new post's
  Twitter share button `href` but left a leftover `data-text` attribute
  holding the clone template's old title. Fixed going forward and patched on
  the 3 posts published July 25 that had the same issue.

### Catalog corrections (from your two follow-up notes)
- **Party Starter Pack (p166) pulled from the roundup post** — not finished.
  Still staged/noindex/unlisted, as it was before.
- **Found a real bug while in there**: p166's buy button was live and
  pointed at a *different product's* Lemon Squeezy checkout — inherited from
  the already-wired template it was cloned from, despite having no
  `ls-links.js` entry. Same class of bug HANDOFF.md already records for Punk
  Rock ("would have taken money for Golden Oldies"), just a variant that
  slipped past the earlier fix: an *empty* link entry silently left whatever
  the template's button pointed at, live, un-hidden. No customer could have
  hit it (noindex, unlinked), but reset it to the correct hidden/"contact us"
  state, and hardened `new-product.js` so no future staged product can ship
  this way again.
- **Around The World relaunched correctly**, per your details: renamed to
  "Around The World... And Beyond!", now a 4-pack (Road Trip, Cities,
  Countries, and the new Out of This World), $32.49, real Lemon Squeezy
  checkout wired. Tiles added to all three store listing pages, sitemap
  entry added, blog post section rewritten to match.
- **Things In Songs (p168) found missing from `sitemap.xml`** despite being
  live and already tiled on all three listing pages — added.

**Verification after every batch:** `node _tools/check-links.js` — 628
pages, 0 broken refs, holding at 0 through the whole session.

---

## Still open — needs you

1. **Party Starter Pack still needs the real details** — game list, price,
   Lemon Squeezy link — the same three things Around The World was missing
   before this session. Send them whenever it's ready and it's the same
   short pipeline (`new-products.json` → `new-product.js --write --publish`
   → `ls-links.js` → `bake-buy-links.js` → `add-store-tile.js` →
   `add-jsonld.js` + sitemap).

2. **Around The World... And Beyond! artwork** — you pasted the cover image
   in chat, but images pasted into a chat message aren't reachable as files
   in this environment (no path on disk, no ingestion tool on my end). The
   product page is still using a placeholder (the old Countries product
   image) until I have a real file to work from. Easiest path: upload it to
   your Weebly uploads CDN (or anywhere I can fetch a URL) and send the
   link — wiring it into the product page, its `og:image`, and the sitemap
   entry is a couple of minutes once I can reach the file.

3. **Back-to-school promo (22% off, ~1 week out, pop-up + code)** — nothing
   built yet, by design; you said nothing needed now. When it's closer:
     - The new fall post is written evergreen specifically so it has time to
       rank *before* the promo goes live — say the word and I'll add a
       promo banner/CTA to it once there's a real code.
     - Sitewide banner and the pop-up itself are a separate, larger piece of
       work (needs a decision on tooling — this is a static Weebly export
       with no built-in pop-up system).

4. **GSC-only manual checks**, flagged earlier in this thread and still
   needing your live Search Console access to close out: the post-March
   traffic decline root-cause, the Links report, Core Web Vitals broken out
   by device, and a Manual Actions check.

5. **Carried over from `POST-LAUNCH.md`** (not touched this session, still
   open, unrelated to the SEO work above): the Gold Club subscription-vs-
   one-time copy decision, choosing an email platform, the Gold Club price
   raise (blocked on you setting it in LemonSqueezy first), the Music Bingo
   Handbook's KDP ASIN conflict, and the inconsistency between the campaign
   brief's "decade packs flat-to-up" KPI and the data memo's own conclusion
   that every decade pack is declining.

---

## Tooling changes this session

- `_tools/add-jsonld.js` — added `dateModified` support via a hand-maintained
  `MODIFIED` map (see "Freshness signals" above).
- `_tools/publish-post.js` — fixed the stale `data-text` leftover on the
  Twitter share button (see "New-product cross-links" above).
- `_tools/new-product.js` — staged (unpublished) products now have their buy
  button reset to the safe hidden/"contact us" state instead of inheriting
  whatever the clone template's button pointed at.

`CLAUDE.md` now documents the full publish-post / new-product / add-jsonld /
bake-buy-links / add-store-tile / sitemap-lastmod pipeline and the correct
order to run it in — that took real archaeology to reconstruct this session
(reading `_tools/*.js` headers and old commit messages), so it's captured
there for the next agent instead of needing to be re-derived.
