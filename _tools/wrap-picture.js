// Serve the .webp twins produced by to-webp.js, and finish the lazy-loading pass.
//
// For every <img> whose source file has a .webp beside it:
//
//   <img src="/uploads/.../tile.jpeg" class="..." style="...">
//   -->
//   <picture><source srcset="/uploads/.../tile.webp" type="image/webp">
//   <img src="/uploads/.../tile.jpeg" class="..." style="..."></picture>
//
// The original stays as the fallback, so anything that can't read WebP is
// unaffected. The <img> itself is untouched — same classes, same inline style —
// which matters here because Weebly's aspect-ratio crop lives in that inline
// style, and the theme's CSS/JS reach images through *descendant* selectors
// (".wrap .wsite-imageaspectratio-image", $.find("img")) that still match
// through a <picture>. There are no "> img" child selectors in the theme.
//
// Deliberately a regex pass, not cheerio: cheerio re-serializes the whole
// document, which would reformat all ~900 migrated pages and bury the real
// change in whitespace noise. Matching the <img> tag alone keeps every other
// byte of each file identical.
//
// Also adds loading="lazy" decoding="async" to images that lack it, keeping the
// first image on each page eager (it's the likely LCP element). That's the same
// rule add-lazy-images.js applies; doing it here avoids a second cheerio pass.
//
//   node _tools/wrap-picture.js            # dry run
//   node _tools/wrap-picture.js --write
//
// Safe to re-run: an <img> already inside a <picture> is left alone.
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const WRITE = process.argv.includes("--write");
const SKIP_DIRS = new Set(["_tools", "node_modules", ".git", ".claude", "_export"]);

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const all = walk(REPO);

// Basename -> true when a .webp twin exists. Weebly filenames are globally
// unique, so a basename lookup handles every href form in the markup
// (/uploads/..., uploads/..., ../uploads/..., percent-encoded) without having
// to resolve each one against the page's own directory.
const hasWebp = new Set();
for (const f of all) {
  if (/\.webp$/i.test(f)) hasWebp.add(path.basename(f).replace(/\.webp$/i, ""));
}

// Spans covered by an existing <picture>...</picture>, so a re-run is a no-op.
function pictureSpans(html) {
  const spans = [];
  const re = /<picture\b[^>]*>[\s\S]*?<\/picture\s*>/gi;
  let m;
  while ((m = re.exec(html))) spans.push([m.index, m.index + m[0].length]);
  return spans;
}

const IMG = /<img\b[^>]*?>/gi;
const SRC = /\ssrc\s*=\s*["']([^"']+)["']/i;

let pagesTouched = 0, wrapped = 0, lazied = 0, noTwin = 0;

for (const file of all) {
  if (!file.endsWith(".html")) continue;
  const html = fs.readFileSync(file, "utf8");
  if (!html.includes("<img")) continue;

  const spans = pictureSpans(html);
  const inPicture = (i) => spans.some(([a, b]) => i >= a && i < b);

  let out = "";
  let last = 0;
  let seenFirst = false;
  let localWrap = 0, localLazy = 0;
  let m;

  IMG.lastIndex = 0;
  while ((m = IMG.exec(html))) {
    const tag = m[0];
    const at = m.index;
    out += html.slice(last, at);
    last = at + tag.length;

    const isFirst = !seenFirst;
    seenFirst = true;

    if (inPicture(at)) {
      out += tag;
      continue;
    }

    let newTag = tag;

    // Lazy-load everything below the first image on the page.
    if (!isFirst && !/\sloading\s*=/i.test(newTag)) {
      newTag = newTag.replace(/\s*\/?>$/, (end) => ` loading="lazy" decoding="async"${end}`);
      localLazy++;
    }

    const srcMatch = newTag.match(SRC);
    if (!srcMatch) {
      out += newTag;
      continue;
    }

    // Strip Weebly's cache-buster query ("...333.png?1632278871") and any
    // fragment before looking the file up — 775 srcs carry one.
    const src = srcMatch[1];
    const bare = src.replace(/[?#].*$/, "");
    let base;
    try {
      base = path.basename(decodeURIComponent(bare.replace(/&amp;/g, "&")));
    } catch {
      base = path.basename(bare);
    }
    const stem = base.replace(/\.(jpe?g|png|gif)$/i, "");

    if (!/\.(jpe?g|png|gif)$/i.test(base) || !hasWebp.has(stem)) {
      if (newTag !== tag) noTwin++;
      out += newTag;
      continue;
    }

    // Swap only the extension so the URL keeps its original form (absolute,
    // relative, or encoded) and resolves from wherever the page lives.
    const webpSrc = src.replace(/\.(jpe?g|png|gif)(?=$|[?#])/i, ".webp");
    out += `<picture><source srcset="${webpSrc}" type="image/webp">${newTag}</picture>`;
    localWrap++;
  }
  out += html.slice(last);

  if (out !== html) {
    if (WRITE) fs.writeFileSync(file, out);
    pagesTouched++;
    wrapped += localWrap;
    lazied += localLazy;
  }
}

console.log(`pages touched      : ${pagesTouched}`);
console.log(`images wrapped     : ${wrapped}`);
console.log(`lazy attrs added   : ${lazied}`);
console.log(`lazied, no webp    : ${noTwin}`);
if (!WRITE) console.log("\nDRY RUN — nothing written. Re-run with --write.");
