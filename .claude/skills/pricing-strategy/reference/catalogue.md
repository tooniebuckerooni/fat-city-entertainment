# Catalogue, ladder and checkout plumbing

A snapshot of the numbers as of 1 Sept 2026. **Prices change — verify against
the product pages before quoting any of these.** The authoritative read is
always `itemprop="price"` on `store/pNN/*.html`, or:

```bash
node _tools/add-price-ladder.js --preview   # every rung, price, per-game
node _tools/add-cross-sell.js --preview     # every bundle's rendered arithmetic
```

---

## The price ladder

**Current as of 5 Sept 2026, after the fall repricing.**

| tier | charged | compare-at | per game |
|---|---|---|---|
| single game | $11.99 | — | $11.99 |
| 2-pack (p128) | $17.99 | $23.98 | $9.00 |
| 3-pack (p127, p108, p162) | $25.99 | $35.97 | $8.66 |
| 4-pack (p165) | $32.49 | $47.96 | **$8.12** ← undercuts the 5- and 6-packs |
| 4-pack (p166, staged) | $34.00 | $47.96 | $8.50 |
| 5-pack (p147, p168, p101) | $41.99 | $59.95 | $8.40 |
| "Holidays" 6-pack (p155) | $48.99 | $71.94 | $8.17 |
| Game Show Trivia 5-Pack | $87.99 | — | $17.60 |
| Starter Pack / Bronze (p131) | $79.00 | $137.88 | $7.90 |
| Silver Club (p130) | $193.75 | $334.74 | $7.75 |
| Gold Club (p112) | $415.50 | $726.49 | n/a — no fixed game count |
| pre-made trivia show | $11.99 | — | — |
| classroom trivia show | $8.99 (one room) / $22.00 (school-wide) | — | — |

The seven-rung **ladder table on `trivia-store.html` now descends cleanly** for
the first time — 11.99 → 8.66 → 8.40 → 8.17 → 7.90 → 7.75, no inversion. The
catalogue as a whole does not: `p165` at $8.12 a game undercuts both the 5-packs
and the 6-pack, because 4-packs are not a rung in that table. So store copy
still may **not** claim "buy more, pay less per game"; it claims only that every
multi-game pack beats buying singles, which is true. `p165` → $33.99 ($8.50/game)
is the whole fix and is the owner's call.

Repriced 27 Aug 2026 on the owner's call: Starter Pack $89.00 → $79.00, and all
three 5-packs → $39.99. That fixed the two worst rungs (the 5-pack had been
$8.60/game against a 3-pack's $8.00, and the ten-game Starter Pack $8.90 — the
worst value of any multi-game tier, and the one pitched as the natural step up).

The two remaining inversions are small and known: closing them means roughly
**Bronze $77 and Silver $192**, about $2 and $7. Worth doing before a November
bundle push. It is a pricing decision for the owner, not something to paper over
in copy. See `HOLIDAY-PLAN.md`.

Pre-made trivia shows sit on their own rung ($17.60/game) — a different product
with a different cost structure. Don't fold them into the music-bingo per-game
comparison.

## The club value stacks — no longer hand-written

`_tools/check-value-stacks.js` owns these. It reads the single-game price off
p103, recomputes every figure, `--write` regenerates all three paragraphs, and
it prints the `set-usd-price.js` commands that realign each compare-at. Current
output (5 Sept 2026):

| tier | games × single | + licence | + Handbook | = value | sells | saves |
|---|---|---|---|---|---|---|
| Bronze | 10 × $11.99 = $119.90 | $6.99 | $10.99 | **$137.88** | $79.00 | $58.88 |
| Silver | 25 × $11.99 = $299.75 | $24.00 | $10.99 | **$334.74** | $193.75 | $140.99 |
| Gold | 50 × $11.99 = $599.50 | $116.00 | $10.99 | **$726.49** | $415.50 | $310.99 |

It also owns two 4-pack pages that state what their components cost bought
separately (`p165`, `p166` — 4 × the single price), and
**`goldclubplaylists.html`**, a standalone landing page carrying the whole club
comparison in a hand-written table: all three tier prices, all three
cost-per-game figures (licence backed out first), the three buy-button prices
and the single-game price quoted twice. That page is not a product page, so
`set-usd-price.js` never sees it and its stale-copy WARN never fires — every
figure on it went stale in the fall repricing and nothing caught it until the
owner asked. It is derived now.

