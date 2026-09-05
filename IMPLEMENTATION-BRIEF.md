# Implementation brief — fall pricing + 20 new products

Written 2 Sept 2026. **Batch 1 shipped 5 Sept 2026** — see "Launch log" below.
The rest is still staged on `claude/fall-pricing-premade-games-zpcjsj`.

> ## Launch log — batch 1, 5 Sept 2026
>
> **Live:** the five General Knowledge nights (`p169`–`p173`), Halloween
> (`p174`), and the **GK 5-Pack** (`p176`) — wired, unstaged, tiled, in the
> sitemap. Each buy button was checked against its own `ls-links.js` entry.
>
> **Where their tiles sit (corrected 5 Sept).** All seven are in **Pre-made
> Trivia Shows** (`store/c6/`), ordered Halloween → 5-Pack → Nights One-Five.
> Only Halloween and the 5-Pack also appear on the storefront; the five singles
> are category-only, so the storefront leads with the seasonal game and the
> pack rather than five near-identical rows.
>
> They first landed in **Music Bingo Card Downloads** and not in Pre-made
> Trivia Shows at all, because `add-store-tile.js` carried a hardcoded
> three-page list from when the whole store was music bingo. A product's
> categories are a merchandising decision, so the tool now takes `--pages`
> (`storefront`, `store-root`, `music-bingo`, `trivia-shows`, or a path) and a
> `--remove` flag. Anything non-bingo added from here needs `--pages`.
>
> **Displayed prices switched to $11.99** on all 42 singles, plus the 3-pack,
> the three 5-packs and the Holidays 6-pack. LemonSqueezy is being changed in
> parallel, so for a short window the site shows $11.99 while checkout may
> still take $10.99. **That direction is safe** — the customer pays less than
> advertised, which costs a little revenue and no trust.
>
> **The four products that move DOWN are now done too** (5 Sept): Silver Club
> $193.75, Entertainer's and Word Games $25.99, One Hit Wonders 2-Pack $17.99.
> They were held back until LemonSqueezy matched, because a page showing *less*
> than checkout takes is a bait-and-switch from the buyer's side — the one
> failure the ordering rule exists to prevent.
>
> **The ladder table is now clean at every rung**, for the first time:
> $11.99 → $8.66 → $8.40 → $8.17 → $7.90 → $7.75, no inversion.
>
> **But the copy still may not claim "buy more, pay less per game."** The table
> has seven rungs and the catalogue has more: the **Around The World 4-Pack
> (`p165`) at $32.49 works out to $8.12 a game**, which undercuts all three
> 5-packs at $8.40 and the Holidays 6-pack at $8.17. A buyer comparing those
> two pages sees a 5-pack costing more per night than a 4-pack. So
> `add-price-ladder.js` keeps the weaker, true claim — "every multi-game pack
> works out cheaper per night than buying singles."
>
> **`p165` → $33.99 is the whole fix.** That is $8.50 a game, which lands it
> between the 3-pack's $8.66 and the 5-packs' $8.40 and makes the catalogue
> monotonic end to end. It also matches the Party Starter 4-Pack's $8.50, so
> the two 4-packs stop disagreeing about what a 4-pack costs. Do it in
> LemonSqueezy first, as always.
>
> **One sale-roster interaction to watch:** the One Hit Wonders 2-Pack now
> works out to $9.00 a game, and `p81` One Hit Wonders is on the rotating
> $8.99 sale list. While that sale runs, the 2-pack offers no per-game reason
> to exist. Either drop `p81` from the roster or accept the pack goes quiet
> during its weeks.
>
> **Three live products were `noindex` while sitting in the sitemap** — `p165`,
> `p167` and `p168`, all wired, tiled and selling. The page told Google to skip
> them while the sitemap asked it to crawl them, so they could never rank.
> Fixed 5 Sept. `--publish` handles this for anything created since; those three
> predate it.
>
> **Every cloned product kept its template's Twitter card.** `new-product.js`
> rewrote `<meta name="description">` and `og:description` from the spec but not
> the Twitter tags, so Halloween's link preview advertised The Wild West, Things
> In Songs advertised Decades, Punk Rock advertised Golden Oldies — invisible on
> the site, wrong everywhere the link is actually shared. The same thing had
> happened to all 51 song-library pages from their shared shell. Root cause
> fixed in `new-product.js` and `build-song-library.js`; `fix-social-tags.js`
> now refreshes a drifted `twitter:description` instead of only ever adding one.
>
> **Still to build in LemonSqueezy:** Christmas (`p175`), the five classroom
> subjects and their pack (`p177`–`p182`), the five pop-culture shows and
> their pack (`p183`–`p188`). Owner is taking these closer to the Christmas
> launch.

