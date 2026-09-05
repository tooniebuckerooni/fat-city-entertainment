# Sept 10 2026 — sale handover, bundle compare-ats, artwork, copy pass

Back 2 School expires **10 Sept** (`END` in `assets/js/promo-bar.js`). That is the
natural date to switch the store from one sitewide code to a rotating,
per-product sale — and to do the four other jobs that have been queued behind it.

Everything here is on `claude/fall-pricing-premade-games-zpcjsj`, which is
currently identical to `main`.

---

## The one rule

**Change the price in LemonSqueezy first. Then the site.**

The site only *displays* prices; LemonSqueezy *charges* them. A page showing
**less** than checkout takes is a bait-and-switch and the failure worth avoiding
above all others. A page showing **more** costs a little revenue and no trust —
that is the safe direction, and it is the one we used during the $11.99 rollout.

Every phase below is ordered so the site never leads the dashboard.

---

## Phase 0 — the day before (≈20 min, no dependencies)

Do this on the 9th so the 10th is only execution.

1. **Confirm the promo really expires.** `promo-bar.js` has
   `var END = new Date(2026, 8, 10)` — month is zero-indexed, so that is
   **10 Sept 2026**. On the 11th, load any page in a fresh browser profile and
   confirm no popup, and that a buy link no longer carries
   `checkout[discount_code]`.