Each stack has **four** numbers derived from the single-game price — unit price,
line total, value total, saving — plus one independently-set add-on price. A
single-game reprice invalidates all four in all three stacks. A **Bingo Card
Generator** reprice invalidates the add-on, the value total and the saving.

Line numbers shift — locate them with the grep in SKILL.md rather than trusting
these.

## Bundle membership

`_tools/add-cross-sell.js` holds the authoritative `BUNDLES` map. A component is
either a pid (its own page, so it gets a link and counts in the arithmetic) or a
plain string (a game sold only inside that bundle — named honestly, nothing to
link). Current bundles: p165, p168, p147, p128, p162, p127, p155, p101.

To answer "what breaks if I reprice pNN?", check whether pNN appears as a key
(it *is* a bundle) or a value (it is *in* one). Both directions change the
rendered arithmetic.

## LemonSqueezy plumbing

- **One store, two sites**: `bingocardgenerator.lemonsqueezy.com` serves both
  this catalogue and the Bingo Card Generator subscriptions. **Scope discount
  codes per-product** or a "sale" on bingo games silently discounts recurring
  subscription revenue.
- `assets/js/ls-links.js` maps `pNN` → checkout URL, with a human-readable
  comment carrying the product name and price. `set-usd-price.js` keeps that
  comment in sync; `bake-buy-links.js` bakes the URL into every button.
- Checkout is **one product per checkout** — LemonSqueezy's hosted checkout has
  no cart. That is why cross-sell has to happen on the page, before checkout,
  and why "add another item" is not an option.
- A product with no `ls-links.js` entry renders a hidden button plus a visible
  "contact us" note. That is the correct staged state.

## The promo mechanism

`assets/js/promo-bar.js`, injected sitewide by `_tools/add-promo-bar.js`. Four
constants define a promo:

```js
var CODE = "BCK2SKL";        // must exist in the LemonSqueezy dashboard
var COPY = "Back 2 School Sale";
var PCT  = "22%";
var END  = new Date(2026, 8, 10);   // local-time midnight; self-expires
```

Editing those four is the entire operation for a new code-based sale — never
hand-edit pages. Behaviour worth knowing:

- It renders a **one-time popup**, not a persistent bar, gated on
  `localStorage`. The old sitewide bar was `position: relative` while the mobile
  header nav is `position: fixed; top: 0`, so the bar sat on top of and
  completely covered the mobile hamburger menu for as long as any promo was
  live — which is close to always, since they roll one into the next.
- `window.FCE_PROMO` is set **unconditionally**, before the "seen" check, so the
  checkout discount does not depend on whether anyone saw or dismissed the
  popup.
- `ls-buy.js` appends `checkout[discount_code]` to every LemonSqueezy href at
  runtime. **This is JS-dependent**: `bake-buy-links.js` bakes a plain href, so
  a buyer with JS blocked reaches checkout without the code and pays full price.
  That is the central reason to prefer a real price change whenever the
  displayed price has to be the charged price.
- Letting `END` pass retires the promo automatically; the script costs nothing
  left in place.

## Revenue context

From `HOLIDAY-PLAN.md` (26 Aug 2026), the frame any pricing argument should sit
inside:

- Current: roughly **$500/month**, ~30–35 orders at a ~$15 average order.
- Goal: **$3,000–5,000/month by Christmas.**
- Volume alone needs ~200 orders/month. AOV alone needs a $91 average order.
  Realistically it needs both: **~65 orders at ~$46**.
- Moving one buyer from a $10.99 single to a $39.99 5-pack is a **3.6× order**
  and needs no new traffic. That is the fastest lever in the business, and it is
  a *merchandising and ladder* lever, not a discount lever.
- Digital goods: margin is effectively 100%, so a price cut is a straight
  revenue cut per order and must buy observable volume. At ~380 visits/month it
  cannot be observed.
- Subscriptions (~41 active) are the only revenue that persists past December —
  another reason not to let a store-wide code touch them.
