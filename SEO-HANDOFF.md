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

2. ~~**Around The World... And Beyond! artwork**~~ — **done Aug 1.** Uploaded
   straight to `main` via the GitHub web UI
   (`uploads/4/3/3/6/43362499/around-the-world-and-beyond.png`), merged into
   this branch, and wired into the product page (main image + `og:image`),
   its three store-listing tiles, and the sitemap image entry. Also fixed a
   leftover template artifact caught in the same pass — the zoom-image alt
   text still said `"Decades" Music Bingo 5-Pack`. WebP twin generated
   (525K → 171K).

3. **Back-to-school promo (22% off, ~1 week out, pop-up + code)** — nothing
   built yet, by design; you said nothing needed now. When it's closer:
     - The new fall post is written evergreen specifically so it has time to
       rank *before* the promo goes live — say the word and I'll add a
       promo banner/CTA to it once there's a real code.
     - Sitewide banner and the pop-up itself are a separate, larger piece of
       work (needs a decision on tooling — this is a static Weebly export
       with no built-in pop-up system).

4. **GSC-only manual checks** — I don't have live Search Console access, so
   these need you to log in and look. **Status as of Aug 1:** d is clean
   (checked twice — no manual action against the property). b not checked
   yet. a checked but inconclusive — owner's read was "not sure," worth
   another look soon since a one-time check can miss a trend still in
   progress. c is the one flagged as most needing follow-up — owner said
   "definitely need to check back on this."

   **a. Post-March traffic decline — is it still happening, and is it
   sitewide or specific pages?** *(checked once, inconclusive — recheck)*
   Search Console → **Performance → Search results**. Set the date range to
   compare "Last 6 months" against the prior period so March shows as a
   clear inflection point on the graph, not just a dip inside a longer
   window. Then:
   - **Dimensions tab → Pages**, sorted by clicks, same comparison range.
     If a handful of specific URLs account for most of the drop, that's a
     targeted problem (a page got outranked, deindexed, or its content went
     stale) rather than a site-wide one — cross-reference against the
     titles/pages this session already touched, since several of the worst
     offenders should already be improving.
   - **Dimensions tab → Queries**, same comparison. Look for queries that
     used to rank and now don't, versus queries that still rank but get
     fewer clicks (a CTR problem — title/meta — vs. a rankings problem — an
     algorithm update or a competitor).
   - Cross-check the date against Google's own algorithm update history
     (search "Google search status dashboard" or "Google algorithm update
     history [month/year]") — if a core update landed within a week or two
     of the drop, that's the likely cause and points at content quality
     broadly rather than one fixable bug.
   - If it's still declining *now* (not just a March event that already
     recovered), that's the more urgent version — say so specifically.

   **b. Links report — anything toxic, or just checking what's building
   authority.** *(not checked yet)*
   Search Console → **Links**. Check **Top linking sites** for anything that
   looks spammy (link farms, unrelated foreign-language sites, scraper
   sites) — that's the kind of thing worth a disavow file, though it's
   rarely the actual cause of a ranking drop unless the volume is large and
   sudden. Otherwise this is just useful to know: **Top linked pages** shows
   what's earning backlinks on its own, which is a signal for what content
   to make more of.

   **c. Core Web Vitals by device — mobile specifically, since desktop
   wasn't the problem.** *(owner: "definitely need to check back on this" —
   highest-priority of the four)*
   Search Console → **Experience → Core Web Vitals**. Open the **Mobile**
   report specifically (this session found 0 "good" mobile URLs reported
   since mid-June — a data blackout, not necessarily 0 actually-good pages,
   since GSC's CWV data lags real user metrics by ~28 days and can go quiet
   if the field-data sample size drops too low to report). Check whether it's
   now reporting real numbers again, and if so whether pages are landing in
   "Needs improvement"/"Poor" — if so, which metric (LCP, INP, CLS) and
   which page group (blog vs. store vs. homepage), so any real fix can be
   scoped.

   **d. Manual Actions — the one that overrides everything else if present.**
   *(checked, twice — "No issues detected" both times. Clean, no action
   needed.)*
   Search Console → **Security & Manual Actions → Manual actions**. This
   should say "No issues detected." If it doesn't, that takes priority over
   every other item in this document — a manual action explains a traffic
   drop by itself and nothing else here matters until it's resolved.

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
