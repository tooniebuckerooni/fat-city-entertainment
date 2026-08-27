# Road to Christmas — the revenue plan (written 26 Aug 2026)

Goal as stated: **$500/month → $3,000–5,000/month by Christmas.**
Holiday traffic expected from **the first half of October**.

This is the implementation plan. The diagnosis it rests on is Round 7 of
`SEO-CRAWL-HANDOFF.md` (Search Console performance data) — read that first if
you are picking this up cold.

---

## Decision 0 — settled 27 Aug: "MRR" means monthly revenue

Owner's answer: *"I just meant sales, in general."* So this is a volume +
average-order-value problem, and the plan below stands as written.

Worth keeping in view anyway, because it's the one part of the catalog that
compounds: subscriptions are already at **~41 active** — 16 from the free legacy
bingo card maker, ~25 from LemonSqueezy checkouts — and the 2nd-gen Bingo Card
Maker is the biggest recurring line so far. Every subscriber added in September
is still paying in December, which no single-game sale is. Not the main engine,
but the cheapest one to keep feeding.

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

*(Corrected 27 Aug. The first version of this table quoted the club tiers'
compare-at prices as if they were selling prices. These are what the pages
actually charge, read from `itemprop="price"`.)*

| tier | charged | was | per game |
|---|---|---|---|
| single game | $10.99 | — | $10.99 |
| 3-pack | $23.99 – $27.00 | — | $8.00 – $9.00 |
| 4-pack | $32.49 | — | $8.12 |
| 5-pack | $42.99 – $43.00 | — | $8.60 |
| “Holidays” 6-pack | $46.99 | — | $7.83 |
| Game Show Trivia 5-Pack | $87.99 | — | $17.60 |
| Starter Pack — Top 10 (Bronze) | **$89.00** | $116.89 | $8.90 |
| Silver Club (25 games) | **$198.75** | $298.75 | $7.95 |
| Gold Club (everything) | **$415.50** | $665.50 | n/a |

Moving a buyer from a $10.99 single to a $43 bundle is a **4x** order. That is
the fastest lever in this document and it needs no new traffic at all.

### The ladder doesn't actually descend — a pricing decision for the owner

Reading the real numbers side by side for the first time turns up a problem that
the AOV plan quietly assumed away. **Per-game price does not fall as you climb:**

- the cheapest **3-pack is $8.00 a game** — better than the **5-pack at $8.60**
- the **Starter Pack (10 games) is $8.90 a game** — the *worst* value of every
  multi-game tier, and it's the one pitched as the natural step up
- **Silver at $7.95** is the best per-game price in the catalogue, which makes
  the two rungs directly below it hard to justify

So "buy more, pay less per night" — the sentence the whole upsell rests on — is
not true today. The comparison table on `trivia-store.html` therefore claims only
what *is* true (every multi-pack beats buying singles) and shows the real
figures rather than hiding the column.

Fixing it is a pricing call, not a copy call. The smallest change that makes the
ladder read correctly: **bring the Starter Pack to ~$79** ($7.90/game) and the
5-packs to **~$39.99** ($8.00/game). That's about $10 and $3 off two tiers, and
it makes every step down the page a better deal than the one above it — which is
what makes a ladder work at all.

---

## Engine 1 — The Song List Library  ✅ **shipped 27 Aug, nine days early**

**Live at `/music-bingo-song-lists/` — hub plus 50 pack pages, 1,674 songs.**

What went out:

| | |
|---|---|
| pages | 51 (hub + 50 packs), all trailing-slash |
| songs published | 1,674, song + artist only |
| structured data | `MusicPlaylist` + `MusicRecording` per pack, `CollectionPage` + `ItemList` on the hub, breadcrumbs throughout |
| sitemap | all 51 URLs, in a tool-managed `<!-- fce:song-lists -->` block |
| entry points | Trivia Store nav dropdown (914 nav copies across 457 pages), `trivia-store.html` body copy, and a "See all N songs" link on all 42 product-page tracklists |
| buy path | every leaf page has a CTA — 43 to the pack itself, 7 to the bundle that carries it |
| broken refs | 0 of 720 pages checked |

