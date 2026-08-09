# The Green Room — build plan

Planning doc for the comment/discussion layer, kept as the design rationale
("why it works this way") now that the thing itself is built. The original
owner-supplied build prompt this reconciled against has been retired — its
corrections are folded in below and it added nothing this doesn't already say.

**Status: live.** The `green-room` thread is deployed and taking real
comments on `/features.html` (Worker + D1 + daily bake, all working — see
`README-greenroom.md` for the technical reference). `hosting`,
`trivia-generator`, `bingo`, and `triv101` are configured in
`greenroom-api/seed/threads.json` but not yet launched — see §7/§8 for what's
actually left. Decisions marked ✅ are settled; ❓ are still open.

---

## 1. What this is for

The Green Room is a discussion layer for trivia hosts, music-bingo hosts, and
venue managers — an audience that talks constantly about pay rates, venue
deals, and what works on a Tuesday, and has nowhere good to do it.

Two goals, in this order:

1. **Traffic.** User-generated long-tail content on subjects with real search
   volume and almost no good answers online: what trivia hosts get paid, how
   to pitch a bar. This only pays off if the content is indexed **on
   www.fatcityentertainment.com**. See §3 — this constraint drives the whole
   architecture.
2. **Conversions.** Green Room → free tools → store. The free tools (Triv 101,
   Trivia Generator, Bingo Card Generator, later WordJab) are the loss leaders;
   the discussion is what makes people arrive and come back.

It is a comment layer with opinionated seeding, not a forum product.

---

## 2. Decisions locked

✅ **Placement: `/features.html`, above the tool entrances.** The owner's call,
and the metaphor earns it — the green room is where performers wait *before*
going on. You pass through the room, then you pick a stage.

To keep the tools reachable, the block above the tools is **bounded**: marquee
header, pinned question, top 3 comments, compose box, and a "Read all N"
control that expands the rest in place. Tools stay within one scroll.

✅ **Launch with two threads, not five.**

| Thread key | Surface | Why |
|---|---|---|
| `green-room` | `/features.html` | The main room. Pay-rate transparency. |
| `hosting` | `/gameshowhosts.html` | Craft and business. The anchor post. |

Deferred, with reasons:
- `triv101` — the owner confirms most Triv 101 discussion already happens in
  the Survey stream, which has its own commenting. A second thread splits it.
- `trivia-generator` — the generator is about to ship and may move to its own
  domain (§6). Wait until its home is settled.
- `bingo` — external domain; add once the pattern is proven on-site.

Five empty rooms is the failure mode. Two rooms that are alive can seed the
rest later, and the widget is thread-agnostic so adding one is a one-line embed.

✅ **Separate Worker, separate D1.** `fatcity-greenroom.dustinramsbottom.workers.dev`.
Zero blast radius on the live Triv 101 survey backend — Green Room changes never
require re-pasting Triv 101's code. Costs one extra dashboard paste, one D1, and
three secrets, all one-time.

✅ **The Worker ships as a single file.** Non-negotiable and not in the build
prompt: `triv101-api` is deployed *by pasting code into the Cloudflare
dashboard* (`wrangler.toml` still has `database_id = "REPLACE_WITH_D1_DATABASE_ID"`,
so Workers Builds was never wired). `triv101-api/src/index.js` is one 421-line
file for exactly this reason. A multi-file ES-module Worker cannot be deployed
by the person who deploys it.

✅ **CORS allowlist lives in Worker `[vars]`, not in code.** Dashboard vars are
editable without re-pasting the Worker. When the generator gets its own domain,
or WordJab arrives, adding it is a text edit rather than a redeploy.

✅ **Moderation stays post-hoc.** Comments appear immediately. A queue is how
the room dies.

---

## 3. The indexability spine — the load-bearing part

The owner's requirement: *"I want to make sure all the discussions are
indexable."* This is the constraint that changes the architecture, and the
build prompt as written does not satisfy it.

### The problem

A `<script src>` widget that fetches comments from a Worker renders them
client-side. Google *can* execute JS, but cross-origin XHR content on a static
page is indexed unreliably and slowly, if at all. Under the build prompt as
written, the discussion would effectively not exist in search.

Server-rendering the threads on the Worker fixes indexing but puts the content
on `*.workers.dev` — a brand-new site with no authority, and not the brand
domain. The traffic goal wants that content on
`www.fatcityentertainment.com`, which already ranks.

### The answer: bake the discussion into the static pages

A `_tools/bake-green-room.js` script (idempotent, same shape as the existing
`_tools/` scripts) fetches each thread from the Worker and writes the comments
into the page as **real static HTML**, between marker comments:

```html
<div data-fc-thread="green-room">
  <!-- fce:greenroom:green-room -->
  ...pinned question + comments, as plain indexable HTML...
  <!-- /fce:greenroom:green-room -->
</div>
```

