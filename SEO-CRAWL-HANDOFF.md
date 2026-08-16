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
URLs. Expect the "Alternate page" count to fall over 2–6 weeks.

### About "Validate Fix" on these two reports

**Correction (Round 3): Search Console does offer Validate Fix on "Alternate
page with proper canonical tag."** An earlier draft of this doc said it
generally would not, on the grounds that the status is an informational
exclusion rather than an error. That was wrong, and the owner started a
validation on the strength of it. The *timing* advice below was right; the claim
about the button was not.

One thing that is true and matters more: **that report can never validate to
zero, and should not.** "Alternate page with proper canonical tag" is the
*correct* status for a URL that genuinely is a duplicate pointing at its
original. Two of the 24 will stay in that bucket permanently and rightly:

| URL | canonical | why it stays |
|---|---|---|
| `/index.html` | `/` | the homepage has two URLs; this is the right resolution |
| `/store/c1/triviastore/` | `/trivia-store.html` | store category folds into the store page |

So judge that report by *which* URLs are in it, not by the count. The blog posts
leaving it is the win. A residual count of two or three is the healthy end state.

Expect **"Page with redirect" to go up** as this lands, and do not be alarmed —
that is the slashless URLs correctly resolving as redirects to a single
destination instead of competing as duplicates. It is what success looks like.

So the honest sequence is:

1. **Resubmit `sitemap.xml`** in GSC. This is the real lever — 116 of its URLs
   changed form, and it's how you tell Google the canonical set moved.
2. **URL Inspection → Request Indexing** on your highest-value URLs, one at a
   time. The daily quota is small (~10), so spend it deliberately:
   `/trivia-store.html` first, then the marketing pages that were rewritten,
   then a couple of the blog posts from the "Alternate page" list to seed the
   pattern. Don't burn it on archive shells.
3. **If a Validate Fix button *is* offered** on either report in your account —
   the UI does vary — press it, but only now that everything is live. Starting a
   validation while fixes are still landing is what makes it fail and reset the
   clock, which is probably what cost two weeks last time.
4. **Re-export both reports in ~3 weeks** and hand them back to me. The
   comparison is what tells us whether consolidation actually happened, and it's
   far more useful than watching the graph daily.

The thing to watch is not the total. It's whether the *trailing-slash* URLs stop
appearing under "Alternate page" — that specific movement is the proof the fix
worked.

---

---

# Round 2 (same day) — the content pass

The 16 pages above were "crawled and declined". Word count was the symptom, not
always the diagnosis. Three different things were going on.

## Shipped: five pages rewritten

New tool `_tools/add-page-copy.js` + partials in `_content/copy/`. Copy lives as
plain semantic HTML and gets injected before the footer inside
`<!-- fce:copy -->` markers, styled by `.fce-copy` in `site-extras.css`. Edit
the partial, re-run, done — the Weebly table scaffolding is never touched by
hand.

| page | before | after |
|---|---|---|
| `/trivia-store.html` | 381 | **1058** |
| `/officegames.html` | 237 | **824** |
| `/holidayparty.html` | 677 | **1241** |
| `/yycevents.html` | 582 | **1109** |
| `/vrtriviaparty.html` | 427 | **964** |

That lands them alongside the site's own strongest pages
(`musicbingonearme.html` 745, `printmusicbingocards.html` 1150) rather than at
some arbitrary target. Every claim is grounded in something already on the site
— formats, what's in a download, how a night runs, how to choose. **No invented
customer counts, testimonials or guarantees, and no hard prices in the prose**,
so a price change can't silently make a page wrong.

## Shipped: two stale facts, which mattered more than length

- **`/yycevents.html` was advertising "Calgary Christmas Party Entertainment
  2022!"** — four years out of date, on a page whose whole job is booking this
  year's party. Now year-agnostic so it can't rot again. That, not the word
  count, is the likeliest reason Google was refusing it.
