// Replace a product's artwork everywhere it appears, in one command.
//
//   node _tools/swap-product-image.js <pNN> <image> [--write]
//
//   <image> is either a path to a new file to install, or the name of one
//   already in uploads/ (with or without extension).
//
//   node _tools/swap-product-image.js p168 ~/new-cover.png --write
//   node _tools/swap-product-image.js p168 things-in-songs-5pack --write
//
// A product's image is referenced in more places than anyone remembers, and
// they are not all updated by the same tool:
//
//   product page   main <img> src, every <source srcset> (the .webp twin),
//                  og:image, twitter:image, and the alt text
//   listing tiles  one per category page carrying the product
//   sitemap.xml    the <image:image><image:loc> entry
//   JSON-LD        the Product node's image field
//
// Missing one is not cosmetic. p168 "Things In Songs" shipped with the
// Decades 5-Pack's cover on its product page while its tiles showed the right
// artwork — a shopper clicking the tile landed on a page showing a different
// product, on a $41.99 item. Same root cause as p167 Punk Rock going live under
// Golden Oldies' artwork: a cloned template keeps the template's image.
//
// This does the lot, generates the .webp twin, and prints the one follow-up
// command it does not own.
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const REPO = path.resolve(__dirname, "..");
const UPLOADS = path.join(REPO, "uploads/4/3/3/6/43362499");
const args = process.argv.slice(2);
const WRITE = args.includes("--write");
const PID = args.find((a) => /^p\d+$/.test(a));
const SRC = args.find((a) => a !== PID && !a.startsWith("--"));

if (!PID || !SRC) {
  console.error("usage: node _tools/swap-product-image.js <pNN> <image> [--write]");
  process.exit(1);
}

// --- resolve the product page ---------------------------------------------
const dir = path.join(REPO, "store", PID);
if (!fs.existsSync(dir)) { console.error(`no such product: store/${PID}`); process.exit(1); }
// Drop redirect stubs first, then narrow by price only if that leaves a
// choice. Requiring itemprop="price" up front excluded every Amazon/KDP
// product outright — p18's page carries no price because Amazon sets it, so
// the tool refused to touch the one product whose cover most needed changing.
const candidates = fs.readdirSync(dir).filter((f) => f.endsWith(".html"))
  .map((f) => ({ f: path.join(dir, f), s: fs.readFileSync(path.join(dir, f), "utf8") }))
  .filter((c) => !/http-equiv="refresh"/i.test(c.s));
const priced = candidates.filter((c) => /itemprop="price"/.test(c.s));
const pages = priced.length ? priced : candidates.filter((c) => /wsite-com-product-title/.test(c.s));
if (pages.length !== 1) {
  console.error(`expected exactly one product page in store/${PID}, found ${pages.length}`);
  process.exit(1);
}
const pageFile = pages[0].f;
let html = pages[0].s;

// --- resolve the image ------------------------------------------------------
// Either a file to install into uploads/, or the name of one already there.
const EXTS = [".png", ".jpg", ".jpeg", ".gif"];
let base;
if (fs.existsSync(SRC) && fs.statSync(SRC).isFile()) {
  base = path.basename(SRC);
  const dest = path.join(UPLOADS, base);
  if (WRITE && path.resolve(SRC) !== dest) {
    fs.copyFileSync(SRC, dest);
    console.log(`installed  uploads/.../${base}`);
  } else if (!WRITE) {
    console.log(`would install  ${SRC} -> uploads/.../${base}`);
  }
} else {
  const stem = SRC.replace(/\.[a-z0-9]+$/i, "");
  const found = EXTS.map((e) => stem + e).find((f) => fs.existsSync(path.join(UPLOADS, f)));
  if (!found) {
    console.error(`no file at "${SRC}", and nothing named "${stem}.{${EXTS.map((e)=>e.slice(1)).join(",")}}" in uploads/`);
    process.exit(1);
  }
  base = found;
}
const rel = `/uploads/4/3/3/6/43362499/${base}`;
const webp = rel.replace(/\.[a-z0-9]+$/i, ".webp");

