// Set a product's USD price everywhere it appears in the static site.
//
//   node _tools/set-usd-price.js <pid> <price> [<sale-price>]
//
//   node _tools/set-usd-price.js p62 9.50          -> $9.50 USD, not on sale
//   node _tools/set-usd-price.js p62 12.50 9.00    -> $12.50 crossed out, $9.00 USD sale
//
// Updates, in one shot:
//   1. store/pNN/<product>.html  — price area, schema.org offer, on-sale flag,
//      and the hidden Weebly variation-data JSON
//   2. every category/listing block (trivia-store.html, store/c*/...) that
//      shows this product's price, incl. the "On Sale" banner
//   3. the reference price in assets/js/ls-links.js's comment for the product
//
// Run it as you re-list each product in LemonSqueezy (see LEMONSQUEEZY-TODO.md).
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "..");

const [pid, priceArg, saleArg] = process.argv.slice(2);
if (!/^p\d+$/.test(pid || "") || isNaN(parseFloat(priceArg))) {
  console.error("usage: node _tools/set-usd-price.js <pNN> <price> [<sale-price>]");
  process.exit(1);
}
const price = parseFloat(priceArg);
const sale = saleArg !== undefined ? parseFloat(saleArg) : null;
if (sale !== null && (isNaN(sale) || sale >= price)) {
  console.error("sale price must be a number lower than the regular price");
  process.exit(1);
}
const fmt = (n) => `$${n.toFixed(2)} USD`;
const display = sale !== null ? sale : price; // what the customer pays

// ---------------------------------------------------------------- product page
const pdir = path.join(REPO, "store", pid);
const pfile = fs
  .readdirSync(pdir)
  .filter((f) => f.endsWith(".html"))
  .map((f) => path.join(pdir, f))[0];
let html = fs.readFileSync(pfile, "utf8");

// Snapshot what the page charged BEFORE anything is rewritten, so the stale-copy
// check below has something to look for. Only amounts that are changing count:
// a value stack quoting $10.99 a game is still correct after a bundle reprice.
const previousAmounts = [...new Set(
  (html.match(/itemprop="price"\s+content="([0-9.]+)"/g) || [])
    .map((m) => m.match(/content="([0-9.]+)"/)[1])
)].map((n) => Number(n).toFixed(2))
  .filter((n) => n !== price.toFixed(2) && (sale === null || n !== sale.toFixed(2)));

// currency + show-price / show-price-on-sale class on the offer area
html = html.replace(
  /(<meta itemprop="priceCurrency" content=")[A-Z]{3}(")/,
  "$1USD$2"
);
// Also normalises the "price range" layout (wsite-com-product-show-price-range*)
// onto the plain one: a range only makes sense for a product with variants at
// different prices, and its CSS hides the sale container while striking through
// the regular price, so leaving it in place displays the wrong number.
html = html.replace(
  /(<div id="wsite-com-product-price-area" class=")wsite-com-product-show-price(?:-range)?(?:-on-sale)?(")/,
  `$1wsite-com-product-show-price${sale !== null ? "-on-sale" : ""}$2`
);

// the three price containers; itemprop="price" lives on whichever one is shown
function setAmount(id, text, withItemprop) {
  // Match the container, then the amount span *inside* it. The span is not
  // always the first child — range containers carry hidden lowPrice/highPrice
  // spans ahead of it — so scan within the div rather than anchoring to its
  // opening tag.
  const re = new RegExp(
    `(<div id="${id}" class="wsite-com-product-price-container">` +
      `(?:(?!</div>)[\\s\\S])*?` +
      `<span class="wsite-com-product-price-amount")[^>]*(>)[^<]*(</span>)`
  );
  if (!re.test(html)) console.warn(`  warn: #${id} not found in ${path.basename(pfile)}`);
  // NB: replacer functions everywhere a price is inserted — "$249.00" in a
  // replacement string would otherwise be parsed as the $2 backreference
  const itemprop = withItemprop
    ? ` itemprop="price" content="${(sale !== null && id.endsWith("-sale") ? sale : price).toFixed(2)}"`
    : "";
  html = html.replace(re, (m, a, b, c) => a + itemprop + b + text + c);
}

// AggregateOffer low/highPrice, where present, must track the new USD figures —
// otherwise the page keeps emitting the old currency's numbers as USD.
function setRangeBound(prop, value) {
  const re = new RegExp(`(<span style="display:none" itemprop="${prop}">)[^<]*(</span>)`);
  if (re.test(html)) html = html.replace(re, (m, a, b) => a + value.toFixed(2) + b);
}
setRangeBound("lowPrice", display);
setRangeBound("highPrice", price);
setAmount("wsite-com-product-price", fmt(price), sale === null);
setAmount("wsite-com-product-price-range", fmt(display), false);
setAmount("wsite-com-product-price-sale", fmt(display), sale !== null);

// "On Sale" ribbon on the product page
html = html.replace(
  /(<div id="wsite-com-product-on-sale")(?: class="wsite-com-product-on-sale-visible")?(>)/,
  `$1${sale !== null ? ' class="wsite-com-product-on-sale-visible"' : ""}$2`
);

// hidden Weebly variation JSON (entity-encoded attribute)
html = html
  .replace(/(&quot;price&quot;:)[0-9.]+/, `$1${price}`)
  .replace(/(&quot;sale_price&quot;:)(?:[0-9.]+|null)/, `$1${sale !== null ? sale : "null"}`);

