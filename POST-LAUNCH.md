# Post-DNS-switch punch list

The working list for fatcityentertainment.com now that DNS points at GitHub
Pages. Companion to [LAUNCH-CHECKLIST.md](LAUNCH-CHECKLIST.md), which covered
everything *up to* the cutover.

**Status:** `CNAME` = `www.fatcityentertainment.com` is committed on `main`, so
the custom domain is set and DNS is pointed. Last updated July 25, 2026.

> **One standing caveat:** this agent's sandbox can't reach
> `fatcityentertainment.com` — the network policy refuses the connection, which
> says nothing about whether the site is up. Everything below is verified against
> the repo (and, for layout, a real headless Chromium rendering local files).
> Anything needing the live domain or a vendor dashboard is under "Waiting on
> you".

---

# NEXT STEPS

## Waiting on you

Roughly in order of impact.

| # | What | Why it's blocking |
|---|---|---|
| 1 | **Trivia Host Handbook Amazon URL** → `KDP_LINKS.p18` in [`assets/js/ls-links.js`](assets/js/ls-links.js) | Book is live on Kindle + paperback; the page still says "coming soon". One string. |
| 2 | **New Gold Club artwork** → overwrite `uploads/4/3/3/6/43362499/s240281505130794070_p112_i8_w600.jpeg` | Current art says "ALL 45 Games and counting". All 11 pages share this one file, so replacing it updates everything. Match **600×400 JPEG** and no HTML changes are needed. |
| 3 | **Email Gold Club members their new download link** | The old zips are deleted, so a member who bookmarked a direct `.zip` URL now gets a bare 404 until that email lands. |
| 4 | **Spot-check the live domain** | apex → www, `http://` → `https://`, a deep blog URL, a couple of `/4/post/...` legacy URLs, a product page, an `/uploads/` image, and a bogus URL hitting `404.html`. |
| 5 | **Enforce HTTPS** — GitHub → Settings → Pages | Only available once the cert has issued. |
| 6 | **One real LemonSqueezy purchase** end to end, then refund | Proves checkout, delivery and the email. |
| 7 | **Submit the contact form** | Formspree is wired to `mojgvwzn` on all 7 forms, but only a real submit proves the inbox. |
| 8 | **Google Search Console** — verify the domain, submit `sitemap.xml` | Do it *after* the legacy redirects are live (they are), so Google recrawls into working URLs. |
| 9 | **Retire the Weebly subscription** | Last step, once 4–7 pass. |

Optional decisions, no rush:

- **Music Bingo Handbook Amazon URL** → `KDP_LINKS.handbook`, whenever it goes
  live. Left in "coming soon" mode deliberately.
- **Zoom Party (p140) sale price.** It used to advertise CA$500 → CA$375. It's
  now a plain `$295.00 USD` because I wouldn't invent a USD "was" price. To put
  the sale framing back, pick a real regular price and run
  `node _tools/set-usd-price.js p140 <regular> 295`.
- **Ship the staged 2.0 pages.** `pages/triv101.html` and
  `pages/trivia-generator.html` are finished, `noindex`, and unlinked. Serve them
  at `/triv101.html` and `/aitrivia.html` (inheriting the backlinks), or link
  them fresh from nav? Interacts with #2 below.

## Ready for me — say the word

| # | What | Size |
|---|---|---|
| 1 | Remove the retired **p51 tile** from the `c6` category (still priced `CA$19.99`, product is dead and redirects to p135) | small |
| 2 | Add the three sitemap orphans: `triv101.html` (**has the backlinks**), `aitrivia.html`, `host-resources.html` | small |
| 3 | Point the blog's **Twitter share buttons** at current URLs so shares stop relying on the legacy redirects | medium, mechanical |
| 4 | Teach `check-links.js` about **absolute same-domain URLs**, so the legacy-404 class of bug can't recur | small |
| 5 | Add `<lastmod>` to `sitemap.xml` | small |
| 6 | A **US-city landing page** — still the cheapest SEO win; `yycevents.html` (Calgary) is the only geo page | larger |

---

# DONE

## July 25, 2026