> **For the 10 Sept session, work from `SEPT-10-PLAN.md`** — the sale handover,
> the eight singles to $8.99, the bundle compare-ats, the artwork queue and the
> copy/CTA pass, in order, with the LemonSqueezy steps separated from the repo
> steps. This brief stays the record of how the fall pricing was decided.

Start with the **Catalogue Callsheet** (sent separately, or regenerate with
`node _tools/build-ls-callsheet.js --write`). It has all 94 products with
copy buttons for name, summary, description and image URL, plus ticks that
persist in your browser so you can stop and resume.

---

## 1. The one rule

**Change the price in LemonSqueezy first. Then the site.**

The site only *displays* prices; LemonSqueezy *charges* them. A page promising
less than the checkout takes is the failure worth avoiding above all others. If
you cannot change LS right now, do not change the site either — half a
repricing is worse than none. This is why nothing here has shipped.

Full detail in the `pricing-strategy` skill (`.claude/skills/pricing-strategy/`).

---

## 2. What is waiting for you

### A. Twenty new products to create in LemonSqueezy

| id | product | price | page |
|---|---|---|---|
| `p169` | General Knowledge Night One | $11.99 | `/store/p169/triviashowgkone.html` |
| `p170` | General Knowledge Night Two | $11.99 | `/store/p170/triviashowgktwo.html` |
| `p171` | General Knowledge Night Three | $11.99 | `/store/p171/triviashowgkthree.html` |
| `p172` | General Knowledge Night Four | $11.99 | `/store/p172/triviashowgkfour.html` |
| `p173` | General Knowledge Night Five | $11.99 | `/store/p173/triviashowgkfive.html` |
| `p174` | Halloween Trivia Night | $11.99 | `/store/p174/triviashowhalloween.html` |
| `p175` | Christmas Trivia Night | $11.99 | `/store/p175/triviashowchristmas.html` |
| `p176` | General Knowledge Trivia Shows | $44.99 | `/store/p176/triviashowgk5pack.html` |
| `p177` | Classroom Trivia: Math | $8.99 | `/store/p177/triviashowclassroommath.html` |
| `p178` | Classroom Trivia: Science | $8.99 | `/store/p178/triviashowclassroomscience.html` |
| `p179` | Classroom Trivia: English and Language Arts | $8.99 | `/store/p179/triviashowclassroomenglish.html` |
| `p180` | Classroom Trivia: History and Social Studies | $8.99 | `/store/p180/triviashowclassroomhistory.html` |
| `p181` | Classroom Trivia: Geography | $8.99 | `/store/p181/triviashowclassroomgeography.html` |
| `p182` | Classroom Trivia 5-Pack | $34.99 | `/store/p182/triviashowclassroom5pack.html` |
| `p183` | Music Trivia Night | $11.99 | `/store/p183/triviashowmusic.html` |
| `p184` | Television Trivia Night | $11.99 | `/store/p184/triviashowtv.html` |
| `p185` | Movies Trivia Night | $11.99 | `/store/p185/triviashowmovies.html` |
| `p186` | Sports Trivia Night | $11.99 | `/store/p186/triviashowsports.html` |
| `p187` | The 80s and 90s Trivia Night | $11.99 | `/store/p187/triviashowrewind.html` |
| `p188` | Pop Culture Trivia Shows | $44.99 | `/store/p188/triviashowpopculture5pack.html` |

Three of those are bundles with no game file of their own: **p176** (five GK
nights), **p182** (five classroom subjects), **p188** (five pop-culture shows).

**Classroom products need TWO VARIANTS each**, which no other product on your
store uses:

| | one classroom | school-wide |
|---|---|---|
| single subject (p177–p181) | **$8.99** | **$22.00** |
| all five (p182) | **$34.99** | **$84.99** |

The site shows the single-classroom price; the body copy names the school-wide
one. Both tiers land at about 22% off buying singly, so the pack is worth
buying whichever licence someone picks.

