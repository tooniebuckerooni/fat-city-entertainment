# UTM Tagging Standard — FatCity Entertainment + Bingo Card Generator Online

Purpose: GA4 (across the two properties) and the store's own analytics can't be joined into one attribution picture — a visitor's path from the free generator through to a Gold Club purchase can't be traced end to end. This standard gives every link that *brings traffic in from outside* a consistent tag, so traffic source, channel, and campaign are all machine-readable in GA4 regardless of which property the click lands on.

> **Corrected July 25, 2026.** Two things in the first draft would have caused problems and have been fixed here: the example URLs pointed at paths that don't exist on the site, and the instruction to tag "every outbound marketing link (blog CTAs…)" would have put UTMs on internal links, which breaks the very attribution this is meant to fix. Both are addressed below. The draft also said to implement this at the DNS cutover — that has already happened, so this is a retrofit; tag new links from here on, and expect some pre-standard traffic to sit under "Direct" in historical reports.

## The rule that matters most: never tag an internal link

**UTM parameters belong only on links that bring someone *onto* a site from somewhere else** — a social bio, a Reddit comment, an email, an ad, or a link from one of your two properties to the other.

Tagging a link *within* the same site does the opposite of what you want. GA4 reads UTM parameters as the start of a new campaign session, so a tagged internal click **overwrites the visitor's original source mid-visit**. Someone who arrived from Reddit and then clicked a tagged blog CTA stops being attributed to Reddit and starts being attributed to your own site — and FatCity shows up in its own reports as a traffic source. You lose exactly the end-to-end path this standard exists to capture.

So:

| Link | Tag it? |
|---|---|
| Instagram bio → your blog post | **Yes** |
| Reddit comment → the free generator | **Yes** |
| Email → Gold Club | **Yes** |
| FatCity → BingoCardGenerator.Online (or back) | **Yes** — different property, see the cross-property rule |
| Blog post CTA → Gold Club | **No** — same site |
| Nav, footer, "Shop Packs" buttons | **No** — same site |

Internal navigation is already measurable in GA4 through page paths and events; it doesn't need tagging and is actively harmed by it.

## The parameters, and how to fill each one

