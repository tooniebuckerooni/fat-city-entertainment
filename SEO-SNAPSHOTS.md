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


---

## 2026-10-03

**Data used this run:** GSC Performance export (Web, last 3 months, 2026-06-30
to 2026-09-29, pulled 2026-10-02): Chart, Pages, Queries, Countries, Devices,
Search appearance. **Not available:** GA4, Clarity, Statcounter, LemonSqueezy
orders (so nothing here says anything about revenue), Ahrefs (plan-gated) and
Semrush (no API units). Backlink delta not updated this run.

**Headline:** 1,075 clicks, 36,591 impressions, 2.94% CTR over 92 days, about
11.7 clicks a day. **Flat since mid-July**: 14-day buckets run 126, 164, 176,
164, 169, 188, then 88 for the final 8 days (11/day). Impressions are steady at
about 5,000-6,000 per 14 days. No growth and no decline; nothing in the 3.5
weeks of travel moved it.

**Brand carries a lot of it.** The 13 brand queries ("fat city entertainment"
and variants) delivered 242 clicks, 22% of all clicks and 55% of the 439 that
GSC attributes to a listed query (the other 636 are anonymised). Home page: 319
clicks, mostly branded. Non-brand discovery is the small, hard-won part.

**Where the non-brand clicks are:** the generator (`/bingocardgenerator.html`,
131 clicks, 4,503 impressions, position 17.2 as a page, 8.3 for its head
query "music bingo card generator" at 2.69% CTR), the Gold Club playlist
library (108 clicks, pos 8.7), `/musicdoboffbingocards.html` (77 clicks, pos
12.7), and the anagrams answer-sheet PDF (63 clicks, pos 7.7, 2,271
impressions, still ranking by the owner's decision of 27 Aug). Blog: 168 clicks
on 14,659 impressions (1.1%). Store products: 59 clicks. Song library pages: 59
clicks across 50 pages, almost all at position 6-10, so the pages rank and the
CTR is the weak part.

**Countries:** US 756 clicks (70%), Canada 139 at 8.5% CTR and position 9.6,
UK 72 on 1,818 impressions (4.0%), Australia 21 on 879. **Devices:** mobile
551 clicks at position 8.8, desktop 507 at 18.4. **Search appearance:** product
snippets 27 clicks on 1,174 impressions, so the Product schema is working.

**City pages, first read (live since 23 Sept, so 6 to 8 days):** all 10 wave 1
pages already have impressions (149 in total, Montreal 42 at position 8.4,
London 21, Vancouver 16) and 0 clicks. They are indexed. Far too early to judge
traffic; re-read in 3 to 4 weeks. Montreal is the only one with local-intent
queries already ("trivia night montreal", "quiz night montreal", pos 5.7-6.4).

**The "how to host a trivia night" family is not ranking** (positions 40 to
90 on about 40 queries) and `how-many-trivia-questions-for-a-trivia-night` sits
at position 4.9 with a 0.51% CTR on 1,560 impressions, which is low enough to
look like an AI-answer or snippet capture rather than a snippet to fix.

**Worth doing, none done:** (1) title and meta tests on the three head-term
pages above, since position 8 to 10 with 2 to 3% CTR is where a better snippet
is worth a click or two a day; (2) re-pull in 3 to 4 weeks for the city pages;
(3) get GA4 `begin_checkout` by product and LemonSqueezy September orders so the
traffic can finally be tied to sales.