### B. Fifty-one repricings

| what | from | to | per game |
|---|---|---|---|
| 42 music bingo singles | $10.99 | **$11.99** | — |
| 3-pack (p127) | $23.99 | **$25.99** | $8.66 |
| 5-packs (p147, p168, p101) | $39.99 | **$41.99** | $8.40 |
| Holidays 6-pack (p155) | $46.99 | **$48.99** | $8.17 |
| Silver Club (p130) | $198.75 | **$193.75** | $7.75 |
| Entertainer's (p108), Word Games (p162) | $27.00 | **$25.99** | $8.66 |
| One Hit Wonders 2-Pack (p128) | $18.99 | **$17.99** | $9.00 |
| Bronze (p131), Gold (p112) | — | **hold** | $7.90 / n/a |

**`p168` is resolved.** Its product page had drifted to $43.00 while
LemonSqueezy, the `ls-links.js` comment and all four of its listing tiles said
$39.99 — the page alone was wrong, and it was overstating, so the site quoted
$3.01 more than the checkout would take. Corrected to $39.99 on 4 Sep, and it
reprices to $41.99 with the other two 5-packs like any normal rung.

That descends properly for the first time — 8.66 → 8.40 → 8.17 → 7.90 → 7.75.
Revenue per order goes **up** on four of five rungs; Silver is the only cut,
and it is what buys a truthful "buy more, pay less per game" claim.

**Raising the single price also makes every club tier look better for free**,
because their compare-at prices are built from it:

| tier | value stack becomes | still sells at | new saving |
|---|---|---|---|
| Bronze | 10 × $11.99 + $6.99 licence + $10.99 Handbook = **$137.88** | $79.00 | **$58.88** (was $48.88) |
| Silver | 25 × $11.99 + $24.00 + $10.99 = **$334.74** | $193.75 | **$140.99** |
| Gold | 50 × $11.99 + $116.00 + $10.99 = **$726.49** | $415.50 | **$310.99** |

Those three paragraphs used to be hand-written prose no tool regenerated —
which is how Bronze advertised $89.00 for months after it dropped to $79.00.
They are now owned by `check-value-stacks.js`, which reads the single-game
price off p103 and rebuilds all three:

```bash
node _tools/check-value-stacks.js --write
```

