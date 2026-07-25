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

### 2. `goldclubgames.html` — paid Gold Club content is indexable

The page is fully crawlable (no `noindex`, canonical present) and links
`music_bingo_gold.zip` + `music_bingo_gold_callsheets.zip` — the deliverables
for the **$329 Gold Club**. It's orphaned from nav, so nobody's linking it, but
nothing stops Google from indexing it and surfacing the zips in search.

This is exactly the case already handled for `8j6e7n5n3y09.html` (Triv101
Premium buyers' page), which got `<meta name="robots" content="noindex">` in the
launch pass. Same treatment belongs here — `goldclubgames.html` was just missed.

Caveat worth being clear-eyed about: static hosting can't actually *gate* those
zips, so `noindex` only stops discovery via search, not a direct link. That's the
same tradeoff already accepted for the Triv101 page. If the Gold Club is worth
hardening properly, that's a real project (signed URLs / a gated host), not a
line item.

### 3. `dashboard.html` — internal tool is indexable

"Triv101 - Question Approval Dashboard". An internal admin surface, orphaned but
crawlable. Add `noindex`.

---

## P1 — Worth doing this week

### 4. GA4 missing on two live pages

387 pages carry `G-LYMVV05F3X`, but these are live and untagged:

- **`musicbingohandbook.html`** — the Music Bingo Handbook sales funnel. This is
  a money page with no analytics on it, so the KDP funnel launches blind.
- **`404.html`** — tagging this is how you'd actually execute the
  "watch 404s post-flip" item on the launch checklist. With GA4 on the 404 page,
  every missed URL variant (see P0 #1) shows up as a pageview with its path.

The staged `pages/*.html` drafts are correctly untagged — leave them.

### 5. Five indexable pages are missing from `sitemap.xml`

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

### 7. Handbook funnel is still "Coming soon to Amazon"

Both handbook pages are staged and waiting on KDP, not on code:

- `musicbingohandbook.html` — `KDP_HANDBOOK = ""` at line 300. Set the Amazon
  URL and both buy buttons reveal themselves. Also set
  `window.LS_PRICES.handbook` in `assets/js/ls-links.js` (currently `""`) to
  show a price.
- `store/p18/fbthandbook.html` — "Buy on Amazon" button is `display:none` with a
  `.kdp-pending` notice. Set the href and unhide.

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

---

## Needs you (I can't reach these)

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
- **Currency** — zero `CA$` and zero `priceCurrency: CAD` left anywhere.
- **LemonSqueezy** — 69 wired; the 6 blanks are all deliberate (`p3` t-shirt out
  of stock, `p7` hidden, `p18`+`handbook` on KDP, `p51`/`p125` retired and
  redirecting).
- **No Weebly leftovers** — zero `weebly.com` references in served HTML.
- **No staging-URL leaks** — zero `tooniebuckerooni.github.io` references in
  HTML, XML, or txt.
- **Relative internal links** — `node _tools/check-links.js` → 397 pages,
  0 broken. (Absolute same-domain links are *not* covered; see P0 #1.)
- **robots.txt** — disallows `/_tools/`, points at the sitemap.

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

---

## Suggested order

1. ~~Generate the 180 legacy redirect stubs (P0 #1)~~ — **done**, see above.
2. `noindex` on `goldclubgames.html` + `dashboard.html` (P0 #2, #3) — two lines.
3. GA4 on `musicbingohandbook.html` + `404.html` (P1 #4) — the 404 tag turns
   "watch for missed URLs" into something you can actually measure.
4. Sitemap: add the three orphans (P1 #5).
5. Point the blog's share buttons at current URLs (P2 #6), so shares stop
   depending on the new redirects.
6. Teach `check-links.js` about absolute same-domain URLs, so #1 can't recur.
7. Then the live spot-checks and GSC submission, and retire Weebly.
