# Pricing tooling reference

Read this when you need to know *what a tool actually does* to a price, or when
something has gone wrong and you're tracing where a number came from.

Contents:
1. The canonical source of a price
2. `set-usd-price.js` — what it rewrites, and what it can't
3. The bake-from-page tools
4. Traps that have caused real bugs
5. The weekly health check

---

## 1. The canonical source of a price

Every downstream tool reads the same thing:

```html
<meta itemprop="price" content="79.00">
```

on the product page under `store/pNN/<name>.html`. That is the **price actually
charged** (when a product is on sale, `itemprop="price"` moves to the sale
container and carries the sale amount). Nothing keeps a price map of its own —
a map would drift the moment anything repriced.

Consequence: **the product page is upstream of everything.** Fix it first, then
re-bake. A tool run against a stale product page bakes stale numbers with
perfect fidelity.

Sale detection is heuristic across the tools: a page showing more than one
distinct `$N.NN USD` string is treated as on sale. That is why the tools report
"N tiers on sale" at the end of a run — it is a prompt to re-run them when the
sale ends.

## 2. `set-usd-price.js` — what it rewrites, and what it can't

```
node _tools/set-usd-price.js <pNN> <regular> [<sale>]
```

Rewrites in one shot:

- **Product page** — `priceCurrency` → USD; the `wsite-com-product-show-price`
  / `-on-sale` class on the price area; the three price containers
  (`#wsite-com-product-price`, `-range`, `-sale`) with `itemprop="price"`
  placed on whichever one is shown; `AggregateOffer` `lowPrice`/`highPrice`
  where present; the "On Sale" ribbon; and the hidden Weebly variation JSON
  (`&quot;price&quot;` / `&quot;sale_price&quot;`).
- **Every listing block** on `trivia-store.html` and under `store/c*/` that
  carries `data-id="NN"` — regular price, sale price, and the "On Sale" tile
  banner.
- **`assets/js/ls-links.js`** — the human-readable price in that product's
  comment line, so the reference list doesn't lie.

It **cannot** touch:

- **LemonSqueezy.** It is a file rewriter. LS is unchanged.
- **Body copy.** Any dollar amount written into a paragraph. It *detects* these
  — it snapshots the page's `itemprop="price"` values before rewriting and then
  scans non-price lines for the old amounts, printing
  `WARN: $89.00 still written into the copy at store/p131/BronzeClub.html:519`.
  It only warns about amounts that are actually changing, so a value stack
  quoting "$10.99 a game" survives a bundle reprice without a false alarm.

Guardrails worth knowing: it rejects a sale price that is not lower than the
regular price, and it warns when a product is on sale but its listing block has
no "On Sale" banner to show.

## 3. The bake-from-page tools

All of these read `itemprop="price"` off product pages and write numbers into
HTML. All are idempotent and safe to re-run. All go stale silently.

| tool | writes | marker | notes |
|---|---|---|---|
| `add-cross-sell.js` | block under the buy area on ~48 product pages | `<!-- fce:cross-sell:start/end -->` | Bundle pages list components; bundle members get the per-game arithmetic; stand-alone packs get a Gold Club line. `--preview` prints rendered copy. Deliberately quotes **no** sale price — club tiers are all marked down and a sale price baked into prose goes stale the day it ends. |
| `add-price-ladder.js` | the tier table on `trivia-store.html` | `<!-- fce:price-ladder -->`, placed **before** `<!-- fce:copy -->` | `RUNGS` is hand-maintained: files, games-per-pack, tier name, who-it's-for. A rung with several products renders as a range and links to the cheapest. Prints LADDER INVERSION warnings. |
| `build-song-library.js` | buy CTAs on 50 library pages | regenerates whole pages from `_content/song-lists.json` | Must run **before** `add-jsonld.js` — it rebuilds from the template shell and drops the `fce:jsonld` block. |
| `build-campaign-pages.js` | `/go/<campaign>/` landing pages | regenerates from `_content/campaigns.json` | Reads prices from product pages *and* checkout links from `ls-links.js`. Throws if a referenced product has no price. |
| `add-jsonld.js` | `Product` + `Offer` structured data | `<!-- fce:jsonld -->` | Reads `itemprop="price"` and `priceCurrency`; infers availability from the `show-price` class. A wrong price here is a wrong price in Google's shopping surfaces. |
| `bake-buy-links.js` | the real checkout `href` into every `.ls-buy` button | — | Re-run whenever `ls-links.js` changes. Bakes a **plain** href; the promo discount param is appended at runtime by `ls-buy.js`. |

