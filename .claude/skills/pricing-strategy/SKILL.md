---
name: pricing-strategy
description: Pricing discipline for the Fat City Entertainment store (static GitHub Pages site, LemonSqueezy checkout) — repricing a product, starting or ending a sale, choosing discount depth, designing or repairing the single/bundle/club price ladder, setting a new product's launch price, or auditing the site for stale or contradictory prices. Use this skill whenever money a customer sees or pays is in play, even when the request sounds casual — "put the Halloween pack on sale", "should we do Black Friday", "the Gold Club feels expensive", "drop singles to $8.99", "make a bundle offer for the email send", "the page says one price and checkout charged another", "is the ladder still right", "we need more revenue, cut prices". Prices here are charged by LemonSqueezy but *baked into HTML* by half a dozen build tools plus hand-written value-stack copy no tool owns, so a price change is a strict-order, multi-file operation. Reach for this skill BEFORE running set-usd-price.js or promo tooling, editing a product page, promo-bar.js, ls-links.js, or any body copy containing a dollar amount.
---

# Pricing at Fat City Entertainment

The store sells downloadable music bingo games, pre-made trivia shows, and
bundle/club tiers. The site is static files on GitHub Pages; **LemonSqueezy is
the merchant of record**. That split is the source of nearly every pricing
mistake this business has made, and it drives everything below.

## The one rule above all others

**Change the price in LemonSqueezy first. Then change the site.**

The site only *displays* prices. LemonSqueezy *charges* them. If they disagree,
one of two things happens:

- Site shows **more** than LS charges — you leave money on the table. Bad.
- Site shows **less** than LS charges — a customer clicks a $79.00 button and
  the checkout asks for $89.00. That is a bait-and-switch from the buyer's
  point of view, it is the failure mode that loses the sale *and* the trust,
  and it has actually happened here (see `POST-LAUNCH.md`, the p140 Zoom Party
  bug: the page displayed a struck-through CA$375 while LS charged $295 USD).

So the ordering is not a nicety. If you cannot change LemonSqueezy right now —
an agent in this sandbox cannot; the dashboard is the owner's browser — then
**do not change the site either.** Stage the work, hand the owner the LS step,
and run the tools once they confirm. Half a repricing is worse than none.

## The repricing runbook

Once LemonSqueezy is updated, from the repo root:

```bash
# 1. Product page + every listing block + the ls-links.js reference comment
node _tools/set-usd-price.js pNN <regular> [<sale>]
#    e.g. plain reprice:   node _tools/set-usd-price.js p131 79.00
#         put on sale:     node _tools/set-usd-price.js p131 89.00 79.00
#         end the sale:    node _tools/set-usd-price.js p131 89.00

# 2. STOP. Read the output. Fix by hand any "WARN: $X still written into the
#    copy at <file>:<line>" — see category 3 under "Where prices live" below.
#    Do this BEFORE step 3: those tools read the page you just edited.

# 3. Re-bake every derived price, in this order
node _tools/add-cross-sell.js --write
node _tools/add-price-ladder.js --write
node _tools/build-song-library.js --write
node _tools/add-jsonld.js --write      # after the library build, which strips fce:jsonld
node _tools/bake-buy-links.js --write
node _tools/build-campaign-pages.js --write

# 4. Verify
node _tools/check-links.js             # 0 broken refs is the bar
```

`set-usd-price.js` takes the **regular** price first and the optional **sale**
price second, and refuses a sale price that isn't lower. Omitting the sale
argument is how a sale ends — it strips the "On Sale" ribbon from the product
page and the banner from every listing tile.

## Where prices live, and which ones bite

Three categories, in increasing order of danger.

**1. Tool-written, self-refreshing.** The product page's `itemprop="price"`,
the listing tiles, `ls-links.js` comments, JSON-LD `Offer`, baked buy hrefs.
`set-usd-price.js` and the step-3 tools own these. They are safe *provided the
tools are re-run*.