It also owns **`goldclubplaylists.html`** — a standalone landing page, not a
product page, so `set-usd-price.js` never saw it and its stale-copy WARN never
fired. It carried the entire club comparison by hand: all three tier prices,
all three cost-per-game figures, three buy-button prices and the single-game
price quoted twice. Every one went stale in the fall repricing — Silver stuck at
$198.75, singles at $10.99 — and nothing caught it until the owner asked. Now
derived, including the cost-per-game row, which backs the bundled licence out
first (Silver moved $6.99 → $6.79 because its price dropped, not the single's).

It also owns the two 4-pack pages (`p165`, `p166`) that state in prose what
their components cost bought separately — both said **$43.96** (4 × $10.99) and
nothing regenerated them, so after the reprice both would have understated their
own pack's saving by $4.00. They now read from the same source. It then prints
the three `set-usd-price.js` commands that align each club's compare-at with its
new total. Run those too — the prose and the struck-through
price are read together, and a page that argues with itself is worse than one
that is merely out of date.

---

## 2b. Swapping a product's image

```bash
node _tools/swap-product-image.js <pNN> <image> [--write]
```

`<image>` is either a file to install into `uploads/`, or the name of one
already there. It updates the main `<img>`, the cloud-zoom link behind it, every
`<source srcset>` (the `.webp` twin), `og:image`, `twitter:image` and the alt
text on the product page; refreshes the tile on every listing page carrying the
product; updates the `sitemap.xml` image entry; and generates the `.webp` if
missing. Finish with `node _tools/add-jsonld.js --write`.

**Send me the file, don't paste it into chat** — pasted images do not reach the
sandbox. A URL or an uploaded file both work (the same upload that carried
`checkout-links.csv` works for images).

**Format.** Square **PNG or JPEG, 1200×1200**, under ~400KB. The site renders it
at 640×640 and `export-ls-images.js` resizes to fit 1600px for LemonSqueezy, so
a 1200px source serves both and stays clear of the "source narrower than 600px"
flag that 20 products currently carry. Square matters: the 5-pack covers
(`things-in-songs-5pack.png`, `around-the-world-and-beyond.png`) are 640×640 and
the tile grid crops to square. Name it for the product, not the pack it was
cloned from.

Before this, an image change meant hand-editing six places on the product page
and re-running two other tools, which is why `p168` shipped showing the
**Decades 5-Pack's** cover: its tiles had the right artwork and its page had the
template's. `p165` Around The World and `p166` Party Starter had the same
Decades cover, and `p167` Punk Rock went live under Golden Oldies'. All four are
corrected. The zoom link is handled too — it points at a `-full` variant where
one exists, so a swap does not flatten a product's high-res zoom.

---

## 3. The game files

**`_content/trivia-shows/`** — 17 files, one per show, plus a README.

Each is a saved game in the Trivia Show Maker's own format. To produce what the
customer downloads:

1. Open **`/trivia-show-maker/`** (or `trivia-show-maker/index.html` locally).
   No build, no login.
2. Click **📂 Open** and pick the `.tgp.json`.
3. Export the PDFs — host packet, team answer sheets, score sheet.
4. Upload those to the LemonSqueezy product as the deliverable.

**Never commit an exported host packet.** This repo is public and served by
GitHub Pages, so committing one publishes the answers to a product you sell.

Every show is 5 rounds × 10 questions plus a tiebreaker. Round 4 is always
double points, so a table that starts badly can still win — which keeps the
room in it to the last round.

---

## 4. Order of operations

```
1.  LemonSqueezy: create the 20 new products, upload PDFs + images
2.  LemonSqueezy: reprice the 51 existing products
3.  Fill NEW_CHECKOUT_URL in _export/lemonsqueezy/checkout-links.csv and
    send it back, OR paste each URL into assets/js/ls-links.js by hand.
    Importing the sheet:  node _tools/ls-link-sheet.js --import <csv> --write
4.  node _tools/set-usd-price.js pNN <price>        # once per repriced product
5.  STOP — fix every "WARN: $X still in the copy" it prints, by hand
6.  node _tools/check-value-stacks.js --write    # rebuilds the three
    #   club value stacks from the new single price, then prints the exact
    #   set-usd-price commands to align each compare-at. Run those too.
7.  Set "publish": true in _tools/new-products.json for the 20
8.  node _tools/new-product.js --write --publish --only p169,...,p188
9.  node _tools/add-cross-sell.js --write
    node _tools/add-price-ladder.js --write
    node _tools/build-song-library.js --write
    node _tools/add-jsonld.js --write
    node _tools/bake-buy-links.js --write
    node _tools/build-campaign-pages.js --write
10. node _tools/add-store-tile.js pNN --write       # once per published product
11. Add each new URL to sitemap.xml by hand
12. node _tools/canonicalize-trailing-slash.js --write
13. node _tools/check-links.js                      # 0 broken is the bar
14. node _tools/check-trivia-shows.js               # exit 0 is the bar
```

Steps 4–6 are where money goes wrong. Do not skip step 5.

### The checkout-link round trip (step 3)

Rebuilding every product means all 94 checkout URLs change, and they all have to
come back into `ls-links.js`. Pasting them one at a time is precisely the job
where one line lands in the wrong row and a buy button quietly charges for a
different product.

```bash
node _tools/ls-link-sheet.js                        # writes the blank sheet
node _tools/ls-link-sheet.js --import <csv>         # dry run — shows what changes
node _tools/ls-link-sheet.js --import <csv> --write
node _tools/bake-buy-links.js --write               # into every buy button
```

`_export/lemonsqueezy/checkout-links.csv` has one row per product, keyed by id,
with its name, current price, page and existing URL as context, and one empty
**NEW_CHECKOUT_URL** column to fill. Fill only the rows you rebuild; leave the
rest blank and they are untouched.

The import refuses the whole file rather than writing a bad row. It rejects
anything that is not a LemonSqueezy checkout URL (pasting the dashboard's
product page instead of the Share link is the easy mistake), and it rejects the
same URL appearing on two products — whether twice in your sheet or against a
product already wired to it. That is the mis-paste that charges for the wrong
thing, and it is caught before anything is written, never in a receipt.

---

## 5. Images

**`_export/lemonsqueezy/`** (sent as a zip) — all 94 product images as **JPEG**,
named `pNN-product-name.jpg` so they sort next to the listing you are editing.
Regenerate with `node _tools/export-ls-images.js`.

LemonSqueezy will not take WebP. If you right-click an image on the live site
you will get WebP, because the page serves it through a `<picture>` element —
use the zip instead.

`MANIFEST.md` flags **20 products whose source art is under 600px**. Ten of
those are only 300×200 and genuinely need new artwork: p116, p127, p132, p133,
p138, p141, p143, p144, p145, p167.

The 20 new trivia shows have generated covers — typographic, in your brass,
seasonal orange/green, school blue and pop-culture red. They are honest
placeholders; replacing one is a drop-in at the same filename.

---

## 6. Fixed along the way

- **The "On Sale" tile banner never worked.** Weebly's JS added `sale-active`
  at runtime; the static export kept the markup and lost the JS, so no product
  ever showed a banner — not even the three clubs that genuinely are on sale.
  Now fixed in `set-usd-price.js`, so your rotating sales will actually be
  visible.
- **Punk Rock (p167) was wearing Golden Oldies' artwork** — main image, alt
  text and og:image. Its own art had been sitting unused since launch.
- **Five stale or false prices**, including `llms.txt` quoting the Gold Club at
  $235.50 to answer engines, and a hero heading promising game shows "for less
  than $15 per game" when the floor was $15.66.
- **A $-in-replacement bug across nine tools.** A description containing a
  dollar amount was silently mangled — that is what left
  "50 credits for </title>3.98" in a live meta tag.
- **`new-product.js` used to rewrite every product on every run**, which is how
  p167 got clobbered. Now skips existing pages unless `--force`, and `--only`
  scopes a run to named ids.

---

## 7. Still open

1. ~~**Whether $12.49 is final**~~ — **settled: $11.99**, 4 Sep 2026.

   $12.49 clears the left-digit boundary at $12 for eight cents more than
   $11.99 gets, and buys nothing for it: at ~33 orders a month the difference
   between the two is about $250 a year, which is inside the noise of a single
   good week. $11.99 keeps the "under twelve dollars" reading, keeps the .99
   ending the whole catalogue already uses, and — the part that actually
   matters — leaves the *next* increase available. A $10.99 → $11.99 → $12.99
   ladder over two years is two increases nobody notices; one jump to $12.49
   spends the same headroom in a single move and lands on an ending that
   matches nothing else on the site.

   Everything downstream assumes $11.99; changing it means redoing the ladder
   and the value stacks.
2. **Consult Hour (p137)** — the checkout works but the page is noindex, absent
   from the sitemap and linked from nowhere. Surface it or retire it.
3. **Triv101 Premium (p7) is the one product still priced in CAD** — CA$22.00,
   and it is fully dormant: noindex, no sitemap entry, no tile, no checkout.
   Since you are rebuilding everything anyway, either give it a USD price or
   skip it. If you build it: **$12.99**. That is above Sporcle's $9.99
   downloadable question bank and above a $11.99 print-and-play show, which is
   defensible for 1,350 questions, but it has no sales history to justify the
   ~$16 that CA$22.00 converts to. Skipping it this weekend costs nothing —
   it earns nothing today.
4. **Party Starter 4-Pack (p166) is listed in the sale roster below but is not
   live** — noindex, no tile, no checkout, buy button pointing at
   `/contact.html`. Either launch it this weekend or drop it from the roster;
   right now it is a row in a plan for a product nobody can buy.
5. **New artwork.** 20 products have no source image wider than 600px, so they
   will look soft on a LemonSqueezy listing. Worst first: `p126` Video Games
   3-Pack ($63.99, 410px) and the three $32.99 seasonal 2-packs `p33`/`p53`/
   `p135` (~550px). **Four of the eight rotating sale games are among them** —
   `p132` Road Trip!, `p143` Motown, `p144` The 80s and `p167` Punk Rock are all
   300px. Putting a game on sale sends traffic to its image; those four are
   the ones to re-shoot first. Full list in
   `_export/lemonsqueezy/MANIFEST.md`.
6. **Next shows to build**, in order: New Year's Eve (every venue runs
   something and nobody has a show ready), then St. Patrick's Day, where you
   already sell two products so the demand is proven.

