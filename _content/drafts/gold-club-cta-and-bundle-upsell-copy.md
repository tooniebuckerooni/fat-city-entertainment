# Gold CTA + Bundle/Cart Upsell Copy

**Status: rewritten Aug 2026 — the previous version of this file (see git history)
was written for a subscription model and was never implemented. Positioning has
since been decided the other way: Fat City sells finished, one-time-purchase
packs; a subscription is BingoCardGenerator.online's model, not this one. Do not
reintroduce "join," "$X/month," or "cancel anytime" language here — see
`gold-club-cta-and-bundle-upsell-copy.md`'s sibling discussion in this session
for why (Club/subscription framing was actively hurting the pitch).**

Naming note: the live product page is still titled "Music Bingo Gold Club" —
that rename is intentionally on hold (see CLAUDE.md / HANDOFF.md). New copy
written from here forward should refer to it as **"Gold 50"** rather than
"Gold Club" or "Gold Pack" — a plain, descriptive label that doesn't fight the
one-time-purchase story the way "Club" does, without committing to a formal
product rename yet. All links still point at `/store/p112/GoldClub.html`.

Gold is the #1 revenue product (CA$7,996 over 2 years, +40.9%) and should be
the primary CTA nearly everywhere. These variants let it show up in different
contexts without feeling repetitive.

## Site-wide Gold 50 CTA variants

Rotate these across nav bar, homepage hero, footer, and blog end-of-post CTAs
so it doesn't read as the same line everywhere.

**Nav bar / persistent button (short):**
> Get Gold 50

**Homepage hero (benefit-forward):**
> All 50 music bingo games. One payment. Yours forever.
> [Get Gold 50 →]

**Blog post closing CTA (host-to-host tone, matches the 3 blog posts already drafted):**
> Tired of building your own playlists? Gold 50 hands you all 50 games, hand-tested on real audiences — download once, host forever.
> [Explore Gold 50 →]

**Footer (low-key, always-present):**
> Every game, one price, no bill next month. [Gold 50 →]

**Post-purchase / thank-you page (for Starter Pack or 25-Games buyers — upsell path):**
> You've got a taste of the library — Gold 50 unlocks the rest. Same one-time-payment deal, all 50 games, nothing recurring.
> [Upgrade to Gold 50 →]

Retired: the old "subscription framing A/B test" (monthly vs. annual pricing
language) — that test assumed a subscription model this product doesn't use.
If a real subscription product ever exists here, test framing on *that* page,
not this one.

## Bundle upsell copy (cart page)

**When cart contains a single decade or genre pack (e.g., The 80s, The 90s):**
> Building a full rotation? Bundle 3 packs and save — or skip the picking entirely with [Gold 50], where every game is already included.

**When cart contains Bingo Card Generator Pro:**
> Pro gets you unlimited custom card sets. Pair it with the [Starter Pack (Top 10)] to run your first themed night tonight.

**When cart contains the Starter Pack (Top 10):**
> Liked the Starter Pack? [Gold 50] gives you all 50 games for less per game than buying them one at a time — one payment, no rebuy.

## Cart CTA copy (checkout button variants)

Keep the actual checkout button action-oriented and low-friction:
> Complete My Order (default)
> Get My Packs (alternate, more casual tone matching the brand voice)

Avoid generic "Submit" or "Checkout" — specific action language converts
better and matches the practical, host-to-host tone used across the blog
content.

## "Complete Your Night" bundle CTA (generator + blog pages)

Addresses the persistent view-to-cart leak on the free generator's results
page. Place as a card/box there and at the end of each blog post, distinct
from the plain Gold 50 CTA:

**Headline:** Complete Your Night
**Body:** You've got your cards — now grab a themed pack to match. Bundle any 2 packs and save, or go all-in with Gold 50 for every game at once.
**Buttons:** [Shop Packs] [Explore Gold 50]

Two paths (small bundle vs. the whole library) rather than forcing a single
choice — should help lift the view-to-cart rate without over-committing a
casual first-time visitor to the biggest purchase right away.

## Once the Bingo Card Generator perk is live — hold until then

Not for use until the "1 year of Bingo Card Generator access included" perk
actually ships (planned for next week's promo swap, per HANDOFF.md). Do not
publish any of the lines below before that perk is real and live — an unearned
perk claim is worse than no claim.

**Homepage hero, perk-forward variant:**
> All 50 music bingo games, plus a full year of Bingo Card Generator access (a $116 value) — included. One payment, yours forever.
> [Get Gold 50 →]

**Blog/footer, shorter perk mention:**
> Gold 50 now includes a year of Bingo Card Generator access, free.

Constraint carried over from the BingoCardGenerator paid-search handoff: never
imply a direct "connect your Spotify account" integration — the generator
doesn't have that. If perk copy mentions playlists, the accurate phrasing is
"export your playlist and upload it," not "connect your account."

## Implementation notes

- Keep Gold 50 CTA copy consistent in wording across the 3 blog posts already
  delivered (they currently use "[Explore Music Bingo Gold Club]" as a
  placeholder — swap in the "Blog post closing CTA" variant above) and the
  site's other templates.
- Do not stack more than one CTA style per page section — one primary action
  per page/section keeps conversion clean.
- This file supersedes all prior subscription-framed language. If you find
  "Join Gold Club," "$X/month," or similar phrasing live anywhere on the site,
  it's a leftover from before this rewrite and should be corrected to match
  the variants above.