// Hand-written prices in the body copy are NOT updated by any of the rules
// above, and they are the ones that quietly go wrong. The Bronze page carried a
// value stack reading "In this pack, it's $89.00 — save $27.89" that survived a
// repricing to $79.00 untouched, which is a page advertising a number the
// checkout will not honour. So: after writing, look for the old amount still
// sitting in the page and say where.
const stale = [];
{
  const lines = html.split("\n");
  const prev = new Set(previousAmounts.map((n) => `$${n}`));
  lines.forEach((line, i) => {
    if (/wsite-com-product-price|&quot;price&quot;|itemprop="price"/.test(line)) return;
    for (const p of prev) {
      if (p && line.includes(p)) stale.push({ line: i + 1, amount: p });
    }
  });
}

fs.writeFileSync(pfile, html);
console.log(`product page: ${path.relative(REPO, pfile)}`);
for (const s of stale) {
  console.warn(`  WARN: ${s.amount} still written into the copy at ${path.relative(REPO, pfile)}:${s.line}`);
}
if (stale.length) {
  console.warn(`  ^ hand-written prices are not updated automatically. Fix them by hand,`);
  console.warn(`    then re-run add-cross-sell.js and add-price-ladder.js.`);
}

// ------------------------------------------------------------- listing blocks
const num = pid.slice(1);
const listings = [path.join(REPO, "trivia-store.html")];
for (const c of fs.readdirSync(path.join(REPO, "store"))) {
  if (!c.startsWith("c")) continue;
  const stack = [path.join(REPO, "store", c)];
  while (stack.length) {
    const d = stack.pop();
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) stack.push(p);
      else if (e.name.endsWith(".html")) listings.push(p);
    }
  }
}

let touched = 0;
for (const lf of listings) {
  let s = fs.readFileSync(lf, "utf8");
  const marker = `data-id="${num}"`;
  let i = s.indexOf(marker);
  if (i === -1) continue;
  let changed = false;
  while (i !== -1) {
    const next = s.indexOf('data-id="', i + marker.length);
    const end = next === -1 ? s.length : next;
    let block = s.slice(i, end);

    block = block.replace(
      /(class="wsite-com-product-price)[^"]*(")/,
      `$1${sale !== null ? " single-sale-price" : " "}$2`
    );
    // class is either wsite-com-category-product-featured-price or
    // wsite-com-category-product-price depending on the listing layout
    block = block.replace(
      /(<div class="wsite-com-price\s+wsite-com-category-product[^"]*">\s*)[^<\s][^<]*?(\s*<\/div>)/,
      (m, a, b) => a + fmt(price) + b
    );
    block = block.replace(
      /(<div class="wsite-com-sale-price\s+wsite-com-category-product[^"]*">\s*)[^<\s][^<]*?(\s*<\/div>)/,
      (m, a, b) => a + fmt(display) + b
    );
    // The red "On Sale" flash on a listing tile. Weebly's own JS added
    // `sale-active` to the wrapper at runtime from live product data; the
    // static export kept the markup and lost the JS, so the wrapper sat at
    // `display:none` forever and NO tile ever showed a banner — not even the
    // club tiers that genuinely are on sale. The CSS that reveals it is
    //   #wsite-com-category-product-group .…-wrapper.sale-active { display:block }
    // and its ID beats the `.placeholder{visibility:hidden}` rule, so the
    // wrapper class is what actually matters; the <p> is kept in sync anyway.
    //
    // Toggle classes rather than deleting the element: ending a sale stays
    // reversible and the whole thing stays re-runnable. (The previous version
    // tried to delete a `visible` banner, which never matched — 201 of the 292
    // tiles in the repo carry `placeholder`.)
    if (!/category__image-sale-banner-wrapper/.test(block)) {
      console.warn(`  warn: ${path.relative(REPO, lf)} block for ${pid} has no sale-banner wrapper`);
    } else {
      block = block.replace(
        /(<div class="category__image-sale-banner-wrapper)(?:\s+sale-active)?(")/,
        (m, a, c) => a + (sale !== null ? " sale-active" : "") + c
      );
      block = block.replace(
        /(<p class="category__image-sale-banner\s+)(?:visible|placeholder)(")/,
        (m, a, c) => a + (sale !== null ? "visible" : "placeholder") + c
      );
    }

    if (block !== s.slice(i, end)) changed = true;
    s = s.slice(0, i) + block + s.slice(end);
    i = s.indexOf(marker, i + block.length);
  }
  if (changed) {
    fs.writeFileSync(lf, s);
    touched++;
    console.log(`listing:      ${path.relative(REPO, lf)}`);
  }
}
if (!touched) console.log("listing:      (product not shown on any listing page)");

// -------------------------------------------------- ls-links.js comment price
const lsPath = path.join(REPO, "assets", "js", "ls-links.js");
let ls = fs.readFileSync(lsPath, "utf8");
const lsRe = new RegExp(`("${pid}": "[^"]*", // \\[.\\] .+? — )(?:CA\\$|\\$)[0-9,.]+(?: USD)?( — )`);
if (lsRe.test(ls)) {
  ls = ls.replace(lsRe, (m, a, b) => a + fmt(display) + b);
  fs.writeFileSync(lsPath, ls);
  console.log(`ls-links.js:  ${pid} price comment -> ${fmt(display)}`);
} else {
  console.warn(`  warn: no price comment found for ${pid} in ls-links.js`);
}

console.log(`done: ${pid} = ${fmt(price)}${sale !== null ? ` (on sale: ${fmt(sale)})` : ""}`);
