# Trivia Show Maker — Site-Side Handoff (2026-08-08)

The **Trivia Show Maker** is a first-party tool that now lives inside this site at
`/trivia-show-maker/` and is served at
`https://www.fatcityentertainment.com/trivia-show-maker/`. The app's source of
truth (build, PDF generation, feature list) is the
**`tooniebuckerooni/trivia-generator-pro`** repo's `README.md` — there is no
separate `HANDOFF.md` there despite older notes saying so. The AI Studio
add-on's server logic lives in that repo's `worker.js` (deployed via
Cloudflare dashboard paste — see that repo). This file only covers what's
wired into *this* site.

## What's in this repo

| Piece | Location |
|---|---|
| **The public tool** | `trivia-show-maker/` — a copy of the app (`index.html`, `css/`, `js/{app,ai,pdfgen,samples}.js`), plus an SEO head, `WebApplication` + `FAQPage` JSON-LD, a crawlable FAQ, and internal links. |
| **Legacy URL redirect** | `trivia-generator.html` — a 301 redirect stub → `/trivia-show-maker/`. |
| **Sitewide nav rename** | `_tools/rename-trivia-generator-nav.js` — renamed the nav item to "Trivia Show Maker" across all pages. |
| **Credit pack product page** | `trivia-show-maker-plans.html` — 50 AI Credits ($7.99, real LemonSqueezy checkout), Host/Pro plans marked Coming Soon. |
| **Trivia Store banner** | `trivia-store.html` has a 2-up banner row (Trivia Show Maker + Bingo Card Generator) above the category tiles; the Trivia Show Maker banner links to `trivia-show-maker-plans.html`. |
| **Store / offers** | `store/p65/bingocardgeneratorpro.html` (legacy Bingo page, refreshed copy + subtle cross-offer), `features.html`, `bingocardgenerator.html` (schema). |
| **Blog links** | 3 posts under `triviahostresources/*/index.html` link to the tool contextually. |
| **Sitemap** | `sitemap.xml` includes `/trivia-show-maker/` and `/trivia-show-maker-plans.html`. |

## Keep the two app copies in sync

⚠️ The app exists in **two places**: this repo's `trivia-show-maker/` and the
`trivia-generator-pro` repo root. Any change to `js/*.js` / `css` / `index.html`
must be made in **both**, or copied across. `WORKER_URL` / `CHECKOUT_URL` are
hard-coded in both copies of `js/ai.js`.

## Still to do on the site

Nothing outstanding as of this writing. The credit-pack product page shipped
(`trivia-show-maker-plans.html`), and the AI Studio prompt/temperature tuning
(factual-accuracy pass on `generateQuestions` in `worker.js`) has been pasted
to the live `tgp-ai-gateway` Worker.

- After any change here, run `node _tools/check-links.js` (expect 0 broken).

## Verify

- Open `trivia-show-maker/index.html` locally — the free app runs with no build
  and no license (loads samples, previews, downloads all four PDFs).
- `node _tools/check-links.js` → expect **0 broken** across the site.
- `trivia-generator.html` should redirect to `/trivia-show-maker/`.
