# Crawl / indexation fix — August 9, 2026

Branch `claude/search-console-crawl-failures-g5p2di`. Started from two Search
Console Coverage exports — "Alternate page with proper canonical tag" (24 URLs)
and "Crawled – currently not indexed" (112 URLs).

Neither report is actually a *crawl failure*. Googlebot reached all 136 URLs
fine. It just decided not to index them, which is worse, because a crawl error
is loud and this is silent.

---

## The root cause

GitHub Pages serves `foo/index.html` at **both** `/foo` and `/foo/`. It always
has, it can't be configured otherwise, and Pages can't issue a redirect to pick
one. So every directory page on this site has two live, identical URLs — about
380 of them. That is harmless right up until the site stops telling Google
which one is real. It had:

| Signal | said `/foo` | said `/foo/` |
|---|---|---|
| `rel=canonical` tags | 302 | 76 |
| `sitemap.xml` entries | 116 | 2 |
| internal links | 1453 | 218 |
| `publish-post.js` (new posts) | — | all |
| Twitter/Facebook share links in post bodies | — | all |

Google resolved the contradiction the way it always does — by picking for
itself, and picking badly:

1. It crawled `/foo/`, because that is what the blog landing page links.
2. It read the tag saying *"the real one is `/foo`"* and filed `/foo/` under
   **"Alternate page with proper canonical tag."** That status is normally
   benign; here it meant the URL Google actually had was demoted.
3. It crawled `/foo` — byte-identical, and with no more internal links pointing
   at it than the twin it had just demoted — and left it in **"Crawled –
   currently not indexed."**

Neither URL got indexed. The post was simply not in Google, with nothing in the
page itself wrong.

The dates confirm it. "Alternate page with proper canonical tag" sat at **0
until 24 July 2026**, hit 11 that day and **24 by 5 August** — and every single
one of those 23 blog URLs is a trailing-slash URL whose page declares a
slashless canonical. It was accelerating through the archive, newest posts
first.

---

## What shipped

### 1. One URL form, everywhere — `_tools/canonicalize-trailing-slash.js` (new)

24,495 references across 392 files, onto the **trailing-slash** form: canonical
tags, `og:url`, JSON-LD `url`/`mainEntityOfPage`, `fb:like` hrefs,
percent-encoded share links, every internal `href`, and 116 `sitemap.xml`
entries.

Trailing slash won because it is what Pages serves natively for a directory,
which makes it correct **whether or not** Pages 301s the slashless form — and
because the tooling and share links already used it, so it was the form the site
was drifting toward anyway.

Safety: a path only gets a slash if `<path>/index.html` genuinely exists on
disk. That one test is what makes 24k mechanical edits safe — it cannot touch a
`.html` URL, an asset, an external host, or a directory with no index (like
`/triviahostresources`, which Pages serves from `triviahostresources.html` and
which would 404 with a slash appended). Verified after the run: all 636 distinct
slash-terminated URLs in the diff resolve to a real file. Re-running reports 0
changes.

About 84% of that 24k is the Weebly sidebar, which links every post to ~90
monthly archives and ~15 categories. Worth knowing for its own sake — see
"Worth a look" below.

### 2. Listing shells made `noindex` — `_tools/noindex-blog-taxonomy.js` (extended)

The original pass covered two roots and left **104** listing pages indexable —
the single biggest slice of "Crawled – currently not indexed". Added: the
`/triviahostresources/previous/N` pagination chain (26), and the legacy
`whatsnew`/`inspiration`/`blog`/`4` category and archive trees (78). Now
**245/245** listing shells carry `noindex,follow`; 0 real posts affected.

Deliberately **not** noindexed: the legacy post duplicates (`/4/post/*`,
`/whatsnew/<slug>`, `/inspiration/<slug>`, `/blog/<slug>`). Those already carry
a `rel=canonical` to the live post. Stacking noindex on a canonical sends two
contradictory instructions and the usual outcome is that Google honours the
noindex, drops the page, and the canonical never gets to pass consolidated
signals to the real post. Canonical alone is right for a duplicate; noindex is
for a shell that is nobody's duplicate.

### 3. Sitemap now agrees with every page it lists

- `/index.html` → `/`. The sitemap was submitting a URL that the homepage's own
  canonical disowns — which is exactly why `/index.html` showed up in the
  "Alternate page" report.
- Four store files have `,` and `&` in the filename itself. Both are RFC 3986
  sub-delims, so `%2C` and `,` are *different URLs* to a crawler, and the site
  used the encoded form in the sitemap and most links but the raw form in the
  canonical tags. `_tools/normalize-url-encoding.js` (new) settles all of them
  on the encoded form (32 refs, 14 files).

Sitemap audit is now **226/226 clean**: nothing missing, nothing noindexed,
nothing whose canonical points elsewhere.

### 4. The 404s — deliberately left as 404s

11 reported URLs are genuinely gone (dead Weebly products, `/4/feed`,
`/store/p102/tvshows.html/1000`). **Zero of them are linked from any served
page** — they are old external inbound only, last crawled Feb–May.

