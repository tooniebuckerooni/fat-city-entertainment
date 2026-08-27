# Road to Christmas — the revenue plan (written 26 Aug 2026)

Goal as stated: **$500/month → $3,000–5,000/month by Christmas.**
Holiday traffic expected from **the first half of October**.

This is the implementation plan. The diagnosis it rests on is Round 7 of
`SEO-CRAWL-HANDOFF.md` (Search Console performance data) — read that first if
you are picking this up cold.

---

## Decision 0 — settle what "MRR" means before anything else

This changes the whole strategy and nothing else should start until it's answered.

**Almost every product in the catalog is a one-time purchase.** The only truly
recurring product is the Trivia Show Maker **subscription at $44.99/month**.

- If "MRR" means **monthly revenue** (the likely reading), the plan below is
  right: it's a volume + average-order-value problem.
- If it means **true recurring revenue**, then $3–5k/month means **67–111
  active subscribers** on a product launched weeks ago, and essentially the
  entire effort should go into the Trivia Show Maker instead. That is a
  different plan and a much harder one.

The rest of this document assumes **monthly revenue**. Say otherwise and it gets
rewritten.

---

## The arithmetic — what actually has to move

Current state: ~$500/month, and the catalog skews to $10.99 singles, so call it
roughly **30–35 orders a month at a ~$15 average order**.

| path to $3,000/mo | orders/mo | avg order |
|---|---|---|
| volume only, same AOV | **200** | $15 |
| AOV only, same volume | 33 | **$91** |
| **both, realistically** | **~65** | **~$46** |

**Doubling orders and tripling average order value gets there. Neither alone
does.** And the price ladder already supports the AOV half:

| tier | price |
|---|---|
| single game | $10.99 |
| 4-pack / 5-pack / 6-pack | $32.49 – $46.99 |
| Game Show Trivia 5-Pack | $87.99 |
| Starter Pack — Top 10 (Bronze) | $116.89 |
| Silver Club | $298.75 |
| Gold Club | $665.50 |

Moving a buyer from a $10.99 single to a $43 bundle is a **4x** order. That is
the fastest lever in this document and it needs no new traffic at all.

---

## Engine 1 — The Song List Library  ⏰ **must ship by 5 September**

**The single biggest opportunity, and it is already sitting in a zip file.**