// --- the .webp twin ---------------------------------------------------------
// wrap-picture.js offers it via <source srcset>, so a missing twin means the
// browser silently falls back — no error, just the heavier file forever.
const webpAbs = path.join(REPO, webp.replace(/^\//, ""));
if (!fs.existsSync(webpAbs)) {
  if (WRITE) {
    try {
      execFileSync("node", [path.join(__dirname, "to-webp.js"), "--write"], { stdio: "pipe" });
      console.log(fs.existsSync(webpAbs) ? `generated  ${path.basename(webp)}` : `WARN: could not generate ${path.basename(webp)}`);
    } catch (e) {
      console.log(`WARN: to-webp.js failed — ${String(e.message).split("\n")[0]}`);
    }
  } else {
    console.log(`would generate  ${path.basename(webp)}`);
  }
}

const name = (html.match(/<h1[^>]*id="wsite-com-product-title"[^>]*>([\s\S]*?)<\/h1>/i) || [])[1]
  ?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() || "";
const alt = name.replace(/"/g, "&quot;");

// --- the product page -------------------------------------------------------
// Replacer functions throughout: a filename or alt text containing "$1" or "$&"
// is otherwise consumed as a backreference. That bug shipped a live
// twitter:description reading "50 credits for </title>3.98".
const before = html;
// The path being replaced. Listing pages and the sitemap reference a product's
// cover by this exact URL, so it is what makes "find every reference" possible
// rather than "find the ones this tool already knew about".
const oldRel = (before.match(/<img[^>]*wsite-com-product-images-main-image[^>]*src="(\/uploads\/[^"]+)"/i)
             || before.match(/src="(\/uploads\/[^"]+)"[^>]*class="[^"]*wsite-com-product-images-main-image/i) || [])[1] || null;
const oldWebp = oldRel ? oldRel.replace(/\.[a-z0-9]+$/i, ".webp") : null;
const ABS = "https://www.fatcityentertainment.com";
const repoint = (txt) => {
  if (!oldRel) return txt;
  let out = txt;
  for (const [o, n] of [[ABS + oldRel, ABS + rel], [ABS + oldWebp, ABS + webp], [oldRel, rel], [oldWebp, webp]]) {
    out = out.split(o).join(n);
  }
  return out;
};
const OLD = /\/uploads\/4\/3\/3\/6\/43362499\/[^"')\s]+\.(?:png|jpe?g|gif|webp)/gi;
// Weebly writes the attributes in either order, and the main image is wrapped
// in a cloud-zoom <a> pointing at the full-size file. Miss the anchor and
// clicking to zoom shows the OLD product's artwork over the new one.
let touchedMain = 0;
const swapImg = (re) => {
  html = html.replace(re, (m) => {
    touchedMain++;
    return m.replace(/src="[^"]*"/i, `src="${rel}"`);
  });
};
swapImg(/<img[^>]*class="[^"]*wsite-com-product-images-main-image[^"]*"[^>]*>/gi);
// The cloud-zoom anchor deliberately points at a HIGHER-RES file than the
// inline image where one exists — that is what makes zoom worth having. Nine
// products pair e.g. music-bingo-entertainers-3-pack.jpeg with a "-full"
// twin. So prefer a -full variant of the new image and only fall back to the
// inline file, rather than flattening the zoom to the same resolution.
const zoomTarget = (() => {
  const dot = base.lastIndexOf(".");
  const stem = base.slice(0, dot), ext = base.slice(dot);
  for (const cand of [`${stem}-full${ext}`, `${stem}_orig${ext}`]) {
    if (fs.existsSync(path.join(UPLOADS, cand))) return `/uploads/4/3/3/6/43362499/${cand}`;
  }
  return rel;
})();
html = html.replace(
  /(<a href=")([^"]*)("[^>]*class="[^"]*cloud-zoom[^"]*")/gi,
  (m, a, _u, c) => a + zoomTarget + c
);
// Main image inside a <picture>: the srcset sibling must move with it.
html = html.replace(
  /(<source[^>]*srcset=")([^"]*)(")/gi,
  (m, a, u, c) => (OLD.test(u) && !/logo|favicon/i.test(u) ? a + webp + c : m)
);
html = html.replace(
  /(<meta property="og:image" content="https:\/\/www\.fatcityentertainment\.com)([^"]*)(")/i,
  (m, a, _u, c) => a + rel + c
);
html = html.replace(
  /(<meta name="twitter:image" content="https:\/\/www\.fatcityentertainment\.com)([^"]*)(")/i,
  (m, a, _u, c) => a + rel + c
);
if (alt) {
  html = html.replace(
    /(<img[^>]*wsite-com-product-images-main-image[^>]*alt=")([^"]*)(")/gi,
    (m, a, _t, c) => a + alt + c
  );
}
if (html !== before) {
  console.log(`page       ${path.relative(REPO, pageFile)}  ->  ${base}`);
  if (WRITE) fs.writeFileSync(pageFile, html);
} else {
  console.log(`page       ${path.relative(REPO, pageFile)}  already on ${base}`);
}

// --- sitemap image entry ----------------------------------------------------
const smPath = path.join(REPO, "sitemap.xml");
let sm = fs.readFileSync(smPath, "utf8");
const smBefore = sm;
const pageUrl = `https://www.fatcityentertainment.com/${path.relative(REPO, pageFile).replace(/\\/g, "/")}`;
sm = sm.replace(
  new RegExp(`(<loc>${pageUrl.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}</loc>[\\s\\S]{0,400}?<image:loc>)([^<]*)(</image:loc>)`),
  (m, a, _u, c) => a + `https://www.fatcityentertainment.com${rel}` + c
);
// p18's cover was also the <image:loc> for trivia-store.html, store/c6 and
// store/c34. Updating only the product's own <url> block left three sitemap
// entries advertising an image the site no longer shows anywhere.
sm = repoint(sm);
if (sm !== smBefore) {
  const n = (smBefore.match(/<image:loc>/g) || []).length
    && smBefore.split(oldRel || "\u0000").length - 1;
  console.log(`sitemap    image:loc updated${n > 1 ? ` (${n} entries)` : ""}`);
  if (WRITE) fs.writeFileSync(smPath, sm);
}

// --- listing tiles ----------------------------------------------------------
// add-store-tile.js re-reads the product page, so running it after the page is
// written keeps every tile in step without duplicating the swap logic here.
const carriers = [];
for (const lf of ["trivia-store.html", ...(function walk(d, out = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith(".html")) out.push(path.relative(REPO, p));
  }
  return out;
})(path.join(REPO, "store"))]) {
  const f = path.join(REPO, lf);
  if (!fs.existsSync(f)) continue;
  // Product pages carry a data-id too; only category/listing pages hold tiles.
  if (/^store\/p\d+\//.test(lf.replace(/\\/g, "/"))) continue;
  if (new RegExp(`data-id="${PID.slice(1)}"`).test(fs.readFileSync(f, "utf8"))) carriers.push(lf);
}
console.log(`tiles      ${carriers.length} listing page(s): ${carriers.join(", ") || "none"}`);
// Update each tile's image IN PLACE rather than rebuilding the tile.
//
// This used to shell out to add-store-tile.js, which refuses any product with
// no price — and an Amazon/KDP product has none, because Amazon sets it. So a
// cover swap on p18 updated the product page and left all four tiles on the
// old artwork: the exact page/tile mismatch this tool exists to prevent, and
// it reported the failure as a WARN rather than a non-zero exit.
//
// Rebuilding was also more than the job needs. add-store-tile.js clones a
// NEIGHBOURING tile and re-inserts at the front of the grid, so refreshing an
// image silently moved the product to the top of every listing page and undid
// order-store-tiles.js. Swapping src/srcset/alt inside the existing tile keeps
// its position, its sale state and its crop.
//
// The crop offset is tuned to the image's ASPECT, so it only stays valid while
// the aspect does. Say so when it changes instead of writing a stale offset.
// Aspect (height/width) of an image on disk, or null if it can't be read.
function dims(abs) {
  try {
    if (!fs.existsSync(abs)) return null;
    const out = execFileSync("node", ["-e",
      `const s=require(${JSON.stringify(path.join(__dirname, "node_modules", "sharp"))});` +
      `s(${JSON.stringify(abs)}).metadata().then(m=>console.log(m.width+" "+m.height));`
    ], { encoding: "utf8" }).trim().split(" ").map(Number);
    return out[0] && out[1] ? out[1] / out[0] : null;
  } catch (e) { return null; }
}
function tileEnd(html, at) {
  const TAG = /<div\b[^>]*>|<\/div>/gi;
  TAG.lastIndex = at;
  let depth = 0, m;
  while ((m = TAG.exec(html))) {
    depth += m[0][1] === "/" ? -1 : 1;
    if (depth === 0) return m.index + m[0].length;
  }
  return -1;
}
if (WRITE && carriers.length) {
  const oldAspect = (() => {
    const prev = (before.match(OLD) || [])[0];
    return prev ? dims(path.join(REPO, prev.replace(/^\//, ""))) : null;
  })();
  const newAspect = dims(path.join(REPO, rel.replace(/^\//, "")));
  let done = 0, failed = [];
  for (const lf of carriers) {
    const f = path.join(REPO, lf);
    let src = fs.readFileSync(f, "utf8");
    const open = new RegExp(`<div class="wsite-com-category-product[^"]*" data-id="${PID.slice(1)}"`);
    const m = open.exec(src);
    if (!m) { failed.push(lf); continue; }
    const end = tileEnd(src, m.index);
    if (end === -1) { failed.push(lf); continue; }
    let tile = src.slice(m.index, end);
    const had = tile;
    tile = tile.replace(/srcset="[^"]*"/g, `srcset="${webp}"`);
    tile = tile.replace(/(<img[^>]*?)src="[^"]*"/g, (mm, a) => `${a}src="${rel}"`);
    tile = tile.replace(/(<img[^>]*?)alt="[^"]*"/g, (mm, a) => `${a}alt="${alt}"`);
    if (tile === had) { failed.push(lf); continue; }
    src = src.slice(0, m.index) + tile + src.slice(end);
    // A listing page's own og:image/twitter:image can be a product's cover —
    // c34's share card was p18's — and those are absolute URLs outside the
    // tile, so the tile rewrite above never reaches them.
    src = repoint(src);
    fs.writeFileSync(f, src);
    done++;
  }
  console.log(`           ${done} tile(s) repointed in place${failed.length ? `, FAILED: ${failed.join(", ")}` : ""}`);
  if (oldAspect && newAspect && Math.abs(oldAspect - newAspect) > 0.01) {
    console.log(`  NOTE: aspect changed ${oldAspect.toFixed(2)} -> ${newAspect.toFixed(2)};`);
    console.log(`        re-run add-store-tile.js for this product to re-derive the crop offset.`);
  }
}

console.log(WRITE
  ? "\nDone. Now run:  node _tools/add-jsonld.js --write   (Product image in structured data)"
  : "\nDRY RUN — nothing written. Re-run with --write.");