**180 legacy Weebly blog URLs were 404ing.** The old permalink scheme had no
equivalent on GitHub Pages — no `/4/` directory existed, so every one returned
the 404 page. Weebly used to redirect these automatically; a static host doesn't.

| Legacy scheme | URLs | Refs | → |
|---|---|---|---|
| `/4/post/YYYY/MM/<slug>.html` | 107 | 698 | `/triviahostresources/<slug>/` |
| `/4/archives/MM-YYYY` | 59 | 63 | `/triviahostresources/archives/MM-YYYY/` |
| `/4/category/<name>` | 14 | 78 | `/triviahostresources/category/<name>/` |

All 180 mapped 1:1 onto existing pages, so [`_tools/legacy-urls.js`](_tools/legacy-urls.js)
generates the stubs rather than hand-writing them. Each is `rel=canonical` plus a
0-second meta-refresh with a visible fallback link — the pattern already used for
the retired singles (`p51`→`p135`), and how Google reads a static host's soft 301.
Post stubs reuse the real post's `<title>`. Left crawlable on purpose: a
`robots.txt` disallow would stop Google from ever seeing the canonical.

This also hit the site internally — the Twitter share button on all 107 blog
posts emits a `/4/post/...` URL, so every social share pointed at a 404. Those
redirect now; "Ready for me" #3 would remove the dependency.

*Why the launch audit missed it:* `_tools/check-links.js:42` skips any href
starting with `https?:`, and these are absolute
`http://www.fatcityentertainment.com/4/post/...` URLs. "broken refs: 0" was true
about relative links and blind to same-domain absolute ones.

**Gold Club retired and locked down.** `goldclubgames.html` was fully crawlable
and linked `music_bingo_gold.zip` + `music_bingo_gold_callsheets.zip` — the $329
Gold Club deliverables. Both download blocks are gone, replaced with a notice
that the files are no longer hosted here and a fresh link for the new complete
pack is coming by email, plus a prominent contact button. `noindex` added,
matching `8j6e7n5n3y09.html`. Both zips were deleted from `uploads/` (still
recoverable from git history) — on static hosting that's the only way to actually
close off the direct URLs.

*Not redirected to `/contact.html` on purpose:* a member who bookmarked the page
and lands on a bare contact form has no idea why their downloads vanished. The
page explains it and offers the same destination one click away. It's `noindex`
and orphaned, so there's no SEO argument either. To switch anyway, add
`<meta http-equiv="refresh" content="0; url=/contact.html">`.

**Zoom Party (p140) was displaying the wrong price.** Its price area used
`wsite-com-product-show-price-range-on-sale`, whose CSS strikes through the
regular price, shows the *range* container, and **hides** the sale container — so
the page rendered ~~$295.00 USD~~ **CA$375.00**, presenting a stale Canadian
figure as the live price while LemonSqueezy charged $295 USD. Its `AggregateOffer`
also emitted `lowPrice 375 / highPrice 500` as USD.

Root cause was a silent failure in `_tools/set-usd-price.js`: its regex expected
the price span immediately after the container div, but range products carry
hidden `lowPrice`/`highPrice` spans first, so the replace never matched — it
printed a `warn:` and carried on, invisible in a bulk run. Tool fixed (scan
within the container, handle the `-range` class, keep `lowPrice`/`highPrice` in
sync) and p140 re-run. It was the only product with that markup.

**Store grid was breaking rows.** The product/category grids used `float: left`
columns. Tile heights vary because names wrap to one, two or three lines, and a
short tile leaves a notch the next tile drops into — after which nothing fits
beside it. On the Trivia Store category, Gold Club's one-line title made its tile
20px shorter than its neighbours and stranded "Decades" Music Bingo 5-Pack alone
on a row.

The group containers now use flex wrapping in
[`assets/css/site-extras.css`](assets/css/site-extras.css), so rows are real rows
and tiles can't snag; the existing `width: N%` rules still set how many fit, so
responsive behaviour is unchanged. Names reserve two lines to even out the common
case. Verified in Chromium across all 9 grid pages at 1440/768/390 px — full
rows, no stranding, no horizontal overflow. Trivia Store category went
`[4,1,4,2]` → `[4,4,3]`.