**2. Tool-written, baked from a source page.** Cross-sell blocks, the
`trivia-store.html` price ladder, campaign pages under `/go/`, and song-library
buy CTAs all read `itemprop="price"` off the destination product page **at build
time** and write the number into HTML. They are correct on the day they run and
wrong forever after until re-run. The weekly `site-health.yml` check catches
this within a week by dry-running each tool and opening a GitHub issue if any
would write — but a week is a long time to quote a price the checkout won't take.

**3. Hand-written prose. Nothing owns these. This is where the money is lost.**
The three club pages carry a value stack — "*$10.99 a game individually —
$109.90 for all 10 — plus a $6.99 Bingo Card Generator 2.0 Day Pass. That's
$116.89 of value. In this pack, it's $79.00 — save $37.89*" — that no tool can
regenerate, because it is an argument, not a field. A Bronze reprice from $89.00
to $79.00 once left "*it's $89.00 — save $27.89*" sitting in the copy. That is
why `set-usd-price.js` now prints a line-numbered `WARN` when an old amount
survives in the page. **Never dismiss that warning.**

To find hand-written prices anywhere in the store:

```bash
grep -rnE '\$[0-9,]+\.[0-9]{2}' --include='*.html' store/ trivia-store.html \
  | grep -vE 'fce-cross-sell|fce-ladder|wsite-com|&quot;|itemprop=' \
  | grep -iE 'value|save|individually|regularly|worth|normally|was |a game|each'
```

That currently returns six lines: the three club value stacks, the Bronze
page's "$6.99 value" note, and two bundle description lists. Run it before and
after a reprice — a line that changed, or one you didn't expect, is the bug.

## A single-game reprice cascades into every bundle

This is the part that is easy to miss and expensive to get wrong. **Each club
tier's compare-at price is derived from the single-game price**, not stored
independently:

| tier | charged | compare-at | how the compare-at is built | per game |
|---|---|---|---|---|
| Bronze / Starter Pack (p131) | $79.00 | $116.89 | 10 × $10.99 + $6.99 BCG Day Pass | $7.90 |
| Silver Club (p130) | $198.75 | $298.75 | 25 × $10.99 + $24 BCG Monthly | $7.95 |
| Gold Club (p112) | $415.50 | $665.50 | 50 × $10.99 + $116 BCG Annual | n/a |

Change the single-game price and **all three "of value" totals and all three
"save $X" figures become false at once**, along with the "$10.99 a game
individually" clause in each. None of them will be updated by any tool.

### Worked example: singles $10.99 → $11.99

| tier | old stack | new stack | old save | new save |
|---|---|---|---|---|
| Bronze | 10 × 10.99 + 6.99 = **$116.89** | 10 × 11.99 + 6.99 = **$126.89** | $37.89 | **$47.89** |
| Silver | 25 × 10.99 + 24 = **$298.75** | 25 × 11.99 + 24 = **$323.75** | $100.00 | **$125.00** |
| Gold | 50 × 10.99 + 116 = **$665.50** | 50 × 11.99 + 116 = **$715.50** | $250.00 | **$300.00** |

That is four changed numbers per club page — the unit price, the line total,
the value total and the saving — **twelve hand edits from one
`set-usd-price.js p103 11.99`**, none of which any tool will make for you. Then
grep the rest of the site for the old amount, because `$10.99` is quoted in
plenty of other copy too. Budget for this, or the site advertises savings that
don't add up.

It cuts the other way too, and worse: **dropping the single price shrinks every
bundle's headline saving** and compresses the whole ladder. At $8.99 singles,
the 3-pack at $27.00 works out to $9.00/game — *more per game than a single*, an
inversion at the very top of the ladder. Cheap singles are not a free lever; the
bundle ladder is the average-order-value engine (see `HOLIDAY-PLAN.md`: moving
one buyer from a $10.99 single to a $39.99 5-pack is a 3.6× order with no new
traffic), so protect it.