---

## 8. What shows "ON SALE" — the roster

Two different mechanisms, and the distinction matters legally as well as
practically.

**A value-stack compare-at is permanent and legitimate.** "These items cost
$62.45 bought separately; the pack is $41.99" is true by arithmetic, so a
bundle can carry it forever. That is how the clubs already work.

**A genuine former price is time-boxed.** A single game marked down from
$11.99 to $8.99 must actually return to $11.99. Rotate the roster; never leave
the same games marked down indefinitely, because a "was" price nobody ever
pays is a fictitious former-price claim.

### Always on sale — 16 bundles, value-stack compare-at

All figures below assume singles at **$11.99**. The three club rows include the
**$10.99 Handbook** in the stack, because it genuinely ships with them.

| id | product | was (sum of parts) | sells at | saving | per game |
|---|---|---|---|---|---|
| `p128` | One Hit Wonders 2-Pack | $23.98 | $17.99 | $5.99 (25%) | $9.00 |
| `p127` | Movie Soundtracks 3-Pack | $35.97 | $25.99 | $9.98 (28%) | $8.66 |
| `p108` | Entertainer's Pack | $35.97 | $25.99 | $9.98 (28%) | $8.66 |
| `p162` | Word Games 3-Pack | $35.97 | $25.99 | $9.98 (28%) | $8.66 |
| `p165` | Around The World 4-Pack | $47.96 | $32.49 | $15.47 (32%) | $8.12 |
| `p166` | Party Starter 4-Pack | $47.96 | $34.00 | $13.96 (29%) | $8.50 |
| `p147` | Decades 5-Pack | $59.95 | $41.99 | $17.96 (30%) | $8.40 |
| `p168` | Things In Songs 5-Pack | $59.95 | $41.99 | $17.96 (30%) | $8.40 |
| `p101` | The Year Was 5-Pack | $59.95 | $41.99 | $17.96 (30%) | $8.40 |
| `p155` | Holidays 6-Pack | $71.94 | $48.99 | $22.95 (32%) | $8.17 |
| `p131` | Bronze — 10 games + Day Pass + Handbook | $137.88 | $79.00 | $58.88 (43%) | $7.90 |
| `p130` | Silver — 25 games + 1 month + Handbook | $334.74 | $193.75 | $140.99 (42%) | $7.75 |
| `p112` | Gold — 50 games + 1 year + Handbook | $726.49 | $415.50 | $310.99 (43%) | n/a |
| `p176` | General Knowledge 5-Pack | $59.95 | $44.99 | $14.96 (25%) | $9.00 |
| `p188` | Pop Culture 5-Pack | $59.95 | $44.99 | $14.96 (25%) | $9.00 |
| `p182` | Classroom 5-Pack | $44.95 | $34.99 | $9.96 (22%) | $7.00 |

