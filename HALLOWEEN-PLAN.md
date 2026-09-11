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
> printing "$15.00 a game" under the buy button instead.
>
> **REWORKED 11 Sept.** $39.99 made the tool willing to claim a saving, and what
> it claimed was *"$13.33 a game against $40.97 bought one at a time, and you
> keep $0.98."* True, and useless: nobody crosses the room for 98 cents, and the
> line sat directly under a body paragraph claiming $24.98. The page argued with
> itself in two places a buyer reads together.
>
> The fix was to count the perk. `add-cross-sell.js` now has a `PERKS` map, and
> a pack that carries one states the whole comparison instead of dividing:
> *"…plus a month of Bingo Card Generator 2.0. Bought separately that is $64.97.
> In this pack it is $39.99, so you keep $24.98."* p155 Holidays got the same
> treatment, so its block and its own Quick math paragraph finally agree.
>
> **Per-game pricing is dropped for a perk pack, deliberately.** A mixed pack
> divided by its game count answers a question nobody asked: p189's $13.33 a
> game is *above* the $11.99 single, because one of the three is the $16.99
> game show. That is not a number to lead with, and it is the real reason this
> page needed the treatment rather than a reword. See "11. Autoload pricing"
> below for the move that would fix it at source.

---

## Shipped 11 Sept

- [x] **p189 cleaned up, the way the club pages are done.** A trimmed
  description, a tool-owned `.fce-value-math` "Quick math" block, and the three
  `.fce-fact-note` lines above the buy button, including the auto-renew
  disclosure the page was missing entirely. `check-value-stacks.js` gained a
  `MIXED_PACKS` pass for it: unlike a club, p189's components are not all the
  same price, so each one is read off its own product page. A reprice anywhere
  in the bundle now moves that paragraph on the next run.
- [x] **Five images instead of one.** New `_tools/add-product-gallery.js` fills
  the theme's `#wsite-com-product-images-strip`: the cover, printed cards, the
  print-and-play cover, the game show board and a question slide. It generates
  the 160px thumbnails and their webp twins, writes the `<source>` only when the
  twin is really on disk, and derives each crop from the page's own slot ratio.
  Add a `GALLERIES` entry and re-run for any other product.
- [x] **One stray `</div>` on all 25 pages `new-product.js` ever generated.**
  Found while cleaning p189 up and fixed at the source, then repaired by the new
  `_tools/fix-product-divs.js`. Its body-injection regex swallowed both the
  inner `.paragraph` closer and the short-description closer and put both back,
  while every spec body brings its own. `#wsite-com-product-info-inner` closed
  right after the description, so the buy button and the cross-sell became its
  siblings and every wrapper after them closed a level early. Nothing read the
  shape of a product page until now; the check is in the weekly health run.
- [x] **The redemption PDFs carry real buttons.** All four now open the right
  LemonSqueezy plan with the code already applied via
  `checkout[discount_code]`, instead of telling the reader to go and find
  `bingocardgenerator.online/#pricing`. The Halloween one carries a second
  button, `/cards/halloween/`, that hands the whole game to the generator.
  The code still prints in the box, for paper and for readers that strip links.

## Next

### 3. Seasonal nav item — SHIPPED 11 Sept
`_tools/add-halloween-nav.js`, 484 pages, 968 nav copies, first item in the
Trivia Store dropdown. **`--remove --write` after 1 Nov**; the takedown was
proved to restore the tree byte for byte before the item was applied.

The real find was how isolated the hub was: `/halloween-trivia-and-music-bingo.html`
shipped 10 Sept as the indexable Halloween landing page and, a day later, was
linked from **one** other page. In the sitemap, orphaned everywhere else, seven
weeks out. It now has 484 inbound links.

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

### 10. Seasonal banner — SHIPPED 11 Sept. Promo bar dropped.
**Owner's call, 11 Sept: skip the promo bar, just do the banner.** So this is
not `promo-bar.js` and not a discount. `_tools/add-halloween-banner.js` puts a
plain announcement block on the nine entry pages a shopper actually lands on:
home, the storefront, the store root, Music Bingo Downloads, Holidays, Pre-made
Trivia Shows, Bundles, and the two Our Games pages. Product pages are excluded,
they already carry a cross-sell.

It sits **inside `#wsite-content` in normal flow**, never fixed and never
floated, which is the whole reason it can exist at all: the old sitewide bar was
`position: relative` against a `position: fixed; top: 0` mobile header and
covered the hamburger on every phone. Verified with `elementFromPoint` at 390px
that the hamburger now resolves to itself, not to the banner.

The pack price is read off p189's own page at build time, so **this tool is on
the re-run-after-repricing list** with the cross-sell and the ladder. Proved in
the weekly health check by repricing p189 and watching it fire.

**`--remove --write` after 1 Nov**, which restores every page exactly.

`promo-bar.js` is still intact on disk and referenced by zero pages if a real
discount is ever wanted: a config edit (`CODE`/`PCT`/`END`/`COPY`) plus
`add-promo-bar.js`, and the code has to exist in LemonSqueezy. **The store is
shared with Bingo Card Generator subscriptions, so scope any code per-product**
or a Halloween sale hits Generator billing.

### 11. The generator's `?load=` handler — WRITTEN AND TESTED, awaiting merge

