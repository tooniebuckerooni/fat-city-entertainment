// Build an upload-ready image bundle for the Lemon Squeezy product listings.
//
// The artwork exists, but only as Weebly's renders scattered through uploads/
// with names like s240281505130794070_p112_i8_w600.jpeg. Nothing maps a product
// to its best image, so re-creating a listing means hunting through 1,200 files.
//
// This picks the largest render for each product, downsizes it to something
// sensible for a listing, and names it after the product. It also writes a
// manifest flagging the products whose best available image is too small to look
// good — worth knowing before you upload rather than after.
//
// Output goes to _export/ which is gitignored: these are copies of art already
// in the repo, and committing ~25 MB of duplicates to serve nobody would be
// silly. Regenerate any time.
//
//   node _tools/export-ls-images.js
//
// Then zip _export/lemonsqueezy/ and upload from it.
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const REPO = path.resolve(__dirname, "..");
const UPLOADS = path.join(REPO, "uploads/4/3/3/6/43362499");
const OUT = path.join(REPO, "_export/lemonsqueezy");

// Lemon Squeezy renders listing art far smaller than 2304px. 1600 keeps it crisp
// on a retina screen at a fraction of the bytes.
const MAX_EDGE = 1600;
const QUALITY = 88;
// Below this, a listing image looks visibly soft — worth flagging.
// 600, not 1000: LemonSqueezy renders listing art small, so most of this
// catalogue's 600-999px sources are fine in practice. At 1000 the manifest
// flagged 71 of 75 products, which is the same failure as a health check that
// cries wolf — everyone learns to ignore it. At 600 it flags the 20 that are
// actually borderline, and the 10 sources under 400px that genuinely need
// new art are the ones to fix first.
const GOOD_ENOUGH = 600;

// --- what's for sale, and at what price -----------------------------------
const lsSrc = fs.readFileSync(path.join(REPO, "assets/js/ls-links.js"), "utf8");
const LINKS = {};
{
  const body = lsSrc.slice(lsSrc.indexOf("window.LS_LINKS"), lsSrc.indexOf("window.LS_PRICES"));
  for (const m of body.matchAll(/"(p\d+|handbook)":\s*"([^"]*)"/g)) LINKS[m[1]] = m[2];
}

