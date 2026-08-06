# Deploying The Green Room — click by click

`README-greenroom.md` is the reference. This is the walkthrough: every click, in
order, assuming you've never set one of these up. Roughly 30 minutes.

You need: a browser, this repo open in another tab, and a text editor for
scratch notes. **Nothing here can be done by a coding agent** — this sandbox is
blocked from reaching Cloudflare, so it's you and a browser.

Keep a scratch note open. You'll collect four values as you go:

| # | Value | Where you get it |
|---|---|---|
| 1 | D1 database ID | Step 2 |
| 2 | Turnstile **site** key | Step 6 |
| 3 | Turnstile **secret** key | Step 6 |
| 4 | An admin token you invent | Step 5 |

---

## Step 1 — Sign in

Go to **dash.cloudflare.com** and sign in with the account that already runs
`triv101-api`. If you see that Worker in the list, you're in the right account.

---

## Step 2 — Create the database

1. Left sidebar → **Storage & Databases** → **D1 SQL Database**
2. **Create database**
3. Name it exactly `greenroom`. Leave the location on default.
4. **Create**
5. On the database page, find **Database ID** — a long string of letters,
   numbers and dashes. **Copy it into your scratch note.** That's value 1.

---

## Step 3 — Create the tables

Still on the `greenroom` database page:

1. Click the **Console** tab
2. Open `greenroom-api/migrations/0001_init.console.sql` from this repo. Select
   all of it, copy it.

   > Use the `.console.sql` file, not `0001_init.sql`. The dashboard console
   > strips `--` comments and then rejects what's left with *"Requests without
   > any query are not supported"*. The commented file is for `wrangler`.
3. Paste into the console box and click **Execute**

You should get a success message. Click the **Tables** tab — you should now see
six tables: `comments`, `votes`, `flags`, `rate_limits`, `unlocks`,
`datapoints`. If you see six, this step worked.

---

## Step 4 — Create the Worker