Why `add-price-ladder.js` sits before the copy markers rather than inside them:
`add-page-copy.js` owns everything between `<!-- fce:copy -->` markers and would
overwrite anything placed there.

## 4. Traps that have caused real bugs

**`$1` in a replacement string.** Prices contain `$` followed by a digit. In a
JS `String.replace` replacement *string*, `"$10.99"` is parsed as backreference
`$1` followed by `"0.99"`. Every price insertion in these tools therefore uses a
**replacer function**, not a string. `add-cross-sell.js` hit this from the other
direction — its data walked into a pattern that really did have a group 1, which
would have spliced the captured buy area into the middle of a sentence. If you
add a price to any tool's output, use a function replacer.

**Price-range layouts hide the sale container.** The p140 Zoom Party bug: the
price area used `wsite-com-product-show-price-range-on-sale`, whose CSS strikes
through the regular price, shows the *range* container and **hides** the sale
container — so the page displayed the struck-through figure as the live price
while LemonSqueezy charged something else. Root cause was a silent regex failure
in `set-usd-price.js`, which expected the price span immediately after the
container div; range products carry hidden `lowPrice`/`highPrice` spans first,
so the replace never matched and the tool reported success. It now scans within
the container and normalises `-range` onto the plain layout. **A tool reporting
success is not proof the page changed — diff it.**

**A staged clone can inherit a live checkout link.** A new product cloned from a
template, with no `ls-links.js` entry of its own, can ship its *template's* real
Lemon Squeezy href — a button that looks wired and charges for the wrong
product. `new-product.js` resets it to the hidden/"contact us" state, but always
grep the rendered `ls-buy` href on anything just published.

**Redirect stubs.** Pages with `http-equiv="refresh"` forward before anything
renders, so any price on them is copy nobody reads and nobody maintains — p125
sat on a leftover $11.00 tag for exactly this reason. `add-cross-sell.js` skips
them on purpose.

**Excluded products.** p166 (Party Starter, staged/noindex) and p108
(Entertainers 3-Pack, ambiguous membership — it names "Video Games, TV Shows &
Movie Soundtracks" and there are two TV Shows games and three Movie Soundtracks
games) are deliberately absent from the cross-sell maps. Don't "fix" that by
guessing.

**Unverifiable savings are worse than none.** `add-cross-sell.js` only states
"you save $X" when *every* component has its own page and price. Four of six
games priced is not a saving anyone can check.

## 5. The weekly health check

`.github/workflows/site-health.yml` dry-runs every tool each Monday and opens a
GitHub issue if any would write — which reaches the owner by email and phone,
with no laptop needed. It closes the issue automatically when things are clean.

The signal it exists for is exactly this skill's failure mode: **a price changed
in LemonSqueezy without re-running the tools leaves the site quoting a number
the checkout won't honour.** A drifted tool is that, caught in a week rather
than by a customer.

Two things to know before touching it:

- The tools do not share an output format ("updated : 6", "pages written : 4",
  "price ladder updated", "Would rewrite 12 reference(s)"). An earlier matcher
  understood two of those shapes and silently missed a simulated price drift in
  two of the three tools that should have caught it. **If you add a tool to the
  loop, simulate a real drift and confirm it fires.** A health check with blind
  spots reads as an all-clear.
- **LADDER INVERSION is deliberately not a failure condition.** Two rungs are
  knowingly inverted, so it would fire every week and train everyone to ignore
  the issue. The ladder `--preview` output is printed in the report body
  instead, where a *change* to it is visible.