## Compare-at prices must be true, not decorative

A struck-through "was" price that was never actually charged is a **fictitious
former-price claim**. In the US that is FTC territory (16 CFR Part 233); in
Canada the Competition Act's ordinary-selling-price provisions cover the same
ground. The store sells into both. This is not a stylistic preference.

Three cases, and the difference matters:

- **LEGITIMATE — a value stack.** "These items cost $116.89 bought separately;
  in this pack it's $79.00." True by arithmetic, verifiable by anyone with the
  product pages open, and every component really is sold separately at the
  price quoted. **Obligation: recompute it whenever any component reprices.**
- **LEGITIMATE — a genuine former price.** The product really sold at $89.00,
  and now sells at $79.00 for a defined window. `set-usd-price.js p131 89.00
  79.00` renders exactly this: struck-through regular, sale price charged.
  **Obligation: it has to end.** A "sale" price that never reverts *is* the
  price, and the anchor becomes fictitious by the passage of time.
- **NOT LEGITIMATE — an invented list price.** Picking a higher number the
  product never sold at so a permanent discount can be displayed. This site has
  already deleted two of these: a "$123 Value" claim about a product that sells
  for $59.00, and a "Get Lifetime Access Now – $123" headline on a page charging
  $59.00. Both were removed as inaccurate, not restyled. When the Zoom
  Party page needed USD sale framing, the prior agent correctly declined to
  invent a "was" price and left it a plain $295.00 instead.

**Where the three club tiers actually sit is worth understanding**, because
they look like case two and are really case one. Each was set with
`set-usd-price.js p131 116.89 79.00` and friends, so the page renders a
struck-through $116.89 above the charged $79.00 — and the tools' sale heuristic
reports all three as "(sale)" permanently. What makes that defensible is the
value-stack paragraph immediately below it, which shows where $116.89 comes
from. **The struck-through number and the paragraph explaining it are a single
claim.** If the copy is ever trimmed away and the struck-through figure left
standing alone, it stops being an arithmetic claim and starts reading as a
former price the product never had. Keep them together, and keep them in sync.

**The rule if you want frequent sales: raise the real list price first, sell at
it, and let the sale be genuine.** The dishonest shortcut and the honest route
end at the same displayed numbers; only one of them survives a complaint.

Note the same test applies to `$X of value` claims about non-price items. "A
$6.99 value" is fine because a Day Pass is sold for $6.99. It stops being fine
the moment the Day Pass is repriced or stops being sold.

## Ladder integrity

**Per-game price must descend as pack size grows.** A rung costing more per game
than the rung above it is a **LADDER INVERSION**, and `add-price-ladder.js`
prints a warning naming every one it finds. Current state, from
`node _tools/add-price-ladder.js --preview`:

```
  The Holidays 6-pack                 $46.99                $7.83/game
  Starter Pack (Bronze)               $79.00 (sale)         $7.90/game
  Silver Club                        $198.75 (sale)         $7.95/game
  Gold Club                          $415.50 (sale)                  —

  LADDER INVERSION — 2 rung(s) cost more per game than the rung above:
    Starter Pack (Bronze) at $7.90/game
    Silver Club at $7.95/game
```

Two inversions are **known and deliberate** — closing them means roughly Bronze
$77 and Silver $192, which is the owner's call, not an agent's. They are
therefore *not* a failure in `site-health.yml`; firing weekly on a known issue
trains everyone to ignore the check. What matters is that no **new** inversion
appears. Compare the `--preview` output before and after your change.

The standing copy rule follows from this: store copy may claim **"every
multi-game pack works out cheaper per night than buying singles"** (true) and
must **never** claim "buy more, pay less per game" (still not true). If you fix
the inversions, that claim becomes available — and only then.