2. **Decide the discount's reason.** A markdown with no stated why invites the
   shopper to conclude the regular price was never real. Pick one and use it in
   the promo copy and the campaign page: *seasonal* ("Halloween Party, 25% off
   through October 31"), *new release*, or *milestone*.
3. **Decide `p81`.** One Hit Wonders is on the $8.99 list, and the One Hit
   Wonders 2-Pack works out to **$9.00 a game** — so while that sale runs the
   pack has no per-game argument. Either drop `p81` from the roster, or accept
   the pack goes quiet for those weeks. No wrong answer; it just needs choosing.
4. **Decide `p165`.** Around The World 4-Pack is $32.49 = **$8.12/game**, which
   undercuts every 5-pack ($8.40) and the 6-pack ($8.17). It is the only reason
   store copy still cannot claim "buy more, pay less per game". **$33.99**
   ($8.50/game) makes the catalogue monotonic end to end and matches the Party
   Starter 4-Pack. If you want it, change it in LemonSqueezy during Phase 2.

---

## Phase 1 — end the sitewide promo (10 Sept, ≈10 min)

The popup self-expires, but the discount **code** does not — it lives in
LemonSqueezy and will keep working for anyone who has it.

1. In LemonSqueezy, **expire or delete the `BCK2SKL` discount**.
   Confirm its scope while you are there: this store is shared with the Bingo
   Card Generator, so a store-wide code also discounts Generator
   *subscriptions* — recurring revenue given away by accident.
2. Leave `promo-bar.js` alone. It self-expires and `window.FCE_PROMO` is set
   unconditionally, so nothing else depends on it.

> You asked to lose the pop-up for the next sale. The rotating per-product sale
> below needs no popup at all — the price, the strikethrough and the banner do
> the work on the page itself.

---

## Phase 2 — the eight singles to $8.99 (≈30 min)

All eight are already at $11.99, wired, and verified. At $11.99 → $8.99 the
badge reads **25% OFF** (Rule of 100: a percentage under $100, dollars over).

| id | game | why it's on the list |
|---|---|---|
| `p97` | Halloween Party | seasonal — October is its only month |
| `p62` | Golden Oldies | top-10 seller, two versions included |
| `p144` | The 80s | top-10 seller |
| `p81` | One Hit Wonders | top-10 seller — see Phase 0.3 |
| `p132` | Road Trip! | top-10 seller |
| `p167` | Punk Rock | newest game, no sales history |
| `p143` | Motown | broad appeal, low visibility |
| `p160` | 90s R&B | low visibility |

**`p103` Christmas Party stays out deliberately** — it anchors the "a single
game" rung of the price ladder, so discounting it makes the whole table read
from $8.99 and the 3-pack's $8.66 then looks like a 4% saving instead of 28%.
It is also worth full price in November.

**Steps**

1. **LemonSqueezy:** set a sale price of **$8.99** on each of the eight.
2. Then, here:
   ```bash
   for p in p97 p62 p144 p81 p132 p167 p143 p160; do
     node _tools/set-usd-price.js $p 11.99 8.99
   done
   ```
3. **Read the output.** Fix any `WARN: $X still written into the copy` by hand
   at the line it names before going further — the bake tools read those pages.
4. Re-bake (Phase 6).

**Ending it later** is the same command without the second price:
`node _tools/set-usd-price.js p97 11.99`. Change LemonSqueezy first, as always.
A "was" price that never returns is a fictitious former-price claim — rotate 4–6
of the eight each month rather than leaving the same games marked down forever.

---

## Phase 3 — make the packs look like the deals they are (≈45 min)

**Today 13 of the 16 roster bundles show a flat price.** Only the three clubs
carry a compare-at. Every one of the others is a genuine 25–32% saving that the
page simply does not show.

| id | shows now | should show | saving |
|---|---|---|---|
| `p128` One Hit Wonders 2-Pack | $17.99 | ~~$23.98~~ $17.99 | 25% |
| `p127` Movie Soundtracks 3-Pack | $25.99 | ~~$35.97~~ $25.99 | 28% |
| `p108` Entertainer's 3-Pack | $25.99 | ~~$35.97~~ $25.99 | 28% |
| `p162` Word Games 3-Pack | $25.99 | ~~$35.97~~ $25.99 | 28% |
| `p165` Around The World 4-Pack | $32.49 | ~~$47.96~~ $32.49 | 32% |
| `p166` Party Starter 4-Pack | $34.00 | ~~$47.96~~ $34.00 | 29% |
| `p147` Decades 5-Pack | $41.99 | ~~$59.95~~ $41.99 | 30% |
| `p168` Things In Songs 5-Pack | $41.99 | ~~$59.95~~ $41.99 | 30% |
| `p101` The Year Was 5-Pack | $41.99 | ~~$59.95~~ $41.99 | 30% |
| `p155` Holidays 6-Pack | $48.99 | ~~$71.94~~ $48.99 | 32% |

### The condition — read this before doing it

A struck-through number is only legitimate if **the page says where it comes
from**. The clubs have their "Quick math" paragraph; that is what makes their
compare-at an arithmetic claim rather than a former price the product never had.

I checked all ten. **Only `p165` and `p166` currently have that sentence**
("Buying all four separately costs $47.96"). The other eight have nothing, so
adding a strikethrough to them today would be a fictitious former-price claim —
FTC territory in the US, Competition Act in Canada.

### Steps

1. **`p165` and `p166` can go immediately** — the arithmetic is already on the
   page. No LemonSqueezy change needed: the compare-at is a display price, not a
   charge.
   ```bash
   node _tools/set-usd-price.js p165 47.96 32.49
   node _tools/set-usd-price.js p166 47.96 34.00
   ```
2. **The other eight need one sentence added first.** Extend the
   `BUNDLE_PROSE` map in `_tools/check-value-stacks.js` to cover them, so the
   sentence is derived from the live single price and re-checked weekly instead
   of going stale the way every hand-written price on this site has. Then:
   ```bash
   node _tools/check-value-stacks.js --write   # writes the sentence
   # then the compare-at for each, e.g.
   node _tools/set-usd-price.js p147 59.95 41.99
   ```
3. Re-bake (Phase 6).

**Ask me to do step 2** — it is the one piece here that is code rather than
clicks, and it is the highest-leverage merchandising change left: eight live
products going from "full price" to a visible, true 25–32% saving.

---

## Phase 4 — artwork (ongoing, not blocking)

20 products have no source image wider than 600px, so they look soft on a
LemonSqueezy listing and on a retina tile. **Four of them are on the $8.99 sale
list** — and a sale sends traffic straight to the image, so those come first.

| priority | id | source | price | product |
|---|---|---|---|---|
| **1** | `p132` | 300px | $11.99 | Road Trip! — *on sale* |
| **1** | `p143` | 300px | $11.99 | Motown — *on sale* |
| **1** | `p144` | 300px | $11.99 | The 80s — *on sale* |
| **1** | `p167` | 300px | $11.99 | Punk Rock — *on sale* |
| **2** | `p126` | 410px | $63.99 | "Video Games" Trivia 3-Pack — most expensive weak image |
| **2** | `p33` | 572px | $32.99 | Halloween Party Trivia 2-Pack |
| **2** | `p53` | 542px | $32.99 | St. Patrick's Day Trivia 2-Pack |
| **2** | `p135` | 541px | $32.99 | Valentine's Day Trivia 2-Pack |
| 3 | `p127` | 300px | $25.99 | Movie Soundtracks 3-Pack |
| 3 | `p13` | 502px | $23.49 | Sports Pub Night — "The Olympics" |
| 3 | `p115` `p116` `p133` `p138` `p141` `p145` `p146` | 300–576px | $11.99 | remaining singles |
| — | `p3` `p7` `p18` | 400–500px | — | not for sale / dormant |

Full list with dimensions: `_export/lemonsqueezy/MANIFEST.md`.

### Format

**Square PNG or JPEG, 1200 × 1200, under ~400KB.**

The tile grid crops square, so a non-square image gets cut. The site renders at
640 and `export-ls-images.js` resizes to fit 1600 for LemonSqueezy, so one
1200px square source serves every surface and clears the "narrower than 600px"
flag. Name the file for the product.

### How to get one to me

**A pasted image does not reach the sandbox** — it renders for me but produces no
file. What works:

- a **Drive / Dropbox link** (this is how the Things In Songs cover arrived), or
- any **direct URL**, or
- the **attach path** you used for `checkout-links.csv`.

A ChatGPT share link does **not** work: the image lives there as a
`sediment://` pointer behind your session and returns 401.

### The swap

```bash
node _tools/swap-product-image.js pNN <file-or-name> --write
node _tools/add-jsonld.js --write
```

One command covers the main `<img>`, the cloud-zoom link behind it (it prefers a
`-full` variant where one exists), every `<source srcset>` webp twin,
`og:image`, `twitter:image`, the alt text, the tile on every listing page, and
the `sitemap.xml` image entry — generating the `.webp` if missing.
`add-jsonld.js` finishes the structured data, which reads from the page.

---

## Phase 5 — the copy and CTA pass (the big one — do it last)

Measured across all 94 product pages:

- **Median 373 visible words**, max 424, min 131. Remarkably uniform — this is
  not a few bloated pages, it is the template.
- **~100 of those words are identical on nearly every page** — the delivery,
  spam-folder, link-expiry and guarantee block.
- **89 of 94 CTAs read "Buy & Download".** The three clubs instead say
  *"Get All 50 Games"*, *"Get All 25 Games"*, *"Get All 10 Games"* — which say
  what you get. That is the pattern worth spreading.
- No page has a duplicate or competing buy button.

### What I'd propose

1. **Target ~220–250 visible words.** Not a hard cap — a floor of clarity, with
   the trim coming out of repetition rather than substance.
2. **Shorten the shared block in one place.** `_tools/add-delivery-note.js`
   already owns it and already varies wording per product type (a booking is not
   a download; the T-shirt ships). Edit the note there and re-run — no page gets
   hand-edited.
3. **Order for the scanner.** Price → what's in the box → CTA, before any
   delivery or guarantee text. Today the guarantee copy often sits between the
   description and the button.
4. **Make the CTA say what you get.** "Buy & Download" is fine but generic;
   *"Download All 5 Games"*, *"Get the 6-Pack"*, *"Download 250 Cards"* are
   specific and concrete — which is what makes a CTA feel attainable rather than
   like a commitment.
5. **Do it as a tool, not 94 edits.** Same rule as everywhere else on this site:
   a hand-edited page is a page that goes stale silently.

### Before starting

This is the pass most likely to change what converts, and it touches every page
in the catalogue. Two guardrails:

- **Do it after Phases 1–4 are live and settled**, so if orders move you know
  which change moved them.
- **Take the "before" numbers first** — GA4 `view_item` → `begin_checkout` rate
  for the 7 days to 10 Sept. At ~380 visits/month you will not get statistical
  significance, so treat it as a sanity check for "did something break", not as
  a test. Real revenue data still needs LemonSqueezy's own GA integration
  pointed at `G-LYMVV05F3X` — an owner dashboard step, not a repo change.

---

## Phase 6 — re-bake and verify (after any price change)

In this order:

```bash
node _tools/check-value-stacks.js --write     # club + bundle prose from the live single price
#   ...then run the set-usd-price.js commands it prints
node _tools/add-cross-sell.js --write
node _tools/add-price-ladder.js --write
node _tools/build-song-library.js --write
node _tools/add-jsonld.js --write             # after the library build, which strips fce:jsonld
node _tools/bake-buy-links.js --write
node _tools/build-campaign-pages.js --write
node _tools/canonicalize-trailing-slash.js --write
node _tools/sitemap-lastmod.js --write
```

Then every check must pass:

```bash
node _tools/check-links.js          # 0 broken refs is the bar
node _tools/check-value-stacks.js   # exit 0
node _tools/check-trivia-shows.js   # exit 0
node _tools/check-ls-links.js       # exit 0 — comments match the prices they instruct
node _tools/add-sale-banner.js      # 0 would change
node _tools/add-price-ladder.js --preview   # compare inversions against the before-picture
```

**Save the ladder `--preview` output before you start** as the before-picture.
Today it descends cleanly at every rung — 11.99 → 8.66 → 8.40 → 8.17 → 7.90 →
7.75, no inversion. Any *new* inversion means something went wrong.

Finally:

```bash
git push origin <branch>            # branch first
git push origin <branch>:main       # then live
```

Pages deploys in ~40 seconds. The sandbox cannot fetch the live site, so confirm
via the `pages-build-deployment` run for that exact SHA: `completed` + `success`.

---

## Rollback

Every price change is reversible with one command per product, and nothing here
touches the checkout itself:

```bash
node _tools/set-usd-price.js pNN 11.99        # ends a sale, restores the plain price
node _tools/set-usd-price.js p147 41.99       # drops a bundle compare-at
```

If a compare-at turns out to be wrong, remove it **before** fixing the copy —
a struck-through number with no explanation is the one state to avoid.

---

## What is already done (no action needed)

- All 42 singles, the 3-pack rung, the three 5-packs and the 6-pack are at their
  new prices in both places.
- The four downward moves — Silver $193.75, Entertainer's and Word Games $25.99,
  One Hit Wonders 2-Pack $17.99 — are live.
- Seven products launched: five GK nights, Halloween, and the GK 5-Pack, all in
  **Pre-made Trivia Shows**; only Halloween and the 5-Pack also on the storefront.
- Sale display fixed: false strikethroughs gone, the price paid now carries the
  emphasis in brass, and the image banner is legible over any artwork.
- `goldclubplaylists.html` is derived rather than hand-written.
- Four products had another product's cover; all corrected.
