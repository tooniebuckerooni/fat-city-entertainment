# Trivia Show Maker — Site-Side Handoff (2026-08-08)

The **Trivia Show Maker** is a first-party tool that now lives inside this site at
`/trivia-show-maker/` and is served at
`https://www.fatcityentertainment.com/trivia-show-maker/`. The app's source of
truth (and the full session handoff — pricing, Worker, credit economy, known
issues) is in the **`tooniebuckerooni/trivia-generator-pro`** repo, in
`HANDOFF.md`. This file only covers what's wired into *this* site.

## What's in this repo

| Piece | Location |
|---|---|
| **The public tool** | `trivia-show-maker/` — a copy of the app (`index.html`, `css/`, `js/{app,ai,pdfgen,samples}.js`), plus an SEO head, `WebApplication` + `FAQPage` JSON-LD, a crawlable FAQ, and internal links. |
| **Legacy URL redirect** | `trivia-generator.html` — a 301 redirect stub → `/trivia-show-maker/`. |
| **Sitewide nav rename** | `_tools/rename-trivia-generator-nav.js` — renamed the nav item to "Trivia Show Maker" across all pages. |
| **Store / offers** | `store/p65/bingocardgeneratorpro.html` (legacy Bingo page, refreshed copy + subtle cross-offer), `features.html`, `bingocardgenerator.html` (schema). |
| **Blog links** | 3 posts under `triviahostresources/*/index.html` link to the tool contextually. |
| **Sitemap** | `sitemap.xml` includes `/trivia-show-maker/`. |

## Keep the two app copies in sync

⚠️ The app exists in **two places**: this repo's `trivia-show-maker/` and the
`trivia-generator-pro` repo root. Any change to `js/*.js` / `css` / `index.html`
must be made in **both**, or copied across. `WORKER_URL` / `CHECKOUT_URL` are
hard-coded in both copies of `js/ai.js`.

## Still to do on the site

- **Trivia Store product page** for the credit pack — not built yet. The
  LemonSqueezy checkout URL exists (`bingocardgenerator.lemonsqueezy.com/checkout/buy/f5fe010c-…`);
  a product page + tile can be generated with `_tools/new-product`. Decide live
  vs. staged before running.
- After any change here, run `node _tools/check-links.js` (expect 0 broken).

## Verify

- Open `trivia-show-maker/index.html` locally — the free app runs with no build
  and no license (loads samples, previews, downloads all four PDFs).
- `node _tools/check-links.js` → expect **0 broken** across the site.
- `trivia-generator.html` should redirect to `/trivia-show-maker/`.