Two mechanical notes on the ladder tool: the `RUNGS` array is hand-maintained,
so a new pack does not appear in the table until it is added there, with its
games-per-pack stated explicitly (guessing pack contents is how Countries once
got paired with Halloween Party). And the Gold Club deliberately shows no
per-game figure, because "everything we make" has no fixed count.

## Choosing a discount mechanism

| | Real price change in LS + `set-usd-price.js` | Discount code via `promo-bar.js` |
|---|---|---|
| On-page price | Shows the sale price, struck-through regular, "On Sale" ribbon and listing banners | Shows the **full** price; discount only appears at checkout |
| Agreement with checkout | Cannot disagree — both are the real price | Agrees **only if the JS ran** |
| JS disabled / blocked | Correct | **Buyer pays full price.** `bake-buy-links.js` bakes a plain href; `ls-buy.js` appends `checkout[discount_code]` at runtime |
| Effort | One LS edit **per product**, plus the tool run | One dashboard code + edit four constants in `promo-bar.js` |
| Ending it | Manual — you must remember to run `set-usd-price.js pNN <regular>` | Self-expiring on the `END` date |
| Scope | Exactly the products you touched | Whatever the code is scoped to in LS |

**Use a real price change** for any permanent repricing, and for anything where
the on-page badge has to be trustworthy — a seasonal pack you want visibly
marked down, a bundle you're merchandising in an email, anything a campaign page
quotes. The displayed number *is* the charged number, and that is worth the
manual work.

**Use a discount code** for a short sitewide event where the mechanic is the
offer ("22% off everything this week") rather than a specific product's price,
and where self-expiry matters more than an on-page badge.

To run a code-based promo, edit `CODE`, `COPY`, `PCT` and `END` in
`assets/js/promo-bar.js` — nothing else, and never hand-edit pages. It exposes
`window.FCE_PROMO` unconditionally (whether or not the one-time popup is shown),
and `ls-buy.js` appends the prefill param to every buy href.

**Scope the code per-product in LemonSqueezy.** This site and the Bingo Card
Generator share the one `bingocardgenerator.lemonsqueezy.com` store, so a
store-wide code will also discount Generator *subscriptions* — recurring revenue
given away by accident. Confirm the scope in the dashboard before announcing it.

## Sale design

**Rotate a subset, don't discount everything.** A sitewide percentage discounts
every product equally, so nothing reads as a deal — the customer sees a store
that is 22% off, which is just a different set of prices. Putting three or four
products on genuine, time-boxed sale at a time, and rotating which ones, creates
a store where there is always something on sale, always for a reason, and always
with a real struck-through price on the tile. A flat catalogue cannot do that.

**Time seasonal sales to search demand, not to the event.** Demand runs weeks
ahead: Halloween queries peak early-to-mid October, and corporate Christmas
booking starts late September (`HOLIDAY-PLAN.md`). A Halloween sale launched on
25 October is launched after the buying is done.

**Depth: prefer the ladder over the discount.** This catalogue's structural
offer is "buy more nights, pay less per night." A deep discount on a single game
competes with that — it pulls buyers *down* the ladder into the lowest-AOV
purchase. Where you can, make the deal a bundle at a good per-game price rather
than a single at a low one.

## Before you reprice: is price actually the problem?

At this scale — roughly **380 visits and 30–35 orders a month at about a $15
average order** — price elasticity is **statistically undetectable.** You cannot
A/B test a price here: an A/B test needs thousands of sessions per arm, and this
site does not produce that in a quarter. Any story about "we tested $9.99 and
conversions rose" would be noise. Say so plainly if asked to run one.

So reason from **margin, positioning and ladder integrity**, not from imagined
elasticity — and first check whether the complaint is really about price:

- **No urgency?** Nothing on the page says why to buy today. That's a sale
  window or a deadline, not a lower price.
