# Trivia Show Maker — Site-Side Handoff (2026-08-08, updated 2026-08-10)

The **Trivia Show Maker** is a first-party tool that lives inside this site at
`/trivia-show-maker/` and is served at
`https://www.fatcityentertainment.com/trivia-show-maker/`.

**As of 2026-08-10, this repo is the single source of truth** for the app
(`trivia-show-maker/index.html`, `css/style.css`, `js/{app,ai,pdfgen,samples}.js`)
and for the AI Studio backend (`tgp-ai-gateway/worker.js`, deployed via
Cloudflare dashboard paste — see `tgp-ai-gateway/README.md`). Make future
edits here, not in `tooniebuckerooni/trivia-generator-pro`.

**The `trivia-generator-pro` repo is retired for active development.** It's
kept around as the historical original (MIT license, its own GitHub Pages at
`tooniebuckerooni.github.io/trivia-generator-pro/`) but is no longer where
changes get made — its copy of the app and `worker.js` were already drifting
out of sync with this site before this handoff, which is exactly the failure
mode that motivated retiring it. Don't resurrect the two-repo workflow.

## What's in this repo

| Piece | Location |
|---|---|
| **The public tool** | `trivia-show-maker/` — the app itself (`index.html`, `css/`, `js/{app,ai,pdfgen,samples}.js`), plus an SEO head, `WebApplication` + `FAQPage` JSON-LD, a crawlable FAQ, and internal links. |
| **AI Studio backend** | `tgp-ai-gateway/worker.js` — the Cloudflare Worker source (deploy-by-paste, see its `README.md`). |
| **Legacy URL redirect** | `trivia-generator.html` — a 301 redirect stub → `/trivia-show-maker/`. |
| **Sitewide nav rename** | `_tools/rename-trivia-generator-nav.js` — renamed the nav item to "Trivia Show Maker" across all pages. |
| **Credit pack product page** | `trivia-show-maker-plans.html` — three live LemonSqueezy checkouts: Starter 50 ($7.99), Host 200 ($24.99, "Most popular"), Pro 500 ($49.99). |
| **Trivia Store banner** | `trivia-store.html` has a 2-up banner row (Trivia Show Maker + Bingo Card Generator) above the category tiles; the Trivia Show Maker banner links to `trivia-show-maker-plans.html`. |
| **Store / offers** | `store/p65/bingocardgeneratorpro.html` (legacy Bingo page, refreshed copy + subtle cross-offer), `features.html`, `bingocardgenerator.html` (schema). |
| **Blog links** | 3 posts under `triviahostresources/*/index.html` link to the tool contextually. |
| **Sitemap** | `sitemap.xml` includes `/trivia-show-maker/` and `/trivia-show-maker-plans.html`. |

## Single source of truth now — no more syncing

This repo's `trivia-show-maker/` is the only copy to edit. `index.html` and
`css/style.css` also carry Fat-City-specific additions on top of the app
itself (SEO meta/JSON-LD, the `.fce-bar` nav strip, the `.seo-content` FAQ
section, footer credit) — when pulling in app-only changes, preserve those;
they don't exist anywhere else. `js/{app,ai,pdfgen,samples}.js` are pure app
logic with no site-specific content, safe to overwrite wholesale from a newer
version if one ever needs pulling in from elsewhere. `WORKER_URL` /
`CHECKOUT_URL` are hard-coded in `js/ai.js`.

## Still to do on the site

Nothing outstanding as of this writing. The credit-pack product page shipped
(`trivia-show-maker-plans.html`), and the AI Studio prompt/temperature tuning
(factual-accuracy pass on `generateQuestions`, plus the AI tiebreaker
generator and themed category digging) has been pasted to the live
`tgp-ai-gateway` Worker and merged into `trivia-show-maker/` here
(2026-08-10).

- After any change here, run `node _tools/check-links.js` (expect 0 broken).

## Verify

- Open `trivia-show-maker/index.html` locally — the free app runs with no build
  and no license (loads samples, previews, downloads all four PDFs).
- `node _tools/check-links.js` → expect **0 broken** across the site.
- `trivia-generator.html` should redirect to `/trivia-show-maker/`.


## Pack tiers (repriced 2026-08-11 — retired the old 200/500 packs)

