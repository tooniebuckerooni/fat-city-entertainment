# Merge plan: what is in flight and how to land it without collisions

Written 10 Nov 2026, straight after `main` took the nav nofollow, the Christmas
hub link and the new favicon (commits `083053c`, `12ae06f`, `1724b45`). Every
claim below was measured that day; re-measure before relying on a number.

Retire this file once the Black Friday branch is merged and Christmas is live.

## 1. What changed on `main` on 10 Nov, and why it matters to every branch

Those three commits touched **about 765 HTML files**, one or two lines each:

- the nav link to bingocardgenerator.online now carries `rel="nofollow noopener"`
  (519 pages, desktop and mobile copy), and
- the `<!-- fce:favicon -->` block gained an SVG line and lost `sizes="any"`
  (757 pages).

So **any branch cut before 10 Nov is behind on nearly every page.** Git merges
that cleanly as long as the branch did not edit the same lines, and none of the
live branches did (tested, see section 2). The rule that keeps it that way:

> **First step in any session on an older branch:
> `git fetch origin main && git merge origin/main`, before running a single tool.**

A tool run on a stale checkout rewrites pages from stale shells. That is how a
page ends up back on the old menu or the old favicon block.

Two more things to know:

- **A page cloned from an old shell** (a stale branch, an old draft) can arrive
  without the nofollow. `nofollow-bcg-nav.js` is in the Monday loop and will
  report it; `node _tools/nofollow-bcg-nav.js --write` fixes it. The favicon
  block is NOT in the loop: run `node _tools/add-favicon-links.js --write` after
  bringing in any hand-carried page. (It always prints "refreshed: 757"; that
  is its normal output, not drift.)
- **`build-campaign-pages.js` types its own favicon block.** It was updated in
  `1724b45`. If the favicon links ever change again, change them in
  `add-favicon-links.js` AND `build-campaign-pages.js`, or the two `/go/` pages
  drift and Monday files an issue.

## 2. Every branch with work not on `main` (10 Nov)

| Branch | Date | What it holds | Collides with `main`? | Do |
|---|---|---|---|---|
| `claude/holiday-sale-strategy-w8am6q` | 6 Nov | Black Friday singles codes (BFMUSIC40, BFTRIVIA30), all `live: false`; sale plan and emails; promo tags on 7 store listing pages | **No.** Test merge clean, both directions, re-tested after the third commit | Merge next (section 3) |
| `claude/zen-hypatia-m526oq` | 3 Oct | A 53-line Search Console log for 3 Oct in `SEO-SNAPSHOTS.md`, which never reached `main` | No, one file, append only | Safe to merge any time; worth keeping |
| `claude/holiday-season-primer` | 19 Oct | Already on `main` as `534a2d0d` | n/a | Stale. Delete in the browser |
| `claude/politics-game-blog-post-0xp642` | 8 Oct | An early `ELECTION-PLAN.md`; `main` has the finished one | Would regress two docs | Stale. Delete. Never merge |
| Everything dated September or earlier | | Predates the tracking, nav and favicon work | Yes, badly | **Never merge.** Re-publish from the draft instead (CLAUDE.md, "Do not merge a stale content branch") |

No open pull requests and no open health-check issues on 10 Nov. The last Monday
run (9 Nov) was clean, and the full drift loop was run by hand against the
10 Nov `main`: zero tools drifted, all seven status checks exit 0.

## 3. Merge order from here

1. **Black Friday branch into `main`.** It is inert until a code is switched on
   (every entry is `live: false`), so it can land now instead of on 26 Nov under
   time pressure. In that session: merge `main` in first, re-run
   `node _tools/add-promo-tags.js` and `node _tools/check-promos.js` (expect 0
   and exit 0), then fast-forward `main`. It touches `ls-buy.js`, so it needs
   the owner's OK under the usual rule.
2. **Christmas launch (p175, then p190)** from a branch cut from the NEW `main`.
   See section 4 for the one real overlap.
3. **`zen-hypatia`'s Search Console log**, whenever convenient.
4. Anything new: branch from `main` as it stands that day.

**`main` moves on its own once a day.** "Bake the Green Room" commits to `main`
every morning, so a `git push origin <branch>:main` can be refused as
non-fast-forward even when nobody else merged. Fetch and merge `main`, then push
again. Never force.

## 4. The one real overlap ahead: the Christmas hub spec