The clock that mattered — *shipped by 5 Sept → competing in October* — is met
with nine days to spare. **The remaining work on this engine is Google's**, plus
request-indexing the hub and the highest-intent leaves (Halloween, Christmas
Party, the decades).

One thing surfaced during the build and is **left for the owner to decide**: the
Anagrams answer-sheet PDF doesn't just leak a song list, it publishes the
*Anagram column* — the puzzle answers for a pack that's on sale. See "The
Anagrams PDF" below.

### Why this will work

**The single biggest opportunity, and it was already sitting in a zip file.**

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

### Build notes — as built

`_tools/build-song-library.js` generates everything from
`_content/song-lists.json`; the working details are in CLAUDE.md under "The Song
List Library". The two that bite:

- **Run order is `build-song-library.js` then `add-jsonld.js`**, not the reverse.
  The build regenerates each page from the template shell, which drops the
  `fce:jsonld` block.
- **Only `song` and `by` are ever published.** The puzzle columns — Anagram,
  Antonym Clue, Acronym, Nickname, Soundalike Pair, Country — are stripped at
  parse time. Full callsheet PDFs still never get committed.

### The Anagrams PDF — needs the owner's decision

The PDF that started all of this
(`/uploads/4/3/3/6/43362499/music-doboff-answer-sheet-anagrams.pdf`) turns out to
be worse than "an orphaned song list". It's the complete Anagrams callsheet
**including the Anagram column** — the puzzle answers, for a $10.99 pack that is
currently on sale:

> `5 | The Beautiful People | Marilyn Manson | Only man in arms | 03:38`

It's the only such file public; the other 49 packs' answers aren't exposed. It's
also the single best-ranking asset on the site — position 1, ~91 clicks a
quarter.

**Not removed**, because taking down something live and ranking is the owner's
call, not an agent's. The groundwork is in place either way: `404.html` carries a
dormant rule forwarding that URL to `/music-bingo-song-lists/anagrams/`, so if
the file is deleted the traffic lands on the HTML page — same songs, no answers,
buy button — with no further work.

Three options, in order of preference:

1. **Delete the PDF.** The library page inherits the query, the answers stop
   being free, and the redirect is already written. Some ranking risk in the
   handover, since a JS redirect from a 404 is weaker than a real 301 — but
   GitHub Pages can't issue a 301, and this is the strongest form available.
2. **Replace it in place** with a version that has the Anagram column removed,
   keeping the URL and its ranking intact. Safest for traffic; needs the owner to
   regenerate the PDF.
3. **Leave it.** The ranking is real revenue-adjacent traffic and one pack's
   answers may be an acceptable price. Worth saying out loud rather than
   defaulting into.

### Timing — met

New pages need roughly 2–6 weeks to index and start ranking. Shipped **27 Aug**
against a 5 Sept deadline, so the library is in the window to compete in October
rather than 2027. Next lever is request-indexing: the hub first, then the
seasonal leaves (Halloween, Christmas Party), then the decades.

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

## Engine 3 — Average order value  ⏰ **1 and 2 shipped 27 Aug**

No new traffic required. Every buyer who takes a bundle instead of a single is
a 4x order.

1. ✅ **Bundle-first merchandising.** Every single that belongs to a bundle now
   says so under the buy button, with the arithmetic: *"This game is $10.99; the
   pack is $43.00 — which puts the other 4 at $8.00 each."* `add-cross-sell.js`
   reads every price off the product page at build time rather than from a map,
   so the numbers can't drift silently — **but it must be re-run after any
   repricing**, since they're baked into HTML. Verified bundle membership grew
   from 4 bundles to 8; 48 product pages carry a block.
2. ✅ **Made the ladder legible.** `trivia-store.html` now carries a generated
   comparison table (`add-price-ladder.js`, `<!-- fce:price-ladder -->`) showing
   every tier, its price, what it works out at per game, and who it's for. Same
   read-from-the-page discipline, same re-run rule. It's what surfaced the
   pricing problem above.
