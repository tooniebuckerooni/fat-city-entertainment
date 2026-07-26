# Media inventory — what's in the repo and what's actually served

Generated July 26, 2026, after the WebP pass. **Nothing here has been deleted.**
This is a map, so a future cleanup is a decision rather than a guess.

| | Files | Size |
|---|---|---|
| Media in the served tree | 1,640 | 140 MB |
| **Referenced by a served page** | **1,125** | **86 MB** |
| **Never referenced** | **515** | **57 MB** |

"Referenced" means a served `.html`, `.css`, `.js` or `.xml` file names it. The
scan matches on filename, so it catches every href form the migrated markup uses
— absolute, relative, percent-encoded, and Weebly's `?1632278871` cache-busters.

`_tools/scraped/` (40 MB) is excluded throughout. It is the archival copy of the
original Weebly pages and is committed on purpose — see `.gitignore`.

---

## The unreferenced 57 MB, by what it is

### Weebly theme background images — 182 files, 23 MB

`uploads/4/3/3/6/43362499/background-images/**`

The stock photography that shipped with the Weebly theme, plus the working
copies and thumbnails its editor generated while cropping them:

| Folder | Files | Size |
|---|---|---|
| `background-images/` | 99 | 15.5 MB |
| `background-images/.../temp/` | 8 | 4.1 MB |
| `background-images/.../temp/thumbs/` | 7 | 3.0 MB |
| `background-images/.../thumbs/` | 75 | 0.5 MB |

The `temp/` and `temp/thumbs/` folders hold two copies of the same 2.9 MB
animated GIF, which is why 15 files account for 7 MB.

**Recommendation: safe to delete.** These belong to a theme editor that no longer
exists, nothing links them, and the current design doesn't use background
photography. Git history keeps them if that turns out to be wrong.

### Original-resolution masters — 265 files, 30 MB

`uploads/4/3/3/6/43362499/*_orig.{jpg,png,gif}`

Weebly kept the full-resolution upload beside each resized render. The site
serves the renders; these are the sources they were cut from.

**Recommendation: keep.** This is the largest group and the most tempting to
delete, but it is the only full-resolution copy of a lot of the artwork. The
Lemon Squeezy export (`_tools/export-ls-images.js`) already flags 25 products
whose best available image is under 1000px — deleting masters would make that
problem permanent rather than fixable. If space matters, delete the theme
backgrounds above instead.

### Other uploads — 206 files, 9 MB

`uploads/4/3/3/6/43362499/` (numeric filenames like `1467226795.png`)

Images uploaded to Weebly and either never placed on a page or placed on one
that has since changed. Individually small; no pattern that identifies them as
obsolete beyond nothing linking them.

**Recommendation: leave for now.** Worth a look before any deletion — some are
likely usable artwork for the products flagged as needing better images.

### Theme fonts and leftovers — 7 files, 0.4 MB

`files/theme/fonts/*.svg` (6 files) — the SVG fallback of each web font, for
browsers that needed it a decade ago. The `.woff2`/`.woff` versions are
referenced and doing the work.

`files/theme/wrong.mp3` — a buzzer sound effect from the Weebly theme.

**Recommendation: safe to delete the SVG fonts.** Keep `wrong.mp3` unless you're
sure no game page wants it.

---

## Notes from the WebP pass

- 428 `.webp` twins now exist, and **all 428 are referenced.** An earlier run
  generated 164 strays (6.0 MB) by converting any image whose filename appeared
  anywhere — including images used only as CSS backgrounds or `og:image`, which
  `<picture>` can't serve. `_tools/to-webp.js` now keys off `<img src>` only, and
  the strays were pruned.
- The `_w2304`/`_w4160` zoom masters are deliberately **not** converted. They load
  only when a visitor clicks the gallery, and they are what the Lemon Squeezy
  export is cut from.
- Two `.mp4` files and the animated GIFs are referenced from blog posts. The GIFs
  now have animated-WebP twins; the MP4s are untouched.

## Re-running this

```
node _tools/to-webp.js            # dry run: what would convert
node _tools/wrap-picture.js       # dry run: what would be wrapped
node _tools/export-ls-images.js   # rebuild the Lemon Squeezy bundle
```
