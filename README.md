# Fat City Entertainment — fatcityentertainment.com

Static site for [www.fatcityentertainment.com](https://www.fatcityentertainment.com), migrated off Weebly to GitHub Pages in June 2026. **Every public URL from the Weebly site is preserved** — pages, store products, store categories, blog posts, blog archives/categories, and pagination.

## What's here

| Path | What it is |
|------|------------|
| `*.html` | The site's main pages (same filenames as on Weebly) |
| `store/pNN/*.html` | 71 product pages (original URLs, LemonSqueezy checkout) |
| `store/cNN/...` | 8 store category pages |
| `triviahostresources/<slug>/` | 107 blog posts + archives, categories, pagination |
| `trivia-store.html` | Store landing page |
| `uploads/`, `files/` | All images, media, theme CSS/JS from Weebly |
| `assets/` | Self-hosted CSS/fonts/JS that used to come from Weebly's CDN |
| `_tools/` | The scraper/transformer scripts used for the migration (not served) |

## Selling products (LemonSqueezy)

See **[LEMONSQUEEZY-TODO.md](LEMONSQUEEZY-TODO.md)**. Short version: as you re-create each product in LemonSqueezy, paste its buy link into [`assets/js/ls-links.js`](assets/js/ls-links.js). The buy button on that product page activates automatically and opens LemonSqueezy's overlay checkout right on the page.

## Contact forms

The booking/contact forms previously posted to Weebly's servers. They are now pointed at a Formspree placeholder — create a free form at [formspree.io](https://formspree.io) and replace `YOUR_FORM_ID` everywhere it appears (in `contact.html`, `musicbingonearme.html`, `virtualevents.html`, `vrtriviaparty.html`, and `yycevents.html` — search for `formspree.io/f/YOUR_FORM_ID`).

## Going live

1. Push to `main` (GitHub Pages serves from the repo root).
2. In the domain registrar, point `www` CNAME at `tooniebuckerooni.github.io` and apex A records at GitHub Pages IPs (185.199.108.153 / .109 / .110 / .111).
3. The `CNAME` file in this repo already declares `www.fatcityentertainment.com`.
4. After DNS propagates, enable **Enforce HTTPS** in the repo's Pages settings.

Until DNS is switched, the Weebly site stays live — nothing breaks.

## Editing pages

Pages are plain HTML — edit and push. There is no build step. The `_tools/` scripts were one-time migration tooling; you don't need them for day-to-day edits.