`HOLIDAY-SALE-2026.md` section 6 launches the Christmas Complete Pack with, among
other steps, *"`_tools/new-content-pages.json`: Christmas hub feature card p42 ->
p190"*. The hub's whole body is **one line of JSON**, and the 10 Nov commit
edited that same line (it added a sentence to "Build your own Christmas cards"
linking the sister site's Christmas bingo post).

- Done from a branch that has merged `main`: no problem, it is just an edit.
- Done from a branch that has NOT: git reports a conflict on that line and on
  `christmas-trivia-and-music-bingo.html`. Resolve by taking `main`'s line and
  re-applying the p42 -> p190 edit, then
  `node _tools/new-content-page.js --only christmas-trivia-and-music-bingo.html --write`.
- Either way, check afterwards that the sentence beginning *"Playing with kids
  or a mixed crowd?"* is still on the page.

## 5. What is waiting on the owner (nothing here is blocked on code)

Measured on `main`, 10 Nov:

- **The Christmas early bird has not started.** `EARLYBIRD15` is dated 4 to 27
  Nov and is still `live: false`, so six days of its window are gone. It needs
  the code created in LemonSqueezy (15% off, scoped to p190, p42 and p155,
  expiring 28 Nov), then a word to the agent.
- **p175 Christmas Trivia Night and p190 Christmas Complete Pack are still
  staged**: `publish: false`, `noindex`, no checkout link in `ls-links.js`. The
  Christmas launch email was written for 4 Nov and depends on both.
- **Black Friday needs three codes** before 27 Nov: BLACKFRIDAY25, BFMUSIC40,
  BFTRIVIA30 (scopes in `HOLIDAY-SALE-2026.md` section 3D and the 6 Nov commit).
  Then the twelve 12DAYS codes before 1 Dec and NEWYEAR20 before 26 Dec.
- **Worker pastes** (dashboard jobs, an agent cannot do them):
  the sister site's `worker.js` plus the `LS_PRODUCT_IDS` variable (see NEXT.md
  in `bingocardgenerator2`), and here the `triv101-api` re-paste with the
  `0003_subscribers.sql` migration if that has not been done since 17 Sept.
- **Rotate the three old Generator redemption codes**, still open from September.
- **Delete stale remote branches** in the browser. The git proxy refuses
  deletions from a session.

## 6. Dates that will touch many pages again

Each of these is a sitewide or multi-page edit. Do each one from a fresh `main`,
alone, and let it land before starting the next.

| Date | What | Tool |
|---|---|---|
| Mon 16 Nov, weekly | Health check runs on `main` | read the issue if one opens |
| Thu 26 Nov | Thanksgiving. Nothing to take down here | |
| Fri 27 Nov | Black Friday send 7am; early bird ends; three BF codes on | `live: true` per code, owner's word only |
| Mon 30 Nov | Cyber Monday reminder 9am; BF codes end at the visitor's midnight | automatic |
| 1 to 12 Dec | 12 Days, one code a day | automatic once live |
| Thu 17 Dec | Last-minute send | |
| 26 Dec | Christmas nav item down (519 pages) | `add-christmas-nav.js --remove --write` |
| 26 Dec to 1 Jan | NEWYEAR20; send Sun 27 Dec | |
| 2 Jan | Christmas countdown markup out; c40 back to calendar order; p42 and p103 tiles off the storefront | `add-season-countdown.js`, `order-store-tiles.js`, `add-store-tile.js --remove` |
| January | Decide whether the generator moves onto this domain (section 7) | |

## 7. Why the nofollow exists, and what to watch

Search Console, 28 days to 10 Nov against the previous 28:

| | Clicks | Impressions |
|---|---|---|
| bingocardgenerator.online | 1 (was 15) | 568 (was 1,527) |
| fatcityentertainment.com | 588 (was 366) | 29,908 (was 14,312) |

The sister site fell to position 80 to 95 on every one of its 192 queries at
once, inside Google's September 2026 spam update. This site ranks new pages in
days (the election night post: 178 clicks at position 7).

What follows from that:

- **Seasonal content goes on THIS site**, with the generator as the tool it
  links to. Do not build new landing pages on the sister site until it recovers.
- **Links to the sister site in page copy stay followed.** Only the nav item is
  nofollowed. Do not "tidy" the two into agreement.
- **Not done, on purpose:** no link to the sister site's free cards on
  `store/p103/christmasparty.html`. It is a paid page in the middle of the sale.
- **Re-pull both Search Console exports around 8 Dec.** If the sister site's
  homepage is still at 80 or worse in January, the question becomes moving the
  generator onto this domain. That is the owner's decision; the brand plan
  currently says no domain change.

To undo the nofollow: `node _tools/nofollow-bcg-nav.js --remove --write`, and
revert the one line in `add-app-nav.js`.
