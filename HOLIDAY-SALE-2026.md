# Holiday Sale 2026: Halloween last push to New Year's

Written 9 Oct 2026, a Friday. The owner is at the LemonSqueezy dashboard **this
weekend only**, so the plan is built around that: every price change, launch and
discount code for the next twelve weeks is set up in one sitting, and the site
switches each one on and off by date. **Start with section 3.**

---

## 1. Where things stand, honestly

- **The Halloween banner is gone, the product stays.** Owner's read, 9 Oct: four
  weeks on seven entry pages and no sales. The banner was a note *about* the
  season on pages where nobody had chosen a game yet. The p189 pack, the nav item,
  the hub and the Halloween-first order in Holidays are all still live.
- **Before blaming the offer, check the reach.** As of this repo's last record,
  `_content/email-sends/halloween-2026.md` was **written and never sent**. At
  about 380 visits a month, the site cannot produce a Halloween season on
  organic traffic alone; the ~2,000-person list can. If that send has not gone
  out, it is the single highest-value thing on this page, and it costs nothing.
- **"Music bingo" search interest is seasonal.** The owner sees it falling and
  sales falling with it. That is the pattern the repo's earlier plans expected:
  late summer is the trough, and party season (late October through December)
  is the peak. The search tools in this session could not confirm the curve
  (Ahrefs keyword history is not on the current plan, and Semrush is out of API
  units), so this is the documented expectation, not fresh data.
- **Price is probably not the problem,** for the reason the pricing skill gives:
  at this traffic a price change cannot be measured, and the margin on a
  download is close to 100%. What the pages lacked was a **reason to buy today**,
  and that is what this push adds: real dates, real deadlines and a few genuine
  sales that end.

---

## 2. What shipped today (on branch `claude/holiday-sale-strategy-w8am6q`)

| | What | Why |
|---|---|---|
| ✅ | **Halloween banner retired** (`add-halloween-banner.js`, `ACTIVE = false`) | Owner's call. The tool still owns the seven pages, so the Monday check stays quiet instead of asking to put it back. Flip to `true` to restore it. |
| ✅ | **Halloween hub redesigned**: a dark hero, a live countdown and picture cards | "Showiness." The hub was five paragraphs. Now it's a black-and-pumpkin hero, the Complete Pack as a wide feature card, the three games and the free song list as picture cards, and every price read off the product page at build time. |
| ✅ | **Christmas hub, new**: `/christmas-trivia-and-music-bingo.html` | Indexable, in the sitemap, evergreen-and-cranberry. Christmas has to start now: corporate parties book from late October, and a new page needs six to eight weeks to rank. |
| ✅ | **"Christmas" in the Trivia Store menu on all 516 pages** (`add-christmas-nav.js`) | Shipped with the hub, the lesson Halloween taught: its hub went up alone and was linked from one page. Removal tested first: `--remove --write` restores every page byte for byte. |
| ✅ | **Six old seasonal blog posts now link to this year's hubs** | The only Halloween and Christmas editorial on the site dates from 2017 to 2020, and none of it pointed at anything you sell this year. |
| ✅ | **Countdown chip under the buy button** on the Halloween and Christmas products (`add-season-countdown.js`) | *"22 days to Halloween. Venues book two to four weeks out."* It hides itself the day after, so nothing goes stale even if the takedown is forgotten. Christmas appears from 15 Nov. |
| ✅ | **The promo calendar** (`PROMOS` in `assets/js/ls-buy.js`) | Sixteen dated sales, each **switched off** until you confirm its code exists. Section 4. |
| ✅ | **Christmas Complete Pack (p190), staged** at $54.99 | Hidden from Google and linked from nowhere until launch. Section 5. |
| ✅ | **Christmas Trivia Night (p175)**, em-dashes cleared from its copy and ready to launch | It was one of the 13 shows held back in September "until mid-October". It's mid-October. |
| ✅ | **`/cards/christmas/`**, the one-click generator link for the Christmas game | The Christmas pack's free Generator month includes autoload, the same as Halloween. |
| ✅ | **`/go/christmas/`**, the Christmas email landing page | Ready for the 10 Nov send. |
| ✅ | **Seven email drafts**, `_content/email-sends/holiday-2026.md` | Halloween last call through New Year's Eve. |
| ✅ | **A `season-hub` click origin** in `track.js` | So a season can be judged by whether the hub produced checkouts, which the banner never let anyone measure. |

