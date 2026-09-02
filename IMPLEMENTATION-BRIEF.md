# Implementation brief — fall pricing + 20 new products

Written 2 Sept 2026. Everything below is **on the branch
`claude/fall-pricing-premade-games-zpcjsj`, not on `main`**, and nothing is
live: every new product is staged and every reprice is display-only pending
LemonSqueezy.

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
| `p169` | General Knowledge Night One | $12.49 | `/store/p169/triviashowgkone.html` |
| `p170` | General Knowledge Night Two | $12.49 | `/store/p170/triviashowgktwo.html` |
| `p171` | General Knowledge Night Three | $12.49 | `/store/p171/triviashowgkthree.html` |
| `p172` | General Knowledge Night Four | $12.49 | `/store/p172/triviashowgkfour.html` |
| `p173` | General Knowledge Night Five | $12.49 | `/store/p173/triviashowgkfive.html` |
| `p174` | Halloween Trivia Night | $12.49 | `/store/p174/triviashowhalloween.html` |
| `p175` | Christmas Trivia Night | $12.49 | `/store/p175/triviashowchristmas.html` |
| `p176` | General Knowledge Trivia Shows | $44.99 | `/store/p176/triviashowgk5pack.html` |
| `p177` | Classroom Trivia: Math | $8.99 | `/store/p177/triviashowclassroommath.html` |
| `p178` | Classroom Trivia: Science | $8.99 | `/store/p178/triviashowclassroomscience.html` |
| `p179` | Classroom Trivia: English and Language Arts | $8.99 | `/store/p179/triviashowclassroomenglish.html` |
| `p180` | Classroom Trivia: History and Social Studies | $8.99 | `/store/p180/triviashowclassroomhistory.html` |
| `p181` | Classroom Trivia: Geography | $8.99 | `/store/p181/triviashowclassroomgeography.html` |
| `p182` | Classroom Trivia 5-Pack | $34.99 | `/store/p182/triviashowclassroom5pack.html` |
| `p183` | Music Trivia Night | $12.49 | `/store/p183/triviashowmusic.html` |
| `p184` | Television Trivia Night | $12.49 | `/store/p184/triviashowtv.html` |
| `p185` | Movies Trivia Night | $12.49 | `/store/p185/triviashowmovies.html` |
| `p186` | Sports Trivia Night | $12.49 | `/store/p186/triviashowsports.html` |
| `p187` | The 80s and 90s Trivia Night | $12.49 | `/store/p187/triviashowrewind.html` |
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

### B. Forty-eight repricings

| what | from | to | per game |
|---|---|---|---|
| 42 music bingo singles | $10.99 | **$12.49** | — |
| 3-pack (p127) | $23.99 | **$25.99** | $8.66 |
| 5-packs (p147, p168, p101) | $39.99 | **$41.99** | $8.40 |
| Holidays 6-pack (p155) | $46.99 | **$48.99** | $8.17 |
| Silver Club (p130) | $198.75 | **$193.75** | $7.75 |
| Bronze (p131), Gold (p112) | — | **hold** | $7.90 / n/a |

That descends properly for the first time — 8.66 → 8.40 → 8.17 → 7.90 → 7.75.
Revenue per order goes **up** on four of five rungs; Silver is the only cut,
and it is what buys a truthful "buy more, pay less per game" claim.

**Raising the single price also makes every club tier look better for free**,
because their compare-at prices are built from it:

| tier | value stack becomes | still sells at | new saving |
|---|---|---|---|
| Bronze | 10 × $12.49 + $6.99 = **$131.89** | $79.00 | **$52.89** (was $37.89) |
| Silver | 25 × $12.49 + $24 = **$336.25** | $193.75 | **$142.50** |
| Gold | 50 × $12.49 + $116 = **$740.50** | $415.50 | **$325.00** |

Those three paragraphs are hand-written prose that no tool regenerates. They
must be edited by hand after the reprice.

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
2.  LemonSqueezy: reprice the 48 existing products
3.  Paste each new checkout URL into assets/js/ls-links.js
4.  node _tools/set-usd-price.js pNN <price>        # once per repriced product
5.  STOP — fix every "WARN: $X still in the copy" it prints, by hand
6.  Hand-edit the three club value stacks (section 2B above)
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