const clean = (s) => s.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ")
  .replace(/&amp;/g, "&").replace(/&#39;|&rsquo;/g, "'").replace(/\s+/g, " ").trim();

// Read name and price off each product page.
const meta = {};
for (const dir of fs.readdirSync(path.join(REPO, "store"))) {
  if (!/^p\d+$/.test(dir)) continue;
  const full = path.join(REPO, "store", dir);
  if (!fs.statSync(full).isDirectory()) continue;
  for (const f of fs.readdirSync(full)) {
    if (!f.endsWith(".html")) continue;
    const html = fs.readFileSync(path.join(full, f), "utf8");
    if (/http-equiv="refresh"/i.test(html)) continue; // retired, redirects elsewhere
    const name = clean((html.match(/<h1[^>]*id="wsite-com-product-title"[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || "");
    const price = (html.match(/itemprop="price"[^>]*content="([^"]*)"/i) || [])[1] || "";
    // The image the product page itself shows. This is the authoritative pick —
    // it is what a customer already associates with the product — and it beats
    // guessing from filenames. Take the <img src>, never the <picture><source>:
    // that one is WebP, which LemonSqueezy will not accept on upload.
    // Attribute order varies across the export, so match the tag then the src,
    // and drop any ?width= query so the full-size file is used.
    const tag = (html.match(/<img[^>]*wsite-com-product-images-main-image[^>]*>/i) || [])[0]
      || (html.match(/<img[^>]*itemprop="image"[^>]*>/i) || [])[0] || "";
    const srcM = tag.match(/src="([^"?]*)(?:\?[^"]*)?"/);
    if (name) meta[dir] = { name, price, page: `store/${dir}/${f}`, pageImage: srcM ? srcM[1] : null };
  }
}

// --- best available render per product ------------------------------------
const renders = {};
for (const f of fs.readdirSync(UPLOADS)) {
  const m = f.match(/^s240281505130794070_(p\d+)_i(\d+)_w(\d+)\.(jpe?g|png)$/i);
  if (!m) continue;
  const [, pid, , w] = m;
  const size = fs.statSync(path.join(UPLOADS, f)).size;
  if (!renders[pid] || +w > renders[pid].w) renders[pid] = { file: f, w: +w, size };
}

const slug = (s) => s.toLowerCase()
  .replace(/['’"]/g, "").replace(/&/g, "and")
  .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) fs.unlinkSync(path.join(OUT, f));

(async () => {
  const rows = [];
  for (const pid of Object.keys(meta).sort((a, b) => +a.slice(1) - +b.slice(1))) {
    const info = meta[pid];
    // Prefer the product page's own image; fall back to the best Weebly-pattern
    // render. That fallback used to be the ONLY source, which quietly stopped
    // working once the uploads were renamed to human-readable filenames —
    // s240281505130794070_p143_i2_w640.jpg became music-bingo-motown.png, and
    // the export silently dropped from the whole catalogue to 6 products.
    const pageFile = info.pageImage
      ? path.join(REPO, info.pageImage.replace(/^\//, ""))
      : null;
    const r = renders[pid];
    const src = pageFile && fs.existsSync(pageFile)
      ? pageFile
      : (r ? path.join(UPLOADS, r.file) : null);
    if (!src) {
      rows.push({ pid, ...info, out: "", w: 0, h: 0, kb: 0, flag: "NO IMAGE FOUND" });
      continue;
    }
    const outName = `${pid}-${slug(info.name)}.jpg`;
    const img = sharp(src);
    const md = await img.metadata();

    // flatten() so a transparent PNG doesn't export with a black background.
    const buf = await img
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: QUALITY, mozjpeg: true })
      .toBuffer();

    fs.writeFileSync(path.join(OUT, outName), buf);
    const outMd = await sharp(buf).metadata();

    rows.push({
      pid, ...info, out: outName,
      w: outMd.width, h: outMd.height,
      kb: Math.round(buf.length / 1024),
      srcW: md.width,
      flag: md.width < GOOD_ENOUGH ? "NEEDS BETTER ART" : "",
    });
  }

  const sold = (pid) => (LINKS[pid] ? "yes" : "no");

  // CSV for spreadsheet work
  const csv = [
    "product_id,name,price_usd,for_sale,image_file,image_px,image_kb,source_px,flag,checkout_url,page",
    ...rows.map((r) =>
      [r.pid, `"${r.name.replace(/"/g, '""')}"`, r.price, sold(r.pid), r.out,
       r.w ? `${r.w}x${r.h}` : "", r.kb, r.srcW || "", r.flag,
       LINKS[r.pid] || "", r.page].join(",")),
  ].join("\n");
  fs.writeFileSync(path.join(OUT, "MANIFEST.csv"), csv + "\n");

  const weak = rows.filter((r) => r.flag);
  const total = rows.reduce((s, r) => s + r.kb, 0);

  const md = [
    "# Lemon Squeezy listing images",
    "",
    `Generated by \`_tools/export-ls-images.js\` — ${rows.length} products, ` +
      `${(total / 1024).toFixed(1)} MB total.`,
    "",
    "One image per product, taken from the largest render on the site, resized to",
    `fit within ${MAX_EDGE}px and saved as JPEG q${QUALITY}. Filenames are the product`,
    "id plus its name, so they sort next to the listing you're editing.",
    "",
    "`MANIFEST.csv` has the same table plus each product's live checkout URL.",
    "",
    "## Needs better artwork",
    "",
    weak.length
      ? `${weak.length} products have no source image wider than ${GOOD_ENOUGH}px. They are\n` +
        "exported anyway, but they will look soft on a listing page. The expensive ones\n" +
        "are worth re-shooting first — a $235 product with a 600px image undersells itself.\n\n" +
        "| Product | Price | Source width | For sale |\n|---|---|---|---|\n" +
        weak
          .sort((a, b) => (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0))
          .map((r) => `| ${r.pid} ${r.name} | ${r.price ? "$" + r.price : "—"} | ${r.srcW || "?"}px | ${sold(r.pid)} |`)
          .join("\n")
      : "None — every product has a source image of at least 1000px.",
    "",
    "## Everything",
    "",
    "| Product | Price | For sale | File | Size |",
    "|---|---|---|---|---|",
    ...rows.map((r) =>
      `| ${r.pid} ${r.name} | ${r.price ? "$" + r.price : "—"} | ${sold(r.pid)} | ${r.out || "—"} | ${r.w ? `${r.w}x${r.h}, ${r.kb} KB` : "—"} |`),
    "",
  ].join("\n");
  fs.writeFileSync(path.join(OUT, "MANIFEST.md"), md);

  console.log(`exported ${rows.filter((r) => r.out).length} images to _export/lemonsqueezy/`);
  console.log(`total size      : ${(total / 1024).toFixed(1)} MB`);
  console.log(`flagged as weak : ${weak.length} (source narrower than ${GOOD_ENOUGH}px)`);
  console.log(`manifest        : MANIFEST.md + MANIFEST.csv`);
})();
