---
name: seasonal-push
description: Run a seasonal sales push on the Fat City Entertainment store — Halloween, Christmas, Valentine's, St Patrick's, or any dated occasion the catalogue already has games for. Use this skill whenever a season is the reason for the work: "what can we do for Christmas", "get Halloween working for us", "we should have a Valentine's bundle", "put a banner up for the holidays", "make a seasonal category", "this needs to be a big seller", "what's the plan for New Year's". It covers the whole shape of a push — the seasonal bundle and its compare-at, the indexable hub page, the nav item, the banner, the perk badge, the tile order, the Generator preload link, the redemption PDF — in the order that keeps each step true, plus every trap the Halloween 2026 run hit. Reach for it BEFORE building any of those pieces individually, because most of them are already tools and the failure mode is building a ninth one-off instead of adding a map entry to the eighth.
---

# Running a seasonal push

Built out over the Halloween 2026 push (Sept 2026). Everything below is a tool
that already exists; a new season is almost entirely **map entries and dates**,
not new code. If you find yourself writing a `add-christmas-nav.js`, stop: the
Halloween one takes a config change.

Pair this with **`pricing-strategy`** for anything touching money. This skill
says *what to build and in what order*; that one says *how a price moves*.

## The shape of a push

Seven pieces. Roughly in impact order, and the first four are most of the win.

| # | Piece | Tool | Seasonal? |
|---|---|---|---|
| 1 | The bundle (a product) | `new-product.js` | new each season |
| 2 | Category order, season first | `order-store-tiles.js` | **revert after** |
| 3 | Indexable hub page | `new-content-page.js` | keep, re-point yearly |
| 4 | Nav item pointing at the hub | `add-halloween-nav.js` | **remove after** |
| 5 | Banner on the entry pages | `add-halloween-banner.js` | **remove after** |
| 6 | Perk badge on image and tiles | `add-perk-badge.js` | map entry |
| 7 | Generator preload + redemption PDF | `build-generator-links.js`, `make_pdfs.py` | map entry |

**Every seasonal edit needs a takedown, and the takedown must be proved before
the thing goes up.** A "Halloween" nav item still live in December is worse than
never having had one. Both nav and banner tools have `--remove`; run
`--remove --write`, confirm `git diff` is empty, then re-apply. Do that *before*
you commit the addition, not in November.

## Order of operations

The order matters because each step reads the one before it.

1. **LemonSqueezy first.** The bundle and any repricing. The site only displays
   prices. See `pricing-strategy`.
2. **The bundle product**: `new-products.json` entry, then
   `node _tools/new-product.js --write --publish`, then the checkout URL into
   `ls-links.js`, then `add-store-tile.js`.
3. **Bundle membership and the perk**: add it to `BUNDLES` and, if it carries a
   non-game perk, `PERKS` in `add-cross-sell.js`; add it to `MIXED_PACKS` in
   `check-value-stacks.js` so the Quick math paragraph is tool-owned.
4. **Category order**, season first, with the revert list written into the
   comment beside it in `order-store-tiles.js`.
5. **Hub page** from `new-content-pages.json`, then the **nav item** so the hub
   is not orphaned, then the **banner**.
6. **Badge**, **preload link**, **redemption PDF**.
7. Run the whole after-a-change list: `add-cross-sell.js`,
   `add-price-ladder.js`, `check-value-stacks.js`, `add-jsonld.js`,
   `bake-buy-links.js`, `build-campaign-pages.js`, `sitemap-lastmod.js`,
   `canonicalize-trailing-slash.js`, then `check-links.js`,
   `check-tile-structure.js`, `check-linked-prices.js`, `fix-product-divs.js`.

## What Halloween 2026 got wrong, so Christmas does not

**The hub was orphaned.** `/halloween-trivia-and-music-bingo.html` shipped as
the indexable landing page and, a day later, exactly ONE page linked to it. In
the sitemap, reachable from nothing. A sitemap entry gets a page crawled; a nav
link gets it treated as part of the site. **Ship the hub and the nav item in the
same change.**

**A price written in prose went stale for two days.** The hub said $39.99 after
the pack moved to $35.97, because `set-usd-price.js` only walks product pages
and listing tiles. `check-linked-prices.js` exists now and catches a dollar
amount written next to a link to the product it describes. **Fix the spec as
well as the page**, or the next `--write` reverts your fix.

