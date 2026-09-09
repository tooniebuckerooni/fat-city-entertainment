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
**Not available this run:** GA4 (no export/screenshot provided, no MCP tool
connected), Microsoft Clarity (no screenshot provided), Statcounter (no
screenshot provided), Ahrefs (MCP connected but plan-gated — confirmed again
today via `public-domain-rating-free`, same "Insufficient plan" error as 9
Sept's earlier check this session).

**Ahrefs / backlinks: no baseline yet.** This is the first `/state-of-seo`
run and the Ahrefs API plan doesn't include the endpoints this skill needs.
There is no DR, referring-domain, or backlink count to log, and nothing to
diff on the next run either. **The one concrete next step:** set up Ahrefs
Webmaster Tools (free, needs the domain verified) — see
`references/sources.md` in the skill for the manual path. Once that's done,
the next run can log a real baseline and start tracking new/lost links,
which is the part of this that actually matters for the link-building work
in progress.

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

