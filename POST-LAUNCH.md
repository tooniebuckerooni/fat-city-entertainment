# Post-DNS-switch punch list

The working list for fatcityentertainment.com now that DNS points at GitHub
Pages. The DNS-cutover runbook this once followed on from is long done and
has been retired.

**Status: the migration is verified live.** `CNAME` = `www.fatcityentertainment.com`,
custom domain set, DNS pointed, **HTTPS enforced**, a **real LemonSqueezy purchase**
and a **real contact-form submission** both confirmed end to end, and on July 25 a
**full spot-check of the live domain passed on every URL class** — apex → www,
http → https, store, product pages, blog posts, the legacy `/4/` redirects, images,
and the custom 404. Last updated July 25, 2026.

> **Deployed:** merged to `main` as a clean fast-forward on July 25, 2026
> (`1181905`); GitHub Pages `pages build and deployment` reported **success**.
> Before that merge none of this work was live — `main` is what Pages serves,
> which is why a `/4/post/...` URL still returned the 404 page while the stubs
> sat unmerged on the branch.
>
> **One standing caveat:** this agent's sandbox can't reach
> `fatcityentertainment.com` — the network policy refuses the connection, which
> says nothing about whether the site is up. Work here is verified against the repo
> and, for layout, a real headless Chromium rendering local files; confirming it on
> the live domain is always a human step. That confirmation was done and passed on
> July 25.

---

# NEXT STEPS

## Waiting on you

Roughly in order of impact.

| # | What | Why it's blocking |
|---|---|---|
| ~~1~~ | ~~Spot-check the live domain~~ — **passed July 25**, every URL class | done |
| 2 | **Google Search Console** — verify the domain, submit `sitemap.xml` | Unblocked: the redirects are confirmed working, so Google recrawls into live URLs rather than 404s. Highest-value item left. |
| 3 | **Email Gold Club members their new download link** | The old zips are deleted, so a member who bookmarked a direct `.zip` URL gets a bare 404 until that email lands. |
| 4 | **Retire the Weebly subscription** | Unblocked — the spot-check was the gate on this. |
| 5 | **Gold Club price**, in LemonSqueezy first | Then one command here; see the pricing note below. |

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

### The live spot-check — passed July 25

Kept as the re-check list for any future change that touches URLs or hosting. The
point is to prove the host answers on the *real* domain for each **kind** of URL,
since a whole category can be broken while the homepage looks perfect. Use a
private window so cached CSS doesn't mask a problem.

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
| ~~1~~ | ~~Sitemap orphans~~ — **done July 25.** All three turned out to be dead weight and were redirected instead; see below | done |
| ~~2~~ | ~~Blog share buttons~~ — **done July 25**, all 571 | done |
| ~~3~~ | ~~`check-links.js` absolute same-domain URLs~~ — **done July 25**; found 4 real breakages immediately | done |
| ~~4~~ | ~~`<lastmod>` in `sitemap.xml`~~ — **done July 25** | done |
| 5 | A **US-city landing page** — still the cheapest SEO win; `yycevents.html` (Calgary) is the only geo page | larger |
| ~~6~~ | ~~Publish the three blog drafts~~ — **done July 25**; see "Blog cluster" below | done |

### #1 and #2, explained

**The sitemap orphans — retired July 25.** This went through two rounds. I first
said to add all three to the sitemap; checking their content changed that
(`host-resources.html` is literally empty — its content container holds nothing,
and the ~96 words on it are all nav and footer). Then you called all three dead
weight, to be rebuilt when those products relaunch.

So all three are now **redirect stubs**, using the same pattern as the 180 legacy
ones, and are out of the sitemap:

| Was | Now redirects to |
|---|---|
| `triv101.html` | `/partyentertainment.html` (Our Games) |
| `aitrivia.html` | `/trivia-store.html` |
| `host-resources.html` | `/triviahostresources.html` |

One thing to remember when Triv101 relaunches: **25 old blog posts link to
`/triv101.html`** in their body copy. Those were left pointing where they are —
the sentences say things like "go to the Triv101 page", so repointing them at a
generic page would make the posts say something they don't mean. The redirect
carries them, and they'll be correct again the moment that URL holds a real page.

**`<lastmod>` — done, deliberately partial.** Google ignores the field site-wide
if it doesn't trust the dates, so [`_tools/sitemap-lastmod.js`](_tools/sitemap-lastmod.js)
only sets one where a real date exists:

- **107 blog posts** get their own published date, read from the `.date-text` in
  their markup — the true date, spanning 2016-08-30 to now. Git only knows when
  the file was imported.
