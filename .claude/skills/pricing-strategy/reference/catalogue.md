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

| tier | charged | compare-at | per game |
|---|---|---|---|
| single game | $10.99 | — | $10.99 |
| 3-pack | $23.99 – $27.00 | — | $8.00 – $9.00 |
| 4-pack | $32.49 | — | $8.12 |
| 5-pack | $39.99 | — | $8.00 |
| "Holidays" 6-pack (p155) | $46.99 | — | **$7.83** ← best in the catalogue |
| Game Show Trivia 5-Pack | $87.99 | — | $17.60 |
| Starter Pack / Bronze (p131) | $79.00 | $116.89 | $7.90 ← inverted |
| Silver Club (p130) | $198.75 | $298.75 | $7.95 ← inverted |
| Gold Club (p112) | $415.50 | $665.50 | n/a — no fixed game count |

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

## The club value stacks — verbatim

These are the hand-written paragraphs that no tool regenerates. Each is one
`<p>` on its product page.

**Bronze / Starter Pack — `store/p131/BronzeClub.html:519`**
> $10.99 a game individually — $109.90 for all 10 — plus a $6.99 Bingo Card
> Generator 2.0 Day Pass. That's **$116.89** of value. In this pack, it's
> **$79.00** — save **$37.89** buying all 10 at once.

Plus a supporting line at `:529`: "*a $6.99 value*".

**Silver Club — `store/p130/SilverClub.html:521`**
> $10.99 a game individually — $274.75 for all 25 — plus a $24 Bingo Card
> Generator 2.0 Monthly license. That's **$298.75** of value. In the Silver
> Club, it's **$198.75** — save **$100** buying the pack.

**Gold Club — `store/p112/GoldClub.html:521`**
> $10.99 a game individually — $549.50 for all 50 — plus a $116 Bingo Card
> Generator 2.0 Annual license. That's **$665.50** of value. In the Gold Club,
> it's **$415.50** — save **$250** buying the pack.

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
