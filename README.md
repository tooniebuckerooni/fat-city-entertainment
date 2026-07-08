# Fat City Entertainment — fatcityentertainment.com

Static site for [www.fatcityentertainment.com](https://www.fatcityentertainment.com), migrated off Weebly to GitHub Pages in June 2026. **Every public URL from the Weebly site is preserved** — pages, store products, store categories, blog posts, blog archives/categories, and pagination.

**Launching? Work through [LAUNCH-CHECKLIST.md](LAUNCH-CHECKLIST.md)** — the
DNS-cutover runbook with pre/post-flip verification steps.

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
| `musicbingohandbook.html` | Music Bingo Handbook sales funnel (live page, new product) |
| `pages/*.html` | Staged 2.0 drafts (noindex, not linked) — incl. the new TRIV101 & Trivia Generator placeholders |
| `_tools/` | The scraper/transformer scripts used for the migration (not served) |

## Selling products (LemonSqueezy)

See **[LEMONSQUEEZY-TODO.md](LEMONSQUEEZY-TODO.md)**. Short version: as you re-create each product in LemonSqueezy (**prices are now USD**), paste its buy link into [`assets/js/ls-links.js`](assets/js/ls-links.js), then update the displayed price everywhere with `node _tools/set-usd-price.js pNN <usd> [<sale>]`. The buy button on that product page activates automatically and opens LemonSqueezy's overlay checkout right on the page.

## Contact forms

The booking/contact forms previously posted to Weebly's servers. They are now pointed at a Formspree placeholder — create a free form at [formspree.io](https://formspree.io) and replace `YOUR_FORM_ID` everywhere it appears (in `contact.html`, `musicbingonearme.html`, `virtualevents.html`, `vrtriviaparty.html`, and `yycevents.html` — search for `formspree.io/f/YOUR_FORM_ID`).

## Going live (GitHub Pages, optionally fronted by Cloudflare)

Because the original design is preserved and the store is **not** consolidated,
every URL stays exactly where it was — so the only redirect needed is apex → www,
which GitHub Pages does on its own. No custom redirect rules required.

1. GitHub repo → **Settings → Pages**: Source = **Deploy from a branch**,
   Branch = `main`, folder = `/ (root)`. `.nojekyll` keeps files served as-is.
   You get a `tooniebuckerooni.github.io/...` URL to sanity-check.
2. **DNS** (registrar is Squarespace Domains). Two equivalent options:
   - **Plain GitHub Pages:** point `www` CNAME → `tooniebuckerooni.github.io`,
     and apex `@` A-records → `185.199.108.153 / .109 / .110 / .111`.
   - **GitHub Pages + Cloudflare** (same stack as the other sites): add the domain
     in Cloudflare, set its nameservers at Squarespace, then in Cloudflare DNS add
     proxied `CNAME www → tooniebuckerooni.github.io` and `CNAME @ →
     tooniebuckerooni.github.io` (apex flattening); SSL/TLS mode = **Full**.
3. GitHub repo → **Settings → Pages → Custom domain** = `www.fatcityentertainment.com`,
   Save (this writes the `CNAME` file). Wait for the cert, then tick **Enforce
   HTTPS**. GitHub auto-redirects the apex to `www`. *(No `CNAME` file is committed
   yet on purpose, so the github.io staging URL keeps working before cutover.)*
4. Spot-check ~10 old URLs + one real Lemon Squeezy sale, **then** retire Weebly.

Until DNS is switched, the Weebly site stays live — nothing breaks.

## Redesign (saved for later, incremental rollout)

A redesigned theme for `index.html`, `trivia-store.html`, and `contact.html`
(shared `styles.css`, Lemon Squeezy overlay, Web3Forms contact) lives on branch
**`claude/fat-city-migration-t5xd8p`**. It is intentionally *not* live yet — the
plan is to roll it in one page at a time after the site is confirmed working
on the new host. To preview it, check out that branch and open the files.

## Editing pages

Pages are plain HTML — edit and push. There is no build step. The `_tools/` scripts were one-time migration tooling; you don't need them for day-to-day edits.