1. Left sidebar → **Compute (Workers)** → **Workers & Pages**
2. **Create** → **Start with Hello World!** → **Deploy**
   (You're making an empty Worker so it exists; the real code goes in next.)
3. Rename it to `fatcity-greenroom`: on the Worker's page, **Settings** →
   **General** → the name field → save.

   > If renaming is awkward, delete it and create a new one named
   > `fatcity-greenroom` at the naming step instead. The name matters — it
   > becomes the URL, and the widget is pointed at
   > `fatcity-greenroom.dustinramsbottom.workers.dev`.

4. Click **Edit code** (top right)
5. Open `greenroom-api/src/index.js` from this repo. Select all, copy.
6. In the Cloudflare editor: select all of the Hello World code, delete it,
   paste ours in its place.
7. **Deploy** (top right)

---

## Step 5 — Connect the database and set the secrets

On the Worker's page → **Settings**:

**5a. Bind the database**
1. Find **Bindings** → **Add** → **D1 database**
2. Variable name: `DB` — exactly that, capital D, capital B
3. D1 database: pick `greenroom`
4. **Deploy**

**5b. Add the secrets** — Settings → **Variables and Secrets** → **Add**.
For each one, set **Type: Secret** (not Text), then Deploy.

| Name | Value |
|---|---|
| `IP_SALT` | Any long random string, 32+ characters. Mash the keyboard. Never change it later — it would reset every rate limit and vote. |
| `ADMIN_TOKEN` | A password you invent. You'll type this into the admin page. Make it long. **This is value 4 — save it.** |
| `TURNSTILE_SECRET` | Leave this one for now. You'll add it in Step 6. |

**5c. Add the plain variables** — same screen, **Type: Text**:

| Name | Value |
|---|---|
| `ALLOWED_ORIGINS` | `https://www.fatcityentertainment.com,https://fatcityentertainment.com,https://bingocardgenerator.online` |
| `DEV_BYPASS_TURNSTILE` | `0` |
| `TURNSTILE_SITE_KEY` | Leave blank for now — Step 6. |

Deploy.

> `ALLOWED_ORIGINS` is a plain variable on purpose. When the Trivia Generator
> gets its own domain, or wordjab.io arrives, you add it to this box and hit
> Deploy. You never have to re-paste the Worker code for that.

---

## Step 6 — Turnstile (the spam check)

1. Left sidebar → **Turnstile**
2. **Add widget**
3. Widget name: `Green Room`
4. Hostnames: add `fatcityentertainment.com` and `www.fatcityentertainment.com`
5. Widget Mode: **Managed**
6. **Create**
7. You'll be shown a **Site Key** and a **Secret Key**. Copy both into your
   scratch note — values 2 and 3.

Now go back to the Worker → Settings → Variables and Secrets:
- Set `TURNSTILE_SITE_KEY` (Text) to the **site** key
- Set `TURNSTILE_SECRET` (Secret) to the **secret** key
- Deploy

---

## Step 7 — Load the questions and unlocks

1. Back to **D1** → `greenroom` → **Console**
2. Open `greenroom-api/seed/0002_seed.console.sql` from this repo. Copy all of
   it. (Again: the `.console.sql` one — see the note in Step 3.)
3. Paste, **Execute**

Check it worked: in the console, run

```sql
SELECT handle, status, length(body) FROM comments;
```

You should get one row — `Fat City`, `pinned`, about 1400 characters. That's
the pay-rates question with our numbers in it.

---

## Step 8 — Check it's alive

Open this in a browser tab:

```
https://fatcity-greenroom.dustinramsbottom.workers.dev/api/comments?thread=green-room
```

You should see a wall of JSON with our pinned question in it. If you do, the
backend is done.

If you get an error instead, jump to Troubleshooting below.

---

## Step 9 — Put it on the site

The embed is already committed on branch
`claude/triv101-trivia-show-generator-pam2rm`. GitHub Pages only serves `main`,
so it goes live when that branch reaches `main`.

Because this adds a public discussion to `features.html` — and publishes our
pricing — **look at it before merging.** Ask me to merge when you're ready, or
merge it yourself the usual way.

After it's live, load `https://www.fatcityentertainment.com/features.html` and
confirm the Green Room appears above the three tools.

---

## Step 10 — The admin page

`https://www.fatcityentertainment.com/admin/green-room.html`

Paste the `ADMIN_TOKEN` from Step 5b. It's remembered for that browser session.
The page isn't linked from anywhere and is blocked from search engines.

---

## Troubleshooting

**"No such endpoint"** — the URL is wrong. Check the Worker name is exactly
`fatcity-greenroom`.

**"Something broke on our end"** — usually the D1 binding. Settings → Bindings
→ confirm the variable name is `DB` in capitals and points at `greenroom`.

**The widget shows nothing on the page** — open the browser console (F12).
A CORS error means the site's address isn't in `ALLOWED_ORIGINS`; check for a
typo, and note it needs `https://` and no trailing slash.

**"The spam check didn't pass"** — the site key and secret key are swapped, or
the hostname isn't listed on the Turnstile widget.

**Posting says "Give it a moment"** — that's the 8-second anti-bot delay doing
its job. Wait, then post.

---

## What you have NOT set up, deliberately

- **The `hosting` thread** on `gameshowhosts.html`. It's written but held back
  until you've put your own experience into the anchor post — the draft in
  `threads.json` is mine and reads generic. Set `"launch": true`, resolve the
  `[OWNER:]` block, re-run `node greenroom-api/seed/seed.js --write`, and load
  the new SQL.
- **The scheduled bake.** Threads become indexable when
  `_tools/bake-green-room.js` runs and commits. Worth wiring once there are
  real comments to bake.
- **A custom domain.** Needs DNS moved from Namecheap to Cloudflare. Not
  required, and not worth doing for this alone.
