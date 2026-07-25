# Post-DNS-switch punch list

The working list for fatcityentertainment.com now that DNS points at GitHub
Pages. Companion to [LAUNCH-CHECKLIST.md](LAUNCH-CHECKLIST.md), which covered
everything *up to* the cutover.

**Status:** `CNAME` = `www.fatcityentertainment.com` is committed on `main`, the
custom domain is set, DNS is pointed, **HTTPS is enforced**, and a **real
LemonSqueezy purchase and a real contact-form submission have both been confirmed
end to end**. Last updated July 25, 2026.

> **Deployed:** merged to `main` as a clean fast-forward on July 25, 2026
> (`1181905`); GitHub Pages `pages build and deployment` reported **success**.
> Before that merge none of this work was live — `main` is what Pages serves,
> which is why a `/4/post/...` URL still returned the 404 page while the stubs
> sat unmerged on the branch.
>
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
| 1 | **Spot-check the live domain** | Everything below shipped to `main` on July 25 and deployed successfully, but nothing has been confirmed against the real host. Concrete URL list below. |
| 2 | **Email Gold Club members their new download link** | The old zips are deleted, so a member who bookmarked a direct `.zip` URL gets a bare 404 until that email lands. |
| 3 | **Google Search Console** — verify the domain, submit `sitemap.xml` | Now safe: the legacy redirects are live, so Google recrawls into working URLs. |
| 4 | **Retire the Weebly subscription** | Last step, once #1 passes. |

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

### What "spot-check the live domain" actually means

The point is to prove the new host answers on the *real* domain for each **kind**
of URL, since a whole category can be broken while the homepage looks perfect.
Open these and confirm what's in the right column. Ten minutes, once.

| Paste this | Should happen |
|---|---|
| `fatcityentertainment.com` (no www) | lands on `https://www.fatcityentertainment.com` |
| `http://www.fatcityentertainment.com` | flips to `https://` |
| `https://www.fatcityentertainment.com/trivia-store.html` | store loads, product tiles in even rows |
| `https://www.fatcityentertainment.com/store/p112/GoldClub.html` | Gold Club page, `$235.50 USD`, working buy button |
| `https://www.fatcityentertainment.com/triviahostresources/get-wild-with-zoo-rock-music-bingo-cards/` | a blog post loads |
| `https://www.fatcityentertainment.com/4/post/2016/08/august-30th-2016.html` | **redirects** to `/triviahostresources/august-30th-2016/` |
| `https://www.fatcityentertainment.com/4/category/music-bingo` | **redirects** to the blog category |
| `https://www.fatcityentertainment.com/uploads/4/3/3/6/43362499/s240281505130794070_p112_i8_w600.jpeg` | the Gold Club image itself loads |
| `https://www.fatcityentertainment.com/this-page-does-not-exist` | your styled 404 page, not GitHub's |
| a Google result for `site:fatcityentertainment.com` | any old deep link goes straight through |

The two `/4/...` rows are the ones worth caring about most — they're the redirects
added on July 25 that nothing has confirmed against the live host yet. If those
work, the other 178 do.

## Ready for me — say the word

| # | What | Size |
|---|---|---|
| 1 | Add the three sitemap orphans: `triv101.html` (**has the backlinks**), `aitrivia.html`, `host-resources.html` | small |
| 2 | Point the blog's **Twitter share buttons** at current URLs so shares stop relying on the legacy redirects | medium, mechanical |
| 3 | Teach `check-links.js` about **absolute same-domain URLs**, so the legacy-404 class of bug can't recur | small |
| 4 | Add `<lastmod>` to `sitemap.xml` | small |
| 5 | A **US-city landing page** — still the cheapest SEO win; `yycevents.html` (Calgary) is the only geo page | larger |

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

**Handbooks wired to one switch, and the Trivia Host Handbook is live.** Both
handbooks read `window.KDP_LINKS` at the bottom of `ls-links.js`. An entry is
either a plain URL (one "Buy on Amazon" button) or `{kindle, paperback}` for
editions Amazon lists separately, which renders one labelled button per format —
the second is cloned from the first so it inherits the page's styling.

- **p18 (Trivia Host Handbook)** is live with both editions:
  Kindle `B0HBGJCX4M`, paperback `B0HB27K5RF`. Its `CA$8.00` price and CAD
  schema offer were removed — Amazon owns the price and it differs by format —
  so the page and all four listing tiles read "On Amazon".