### Rotating — 8 singles at $8.99, from $11.99 (25% off)

**$8.99, not $9.00 or $9.99 — settled 4 Sep 2026.** All three were on the
table; $8.99 wins on three counts and loses on none:

| | left digit | badge (Rule of 100) | ending |
|---|---|---|---|
| **$8.99** | **8** — reads a whole digit cheaper | **25% OFF** | .99, like everything else |
| $9.00 | 9 | 25% OFF | round — reads considered, not discounted |
| $9.99 | 9 | 17% OFF — a weak flash | .99 |

$9.99 is the one to actually reject: it only reads as 17% off, which is not
enough to look like a sale, and it sits at the same left digit as $9.00 without
being cheaper. The ladder holds at all three — the cheapest 3-pack is $8.66 a
game, still under an $8.99 single — so ladder integrity does not decide it.

Chosen as four proven sellers, one seasonal, and three that need visibility.
Spread across different bundles on purpose, so no single pack loses most of its
components to the sale at once.

| id | game | why |
|---|---|---|
| `p97` | Halloween Party | seasonal — October is the only month it has |
| `p62` | Golden Oldies | top-10 seller, and two versions included |
| `p144` | The 80s | top-10 seller |
| `p81` | One Hit Wonders | top-10 seller |
| `p132` | Road Trip! | top-10 seller |
| `p167` | Punk Rock | newest game, no sales history yet |
| `p143` | Motown | broad appeal, low visibility |
| `p160` | 90s R&B | low visibility |

**Rotate monthly.** Swap 4–6 of the eight each month and the store always has
something on sale without any single game being permanently marked down.

