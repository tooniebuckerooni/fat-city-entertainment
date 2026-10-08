# Election Night 2026: the midterms push (written 8 Oct 2026)

US midterms are **Tuesday 3 November 2026**. The goal is a non-partisan party
game a host can run at a watch party or a bar on election night, plus a blog post
that ranks for "election night bingo" / "election trivia", with each game opening
pre-filled in its tool. Not a sale, not a nav item, and not allowed to cost the
Halloween run or the Christmas sends any attention.

Status: **plan only.** Nothing below is built. Three owner decisions (section 6)
come before the build.

---

## 1. What we make

| Piece | Tool it autoloads | Mechanism (already live, verified 8 Oct) |
|---|---|---|
| **Election Night Bingo**: squares are things that happen on a results broadcast, not songs | Bingo Card Generator 2.0 | `_content/generator-links.json` entry with an explicit `squares` array, then `build-generator-links.js --write`, which writes `/cards/election-night/`. The `?load=` handler is live (PR #35 in `bingocardgenerator2`). |
| **Election Night Trivia**: one 10-question round on US elections and civics | Trivia Show Maker | Round JSON at `/trivia-show-maker/rounds/election-night.json`. Then `/trivia-show-maker/?round=election-night`. `autoloadRound()` accepts any `[a-z0-9-]{1,40}` slug, so it doesn't have to be a city. It starts a fresh five-round show and asks first if one is already in progress. |
| **The blog post** | none (links to both) | `_content/drafts/blog07-election-night-bingo-and-trivia.md`, then `publish-post.js`. |

**No music bingo version, on purpose.** Every campaign song has been used by one
side and objected to by its artist, so any playlist we pick reads as a side. The
broadcast-moments bingo has no such problem, and it's the format people actually
search for on election night.

### Neutrality rules (they apply to every square, question and social post)
- **No candidate, party leader or current officeholder names.** That keeps it
  neutral, and nothing goes stale when results come in.
- Red and blue appear **together or not at all**. The card palette is neutral
  (navy, cream, gold), not one party's colour.
- No square or answer depends on who wins. "A state is called" is fine;
  "Party X flips the Senate" is not.
- No voting-logistics claims (deadlines, ID rules, polling hours). They vary by
  state and a wrong one is real harm. If we say anything, it's a single link to
  vote.gov.
- Trivia facts are historical and structural (435 House seats, a third of the
  Senate up every two years, why it's on a Tuesday), not polling or forecasts.

### Draft squares (24 + free space; trim or swap freely)
Someone says "too early to call" · A network projects a winner · The big
touchscreen map gets zoomed in on · "Bellwether county" · Exit poll numbers ·
A concession speech · A victory speech runs long · "Too close to call" · Someone
mentions a recount · Mail-in ballots still being counted · "Record turnout" · A
swing state graphic · The anchor checks a laptop on air · "Path to 218" · Long
line at a polling place · An "I Voted" sticker on screen · Split-screen of two
headquarters · Balloons or confetti on standby · "Decision Desk" · A precinct
"still out" · Someone says "historic" · The Senate balance graphic · A live
shot from a county clerk's office · The coverage goes past midnight

### Trivia round
Draft 10 questions, then send them through the **same evidence pipeline as the
city rounds**: a separate fact-check agent writes
`_content/city-rounds/evidence/election-night.json` and
`node _tools/check-city-rounds.js` refetches each cited Wikipedia article. That
tool is built around the city list, so confirm it accepts a non-city slug before
assuming it does (it may need a one-line allowance). 10/10 verified is the bar,
same as 320/320.

---

## 2. Dates

| Date | What | Notes |
|---|---|---|
| **Thu 8 Oct** | Owner decisions (section 6) | |
| **Fri 9 to Tue 13 Oct** | Build: squares, generator link, trivia round + evidence, blog draft | |
| **Tue 13 Oct** | **Blog post live**, in the sitemap, and request indexing in GSC | That gives about three weeks to index before the search spike in the final week. A post published on 1 Nov won't rank by the 3rd. |
| Mid-to-late Oct | **Christmas Sender send** (EMAIL-CAMPAIGNS.md) | **Don't give the election its own send.** At most one P.S. line in this send. The Christmas sends are the highest-value email of the year. |
| **Now (October)** | Halloween banner `TONE` to `"bold"` | **Overdue**: `add-halloween-banner.js:39` still reads `"subtle"`, which was meant for September. Not an election task, but it's the same calendar. |
| **Tue 27 Oct** | Social starts (section 4) | One week out, when people are planning watch parties. |
| **Sat 31 Oct** | Halloween | All Halloween social goes out before this; election social stays light until it's done. |
| **Sun 1 Nov** | Halloween takedown: `add-halloween-nav.js --remove --write`, `add-halloween-banner.js --remove --write`, revert the c40 seasonal order | Busy day already, so **nothing election-related should need doing on the 1st**. Everything has to be built by then. |
| **Mon 2 Nov** | Biggest social day: "tomorrow night" posts | |
| **Tue 3 Nov** | **Election Day.** Morning post plus an evening "card's ready" story | Watch replies (section 5). |
| Wed 4 to Fri 6 Nov | Counting can run for days | Keep posts about the game, never the result. |
| **Fri 6 Nov** | Wind-down: the post stays live, retitled evergreen in the draft and the live page together | It works again for 2027 locals and the 2028 presidential cycle. No takedown needed, because nothing's in the nav. |
| Thu 26 / **Fri 27 Nov** | Thanksgiving / Black Friday | Christmas owns November from the 4th on. |

**Why no nav item:** the seasonal nav slot holds Halloween until 1 Nov, and two
seasonal items at once would crowd it. A two-day nav item for the 2nd and 3rd
isn't worth a 505-page edit and its reversal. The blog post, social posts, and
links from the Trivia Show Maker and generator guide posts are enough.

---

## 3. Things that would otherwise get missed

1. **The FREE DEMO watermark.** Free-tier generator downloads print `FREE DEMO`
   on every card (HALLOWEEN-PLAN §12). A free preload link alone gives a host
   cards they won't want to hand out. Options in section 6.
2. **Ads platforms treat "election" as political.** Meta and Google require
   political-ad authorization ("Paid for by") for ads about elections, and an
   election-themed game ad can get pulled into that review. Pinterest doesn't
   accept political ads at all. **Organic only**, or keep paid creative to
   "watch party game" with no election wording. Check each platform's current
   policy before spending.
3. **Moderate replies and comments.** A politics-adjacent post draws partisan
   arguments. Don't put a Green Room thread on the post. On social, reply about
   the game and hide or ignore the rest. Have a pinned line ready: "This one's
   for everyone; we're just here for the bingo."
4. **Em-dashes.** The live blog posts carry them (the three 7 Sept posts have 8
   to 16 each) and so do the drafts they came from. The new draft must have
   none, and the same goes for the social copy in section 4.
5. **International audience.** The city pages bring in Canada, the UK and AU/NZ.
   Say "US midterms" in the title so nobody outside the US feels misled.
6. **Pillar uplink.** The new post must link up to `trivia-night-guide.html` and
   `bingo-card-generator-guide.html` (CLAUDE.md), and be added by hand to the
   top of `triviahostresources.html` and to `sitemap.xml`.
7. **Tracking.** Give the generator link `utm_content=election-blog` and social
   links `utm_source=<platform>&utm_medium=social&utm_campaign=election-2026`,
   per `utm-tagging-standard.md`. TSM fires `load_round` with the slug, so trivia
   loads are countable in GA4 by themselves.
8. **Give the free thing a next step.** End both tools on a real offer, not
   "thanks": the Day Pass (if that's the watermark answer), Trivia Show Maker's
   remaining four rounds, or the Christmas Party pack ("your next party is
   six weeks out").

---

## 4. Social

Lead with a 15-second **screen recording**: tap the link, the card fills in, and
it prints. That's the hook no competitor has. Post natively; don't just paste a
link.

| When | Platform | Post |
|---|---|---|
| Tue 27 Oct | Facebook (host and bar groups) | Hosting an election night watch party? We made a free bingo card for it. The squares are things that happen on every results broadcast, no politics required. One tap and it opens filled in, ready to print. [link] |
| Tue 27 Oct | Instagram Reel / TikTok | Screen recording of the autoload. Text overlay: "Election night bingo in 10 seconds." Caption: Works whoever you're rooting for. Link in bio. |
| Thu 29 Oct | Instagram carousel | Slide 1: "Election Night Bingo." Slides 2-4: six squares each. Last slide: "Free card, link in bio." Carousels get saved, and a saved post comes back up on the night. |
| Thu 29 Oct | Reddit (only where the rules allow; see `reddit-engagement-guidelines.md`) | Value first: share the square list as text in party-planning or bar-owner subs, with the link only if asked. Don't post in politics subs. |
| Mon 2 Nov | All | "Tomorrow night. Snacks: sorted. Bingo card: sorted." + link. Also the trivia round: "10 questions on how US elections actually work. Loads straight into our free Trivia Show Maker." |
| Tue 3 Nov AM | Stories / FB | "Polls are open, and so is the bingo card." |
| Tue 3 Nov PM | Stories only | "Who's got 'too early to call'?" Engagement, not a link push. |
| Fri 6 Nov | One wrap post | "Still counting? Your card still works." Then switch to Christmas. |

Hashtags (pick 3 or 4, not all): #ElectionNight #WatchParty #PartyGames
#BingoNight #TriviaNight. Skip candidate and party tags; they pull the post into
the argument.

---

## 5. On the night
- Don't post anything about the result. Not a reaction, not "congrats", not a
  joke. The brand's position is the snacks.
- Hide reply-guy threads rather than arguing.

---

## 6. Owner decisions before the build
1. **Free or paid?** Recommendation: **free**, as list-building into the
   Christmas sends. A one-night game won't move revenue, but a few hundred new
   addresses three weeks before the Christmas send can.
2. **Watermark:** (a) free preload, with the Day Pass ($6.99) offered to remove
   the watermark; (b) also offer a printable PDF of 30 pre-made cards behind the
   song-library email form (`fce-capture.js`), which needs no watermark and
   collects the email; or (c) both. Recommendation: **(c)**. The PDF is the
   capture, and the preload upsells a pass for hosts who want their own colours
   and more cards. Any price shown is pricing-adjacent; run it through the
   `pricing-strategy` skill.
3. **Name:** "Election Night Bingo" (search term) vs a branded name.
   Recommendation: the search term in the H1 and title, with any brand flourish
   in the copy.
