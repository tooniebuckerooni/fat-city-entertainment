// Add image entries to sitemap.xml.
//
// This is a store that sells artwork — 250-card game packs whose covers are most
// of the reason someone clicks one over another — and its sitemap listed no
// images at all. Google discovers images by crawling, but an image sitemap is
// how you tell it which images on a page are the content rather than furniture,
// and it's the only signal available for pages whose art is the product.
//
// Only images that are genuinely the subject of their page are listed:
//
//   product page   the main product image
//   category page  each product tile (that's what the page is)
//   blog post      the post's own og:image
//
// Nav sprites, icons, buttons and theme furniture are all excluded, because
// listing them tells Google the opposite of what's true.
//
// Alt text goes in as <image:title>. add-alt-text.js already derived those from
// each page's own copy, so this is the same text a reader gets.
//
//   node _tools/add-image-sitemap.js            # dry run
//   node _tools/add-image-sitemap.js --write
//
// Re-runnable: existing <image:image> blocks are replaced, not appended.
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const WRITE = process.argv.includes("--write");
const SITE = "https://www.fatcityentertainment.com";
const SITEMAP = path.join(REPO, "sitemap.xml");

// Per-URL cap. A category page with 46 tiles is legitimate; anything past this
// is furniture that slipped through a selector.
const MAX_PER_URL = 50;

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
  .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

const decode = (s) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"')
  .replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

// Images that are the subject of the page, by the class add-alt-text.js keyed on.
const SUBJECT = [
  /wsite-com-product-images-main-image/,
  /wsite-com-category-product-(?:featured-)?image\b/,
  /wsite-com-category-subcategory-image\b/,
];

function imagesFor(html) {
  const out = [];
  const seen = new Set();

  for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = m[0];
    const cls = (tag.match(/\sclass\s*=\s*["']([^"']*)["']/i) || [])[1] || "";
    if (!SUBJECT.some((re) => re.test(cls))) continue;

    let src = (tag.match(/\ssrc\s*=\s*["']([^"']*)["']/i) || [])[1];
    if (!src) continue;
    src = decode(src).replace(/[?#].*$/, "");
    if (!/^\/uploads\//.test(src)) continue;
    if (seen.has(src)) continue;
    seen.add(src);

    const alt = decode((tag.match(/\salt\s*=\s*["']([^"']*)["']/i) || [])[1] || "");
    out.push({ loc: SITE + src, title: alt });
    if (out.length >= MAX_PER_URL) break;
  }

  // Blog posts have no subject-classed <img>; their og:image is the post image.
  if (!out.length) {
    const og = (html.match(/<meta property="og:image" content="([^"]+)"/i) || [])[1];
    if (og && /\/uploads\//.test(og)) {
      const title = decode((html.match(/<meta property="og:title" content="([^"]*)"/i) || [])[1] || "");
      out.push({ loc: decode(og).replace(/[?#].*$/, ""), title });
    }
  }
  return out;
}

// Map every sitemap URL back to the file that serves it.
function fileForUrl(loc) {
  let rel = decodeURIComponent(loc.replace(SITE, "")).replace(/^\//, "");
  if (rel === "" ) rel = "index.html";
  const direct = path.join(REPO, rel);
  if (fs.existsSync(direct) && fs.statSync(direct).isFile()) return direct;
  const asIndex = path.join(REPO, rel.replace(/\/$/, ""), "index.html");
  if (fs.existsSync(asIndex)) return asIndex;
  return null;
}

let xml = fs.readFileSync(SITEMAP, "utf8");

// Start from a clean slate so a re-run can't stack duplicates.
xml = xml.replace(/\s*<image:image>[\s\S]*?<\/image:image>/g, "");

if (!/xmlns:image=/.test(xml)) {
  xml = xml.replace(
    /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9"/,
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n' +
    '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"'
  );
}

let urlsWithImages = 0, totalImages = 0, missingFile = 0;

xml = xml.replace(/<url>([\s\S]*?)<\/url>/g, (block, inner) => {
  const loc = (inner.match(/<loc>([^<]+)<\/loc>/) || [])[1];
  if (!loc) return block;
  const file = fileForUrl(loc);
  if (!file) { missingFile++; return block; }

  const html = fs.readFileSync(file, "utf8");
  const imgs = imagesFor(html);
  if (!imgs.length) return block;

  urlsWithImages++;
  totalImages += imgs.length;

  const entries = imgs.map((i) =>
    `\n    <image:image><image:loc>${esc(i.loc)}</image:loc>` +
    (i.title ? `<image:title>${esc(i.title)}</image:title>` : "") +
    `</image:image>`
  ).join("");

  return `<url>${inner}${entries}\n  </url>`;
});

if (WRITE) fs.writeFileSync(SITEMAP, xml);

console.log(`URLs with images : ${urlsWithImages}`);
console.log(`images listed    : ${totalImages}`);
console.log(`URLs with no file on disk: ${missingFile}`);
if (!WRITE) console.log("\nDRY RUN — nothing written. Re-run with --write.");