**`p103` Christmas Party is deliberately excluded.** It anchors the "a single
game" rung of the price-ladder table on `trivia-store.html`, so discounting it
makes the whole ladder read from $8.99 and the 3-pack's $8.66 then looks like a
4% saving instead of a 31% one. It is also worth full price in November.

### Does $8.99 break the ladder? No — checked

| rung | per game | vs a $8.99 sale single |
|---|---|---|
| 3-pack (cheapest) | $8.66 | still cheaper |
| 5-pack | $8.40 | still cheaper |
| 6-pack | $8.17 | still cheaper |
| Bronze | $7.90 | still cheaper |
| Silver | $7.75 | still cheaper |

And buying in bulk still wins outright: three sale singles cost $26.97 against
the 3-pack's $25.99; five cost $44.95 against the 5-pack's $41.99.

### The three rungs that were nearly missed

These were written up here but were **not** in the callsheet's proposal list, so
a rebuild driven off that sheet would have put all three back at their old
prices. They are in it now.

- **`p108` and `p162` both work out at $9.00 a game**, which is *above* a $8.99
  sale single. During a sale those two packs offer no reason to exist. Both move
  to **$25.99**, matching `p127`, and the whole 3-pack rung lands on $8.66.
- **`p128` at $9.49 a game** is the catalogue's weakest rung. **$17.99** brings
  it to $9.00 — level with a full-price single's best pack alternative, which is
  as good as a 2-pack gets.
- Both also pick up the **.99 ending** the rest of the catalogue uses; $27.00
  and $18.99 were the only round-ish outliers in the bundle range.

### How the banner actually appears

The "ON SALE" flash only renders when `set-usd-price.js` is given **two**
prices — regular then sale:

```bash
node _tools/set-usd-price.js p97 11.99 8.99     # on sale
node _tools/set-usd-price.js p97 11.99          # sale over
```

Omitting the second argument is how a sale ends: it strips the ribbon from the
product page and the banner from every listing tile.

That banner did not work at all until this branch. **Three separate breakages,
all fixed:**

1. Weebly's own JS added the `sale-active` class at runtime; the static export
   kept the markup and lost the JS, so the wrapper sat at `display:none`
   forever. Not one product had shown a banner since the migration, including
   the three clubs that genuinely were on sale the whole time.
2. **45 of 97 product pages had no sale markup at all** — `class=""` on the
   price area and no ribbon — because Weebly only emitted it for products that
   were on sale the day the site was scraped. On those, a sale price was
   written into the HTML and then hidden by the stylesheet, so the shopper read
   the regular price while checkout took the sale one.
3. **39 of 149 product tiles had no banner wrapper**, 18 of them on
   `store/c11/musicdoboff/` — which is where every regular music bingo game is
   listed, and therefore where seven of the eight rotating sale games appear.

`add-sale-banner.js` backfilled all of it in the hidden, off state, and
`set-usd-price.js` now inserts either piece if it ever meets a page or tile
without it. Nothing changes visually until a sale price is actually set.

### What the flash says — the Rule of 100

Under $100 a percentage reads bigger than the dollars; over $100 the dollars
read bigger than the percentage. `$3.00 off` a $11.99 game is nothing; `25%
OFF` is a deal. `$310.99 OFF` the Gold Club is a lot; `43%` is not. So
`set-usd-price.js` writes the badge itself:

| product | regular | sale | flash |
|---|---|---|---|
| a single game | $11.99 | $8.99 | **25% OFF** |
| Decades 5-Pack | $59.95 | $41.99 | **30% OFF** |
| Gold Club | $726.49 | $415.50 | **$310.99 OFF** |

No argument needed — it derives the wording from the two prices.

### Give the discount a reason

A markdown with no stated reason invites the shopper to conclude the regular
price was never real, which is the opposite of what a sale is for. Every
rotating sale should carry a one-line why, in the promo copy and the campaign
page:

- **Seasonal** — "Halloween Party, 25% off through October 31."
- **New release** — "Punk Rock is new this month — 25% off while it settles in."
- **Anniversary / milestone** — "Fifty games in the library. Eight of them are
  25% off this week."

Any of the three is fine. What is not fine is a bare "25% OFF" running
month after month on the same eight games: that is a fictitious former-price
claim, and it is also the fastest way to teach regulars never to pay $11.99.