Verified: 0 broken links across 783 pages, the stylesheet balances, every
product page balances, no new price-ladder inversion, and the phone menu button
is still the element under the tap on both hubs and a product page at 390px.

---

## 3. THIS WEEKEND in LemonSqueezy, in this order

About 60 to 90 minutes. Tick as you go; tell the agent what's done, and it
flips the matching switches and runs the launch commands in section 6.

### A. Launch Christmas Trivia Night (p175), $11.99
1. In Trivia Show Maker, open `_content/trivia-shows/christmas-long-night.tgp.json`
   and export the host packet, answer sheets and score sheet PDFs (see that
   folder's README; **never commit the PDFs**).
2. Create the product in LemonSqueezy at **$11.99**, upload the PDFs.
3. Send the agent its **buy link**.

### B. Create the Christmas Complete Pack (p190), $54.99
1. New product, **$54.99**. Name: *Christmas Complete Pack - 3 Christmas Games & a
   Print and Play Trivia Show*.
2. Files: everything in **p42 Christmas Special** (game show, music trivia, Christmas
   Party bingo cards) + the **p175 PDFs** + the **Christmas redemption PDF** (step C).
3. Send the agent its **buy link**.

**Why $54.99:** p42 alone is $53.99. For **one dollar more** the pack adds the
print and play trivia night and a free month of Bingo Card Generator 2.0 with
the Christmas game preloaded. That makes p42 the decoy and p190 the obvious
choice, exactly how p189 works for Halloween. The struck-through **$65.98** on the
page is the games bought separately ($53.99 + $11.99), a true value stack, and the
Quick math box underneath will show it. The free month is a bonus on top and is
not counted in the $65.98.

### C. The Christmas Generator code (for the redemption PDF)
1. In the Generator 2.0 store, create a code that takes the **Monthly plan to $0**,
   **scoped to the Monthly product only**.
2. Add it to the untracked `_content/redemption-docs/redemption-codes.json` as
   `"christmas": "..."` and run `python3 make_pdfs.py`. The script now builds
   `christmas-bcg2-redemption.pdf` whenever that key exists, and skips it
   otherwise.

### D. Create the discount codes (the promo calendar)
For **every** code: percentage discount, **limited to the listed products only**
(the store is shared with the Generator subscriptions, so an unscoped code
discounts those as well), **start on or before** the start date, and
**expire one day after** the end date. The extra day is deliberate: the site
switches each sale off at midnight UTC, so no visitor anywhere sees a promise
the checkout has already stopped honouring.

| Code | % | Site shows it | Set LS expiry | Products |
|---|---|---|---|---|
| `SPOOKY20` | 20 | 10 Oct to 31 Oct | 2 Nov | p189 Halloween Complete Pack |
| `EARLYBIRD15` | 15 | 9 Nov to 26 Nov | 28 Nov | p190 Christmas Complete Pack, p42 Christmas Special, p155 Holidays 6-Pack |
| `BLACKFRIDAY25` | 25 | 27 Nov to 30 Nov | 2 Dec | every pack and club: p190 p189 p42 p155 p131 p130 p112 p147 p101 p168 p165 p166 p176 p127 p108 p162 p128 p123 p126 p49 p28 |
| `12DAYS-1` | 30 | 1 Dec | 3 Dec | p190 Christmas Complete Pack |
| `12DAYS-2` | 30 | 2 Dec | 4 Dec | p165 Around the World 4-Pack |
| `12DAYS-3` | 30 | 3 Dec | 5 Dec | p131 Starter Pack (Bronze) |
| `12DAYS-4` | 30 | 4 Dec | 6 Dec | p42 Christmas Special 3-Pack |
| `12DAYS-5` | 30 | 5 Dec | 7 Dec | p147 Decades 5-Pack |
| `12DAYS-6` | 30 | 6 Dec | 8 Dec | p155 Holidays 6-Pack |
| `12DAYS-7` | 30 | 7 Dec | 9 Dec | p176 General Knowledge Trivia 5-Pack |
| `12DAYS-8` | 30 | 8 Dec | 10 Dec | p166 Party Starter 4-Pack |
| `12DAYS-9` | 30 | 9 Dec | 11 Dec | p127 Movie Soundtracks 3-Pack |
| `12DAYS-10` | 30 | 10 Dec | 12 Dec | p168 Things In Songs 5-Pack |
| `12DAYS-11` | 30 | 11 Dec | 13 Dec | p130 Silver Club |
| `12DAYS-12` | 30 | 12 Dec | 14 Dec | p112 Gold Club |
| `NEWYEAR20` | 20 | 26 Dec to 1 Jan | 3 Jan | p101 "The Year Was..." 5-Pack, p147 Decades 5-Pack |

One limit to know about: a 12 Days code stays valid at checkout for a day or so
after its slot, because of that buffer. The site stops offering it on time, and
anyone who kept the URL gets the deal a little late. That's fine.

**If 16 codes is too many for one weekend**, create them in this order and stop
anywhere: SPOOKY20 (live tomorrow), BLACKFRIDAY25, EARLYBIRD15, NEWYEAR20, then
the 12 Days. Each entry is independent.

### E. Still outstanding from September
- **Rotate the three old Generator redemption codes** (Gold, Silver, Bronze). They
  are in this public repo's git history permanently; removing them from the
  current files did not unpublish them.
- **Test one code end to end** before telling the agent to switch it on: open
  `p189`'s checkout with `?checkout[discount_code]=SPOOKY20` on the URL and confirm
  the discount shows.

---

## 4. The sale recommendations, and why each one

All of these are **discount codes, not price changes**, for one reason: a code
can be dated and scoped in advance, and a price change needs a dashboard visit
to start and another to end. A sale that needs you at the dashboard on 1 Dec is
a sale that runs into January.

On the product page, a live sale shows a chip directly under the price:
**"Black Friday: 25% off. You pay $289.87; the code is applied at checkout for
you. Ends 30 Nov."** The figure is calculated from that page's own price, never
typed in. The code is added to the buy button and the sticky phone bar
automatically. With `live: false`, or outside its dates, an entry does nothing at
all.

### Halloween Countdown: 20% off the Complete Pack (10 to 31 Oct)
p189 drops from $35.97 to **$28.78** at checkout: three games and a Generator month,
less than three singles bought one at a time ($40.97). **Singles stay at full
price on purpose:** the pack is the deal, and a cheap single pulls buyers down
the ladder. Paired with the countdown chip, it gives a shopper a reason to buy
today.

### Election week (1 to 8 Nov): left empty
That week belongs to the election promo. See section 8.

### Christmas Early Bird: 15% off (9 to 26 Nov)
p190 **$46.74**, p42 **$45.89**, p155 **$48.93**. Corporate parties book from late
October, and an early-bird price rewards booking now rather than in mid-December.
It ends the day before Black Friday, so the two never overlap.

### Black Friday to Cyber Monday: 25% off every pack and club (27 to 30 Nov)
The year's one big sale, and it goes on the top of the ladder, where the order
value is. Starter Pack **$59.25**, Silver **$145.31**, Gold **$289.87**, every
5-pack **$31.49**. A flat percentage keeps the ladder in order (each rung is still
cheaper per game than the one below), so no new inversion. Singles, the Generator
and the Zoom booking are excluded.

### The 12 Days of Fat City: 30% off one pack a day (1 to 12 Dec)
The showiest piece, and the one built to make people come back. Twelve packs, one
per day, 24 hours each, ending on the **Gold Club at $270.54** on 12 Dec. The whole
schedule is in the 1 Dec email, so a reader waiting for their day opens every
send. **Packs only:** a single at 30% off is $8.39, just under the 5-pack's
$8.40 a game, and the ladder is what drives order value.

### Last minute (13 to 24 Dec): no discount
Instant download is the offer. The countdown chip does this job ("Christmas is
tomorrow. Still time: everything here downloads the moment you pay"), and the
17 Dec email says it out loud.

### New Year's Eve: 20% off "The Year Was..." and Decades (26 Dec to 1 Jan)
Both are nostalgia games about years and decades, which fits a party counting
down to a new one. Each is **$33.59**.

### Recommended, not set up
- **Do not discount p97, p174 or p103 on their own.** A cheap single competes
  with the pack.
- **Hold the autoload single pricing ($16.99 + Day Pass) until 2027.** The
  §12 plan in `HALLOWEEN-PLAN.md` still stands; it is too late in the season to
  reprice a single and re-cut its download.
- **The p155 Holidays inversion stays.** It is accepted and documented; Black
  Friday's flat 25% leaves it where it is.

---

## 5. The Christmas Complete Pack (p190)

| | |
|---|---|
| Page | `/store/p190/christmascompletepack.html` (staged: hidden from Google, no tile, not in the sitemap) |
| Price | **$54.99**, struck through at **$65.98** (p42 $53.99 + p175 $11.99) |
| In the box | Christmas Party music bingo, the Christmas game show, the music trivia game show, the Christmas Trivia Night print and play, and a free month of Generator 2.0 with one-click autoload |
| Perk badge | "1 Month Free / Bingo Card Generator 2.0" on the image, and on every tile once tiles exist |
| Countdown | Christmas chip, from 15 Nov |
| Generator link | `/cards/christmas/`: all 32 songs, the title and an evergreen-and-cranberry palette, in one click |

---

## 6. Launch commands (for the agent, once section 3 is done)

**p175 Christmas Trivia Night**, after the buy link arrives:
```
# _tools/new-products.json: p175 "publish": true
node _tools/new-product.js --write --publish --force --only p175
# assets/js/ls-links.js: paste the p175 link, flip [ ] to [x]
node _tools/add-store-tile.js p175 --write        # c6 Pre-made Trivia Shows, c40 Holidays
node _tools/order-store-tiles.js --write          # add p175 after p174 in c6, after p103 in c40
# sitemap.xml: add the p175 URL by hand
node _tools/add-season-countdown.js --write       # --force rebuild drops the chip
```

**p190 Christmas Complete Pack**, after the buy link arrives:
```
# _tools/new-products.json: p190 "publish": true
node _tools/new-product.js --write --publish --force --only p190
node _tools/set-usd-price.js p190 65.98 54.99
# assets/js/ls-links.js: paste the p190 link, flip [ ] to [x]
# _tools/add-cross-sell.js: BUNDLES  p190: ["p42", "p175"]
#                           PERKS    p190: { name: "a month of Bingo Card Generator 2.0, free", amount: 0 }
#                           NO_BLOCK add "p190"
# _tools/check-value-stacks.js: MIXED_PACKS entry for p190, same shape as p189
# _tools/add-fact-notes.js: p190 -> monthly
# _tools/add-price-ladder.js: accept p190 as a mixed pack, same note as p189
node _tools/add-store-tile.js p190 --write        # storefront, store root, c34 Bundles, c40 Holidays
node _tools/order-store-tiles.js --write          # p190 at the head of c40 from 1 Nov; second in c34
node _tools/add-perk-badge.js --write
node _tools/add-season-countdown.js --write
# sitemap.xml: add the p190 URL by hand
# _tools/new-content-pages.json: Christmas hub feature card p42 -> p190, button -> p190
node _tools/new-content-page.js --write --only christmas-trivia-and-music-bingo.html
# _content/campaigns.json: christmas picks p42 -> p190, cta p190
```
Then the full after-a-change list: `add-cross-sell`, `add-price-ladder`,
`check-value-stacks`, `add-fact-notes`, `add-jsonld`, `bake-buy-links`,
`build-campaign-pages`, `sitemap-lastmod`, `canonicalize-trailing-slash`, then
`check-links`, `check-tile-structure`, `check-linked-prices`, `fix-product-divs`.

**Switching a sale on:** set `live: true` on its `PROMOS` entry in
`assets/js/ls-buy.js`, but only after the owner confirms the code exists and is
scoped. Nothing else needs to change.

---

## 7. More ideas, ranked, not built

1. **A free Christmas warm-up round in Trivia Show Maker.** City pages already
   load a free round with one click (`/trivia-show-maker/?round=<slug>`). Publish
   the Warm-Up round from p175 as a free sample on the Christmas hub: "Load a
   free Christmas round". A host who has run round one is close to buying the
   other four. Needs the owner's OK to give that round away.
2. **A `/go/12-days/` page** that shows today's deal by date, for the 1 Dec email
   and for sharing. Build in November.
3. **Seasonal colour palettes in the free generator** (Halloween orange and black,
   Christmas red and green). That's the other repo, `bingocardgenerator2`, and
   it's item 6 in `HALLOWEEN-PLAN.md`. The free generator is a top entry point,
   and seasonal cards get shared.
4. **Canada and Calgary for Christmas.** Canada turns search impressions into
   clicks at 1.6 times the US rate, and `yycevents.html` is rewritten. A Calgary
   corporate line on the Christmas hub, or a send to Alberta contacts, is cheap.
5. **Gift angle for the Bronze Starter Pack**, "for the host in your life", in the
   12 Days email on its day (3 Dec).
6. **Grey Cup and Super Bowl**: Touchdown Trivia (p28) is in the Black Friday list
   now and could get its own countdown in late January (add a `SEASONS` entry).

---

## 8. Handoff: the election promo agent

The election promo comes in **directly after Halloween comes down**. What it
inherits, and what to leave alone:

**Halloween takedown, on or after 1 Nov** (all tested to restore byte for byte):
```
node _tools/add-halloween-nav.js --remove --write
# add-halloween-banner.js is already off (ACTIVE = false); nothing to do
# order-store-tiles.js: revert the c40 seasonal block to the list in its comment,
#                       and put p190 / p103 / p42 first for Christmas
```
The Halloween **hub stays live** (it builds authority to re-use next year). The
Halloween **countdown chips switch themselves off** on 1 Nov; take the markup down
whenever convenient with `add-season-countdown.js` (remove the Halloween entry
from `SEASONS` and re-run `--write`). `SPOOKY20` stops showing at midnight UTC
on 1 Nov.

**Clear for the election promo:**
- **The week of 1 to 8 Nov has no sale on the calendar.** Christmas Early Bird
  starts 9 Nov. If the election promo needs to run longer, move `EARLYBIRD15`'s
  `start` in `ls-buy.js` (and tell the owner to match it in LemonSqueezy).
- **A dated discount = one `PROMOS` entry in `ls-buy.js`.** Scope it, date it,
  leave `live: false` until the owner confirms the code exists. You get the
  chip under the price and the code at checkout, with no takedown needed.
- **A countdown to Election Day = one `SEASONS` entry in `add-season-countdown.js`**
  (date `2026-11-03`). There is a neutral grey chip style for any season that
  isn't Halloween or Christmas.
- **Do not touch:** the Christmas nav item and hub, the p190 staging, and the 10 Nov
  Christmas send slot.

---

## 9. Takedown calendar

| Date | What | How |
|---|---|---|
| 1 Nov | Halloween nav item | `add-halloween-nav.js --remove --write` |
| 1 Nov | c40 Halloween-first order | revert in `order-store-tiles.js`, Christmas first |
| automatic | Halloween countdown chips, SPOOKY20 | switch off by date |
| 26 Dec | Christmas nav item | `add-christmas-nav.js --remove --write` |
| 2 Jan | Christmas countdown markup, c40 Christmas-first order | `SEASONS` / `order-store-tiles.js` |
| automatic | Every promo-calendar sale | switches off by date |
| never | Both hubs | they stay live and get re-pointed each year |
