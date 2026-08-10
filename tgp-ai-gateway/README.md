# tgp-ai-gateway

Source for the **AI Studio** add-on behind `/trivia-show-maker/` — the
license/usage gateway that `trivia-show-maker/js/ai.js`'s `WORKER_URL` calls.
Live at `https://tgp-ai-gateway.dustinramsbottom.workers.dev`.

Same deploy pattern as `triv101-api/` and `greenroom-api/`: this is the
**source of truth for reading and editing**, but the Worker itself is
**deployed by pasting `worker.js` into the Cloudflare dashboard** (Settings ->
Variables and Secrets already hold `LS_API_KEY` and `ANTHROPIC_API_KEY`, and
KV binding `USAGE_KV` — none of that lives in this repo). A commit here does
**not** go live until someone re-pastes it. See the header comment in
`worker.js` for full setup/deploy notes and the credit economy.

This used to live in the separate `trivia-generator-pro` repo. That repo is
retired for active development — see `../TRIVIA-SHOW-MAKER-HANDOFF.md`. Edit
the Worker here from now on.
