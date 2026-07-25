# Post-DNS-switch punch list

Audited July 25, 2026 against the repo at `main` (`77ceea2`). Companion to
[LAUNCH-CHECKLIST.md](LAUNCH-CHECKLIST.md), which covered everything *up to*
the cutover. This file covers what's left *after* it.

**Cutover status:** `CNAME` = `www.fatcityentertainment.com` is committed on
`main`, so the GitHub Pages custom domain has been set and DNS has been pointed.
Everything below assumes the site is live on the real domain.

> **Note on live verification:** this agent's sandbox can't reach
> `fatcityentertainment.com` (the network policy 403s the CONNECT), so every
> finding here is derived from the repo, not from hitting the live site. The
> items under "Needs you (I can't reach these)" are the ones that genuinely
> require a browser or a vendor dashboard.

---

## P0 — Real bugs, losing traffic right now

### 1. ~~180 legacy Weebly blog URLs 404 (no redirects exist)~~ — **DONE**

**Fixed July 25, 2026.** 180 redirect stubs generated under `/4/`; see
"What shipped" below.

The blog used to live at Weebly's old permalink scheme, and **nothing served
those paths on GitHub Pages** — there was no `/4/` directory, so every one of
these returned the 404 page:

| Legacy scheme | Distinct URLs | Refs in served HTML | Maps to |
|---|---|---|---|
| `/4/post/YYYY/MM/<slug>.html` | 107 | 698 | `/triviahostresources/<slug>/` |
| `/4/archives/MM-YYYY` | 59 | 63 | `/triviahostresources/archives/MM-YYYY/` |
| `/4/category/<name>` | 14 | 78 | `/triviahostresources/category/<name>/` |

**All 180 map 1:1 onto pages that already exist — verified, zero misses.** The
slugs, archive months, and category names are all identical; only the prefix
changed, which is what made this fully mechanical.

Why it mattered twice over:

- **External:** these were the site's live blog URLs for years (2016–2024).
  Weebly redirected them to the current scheme automatically; GitHub Pages
  doesn't. Any Google-indexed copy or inbound backlink on the old scheme
  dead-ended.
- **Internal:** the Twitter share button on **every one of the 107 blog posts**
  emits a `/4/post/...` URL, so every social share from the blog pointed at a
  404. Those now redirect — but see P2 #6, the buttons should really emit the
  current URL directly.

**Why the launch check missed it:** `_tools/check-links.js:42` skips any href
starting with `https?:`, and these are written as absolute
`http://www.fatcityentertainment.com/4/post/...` URLs. The checker reports
"broken refs: 0" and is correct about relative links — it simply never looked
at same-domain absolute ones. Worth teaching it to treat
`fatcityentertainment.com` absolute URLs as internal, or this class of bug
stays invisible.

> **Counts corrected.** An earlier draft of this file said 1,987 `/4/post/`
> references. That number came from a grep that also swept `_tools/scraped/`
> (the unserved migration copies), so it was inflated — the real figure across
> served pages is 698. It also reported a legacy `/4/feed` RSS URL; that turned
> out to be scraped-only and referenced nowhere in the served site, so no feed
> stub was needed. The distinct-URL counts (107 / 59 / 14) were right.

### 2. ~~`goldclubgames.html` — paid Gold Club content is indexable~~ — **DONE**

**Retired July 25, 2026.** The page was fully crawlable (no `noindex`) and linked
`music_bingo_gold.zip` + `music_bingo_gold_callsheets.zip` — the deliverables for
the **$329 Gold Club**. Both download blocks are gone, replaced with a notice
that the 11/2025 downloads are retired and members will be emailed a fresh link
for the new complete Gold Pack. The page now carries
`<meta name="robots" content="noindex">`, matching `8j6e7n5n3y09.html`.

**The zip files are gone too.** `music_bingo_gold.zip` (5.4 MB) and
`music_bingo_gold_callsheets.zip` (1.8 MB) were deleted from
`uploads/4/3/3/6/43362499/` on July 25, 2026, so the direct URLs no longer
resolve — which is the only way to actually close that off on static hosting.
They remain recoverable from git history if ever needed.