**The bundle's cross-sell claimed a 98 cent saving.** Three games at $11.99,
$11.99 and $16.99 came to $40.97 against a $39.99 pack. True and useless, and it
sat under body copy claiming $24.98. A pack that carries a non-game perk gets a
`PERKS` entry and states the whole comparison instead of dividing. **Never lead
with a per-game figure on a mixed pack**: divided by its game count, that bundle
was $13.33 a game against an $11.99 single.

**The bundle needs a reason to exist that survives arithmetic.** If the pack is
barely cheaper than its parts, the discount is not the offer. Halloween's answer
was a month of Bingo Card Generator 2.0 plus a one-click preload link, which is
worth more than the few dollars a deeper discount would have been.

**Free generator downloads carry a `FREE DEMO` watermark.** So a preload link on
its own is not worth charging for. Pair any autoload with a pass: a Day Pass
($6.99, 24 hours, no subscription) for a single, the Monthly ($24) for a bundle.

**A perk is invisible in the cover art.** The tile shows a box shot and a price.
`add-perk-badge.js` puts the perk in the corner of the main image and every
listing tile. Two tile shapes exist, `wsite-com-category-product` and
`wsite-com-category-product-featured`; matching only the first misses the
storefront and the store root, the two highest-traffic placements on the site.

**A sitewide bar covers the mobile hamburger.** The header nav is
`position: fixed; top: 0`. Any banner goes **inside `#wsite-content` in normal
flow**, never fixed, never floated. Check it the way the original bug was
caught: `elementFromPoint` at the hamburger's coordinates at 390px wide.

**Start the banner quiet and turn it up.** `add-halloween-banner.js` carries a
`TONE` constant, `"subtle"` or `"bold"`. Weeks out, subtle: a paper-coloured
note with a text link. In the last month, bold: dark block, filled button. A
full-strength promo in the run-up is shouting at people who are not shopping
yet, and it stops registering by the time they are. Keep every painted property
scoped to a modifier class so the switch is one word.

**Price a bundled feature explicitly, and write down that you did.** The
Halloween pack's compare-at quotes one component above its own page price
because that component ships with a one-click autoload link, valued at $5. That
is legitimate and it is also exactly the kind of thing a later agent "fixes".
Put the override in the tool with the owner's own words beside it, and make the
tool print the gap on every run.

**Copy runs long.** The owner's steer, twice: more succinct, less information,
keep a little mystery. Lead with what it is, four bullets, one closing line. Put
the arithmetic in the `.fce-value-math` block, not in prose.

**No em-dashes in anything a visitor reads.** Fix it in the tool's template, not
on the generated page.

## Reusing a tool for the next season

- `add-halloween-nav.js` / `add-halloween-banner.js`: copy to
  `add-<season>-nav.js` / `add-<season>-banner.js` and change the label, href,
  id and copy. They are ~90 lines each and the anchoring logic is the fiddly
  part; keep it. Match nav items by their **link**, never by a `<li>` id, which
  Weebly rewrites to `active` on the current page.
- `add-perk-badge.js`, `build-generator-links.js`,
  `check-value-stacks.js` (`MIXED_PACKS`), `add-cross-sell.js`
  (`BUNDLES`/`PERKS`), `order-store-tiles.js`: **map entry only**.
- `make_pdfs.py`: one more `build()` call plus a code in the untracked
  `redemption-codes.json`. Never commit a code.
- Add any new tool to `.github/workflows/site-health.yml` **and simulate a real
  break to confirm the matcher fires**, then goes quiet. Three separate tools
  have been added to that loop with output shapes the regex did not match, each
  reading as a permanent all-clear.

## Timing

Venues book 2 to 4 weeks out, so the selling window is roughly the month before.
Anything that has to **rank** needs to be indexed 6 to 8 weeks out, which in
practice means the hub page and the nav link go up first and everything else can
follow. Christmas is the one exception worth starting earlier: the Holidays
6-pack and the Christmas single both sell from late October.

## After the season

- `add-<season>-nav.js --remove --write`
- `add-<season>-banner.js --remove --write`
- `add-perk-badge.js --remove --write` if the perk was seasonal
- Revert the `order-store-tiles.js` seasonal block to the list in its comment
- Leave the hub page live and re-point it next year; it accrues authority
- Re-run the after-a-change list, then `check-links.js`