**Gold Club is 50 games.** The playlist page already listed all 50 (1–50); only
the summary copy said 45. Updated on `printmusicbingocards.html`,
`goldclubplaylists.html`, `virtualevents.html`, `store/p112/GoldClub.html`
(meta + og), `store/c11/musicdoboff/index.html`, `musicdoboffbingocards.html`.
The artwork still says 45 — see "Waiting on you" #2.

**Handbooks wired to one switch.** Both now read `window.KDP_LINKS` at the bottom
of `ls-links.js`; paste an Amazon URL and that page's button appears while the
"coming soon" note hides. Reuses the existing `ls-buy.js` pattern
(`.kdp-buy[data-product]` + sibling `.kdp-pending`), tested in both states. p18
dropped its `CA$8.00` price and CAD schema offer — Amazon owns the price, and it
differs between Kindle and paperback — so its page and all four listing tiles
read "On Amazon". The Music Bingo page's meta/OG copy said "Instant download",
wrong for a KDP title; now "On Amazon Kindle and paperback".

**Indexing and analytics.** `noindex` on `dashboard.html` (orphaned internal
Triv101 admin tool). GA4 `G-LYMVV05F3X` added to `musicbingohandbook.html` (a
sales funnel that was about to launch untracked) and `404.html` — the latter is
how "watch 404s post-flip" actually gets measured. Staged `pages/*.html` and the
180 redirect stubs stay untagged on purpose.

---

# Reference

## Verified clean

- **Formspree** — no `YOUR_FORM_ID` placeholders; all 7 forms → `mojgvwzn`.
- **LemonSqueezy** — 69 wired; the 6 blanks are deliberate (`p3` out of stock,
  `p7` hidden, `p18`+`handbook` on KDP, `p51`/`p125` retired and redirecting).
- **No Weebly leftovers** — zero `weebly.com` references in served HTML.
- **No staging-URL leaks** — zero `tooniebuckerooni.github.io` in HTML/XML/txt.
- **Relative internal links** — `node _tools/check-links.js` → 577 pages, 0
  broken. (Absolute same-domain links are *not* covered — "Ready for me" #4.)
- **Legacy URLs** — `node _tools/legacy-urls.js` → 180/180 mapped, 0 missing.
- **Sitemap** — 211 `<loc>`, all resolve. The four that look broken are just
  percent-encoded (`10%2C000__Q%26A_Pack_2.html`); those files exist. All 107
  blog posts present.
- **p112 pricing** — `$235.50 USD` consistent across page, listings, ls-links.
- **robots.txt** — disallows `/_tools/`, points at the sitemap.

## Two corrections worth remembering

Both were bad shell checks, and both are the reason to prefer the scripts above
over ad-hoc greps.

1. **"1,987 legacy references"** was inflated — that grep also swept
   `_tools/scraped/` (unserved migration copies). Real figure across served pages
   is 698. A reported legacy `/4/feed` RSS URL was scraped-only and needed no
   stub. The distinct-URL counts (107/59/14) were right. Cause: `grep -h`
   suppresses filenames, so a following `grep -v _tools` filtered *matched text*
   rather than paths, and silently did nothing.
2. **"Currency is clean — zero `CA$` anywhere"** was wrong. `grep "CA\$"` inside
   double quotes reaches grep as `CA$`, where `$` is an end-of-line anchor, so it
   matched nothing and looked like a pass. Use `grep -rlF 'CA$'`. The real state:
   32 served files contain `CA$`, mostly historical blog copy quoting old prices
   (fine to leave). The live commerce surfaces are fixed; what remains is `p51`,
   `p125`, `p7` (all retired, hidden, or redirecting) and the p51 tile in `c6`
   — "Ready for me" #1.

## Handy commands

```
node _tools/check-links.js                     # internal relative links
node _tools/legacy-urls.js                     # legacy /4/ URL mapping report
node _tools/set-usd-price.js pNN <usd> [sale]  # set a product's price everywhere
grep -rlF 'CA$' --include=*.html .             # find leftover CAD (note -F)
```
