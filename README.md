# Fat City Entertainment (fatcityentertainment.com)

Static site for [www.fatcityentertainment.com](https://www.fatcityentertainment.com):
a Weebly export, served by **GitHub Pages from `main`** (custom domain via `CNAME`,
`.nojekyll` on). DNS is on Namecheap. There is no server and no build step for the
marketing site; every public URL from the Weebly days is preserved.

**For anything beyond a quick look, read [CLAUDE.md](CLAUDE.md).** It is the
maintained record of how the site works, which tool owns which part of a page, and
the traps that have already bitten. This README is only a map. (Rewritten 4 Nov
2026; the earlier version described the June 2026 migration and had gone stale.)

## What's here

| Path | What it is |
|------|------------|
| `*.html` | Main pages (same filenames as on Weebly) |
| `store/pNN/` | Product pages, about 99 (LemonSqueezy checkout; two ebooks sell on Amazon) |
| `store/cNN/` | Store category pages (9) |
| `trivia-store.html` | The storefront |
| `triviahostresources/` | The blog: about 120 posts, plus noindexed listing shells |
| `music-bingo-song-lists/` | The free Song List Library (built from `_content/song-lists.json`) |
| `trivia-nights/` | City pages with free local rounds (built from `_content/city-pages.json`) |
| `trivia-show-maker/` | The Trivia Show Maker app |
| `triv101/` | Triv 101, the host-run game |
| `go/` | Email campaign landing pages (noindex, not in the sitemap) |
| `cards/` | Short redirect links that preload games into the sister Bingo Card Generator |
| `assets/` | Site CSS and JS (`site-extras.css`, `ls-buy.js`, `track.js`, ...) |
| `uploads/`, `files/` | Images, media and the Weebly theme |
| `_content/` | Source data and copy partials that the tools turn into pages |
| `_tools/` | The Node tools that build and check the site (not served) |
| `triv101-api/`, `greenroom-api/`, `tgp-ai-gateway/` | Cloudflare Worker sources (deployed by dashboard paste, not by this repo) |

## Changing things

- **Generated pages are owned by tools in `_tools/`.** Edit the data or the tool,
  then re-run it with `--write`. A hand edit to a generated page is reverted by the
  next run. Every tool except `add-lazy-images.js` is a dry run by default.
- **Prices**: change LemonSqueezy first, then `node _tools/set-usd-price.js`, then
  the re-run list in CLAUDE.md ("Repricing a product").
- **Buy links**: `assets/js/ls-links.js`, then `node _tools/bake-buy-links.js --write`.
- **Sales**: the dated `PROMOS` list in `assets/js/ls-buy.js`. The schedule is in
  `HOLIDAY-SALE-2026.md`.
- Finish with `node _tools/check-links.js` (run `npm install --prefix _tools` once).
  Zero broken references is the bar.

## Checks

`.github/workflows/site-health.yml` runs every tool as a dry run each Monday and
opens a GitHub issue if anything has drifted. `bake-green-room.yml` refreshes the
Green Room comments daily.

## Related

The Bingo Card Generator lives in its own repo,
`tooniebuckerooni/bingocardgenerator2`, at bingocardgenerator.online.
