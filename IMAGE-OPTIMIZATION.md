# Image optimization — the standing job

Audited 7 Sept 2026. Numbers below are real measurements from that date, not
estimates. Re-measure before acting (Step 1) — they drift as products launch.

This is a **maintenance runbook**, not a one-off plan. Work top to bottom; each
step is independent and safe to stop after.

---

## What "optimized" means here

Four things, in the order they matter:

1. **Right dimensions for the box it renders in.** This is the whole game. A
   grid tile renders at about **210 x 139 CSS pixels**; at 2x for retina that is
   **~420px wide**. Anything wider than ~640px in a tile is pure waste.
2. **A `.webp` twin exists** for every referenced raster image, so `<picture>`
   can serve it.
3. **Reasonable file size** — under ~120KB for anything loaded on page load.
4. **Lazy-loaded** below the fold.

Zoom targets are the exception: files ending `-full` are what the cloud-zoom
`<a>` opens on click. They are *supposed* to be big and are **not** page-load
weight. Leave them alone.

---

## What the audit found

| | |
|---|---|
| Image files in `uploads/` | 1,627 (125 MB) |
| Referenced by a live page | 1,012 (67.1 MB) |
| **Orphaned — nothing links to them** | **615 (57.9 MB)** |
| Referenced but **no `.webp` twin** | 169 (26.7 MB) |
| Oversized (>1600px wide or >300KB) | 40 |

Page-load image weight, measured as what a browser actually fetches
(`<img src>`, or the `<source srcset>` webp where one exists):

| Page | Weight | Images |
|---|---|---|
| `store/c11/musicdoboff/` | **2.01 MB** | 55 |
| `trivia-store.html` | **1.38 MB** | 26 |
| `index.html` | 0.43 MB | 4 |
| a product page | 0.07 MB | 1 |

**The two category pages are the whole problem.** Product pages are already
fine. Worst single offender: `music-bingo-party-starter-4-pack.webp` — 219KB at
**1200x1200**, rendered in a 210px box.

---

## Step 1 — Re-measure (always do this first)

```
cd ~/fat-city-entertainment
node _tools/to-webp.js                 # what has no webp twin yet
node _tools/compress-images.js         # what is oversized
node _tools/check-links.js             # 0 broken refs is the bar
```

All three are dry-run by default. Nothing is written without `--write`.

To re-measure page weight, ask the agent for "the page-load image weight table" —
it is a short Node script over `<img src>` + `<source srcset>`, not a saved tool.

---

## Step 2 — Generate the missing `.webp` twins (safe, do this every time)

```
node _tools/to-webp.js --write
```

Converts every referenced raster image that lacks a twin. As of 7 Sept it had
5 pending (0.3 MB -> 0.1 MB).

> **Landmine.** `to-webp.js` **skips any conversion saving under 15%**, so a
> `.webp` twin is *not* guaranteed to exist. Never write a `<source srcset>`
> pointing at one without checking the file is really on disk — a `<source>`
> that 404s does **not** fall back to the `<img>` beside it, so a missing twin
> renders a **blank image**, not a heavier one. This is exactly how the Decades
> 5-Pack tile went blank on `store/c11`. `add-store-tile.js` and
> `swap-product-image.js` both check now; anything new must too.

---

## Step 3 — Recompress (small, safe, automated)

```
node _tools/compress-images.js                 # review the list first
node _tools/compress-images.js --write
node _tools/to-webp.js --write                 # regenerate twins after
node _tools/check-links.js
```

**Set your expectations low.** `compress-images.js` recompresses **in place at
the same pixel dimensions** — it re-encodes, it does not resize. As of 7 Sept it
finds 40 oversized files and can only improve **1** of them, for **0.1 MB
total**. Everything already sits near its quality floor.

---

## Step 4 — Resize for the box (the big win — NOT automated)

**This is where the 2 MB category page gets fixed, and no tool does it.**
Recompression cannot help because the files are not badly compressed, they are
the wrong *size*: a 1200x1200 image rendering in a 210px box is ~97% wasted
pixels no encoder can recover.

There is no `resize-images.js`. Either write one, or do it per-image with sharp:

```
node -e "require('./_tools/node_modules/sharp')('uploads/4/3/3/6/43362499/NAME.jpeg')
  .resize(640, null, {withoutEnlargement:true})
  .jpeg({quality:88, mozjpeg:true})
  .toFile('uploads/4/3/3/6/43362499/NAME-640.jpeg')"
```

If you write the tool, the shape that fits this repo: dry-run by default, a
`--write` flag, skip anything ending `-full`, and print a before/after table.
Start from the 40 files `compress-images.js` already lists as oversized.

Rules whichever way you do it:

