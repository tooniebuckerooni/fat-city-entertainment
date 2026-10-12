# Etsy: the setup checklist

**Written 12 Oct 2026.** Everything Etsy asks for that is not your identity, your
bank or your files is already done. Copy is in `LISTINGS.md` (paste-ready, one
box per field). Images and the START HERE guides are in the zip (`etsy-kit.zip`),
or regenerate with `node _tools/build-etsy-kit.js --write --images` into
`_export/etsy/`.

## What only you can do (about 2 hours the first time)

1. Create the account and the shop. Etsy asks for ID, a bank account, a credit
   card on file and, in some countries, a small one-time setup fee.
2. Download the game files from LemonSqueezy (Products > the product > Files) and
   attach them to each listing.
3. Press Publish.

## Before you start: four decisions (my recommendation first)

| Decision | Recommend | Why |
|---|---|---|
| **Shop name** | `FatCityEntertainment` | Exactly 20 characters, the Etsy limit, and it matches everything else. Fallbacks: `FatCityGames`, `FatCityGameNight`. |
| **Listing currency** | **USD** | Same figure as the site and LemonSqueezy. Etsy converts for buyers. You will pay about 2.5% conversion on deposits to a Canadian bank. That is cheaper than keeping two price lists in step. |
| **Price** | **Same as the site** | The kit reads each price off its product page, so they match. Etsy music bingo mostly sells for $2 to $12, so a single at $11.99 is at the top of that range. It is still the honest choice: 250 cards, a callsheet and a sequenced playlist against the 30-card listings most of those prices buy. Don't price lower on Etsy than on your own site. |
| **Offsite Ads** | **Opt out** | Etsy charges 12 to 15% on any sale from an ad it ran for you. Under $10,000 a year in Etsy sales you can switch it off (Shop Manager > Settings > Offsite Ads). Check that threshold on the page itself. |

**Fees on an $11.99 single, roughly:** $0.20 to list (each listing renews every
4 months, or after each sale), 6.5% transaction, about 3% + $0.25 payment
processing, about 1.15% regulatory fee in Canada, and 2.5% conversion. That leaves
about **$10.00 of $11.99**. On the $41.99 Decades pack it leaves about $36.00.
These are from third-party summaries; Etsy's own Fees & Payments Policy page is
the one to trust.

## Step by step

### A. Open the shop (Etsy walks you through it)
1. etsy.com/sell > **Get started**.
2. Shop preferences: language English, country Canada, **currency USD**.
3. Shop name: paste from `LISTINGS.md` > Shop.
4. Etsy makes you **stock the shop with one listing before it opens**. Use
   **Christmas Music Bingo** for that (section B below), then come back.
5. Payments: bank details and ID. Billing: a card for fees.
6. Open the shop.

### B. Each listing (about 6 minutes each, 13 listings)
Shop Manager > **Listings** > **Add a listing**. In `LISTINGS.md`, each listing
has a box for every field below.

1. **Photos:** upload the listing's folder in order: `01-hero` first. It is the
   thumbnail, and every image is 2700x2025 (4:3, over Etsy's 2000px minimum).
2. **Title:** paste.
3. **About this listing:** *I did* · *A finished product* · *2020 to 2026*.
4. **Category:** type "party games" and take Etsy's suggestion
   (Paper & Party Supplies > Party Supplies > Party Games). Then set the
   attributes it offers: **Holiday** (Christmas, Halloween) and **Occasion**
   (Birthday, Office party, and so on).
5. **Type: Digital.**
6. **Description:** paste.
7. **Price:** the figure in that listing's heading. **Quantity:** 999.
8. **Tags:** paste the comma-separated line into the tag box. It splits into 13.
9. **Section:** as listed (create the five sections the first time, from
   Shop Manager > Listings > the gear icon).
10. **Digital files** (5 files, 20MB each):
    - `START-HERE.pdf` from that listing's folder, **always**. On the site, the
      playlists are linked on the product page. An Etsy buyer never sees that
      page, so START HERE is where they get the music.
    - Then the game files. **A pack has more than 4 files** (five games of cards
      plus callsheets), so zip them: one `.zip` per pack, or one per game if a
      zip goes over 20MB.
11. **Renewal:** *Automatic* for everything except **Halloween Music Bingo**:
    set that one to *Manual* and deactivate it on 1 November.
12. Publish.

### C. Shop settings (15 minutes, once)
Shop Manager > Settings > **Info & Appearance**: paste these from `LISTINGS.md` > Shop:
- **Banner:** upload `shop-banner-3360x840.jpg`.
- **Icon:** upload `shop-icon-500x500.jpg`.
- **Shop title** and **announcement**.
- **About:** the story headline and story. **This is the one place Etsy allows a
  link to fatcityentertainment.com**, so add it here and nowhere else.
- **FAQs:** five pairs.
- **Message to buyers for digital items.**
- **Policies:** digital downloads, returns, exchanges.

## Three rules that keep the shop safe

1. **Never steer a buyer off Etsy to buy.** Etsy treats it as fee avoidance and
   can close the shop. That means no site link, no SPOOKY20, and no "cheaper on
   our website" in any listing, message or file. The tool refuses a link in a
   listing for this reason, and START HERE carries none.
2. **No trademarks as tags.** "Spotify playlist" is fine in a description, where
   it describes what's included. As a tag it is what gets listings pulled. The
   tool refuses one.
3. **Answer messages inside 24 hours.** That is most of what Etsy's Star Seller
   badge measures, and it is the promise the shop copy makes ("a real host
   answers").

## Sales on Etsy are separate

LemonSqueezy codes do nothing on Etsy. Etsy has its own **Sales and discounts**
tool (Shop Manager > Marketing). If you want SPOOKY20's 20% there too, set it up
there. It's optional, and best left until the shop has a few sales.

## What's in the kit (13 listings)

Christmas Music Bingo · Christmas Game Show 3-Pack · Holiday Music Bingo 6-Pack ·
Decades 5-Pack · The Year Was 5-Pack (pitched at New Year's Eve) · 80s · 90s · 70s ·
Golden Oldies · Hair Bands · Pub Trivia Night One · Pub Trivia 5-Pack · Halloween
Music Bingo.

Chosen from your own best-seller list, plus the Christmas and New Year lineup,
plus two trivia listings, because Etsy searches for "pub trivia" and the
printable shows need no screen. Add more by adding an entry to `listings.json`
and re-running the tool. It checks the title length, the 13 tags of 20
characters each, em-dashes and links before it builds anything.

**The Holidays 6-Pack:** the site version includes a month of Bingo Card
Generator 2.0. Leave it out on Etsy unless you have a redemption code that can be
used more than once. A single-use code in a file Etsy sends every buyer is gone
after the first order.
