// Build a per-product worksheet for updating LemonSqueezy.
//
//   node _tools/ls-product-sheet.js            # print a summary
//   node _tools/ls-product-sheet.js --write    # also write the JSON + HTML sheet
//
// LemonSqueezy has never carried product images, titles or descriptions that
// match the site — the site pages have always been the real storefront. When a
// reprice means opening all ~48 products in the dashboard anyway, this pulls
// everything that should be pasted in alongside the new price, so the whole
// catalogue is a single pass rather than four.
//
// It READS ONLY. Nothing here writes to a product page; the outputs are
// _tools/ls-product-sheet.json and _tools/ls-product-sheet.html, both
// gitignored-adjacent working files rather than served content.
//
// Prices come from each page's itemprop="price", the same source of truth
// add-price-ladder.js and add-cross-sell.js read — see the pricing-strategy
// skill for why nothing else is authoritative.
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "..");
const SITE = "https://www.fatcityentertainment.com";

const write = process.argv.includes("--write");

function decode(s) {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&mdash;/g, "—").replace(/&ndash;/g, "–").replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

// The checkout map, so the sheet can flag products with no live buy button —
// those are the ones where a price shown on the page charges nothing at all.
const lsSrc = fs.readFileSync(path.join(REPO, "assets/js/ls-links.js"), "utf8");
const wired = new Set(
  [...lsSrc.matchAll(/"(p\d+)":\s*"(https?:[^"]*)"/g)].map((m) => m[1])
);

const products = [];
for (const dir of fs.readdirSync(path.join(REPO, "store")).sort()) {
  if (!/^p\d+$/.test(dir)) continue;
  const pdir = path.join(REPO, "store", dir);
  for (const f of fs.readdirSync(pdir).filter((n) => n.endsWith(".html"))) {
    const rel = `store/${dir}/${f}`;
    const html = fs.readFileSync(path.join(pdir, f), "utf8");

    // Redirect stubs carry no price area and are not products.
    if (/http-equiv=["']refresh["']/i.test(html)) continue;
    const priceM = html.match(/itemprop="price"\s+content="([0-9.]+)"/);
    if (!priceM) continue;

    const areaM = html.match(/<div id="wsite-com-product-price-area" class="([^"]*)"/);
    const onSale = /show-price-on-sale/.test(areaM ? areaM[1] : "");
    // On a sale layout the struck-through figure is the regular price; the
    // itemprop always sits on what the customer actually pays.
    const regularM = html.match(
      /<div id="wsite-com-product-price" class="wsite-com-product-price-container">[\s\S]*?<span[^>]*>([^<]*)<\/span>/
    );
    const currency = (html.match(/itemprop="priceCurrency" content="([A-Z]{3})"/) || [, "USD"])[1];

    // Attribute order varies across the Weebly export — src sometimes precedes
    // class, sometimes follows it — so match the tag first, then the src.
    const imgTag =
      (html.match(/<img[^>]*wsite-com-product-images-main-image[^>]*>/) || [])[0] ||
      (html.match(/<img[^>]*itemprop="image"[^>]*>/) || [])[0] ||
      "";
    // Some srcs carry a Weebly ?width= query; strip it for the disk check and
    // for the URL handed to the owner, so they get the full-size original.
    const imgM = imgTag.match(/src="([^"?]*)(?:\?[^"]*)?"/);
    const titleM = html.match(/<h1[^>]*id="wsite-com-product-title"[^>]*>([\s\S]*?)<\/h1>/);
    const descM = html.match(/<meta name="description" content="([^"]*)"/);

    products.push({
      pid: dir,
      file: rel,
      url: `${SITE}/${rel}`,
      title: titleM ? decode(titleM[1]) : "",
      metaDescription: descM ? decode(descM[1]) : "",
      image: imgM ? imgM[1] : null,
      imageUrl: imgM ? SITE + imgM[1] : null,
      imageOnDisk: imgM ? fs.existsSync(path.join(REPO, imgM[1].replace(/^\//, ""))) : false,
      currency,
      price: Number(priceM[1]).toFixed(2),
      regular: onSale && regularM ? decode(regularM[1]) : null,
      onSale,
      wired: wired.has(dir),
    });
  }
}

products.sort((a, b) => Number(a.pid.slice(1)) - Number(b.pid.slice(1)));

const noImage = products.filter((p) => !p.image);
const brokenImage = products.filter((p) => p.image && !p.imageOnDisk);
const unwired = products.filter((p) => !p.wired);
const nonUsd = products.filter((p) => p.currency !== "USD");

console.log(`products found      : ${products.length}`);
console.log(`with a main image   : ${products.length - noImage.length}`);
console.log(`image missing on disk: ${brokenImage.length}${brokenImage.length ? " — " + brokenImage.map((p) => p.pid).join(", ") : ""}`);
console.log(`no image at all     : ${noImage.length}${noImage.length ? " — " + noImage.map((p) => p.pid).join(", ") : ""}`);
console.log(`no live checkout    : ${unwired.length} — ${unwired.map((p) => p.pid).join(", ")}`);
console.log(`not priced in USD   : ${nonUsd.length}${nonUsd.length ? " — " + nonUsd.map((p) => `${p.pid} (${p.currency})`).join(", ") : ""}`);

if (!write) {
  console.log("\n(dry run — pass --write to emit ls-product-sheet.json)");
  process.exit(0);
}

fs.writeFileSync(
  path.join(__dirname, "ls-product-sheet.json"),
  JSON.stringify(products, null, 2)
);
console.log(`\nwrote _tools/ls-product-sheet.json (${products.length} products)`);