- **Tiles / listing images:** longest edge **640px**. Never larger.
- **Product main image:** longest edge **1000px** (it is the zoom's fallback).
- **`-full` zoom twins:** leave as-is.
- **Keep the aspect ratio.** Tile crop offsets are derived from the image's
  aspect (`top%` in the tile's inline style). Change the ratio and every tile
  carrying that image needs `add-store-tile.js` re-run to re-derive the crop.
- **New file, new name.** Same URL means returning visitors and warm share-card
  caches keep the old file. Give a changed image a new filename and swap it with
  `swap-product-image.js` (Step 6).

---

## Step 5 — The two GIFs

Two animated GIFs are 3.3 MB between them and are referenced from live pages:

- `published/bold-missy-gif.gif` — **1,759KB** at 486x274
- `obama-qna_orig.gif` — **1,571KB** at 600x375

A GIF is the worst format per byte on the site by an order of magnitude.
Convert both to **MP4 or animated WebP** and swap the tag, or drop them. This is
the single largest byte saving available and it affects only two pages.

Not automated — it needs a human decision about whether the animation earns
3.3 MB. That is why it is its own step.

---

## Step 6 — Swapping an image, once you have a better file

Never hand-edit the references. One command does all of them:

```
node _tools/swap-product-image.js p147 ~/new-cover.jpeg --write
node _tools/add-jsonld.js --write        # it tells you to run this
```

It repoints the product page, the cloud-zoom link, the `<source srcset>` webp,
`og:image`, `twitter:image`, the alt text, **every listing tile in place**, and
**every** `<image:loc>` in `sitemap.xml`. A cover is often the representative
image for the listing pages that carry it — p18's lived in four sitemap entries
and on `store/c34`'s own share card.

It prints a NOTE if the new image's aspect differs from the old one; if it does,
re-run `add-store-tile.js` for that product to re-derive the tile crop.

---

## Step 7 — Lazy loading

`_tools/add-lazy-images.js` adds `loading="lazy" decoding="async"` below the
fold.

> **DO NOT RUN IT AS IT STANDS.** It has **no `--write` flag — it writes
> immediately** — and it parses with cheerio, which **re-serializes the whole
> document**. Running it on 7 Sept rewrote 84 unrelated lines across 4 pages:
> `defer` became `defer=""`, `&` became `&amp;`. On Weebly export markup that is
> the kind of whole-document rewrite CLAUDE.md warns about. The change was
> reverted.
>
> Before using it, someone needs to (a) add a `--write` flag so it is dry-run by
> default like every other tool, and (b) replace the cheerio round-trip with a
> targeted regex that only touches `<img>` tags. Until then, leave it.

Four pages currently have un-lazy-loaded images below the fold: `index.html`,
`store/c34`, `store/c40/holidays/`, `store/c6/triviagameshows/`. Worth fixing —
after the tool is fixed.

---

## Step 8 — The 615 orphans (57.9 MB) — careful

Nearly half the image payload is not referenced by any page. **Do not bulk
delete.** They cost nothing in page speed (nobody downloads them); they only
cost repo size. Risks before removing any:

- Weebly legacy URLs and old blog posts may point at them from outside the repo.
- Some are `_orig` twins of live files.
- Social shares and Google Image results may still link them.
- `uploads/.../music-doboff-answer-sheet-anagrams.pdf` and its neighbours are
  **deliberately live** — see CLAUDE.md, owner's decision, do not re-open.

If it ever matters, delete in small reviewed batches with `check-links.js` after
each, never in one pass. It is a repo-size task, not a performance one, and it
is the lowest-value item on this page.

---

## What actually needs re-uploading from you

Most of this needs **no new files** — resizing down works from what is already
on disk.

The exception: **20 product main images are under 600px wide, and 14 of them are
only 300x200.** Those are too small to resize *up*, they look soft on retina,
and the cloud-zoom has nothing to zoom into. These are the ones worth handing
over as Drive links:

```
p116  320x213   music-bingo-anagrams.jpeg
p127  300x200   music-bingo-movie-soundtracks-3-pack.jpeg
p132  300x200   music-bingo-road-trip.jpeg
p133  300x200   music-bingo-cartoons.jpeg
p138  300x200   music-bingo-a-bunch-of-babies.png
p141  300x200   music-bingo-rowdy-country.png
p143  300x200   music-bingo-motown.png
p144  300x200   music-bingo-the-80s.png
p145  300x200   music-bingo-colors.png
p167  300x200   punk-rock-music-bingo.png
p126  410x255   video-games-trivia-3-pack.png
p146  451x207   music-bingo-the-2000s.png
p13   502x315   sports-pub-night-the-olympics.png
p135  541x343   valentines-day-trivia-2-pack.png
p33   572x355   halloween-party-trivia-2-pack.png
p53   542x339   st-patricks-day-trivia-2-pack.png
p115  576x384   music-bingo-the-70s.jpeg
p3    500x490   fat-bottom-trivia-host-tshirt.jpeg
p7    400x400   triv101-premium-1000-question-addon.png
p18   400x640   the-trivia-host-handbook-ebook-cover.jpeg  (book cover — fine as is)
```

**Ideal upload spec:** longest edge **1500px**, JPEG or PNG, original aspect
ratio. The agent resizes down to the 640 / 1000 / `-full` set and generates the
webp. Do not pre-compress — hand over the largest version you have.

**How to hand them over:** paste the Google Drive share links in chat, one per
product, saying which `pNN` each belongs to. An agent can read Drive links
directly. Images pasted as chat attachments are **not** reachable as files —
Drive links or a URL only.

---

## Order of operations, short version

```
1. node _tools/to-webp.js                    # measure
2. node _tools/compress-images.js            # measure
3. node _tools/to-webp.js --write            # safe, always worth it
4. node _tools/compress-images.js --write    # small (~0.1 MB), safe
5. <resize oversized files — Step 4, by hand or a tool you write>
6. node _tools/to-webp.js --write            # regenerate twins after resizing
7. node _tools/check-links.js                # 0 broken refs is the bar
8. node _tools/check-tile-structure.js       # tiles still well-formed
```

Steps 1-4 and 6-8 are automated and safe. **Step 5 is the only one that moves
the number that matters**, and it is the one with no tool behind it.

Then commit and merge to `main` as usual. Images are additive and low-risk —
the one thing that can break is a `<source srcset>` pointing at a twin that was
never generated, which `check-links.js` now catches because it reads `srcset`.