- **`/vrtriviaparty.html` recommended Mixer.com**, which Microsoft shut down in
  2020, in both the body copy and a form hint. Removed.

Still carrying a Mixer reference: the 2020 post
`/triviahostresources/8-ways-to-take-your-trivia-event-completely-virtual-with-online-streaming-tools/`.
Left alone — it's a dated article rather than live advice, but if you want it
accurate it needs an editorial pass, not a find-and-replace.

## Shipped: `/store/p137/eventpayment.html` de-indexed

"Consult Hour" is a booking-deposit checkout endpoint. Nobody searches for it and
landing on it from Google is confusing. Now `noindex,follow` **and removed from
sitemap.xml** — noindex plus a sitemap entry is the same contradiction this whole
session has been unwinding. One line in the page and one block in the sitemap;
trivially reversible if you disagree.

`/store/p140/virtualeventpayment.html` was deliberately **left indexed** — "Zoom
Party — Music Bingo, Trivia, Comedy" is a real product with real search demand,
not a utility page. Fixed a typo in its `<title>` ("entertainement") while there.

## Not shipped: the 83 product pages — I need something from you

`/store/p3`, `p13`, `p100`, `p106`, `p129`, `p133`, `p135` were on the list. I
have not padded them, on purpose.

**Every one of the 83 product pages is 184–450 words, and ~90% of that is
identical boilerplate.** Strip the shared shell and each page has roughly *forty*
unique words: a theme line, "answers are X", a song count and a runtime. Google
flagged nine of them because it happened to crawl those nine — hand-writing nine
and leaving seventy-four identical would be arbitrary, and adding a templated
block to all 83 would add *duplicate* content and make the problem worse.

The content that would genuinely fix these is the one thing that isn't in the
repo: **the track list for each pack.** "What songs are in Cover Tunes music
bingo" is a real query with real intent, and it is unique per product by
definition. The lists live inside the purchased PDFs, and the Spotify playlists
are unreachable from the agent sandbox (proxy blocks `open.spotify.com` too).

**What I need:** a partial track list per pack — ten or fifteen of the ~25–39
songs is plenty, enough to be useful in search without giving away the callsheet
people are paying for. Any format: a spreadsheet, one text file per game, pasted
into a message. Once that exists I can generate all 83 pages in one pass and
keep them consistent from then on. It's also your call whether partial lists are
something you want public at all — that's a business decision, not an SEO one.

## Not shipped: `/crypto.html` — more words is the wrong fix

897 words, and almost all of them are a generic explainer about what
cryptocurrency *is* — peer-to-peer networks, decentralised currency, no
government. That is not content about your business, it is filler that a
thousand better sites already cover, and lengthening it would make it worse.

The actual business fact on the page is one sentence: you accept crypto, email
`crypto@fatcityentertainment.com`. To make this page worth indexing it needs to
answer *your* customer's questions — which coins you take, whether it applies to
game downloads or event bookings or both, how a refund works, how the price is
locked. I don't know any of those answers and I'm not going to invent payment
terms. Tell me and I'll rewrite it; otherwise the honest option is to trim it to
the useful sentence and stop trying to rank it.

## The two blog posts

`/triviahostresources/one-of-the-funniest-...body-parts.../` (687 words) and
`/triviahostresources/a-night-at-the-movies-.../` (825 words) were both caught in
the two-URL split — they are the two trailing-slash URLs that showed up in the
*crawled-not-indexed* report rather than the alternate-canonical one. They are
reasonable length already. **Recheck these after consolidation lands before
rewriting anything** — there's a good chance they come back on their own, and
rewriting a post that was never the problem is wasted effort.

---

## Still open — needs you

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

---

# Round 3 — the redirect question, answered

## GitHub Pages **does** 301 the slashless form. Confirmed, not inferred.

The "Page with redirect" export (8 URLs, 9 Aug) contains three slashless
directory URLs:

