// Give every image an alt attribute, taken from the page's own words.
//
// 371 of the site's 1,870 images had no alt at all, and they were concentrated
// on exactly the wrong pages: 46 on the Music Bingo category, 21 on Bundles, 28
// across the store landing and its category twin. Every one of those is a
// product tile.
//
// Three things were wrong with that at once. A screen reader announced the store
// as a list of unlabelled links; image search had nothing to index for a product
// that is sold on how its artwork looks; and an answer engine describing a
// product had no text to work from.
//
// Nothing here is invented. Each alt comes from text already next to the image:
//
//   category / featured tile  -> the .wsite-com-category-product-name below it
//   subcategory tile          -> the .wsite-com-category-subcategory-name-text
//   product page, main image  -> the page's own <h1> product title
//   product page, gallery     -> the same title, numbered ("…, view 2")
//   blog / content image      -> the page's <h1>, only when nothing better exists
//   third-party widget logos  -> alt="" so they leave the accessibility tree
//
// Where no honest source exists the image is left alone and reported, rather
// than given a filename or a guess — a wrong alt is worse than a missing one.
//
//   node _tools/add-alt-text.js            # dry run
//   node _tools/add-alt-text.js --write
//
// Idempotent: an <img> that already has alt is never touched.
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const WRITE = process.argv.includes("--write");
const SKIP_DIRS = new Set(["_tools", "node_modules", ".git", ".claude", "_export", "_content", "pages"]);

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith(".html")) out.push(p);
  }
  return out;
}

const clean = (s) =>
  s.replace(/<[^>]+>/g, " ")
   .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"')
   .replace(/&#39;|&rsquo;/g, "'").replace(/\s+/g, " ").trim();

const esc = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;")
                    .replace(/</g, "&lt;").replace(/>/g, "&gt;");

// The nearest matching label *after* this image — Weebly puts the tile's name
// below its picture, inside the same <a>.
function labelAfter(html, from, re) {
  re.lastIndex = from;
  const m = re.exec(html);
  return m ? clean(m[1]) : null;
}

const TILE_NAME = /<div class="wsite-com-category-product-name[^"]*"[^>]*>([\s\S]*?)<\/div>/g;
const SUBCAT_NAME = /<div class="wsite-com-category-subcategory-name-text"[^>]*>([\s\S]*?)<\/div>/g;

let added = 0, hadAlt = 0, decorative = 0, unresolved = 0;
const byKind = {};
const stuck = [];
const bump = (k) => (byKind[k] = (byKind[k] || 0) + 1);

for (const file of walk(REPO).sort()) {
  const rel = path.relative(REPO, file).replace(/\\/g, "/");
  const html = fs.readFileSync(file, "utf8");
  if (!html.includes("<img")) continue;
  if (/http-equiv="refresh"/i.test(html)) continue;

  // The page's own headline, used for product and content images.
  const pageTitle =
    clean((html.match(/<h1[^>]*id="wsite-com-product-title"[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || "") ||
    clean((html.match(/<h1[^>]*class="[^"]*\bblog-title\b[^"]*"[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || "") ||
    clean((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || "");

  let out = "";
  let last = 0;
  let galleryN = 1;
  const IMG = /<img\b[^>]*?>/gi;
  let m;

  while ((m = IMG.exec(html))) {
    const tag = m[0];
    out += html.slice(last, m.index);
    last = m.index + tag.length;

    if (/\salt\s*=/i.test(tag)) { hadAlt++; out += tag; continue; }

    const cls = (tag.match(/\sclass\s*=\s*["']([^"']*)["']/i) || [])[1] || "";
    const src = (tag.match(/\ssrc\s*=\s*["']([^"']*)["']/i) || [])[1] || "";
    let alt = null;
    let kind = null;

    if (/wsite-com-category-product-(?:featured-)?image\b/.test(cls)) {
      alt = labelAfter(html, m.index, TILE_NAME);
      kind = "category tile";
    } else if (/wsite-com-category-subcategory-image\b/.test(cls)) {
      alt = labelAfter(html, m.index, SUBCAT_NAME);
      kind = "subcategory tile";
    } else if (/wsite-com-product-images-main-image\b/.test(cls)) {
      alt = pageTitle || null;
      kind = "product main";
    } else if (/wsite-com-product-images-secondary-image\b/.test(cls)) {
      galleryN++;
      alt = pageTitle ? `${pageTitle}, view ${galleryN}` : null;
      kind = "product gallery";
    } else if (/^https?:\/\//i.test(src) && !/fatcityentertainment/i.test(src)) {
      // Third-party widget branding (an embedded quiz tool's logo). It conveys
      // nothing to a reader of this page, so hide it rather than narrate it.
      alt = "";
      kind = "decorative";
    } else if (pageTitle && /^\/uploads\//.test(src)) {
      alt = pageTitle;
      kind = "content image";
    }

    if (alt === null) {
      unresolved++;
      stuck.push(`${rel}  ${src.slice(-52)}`);
      out += tag;
      continue;
    }

    if (alt === "") decorative++;
    else added++;
    bump(kind);

    out += tag.replace(/\s*\/?>$/, (end) => ` alt="${esc(alt)}"${end}`);
  }
  out += html.slice(last);

  if (out !== html && WRITE) fs.writeFileSync(file, out);
}

console.log(`alt added          : ${added}`);
console.log(`alt="" (decorative): ${decorative}`);
console.log(`already had alt    : ${hadAlt}`);
console.log(`no honest source   : ${unresolved}`);
console.log("\nby kind:");
for (const [k, v] of Object.entries(byKind).sort((a, b) => b[1] - a[1])) {
  console.log(`   ${k.padEnd(18)} ${v}`);
}
if (stuck.length) {
  console.log("\nleft alone (needs a human):");
  stuck.slice(0, 10).forEach((s) => console.log("   " + s));
  if (stuck.length > 10) console.log(`   ... +${stuck.length - 10} more`);
}
if (!WRITE) console.log("\nDRY RUN — nothing written. Re-run with --write.");