`widget.js` hydrates over that block on load, replacing it with the live,
interactive version. If the fetch fails, the baked content stays — so a Worker
outage degrades to a readable thread instead of an empty box.

This single decision solves four things at once:

- **Indexable on the brand domain.** The content is in the HTML that
  GitHub Pages serves from `www.fatcityentertainment.com`.
- **Works with JS disabled.** The build prompt asks for this and it is
  otherwise impossible on a static host — there is no server to render into.
- **No flash of empty widget** on load.
- **No DNS dependency.** Does not require the Namecheap → Cloudflare move.

Cost: threads are stale between bakes. That is fine — indexing lags by days
anyway, and the live widget shows current content to actual humans.

Refresh: a scheduled GitHub Action running the bake and committing only when
the rendered output actually changed. ❓ Cadence — daily is the obvious
default.

### Structured data

Baked threads get `DiscussionForumPosting` JSON-LD via the existing
`_tools/add-jsonld.js`. Google surfaces a "Discussions and forums" rich result
for this type, and this is precisely that kind of content. Cheap, and it is the
difference between a blue link and a rich result.

### Live bug: the Triv 101 survey stream has circular canonicals

Found while checking this. The owner says most Triv 101 discussion lives in the
Survey section and wants it indexed. Right now it probably isn't:

- The Worker's SSR page (`triv101-api.dustinramsbottom.workers.dev/`) declares
  `<link rel="canonical" href="https://www.fatcityentertainment.com/triv101/surveys.html">`
  — `triv101-api/src/index.js:195`.
- `/triv101/surveys.html` declares
  `<link rel="canonical" href="https://triv101-api.dustinramsbottom.workers.dev/">`
  and is a meta-refresh redirect with no content — `triv101/surveys.html:12-13`.

Each page names the other as canonical. Google discards contradictory signals
and picks its own winner; a content-free redirect page is a poor candidate.
Compounding it, `/triv101/surveys.html` is **not in `sitemap.xml`**.

**Fix, using the same pipeline:** turn `/triv101/surveys.html` into a real
baked page — survey prompts and their discussion rendered as static HTML,
self-canonical, in the sitemap, with a prominent link to the live stream. The
Worker's canonical is already pointing at it and needs no change. One bake
script, two consumers, and the Triv 101 discussion lands on the brand domain.

### Sitemap gaps to close at the same time

Not in `sitemap.xml` today: `/features.html`, `/trivia-generator.html`,
`/triv101/`, `/triv101/surveys.html`. `/gameshowhosts.html` is in. Baking
discussion into pages that aren't in the sitemap wastes the work.

---

## 4. Corrections to the build prompt

Beyond the single-file and indexability changes above:

**Vote dedupe locks out entire venues.** The prompt sets `voter_hash` to a
salted hash of IP + thread with `PRIMARY KEY (comment_id, voter_hash)`.
Everyone on one bar's wifi is then a single voter — and this audience is
specifically people sitting in bars. Fix: `voter_hash` derives from a
per-browser random token in `localStorage`, sent as a header. The IP hash stays,
used **only** as the rate-limit key. Same abuse resistance; no collateral damage.

**`http://localhost:*` is not a valid CORS origin match.** Origin comparison is
exact-string; wildcard ports need a prefix check.

**`rate_limits` has no eviction** and grows forever. Sweep expired windows on
write.

**DNS is Namecheap, not Squarespace Domains.** (`CLAUDE.md`, `TRIV101-POLISH.md`.)
Doesn't change v1 — no custom domain either way — but the "custom domain later"
note in `wrangler.toml` should point at the real errand: a nameserver move to
Cloudflare, which also unlocks `surveys.fatcityentertainment.com`.

**Admin page hardening.** `/admin/green-room.html` is served by public GitHub
Pages from a public repo. Token-gated is fine, but it needs `noindex`, a
`robots.txt` disallow, and exclusion from the sitemap and `check-links.js`.

**Positioning wrinkle the prompt doesn't catch.** `gameshowhosts.html` is a
*recruiting* page — "Make Extra Bucks Having Fun", "Make A Second Income".
Hosting the pay-rate conversation on the page where Fat City recruits hosts is
a sharper version of the conflict the prompt's own guardrails anticipate. The
disclosure line should sit **above the compose box**, not only in the footer,
and on this surface especially.

**Seed content gets a placeholder guard.** `_tools/publish-post.js` already
refuses to publish on an unresolved `[bracket link]`. The seed script uses the
same idiom: it will refuse to insert a pinned question or unlock that still
contains placeholder text. The mechanic backfires if the unlocks are weak, so
it should be impossible to launch it hollow.

---

## 5. Build order

Each phase is verifiable before the next starts.