```
/triviahostresources/creating-the-perfect-music-bingo-sheet-a-video-tutorial
/triviahostresources/fat-bottom-trivia-season-four-is-making-its-grand-debut
/triviahostresources/archives/06-2018
```

All three are directories with an `index.html`, and Google classifies them as
**redirects**. That is the observation this whole branch was missing.

It settles the open question at the bottom of Round 1, and it settles it the
severe way: **every one of the 302 slashless `rel=canonical` tags was pointing at
a URL that 301-redirects.** A canonical that names a redirect is not a weak
signal, it is an invalid one — Google discards it and picks its own canonical.
That is the mechanism that removed working posts from the index, and the
trailing-slash direction was not merely the safer choice, it was the only correct
one.

The other five URLs in that report are all working as intended: `http://` →
`https://`, apex → `www`, and two deliberate stubs. "Page with redirect" is an
informational status, it has hovered between 5 and 17 all year, and it needs no
action.

## Bug found and fixed: `/triv101.html` pointed at the wrong page

Commit `e89c724` ("Add redirect stubs for 6 dead top-level marketing pages")
treated `triv101.html` as a dead marketing page and pointed it — canonical and
meta-refresh both — at `/partyentertainment.html`.

But `triv101.html` was never dead. It **moved to `/triv101/`**, which is live, is
what the nav links to, and is the actual game. So anyone arriving on the old URL
from a share, a bookmark or a search result was being dropped on a generic "Our
Games" page, and every ranking signal the old URL had accumulated was being
consolidated into `partyentertainment.html` instead of into the game.

Now points at `/triv101/`. Audited the other twelve top-level stubs the same way
— checking whether a directory of the same name exists as the true successor —
and `triv101.html` was the only one wrong. The rest are correctly targeted.

## Still outstanding: the actual "Redirect error" report

The Search Console email named **Redirect error**; the export supplied was the
adjacent **Page with redirect** report. They are different, and only the first
one is an error class with a Validate Fix button.

Best current theory, now that the 301 behaviour is confirmed: before this branch,
a legacy URL could chain
`http://` → *301* → `https://` → *301* → `www` → *meta-refresh* →
`/foo` → *301* → `/foo/`. Mixing meta-refresh with 301s across four or five hops
is exactly what trips "Redirect error", and there are 228 meta-refresh stubs on
the site. Every one of them now points straight at the terminal slash form, so
the chains are one hop shorter than they were.

That is a theory with a mechanism, not a diagnosis. To confirm it: Search Console
→ Indexing → Pages → **Redirect error** row → Export.

---

# Round 4 — the "Redirect error" report, explained

Three URLs, all slashless directory forms under `/triviahostresources/`:

```
/and-then-there-was-hair-music-bingo                                          crawled 2026-08-02
/how-to-host-fat-bottom-trivia-presentations-...-6-steps                      crawled 2026-07-31
/music-bingo-cards-or-game-show-presentations-to-entertain-guests             crawled 2026-07-31
```

All three back healthy posts — real content, no meta-refresh, no noindex, in the
sitemap. Nothing wrong with the pages.

## The mechanism: a canonical/redirect ping-pong

With the 301 behaviour now confirmed, the pre-fix state for these was a genuine
loop, not merely a chain:

```
Googlebot asks for  /foo
   -> 301 -> /foo/
   -> /foo/ serves a page whose rel=canonical says "the real URL is /foo"
   -> /foo -> 301 -> /foo/
   -> ...
```

The declared canonical redirected to the page that declared it. Follow that and
you never terminate. **That is what "Redirect error" means** — not a broken
server, a redirect Google cannot resolve to a destination.

The counter first appeared on **5 August**, the same window the "Alternate page"
count jumped from 11 to 24. Same root cause, same reprocessing pass, two
different symptoms: pages Google could resolve became "alternate", and pages it
could not became "redirect error".

**Already fixed.** Every post is self-canonical on the slash form now, so the
loop terminates at `/foo/`. Nothing further to do but wait for a re-crawl — all
three were last crawled 31 Jul – 2 Aug, a week before the fix went live.