- **21 pages** edited since the migration import get their git commit date.
- **86 pages** untouched since import get **no** `lastmod`. Their git date is the
  import date, and claiming a 2016-era page changed this month is exactly the kind
  of inaccuracy that gets the whole field discounted.

Re-run the script after content changes; it rewrites every date from scratch.

**The blog share buttons.** Every one of the 107 blog posts has a Twitter share
button whose URL is hard-coded to the old Weebly permalink scheme:

```
http://twitter.com/share?url=http://www.fatcityentertainment.com/4/post/2017/09/<slug>.html
```

Two things are wrong with it, neither fatal:

1. It points at `/4/post/...`, which now works only because of the 180 redirect
   stubs. Anyone sharing from the blog publishes a URL that takes an extra hop,
   and the redirect is a meta-refresh rather than a real 301 — fine for browsers,
   weaker for anything that resolves links server-side (some social previews).
2. It's `http://` and `twitter.com`, so it takes a second redirect to
   `https://x.com`.

The fix is mechanical: rewrite each button's URL to the post's current canonical
`https://www.fatcityentertainment.com/triviahostresources/<slug>/`. The slug is
already right there in the same markup, so it can be scripted the same way the
redirect stubs were. The stubs stay regardless — they exist for inbound links
from the outside world, which is the part we can't edit.

### Blog cluster — published July 25

All three are live, built by [`_tools/publish-post.js`](_tools/publish-post.js),
which clones an existing post as a template and swaps title, description,
canonical, og tags, date, slug and body, converting the markdown as it goes. It
refuses to publish if any bracketed placeholder can't be resolved.

| Post | URL |
|---|---|
| How to Run a Music Bingo Night | `/triviahostresources/how-to-run-a-music-bingo-night` |
| The Decade-by-Decade Playlist Guide | `/triviahostresources/decade-by-decade-music-bingo-playlist-guide` |
| Games Our Crowds Can't Get Enough Of | `/triviahostresources/19-music-bingo-games-our-crowds-cant-get-enough-of` |

**blog02 replaced the existing post at its own URL**, as agreed — that keeps the
page's age and any backlinks instead of splitting them across two competing pages.
Its date was updated from 4/11/2018 to today: link equity lives with the URL, not
the date text, and showing a 2018 date on freshly rewritten content helps neither
readers nor freshness signals. The 871 words that were there are replaced.

All placeholder links resolved — Gold Club, both generators, BCG Pro, and the
cross-links between blog01 and blog03. Added to the top of the blog landing page
in date order, and to `sitemap.xml`.

**Also fixed while in here:** all 107 blog posts had `og:url` pointing at their
old `/4/post/` permalink while `rel=canonical` pointed at the real URL. Social
platforms read `og:url` as the canonical for a share, so likes and shares were
accumulating against a dead URL. Every one now matches its canonical.

**Not regenerated:** the 26 pagination pages, the archive months, and the category
pages. Adding three posts to the top of the landing page doesn't break them —
`previous/2` onward still start where they did, so nothing is duplicated or
missing, the first page just shows 10 entries instead of 8. But the new posts
won't appear under Archives (there's no July 2026 month yet) or in the Music
Bingo / Trivia Hosting category listings until those are rebuilt. They're
reachable from the landing page, the sitemap, and each other.

### Original draft notes

Four files arrived in `_content/drafts/` on July 25. Three are publish-ready SEO
drafts, each with a title tag, meta description, and target keyword:

| Draft | Target keyword | Status |
|---|---|---|
| `blog01-how-to-run-a-music-bingo-night.md` | how to run a music bingo night | ready to publish |
| `blog03-decade-by-decade-playlist-guide.md` | music bingo playlist ideas | ready to publish |
| `blog02-games-our-crowds-cant-get-enough-of.md` | music bingo game ideas | **needs a decision** |

**The blog02 conflict — decide before publishing.** There is already a live post
at `/triviahostresources/19-music-bingo-games-our-crowds-cant-get-enough-of/`
titled "19 Music Bingo Games Our Crowds Can't Get Enough Of". The new draft is
"Games Our Crowds Can't Get Enough Of" — same topic, same keyword space. Shipping
it as a second post would put two of your own pages in competition for the same
query, which usually means neither ranks as well as one strong page would. Three
ways to go:

1. **Replace** — publish the new copy at the existing URL, keeping its age and any
   backlinks. Usually the strongest SEO play.
2. **Differentiate** — retarget the new draft onto a keyword the old post doesn't
   own (its real distinct angle is *"why the decades round still wins"*), and give
   it a matching title and slug.