- **No deal signal?** The product may be well priced and simply not *look* like
  it. A genuine struck-through price, a value stack, or a visible bundle
  comparison changes perception without changing revenue per unit.
- **Weak merchandising?** Is the cross-sell block present, is the pack the
  buyer should want linked from the page they're on, does the price ladder
  reach them? These move AOV with no price change at all.
- **Traffic?** ~380 visits against ~30-35 orders a month implies a conversion
  rate high enough that it is worth checking before building on it — the two
  numbers come from different sources (GA4 pageviews, LemonSqueezy orders).
  Either way, doubling orders needs more people, not cheaper games.
- **Instrumentation?** `begin_checkout` is tracked on this domain but the
  purchase happens on lemonsqueezy.com, so GA4 cannot see revenue. Nobody can
  evaluate a price change without LemonSqueezy's own analytics integration.
  Note that limitation rather than inventing a conclusion.

The digital-goods margin is ~100%, so a price cut is a straight revenue cut per
order. It has to buy a volume increase you can actually observe — and at this
traffic, you can't.

## Pre-flight checklist

Before any price change ships:

- [ ] Is the new price set in **LemonSqueezy**? If not, stop and hand it over.
- [ ] Is this a **permanent reprice** or a **time-boxed sale**? If a sale, what
      is the end date, and who reverts it?
- [ ] If a sale: was the "was" price **genuinely charged**? If not, don't use
      sale framing — raise the real list price first, or ship a plain price.
- [ ] Does the product sit **inside any bundle**? Check the `BUNDLES` map in
      `_tools/add-cross-sell.js`. If yes, the bundle's arithmetic changes.
- [ ] Is it a **single game**? Then all three club value stacks change — run the
      cascade arithmetic before touching anything.
- [ ] Does it appear in a **`/go/` campaign page** (`_content/campaigns.json`)
      or a **song-library CTA**? Those bake prices too.
- [ ] Run `node _tools/add-price-ladder.js --preview` and **save the output** as
      the before-picture for the inversion comparison.

## Post-flight verification

After the tool run, every one of these:

- [ ] All six step-3 tools re-run with `--write`, in the documented order.
- [ ] `set-usd-price.js` printed **no unresolved `WARN`** about a stale amount
      in the copy — or you fixed each one at the line it named.
- [ ] The hand-written-price grep above returns **only expected lines**.
- [ ] The rendered buy button points at the right checkout — the baked href
      must equal this product's own `ls-links.js` entry, not a template's
      inherited one (a staged clone can ship a real href charging for the wrong
      product), and the button must not still be hidden:

      ```bash
      grep -o 'href="https://[^"]*lemonsqueezy[^"]*"' store/pNN/*.html | sort -u
      grep '"pNN"' assets/js/ls-links.js
      ```
- [ ] `add-price-ladder.js --preview` shows the intended prices and **no new
      LADDER INVERSION** versus the before-picture.
- [ ] Every value stack still adds up: components × unit + add-on = the "of
      value" total, and total − charged = the "save $X" figure. Check the
      arithmetic, not just that the numbers changed.
- [ ] `node _tools/check-links.js` → 0 broken refs.
- [ ] `git diff --stat` matches what you expected to touch. A price change that
      rewrote 300 files did something you didn't intend.
- [ ] If a sale was started: the revert is written down somewhere the owner will
      see it, with the date and the exact command.

## Reference material

- `reference/tooling.md` — what each tool reads and writes, the regex and
  price-format traps that have caused real bugs, and how the weekly health
  check detects drift.
- `reference/catalogue.md` — the current price ladder, the club value stacks in
  full, and the LemonSqueezy / promo plumbing.

Repo docs worth reading alongside this: `CLAUDE.md` (the four-step repricing
rule and the tooling map), `HOLIDAY-PLAN.md` (the revenue arithmetic and why AOV
is the lever), `POST-LAUNCH.md` (the p140 price/checkout mismatch and the
inflated-value-claim cleanups).
