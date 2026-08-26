// Repair the Open Graph / Twitter Card tags on every indexable page.
//
//   node fix-social-tags.js          report only
//   node fix-social-tags.js --write  apply
//
// THREE THINGS, in order of how much they cost
// --------------------------------------------
// 1. **A tracking pixel was being advertised as the share image.** The Weebly
//    export emitted `<meta property="og:image">` for every image on the page —
//    including the 1x1 StatCounter beacon at c.statcounter.com. It appears on
//    118 indexable pages, and on 17 of them it is the ONLY og:image, so
//    Facebook, LinkedIn, Slack and iMessage had nothing to show but an
//    invisible 1x1 GIF. Every share of those pages looked broken. Removed
//    everywhere; a real image is substituted where that leaves a page with
//    none.
//
// 2. **No page on the site had a single Twitter Card tag.** Zero of 396.
//    Sharing to X/Twitter fell back to a bare link.
//
// 3. 164 indexable pages had no og:title at all — mostly the legacy /4/ tree
//    and the store. Those are filled from the page's own <title>, meta
//    description and canonical, so nothing is invented.
//
// Idempotent: re-running reports 0. Only touches pages that are actually
// indexable — noindexed listing shells and redirect stubs are skipped, since
// nobody shares those and the tags would just be noise.

const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const WRITE = process.argv.includes("--write");
const SKIP = new Set(["_tools", "_content", "node_modules", ".git", ".claude"]);

const PIXEL = "c.statcounter.com";
const SITE = "https://www.fatcityentertainment.com";
// Brand fallback for pages that end up with no real image of their own.
const FALLBACK = `${SITE}/uploads/4/3/3/6/43362499/crowd_orig.jpg`;

function walk(dir) {
  let out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out = out.concat(walk(p));
    else if (e.name.endsWith(".html")) out.push(p);
  }
  return out;
}

const attr = (html, re) => {
  const m = html.match(re);
  return m ? m[1] : null;
};
const esc = (s) =>
  String(s).replace(/&(?!(amp|lt|gt|quot|#\d+);)/g, "&amp;").replace(/"/g, "&quot;");

let files = 0, pixels = 0, twitter = 0, ogAdded = 0, imgAdded = 0, skipped = 0;

for (const file of walk(REPO)) {
  const before = fs.readFileSync(file, "utf8");
  let html = before;

  // Only pages a human might actually share.
  if (/name="robots"[^>]*noindex/i.test(html)) { skipped++; continue; }
  if (/http-equiv="refresh"/i.test(html)) { skipped++; continue; }
  if (!/<\/title>/i.test(html)) { skipped++; continue; }

  // 1. drop the tracking pixel wherever it is posing as a share image
  const pixRe = new RegExp(
    `\\s*<meta property="og:image" content="[^"]*${PIXEL.replace(/\./g, "\\.")}[^"]*">`,
    "gi"
  );
  const nPix = (html.match(pixRe) || []).length;
  if (nPix) { html = html.replace(pixRe, ""); pixels += nPix; }

  const title = attr(html, /<title>([^<]*)<\/title>/i) || "";
  const desc = attr(html, /<meta name="description" content="([^"]*)"/i) || "";
  const canon = attr(html, /rel="canonical" href="([^"]+)"/i) || "";

  // 2. backfill any missing core og: tags from the page's own metadata
  const need = [];
  if (!/property="og:title"/i.test(html) && title)
    need.push(`<meta property="og:title" content="${esc(title.replace(/ - Fat City Entertainment$/, ""))}">`);
  if (!/property="og:description"/i.test(html) && desc)
    need.push(`<meta property="og:description" content="${esc(desc)}">`);
  if (!/property="og:url"/i.test(html) && canon)
    need.push(`<meta property="og:url" content="${esc(canon)}">`);
  if (!/property="og:type"/i.test(html))
    need.push(`<meta property="og:type" content="website">`);

  // 3. a page with no real image left needs one, or the share is still blank
  const hasImage = /property="og:image"/i.test(html);
  if (!hasImage) {
    need.push(`<meta property="og:image" content="${FALLBACK}">`);
    imgAdded++;
  }
  if (need.length) ogAdded++;

  // 4. Twitter Cards — the site had none at all
  if (!/name="twitter:card"/i.test(html)) {
    const img =
      attr(html, /property="og:image" content="([^"]+)"/i) || FALLBACK;
    need.push(
      `<meta name="twitter:card" content="summary_large_image">`,
      `<meta name="twitter:title" content="${esc(title.replace(/ - Fat City Entertainment$/, ""))}">`,
      ...(desc ? [`<meta name="twitter:description" content="${esc(desc)}">`] : []),
      `<meta name="twitter:image" content="${esc(img)}">`
    );
    twitter++;
  }

  if (need.length) {
    html = html.replace(/(<\/title>)/i, `$1\n${need.join("\n")}`);
  }

  if (html === before) continue;
  files++;
  if (WRITE) fs.writeFileSync(file, html);
}

console.log(`${WRITE ? "Updated" : "Would update"} ${files} page(s)   (skipped ${skipped}: noindex, redirect stubs, no <title>)`);
console.log(`  tracking-pixel og:image tags removed : ${pixels}`);
console.log(`  pages given a real fallback image    : ${imgAdded}`);
console.log(`  pages with og: tags backfilled       : ${ogAdded}`);
console.log(`  pages given Twitter Card tags        : ${twitter}`);
if (!WRITE) console.log("\n(dry run -- pass --write to apply)");
