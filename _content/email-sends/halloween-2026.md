# Halloween send (direction A)

**Status: written, UNSENT, and still the next one out.** Nothing in it needs a
repo change first.

**It is no longer "send 1".** A first e-blast went out in the week of roughly 8
to 14 Sept (owner, 18 Sept 2026). It was a different message, not this one, and
not built to the direction-A design. See `EMAIL-CAMPAIGNS.md` for what still
needs recording about it, and for why direction A is now a mid-sequence data
point rather than the baseline it was meant to be.

**Written:** 17 Sept 2026. **Send window:** the plan's slot was 15 to 30 Sept.
**Timing is now the live question.** Halloween search demand peaks early-to-mid
October, so this still lands inside the window, but the margin is no longer
generous and it shrinks every day it waits. The owner is travelling until roughly
1 Oct; **pasting this into Sender does not require being back at a desk**, and
reading the results later is a separate job from getting it out.
**List:** ~2,000 on Sender. Segment past buyers out if Sender's data allows and
send to them separately with the bundle-credit line (noted at the foot).
**Direction:** A, "current, tightened". This is the baseline the other three
sends get judged against, so it goes first and does not experiment.
**Landing page:** `/go/halloween/`, already live, already features these same
three products in this same order.

**The one link, on every clickable thing in the email:**

```
https://www.fatcityentertainment.com/go/halloween/?utm_source=sender&utm_medium=email&utm_campaign=halloween-2026
```

Header image, body link and button all use it. Same URL, same UTMs, so GA4
counts one session. Do not deep-link to product pages: the campaign page is
what carries `data-fce-campaign`, which is the only reason `track.js` can
report `origin: campaign-halloween` instead of guessing.

**Component lists were read from `add-cross-sell.js`'s own maps, not guessed.**
Three first-draft claims here were wrong, and the third is a trap worth knowing
about permanently.

1. The Holidays 6-Pack is NOT "Halloween through New Year". It is p111 Girls Vs
   Boys, p136 St Patrick's Day, p149 Soundalikes (April Fool's), p72 Rocker Moms,
   p97 Halloween Party and p103 Christmas Party, so it spans the whole calendar.
2. The Halloween Complete Pack's third item, p33, is itself a 2-game trivia pack,
   so "two trivia shows" undercounts it.
3. **Never itemize the $45.97 in customer copy.** The pack's page says its three
   games come to $45.97, and that figure is correct, but it uses the deliberate
   `quotes` override in `add-cross-sell.js`: p97 is quoted at $16.99, the autoload
   edition the pack is built against, not the $11.99 its own page charges (owner's
   call, 11 Sept 2026, "we're calling the autoload feature an added $5"). At face
   prices the three sum to $40.97. So an email that prints both p97 at $11.99 and
   the $45.97 total hands the reader a $5 hole to find. State the SAVING instead,
   which is true either way, and never write copy that explains or brags about the
   $5. `check-value-stacks.js` prints that gap on every run so it cannot rot.

**Every price below was read off the product page on 17 Sept 2026.** If anything
is repriced in LemonSqueezy before this goes out, re-read them. The prices are
p97 $11.99, p189 $35.97, p155 $57.56.

---

## Subject lines

Pick one. The first is the recommendation: it names the occasion and the
deadline pressure without inventing a deadline.

1. Your Halloween night, sorted
2. October is closer than it looks
3. Halloween music bingo, ready to print

**Preheader:** Print it this afternoon, run it in October. No subscription, no
app, nothing to learn.

---

## Body

### 1. The occasion

**Your Halloween night, sorted.**

Print it this afternoon, run it in October. No app, nothing to install, nothing
to learn. You download a PDF and you are hosting.

### 2. The offer, with the arithmetic

The Halloween Complete Pack is $35.97, which saves you $10.00 against buying its
three games separately, and a month of Bingo Card Generator 2.0 comes with it
free.

### 3. The three picks

**The obvious one: Halloween Party music bingo, $11.99.**
Thirty songs everybody already knows. 250 randomized cards, so a full room can
play at once without two people sharing a winning line.

**The upgrade: Halloween Complete Pack, $35.97.**
Three Halloween games: the music bingo game above, a printable pub trivia show,
and a 2-game trivia party pack. That is a month of October programming rather
than one night. Includes one free month of Bingo Card Generator 2.0, a $24 value,
with the redemption code in your download. After the free month it continues as a
paid monthly subscription unless you cancel, and you can cancel any time.

**The stretch: the Holidays 6-Pack, $57.56.**
Six games that cover the occasions a venue runs all year: St Patrick's Day,
April Fool's, Mother's Day, Girls Vs Boys, Halloween and Christmas Party. Buy it
for October and your Christmas party is already done. Ready-made Spotify and
Apple Music playlists on every game, and a free month of the Generator on the
same terms as above.

### 4. What is in the box

Every music bingo game: 250 randomized bingo cards, laid out to print in
landscape on ordinary letter paper.

The host's callsheet, every answer in play order, so you can confirm a bingo in
seconds.

Ready-made Spotify and Apple Music playlists, already sequenced. You press play.

### 5. Read the songs first

Every song list we make is published in full, free, before you spend anything:
[all 30 Halloween Party songs, in the order they are played](https://www.fatcityentertainment.com/go/halloween/?utm_source=sender&utm_medium=email&utm_campaign=halloween-2026).
Fifty packs, 1,674 songs, all of them readable. If your Tuesday crowd is going
to blank on half the list, you will know first.

### 6. The CTA again

**[Get your Halloween night sorted](https://www.fatcityentertainment.com/go/halloween/?utm_source=sender&utm_medium=email&utm_campaign=halloween-2026)**

No footer nav, no blog links, no dropdowns. One button, one destination.

---

## For the past-buyer segment only

Add one line above the CTA. Do not put it in the main send, because it reads as
a discount to someone who has not bought anything yet:

> Already own one of these games? Reply and we will send a credit code, so
> moving up to a pack does not mean paying twice for a title you have.

That offer is real and already on the site, but it is buried in body copy and in
the price ladder's footnote. A past buyer who paid $11.99 for one game is the
natural buyer of a pack, which makes this the warmest thing in the send.

---

## After it goes out, record these

In `EMAIL-CAMPAIGNS.md`'s results table, so send 2 has a baseline to beat:

- Sender: recipients, opens, clicks.
- GA4: sessions on `/go/halloween/` with `utm_campaign=halloween-2026`,
  `view_item_list`, and `begin_checkout` count.
- Clarity: watch ten recordings of the campaign page. At this list size ten
  recordings tell you more about the layout than the conversion count will.

**`begin_checkout` is a proxy, not a sale.** LemonSqueezy checkout is off-domain,
so the only true revenue figure is in the LemonSqueezy dashboard. Read it there
and write it in the table by hand.

---

## Why no em-dashes anywhere above

House rule, and it applies to email as much as to the site: they read as
machine-written, which is the last thing a send to a warm hobby list should do.