3. **Post-purchase upgrade.** The store already offers a credit toward a bundle
   containing a game you own — that offer is buried in body copy (it's now also
   in the ladder's footnote). It belongs in the purchase confirmation email.
4. **Reprice the middle of the ladder** so it descends — see the pricing section
   above. This is the owner's call and it gates how well 1 and 2 actually work.

---

## Engine 4 — Email  ⏰ **now the biggest single lever. Promote it.**

**SEO cannot realistically 6–10x revenue in four months. Email can.**

The blocking question is answered: the list is **~2,000 on Sender** (not
Mailchimp — correct the tooling notes accordingly), plus a couple of hundred
identifiable past buyers recoverable from the current and Weebly order exports.

That changes the weighting of this whole document. Two thousand people who
opted in to a music bingo list is a **larger, warmer audience than four months of
new organic search will produce**, and it costs nothing to reach. Run the
arithmetic against the target:

| | |
|---|---|
| list | ~2,000 |
| open rate, a warm hobby list | 25–35% |
| click rate on a good seasonal offer | 3–5% of the list |
| clicks per send | **60–100** |
| at 5% conversion, $43 average bundle | **$130–215 per send** |
| four sends, Sept–Dec | **$500–900** |

That alone is not $3–5k/month, and it shouldn't be sold as if it were. But it's
**one to two months of current revenue, from four emails, with no new traffic** —
and the December send lands in the highest-AOV week of the year, where the
same click is worth a Gold Club rather than a single.

The warmest sub-audience is past buyers: someone who paid $10.99 for one game
and enjoyed it is the natural buyer of a $43 bundle. Segment them out if Sender's
data allows; send to them separately with the bundle-credit offer.

Sequence:
- **Late Sept** — "plan your Halloween night" → Halloween pack + 6-Pack
- **Mid Oct** — "Christmas party season starts now" → Holidays 6-Pack, booking
- **Early Nov** — the year's best bundle offer → Starter Pack / Silver / Gold
- **Early Dec** — last-minute downloads → singles, instant delivery angle

**Capture is the gap.** The site still has no visible email capture outside the
generator gate mentioned in `SEO-HANDOFF.md` (which I could not find in the
markup — verify). The Song List Library is now the obvious place: fifty pages of
people who arrived wanting music bingo song lists is precisely the list to grow,
and the offer writes itself — *"the printable version of this list, plus the
next one we publish."* Worth doing before the October traffic arrives, not after.

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
| **27 Aug** | ✅ Song List Library shipped: 51 pages, sitemap, JSON-LD, nav + product-page links. Request-index the hub and the seasonal leaves. |
| **27 Aug – 5 Sept** | Bundle-first merchandising on product pages. Store comparison table. Anagrams PDF decision. |
| **5 – 15 Sept** | Email capture on library pages. Streaming post rewrite. Seasonal pages final check. |
| **15 – 30 Sept** | First Sender send (~2,000). Title fixes driven by CTR data. Watch which library pages start ranking. |
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

The Song List Library is a strong, durable asset and the right thing to have
built. But **published in August, it contributes in November and December, not
October** — that is simply how indexing works. Shipping it nine days early buys a
better chance at October, not a guarantee of one.

$3–5k/month by Christmas is reachable, but not from search alone in four months.
The realistic mix, now that the list size is known:

- **Email (~2,000 on Sender)** — the biggest single lever, and the only one that
  can produce revenue in weeks rather than months. Blocked on nothing but sends.
- **AOV work** — fastest structural change, no new traffic needed, do it in
  September so the email sends land on bundle-first pages
- **Song List Library** — ✅ built; the compounding asset, pays from November on
- **Seasonality** — a genuine tailwind, but only for pages already indexed
- **Subscriptions (~41 today)** — small now, but the only revenue that persists
  past December. Worth a line in every send.

The honest summary: search work is done and now waits on Google; **the next
month's revenue is an email and merchandising problem, not an SEO one.**

If the email list turns out to be small, say so early: the target then depends
almost entirely on AOV and the December seasonal peak, and the plan should be
re-weighted accordingly rather than discovered in November.
