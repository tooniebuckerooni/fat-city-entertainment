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
| `.nojekyll` | Tells GitHub Pages to serve files as-is (no Jekyll build) |
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

## 2. Deploy to GitHub Pages (free hosting)

Same stack as your other sites: **GitHub Pages serves the files, Cloudflare sits
in front** for redirects + HTTPS + CDN.

1. Push the repo to GitHub (`tooniebuckerooni/fat-city-entertainment`), `main`.
2. Repo → **Settings → Pages** → Source = **Deploy from a branch**,
   Branch = `main`, folder = `/ (root)`. `.nojekyll` makes Pages serve files
   as-is (important — it stops Jekyll from hiding `_tools/` and similar).
3. You get `https://tooniebuckerooni.github.io/...`. **Click through everything
   here first** — this is your pre-DNS staging URL. The `/store/*` 301s and
   apex→www come from Cloudflare (step 3), so those won't fire on github.io, but
   every page and internal link will.

Do **not** set a custom domain in Pages yet — that makes github.io redirect to
the real domain before DNS is ready and breaks staging. Add it in step 3.

---

## 3. Cloudflare + domain cutover (the careful part)

Registrar is **Squarespace Domains** (Google sold its domain business to
Squarespace). Keep the registration there; move DNS to Cloudflare, same as your
other sites. Leave Weebly running the whole time.

1. In Cloudflare, **Add a site** → `fatcityentertainment.com`. Cloudflare gives
   you two nameservers — set those at **Squarespace → Domains → DNS →
   Nameservers**. (Lower TTL first if you can.)
2. In Cloudflare **DNS**, add both as **Proxied (orange cloud)**:
   - `CNAME  www  →  tooniebuckerooni.github.io`
   - `CNAME  @    →  tooniebuckerooni.github.io`  (Cloudflare flattens the apex)
3. Cloudflare **SSL/TLS → Overview** → set mode to **Full**.
4. GitHub repo → **Settings → Pages → Custom domain** → enter
   `www.fatcityentertainment.com`, Save (this writes the `CNAME` file). Wait for
   GitHub's certificate, then tick **Enforce HTTPS**. If the cert won't issue
   behind the proxy, flip the two DNS records to **DNS only (grey cloud)** until
   it does, then re-enable the orange cloud.
5. Cloudflare **Rules → Redirect Rules** → add the two rules below.
6. Load the real domain: spot-check ~10 old URLs, confirm a `/store/...` link
   301s to the store, and run **one real test sale** through the LS overlay.
   Only then retire Weebly.

### Cloudflare Redirect Rules (replace what vercel.json used to do)

**A) Old store URLs → store page — keeps the p65 legacy page alive**
- When incoming requests match (custom filter expression):
  `(starts_with(http.request.uri.path, "/store/") and not starts_with(http.request.uri.path, "/store/p65/"))`
- Then: **Static redirect** → `https://www.fatcityentertainment.com/trivia-store.html`, status **301 (permanent)**.

**B) apex → www**
- When incoming requests match: `(http.host eq "fatcityentertainment.com")`
- Then: **Dynamic redirect** → expression
  `concat("https://www.fatcityentertainment.com", http.request.uri.path)`,
  status **301**, **preserve query string** on.

Never let the domain registration lapse at Squarespace — that's the one thing
that actually kills all your traffic.

---

## 4. Don't lose traffic (SEO)

- **URLs are preserved.** Every page keeps its existing `.html` path, so Google
  doesn't see "new" pages. No redirect needed for the main pages.
- **Old store URLs** (`/store/p62/...`, `/store/c11/...`) 301 to the store page
  via **Cloudflare Redirect Rule A** (§3), so any link equity flows through.
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