**On redirecting the page to `/contact.html`:** deliberately not done. A member
who bookmarked this page and gets bounced to a bare contact form has no idea why
their downloads vanished or what to write. The page instead explains what
happened, says a fresh link is coming by email at no charge, and offers a
prominent "Contact us about your Gold Club access" button — same destination,
with the context a redirect would throw away. It's `noindex` and orphaned, so
there's no SEO reason to prefer a redirect. If you'd still rather it bounce,
it's one line: `<meta http-equiv="refresh" content="0; url=/contact.html">`.

### 3. ~~`dashboard.html` — internal tool is indexable~~ — **DONE**

"Triv101 - Question Approval Dashboard", an orphaned internal admin surface.
`noindex` added July 25, 2026.

### 4. Zoom Party (p140) was showing a CAD price on a live USD product — **DONE**

Found while re-checking the currency claim below. `store/p140/virtualeventpayment.html`
had `class="wsite-com-product-show-price-range-on-sale"`, and that CSS
(`files/main_style.css`) strikes through `#wsite-com-product-price` while
displaying `#wsite-com-product-price-range` and **hiding** the sale container. The
page therefore rendered ~~$295.00 USD~~ **CA$375.00** — showing a stale Canadian
price as the live one on a $295 product, while LemonSqueezy charged $295 USD. Its
`AggregateOffer` also still emitted `lowPrice 375 / highPrice 500` as USD.

Root cause was a silent failure in `_tools/set-usd-price.js`: its price-container
regex expected `<span class="wsite-com-product-price-amount">` immediately after
the container div, but range products carry hidden `lowPrice`/`highPrice` spans
first, so the replace never matched. It printed a `warn:` line and carried on —
easy to miss in a bulk wiring run. The area-class regex missed the `-range`
variant for the same reason.

Fixed the tool (scan within the container instead of anchoring to its opening
tag; handle the `-range` class; keep `lowPrice`/`highPrice` in sync), then re-ran
`node _tools/set-usd-price.js p140 295`. p140 now shows a plain `$295.00 USD`.

**Note:** p140 previously advertised a sale (CA$500 → CA$375). I did **not**
invent a USD "was" price to cross out, so the On Sale framing is gone. If you
want it back, pick a real regular price and run
`node _tools/set-usd-price.js p140 <regular> 295`.

p140 was the only product with this markup — every other product page was
checked.

---

## P1 — Worth doing this week

### 5. ~~GA4 missing on two live pages~~ — **DONE**

`G-LYMVV05F3X` added July 25, 2026 to:

- **`musicbingohandbook.html`** — the Music Bingo Handbook sales funnel, which
  was about to launch its KDP funnel with no analytics on it.
- **`404.html`** — this is how the "watch 404s post-flip" item actually gets
  executed: every missed URL variant now shows up as a pageview with its path.

