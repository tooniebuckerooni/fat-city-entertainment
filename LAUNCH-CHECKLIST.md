# Fatcityentertainment.com 2.0 — Launch Checklist

The DNS-cutover runbook. Work top to bottom; everything above the "Flip DNS"
section is safe to do (and verify) while Weebly is still live.

## Where things stand (verified July 7, 2026)

- [x] **Every legacy URL preserved.** All 213 sitemap URLs (pages, 73 store
  products, 8 categories, 107 blog posts + archives) resolve to real files.
  Because paths are identical to Weebly, **no 301 redirect map is needed** —
  backlinks and Google's index keep working by simply pointing at the new host.
  The only redirect required is apex → www, which GitHub Pages does
  automatically once the custom domain is set.
- [x] **Zero broken internal links/assets** across all 397 pages
  (re-check anytime: `cd _tools && npm install && node check-links.js`).
- [x] **All assets self-hosted**: 135 MB of `/uploads/`, theme CSS/JS in
  `/files/`, fonts/CSS/JS that used to come from Weebly's CDN in `/assets/`.
  Nothing on the site loads from weebly.com anymore.
- [x] **Absolute canonicals** on every page (`https://www.fatcityentertainment.com/...`),
  so the `tooniebuckerooni.github.io` staging URL can never be indexed as the
  "real" copy, and all link equity consolidates on www.
- [x] **Mixed-content fixed**: YouTube embeds now https (they would have been
  blocked on the https site), Weebly-hotlinked file icon replaced with
  `/assets/icons/file-zip.svg`, dead 2016 AdWords tag removed, broken
  `http://UNSET/...` blog-widget links repaired.
- [x] `404.html`, `robots.txt`, `sitemap.xml`, `.nojekyll` in place.
- [x] CNAME file intentionally **not** committed yet (keeps staging URL working;
  GitHub writes it at cutover — see below).

## Before flipping DNS

- [x] **Formspree**: create the form and replace `YOUR_FORM_ID` everywhere
  (`grep -rl "YOUR_FORM_ID" --include=*.html .` — currently `contact.html`,
  `musicbingonearme.html`, `virtualevents.html`, `vrtriviaparty.html`,
  `yycevents.html`, plus the staged `pages/triv101.html` and
  `pages/trivia-generator.html`).
- [x] **LemonSqueezy**: every standalone sellable product is wired with a live
  buy button and USD price — **68 of 74**. The remaining 6 are deliberate:
  `handbook` + `p18` (ebooks moving to KDP — pages kept, KDP links to be added
  later), `p3` T-shirt (set to Out of Stock, button off), `p7` Triv101 Premium
  (kept hidden), and `p51`/`p125` (retired singles that now redirect to their
  packs via meta-refresh + canonical: p51→p135 Valentine's 2-Pack,
  p125→p128 OHW 2-Pack). New
  products/packs (e.g. individual "The Year Was…" games) come after the DNS
  cutover. Per product:
  `ls-links.js` link + `node _tools/set-usd-price.js pNN <usd> [<sale>]`
  (full workflow in LEMONSQUEEZY-TODO.md).
- [x] **Handbook funnel**: both handbooks (Music Bingo Handbook at
  `/musicbingohandbook.html` and the Trivia Host Handbook at
  `/store/p18/fbthandbook.html`) are staged for Amazon KDP — not LemonSqueezy —
  for full royalty payouts. Pages show "Coming soon to Amazon" with a contact
  link. When KDP is live: set `KDP_HANDBOOK` in the Music Bingo Handbook page's
  inline script, and update p18's buy button href + unhide it.
- [ ] **Analytics**: the site currently has none (the dead AdWords tag was
  removed). Add GA4 / Plausible / Cloudflare Analytics now so launch week has
  data from day one.
- [ ] **Staging spot-check** on `https://tooniebuckerooni.github.io/...`:
  homepage, a product page, a category page, a blog post, the blog landing
  page, `/trivia-store.html`, an `/uploads/...` image, and a bogus URL (404).
- [ ] GitHub → Settings → Pages: Source = `main` / root. (Done? tick it.)

## Flip DNS (from the README, condensed)

- [ ] DNS at Squarespace Domains — either:
  - Plain GitHub Pages: `www` CNAME → `tooniebuckerooni.github.io`, apex A →
    `185.199.108.153 / .109 / .110 / .111`; or
  - Cloudflare in front (same stack as the other sites): nameservers →
    Cloudflare, proxied `CNAME www` + apex flattening, SSL/TLS = **Full**.
- [ ] GitHub → Settings → Pages → Custom domain = `www.fatcityentertainment.com`
  (this commits the CNAME file). Wait for the cert, then tick **Enforce HTTPS**.

## Within 24h after the flip

- [ ] Spot-check the same URL list on the real domain, plus:
  - `http://www.fatcityentertainment.com/...` → redirects to https
  - `https://fatcityentertainment.com/` (apex) → redirects to www
  - an old backlinked deep URL from Google search results goes straight through
- [ ] **One real LemonSqueezy purchase** (Gold Club) end to end, then refund it.
- [ ] Forms: submit the contact form, confirm the email arrives.
- [ ] **Google Search Console**: verify the domain property (DNS TXT), submit
  `https://www.fatcityentertainment.com/sitemap.xml`, then watch
  Coverage/Pages for a couple of weeks. Same-domain host moves don't need a
  Change of Address — the URLs didn't change.
- [ ] Watch 404s (Cloudflare analytics or GSC crawl stats) for any URL variant
  we missed.
- [ ] **Then** retire the Weebly subscription. Until DNS flips, Weebly stays
  live and nothing breaks; rollback = point DNS back at Weebly.

## Staged for the 2.0 rollout (not live yet)

- `pages/triv101.html` — fresh-branded TRIV101 web-app game-show placeholder
  (noindex). When ready: drop the noindex and either serve it at `/triv101.html`
  (replacing the legacy page — that URL has the backlinks) or link it from nav.
- `pages/trivia-generator.html` — Trivia Generator waitlist placeholder
  (noindex). Same deal; the legacy tool page is `/aitrivia.html`.
- The redesigned homepage/store/contact still live on branch
  `claude/fat-city-migration-t5xd8p` for incremental rollout after cutover.

## Decisions to make (flagged, not changed)

- ~~**`8j6e7n5n3y09.html` is in the sitemap and indexable.**~~ **Done.** Added
  `noindex` and removed it from `sitemap.xml`. Buyers keep their direct link.
- **USA-first, Canada-close:** prices are USD sitewide and LemonSqueezy (as
  merchant of record) handles both countries' taxes/exchange automatically.
  `yycevents.html` (Calgary) stays as the Canadian live-events page; a
  US-city equivalent landing page would be the cheap SEO win for fall.
- ~~Social previews~~: **Done.** `og:` tags added to homepage, Handbook,
  TRIV101 placeholder, and Trivia Generator placeholder. (Trivia Store and
  Gold Club already had them from Weebly.)
