# Fat City Entertainment — static site scaffold

Replaces the Weebly site (~CA$170/mo) with a static site you host for **$0/mo**.
Lemon Squeezy keeps handling checkout, tax (merchant of record), and digital
delivery — exactly as it does for the Bingo Card Generator. The site is just
HTML/CSS that opens LS checkout in an overlay.

## What's in here

| File | Purpose |
|---|---|
| `index.html` | Homepage — real content pulled from the live site |
| `trivia-store.html` | Store with all 11 products + real CA$ pricing |
| `styles.css` | Shared styling (neon dive-bar / game-show theme) |
| `vercel.json` | Keeps `.html` URLs intact + 301s old `/store/*` URLs |
| `robots.txt`, `sitemap.xml` | SEO, with your real URLs preserved |

Open `index.html` in a browser to preview. Both pages share `styles.css`.

---

## 1. Wire up Lemon Squeezy (gets ecommerce working)

In each HTML file there's an `LS_CHECKOUT` object near the bottom. For every
product, paste its checkout link from **LS dashboard → Products → (product) →
Share → copy checkout link**, and keep the `?embed=1` on the end — that's what
makes it open as an overlay instead of a new tab. Until you fill a link in, that
button shows a reminder instead of breaking.

That's the only payment-specific code in the whole site.

---

## 2. Deploy to Vercel (free hosting)

You already have Vercel connected, so:

1. Push this folder to a new GitHub repo (your `tooniebuckerooni` account).
2. In Vercel: **New Project → import the repo**. No build step — it's static.
   Framework preset: **Other**. Output: the repo root.
3. Deploy. You'll get a `*.vercel.app` URL to test against first.

`vercel.json` is set so `/trivia-store.html` stays at that exact path (it does
**not** rewrite to `/trivia-store`), which is what keeps your search rankings.

---

## 3. Point the domain (the careful part)

**Your domain is at Squarespace Domains now, not Google Domains.** Google sold
its domain business to Squarespace and finished migrating everything by mid-2024.
Log in at squarespace.com with your old Google credentials to reach DNS.

Cutover, in order:

1. In Squarespace DNS, **lower the TTL** on your existing records to 300s and
   wait a day. This makes the switch propagate fast.
2. In Vercel → Project → **Domains**, add `www.fatcityentertainment.com` and set
   it as the **primary** domain (your indexed URLs use `www`, so keep `www`
   canonical — Vercel will 301 the apex to it). Add `fatcityentertainment.com`
   too so the apex redirects.
3. Vercel shows you the exact A / CNAME records to add. **In Squarespace, change
   the records to point at Vercel.** Leave Weebly running — don't cancel yet.
4. Wait for propagation, then load the site on the real domain and **make one
   real test purchase** through the LS overlay end to end.

**Do not cancel Weebly until the domain resolves to Vercel and a test sale
works.** And never let the *domain registration* lapse at Squarespace — losing
the domain is the one thing that actually kills all your traffic. If you'd
rather not stay on Squarespace, you can transfer the domain to Cloudflare or
NameSilo, but do that as a separate step after the site is live.

---

## 4. Don't lose traffic (SEO)

- **URLs are preserved.** Every page keeps its existing `.html` path, so Google
  doesn't see "new" pages. No redirect needed for the main pages.
- **Old store URLs** (`/store/p62/...`, `/store/c11/...`) 301 to the store page
  via `vercel.json`, so any link equity flows through.
- After cutover: in **Google Search Console**, submit `sitemap.xml` and request
  indexing on the homepage and store. Watch Coverage + traffic for ~2 weeks.
- StatCounter was on the old site (id `12764046`). Re-add that snippet, or drop
  in your own analytics, if you want continuity.

---

## 5. Pages still to port

I built the two pages I had full content for. The rest exist in the nav/sitemap
and need porting (same pattern — copy a page, swap the content). I can pull any
of them from the live site and build them out:

`partyentertainment` · `printmusicbingocards` · `musicdoboffbingocards` ·
`fatbottomtrivia` · `musictriviaparty` · `sportspubnight` · `gameshowhosts` ·
`costumeperformers` · `virtualevents` · `eventvideo` · `triviahostresources`
(blog) · `50-event-ideas-2024` · `faqs` · `aboutus` · `contact`

`contact.html` will need a form handler since there's no server — Web3Forms
(which you already use on your own portfolio) drops straight in.

---

## 6. Moving off Lemon Squeezy later → Polar

When you're ready, **Polar (polar.sh)** is the strongest fit: merchant of record
like LS, ~4% vs LS's 5% + 50¢, great developer experience, GitHub-native.
Migration is contained: replace the `lemon.js` script tag with Polar's embed and
swap the URLs in `LS_CHECKOUT` for Polar checkout links. No other site changes.

---

## Notes

- The **t-shirt** is the only physical item and it's sold out. LS is digital-only,
  so if you ever restock it you'll need a separate fulfilment path (Square,
  Printful, etc.). It's listed as out-of-stock for now.
- Prices and copy are taken from the live site as of this build — re-check
  against LS once products are created there.