A 404 is the correct answer for a URL that no longer exists, and GSC's
"Not found" is not a penalty. Manufacturing 11 thin redirect stubs would have
added 11 new thin pages to a site already being marked down for thin pages. Left
alone on purpose.

(Two of the twelve — `/store/p63/hairbands`, `/store/p62/goldenoldies` — turned
out not to be 404s at all: Pages serves `/foo` from `foo.html` as well, a third
live URL form worth remembering.)

---

## Where the 136 reported URLs stand now

| | Alternate page (24) | Crawled–not indexed (112) |
|---|---|---|
| now self-canonical, indexable | 20 | 22 |
| consolidates via canonical | 2 | 47 |
| now `noindex,follow` shell | 2 | 32 |
| genuine 404, correctly gone | — | 11 |

`check-links.js`: 636 pages, **0 broken refs**. `add-jsonld.js`,
`bake-buy-links.js` and `sitemap-lastmod.js` all produce byte-identical output
to their pre-change baseline (verified against a stash), so nothing here
disturbed structured data, buy buttons or lastmod dates.

**This will not be instant.** Google has to re-crawl and re-consolidate ~380
URLs. Expect the "Alternate page" count to fall over 2–6 weeks. Worth doing in
GSC now: Validate Fix on both reports, and resubmit `sitemap.xml`.

---

## Still open — needs you

### 16 pages Google crawled and declined to index, for content reasons

These are technically perfect: reachable, self-canonical, in the sitemap, not
blocked. Google looked and passed. No tooling change fixes this one — it is a
"this page doesn't earn a slot" judgment, and the fix is words on the page.

Ranked by how thin they are:

| words | page | note |
|---|---|---|
| 184 | `/store/p3/Fat_Bottom_Trivia_Host_T-shirt.html` | |
| 200 | `/store/p137/eventpayment.html` | probably shouldn't be indexable at all |
| 237 | `/officegames.html` | |
| 258 | `/store/p13/spn11.html` | |
| 305 | `/store/p135/valentinestriviapack.html` | |
| 343 | `/store/p133/cartoons.html` | |
| 344 | `/store/p100/Countries.html` | |
| 356 | `/store/p106/moviesoundtracks.html` | |
| 356 | `/store/p129/covertunes.html` | |
| **381** | **`/trivia-store.html`** | **the money page — fix this one first** |
| 427 | `/vrtriviaparty.html` | |
| 582 | `/yycevents.html` | |
| 677 | `/holidayparty.html` | |
| 687 | `/triviahostresources/one-of-the-funniest-...body-parts.../` | may resolve on its own |
| 825 | `/triviahostresources/a-night-at-the-movies-.../` | may resolve on its own |
| 897 | `/crypto.html` | |

The two blog posts were also caught in the two-URL split, so they may come back
on their own once consolidation lands — check them again before rewriting.

`/trivia-store.html` is the one that costs money. 381 words for a store landing
page competing against every trivia-pack retailer is under-armed.

`/store/p137/eventpayment.html` is a payment-handling page. Consider whether it
should be indexable at all rather than trying to bulk it up.

### Two pre-existing items, unrelated to this session

Both were already true at `HEAD` before any change here — flagging, not fixing,
since they touch buy links:

- `bake-buy-links.js` reports **3 buy buttons whose fallback would be revealed**
  on the next `--write` (i.e. 3 products with no `ls-links.js` entry). That is
  the known landmine in `CLAUDE.md`. Worth a look before the next product run.
- `add-jsonld.js --write` would rewrite **1 page**. Harmless, but it means the
  last run wasn't finished.

### `/triv101/surveys.html`

Still a 15-word meta-refresh stub that is self-canonical *and* in the sitemap —
it tells Google "index me" and then immediately redirects off-domain. Left as-is
because `TRIV101-POLISH.md` already tracks the real fix (bake actual survey
content into the page, per `GREENROOM-PLAN.md` §3) and pulling it from the
sitemap would hide something live. It didn't appear in either GSC report, so
it's not currently costing anything.

---

## Worth a look (not done, not obviously right)

Every blog post spends **~74 internal links** on `noindex` archive and category
shells — that is the Weebly sidebar, and it is now the large majority of the
site's internal linking. Those links no longer lead anywhere indexable. Trimming
the sidebar to, say, the current year plus the top categories would put a lot of
internal linking back onto actual posts. It is a visible design change to ~380
pages though, so it needs a decision rather than a script.

---

## Sandbox note

The egress proxy in the agent sandbox blocks **`www.fatcityentertainment.com`**
(403 on CONNECT), on top of the `api.cloudflare.com` / `*.workers.dev` block
already in `CLAUDE.md`. So none of the above was verified against the live site —
every claim here is from the repo contents plus the two GSC exports.

That is also why the trailing-slash direction was chosen to be correct under
*both* possible Pages behaviours rather than the one that looked likelier: it
couldn't be tested from here. If you ever want to confirm which it is:

```
curl -sI https://www.fatcityentertainment.com/triviahostresources/get-wild-with-zoo-rock-music-bingo-cards | head -3
```

301 means Pages redirects to the slash form; 200 means both forms serve. The fix
is right either way — but if it's 301, then the old slashless canonicals were
pointing every post at a redirect, which is the more severe reading of what was
happening.