3. **Merge** — fold the new material into the existing post.

The other two drafts have no such conflict.

**What publishing actually involves.** The blog is 107 static pages with static
plumbing, so a new post is more than one file:

- the post itself at `/triviahostresources/<slug>/index.html`, built on the
  existing post template
- the blog landing page (`triviahostresources.html`)
- pagination — 26 `previous/N/` pages, which all shift by one
- the archive month for the publish date (59 exist) and any relevant category
  pages (14 exist)
- a `sitemap.xml` entry
- resolving the bracketed placeholder links the drafts ship with —
  `[Music Bingo Gold Club]` → `/store/p112/GoldClub.html`,
  `[try the free Bingo Card Generator]` → `/bingocardgenerator.html`,
  `[Bingo Card Generator Pro]` → `/store/p65/bingocardgeneratorpro.html`, plus
  `[playlist guide]` and `[hosting guide]`, which are cross-links between blog01
  and blog03

Worth scripting rather than hand-editing, given the pagination shift. The three
posts cross-link into a tidy cluster once published.

**`social-video-concepts.md` implies no site work.** It's 12 short-form video
concepts — a marketing plan for filming, not a page. Kept in `_content/drafts/`
for reference. Say the word if you want any of it turned into a page (a
host-resources section, for instance).

---

# FALL CAMPAIGN (Sep–Oct 2026)

Seven more docs arrived July 25 and are saved in `_content/drafts/`: a campaign
brief, a data-findings memo, a UTM standard, email-capture + welcome-email copy,
Gold Club CTA copy, Reddit guidelines, and a weekly-host-email template.

The campaign brief puts three things in **Week 1 (Sep 1–7)**, so there's about
five weeks of runway from today. Everything below was checked against what's
actually on the site; the blockers are real and listed first.

## Blockers — need a decision from you

### 1. ~~Gold Club isn't a subscription, but the CTA copy sells it as one~~ — **RESOLVED**

**Decision (July 25): keep it one-time, reword around lifetime access.** The
product stays a single $235.50 USD purchase. Any CTA copy should lean on what's
actually true — pay once, keep the files forever, get future releases free — and
the subscription language (*"one subscription"*, *"$X/month"*, *"Upgrade to"*) and
the monthly-vs-annual A/B test come out of `gold-club-cta-and-bundle-upsell-copy.md`
before it's used. Original problem, for the record:

`gold-club-cta-and-bundle-upsell-copy.md` repeatedly frames Gold Club as a
subscription: *"one subscription"*, *"New themes every month, one subscription"*,
*"Upgrade to Gold Club"*, and an A/B test of *"$X/month"* against *"$X/year"*.

The product on the site is a **one-time $235.50 USD purchase**. Its own
description says the files are *"yours to keep forever"* and that you *"get newest
games upon release, without further charge"* — lifetime access with free updates,
which is a genuinely good offer, just not a recurring one. There is no monthly or
annual price to put in that copy.

Shipping the copy as written would advertise a subscription customers can't buy,
which is the kind of mismatch that produces refund requests and chargebacks. Two
clean ways forward:

- **Keep it one-time and reword** — lean into what's actually true: *"Pay once,
  every game you'll ever need, including everything we release later."* That's a
  strong angle and needs no product change.
- **Actually make it a subscription** in LemonSqueezy — a real pricing change with
  real consequences for the 2 years of existing lifetime buyers, who were promised
  free future games.

The monthly-vs-annual A/B test can't run either way until this is settled. Also
note: static hosting has no A/B testing capability, so that test needs a tool
(or a manual split) regardless.

### 2. The cart upsell copy has no cart to live on

