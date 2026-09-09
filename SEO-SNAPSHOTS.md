# SEO Snapshots

Running log for `/state-of-seo` runs. One dated entry per run, appended, never
overwritten. Backlink deltas (new/lost links, DR trend) live here because
that's the one thing a single-point-in-time report can't show — see the
skill's own "Backlinks: track the delta, not just the snapshot" section for
why. Indexing/performance headline numbers are logged too, for the same
reason: a count means little without knowing whether it moved.

---

## 2026-09-09

**Data used this run:** GSC Coverage overview + 4 drilldown exports (Crawled
– currently not indexed, Not found 404, Discovered – currently not indexed,
Duplicate/different-canonical-than-user), chart data through 2026-09-03; GSC
Performance (Queries + Pages), "Last 3 months" window, pulled 2026-09-09.
Microsoft Clarity Dashboard/URL-performance/Referrer/Top-exit-pages exports,
08/11–09/09/2026 window, pulled 2026-09-09.
**Not available this run:** GA4 (no export/screenshot provided, no MCP tool
connected), Statcounter (no screenshot provided). Ahrefs' MCP connection is
still plan-gated (confirmed via `public-domain-rating-free`), but the owner
pulled real data manually from Ahrefs Webmaster Tools the same day — see
below.

**Clarity (08/11–09/09/2026, 29 days):** 621 sessions / 493 unique users,
14% returning, 2.70 pages/session. Core Web Vitals healthy site-wide (score
87.6, LCP 0.61s, INP 188ms, CLS 0.001, 0 JS errors). 0 rage clicks, 0
excessive scrolling. **58 sessions (9.3%) hit a dead click, 103 (16.6%)
quick-backed** — no per-page breakdown in this export, so which page(s)
drive either number is still open; pull Clarity's per-page recordings
filtered to "Dead clicks" next time to attribute it.
**Reddit is a real, undertracked referrer**: reddit.com (87) + the Reddit
app's referrer string (17) = 104 sessions, nearly matching Google's 160 and
well ahead of everything else. Worth identifying the source thread/sub —
Ahrefs won't catch this as a backlink the way it would a blog link, so it's
currently invisible to the link-building tracking this file exists for.
**Cross-referenced against the indexing gap above:** `store/p133/cartoons.html`
(crawled-but-unindexed per GSC) has a "poor" INP of 616ms in Clarity — a
plausible quality-signal explanation neither source shows alone.
`store/p97/halloweenparty.html` is worse (score 44, LCP 4.8s, INP 912ms)
despite being indexed — worth checking against `IMAGE-OPTIMIZATION.md`'s
known heavy-image pages.

**Ahrefs / backlinks: real baseline established, same day, via Ahrefs
Webmaster Tools.** Current (2026-09-09): **DR 16** (dipped to 8 briefly Aug
26–28, recovered), **461 referring domains**. History export covers daily
counts back to 2015; the recent shape is the notable part — a steady climb
from 489 (Aug 1) to a **peak of 579 (Aug 22)**, then a sharp, concentrated
drop to **456 (Sep 5)**, a loss of 123 domains in under 2 weeks, with only
partial recovery since (461 as of today). Over the full Aug 1–Sep 9 window:
**141 new domains, 167 lost** (net –26), but the loss is heavily clustered
right after the Aug 22 peak (single days losing –21, –18, –17, –16 domains),
not spread evenly — the signature of a batch of domains appearing together
and then dropping together, not organic day-to-day churn.

**Read on this, not yet confirmed:** this export only has daily counts, not
which domains. The shape (a sharp synchronized rise-then-fall) is much more
consistent with a wave of low-quality/spam or bot-crawled domains entering
and then leaving Ahrefs' link graph than with real editorial links being
lost — nothing in GSC's or Clarity's real-traffic data from the same window
shows a correlated crash, which real lost links usually do produce. **Not
something to chase or fix from the site side** either way — these are other
sites linking in, outside FCE's control. To actually confirm rather than
infer: pull AWT's **New/Lost backlinks table** (the one with real domain
names, not just counts) next time — that turns this from "the shape suggests
spam churn" into "here are the domains and here's what they were."

**Indexing headline (as of the Sept 3 chart date):** 276 indexed / 345 not
indexed (44.5% of Google's known-URL universe indexed). **That number reads
as bad and isn't** — see the full report for the breakdown, but roughly:
145 are `noindex` on purpose, 65 are intentional redirects, 2 are
robots.txt-blocked on purpose, and a further chunk of the 61-page "Crawled –
currently not indexed" bucket are pages that already carry `noindex` (the
blog taxonomy shells, one payment page) and are just waiting on Google's next
crawl to get correctly bucketed. The genuinely open questions are a smaller
set — see "Worth investigating" in the full report.

**Worth noting:** the Aug 9 2026 trailing-slash fix (`SEO-CRAWL-HANDOFF.md`)
is holding site-side — spot-checked several posts, all have the correct
slash-form canonical and every internal link uses it — but Google's index is
still consolidating a month later. 14 posts are in "Duplicate, Google chose
different canonical than user" with recent (post-fix) crawl dates, and
`/triviahostresources/19-music-bingo-games-our-crowds-cant-get-enough-of` is
split across both URL forms with the **wrong** one winning (no-slash: 47
clicks, position 12.3; slash/canonical: 7 clicks, position 25.8). Nothing to
fix in the repo here — the signals are already consistent — just a lag worth
re-checking next run rather than a new problem to chase.

**Dead-click bug found and fixed, same day:** owner exported a Clarity
Dashboard pre-filtered to the 58 dead-click sessions. Its "Top pages" panel
turned out to just be the sitewide numbers unfiltered (matched the earlier
export exactly, and summed far above 58) — not trustworthy — but Referrer,
Top-exit-pages, and URL-performance were correctly scoped to the segment.
`bingocardgenerator.html` was the dominant exit page within it (23 of ~47
attributed exits). Read `generateCards()` in `files/theme/script.js`: it
calls `new jsPDF(...)` and a long chain of jsPDF methods with **no error
handling**, and jsPDF loads from `unpkg.com` with no fallback. Confirmed
live with Playwright against the actual page: when the jsPDF script fails to
load for any reason, "Download PDF" → email gate → "No thanks, just
download" completes visibly (gate opens, closes) but the PDF silently never
builds — no error, no feedback. Exactly the dead-click shape, on the site's
single highest-traffic interactive tool. Fixed by wrapping `generateCards()`
in try/catch with a visible `.fce-bcg-error` message on failure
(`files/theme/script.js`, `bingocardgenerator.html`, `files/theme/styles.css`)
— re-tested, the message now surfaces instead of failing silently. Can't
claim this explains all 58 sessions (Clarity's own JS-error count reads 0
sitewide, and this failure throws a real catchable exception that should
have shown up), but it was a real, previously-unguarded failure mode
regardless of exact attribution to this specific session batch.