Every *inbound* marketing link should carry all four of `utm_source`, `utm_medium`, `utm_campaign`, and `utm_content` (skip `utm_term` unless you're running paid search). Always lowercase, always hyphen-separated (no spaces, no underscores).

**utm_source** — the specific platform or place the click came from.
Use exactly one of: `reddit`, `tiktok`, `instagram`, `facebook`, `email`, `youtube`, `pinterest`, `direct-partner` (for a bar/venue's own social posting about you), `fatcityentertainment` or `bingocardgenerator` (for cross-property links).

**utm_medium** — the type of activity, one level up from source.
Use exactly one of: `social-organic`, `social-paid` (reserved for future paid spend), `email`, `referral` (a partner venue, a blog, or your other property linking to you), `community` (Reddit-style discussion participation, distinct from a branded social post).

**utm_campaign** — the specific initiative, so results roll up per effort.
Format: `[year]-[season]-[initiative]`, e.g. `2026-fall-acquisition`, `2026-holiday-launch`, `2027-jan-goldclub-push`. Use the same campaign slug across every asset that belongs to that push (blog posts, videos, emails) so GA4 can group them.

**utm_content** — the specific asset, for A/B or asset-level comparison within a campaign.
Format: short slug identifying the exact piece, e.g. `blog-hosting-guide`, `video-the-drop`, `welcome-email-1`. This is what lets you tell "the crowd-reaction video" apart from "the host-tip video" inside the same campaign.

**utm_term** — skip for now; only relevant if paid search is added later.

## The real URLs

The first draft used `/blog/how-to-run-a-music-bingo-night` and `/gold-club`. **Neither path exists** — a link built from either one 404s. The site's actual paths:

| What | Real URL |
|---|---|
| Blog 1 — hosting guide | `https://www.fatcityentertainment.com/triviahostresources/how-to-run-a-music-bingo-night` |
| Blog 2 — games roundup | `https://www.fatcityentertainment.com/triviahostresources/19-music-bingo-games-our-crowds-cant-get-enough-of` |
| Blog 3 — playlist guide | `https://www.fatcityentertainment.com/triviahostresources/decade-by-decade-music-bingo-playlist-guide` |
| Gold Club | `https://www.fatcityentertainment.com/store/p112/GoldClub.html` |
| Trivia Store | `https://www.fatcityentertainment.com/trivia-store.html` |
| Free generator (original) | `https://www.fatcityentertainment.com/bingocardgenerator.html` |
| Both generators compared | `https://www.fatcityentertainment.com/bingocardgenerator2.html` |
| Generator 2 (other property) | `https://bingocardgenerator.online/` |
| Blog home | `https://www.fatcityentertainment.com/triviahostresources.html` |

The blog lives at `/triviahostresources/`, not `/blog/`, because every Weebly URL was preserved in the migration — those paths carry the existing backlinks and search rankings. If short vanity URLs like `/gold-club` are wanted for social bios, they can be added as redirect stubs (the same mechanism already serving 180 legacy blog URLs) — worth doing, since `/gold-club` reads far better in a TikTok bio than `/store/p112/GoldClub.html`.

## Naming reference for the assets in flight

| Asset | utm_source | utm_medium | utm_campaign | utm_content |
|---|---|---|---|---|
| Blog 1 (hosting guide), shared to Reddit | reddit | community | 2026-fall-acquisition | blog-hosting-guide |
| Blog 2 (games roundup) | reddit | community | 2026-fall-acquisition | blog-games-roundup |
| Blog 3 (playlist guide) | reddit | community | 2026-fall-acquisition | blog-playlist-guide |
| Video #1 "The Drop" | tiktok | social-organic | 2026-fall-acquisition | video-the-drop |
| Video #4 "3 Mistakes" | instagram | social-organic | 2026-fall-acquisition | video-3-mistakes |
| (repeat pattern for videos #2-12) | tiktok / instagram / facebook | social-organic | 2026-fall-acquisition | video-[short-name] |
| Welcome email #1 | email | email | 2026-fall-acquisition | welcome-email-1 |
| Weekly host email (recurring) | email | email | 2026-weekly-host-email | week-of-[yyyy-mm-dd] |

## Example full URLs

```
https://www.fatcityentertainment.com/triviahostresources/how-to-run-a-music-bingo-night?utm_source=reddit&utm_medium=community&utm_campaign=2026-fall-acquisition&utm_content=blog-hosting-guide

https://www.fatcityentertainment.com/store/p112/GoldClub.html?utm_source=tiktok&utm_medium=social-organic&utm_campaign=2026-fall-acquisition&utm_content=video-the-drop

https://bingocardgenerator.online/?utm_source=email&utm_medium=email&utm_campaign=2026-fall-acquisition&utm_content=welcome-email-1
```

## Cross-property rule (the actual fix for the measurement gap)

Any link that sends traffic from FatCityEntertainment.com to BingoCardGenerator.Online, or vice versa, must carry the same `utm_campaign` value on both ends of the journey. That's what makes the generator → upgrade → purchase path visible as one continuous story in GA4, instead of two unrelated sessions.

Concretely: if a blog post's "try the free Bingo Card Generator" link points from FatCity to the generator site, it keeps its `utm_campaign=2026-fall-acquisition` tag; the generator site's own "Upgrade to Pro" or "Explore Gold Club" links pointing back to FatCity should carry `utm_source=bingocardgenerator`, `utm_medium=referral`, and the *same* campaign slug that brought the visitor in originally if it's still attributable, or `utm_campaign=onsite-upsell` as a catch-all if the origin campaign isn't known.

This is the one case where a link that feels like part of your own site does need tagging — the two properties are separate GA4 properties, so without a shared campaign value the journey genuinely does look like two unrelated visits.

**Already done on the FatCity side:** the two real outbound links to the generator domain — on `/bingocardgenerator.html` and `/printmusicbingocards.html` — plus the one on `/bingocardgenerator2.html`, all carry `utm_source=fatcityentertainment&utm_medium=referral&utm_campaign=onsite-upsell`. The third mention of the domain, in `index.html`, is a schema.org `sameAs` identity declaration rather than a click target, so it is deliberately left untagged. The reciprocal links on the generator site still need doing; that codebase is separate.

## Implementation checklist

1. Build every **inbound** marketing link (social bios, Reddit comments, email links, cross-property links) using the table above. Leave internal site links untagged.
2. Set up a GA4 UTM-based exploration report (or a simple annotated spreadsheet, if GA4 access is limited) covering `utm_campaign` and `utm_content`, so results are checkable weekly during the fall campaign.
3. Retire any old, untagged links in the current social bios and profiles as the campaign starts, so pre-campaign and campaign traffic aren't mixed under "Direct".
4. Add the reciprocal tags on BingoCardGenerator.Online's links back to FatCity.
5. Revisit this list each time a new campaign starts — add a new `utm_campaign` row rather than reusing an old one, so historical campaigns stay comparable.
