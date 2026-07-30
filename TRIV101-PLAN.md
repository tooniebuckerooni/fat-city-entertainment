# TRIV101 — bringing it back, broad strokes

For whoever picks this up next. Dustin is tracking down the old TRIV101 game
files and logos separately — **when those show up, they're the starting
point.** Keep the existing look and game function; this doc is the shape of
the work around that, not a spec to redesign it from scratch.

## What's already true, from digging through this repo

- **No game code lives here.** TRIV101 was a downloadable file (a desktop
  app, in the style of the site's other "trivia presentation" products —
  350 free questions / 1350 in a paid Premium pack), not a web app. The
  actual file is gone from this repo; Dustin is hunting for it.
- **`pages/triv101.html`** is a real asset: a staged, `noindex`, already-built
  "coming soon" teaser page for an "all-new TRIV101 web app" — dark stage
  background, amber/hot-pink gradient wordmark, darts-countdown copy, an
  email capture form. Good bones for a launch page once there's something to
  launch. Don't rebuild this without a reason.
- **`dashboard.html`** ("Question Approval Dashboard") and **`submit.html`**
  ("Submit Answers To Survey Questions") are both empty shells — a heading
  and, on dashboard, two buttons wired to `javascript:;` that do nothing.
  Nobody ever built the "collect survey answers, approve them" workflow.
  That's exactly what the self-updating survey needs to become, for real
  this time.
- **`store/p7/triv101premium.html`** (+ an orphaned duplicate at
  `/8j6e7n5n3y09.html`) is the old commercial listing — stale CA$22 pricing,
  unwired checkout, not linked anywhere. Decide later whether it's worth
  reviving as a paid tier or just retiring once the new version has its own
  model.

## The game, as it worked before (per the 2020 launch post)

Survey-style trivia meets darts. Teams start at 101. Each round: guess the
*most* popular survey answer, or press your luck on the 2nd/3rd most popular
for a bigger score. Points count down from 101 — land on exactly zero to
win, overshoot and bust. One host, any screen (bar TV, Zoom, Twitch, living
room) — this reads as a **single host-controlled display**, not an app where
every player needs their own device. Keep that shape unless the found code
says otherwise.

## What has to change: it needs a real home

This site is static (GitHub Pages, no server, no database) — fine for
marketing pages, not for a live game or a survey that actually accumulates
answers over time. TRIV101 needs to be its own app, on its own hosting, with
a real database. This repo's role shrinks to: link to it, and eventually
publish content built from its data.

## The self-updating survey, specifically

Decided direction: **seed it, then let it grow.** Launch with a
hand-written starter question bank across a few categories. From there:

- A public, low-friction submission form collects new answers to existing
  (or new) questions.
- Submissions land pending, not live — someone approves before an answer
  can affect scoring. This is the thing `dashboard.html` gestured at and
  never became.
- Approved answers fold into that question's live ranking, so the "top 3"
  used in scoring can shift over time as real answers accumulate.

## Phased plan

1. **Scaffold the app** in its own repo, real backend + database. Wire the
   host-screen game loop (question → guess → press-your-luck → countdown)
   against a handful of seed questions to prove the loop works end to end.
   If Dustin's found files include working game logic, port/adapt that
   rather than rewriting the mechanic from scratch.
2. **Build the submission + approval queue** for real — this is the actual
   "self-updating" engine, and the one piece that has to be built new
   regardless of what's found in the old files.
3. **Launch**: point `pages/triv101.html`'s CTA at the real app instead of
   the email list, write a launch post, drop in real logo/branding once
   Dustin has it (nothing above needs to wait on that — the teaser page's
   existing color/type system can carry a v1).
4. **Content flywheel**: once there's real play data, periodic "survey
   says" results become their own recurring blog content — same idea
   already logged in `HANDOFF.md`'s "one idea worth not losing."

## Open questions for whoever builds this

- What did Dustin actually find? Confirm before assuming anything above
  still holds — especially the "single host screen" shape, since the found
  code is the source of truth on look and game function.
- Hosting/stack for the new app — nothing chosen yet beyond "needs a real
  backend and database."
- Whether `store/p7/triv101premium.html` becomes a paid tier of the new
  version, or gets retired outright.
- Moderation approach for the approval queue at scale (manual is fine at
  launch; won't be forever if this gets real traffic).
