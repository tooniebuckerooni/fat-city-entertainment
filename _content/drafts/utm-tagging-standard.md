# UTM Tagging Standard — FatCity Entertainment + Bingo Card Generator Online

Purpose: right now GA4 (across the two properties) and the store's own analytics can't be joined into one attribution picture — a visitor's path from the free generator through to a Gold Club purchase can't be traced end to end. This standard gives every outbound link a consistent tag so that traffic source, specific channel, and campaign are all machine-readable in GA4 regardless of which property the click lands on. Implement this at the DNS cutover to the new GitHub-hosted site so tracking is consistent from day one, rather than retrofitting it later.

## The five parameters, and how to fill each one

Every marketing link should carry all four of `utm_source`, `utm_medium`, `utm_campaign`, and `utm_content` (skip `utm_term` unless you're running paid search). Always lowercase, always hyphen-separated (no spaces, no underscores).

**utm_source** — the specific platform or place the click came from.
Use exactly one of: `reddit`, `tiktok`, `instagram`, `facebook`, `email`, `youtube`, `pinterest`, `direct-partner` (for a bar/venue's own social posting about you).

**utm_medium** — the type of activity, one level up from source.
Use exactly one of: `social-organic`, `social-paid` (reserved for future paid spend), `email`, `referral` (a partner venue or blog linking to you), `community` (Reddit-style discussion participation, distinct from a branded social post).

**utm_campaign** — the specific initiative, so results roll up per effort.
Format: `[year]-[season]-[initiative]`, e.g. `2026-fall-acquisition`, `2026-holiday-launch`, `2027-jan-goldclub-push`. Use the same campaign slug across every asset that belongs to that push (blog posts, videos, emails) so GA4 can group them.

**utm_content** — the specific asset, for A/B or asset-level comparison within a campaign.
Format: short slug identifying the exact piece, e.g. `blog-hosting-guide`, `video-the-drop`, `welcome-email-1`. This is what lets you tell "the crowd-reaction video" apart from "the host-tip video" inside the same campaign.

**utm_term** — skip for now; only relevant if paid search is added later.

## Naming reference for the assets already in flight

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
https://www.fatcityentertainment.com/blog/how-to-run-a-music-bingo-night?utm_source=reddit&utm_medium=community&utm_campaign=2026-fall-acquisition&utm_content=blog-hosting-guide

https://www.fatcityentertainment.com/gold-club?utm_source=tiktok&utm_medium=social-organic&utm_campaign=2026-fall-acquisition&utm_content=video-the-drop

https://www.bingocardgenerator.online/?utm_source=email&utm_medium=email&utm_campaign=2026-fall-acquisition&utm_content=welcome-email-1
```

## Cross-property rule (the actual fix for the measurement gap)

Any link that sends traffic from FatCityEntertainment.com to BingoCardGenerator.Online, or vice versa, must carry the same `utm_campaign` value on both ends of the journey. That's what makes the generator → upgrade → purchase path visible as one continuous story in GA4, instead of looking like two unrelated sessions. Concretely: if a blog post's "[Try the free Bingo Card Generator]" link points from FatCity to the generator site, it keeps its `utm_campaign=2026-fall-acquisition` tag; the generator site's own "Upgrade to Pro" or "Explore Gold Club" links pointing back to FatCity should carry `utm_source=bingocardgenerator`, `utm_medium=referral`, and the *same* campaign slug that brought the visitor in originally if it's still attributable, or `utm_campaign=onsite-upsell` as a catch-all if the origin campaign isn't known.

## Implementation checklist at DNS cutover
1. Build every outbound marketing link (blog CTAs, social bios, email links) using this table before the new site goes live, not after.
2. Set up a GA4 UTM-based exploration report (or a simple annotated spreadsheet, if GA4 access is limited) covering `utm_campaign` and `utm_content` so results are checkable weekly during the fall campaign.
3. Retire any old, untagged links on the current Weebly site's social bios/profiles at the same time the new site goes live, so old and new traffic aren't mixed under "Direct."
4. Revisit this list each time a new campaign starts — add a new `utm_campaign` row rather than reusing an old one, so historical campaigns stay comparable.
