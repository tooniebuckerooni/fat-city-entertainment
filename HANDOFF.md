# Tooling notes & lessons learned

Durable reference from past sessions working the `_tools/` scripts — kept
because these bugs (and their fixes) are still live in the tools today, not
because there's a pending task here. **For what's currently outstanding, see
`POST-LAUNCH.md` and `SEO-HANDOFF.md`** — this file no longer carries a
"needs you" list of its own; the session-by-session catalog history that used
to live here is in `git log`, not duplicated as prose.

## Tools (all in `_tools/`, all dry-run by default, all re-runnable)

| Tool | What it does |
|---|---|
| `set-usd-price.js pNN <price> [sale]` | Price everywhere at once — page, listings, schema, ls-links comment |
| `new-product.js` | Build a product from `new-products.json` |
| `add-store-tile.js pNN [--after pNN]` | Put a product on the listing pages |
| `order-store-tiles.js` | Reorder storefront tiles (edit `ORDER` at the top) |
| `bake-buy-links.js` | Write checkout URLs into the HTML |
| `add-jsonld.js` | Regenerate all structured data |
| `check-links.js` | Site-wide broken-link check |
| `export-ls-images.js` | Rebuild the Lemon Squeezy image bundle |
| `make-favicon.js` | Regenerate the favicon set from an inline SVG |
| `add-favicon-links.js` | Declare the favicon on every page |

**Everything takes `--write`.** Without it they only report.

**After changing any product, run:**
```
node _tools/bake-buy-links.js --write
node _tools/add-jsonld.js --write
node _tools/sitemap-lastmod.js --write
node _tools/check-links.js
```

---

## Bugs found in this tooling, now fixed

Recorded because they were caught by checking rendered pages, not by the
tools' success messages — which reported no errors in every case. Read this
before trusting any of these scripts' own "done" output over your eyes.

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
4. **`new-product.js` is not safe to re-run on an already-built product.** It
   rebuilds the whole page fresh from its template every time — including
   re-cloning the *template's own* Lemon Squeezy checkout link, verbatim, into
   the buy button. Only run it for products that haven't been built yet — for
   anything already live, hand-edit the page or use a narrower tool
   (`bake-buy-links.js`, `add-store-tile.js`, etc).
5. **`add-store-tile.js`'s `bound()` corrupts the *last* tile on a page that has
   no `<div class="clear">` marker.** When there's no next tile to anchor on,
   it falls back to `indexOf("\n\t</div>")` searching forward from the tile's
   start — but every tile's own image-height div closes with exactly that
   string a few lines in, so it finds that instead of the tile's real end. The
   clone gets truncated there and spliced into that same too-early point,
   leaving the original tile's tail still attached below it. Rule of thumb:
   don't `--after` the *last* tile on a page — target any tile before it, or
   hand-build the tile if it has to go at the very end.
6. **A tool reporting "verified, zero errors" is not proof.** A hand-patch
   that went wrong, then got "fixed" by reverting and redoing through the
   tools, left corrupted leftover markup behind that a commit message claimed
   was cleaned up but wasn't — a duplicate, unclosed-div fragment that blew up
   the page layout. The next session, faced with a broken render, reverted
   *past* the corruption *and* past legitimate work rather than opening the
   file to find the actual cause. Lesson: when a rendered page looks wrong
   after using these tools, re-open the actual file around the broken
   section — don't trust the tool's own success message or a prior session's
   "verified" claim, and don't reach for a revert before you've read what's
   actually there.
7. **`compress-images.js` had no dry-run mode** (fixed 2026-08-11) — unlike
   every other tool in this repo, and contrary to the "all dry-run by
   default" claim at the top of this file, it recompressed images in place
   unconditionally on every invocation, `--write` or not. Calling it "just to
   preview" silently rewrote 5 files. Now gated behind `--write` like its
   siblings. If a future tool is added to this family, don't assume it
   follows the convention — check for a `WRITE` guard before trusting a bare
   invocation to be safe.
8. **`new-content-page.js` hit the same `$1`-backreference bug as
   `add-store-tile.js` (bug #2 above), just not caught until 2026-08-12.**
   Its head-tag replacements passed a plain string to `String.replace()`;
   a description containing `$13.98` has `$1` immediately followed by a
   digit, which `replace()` reads as a capture-group backreference. It
   silently spliced the canonical `<link>` tag into the middle of
   `trivia-show-maker-plans.html`'s `og:description`, turning `$13.98` into
   `<link rel="canonical" ...>3.98`. Fixed by switching every head-region
   `.replace()` in that file to a function replacer — a function's return
   value is inserted literally, `$1` and all. **Same root cause, second
   tool.** Any `.replace(pattern, someString)` where `someString` is built
   from page copy (price, title, description) rather than a fixed literal
   is suspect — grep for `.replace(` across `_tools/` before trusting a new
   one, and prefer the function form on principle for anything touching
   real content.
9. **Running `new-content-page.js` for one new page silently rebuilds
   *every* spec in `new-content-pages.json`, including ones nobody meant to
   touch** (found 2026-08-12, same session as #8). Two long-standing pages
   (`what-is-music-bingo.html`, `music-bingo-rules.html`, plus
   `charlotte-events.html`) had drifted from their stored specs — their live
   "Make free cards" links had been updated to `bingocardgenerator.online`
   at some point after generation, but the JSON body never got the same
   edit. Adding one new page regenerated all of them from the stale specs
   and quietly reverted all three back to the old link. Fixed by syncing
   the JSON body for all three to their live content, and by the same
   principle as bug #6: don't trust "5 pages built" as proof nothing
   changed — diff the *entire* `git status` after running this tool, not
   just the file you meant to add, and expect any spec you haven't touched
   in a while to have drifted.

---

## Known and deliberate

- `bingocardgenerator.html` has three `<h1>`s — they're form labels inside the
  generator tool. Harmless; modern Google tolerates it.
- `pages/*.html` are staged 2.0 drafts, noindex, not linked from anywhere —
  intentional holding area, not dead weight to clean up.
- No `sameAs` beyond Instagram, LinkedIn and X in the Organization JSON-LD.
- `_export/` is gitignored — the Lemon Squeezy image bundle rebuilds on demand
  rather than being stored twice.