## Why the validation email said "some fixes failed"

Every URL in both reports was last crawled **before** the fix shipped:

| report | oldest crawl | newest crawl | fix live |
|---|---|---|---|
| Alternate page (24) | 2026-07-25 | 2026-08-08 | 2026-08-09 ~15:00 UTC |
| Redirect error (3) | 2026-07-31 | 2026-08-02 | 2026-08-09 ~15:00 UTC |

Validation re-checks the affected URLs against crawl data. With nothing yet
re-crawled after the change, it had nothing new to look at and was always going
to fail. That failure carries **no penalty** — it is not a strike against the
site, and re-running validation later costs nothing but the wait.

---

# Round 5 — the 16 Aug coverage export

## Read this before reading the numbers: there is no post-fix data in it

`Chart.csv` runs **2026-05-17 → 2026-08-06**. The fix shipped **2026-08-09**.
Zero post-fix days. Every trend in that export describes the site as it was
*before* any of this landed, and it cannot say whether the work succeeded. The
issue counts look marginally fresher than the chart, but the chart is
unambiguous.

## What it does do: confirm the diagnosis, retroactively

Two step-changes in "Not indexed", and both land exactly on the dates this
branch already identified:

| date | not indexed | change | what appeared that day |
|---|---|---|---|
| 2026-07-24 | 177 → 199 | **+22** | "Alternate page" went 0 → 11 |
| 2026-08-05 | 199 → 225 | **+26** | "Alternate page" hit 24, "Redirect error" appeared |

Indexed pages fell 163 → 160 across the same window, and impressions dropped
from a ~365–386/day plateau to ~308/day in 2–8 Aug. The damage was accelerating
right up to the day it was fixed.

## Expect "Excluded by 'noindex' tag" to climb — that one is intended

It reads 17. There are **245** noindexed listing shells. As Google re-crawls,
that number climbs toward 245. **That is the fix working, not a regression** —
those are the archive/category/pagination shells that were clogging "Crawled –
currently not indexed". Do not act on the email when it arrives.

Same for "Page with redirect": the slashless URLs now resolve there instead of
competing as duplicates.

## "Duplicate, Google chose different canonical than user" — expected, but verify

This reason is **not in the 16 Aug export** (the export predates it), so it needs
its own drilldown.

It means Google is declining the canonical the page declares and picking its own.
During a canonical migration that is the normal transitional state: the site now
says `/foo/`, Google still holds `/foo` with all the history, and it takes
re-crawls of enough consistent signals before it moves. The 301 from `/foo` to
`/foo/` argues in our favour.

Checked for the things that would make it *persist* rather than resolve:

| check | result |
|---|---|
| canonical chains (A→B→C — Google rejects these) | **0** |
| internal links still on the slashless form | **0** |
| legacy duplicate out-linking its real post | **0 of 14** (legacy have 0 inbound; real have 17–19) |
| sitemap ⇄ canonical disagreement | **0** |

So the signals are consistent and it should resolve on re-crawl. The drilldown is
still worth pulling — if the URLs Google prefers are the legacy `/whatsnew/` or
`/4/post/` duplicates rather than slashless twins, that is a different problem
and needs a different fix.

## Fixed: "Page indexed without content" (1 page)

Confirmed as `/triv101/surveys.html` — the 15-word meta-refresh shell. Round 1
left it alone as a hypothetical; it is now a reported issue, so it gets the
`eventpayment.html` treatment: `noindex,follow` **and** out of the sitemap.
Asking Google to index a content-free forwarding shell was the same
contradiction this branch keeps removing. Both come back out when
GREENROOM-PLAN.md §3 bakes the stream into the page; visitors are unaffected.

Sitemap audit is now **224/224 with all four checks at zero** — nothing missing,
nothing noindexed, nothing off-canonical, nothing thin.