The owner has supplied all **50 callsheets — 1,674 tracks, parsed and verified**
(every pack's count matches its own stated total). Owner has explicitly cleared
publishing them in full: *"I don't care if ALL the callsheets go out before the
product… they are not a huge driving point, just an extra some people want."*

### Why this will work

There is already hard proof in the Search Console data. The **Anagrams answer
sheet PDF** — an orphaned file linked from nothing but `404.html` — earns
**91 clicks a quarter at position 1**, more than every product page on the site
combined. Meanwhile the product page selling that same game earns **0 clicks at
position 23**.

People search for song lists. The site ranks for them by accident. Nothing
captures the intent, because a PDF has no snippet, no navigation and no buy
button.

Now do that deliberately, 50 times, with a buy button on each.

### Structure

```
/music-bingo-song-lists/                  hub — all 50, grouped by category
/music-bingo-song-lists/<pack-slug>/      one page per pack
```

Each leaf page carries:
- the **full tracklist** (song + artist), as a proper HTML table
- the Spotify and Apple Music playlist links already on the product page
- what the paid pack adds: 250 randomized cards, the printable callsheet PDF,
  ready-to-host format
- a **buy CTA** for that pack, plus its bundle if it belongs to one
- cross-links to 3–4 related packs (keeps people in the library)

### Why full lists, not samples

The 12-track samples now on product pages were the cautious version. Full lists
rank better, satisfy the query completely, and cost nothing real — the product
is the 250 randomized cards and the print-ready PDF, not the song list. The
existing product-page samples should stay and gain a "see the full song list"
link into the library.

### Targets

Long-tail, low-competition, high-intent — exactly what a DR-8 site can win:
*"what songs are in [pack] music bingo"*, *"[theme] music bingo song list"*,
*"[decade] music bingo playlist"*, *"[theme] bingo song ideas"*.

50 pages × a handful of terms each is many small wins rather than one big fight.

### Build notes

- New tool `_tools/build-song-library.js`, same shape as `add-tracklists.js`.
- Source data: re-run the callsheet parser (documented in Round 6) — **the full
  callsheets must still never be committed**; the library pages are the
  published artefact, generated at build time from a local zip.
- Clone page shells the usual way so nav/footer are inherited.
- Trailing slashes on every URL. Add all 51 pages to `sitemap.xml`.
- Run `add-jsonld.js`, `canonicalize-trailing-slash.js`, `check-links.js` after.
- Retire the orphaned Anagrams PDF **into** the library: the library page becomes
  the destination for that existing position-1 ranking.

### Timing is the whole game

New pages need roughly 2–6 weeks to index and start ranking. **Shipped by
5 September → competing in October. Shipped in October → it's a 2027 asset.**

---

## Engine 2 — Seasonal capture  ⏰ **Halloween now, Christmas by 15 September**

Search demand runs weeks ahead of the event. Halloween queries peak early-to-mid
October; corporate Christmas booking starts late September.

| what | when it must be live | state |
|---|---|---|
| Halloween pack pages + song lists | **immediately** | pack exists; needs library page + push |
| `holidayparty.html` | now | ✅ rewritten (1,241 words) |
| `yycevents.html` | now | ✅ rewritten, stale "2022" fixed |
| Christmas early-bird post | now | ✅ retitled, offer made conditional |
| Christmas Party pack (32 songs) | **by 15 Sept** | needs library page |
| "Holidays" 6-Pack ($46.99) | **by 15 Sept** | the seasonal AOV play |

**Canada is underrated here.** Search Console: Canada converts impressions to
clicks at **4.65% vs the US 2.87%** — 1.6x the rate on 9% of the volume. With
`yycevents.html` now rewritten, Calgary/Alberta Christmas corporate is a small
but efficient pocket.

---

## Engine 3 — Average order value  ⏰ **the fastest lever, do it in September**

No new traffic required. Every buyer who takes a bundle instead of a single is
a 4x order.

1. **Bundle-first merchandising.** Product pages currently sell the single they
   are about. Each single that belongs to a bundle should say so above the fold,
   with the arithmetic shown ("this game is $10.99; the 5-pack it belongs to is
   $43 — the other four work out at $8 each"). The `add-cross-sell.js` tool
   already does a version of this; it needs to be louder and higher on the page.
2. **Make the ladder legible.** `trivia-store.html` now explains how to choose,
   but the tier jump from $46.99 to $87.99 to $116.89 to $298.75 to $665.50 is
   not obvious anywhere. A single comparison table earns its place.
3. **Post-purchase upgrade.** The store already offers a credit toward a bundle
   containing a game you own — that offer is buried in body copy. It belongs in
   the purchase confirmation email.

---

## Engine 4 — Email  ⏰ **the fastest path to December revenue, needs a decision**

**SEO cannot realistically 6–10x revenue in four months. Email might.**

Mailchimp is already connected through Zapier. The warmest possible audience for
a $43 bundle is someone who already paid $10.99 for a single game and enjoyed it.

**Blocked on one fact: how big is the list?** That number decides whether this is
the main engine or a supporting one.

Sequence, if the list is meaningful:
- **Late Sept** — "plan your Halloween night" → Halloween pack + 6-Pack
- **Mid Oct** — "Christmas party season starts now" → Holidays 6-Pack, booking
- **Early Nov** — the year's best bundle offer → Starter Pack / Silver / Gold
- **Early Dec** — last-minute downloads → singles, instant delivery angle

Also worth noting: **the site has no visible email capture** outside the
generator gate mentioned in `SEO-HANDOFF.md` (which I could not find in the
markup — verify). The Song List Library is the natural place to add one: fifty
pages of people who want music bingo song lists is exactly the list to build.

---

## Engine 5 — Housekeeping carried over from the audit

Real, sized, but none of them are the growth story.

| item | size | note |
|---|---|---|
| Streaming-comparison post | 5,789 impressions, **0 clicks** | 24% of all impressions. Rewrite toward *"best streaming service for running music bingo"* — a real host question, and the rankings already exist. |
| Desktop CTR | pos 17.3 vs mobile 8.9 | 2.3x the impressions, fewer clicks. Investigate before spending elsewhere. |
| ~100 over-length titles | truncated in results | Now that Search Console CTR data exists, shorten the ones with high impressions and low CTR **only** — do not mass-edit blind. |
| Trivia Show Maker page | price/checkout mismatch | Owner confirmed fixed 26 Aug. Re-verify after any repricing. |
| GA4 access | blocked | The live property is "Fat City 2" under a Wordjab account the connected login cannot see. Grant `dustin@fatcityentertainment.com` Viewer access, or connect that Google account in Zapier. Without it there is no conversion data at all. |

---

## Calendar

| window | ship |
|---|---|
| **27 Aug – 5 Sept** | Song List Library: 50 pages + hub, sitemap, JSON-LD, internal links. Halloween pages prioritised inside it. |
| **5 – 15 Sept** | Christmas/holiday library pages. Bundle-first merchandising on product pages. Store comparison table. Streaming post rewrite. |
| **15 – 30 Sept** | Email capture on library pages. First Mailchimp send. Title fixes driven by CTR data. Request-indexing on the new library. |
| **Oct** | Harvest. Watch which library pages rank; double down on the winners. Halloween email. |
| **Nov – mid Dec** | Christmas push: bundles, Gold Club, gift framing. Highest-AOV window of the year. |

---

## Working alongside the other agent

There is a second agent with blog posts queued. Two agents editing this repo has
already produced three merge conflicts this session. Proposed lanes:

- **Other agent:** blog posts under `/triviahostresources/` — top-of-funnel.
- **This lane:** the Song List Library, store and product pages, `trivia-store.html`,
  seasonal landing pages, sitemap and tooling.

Overlap risk is `sitemap.xml` and `CLAUDE.md` — both get touched by any page
creation. Whoever lands second should merge rather than force-push; that has
worked cleanly every time so far.

---

## What to expect, honestly

The Song List Library is a strong, durable asset and the right thing to build.
But **published in September, it contributes in November and December, not
October** — that is simply how indexing works.

$3–5k/month by Christmas is reachable, but not from search alone in four months.
The realistic mix:

- **AOV work** — fastest, no new traffic needed, available in September
- **Email to existing buyers** — fastest revenue, entirely dependent on list size
- **Song List Library** — the compounding asset, pays from November onward
- **Seasonality** — a genuine tailwind, but only for pages already indexed

If the email list turns out to be small, say so early: the target then depends
almost entirely on AOV and the December seasonal peak, and the plan should be
re-weighted accordingly rather than discovered in November.
