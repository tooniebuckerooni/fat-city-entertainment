// Ensure every product page and every product tile carries the (hidden) sale
// markup, so a product can actually be PUT on sale later.
//
//   node _tools/add-sale-banner.js            # report
//   node _tools/add-sale-banner.js --write    # backfill
//
// Weebly only emitted sale markup for the products that happened to be on sale
// the day this site was scraped. Everything else was exported without it:
//
//   * 45 of 97 product pages have `class=""` on #wsite-com-product-price-area
//     and no #wsite-com-product-on-sale ribbon. The stylesheet's last word is
//     `#wsite-com-product-price-sale { display:none }`, so on those pages
//     set-usd-price.js writes a sale price into the HTML and the CSS hides it —
//     the customer reads the regular price while checkout charges the sale one.
//   * 39 of 149 product tiles have no .category__image-sale-banner-wrapper,
//     18 of them on store/c11/musicdoboff/, which is where every regular music
//     bingo game is listed. A discounted game shows no flash where shoppers
//     browse.
//
// Both are the same defect as the `sale-active` class that was never applied:
// the merchandising wasn't missing, the mechanism was. This adds the markup in
// its hidden, off state — nothing changes visually until set-usd-price.js is
// given a sale price. Idempotent; safe to re-run.
//
// set-usd-price.js carries the same insertion, so a product repriced before
// this has ever run still gets its markup. This tool exists to backfill the
// products nobody is repricing today. Keep the two templates in step.
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "..");
const WRITE = process.argv.includes("--write");

let pages = 0, tiles = 0;

// ------------------------------------------------------------- product pages
for (const d of fs.readdirSync(path.join(REPO, "store"))) {
  if (!/^p\d+$/.test(d)) continue;
  const dir = path.join(REPO, "store", d);
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".html"))) {
    const file = path.join(dir, f);
    let s = fs.readFileSync(file, "utf8");
    // Redirect stubs have no price area and must not grow one.
    if (/http-equiv="refresh"/i.test(s) || !/itemprop="price"/.test(s)) continue;
    const before = s;

    // An empty class renders as "show the regular price" by default, which is
    // right — but only the explicit class lets -on-sale be swapped in later.
    s = s.replace(
      /(<div id="wsite-com-product-price-area" class=")(")/,
      (m, a, c) => a + "wsite-com-product-show-price" + c
    );

    if (!/id="wsite-com-product-on-sale"/.test(s)) {
      const saleContainer =
        /([ \t]*)<div id="wsite-com-product-price-sale" class="wsite-com-product-price-container">[\s\S]*?<\/div>\n/;
      const m = s.match(saleContainer);
      if (m) {
        const pad = m[1];
        s = s.replace(
          saleContainer,
          (whole) =>
            whole + `${pad}\t<div id="wsite-com-product-on-sale">\n${pad}\t\tOn Sale\n${pad}\t</div>\n`
        );
      }
    }

    if (s !== before) {
      pages++;
      console.log(`page:  ${path.relative(REPO, file)}`);
      if (WRITE) fs.writeFileSync(file, s);
    }
  }
}

// -------------------------------------------------------------------- tiles
const listings = [path.join(REPO, "trivia-store.html")];
for (const c of fs.readdirSync(path.join(REPO, "store"))) {
  if (!/^c\d+$/.test(c)) continue;
  const stack = [path.join(REPO, "store", c)];
  while (stack.length) {
    const dir = stack.pop();
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) stack.push(p);
      else if (e.name.endsWith(".html")) listings.push(p);
    }
  }
}

for (const lf of listings) {
  if (!fs.existsSync(lf)) continue;
  let s = fs.readFileSync(lf, "utf8");
  const before = s;
  let added = 0;
  // Walk tiles from the end so earlier offsets stay valid as we splice.
  const opens = [...s.matchAll(/<div class="([^"]*?)"[^>]*data-id="(\d+)"/g)];
  for (let k = opens.length - 1; k >= 0; k--) {
    const m = opens[k];
    // Subcategory tiles link to a category, not a product — no price, no sale.
    if (/subcategory/.test(m[1])) continue;
    const nextOpen = k + 1 < opens.length ? opens[k + 1].index : s.length;
    let block = s.slice(m.index, nextOpen);
    if (/category__image-sale-banner-wrapper/.test(block)) continue;
    const imgWrap =
      /([ \t]*)<div class="wsite-com-category-(?:product|product-featured)-image-wrap [^"]*">[\s\S]*?\n\1<\/div>\n/;
    if (!imgWrap.test(block)) {
      console.warn(`  warn: ${path.relative(REPO, lf)} tile ${m[2]} has no image wrap`);
      continue;
    }
    block = block.replace(
      imgWrap,
      (whole, pad) =>
        whole +
        `${pad}<div class="category__image-sale-banner-wrapper">\n` +
        `${pad}\t<p class="category__image-sale-banner placeholder">\n` +
        `${pad}\t\tOn Sale\n${pad}\t</p>\n${pad}</div>\n`
    );
    s = s.slice(0, m.index) + block + s.slice(nextOpen);
    added++;
  }
  if (s !== before) {
    tiles += added;
    console.log(`tile:  ${path.relative(REPO, lf)} (${added})`);
    if (WRITE) fs.writeFileSync(lf, s);
  }
}

console.log(
  `\n${pages} product page(s) and ${tiles} tile(s) ${WRITE ? "backfilled" : "would change"}.`
);
if (!WRITE && (pages || tiles)) console.log("re-run with --write to apply.");
