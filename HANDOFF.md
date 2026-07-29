# Handoff — July 27, 2026

Everything below is **live on fatcityentertainment.com** unless it says otherwise.
Branch `claude/fatcity-optimization-kag60a` was merged to `main`; both are in sync.

---

## Needs you — highest first

### 1. The Music Bingo Handbook ASINs are wrong

You gave `B0HBGJCX4M` (Kindle) and `B0HB27K5RF` (paperback) for the Music Bingo
Handbook. **Those two are already wired to p18, the *Trivia Host* Handbook.**

Two books can't share an ASIN, so one of the two is wrong. I didn't wire them —
doing so would have pointed Music Bingo Handbook buyers at the other book.

To fix: send the Music Bingo Handbook's own two Amazon links and I'll add them to
`KDP_LINKS` in `assets/js/ls-links.js`, alongside its cover image.
`musicbingohandbook.html` stays in "coming soon" mode until then.

### 2. Three things need artwork

| Product | Status | Currently showing |
|---|---|---|
| p167 Punk Rock | **live** | Hair Bands artwork as a placeholder |
| p168 Things In Songs 5-Pack | staged | Decades 5-Pack artwork |
| Music Bingo Handbook | coming soon | cover you sent isn't in the repo yet |

I searched `uploads/` for old Punk Rock art from the Weebly days — there is none.
Drop the files anywhere in the repo and tell me the names.

### 3. Things In Songs 5-Pack has a guessed price

No price was supplied. It's set to **$43.00**, mirroring the Decades 5-Pack as the
closest comparable. **Confirm it matches Lemon Squeezy before publishing** — a page
and a checkout disagreeing is the one failure mode that costs real money.

To publish once you're happy: set `"publish": true` for p168 in
`_tools/new-products.json`, then

```
node _tools/new-product.js --write --publish
node _tools/add-store-tile.js p168 --after p147 --write
node _tools/add-jsonld.js --write && node _tools/sitemap-lastmod.js --write
```

### 4. Two bundles on hold

`p165` Around The World 3-Pack and `p166` Party Starter 4-Pack are built, staged
and unlisted, per your call to hold them. Both are assembled from packs you
already own, so they need no new card sets — only names you're happy with and
Lemon Squeezy listings.

---

## What changed this session

### Catalogue

- **Silver Club (p130) is back.** It was `noindex,nofollow`, missing from the
  sitemap, and linked from no page — while having a live checkout. Now $197.00,
  wired, listed on all three storefront pages.
- **Punk Rock (p167)** live at $10.99, checkout wired.
- **Word Nerd** deleted — too close to the existing Word Games 3-Pack.
- **Gold Club** $549.50 struck through, **$274.25** (50% off).
- **Bingo Card Generator Pro** $59.00 → **$74.50**.
- **Storefront reordered** so the multi-game Packs come first. Lemon Squeezy has
  no cart, so a single-game tile shown before a Pack is an invitation to a $10.99
  order that ends the session.
- **Sale note** under the store heading, pointing at Gold Club.

### The site itself

- **Images**: 428 WebP versions served through `<picture>` with the originals as
  fallback. Music Bingo category went 3.0 MB → 1.2 MB; store landing 908K → 444K.
- **Buy button works without JavaScript.** It used to be hidden until a script
  ran — and so was the fallback — so a slow connection showed no way to buy.
- **Delivery copy** added to 19 product pages including Gold Club, which said
  nothing about how files arrive.
- **Every page has an `<h1>`** (376 didn't). Zero duplicate titles (181 shared
  one). Zero missing descriptions (184 were blank). Alt text on all 1,873 images
  (371 had none).
- **192 JSON-LD blocks** where there was 1 — products, posts, FAQs, breadcrumbs,
  and a Person entity for you.
- **New pages**: `what-is-music-bingo.html`, `music-bingo-rules.html`,
  `charlotte-events.html`, `llms.txt`.
- **About page rewritten** — the Safe Driving Initiative, the dead forums link and
  the free-handbook-code promise are gone; your 1999 history is in.

---

## Tools (all in `_tools/`, all dry-run by default, all re-runnable)

| Tool | What it does |
|---|---|
| `set-usd-price.js pNN <price> [sale]` | Price everywhere at once — page, listings, schema, ls-links comment |
| `new-product.js` | Build a product from `new-products.json` |
| `add-store-tile.js pNN [--after pNN]` | Put a product on the listing pages |
| `order-store-tiles.js` | Reorder storefront tiles (edit `ORDER` at the top) |
| `bake-buy-links.js` | Write checkout URLs into the HTML |
| `add-jsonld.js` | Regenerate all structured data |
| `check-links.js` | 587 pages, 0 broken |
| `export-ls-images.js` | Rebuild the Lemon Squeezy image bundle |

**Everything takes `--write`.** Without it they only report.

**After changing any product, run:**
```
node _tools/bake-buy-links.js --write
node _tools/add-jsonld.js --write
node _tools/sitemap-lastmod.js --write
node _tools/check-links.js
```

---

## Bugs found in my own tooling, now fixed

Recorded because they were caught by checking rendered pages, not by the tools'
success messages — which reported no errors in every case.

1. **`new-product.js` was writing to the wrong object.** It looked for `};` to
   find the end of `LS_LINKS`, but that block closes with a bare `}`. Four
   products' entries landed in `LS_PRICES` instead. The symptom was serious: with
   no `LS_LINKS` entry, a new product kept the buy link baked into the page it was
   cloned from. **Punk Rock would have taken money for Golden Oldies.**
2. **`add-store-tile.js` rendered $197.00 as $97.00.** A price beginning `$1`
   inside a `String.replace()` replacement is read as a capture-group
   backreference.
3. **`to-webp.js` generated 164 files nothing could request** (6 MB), for images
   only referenced from CSS backgrounds where `<picture>` can't reach.

---

## Known and deliberate

- `store/p130/SilverClub.html` was hidden for unknown reasons before I un-hid it.
  If that was intentional, put `<meta name="robots" content="noindex,nofollow">`
  back in its `<head>`.
- `bingocardgenerator.html` has three `<h1>`s — they're form labels inside the
  generator tool. Harmless; modern Google tolerates it.
- `pages/triv101.html`, `pages/trivia-generator.html` remain staged and noindex,
  as agreed. WordJab has no page yet.
- No `sameAs` beyond Instagram, LinkedIn and X. Send more and I'll add them.
- `_export/` is gitignored — the Lemon Squeezy image bundle rebuilds on demand
  rather than being stored twice.

## One idea worth not losing

When TRIV101's survey feature ships, **publish the aggregate results as public
pages**. Survey answers are data nobody else has, they refresh themselves, and
original data is the most-cited thing an AI answer engine can find. Locked inside
the app it's worth nothing to search; published, it's a content engine that runs
on your own players. That's a decision to make before launch, not after.