The staged `pages/*.html` drafts remain untagged on purpose, as do the 180
redirect stubs (they bounce in 0s, so a tag wouldn't fire reliably).

### 6. Five indexable pages are missing from `sitemap.xml`

`sitemap.xml` has 211 `<loc>` entries and all of them resolve (the four that
look broken are just percent-encoded — `10%2C000__Q%26A_Pack_2.html` etc. —
those files exist). But these five are indexable, canonical'd, and absent:

- `triv101.html` — **has the backlinks**, per the launch checklist's own note
- `aitrivia.html` — the legacy Trivia Generator page
- `host-resources.html`
- `goldclubgames.html` — leave out; see P0 #2, it should be `noindex`
- `dashboard.html` — leave out; see P0 #3, it should be `noindex`

So: add the first three, and the last two get excluded on purpose once
noindexed. Correctly excluded already: `404.html`,
`8j6e7n5n3y09.html`, `bingocardgenerator-337083.html`.

All 107 blog posts are present — no gaps there.

---

## P2 — Growth / cleanup, not urgent

### 6. `http://` self-links cost an extra redirect hop

23 blog files contain `http://www.fatcityentertainment.com/...` links (mostly
inside the same Twitter share buttons from P0 #1). These work — they just
301 to https first. Cheapest to fix in the same pass as the redirect stubs.
No true mixed content anywhere: **zero** `src="http://..."` subresources, so
nothing gets blocked.

### 7. Handbook funnels — both now wired, waiting only on Amazon URLs

Reworked July 25, 2026 so both handbooks switch on from **one place**:
`window.KDP_LINKS` at the bottom of [`assets/js/ls-links.js`](assets/js/ls-links.js).

```js
window.KDP_LINKS = {
  "handbook": "", // Music Bingo Handbook  -> /musicbingohandbook.html
  "p18": "",      // Trivia Host Handbook  -> /store/p18/fbthandbook.html
};
```

Paste a product's Amazon URL between its quotes and that page's "Buy on Amazon"
button appears and the "coming soon" note hides itself. Leave it `""` and the
page stays in coming-soon mode. Nothing else to edit, and no price to set —
Amazon sets that, and it differs between Kindle and paperback.

- **Trivia Host Handbook (p18)** — live on Kindle + paperback; **needs its URL**.
  Its old `CA$8.00` price and CAD schema.org offer were removed (Amazon owns the
  price now); the page and all four listings read "On Amazon".
- **Music Bingo Handbook** — deliberately left in "coming soon" mode. Its page
  previously advertised "Instant download", which is wrong for a KDP title; the
  meta/OG copy now says "On Amazon Kindle and paperback".

Mechanically this reuses the existing `ls-buy.js` pattern (`.kdp-buy[data-product]`
+ a sibling `.kdp-pending`), so it behaves like every other buy button. Both
states were tested against a stubbed DOM.

If Kindle and paperback need *separate* buttons rather than one Amazon link,
that's a small addition — say the word.

### 8. Ship the staged 2.0 pages

`pages/triv101.html` and `pages/trivia-generator.html` are finished, `noindex`,
and unlinked. The decision the checklist flagged is still open: serve them at
`/triv101.html` and `/aitrivia.html` (inheriting the backlinks) or link them
fresh from nav. Note this interacts with P1 #5 — if `triv101.html` gets
replaced, add the new one to the sitemap instead.

The redesigned homepage/store/contact are still parked on
`claude/fat-city-migration-t5xd8p` for incremental rollout.

### 9. US-city landing page

Still the cheapest SEO win on the board, per the launch checklist. Prices went
USD-first and `yycevents.html` (Calgary) remains the only live-events geo page.

### 10. `sitemap.xml` has no `<lastmod>` on any entry

Minor. Adding real dates helps recrawl prioritization, which is worth a little
more than usual right after a host move.

### 11. Retired p51 still has a priced tile in the `c6` category

`store/c6/triviagameshows/index.html` still lists "FBT 3.1 Valentine's Day
Special" at `CA$19.99`. p51 is retired and meta-refreshes to p135 (Valentine's
2-Pack), so the tile leads somewhere valid but advertises a dead product at a
stale Canadian price. Removing the tile is the clean fix — left alone because
which products appear in a category is a merchandising call, not a bug fix.

---

## Needs you (I can't reach these)

- **The Trivia Host Handbook's Amazon URL** → `KDP_LINKS.p18` in
  `assets/js/ls-links.js`. The book is live on Kindle and paperback; the page
  says "coming soon" until that string is filled in.
- **Send the Gold Club members their new download link.** The old zips are
  deleted, so any member who bookmarked a direct file URL now gets a 404 with no
  explanation until that email goes out. The page explains it; a bookmarked
  `.zip` can't.
- **Spot-check the live domain** — the pre-flip staging spot-check and the
  post-flip URL sweep are both still unticked in LAUNCH-CHECKLIST.md. Confirm:
  apex → www, http → https, a deep blog URL, a product page, an `/uploads/`
  image, and a bogus URL hitting `404.html`.
- **Enforce HTTPS** — GitHub → Settings → Pages, once the cert has issued.
- **One real LemonSqueezy purchase** end to end (Gold Club), then refund.
- **Submit the contact form** and confirm the email lands. Formspree is wired to
  `mojgvwzn` on all 7 forms, but only a real submit proves the inbox.
- **Google Search Console** — verify the domain property, submit
  `https://www.fatcityentertainment.com/sitemap.xml`. Do this *after* P0 #1
  ships so the legacy URLs resolve before Google recrawls them.
- **Retire the Weebly subscription** — last step, once the above passes.

---

## Verified clean (don't re-audit)

Checked this pass, all good:

- **Formspree** — no `YOUR_FORM_ID` placeholders left; all 7 forms → `mojgvwzn`.
- **LemonSqueezy** — 69 wired; the 6 blanks are all deliberate (`p3` t-shirt out
  of stock, `p7` hidden, `p18`+`handbook` on KDP, `p51`/`p125` retired and
  redirecting).
- **No Weebly leftovers** — zero `weebly.com` references in served HTML.
- **No staging-URL leaks** — zero `tooniebuckerooni.github.io` references in
  HTML, XML, or txt.
- **Relative internal links** — `node _tools/check-links.js` → 397 pages,
  0 broken. (Absolute same-domain links are *not* covered; see P0 #1.)
- **robots.txt** — disallows `/_tools/`, points at the sitemap.

### Correction: "currency" was **not** clean

An earlier version of this file listed "zero `CA$` and zero `priceCurrency: CAD`
left anywhere" as verified. That was wrong — it came from a broken shell check.
`grep "CA\$"` inside double quotes reaches grep as `CA$`, where `$` is an
end-of-line anchor, so it matched nothing and looked like a pass. The real state:

- **32 served files contain `CA$`.** Most are historical blog posts and archive
  pages quoting old prices in editorial copy — those are fine to leave.
- **The live commerce surfaces have been fixed:** p140 (see P0 #4) and the p18
  handbook, whose `CA$8.00` appeared on `trivia-store.html` and three category
  listings and now reads "On Amazon".
- **Still showing CAD, all on non-selling pages:** `p51` and `p125` (retired,
  meta-refresh to their packs), `p7` (hidden/noindex), and a stale **p51 tile in
  the `c6` category listing** still priced `CA$19.99` — that last one is a live
  category page, so it's worth a look (see P2 #11).

Verify with `grep -rlF 'CA$' --include=*.html .` — note the `-F`.

---

## What shipped

**July 25, 2026 — legacy blog redirects (P0 #1).** 180 stubs generated under
`/4/` by [`_tools/legacy-urls.js`](_tools/legacy-urls.js):

- `/4/post/YYYY/MM/<slug>.html` → a file at that exact path (107)
- `/4/archives/MM-YYYY` and `/4/category/<name>` → `<dir>/index.html`, matching
  how the real archive and category pages are already laid out (73)

Each stub is `rel=canonical` + a 0-second `<meta http-equiv="refresh">` to its
target, plus a visible fallback link — the same pattern used for the retired
singles (`p51`→`p135`, `p125`→`p128`), which is how Google reads a static host's
soft 301. Post stubs reuse the real post's `<title>` so they aren't content-free
dead ends. The stubs are deliberately left crawlable — a `robots.txt` disallow
would stop Google from ever seeing the canonical.

Verified: all 180 stubs exist, every refresh target resolves on disk, every
canonical matches its refresh target, and `check-links.js` is clean at 577 pages
/ 0 broken refs. Re-run the report any time with `node _tools/legacy-urls.js`
(no flag = report only; it exits non-zero if any legacy URL is unmapped or its
target is missing).

Not yet verified against the live domain — this sandbox can't reach it. Worth
curling two or three `/4/post/...` URLs once you can.

**July 25, 2026 — Gold Club sunset, indexing, analytics, KDP wiring.**

- `goldclubgames.html` download blocks replaced with a members notice; `noindex`
  added (P0 #2). The zip files themselves are still on disk — decision pending.
- `dashboard.html` `noindex` (P0 #3).
- p140 repriced to a plain `$295.00 USD`, and `set-usd-price.js` fixed so the
  range-layout bug that caused it can't silently recur (P0 #4).
- GA4 on `musicbingohandbook.html` and `404.html` (P1 #5).
- Both handbooks now switch on from `KDP_LINKS` in `ls-links.js` (P2 #7).

Verified after all of it: `check-links.js` clean at 577 pages / 0 broken refs,
`legacy-urls.js` still 180/180 mapped, all four JS files parse, and the KDP
button was exercised in both the link-set and no-link states.

---

## Suggested order

1. ~~Generate the 180 legacy redirect stubs (P0 #1)~~ — **done**.
2. ~~`noindex` on `goldclubgames.html` + `dashboard.html` (P0 #2, #3)~~ — **done**.
3. ~~GA4 on `musicbingohandbook.html` + `404.html` (P1 #5)~~ — **done**.
4. **Paste the Trivia Host Handbook's Amazon URL** into `KDP_LINKS.p18` — it's
   live on Amazon right now and the page still says "coming soon".
5. Email Gold Club members their new download link — the old zips are deleted.
6. Sitemap: add the three orphans (P1 #6).
7. Point the blog's share buttons at current URLs (P2 #8), so shares stop
   depending on the new redirects.
8. Teach `check-links.js` about absolute same-domain URLs, so P0 #1 can't recur.
9. Then the live spot-checks and GSC submission, and retire Weebly.
