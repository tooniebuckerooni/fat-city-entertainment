# Halloween 2026 — the push

Written 10 Sept 2026. **Halloween is 31 Oct, seven weeks out.** Hosts and venues
book 2 to 4 weeks ahead, so the selling window is roughly **late Sept to late
Oct**, and anything that has to *rank* needs to be indexed in the next 2 to 3
weeks. Work the list top down; each item is independent.

---

## Why this exists

The site sells three Halloween products and was close to invisible for the
season. Verified 10 Sept, before any of this shipped:

- **p174 "Halloween Trivia Night" was not in the Holidays category at all.**
  Live checkout, $11.99, tiled on the storefront and Pre-made Trivia Shows, but
  a shopper browsing Holidays for Halloween saw one of the three things we sell.
- **No indexable Halloween landing page existed.** `/go/halloween/` is
  deliberately `noindex` (correct, it is an email page). The only organic
  Halloween surfaces were two **2019** blog posts and the free song list.
- **"Halloween" appeared nowhere in the nav.**
- No Halloween bundle. Bought separately the three come to **$56.97**.

### What is NOT the problem

`store/p97/halloweenparty.html` shows a poor Clarity score (44, LCP 4.8s, INP
912ms) and `SEO-SNAPSHOTS.md` guessed it was one of the heavy-image pages.
**It is not.** Measured 10 Sept: 40 KB of HTML, **0.06 MB of images**, 3 of its
4 images already lazy-loaded. At ~380 visits/month across 747 pages this page
gets a handful of sessions and one bad mobile connection moves the average.
Same shape as the GSC Core Web Vitals series dropping to zero. **Do not spend
Halloween effort on p97 performance.**

---

## Done

- [x] **1. p174 added to c40 Holidays**, and the category re-ordered
  Halloween-first for the season: `p97, p174, p33` then calendar order.
  **Revert after 1 Nov** — the seasonal block in `_tools/order-store-tiles.js`
  carries the exact list to restore.
- [x] **2. `/halloween-trivia-and-music-bingo.html`** — the indexable hub.
  Built from `_tools/new-content-pages.json` via `new-content-page.js`, so edit
  the spec and re-run rather than hand-editing the page. Links all three
  products, the free song list, the generator and the Holidays category.
  In `sitemap.xml`, indexable, canonical set.

---

- [x] **4/5. Halloween Complete Pack (p189) and the p33 conversion**, 10 Sept.
  p33 was never a "Trivia 2-Pack": it was the music bingo game plus a
  PowerPoint show, so it *contained* p97. It is now the standalone
  **Halloween Party Game Show** at $16.99, retitled and rewritten, and pulled
  from c11 (it is not a music bingo product). p189 bundles p97 + p174 + p33
  plus a free month of Generator 2.0, $64.97 of value at $39.99.
  **c6 is now order-managed** (it was not, so refreshing any tile there
  silently promoted that product to the top of the category).

> **RESOLVED 10 Sept: $39.99.** At $44.99 the bundle cost $4.02 more than its
> three games bought separately ($40.97), so the entire saving rested on the
> $24 Generator month and `add-cross-sell.js` refused to claim a saving at all,
> printing "$15.00 a game" under the buy button instead. At $39.99 the bundle
> is cheaper than its parts and the tool writes the real line: *"$13.33 a game
> against $40.97 bought one at a time, and you keep $0.98."* The page's own
> copy carries the stronger frame, $64.97 down to $39.99, keep $24.98.

## Next

### 3. Seasonal nav item
"Halloween" in the Trivia Store dropdown pointing at the hub, added and removed
by a tool the way every other nav change is done (see
`rename-generator2-nav.js` / `vary-bcg-nav-anchor.js` for the idiom, and note
`add-trivia-store-nav.js` cannot do it: it builds the dropdown whole and skips
any page that already has one). **Remove 1 Nov.**