The same doc specifies cart-page upsells ("when cart contains a single decade
pack…") and checkout-button copy (*"Complete My Order"*, *"Get My Packs"*).

There is no cart on this site. Checkout is LemonSqueezy's hosted overlay, and
Weebly's `#wsite-mini-cart` is explicitly hidden in `site-extras.css`. Cart
contents and checkout button text live in LemonSqueezy's settings, not this repo —
so those sections are for you to apply there, not something I can implement here.

What *is* implementable from that doc: the site-wide Gold Club CTA variants (nav,
homepage hero, footer, blog closing) and the **"Complete Your Night"** box for the
generator results page and blog post ends. Both are listed below.

### 3. ~~Which generator gets the email gate~~ — **RESOLVED (reversed Aug 1)**

**Decision (Aug 1): the gate is on the legacy generator after all, not Pro.**
This reverses the July 25 call below. Built same day — see `SEO-HANDOFF.md`
"Round 2" for the full writeup. Email platform is **Resend** (owner already
had an account). Still needs deploying: paste the updated
`triv101-api/src/index.js` into the Cloudflare dashboard and set
`RESEND_API_KEY`/`RESEND_AUDIENCE_ID`/`RESEND_FROM_EMAIL` — steps in
`triv101-api/README.md`.

<details>
<summary>Original July 25 decision (superseded)</summary>

**Decision (July 25): the legacy generator stays exactly as it is — no gate on
it.** A new comparison page at `/bingocardgenerator2.html` presents both
generators evenly, and Generator 2 lives on its own site. If Generator 2 proves
itself over time, the legacy one comes out of the store but stays up for existing
users. So the gate question moves to the Generator 2 codebase, which isn't in this
repo.

`email-capture-gate-and-welcome-email.md` puts a one-field email gate in front of
the generator's PDF download, citing ~109 anonymous downloads per period. Two
things needed pinning down:

- **Which generator.** This repo's `/bingocardgenerator.html` does build PDFs
  locally (it uses jsPDF), so the gate is implementable here. But that page also
  links out to `bingocardgenerator.online`, a **separate property not in this
  repo**. If the 109 downloads are happening there, the gate belongs in that
  codebase and I can't reach it from here.
- **Which email platform.** Formspree relays a form to an inbox; it isn't a list
  tool and can't send the welcome email or the weekly host email. Those need an
  actual ESP, which the campaign brief also flags as an open item (its Next Steps
  #3). The gate can be built before that's chosen, but it can't *do* anything
  until it has somewhere to post.

</details>

## Ready for me — campaign items

| # | What | Notes |
|---|---|---|
| 7 | **"Complete Your Night" CTA box** — on `/bingocardgenerator2.html` already; still to add on the legacy generator page and at the end of blog posts | small |
| ~~8~~ | ~~Gold Club placements~~ — **footer sitewide (386 pages) + homepage section done July 25.** A nav entry is the one remaining slot | mostly done |
| ~~9~~ | ~~Email-capture gate~~ — **built Aug 1** on the legacy generator, Resend-backed. Blocked on deploying the Worker + setting Resend keys | blocked on you |
| ~~10~~ | ~~UTM tagging~~ — **done July 25.** Outbound links tagged and `utm-tagging-standard.md` corrected | done |
| 11 | Structure blog content for AI answer engines — clear headers, direct answers, possibly FAQ/HowTo structured data | small |
| 12 | Convert `pages/index-draft.html` to UTF-8 (currently UTF-16LE; unlinked and `noindex`, so harmless until it ships) | small |
| 13 | **Raise the Gold Club price** once LemonSqueezy is updated — `node _tools/set-usd-price.js p112 549.50 307.72` | one command, blocked on you |

### The UTM standard — corrected July 25

Both problems are fixed in `_content/drafts/utm-tagging-standard.md`, and every
FatCity URL in it now resolves (checked). What was wrong:

**The example URLs point at paths that don't exist.** `utm-tagging-standard.md`
uses:

```
https://www.fatcityentertainment.com/blog/how-to-run-a-music-bingo-night
https://www.fatcityentertainment.com/gold-club
```

There is no `/blog/` path — the blog is `/triviahostresources/` — and no
`/gold-club`; it's `/store/p112/GoldClub.html`. Any link built from those examples
404s. Either fix the examples, or decide you want those short URLs and I'll add
redirect stubs for them (the same pattern as the 180 legacy ones, and honestly
`/gold-club` is a nicer link to put in a TikTok bio).

**Don't tag internal links.** The checklist says to build "every outbound
marketing link (blog CTAs, social bios, email links)" with UTMs. Social bios and
email links, yes. But a blog CTA pointing at Gold Club is an *internal* link, and
UTM-tagging those actively breaks the attribution the doc is trying to fix: GA4
treats a tagged link as a new campaign session, so the visitor's original source
is overwritten mid-visit and your own site shows up as its own traffic source.
UTMs belong only where traffic *enters* the site.

The cross-property rule is the exception and was correct as written — links
between `fatcityentertainment.com` and `bingocardgenerator.online` genuinely are
external, and a shared `utm_campaign` is exactly what stitches that journey
together. All three outbound links to the generator domain now carry it. The
fourth mention, in `index.html`, is a schema.org `sameAs` identity declaration
rather than a click target, so it stays untagged.

The standard was written to be implemented "at the DNS cutover", which has already
passed, so the corrected version says plainly that it's a retrofit and that some
pre-standard traffic will sit under "Direct" in historical reports.

**Still outstanding on this:** the reciprocal tags on BingoCardGenerator.Online's
links back to FatCity. That codebase isn't in this repo.

**Optional:** short vanity URLs like `/gold-club` for social bios. They'd be
redirect stubs using the same mechanism already serving the 180 legacy URLs, and
`/gold-club` reads considerably better in a TikTok bio than
`/store/p112/GoldClub.html`. Say the word and it's a few minutes.

### Product-claim corrections made July 25

A pass over what the store actually promises, prompted by reading the CTA copy:

- **Gold Club no longer includes Bingo Card Generator Pro.** The claim
  ("*Now Including: Bingo Card Generator Pro*", plus "*Already bought pro? Email
  us for a credit!*") was removed from the product page and the five blog pages
  embedding the same description. It had also crept into two pages I wrote earlier
  the same day; both corrected.
- **The "$123 Value" attached to that claim was wrong twice over** — BCG Pro sells
  for **$59.00 USD**, so it inflated the figure to more than double the real price.
  Moot now the claim is gone, but worth not repeating.
- **"Log in to FatCityEntertainment.com … to access updates and Bingo Card
  Generator Pro"** was on Gold Club and five blog embeds; the same instruction
  ("*under My Account*") was on the BCG Pro page. **There is no login on this
  site** — Weebly membership went away with the migration, so any customer
  following it found nothing. Replaced with how delivery actually works: the
  download link is emailed at checkout, and new Gold Club games go to the
  purchase email at no charge.
- **BCG Pro's page claimed "Get Lifetime Access Now – $123"** while the same page
  charged **$59.00 USD**, and carried a third-party CAD→USD currency widget
  (`fxwidget-cc`, hard-coded to CA$99, loading `s.fx-w.io`). Both gone.

**Future, once there's a month of sales to look at:** bundling a few months — or a
year — of Generator 2 with Gold Club, in place of the Pro bundle that used to be
there. Nothing on the site claims this today, and nothing should until it's real.

### Gold Club pricing — the numbers to settle first

Regular price is **50 × $10.99 = $549.50**. Against that:

| | |
|---|---|
| Current live price, $235.50 | **57% off**, not the 70% remembered |
| 70% off would have been | $164.85 |
| 44% off (the intended new discount) | **$307.72** |

Two things to sort before changing it:

1. **`set-usd-price.js` only changes the displayed price.** LemonSqueezy charges
   whatever it's configured for, so the site must not be changed on its own — that
   recreates exactly the p140 bug (page showing one number, checkout taking
   another). Change LemonSqueezy first or at the same moment.
2. **$549.50 as a struck-through anchor only holds up if Gold Club was genuinely
   sold at that price.** Worth being sure, since an inflated "was" price is the
   same category of problem as the "$123 Value" claim already removed.

The Gold Club page currently shows no sale framing at all — one plain $235.50,
nothing crossed out — so the Summer Clearance isn't being communicated anywhere.

## Not site work — recorded for reference

- `reddit-engagement-guidelines.md` — community-participation norms. Pure ops.
- `weekly-host-email-template.md` — needs an ESP; no site change.
- The welcome email in `email-capture-gate-and-welcome-email.md` — same.
- `campaign-plan-sep-oct-acquisition.md` — the calendar driving the dates above.
- `social-video-concepts.md` — filming plan.
- `data-findings-memo.md` — analysis. Two notes on it:
  - Its housekeeping item *"confirm whether checkout charges CAD or USD"* is
    **already resolved**: prices are USD sitewide, and LemonSqueezy is merchant of
    record handling per-country tax. The CAD figures in the memo are historical
    Weebly data. No action needed.
  - Its catalog recommendation — more sub-niche packs like 90s R&B (e.g. "80s New
    Wave", "70s Yacht Rock", "2010s Pop") rather than broad-decade packs — is
    product work, not site work, but each new pack eventually needs a product page
    plus a LemonSqueezy listing and an `ls-links.js` entry.

**One inconsistency between your own two docs**, worth resolving before Week 6:
the campaign brief lists *"Decades pack sales flat-to-up month-over-month by
October"* as a success metric and describes blog02 as reviving it — but the data
memo concludes that *every* broad decade pack is declining (60s −71%, 70s −44%,
80s −25%, 90s −26%) and recommends leaning into niche spinoffs instead. If the
memo is right, that KPI is measuring the wrong thing, and blog02's decades angle
is arguing for a category the data says is fading. Not a site issue — but it
affects how you read the Week 6 check-in.

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