> **SHIPPED 11 Sept to a branch.** `tooniebuckerooni/bingocardgenerator2`,
> branch `claude/preload-link-handler`. Merge it and the second PDF button
> works. Tested in Chromium against the real 30-song payload: title, all 30
> squares, the orange-on-black palette and the toast all land, with no page
> errors; a malformed payload shows the error toast and leaves a working
> generator; a plain visit is unchanged.
>
> It also **removes a live crash**. `if(qp.has('code'))hCb(qp.get('code'));` ran
> on every visit carrying `?code=` and `hCb` was not defined anywhere in that
> file. Reproduced against the previous commit: `hCb is not defined`, thrown
> mid-init, which took `?card=` share links, the saved-games list, the autosave
> restore and the `?activated` post-checkout handler down with it. Removed
> rather than guessed at; wire it to `oUnlock()` + `tryAct()` if it was meant to
> carry a license key.

The original writeup, for reference:

`/cards/halloween/` is live and forwards to the generator with the whole game
encoded in a `?load=` payload: title, all 30 song titles, and an orange-on-black
palette. **Generator 2.0 does not read that parameter yet.** Its init block
reads exactly three: `code`, `card` and `activated`. An unknown one is ignored,
so the link degrades to an ordinary empty generator rather than an error, but it
fills nothing in until this ships.

The handler is four lines and reuses machinery the generator already has, so
nothing new has to be built: the payload is the same
`btoa(encodeURIComponent(JSON.stringify(state)))` its `?card=` share links use,
and `applyState()` already exists to put one back. Print the exact patch with:

```
node _tools/build-generator-links.js --patch
```

Two edits, and the second is not optional: without changing the autosave-restore
guard to `if(!qp.has('card') && !qp.has('load'))`, a returning visitor's
autosaved work is restored on top of the preload and silently wins. The link
would appear to do nothing for exactly the people who use the generator most.

> **Also found, and unrelated: `?code=` is broken on the live generator.**
> The init block calls `hCb(qp.get('code'))` and `hCb` is not defined anywhere
> in the page. Any visit carrying a `code` parameter throws a ReferenceError,
> and because it throws mid-init everything after it dies too: `?card=` share
> links, the saved-games list, the autosave restore and the `?activated`
> post-checkout handler. Nothing on our side links that way, so nobody has hit
> it, but it should either be implemented or deleted.

Once it is live, upgrade the p189 bonus bullet in `_tools/new-products.json`
from "make your own cards" to "one link loads this game in". It is deliberately
not claiming that today, because today it would not be true.

### 12. Autoload pricing: music bingo singles at $16.99 — OWNER DECISION

Owner's steer, 11 Sept: *"music bingo games with the autoload should be around
16.99 or 17.99. So once we add that, the inherent value should increase too."*
Agreed, with one correction that changes what has to be in the box.

**The autoload on its own is not worth $5.00.** Free-tier downloads from
Generator 2.0 carry a `FREE DEMO · BINGOCARDGENERATOR.ONLINE` watermark across
every card. So a buyer who follows a preload link without a pass gets a game
they cannot hand to a room. Charging $16.99 for that is a promise the product
does not keep, which is the same failure as a page quoting a price the checkout
will not honour.

**So the autoload single is the game plus a Day Pass, at $16.99.** The Day Pass
is $6.99, one-time, 24 hours, no subscription and no card required to redeem, so
it is exactly the size of one event night. The mechanism already exists: Bronze
ships one, `make_pdfs.py` already builds the leaflet, and the leaflet now opens
the Day Pass checkout at $0 in one click. The stack reads $11.99 + $6.99 =
$18.98 of value at $16.99, which is arithmetic anyone can check.

**$16.99, not $17.99.** $16.99 puts it level with p33, and against it the
Halloween Complete Pack reads $13.33 a game versus $15.32 bought separately,
which is the first time that bundle's per-game figure has been the right way up.
$17.99 buys about a dollar and costs that line.

**Pilot on p97 Halloween only, and do not touch p103.** `check-value-stacks.js`
reads the single-game price off `store/p103/christmasparty.html` and derives
every club compare-at from it, and `add-price-ladder.js` anchors its "a single
game" rung on the same page by design. Repricing p103 alone would recompute all
three club stacks at $16.99 a game while 49 other singles were still $11.99:
Gold's compare-at would jump from $726.49 to $976.49 with nothing behind it.
The anchor moves when the catalogue moves, not before.

What p97 at $16.99 does to p189, for reference:

| | now | p97 at $16.99 |
|---|---|---|
| Three games bought separately | $40.97 | $45.97 |
| Value with the Generator month | $64.97 | $69.97 |
| Bundle price | $39.99 | $39.99 |
| You keep | $24.98 | $29.98 |
| Games-only saving | $0.98 | $5.98 |

Order of operations, and the first step is not optional:

1. **LemonSqueezy first.** Change p97 to $16.99 in the dashboard. The site only
   displays prices; LemonSqueezy charges them.
2. Create the Day Pass redemption code for it, scoped to the Day Pass product
   so it cannot be spent against a subscription.
3. `node _tools/set-usd-price.js p97 16.99`
4. Add the Day Pass line to p97's copy and to `make_pdfs.py`.
5. `node _tools/add-cross-sell.js --write`, `add-price-ladder.js --write`,
   `check-value-stacks.js --write`, `build-song-library.js --write`,
   `add-jsonld.js --write`, `bake-buy-links.js --write`,
   `build-campaign-pages.js --write`.
6. Mint the preload link: add p97 to `_content/generator-links.json` and run
   `build-generator-links.js --write`. All 50 library packs can have one; the
   data is already published in full and free, so a preload link publishes
   nothing new.

Note for p189: its buyer gets the Generator **month**, which supersedes the Day
Pass. Its Quick math counts the three games at list plus the $24 month and does
not count a Day Pass, so nothing is double-counted.

---

## After 1 Nov

- Revert the c40 seasonal order (list is in `order-store-tiles.js`).
- Remove the seasonal nav item.
- Leave the hub page live and re-point it each year; it accrues authority.
- Roll the generator palettes straight into Christmas.