### 4. The Generator perk — SHIPPED on p189, reusable elsewhere
Owner's idea, 10 Sept, and the strongest one on this page. **Bundle a free month
of Bingo Card Generator 2.0 with a Halloween purchase.**

Why it beats a discount: it raises what the customer gets rather than cutting
what we take, it hands them the tool to make *their own* Halloween cards when
ours do not fit their crowd, and it seeds Generator 2.0 trials into a paying
audience. A $11.99 game plus a month of the Generator is a materially different
offer from a $11.99 game.

**The mechanism already exists and is proven** — this is not a build:

- `_content/redemption-docs/` holds per-tier redemption PDFs built by
  `make_pdfs.py` (Bronze = a Day Pass, Silver, Gold = a free year "a $116
  value").
- **p155 Holidays already ships this**: its page reads "Includes 1 Month Free of
  Bingo Card Generator 2.0".
- Redemption is a discount code entered at the Generator 2.0 checkout,
  completing at $0.

So a Halloween version is: create the code in LemonSqueezy, add a
`halloween-bcg2-redemption.pdf` to `make_pdfs.py`, bundle it in the product
download, and add the perk line to the product copy.

> **RESOLVED 10 Sept, repo side.** `make_pdfs.py` now reads codes from an
> untracked `redemption-codes.json` and refuses to run without it; that file and
> the built PDFs are gitignored, and the three PDFs were removed from the index.
> A fourth `build()` call produces `halloween-bcg2-redemption.pdf`.
> **Still owner action:** the three OLD codes are in public git history
> permanently and must be rotated in the LemonSqueezy dashboard. Removing them
> from HEAD does not unpublish them.

### 5. Halloween bundle — SHIPPED, see Done above
Superseded 10 Sept. The overlap the owner suspected was real and worse than
thought: p33 contained p97. Resolved by splitting p33 into the standalone game
show and building p189 on top. The open question is the price, not whether to
do it.

### 6. Colour palettes in the free generator
The generator's PDF colours are **hardcoded** in `files/theme/script.js` (jsPDF
autoTable: body `fillColor: "#fff"` / `lineColor: "#000"`, header `fillColor:
"#000"` / `textColor: "#fff"`). A palette selector is a contained change: a few
hex values plus a `<select>` on `bingocardgenerator.html`.

Ship **Halloween (orange/black)** first, then Christmas, Valentine's and St
Patrick's reuse the same mechanism all year. This is the item that compounds
past Halloween: the free generator is a top entry point and seasonal cards are
inherently shareable.

### 7. Halloween preset on the generator
A pre-filled title and themed word list, linked from the hub page, so a visitor
who lands on the hub and does not want our song list still leaves with cards.

### 8. Refresh the 2019 posts
`halloween-trivia-and-music-bingo-game-downloads-for-2019` and
`complete-halloween-trivia-game-show-questions-answers-ready-for-download` are
the only Halloween editorial and are seven years stale. Refresh one and point it
at the new hub; consider a canonical for the other. Remember
`add-jsonld.js`'s hand-maintained `MODIFIED` map takes a slug only on a genuine
content edit.

### 9. CTAs on the free Halloween song list
`/music-bingo-song-lists/halloween-party/` is in the sitemap with 7 inbound
links and already draws traffic. It currently converts nothing. Add a product
CTA. Same argument applies to the other 49 library pages, so treat Halloween as
the pilot.

### 10. Seasonal promo
`promo-bar.js` is intact on disk and referenced by **zero** pages, so a promo is
a config edit (`CODE`/`PCT`/`END`/`COPY`) plus `add-promo-bar.js`. Needs the
code created in LemonSqueezy. **The store is shared with Bingo Card Generator
subscriptions, so scope the code per-product** or a Halloween sale hits
Generator billing. Self-expires on its `END` date.

---

## After 1 Nov

- Revert the c40 seasonal order (list is in `order-store-tiles.js`).
- Remove the seasonal nav item.
- Leave the hub page live and re-point it each year; it accrues authority.
- Roll the generator palettes straight into Christmas.
