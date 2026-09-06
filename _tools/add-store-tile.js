// Put a product's tile onto the listing pages.
//
// A product page can exist and be perfectly buyable while being reachable only
// by direct link, because the tiles on trivia-store.html and the category pages
// are static markup that nothing generates. Silver Club sat like that: live
// checkout, real price, and no way to find it.
//
// This clones an existing tile on the same page — so the markup, classes and
// aspect-ratio crop all match whatever that page already uses — and swaps in the
// new product's id, name, price, image and link.
//
//   node _tools/add-store-tile.js <pNN> [--after pNN] [--pages a,b] [--remove] [--write]
//
// --pages  comma-separated listing pages, overriding the default set. Use the
//          short names below (storefront, store-root, music-bingo, trivia-shows)
//          or a repo-relative path.
// --remove take the product OFF the named pages instead of adding it.
//
// Reads the product's own page for its name, price and image, so the tile can't
// disagree with the product. Re-running replaces an existing tile rather than
// duplicating it.
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
const WRITE = args.includes("--write");
const PID = args.find((a) => /^p\d+$/.test(a));
const AFTER = (() => { const i = args.indexOf("--after"); return i === -1 ? null : args[i + 1]; })();

// A product with no store/pNN page of its own. The Music Bingo Handbook sells
// on Amazon KDP and already has a page at /musicbingohandbook.html — a bespoke
// landing page, not a Weebly store page. Minting a store page for it purely so
// this tool had somewhere to read facts from would put a second indexable URL
// in front of the same book, which is the competing-URL failure
// SEO-CRAWL-HANDOFF.md is about. So its tile facts are declared here and the
// tile points at the page that already exists.
//
// The id only has to be a number no product uses: tiles are addressed by
// data-id, and every other tool looks a tile up BY a known product id rather
// than walking an id back to a store/pNN directory.
const VIRTUAL = {
  handbook: {
    id: "900",
    name: "The Music Bingo Handbook",
    href: "/musicbingohandbook.html",
    img: "/uploads/4/3/3/6/43362499/the-music-bingo-handbook-ebook-cover.jpeg",
    priceText: "On Amazon",
  },
};
const VKEY = args.find((a) => Object.prototype.hasOwnProperty.call(VIRTUAL, a));

if (!PID && !VKEY) {
  console.error("usage: node _tools/add-store-tile.js pNN|<virtual> [--after pNN] [--write]");
  console.error(`       virtual products: ${Object.keys(VIRTUAL).join(", ")}`);
  process.exit(1);
}
const NUM = VKEY ? VIRTUAL[VKEY].id : PID.slice(1);

const clean = (s) => s.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