1. **Whether $12.49 is final** for music bingo singles. Everything downstream
   assumes it; changing it means redoing the ladder and the value stacks.
2. **Consult Hour (p137)** — the checkout works but the page is noindex, absent
   from the sitemap and linked from nowhere. Surface it or retire it.
3. **New artwork** for the ten products at 300×200.
4. **Next shows to build**, in order: New Year's Eve (every venue runs
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
$12.49 to $8.99 must actually return to $12.49. Rotate the roster; never leave
the same games marked down indefinitely, because a "was" price nobody ever
pays is a fictitious former-price claim.

### Always on sale — 16 bundles, value-stack compare-at

| id | product | was (sum of parts) | sells at | saving | per game |
|---|---|---|---|---|---|
| `p128` | One Hit Wonders 2-Pack | $24.98 | $18.99 | $5.99 (24%) | $9.49 |
| `p127` | Movie Soundtracks 3-Pack | $37.47 | $25.99 | $11.48 (31%) | $8.66 |
| `p108` | Entertainer's Pack | $37.47 | $27.00 | $10.47 (28%) | $9.00 |
| `p162` | Word Games 3-Pack | $37.47 | $27.00 | $10.47 (28%) | $9.00 |
| `p165` | Around The World 4-Pack | $49.96 | $32.49 | $17.47 (35%) | $8.12 |
| `p166` | Party Starter 4-Pack | $49.96 | $34.00 | $15.96 (32%) | $8.50 |
| `p147` | Decades 5-Pack | $62.45 | $41.99 | $20.46 (33%) | $8.40 |
| `p168` | Things In Songs 5-Pack | $62.45 | $41.99 | $20.46 (33%) | $8.40 |
| `p101` | The Year Was 5-Pack | $62.45 | $41.99 | $20.46 (33%) | $8.40 |
| `p155` | Holidays 6-Pack | $74.94 | $48.99 | $25.95 (35%) | $8.17 |
| `p131` | Bronze — 10 games + Day Pass | $131.89 | $79.00 | $52.89 (40%) | $7.90 |
| `p130` | Silver — 25 games + 1 month | $336.25 | $193.75 | $142.50 (42%) | $7.75 |
| `p112` | Gold — 50 games + 1 year | $740.50 | $415.50 | $325.00 (44%) | n/a |
| `p176` | General Knowledge 5-Pack | $62.45 | $44.99 | $17.46 (28%) | $9.00 |
| `p188` | Pop Culture 5-Pack | $62.45 | $44.99 | $17.46 (28%) | $9.00 |
| `p182` | Classroom 5-Pack | $44.95 | $34.99 | $9.96 (22%) | $7.00 |

### Rotating — 8 singles at $8.99, from $12.49 (28% off)

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

### Two rungs to fix while you are in there

- **`p108` and `p162` both work out at $9.00 a game**, which is *above* a $8.99
  sale single. During a sale those two packs offer no reason to exist. Move
  both to **$25.99**, matching `p127`, and the whole 3-pack rung lands at $8.66.
- **`p128` at $9.49 a game** is the weakest rung in the catalogue. **$17.99**
  would bring it to $9.00. Low priority — it is a 2-pack, and 2-packs are
  always the worst value per unit.

### How the banner actually appears

The "ON SALE" flash only renders when `set-usd-price.js` is given **two**
prices — regular then sale:

```bash
node _tools/set-usd-price.js p97 12.49 8.99     # on sale
node _tools/set-usd-price.js p97 12.49          # sale over
```

Omitting the second argument is how a sale ends: it strips the ribbon from the
product page and the banner from every listing tile.

That banner did not work at all until this branch — Weebly's own JS used to add
the `sale-active` class at runtime, and the static export kept the markup but
lost the JS. Not one product has shown a banner since the migration, including
the three clubs that genuinely were on sale the whole time.