1. **Worker + schema.** Single file, local D1. `wrangler dev --local` works in
   the coding sandbox (verified), so every endpoint gets curl-verified against
   real SQLite before anything ships. Turnstile sits behind an env flag —
   `challenges.cloudflare.com` is blocked from the sandbox, so it is testable
   locally in bypass mode and switches on at deploy.
2. **Seed system.** `seed/green-room-content.json` for pinned questions and
   unlocks, plus the placeholder-refusing seed script. Owner fills copy here
   without touching SQL.
3. **Show the pinned-question copy rendered** before wiring any page — the
   build prompt asks for this and it's the right checkpoint.
4. **`widget.js`.** Vanilla, no build step, CSS inlined, `fce-gr-*` class
   prefix to match repo convention. Derives from `assets/css/site-extras.css`
   — Montserrat, `#000`/`#222` on white, `#99790a`/`#e6b800` gold accents,
   2px radii. The one bold move is the thread header.
5. **Bake pipeline** — `_tools/bake-green-room.js` + JSON-LD + sitemap entries.
6. **Wire `features.html` and `gameshowhosts.html`** via an idempotent
   `_tools/add-green-room.js` (CLAUDE.md: never hand-edit across pages).
7. **Admin page.**
8. **`README-greenroom.md`** — deploy steps, secrets (`IP_SALT`, `ADMIN_TOKEN`,
   `TURNSTILE_SECRET`), the Weebly/external embed snippet, custom-domain path.

The sandbox cannot deploy to Cloudflare or reach `*.workers.dev` (403 through
the egress proxy). Deploy is an owner action in the dashboard, as with
`triv101-api`.

---

## 6. Adjacent decisions this touches

**Trivia Generator.** `trivia-generator-pro` is a complete, working
client-side builder, live on GitHub Pages, while `/trivia-generator.html` still
says "coming soon". Plan per the owner: ship it as the **free** tier; the
AI-populated version carries an API cost and gets paywalled. ❓ Own domain
(like bingocardgenerator.online) or a path on the main site — undecided.

That decision has an SEO consequence worth weighing: a separate domain starts
from zero authority and keeps its traffic off the main site, which is the same
leak this plan is closing for the discussion content. `bingocardgenerator.online`
is already a precedent for the split.

**WordJab.io.** Possible future free tool on `/features.html`. The thread
taxonomy and the tool list should both extend without rework — they do.

**Triv 101.** Functional; the polish backlog (`TRIV101-POLISH.md`) stays parked
for now, per the owner. The one exception is the canonical fix in §3, which is
an indexability bug rather than polish.

---

## 7. Open questions — resolved

All settled by what actually shipped: separate Worker + separate D1 (built
that way), daily bake (running via `.github/workflows/bake-green-room.yml`),
Trivia Generator on the main site as `/trivia-show-maker/` (not its own
domain), Turnstile keys set and working (`green-room` takes real comments
today, which only works if the spam check is passing).

## 8. Owner-written content — status

- ✅ **Real Fat City pay numbers** for the `green-room` pinned question —
  written, seeded, live, and already has a real reply from a venue.
- ✅ **3–4 unlocks** for `green-room` — written and seeded.
- ❌ **The `hosting` anchor post** — still the one open item here: fifteen
  years of managing bars and restaurants, written from the side of the desk
  that got pitched. The draft sitting in `threads.json` is generic and
  deliberately held back (`"launch": false`) until it's replaced with the
  real thing — see "Keep moving forward" below.

## 8a. Keep moving forward

Two concrete next moves, in order of how much they unlock:

1. **Write the `hosting` anchor post and launch it.** This has been called
   "the single strongest asset Fat City has in this room" twice now across
   the planning docs, and it's the only remaining launch blocker. Replace the
   `[OWNER: ...]` draft in `greenroom-api/seed/threads.json` with real
   stories — the pitch that worked, the one that didn't, what a GM actually
   told you about entertainment budgets — flip `"launch": true`, run
   `node greenroom-api/seed/seed.js`, execute the SQL it prints against D1,
   then run `_tools/bake-green-room.js --write` (or wait for the next
   scheduled run).
2. **Decide on `trivia-generator`, `bingo`, and `triv101` threads.** All
   three tools are real, live products now (they weren't when this plan was
   written) — Trivia Show Maker and Bingo Card Generator 2 both ship credits
   or passes, and Triv 101's survey stream is exactly the kind of "hosts
   talking shop" content this format is built for. Worth a fresh look at
   whether each tool's page gets its own thread, or whether they consolidate
   into `green-room`. Same launch mechanics as above once there's a real
   pinned question for each.

---

## 9. Out of scope

No accounts, no email capture, no notifications, no nesting past one level, no
rich text or uploads, no DMs, no search, no separate forum site, no structured
rate-submission form yet. That last one is the obvious next step *after* the
free-text thread proves people will post — building it now guesses at fields
before the data exists.