// --- read the product's own facts ----------------------------------------
let name, price, salePrice, onSale, img, href, priceText = null;
if (VKEY) {
  const v = VIRTUAL[VKEY];
  name = v.name; href = v.href; img = v.img; priceText = v.priceText;
  price = v.price || "0"; salePrice = undefined; onSale = false;
  console.log(`${VKEY}  ${name}\n      ${priceText || "$" + price}\n      ${img || "NO IMAGE"}`);
} else {
const dir = path.join(REPO, "store", PID);
if (!fs.existsSync(dir)) { console.error(`no such product dir: store/${PID}`); process.exit(1); }
const pageFile = fs.readdirSync(dir).find((f) => f.endsWith(".html"));
const page = fs.readFileSync(path.join(dir, pageFile), "utf8");

name = clean((page.match(/<h1[^>]*id="wsite-com-product-title"[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || "");
// CAREFUL: on a page that is on sale, itemprop="price" sits on the SALE
// container — it is what the customer pays, which is correct for structured
// data and wrong for "the regular price". Reading it as the regular price made
// this tool write the sale figure into BOTH price slots, so the three club
// tiles rendered "$415.50" struck through above "$415.50". Take the regular
// price from #wsite-com-product-price, which is the struck-through one, and
// fall back to itemprop only when the page is not on sale.
const regularShown = (page.match(
  /id="wsite-com-product-price" class="wsite-com-product-price-container">[\s\S]*?<span[^>]*>\s*\$?([\d,.]+)/i
) || [])[1];
price = (regularShown && regularShown.replace(/,/g, ""))
  || (page.match(/itemprop="price"[^>]*content="([^"]*)"/i) || [])[1];
salePrice = (page.match(/id="wsite-com-product-price-sale"[\s\S]{0,200}?wsite-com-product-price-amount"[^>]*>\s*\$?([\d.]+)/i) || [])[1];
onSale = /class="wsite-com-product-show-price-on-sale"/.test(page);
img = (page.match(/<img[^>]*wsite-com-product-images-main-image[^>]*src="([^"]+)"/i)
          || page.match(/src="(\/uploads\/[^"]+)"[^>]*class="[^"]*wsite-com-product-images-main-image/i) || [])[1];
href = `/store/${PID}/${pageFile}`;

if (!name || !price) { console.error(`could not read name/price from ${href}`); process.exit(1); }
console.log(`${PID}  ${name}\n      $${price}${onSale && salePrice ? ` (sale $${salePrice})` : ""}\n      ${img || "NO IMAGE"}`);
}

// Where tiles can go. The default was a hardcoded three-page list dating from
// when everything in the store was music bingo — so every product, whatever it
// was, got a tile in the Music Bingo Card Downloads category. The seven
// print-and-play trivia shows launched on 5 Sept went in there and NOT into
// Pre-made Trivia Shows, which is the category a buyer would look in.
// A product's categories are a merchandising decision, so they are an argument
// now, not a constant.
const KNOWN = {
  storefront: "trivia-store.html",
  "store-root": "store/c1/triviastore/index.html",
  "music-bingo": "store/c11/musicdoboff/index.html",
  "trivia-shows": "store/c6/triviagameshows/index.html",
};
const DEFAULT_PAGES = ["storefront", "store-root", "music-bingo"];
const REMOVE = args.includes("--remove");
const PAGES = (() => {
  const i = args.indexOf("--pages");
  const names = i === -1 ? DEFAULT_PAGES : String(args[i + 1] || "").split(",").map((x) => x.trim()).filter(Boolean);
  return names.map((n) => {
    if (KNOWN[n]) return KNOWN[n];
    if (n.endsWith(".html")) return n;
    console.error(`unknown page "${n}" — use a path or one of: ${Object.keys(KNOWN).join(", ")}`);
    process.exit(1);
  });
})();
const TILE = /<div class="wsite-com-category-product(?:-featured)? wsite-com-column ?"\s*data-id="(\d+)">/g;

let touched = 0;
for (const rel of PAGES) {
  const file = path.join(REPO, rel);
  if (!fs.existsSync(file)) continue;
  let html = fs.readFileSync(file, "utf8");

  TILE.lastIndex = 0;
  const starts = [];
  let m;
  while ((m = TILE.exec(html))) starts.push({ at: m.index, id: m[1] });
  if (starts.length < 2) { console.log(`  ${rel}: no tile grid, skipped`); continue; }

  const bound = (i) => (i + 1 < starts.length ? starts[i + 1].at : tileEnd(html, starts[i].at));

  // Remove any tile this product already has, so re-running replaces it.
  const existing = starts.findIndex((s) => s.id === NUM);
  if (existing !== -1) {
    html = html.slice(0, starts[existing].at) + html.slice(bound(existing));
    TILE.lastIndex = 0;
    starts.length = 0;
    while ((m = TILE.exec(html))) starts.push({ at: m.index, id: m[1] });
  }

  // --remove stops here: the tile is already gone from `html`.
  if (REMOVE) {
    if (existing === -1) { console.log(`  ${rel}: no tile to remove`); continue; }
    console.log(`  ${rel}: tile removed`);
    if (WRITE) fs.writeFileSync(file, html);
    touched++;
    continue;
  }

  // Clone the requested neighbour, else the first tile on the page.
  const srcIdx = AFTER ? starts.findIndex((s) => s.id === AFTER.replace(/^p/, "")) : 0;
  const useIdx = srcIdx === -1 ? 0 : srcIdx;
  let tile = html.slice(starts[useIdx].at, bound(useIdx));

  // --- swap in this product's details ------------------------------------
  tile = tile.replace(/data-id="\d+"/, `data-id="${NUM}"`);
  tile = tile.replace(/href="\/store\/p\d+\/[^"]*"/g, `href="${href}"`);
  tile = tile.replace(/(<div class="wsite-com-category-product-name[^"]*"[^>]*>)[\s\S]*?(<\/div>)/i,
    // NB: replacer FUNCTION, not a replacement string. A string replacement
    // re-reads "$1", "$&" etc. inside the text being inserted, so any
    // description or title containing a dollar amount is silently mangled --
    // "$13.98" became "</title>3.98" in a live twitter:description tag.
    (m, a, b) => `${a}\n\t\t\t\t\t\t${name}\n\t\t\t\t\t${b}`);
  if (img) {
    // The vertical crop offset is tuned to the image's ASPECT, and a cloned
    // tile inherits the neighbour's. Weebly's -25.76% is the value for a SQUARE
    // image in the standard grid; a 3:2 cover shoved up by that much left a
    // white band across the bottom third of the GK 5-Pack and Halloween tiles.
    //
    // Centring an image of aspect a inside a container that is R as tall as it
    // is wide gives  top% = -((a - R) / (2R)) * 100.  R is NOT the same on
    // every page — the standard grid is 0.66 and the featured layout on
    // store/c34 is 0.42 — so rather than hardcode it, solve for R from the tile
    // being cloned, whose image and top% are both known:  R = a_src / (1 - 2t).
    // That reproduces Weebly's own numbers on both layouts instead of
    // replacing them with a guess.
    const dimsOf = (u) => {
      try {
        const abs = path.join(REPO, String(u).replace(/^\//, "").split("?")[0]);
        if (!fs.existsSync(abs)) return null;
        const out = require("child_process").execFileSync("node", ["-e",
          `const s=require(${JSON.stringify(path.join(__dirname, "node_modules", "sharp"))});` +
          `s(${JSON.stringify(abs)}).metadata().then(m=>console.log(m.width+" "+m.height));`
        ], { encoding: "utf8" }).trim().split(" ").map(Number);
        return out[0] && out[1] ? out : null;
      } catch (e) { return null; }
    };
    const styleOf = (t) => (t.match(/<img[^>]*style="([^"]*)"/i) || [])[1] || "";
    const srcOf = (t) => (t.match(/<img[^>]*src="(\/uploads\/[^"]+)"/i) || [])[1];

    const srcTile = html.slice(starts[useIdx].at, bound(useIdx));
    const srcStyle = styleOf(srcTile);
    const srcDims = dimsOf(srcOf(srcTile));
    const newDims = dimsOf(img);
    const pct = (st) => { const m = st.match(/width:\s*([\d.]+)%/); return m ? Number(m[1]) / 100 : 1; };
    const t0 = (() => { const m = srcStyle.match(/top:\s*(-?[\d.]+)%/); return m ? Number(m[1]) / 100 : null; })();

    if (srcDims && newDims && t0 !== null) {
      const aSrc = pct(srcStyle) * (srcDims[1] / srcDims[0]);
      const R = aSrc / (1 - 2 * t0);
      if (R > 0.05 && R < 3) {
        tile = tile.replace(/(<img[^>]*style=")([^"]*)(")/i, (m, a, st, c) => {
          const ratio = newDims[1] / newDims[0];          // image height / width
          let width, left, top;
          if (ratio >= R) {
            // Taller than the container: fill the width and centre vertically.
            width = 100;
            left = 0;
            top = -((ratio - R) / (2 * R)) * 100;
          } else {
            // WIDER than the container. At width:100% it is shorter than the
            // slot, so no vertical offset can fill it — centring just splits
            // the white band across the top and bottom. Scale it up until it
            // fills the height and centre horizontally instead. p123 and p159
            // are 1.78 and 1.96 to the container's 1.52 and were banded.
            width = (R / ratio) * 100;
            left = -(width - 100) / 2;
            top = 0;
          }
          const next = st
            .replace(/width:\s*[\d.]+%/, `width:${width.toFixed(2)}%`)
            .replace(/top:\s*-?[\d.]+%/, `top:${top.toFixed(2)}%`)
            .replace(/left:\s*-?[\d.]+%/, `left:${left.toFixed(2)}%`);
          return a + next + c;
        });
      }
    }
    tile = tile.replace(/srcset="[^"]*"/g, `srcset="${img.replace(/\.(jpe?g|png|gif)/i, ".webp")}"`);
    tile = tile.replace(/(<img[^>]*?)src="[^"]*"/g, (m, a) => `${a}src="${img}"`);
    tile = tile.replace(/(<img[^>]*?)alt="[^"]*"/g,
    (m, a) => `${a}alt="${name.replace(/"/g, "&quot;")}"`);
  }
  // The sale state is a CLASS on the price wrapper, and the tile is a clone of
  // a neighbouring tile — so without setting it explicitly the clone inherits
  // whether the NEIGHBOUR was on sale. Four products (p165, p168, p174, p176)
  // shipped with a strikethrough crossing off their own price: "$41.99 $41.99",
  // which reads as a broken discount rather than no discount.
  // The image banner is a SECOND sale state on the same tile — `sale-active` on
  // the wrapper and `visible` on the <p> — and it is inherited from the cloned
  // neighbour exactly like the price class. Fixing only the price left four
  // products with no strikethrough and a sale banner still sitting on their
  // artwork, which is the same lie in the louder place.
  {
    const on = !!(onSale && salePrice);
    // What the flash says, matching set-usd-price.js: the Rule of 100 — a
    // percentage under $100, dollars over it.
    const flash = (() => {
      if (!on) return "On Sale";
      const off = Number(price) - Number(salePrice);
      if (!(off > 0)) return "On Sale";
      return Number(price) < 100
        ? `${Math.round((off / Number(price)) * 100)}% OFF`
        : `$${off.toFixed(2)} OFF`;
    })();
    tile = tile.replace(
      /(<div class="category__image-sale-banner-wrapper)(?:\s+sale-active)?(")/,
      (m, a, c) => a + (on ? " sale-active" : "") + c
    );
    tile = tile.replace(
      /(<p class="category__image-sale-banner\s+)(?:visible|placeholder)(")/,
      (m, a, c) => a + (on ? "visible" : "placeholder") + c
    );
    tile = tile.replace(
      /(<p class="category__image-sale-banner[^"]*">)([\s\S]*?)(<\/p>)/,
      (m, a, inner, c) =>
        a + inner.replace(/(\s*)([^\s][\s\S]*?)(\s*)$/, (mm, lead, _t, tail) => lead + flash + tail) + c
    );
  }

  block: {
    const has = /class="wsite-com-product-price[^"]*\bsingle-sale-price\b/.test(tile);
    if (onSale && salePrice && !has) {
      tile = tile.replace(/(class="wsite-com-product-price)([^"]*)(")/,
        (m, a, mid, c) => `${a}${mid.replace(/\s+$/, "")} single-sale-price${c}`);
    } else if ((!onSale || !salePrice) && has) {
      tile = tile.replace(/(class="wsite-com-product-price)([^"]*)(")/,
        (m, a, mid, c) => a + mid.replace(/\s*\bsingle-sale-price\b/, "") + c);
    }
  }

  // Prices: regular container, then the sale container.
  const shown = onSale && salePrice ? salePrice : price;
  // Replacer functions, not replacement strings: a literal "$1" in a price like
  // $197.00 is otherwise consumed as a capture-group backreference and the page
  // ends up advertising $97.00.
  const money = (v) => (priceText || `$${v} USD`);
  tile = tile.replace(/(<div class="wsite-com-price[^"]*"[^>]*>)[\s\S]*?(<\/div>)/i,
    (_, a, b) => `${a}\n\t\t\t\t\t\t${money(onSale && salePrice ? price : shown)}\n\t\t\t\t\t${b}`);
  tile = tile.replace(/(<div class="wsite-com-sale-price[^"]*"[^>]*>)[\s\S]*?(<\/div>)/i,
    (_, a, b) => `${a}\n\t\t\t\t\t\t${money(shown)}\n\t\t\t\t\t${b}`);

  // Insert after the requested neighbour, else at the front.
  const insertAt = AFTER && srcIdx !== -1 ? bound(srcIdx) : starts[0].at;
  html = html.slice(0, insertAt) + tile + html.slice(insertAt);

  console.log(`  ${rel}: tile ${existing !== -1 ? "replaced" : "added"}`);
  if (WRITE) fs.writeFileSync(file, html);
  touched++;
}

console.log(`\npages touched: ${touched}`);
if (!WRITE) console.log("DRY RUN — nothing written. Re-run with --write.");

// Shared: the offset just past a tile's own closing </div>, found by walking
// div depth from the tile's opening tag.
//
// The old fallback for the LAST tile was html.indexOf("\n\t</div>", at), which
// also matches the image-height div about 100 characters INTO every tile:
//
//     <div class="...featured-image-height ...">
//     </div>
//
// On a page with no <div class="clear"> after the grid (store/c11) that put the
// boundary inside the last tile, so an appended tile was spliced into the
// previous product's image container — the product lost its name and price and
// everything after it rendered inside a broken box. Counting depth cannot land
// mid-tile.
function tileEnd(html, at) {
  const TAG = /<div\b[^>]*>|<\/div>/gi;
  TAG.lastIndex = at;
  let depth = 0, m;
  while ((m = TAG.exec(html))) {
    depth += m[0][1] === "/" ? -1 : 1;
    if (depth === 0) {
      let e = m.index + m[0].length;
      while (e < html.length && /\s/.test(html[e])) e++;
      return e;
    }
  }
  return -1;
}
