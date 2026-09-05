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
const pages = fs.readdirSync(dir).filter((f) => f.endsWith(".html"))
  .map((f) => ({ f: path.join(dir, f), s: fs.readFileSync(path.join(dir, f), "utf8") }))
  .filter((c) => !/http-equiv="refresh"/i.test(c.s) && /itemprop="price"/.test(c.s));
if (pages.length !== 1) {
  console.error(`expected exactly one priced page in store/${PID}, found ${pages.length}`);
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
if (sm !== smBefore) {
  console.log("sitemap    image:loc updated");
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
if (WRITE && carriers.length) {
  for (const lf of carriers) {
    try {
      execFileSync("node", [path.join(__dirname, "add-store-tile.js"), PID, "--pages", lf, "--write"], { stdio: "pipe" });
    } catch (e) {
      console.log(`  WARN: tile update failed for ${lf}`);
    }
  }
  console.log("           refreshed via add-store-tile.js");
}

console.log(WRITE
  ? "\nDone. Now run:  node _tools/add-jsonld.js --write   (Product image in structured data)"
  : "\nDRY RUN — nothing written. Re-run with --write.");
