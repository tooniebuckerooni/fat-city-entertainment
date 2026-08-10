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


## Pack tiers (live 2026-08-09)

| Pack | Credits | Price | Per credit | Roughly | Role |
|---|---|---|---|---|---|
| Starter | 50 | $7.99 | 16.0¢ | 25 rounds · ~1 month | impulse entry |
| Host | 200 | $24.99 | 12.5¢ (~22% off) | 100 rounds · ~3–4 months | "Most popular" anchor |
| Pro | 500 | $49.99 | 10.0¢ (~37% off) | 250 rounds · 6+ months | weekly hosts / multi-night venues |

Round maths comes from the worker's own economy: `GENERATE_COST = 2`, so a
full 10-question round costs 2 credits.

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