| Pack | Credits | Price | Per credit | Roughly | Role |
|---|---|---|---|---|---|
| Starter | 50, one-time | $13.98 | 28.0¢ | 25 rounds · ~1 month | impulse entry |
| Pack | 250, one-time | $54.99 | 22.0¢ (~21% off Starter) | 125 rounds · several months | "Most popular" anchor |
| Subscription | 250/month | $44.99/mo | 18.0¢ (~36% off Starter, ~18% cheaper than the one-time Pack) | 125 rounds/month, refilled automatically | recurring weekly hosts |

Round maths comes from the worker's own economy: `GENERATE_COST = 2`, so a
full 10-question round costs 2 credits.

**The old Host (200, $24.99) and Pro (500, $49.99) tiers are retired** — the
site only sells the three above now. Existing buyers of the old tiers keep
whatever credits they haven't spent; nothing about their license changes,
since credits never expire.

**The Subscription card is marked "Coming soon" on `trivia-show-maker-plans.html`
(`fce-plan-card--soon`, no buy link) because the LemonSqueezy product doesn't
exist yet.** To launch it:

1. In LemonSqueezy, create a **recurring/subscription** product named so its
   first number is the monthly credit grant, e.g. `Trivia Show Maker — 250 AI
   Credits/mo`, priced $44.99/mo, **License Keys enabled**.
2. Copy its variant id (Product page → that variant → the id is in the
   dashboard URL) into `SUBSCRIPTION_VARIANT_IDS` in `tgp-ai-gateway/worker.js`
   — this is what makes its credits refill every calendar month instead of
   persisting forever like a one-time pack (see the comment above `balanceKey()`
   for how/why). Leaving a subscription product's variant out of that set
   would make it behave like a one-time 250-credit pack instead — the buyer
   gets 250 credits ONCE for the life of the subscription and then is stuck
   at 0 even though they're still being billed monthly. Don't skip this step.
3. Re-paste the updated `worker.js` into the Cloudflare dashboard (a commit
   here doesn't go live on its own).
4. Swap the "Coming soon" badge and add the real `<a class="fce-cta">` buy
   link on `trivia-show-maker-plans.html`, pointing at the new product's
   checkout URL.

**Renaming the old "Host" product into the new "Pack" tier assumes it's the
*same* LemonSqueezy product**, just renamed to `... 250 AI Credits` and
repriced to $54.99 — that keeps its existing checkout link valid, since the
credit grant is read from whatever the product is named *at the time of
purchase*, not baked into the button. If a *new* product was created for the
250 pack instead, the button on `trivia-show-maker-plans.html` still points
at the old Host checkout and needs updating to the new one — check this
before promoting the price.

## ⚠ The credit grant depends on the LemonSqueezy PRODUCT NAME

`TIER_CAPS` in `worker.js` is **empty** — the commented-out `'123456': 50` is an
example, not a configured tier. So `capForLicense()` falls through to:

```js
return firstNum(meta.product_name) ?? firstNum(meta.variant_name);
```

It reads **the first number in the product name**. That means each LemonSqueezy
product must be named so the first number is its credit count — "200 AI
Credits", "500 AI Credits". The failure modes are not subtle:

| product named | first number | what the buyer gets |
|---|---|---|
| `200 AI Credits` | 200 | correct |
| `Host Plan` | none | *"This license key isn't a valid AI credit pack."* |
| `Host Plan — 3 Months, 200 Credits` | **3** | **3 credits for $24.99** |

This is the same class as the buy-button landmine in `CLAUDE.md`: the checkout
works, the money moves, and the customer gets the wrong thing. It cannot be
verified from the agent sandbox — the egress proxy blocks `lemonsqueezy.com` as
well as `*.workers.dev`.

**Verify in the LemonSqueezy dashboard before promoting these tiers**, or set
`TIER_CAPS` explicitly by variant id, which removes the dependency on naming
entirely and is the more robust option:

```js
const TIER_CAPS = {
  '<starter_variant_id>': 50,
  '<host_variant_id>': 200,
  '<pro_variant_id>': 500,
};
```

Remember the Worker is deployed by pasting into the Cloudflare dashboard, so a
`TIER_CAPS` change is not live until re-pasted.