- **Music Bingo Handbook** stays in coming-soon mode by request. Its meta/OG copy
  said "Instant download", wrong for a KDP title; now "On Amazon Kindle and
  paperback".

One styling catch worth remembering: the theme only gives buy buttons their
white-on-black text through `#wsite-com-product-add-to-cart.wsite-button-highlight`,
which out-specifies the green `#wsite-com-product-gen a` link colour. The cloned
button drops the duplicate `id`, so it came out with green text until
`site-extras.css` got a matching `.kdp-buy` rule.

**Form fields had unreadable names.** Weebly named every input after its internal
field id (`_u690125131196042535`), and Formspree labels each row of the
notification email with the input's `name` — so every enquiry arrived as a list of
18-digit numbers with no way to tell the name from the email from the notes.

Each field now takes its name from its own `<label>`: `name`, `email`, `phone`,
`guests`, `notes`, `show_name`, `venue_and_address`, `event_date`,
`interests[...]` and so on. `id`/`for` are untouched so label associations still
work, and no JS ever referenced the old names. Also: Weebly's empty
`wsite_subject` became Formspree's `_subject` with a real per-page value, so
notifications have a useful subject line, and the four inert Weebly hidden inputs
(`form_version`, `wsite_approved`, `ucfid`, `recaptcha_token`) were removed —
nothing sets them now, and they'd otherwise be empty rows in every email.

Rerun or preview any time with [`_tools/fix-form-fields.js`](_tools/fix-form-fields.js)
(no flag = dry run). Verified in Chromium across all 5 forms: readable FormData
keys, zero orphaned labels, action still the Formspree endpoint.

**Nav dropdowns were invisible.** Hovering "Our Games" showed nothing. The hover
was working the whole time — the dropdown was laid out at full size (265×185) and
then clipped to nothing, so it was never painted.

The theme sets `.nav ul { overflow: hidden }` to stop a long menu spilling past its
max-width. Weebly's JS used to lift the flyouts *out* of that container before
showing them (`_moveFlyout` in `files/theme/custom.js` relocates `#wsite-menus`
into `.birdseye-header`), so the clip never applied. The migration swapped those JS
flyouts for pure CSS but left them where they sit in the markup — inside the
clipped `<ul>`. `.nav ul` matches the submenu `<ul>`s too, so the third-level
flyouts ("Fat Bottom Trivia →") were clipped by their own parent for the same
reason. Both levels now get `overflow: visible`, scoped to `.desktop-nav`.

Once visible the panel was unreadable: the migration had given it a `#1d1d1d`
background while the links kept the theme's black text. The theme *does* style
these flyouts — white panel, 1px black border, black uppercase Montserrat, faint
grey hover — but scoped to `#wsite-menus`, which these never matched. That styling
is now mirrored rather than keeping the invented dark panel.

Verified at 1440px across 11 page types (both header variants, store, product,
category, blog landing, blog post, contact, about, faqs): painted and
hit-testable via `elementFromPoint` on every one, third-level flyout painted, no
horizontal overflow from 1000–1600px, mobile menu unaffected.

**"ALL 50 GAMES" artwork installed.** The uploaded 600×402 PNG was converted to the
canonical 600×400 JPEG at `s240281505130794070_p112_i8_w600.jpeg` — the single file
all 11 pages showing the Gold Club tile reference, so the new art appears
everywhere with no HTML changes (38 KB, versus the 39 KB it replaced).

**Retired p51's tile removed** from the `c6` category, where it still advertised
`CA$19.99` — the last CAD price on a live selling surface. Worth recording since
it's easy to mix up: **p51 is "Fat Bottom Trivia 3.1 Love & Lust"**, a Valentine's
trivia game show, *not* One Hit Wonders 2, and it already redirected to p135
(Valentine's Day Trivia 2-Pack). One Hit Wonders 2 is **p125**, already redirecting
to p128 (One Hit Wonders 2-Pack). Both retired singles were already pointing at
their matching packs; only the stale tile needed removing.

**Indexing and analytics.** `noindex` on `dashboard.html` (orphaned internal
Triv101 admin tool). GA4 `G-LYMVV05F3X` added to `musicbingohandbook.html` (a
sales funnel that was about to launch untracked) and `404.html` — the latter is
how "watch 404s post-flip" actually gets measured. Staged `pages/*.html` and the
180 redirect stubs stay untagged on purpose.

---

# Reference

## Verified clean

- **Formspree** — no `YOUR_FORM_ID` placeholders; all 7 forms → `mojgvwzn`, all
  submitting readable field names. Live submit confirmed working.
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
