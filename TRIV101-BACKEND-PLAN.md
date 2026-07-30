# TRIV101 — Live Survey & Moderation Backend (design)

Design for the shared, moderated, self-updating survey system behind Triv 101.
The game itself is already static and live at `/triv101/`. The survey works
today on a **swappable localStorage adapter** (per-browser, great for a single
host screen). This doc specs the real backend that replaces that adapter so
answers are shared across everyone, moderated, and fold back into the game.

## Stack

Final choice TBD (deciding after the first round of testing). Recommendation,
because it's all already in the toolbox:

- **Cloudflare Workers + D1** — the shared database + API (the "real backend"
  the original TRIV101-PLAN always wanted).
- **Ably** — realtime multiplayer: live survey rooms, votes and rankings
  updating in front of players. This is what powers "how users participate
  with each other."
- **Formspree** — zero-infra bootstrap for question suggestions / answer
  intake in the first few months, before the admin queue is built.

Everything below is portable — if we pick Supabase/Firebase instead, the
schema and endpoints map over unchanged.

## Two separate banks (already built this way in the frontend)

- **Game bank** — `triv101/questions.js` (149 seed questions). What the game
  draws from. Grows *only* when a survey prompt's top 3 are confirmed.
- **Survey pool** — `triv101/survey-prompts.js` (100 prompts). What players are
  surveyed on. Answers accumulate here, get voted on, and are moderated.

## Lifecycle (state machine)

This is exactly the flow you described:

```
prompt:  suggested ──approve──▶ surveying ──confirm top 3──▶ live (in game bank)
              │                     │                          
           reject                archive                       
answer:  pending ──approve──▶ counts toward ranking ──▶ (top 3 snapshot on confirm)
              │
           reject
```

- A **suggested** prompt (from a user) waits for your approval.
- An **approved** prompt is open for **surveying**; answers come in **pending**.
- Approved answers are ranked; **most-voted rise to the top**.
- When you **confirm** a prompt's top 3, they snapshot into the game bank and
  the prompt goes **live** in the game.

## Data model (D1 / SQL)

- `prompts(id, text, source['seed'|'suggested'], status, created_at, confirmed_at)`
- `answers(id, prompt_id, text, norm_text, status['pending'|'approved'|'rejected'], anon_id, created_at)`
- `votes(id, answer_id, anon_id, created_at)` — one per voter per answer
- `game_questions(id, prompt_id, a1, a2, a3, published_at)` — the confirmed
  top-3 snapshot the game actually reads
- `moderation_log(id, entity, entity_id, action, actor, at)`

Ranking: approved answers grouped by `norm_text` (lowercased, trimmed,
whitespace-collapsed for dedupe), ranked by `distinct voters + submissions`.
Top 3 surface; on confirm they're frozen into `game_questions`.

## API (Worker endpoints)

Public:
- `GET  /api/prompt/next` — an approved prompt to survey on
- `POST /api/answer` `{prompt_id, text}` — creates a **pending** answer (rate-limited, anon cookie id)
- `POST /api/vote` `{answer_id}` — upsert a vote
- `POST /api/suggest` `{text}` — creates a suggested prompt (pending)
- `GET  /api/game-bank` — confirmed questions (seed + promoted) the game loads
- `GET  /api/ably-token` — mints a scoped Ably token (keeps keys server-side)

Admin (password/token gated):
- `GET  /api/admin/queue?type=answers|prompts|suggestions`
- `POST /api/admin/approve` / `POST /api/admin/reject` `{entity, id}`
- `POST /api/admin/confirm` `{prompt_id}` — snapshot top 3 → publish to game bank

## Realtime (Ably)

- Channel per active prompt room: `triv101:prompt:{id}`. Events: `answer_added`,
  `vote_updated`, `ranking_updated` — players watch answers rise live.
- Presence on the room channel (who's here). Optional `triv101:lobby` for
  global activity.
- Tokens minted by the Worker so the Ably key never ships to the client.

## Intake & moderation (first few months)

- **Bootstrap (today, no new infra):** Formspree forms for "suggest a question"
  and answers → land in your inbox → you approve → a small script bakes approved
  entries into `survey-prompts.js` / the game bank on redeploy.
- **Proper (recommended once volume grows):** the admin queue above behind a
  simple password-gated `/admin` page — approve, see live tallies, confirm top 3.

## Frontend swap (minimal, no UI change)

`survey.js` was built for exactly this: replace `Store.load / submit / aggregate`
with `fetch()` calls to the Worker API, and have `getQuestions()` pull
`GET /api/game-bank` (cached). Same data shapes, so the game and survey UI don't
change. localStorage stays as an offline/demo fallback.

## Guardrails

- Anon cookie id + rate limiting on writes.
- Everything user-submitted is **pending** until approved.
- `norm_text` for dedupe + ranking; basic server-side profanity/dupe checks.

## Phasing

1. D1 schema + `GET /api/game-bank`; frontend reads it → game bank goes shared.
2. `POST /answer` + `/vote` + Ably live ranking on a prompt → the fun part.
3. Admin queue + `confirm → publish` → moderation closes the loop.
4. Suggestions intake.
5. Retire the Formspree bootstrap once the admin queue is trusted.

## Open design questions (mostly the multiplayer feel — your call)

- **Participation mode:** solo surveying, live shared rooms, or head-to-head?
  Ably supports all three.
- **Submit vs vote:** do players vote on each other's answers, or only submit
  their own?
- **Identity:** fully anonymous, or a light handle/name per player?
- **Trust:** always-manual moderation, or auto-approve once a contributor has a
  track record?
