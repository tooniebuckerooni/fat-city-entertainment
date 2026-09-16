// Put the buy button where a buyer can reach it: directly under the price.
//
//   node _tools/reorder-product-cta.js                 # dry run, every product
//   node _tools/reorder-product-cta.js p147            # dry run, one product
//   node _tools/reorder-product-cta.js --write
//   node _tools/reorder-product-cta.js --remove --write   # put it back
//
// WHY THIS EXISTS
// ---------------
// Weebly's product template puts the CTA last. Measured order inside
// #wsite-com-product-info-inner was:
//
//   title -> sku -> price-area -> short-description -> [value-math]
//         -> [playlist badge] -> #wsite-com-product-buy -> [cross-sell]
//
// The description is a median 373 visible words (SEPT-10-PLAN.md Phase 5), and
// main_style.css stacks the two product columns at max-width:767px, so on a phone
// the button sits two or three scrolls below the price it belongs to. This moves
// the buy div (and the "Quick math" block, which is price context) up above the
// description. Nothing about the button itself changes: same id, same classes,
// same data-product, same href. Checkout is untouched.
//
// WHAT IT PLANTS, AND WHY
// -----------------------
// Two other tools used to find their insertion point *relative to the buy div*,
// so moving it would have dragged them along:
//
//   * add-playlist-badge.js inserted immediately BEFORE the buy div, which after
//     this move would put the playlist callout back between price and button --
//     the exact thing being removed. It now fills <!-- fce:playlist-slot -->.
//   * add-cross-sell.js appends AFTER the buy div, but only when a page has no
//     markers of its own; the 53 pages that already have a block are replaced in
//     place and never move. Its first-time anchor is now <!-- fce:below-copy -->.
//
// Deliberately NOT planted: an empty cross-sell marker pair. NO_BLOCK (p189,
// p155) in add-cross-sell.js strips the pair entirely, so an empty one would make
// that tool report "would remove the block" on every run -- permanent drift in
// the Monday health check.
//
// Boundaries are found by walking div depth, never by a string match. That is the
// rule this repo learned the hard way: indexOf("\n\t</div>") also matches the
// image-height div about a hundred characters INTO a block.
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
const WRITE = args.includes("--write");
const REMOVE = args.includes("--remove");
const ONLY = args.filter((a) => /^p\d+$/.test(a));

const PLAY_OPEN = "<!-- fce:playlist-slot -->";
const PLAY_CLOSE = "<!-- /fce:playlist-slot -->";
const BELOW = "<!-- fce:below-copy -->";

const INNER = '<div id="wsite-com-product-info-inner">';
const PRICE = '<div id="wsite-com-product-price-area"';
const DESC = '<div id="wsite-com-product-short-description"';
const VALUE = '<div class="fce-value-math">';
const BUY = '<div id="wsite-com-product-buy">';
const BADGE_RE = /<p class="fce-playlist-badge">[\s\S]*?<\/p>/;

// The close of the div that opens at `at`. Returns the index just past "</div>".
function divEnd(html, at) {
  const TAG = /<div\b[^>]*>|<\/div>/gi;
  TAG.lastIndex = at;
  let depth = 0, m;
  while ((m = TAG.exec(html))) {
    depth += m[0][1] === "/" ? -1 : 1;
    if (depth === 0) return m.index + m[0].length;
  }
  return -1;
}

// Cut a block out together with the whitespace immediately before it, and put
// that whitespace back with it wherever it lands. Weebly left a run of seven
// blank lines between the copy and the buy div (its old options picker), and if
// the block and its separator part company the two directions stop being exact
// inverses: --remove then rebuilds a page that is not the one it started from.
function cut(html, start, end) {
  let s = start;
  while (s > 0 && /\s/.test(html[s - 1])) s--;
  return { ws: html.slice(s, start), text: html.slice(start, end), rest: html.slice(0, s) + html.slice(end) };
}

const products = [];
for (const dir of fs.readdirSync(path.join(REPO, "store"))) {
  if (!/^p\d+$/.test(dir)) continue;
  if (ONLY.length && !ONLY.includes(dir)) continue;
  const full = path.join(REPO, "store", dir);
  if (!fs.statSync(full).isDirectory()) continue;
  for (const f of fs.readdirSync(full)) {
    if (f.endsWith(".html")) products.push([dir, path.join(full, f)]);
  }
}
products.sort((a, b) => a[1].localeCompare(b[1]));

let changed = 0, already = 0, stubs = 0, skipped = 0, refused = 0;

for (const [pid, file] of products) {
  let html = fs.readFileSync(file, "utf8");
  const before = html;
  const rel = path.relative(REPO, file);

  if (/http-equiv="refresh"/i.test(html)) { stubs++; continue; }

  // The Amazon/KDP page has a .kdp-buy button that ls-buy.js clones at runtime;
  // leave its shape alone rather than reasoning about a second button here.
  if (/class="[^"]*\bkdp-buy\b/.test(html)) { skipped++; continue; }

  const innerAt = html.indexOf(INNER);
  if (innerAt === -1) { skipped++; continue; }

  // Everything below is located inside info-inner, so a stray match elsewhere on
  // the page (the footer repeats a lot of this markup) cannot be picked up.
  const innerEnd = divEnd(html, innerAt);
  if (innerEnd === -1) {
    console.log(`  REFUSED ${rel} -- info-inner does not close`);
    refused++; process.exitCode = 1; continue;
  }

  const find = (needle) => {
    const at = html.indexOf(needle, innerAt);
    return at === -1 || at > innerEnd ? -1 : at;
  };

  const buyAt = find(BUY);
  const priceAt = find(PRICE);
  const descAt = find(DESC);
  if (buyAt === -1 || priceAt === -1 || descAt === -1) {
    console.log(`  REFUSED ${rel} -- missing buy, price or description block`);
    refused++; process.exitCode = 1; continue;
  }

  const priceEnd = divEnd(html, priceAt);
  const descEnd = divEnd(html, descAt);
  const buyEnd = divEnd(html, buyAt);
  if (priceEnd === -1 || descEnd === -1 || buyEnd === -1) {
    console.log(`  REFUSED ${rel} -- a block does not close`);
    refused++; process.exitCode = 1; continue;
  }

  const valueAt = find(VALUE);
  const valueEnd = valueAt === -1 ? -1 : divEnd(html, valueAt);

  if (REMOVE) {
    // Reverse: buy and value-math go back below the description, markers go.
    if (buyAt > descAt) { already++; continue; }
    let work = html;
    const gotBuy = cut(work, buyAt, buyEnd);
    work = gotBuy.rest;
    let got = null;
    if (valueAt !== -1) { got = cut(work, valueAt, valueEnd); work = got.rest; }

    work = work.replace(
      /\n?<!-- fce:playlist-slot -->\n?([\s\S]*?)\n?<!-- \/fce:playlist-slot -->/,
      (m, inner) => (inner ? "\n" + inner : "")
    );
    work = work.replace(/<!-- fce:below-copy -->\n[ \t]*/, () => "");

    // Re-find the description close in the rewritten string, then put them back,
    // each with the whitespace that travelled with it.
    const innerAt2 = work.indexOf(INNER);
    const d2End = divEnd(work, work.indexOf(DESC, innerAt2));
    if (got) work = work.slice(0, d2End) + got.ws + got.text + work.slice(d2End);

    // The buy div goes back below the playlist badge where there is one, else
    // below whatever now ends the copy.
    const badge = work.match(BADGE_RE);
    let a2;
    if (badge) a2 = work.indexOf(badge[0]) + badge[0].length;
    else if (got) a2 = divEnd(work, work.indexOf(VALUE, innerAt2));
    else a2 = divEnd(work, work.indexOf(DESC, innerAt2));
    work = work.slice(0, a2) + gotBuy.ws + gotBuy.text + work.slice(a2);
    html = work;
  } else {
    // Already in position? The buy div sits above the description and the slot
    // markers are planted.
    const inPlace = buyAt < descAt && html.indexOf(PLAY_OPEN, innerAt) !== -1 &&
      html.indexOf(BELOW, innerAt) !== -1;
    if (inPlace) { already++; continue; }

    let work = html;
    // Cut from the back so earlier offsets stay valid: buy is last, then value.
    const gotBuy = cut(work, buyAt, buyEnd);
    work = gotBuy.rest;
    let got = null;
    if (valueAt !== -1 && valueAt < buyAt) { got = cut(work, valueAt, valueEnd); work = got.rest; }

    // Wrap the playlist badge in its slot, or plant an empty slot after the
    // description so add-playlist-badge.js has somewhere to write later.
    const badge = work.match(BADGE_RE);
    if (badge) {
      work = work.replace(BADGE_RE, () => `${PLAY_OPEN}\n${badge[0]}\n${PLAY_CLOSE}`);
    } else {
      const d2 = work.indexOf(DESC, work.indexOf(INNER));
      const d2End = divEnd(work, d2);
      work = work.slice(0, d2End) + `\n${PLAY_OPEN}${PLAY_CLOSE}` + work.slice(d2End);
    }

    // Insert value-math then the buy div immediately after the price area, each
    // carrying the whitespace it was separated from the page by.
    const p2 = work.indexOf(PRICE, work.indexOf(INNER));
    const p2End = divEnd(work, p2);
    const moved = (got ? got.ws + got.text : "") + gotBuy.ws + gotBuy.text;
    work = work.slice(0, p2End) + moved + work.slice(p2End);

    // The below-copy anchor closes out info-inner, keeping that line's own indent
    // so --remove can strip it back out exactly.
    const i2 = work.indexOf(INNER);
    const i2End = divEnd(work, i2);
    const closeAt = work.lastIndexOf("</div>", i2End - 1);
    let ind = closeAt;
    while (ind > 0 && (work[ind - 1] === " " || work[ind - 1] === "\t")) ind--;
    work = work.slice(0, closeAt) + `${BELOW}\n${work.slice(ind, closeAt)}` + work.slice(closeAt);
    html = work;
  }

  if (html === before) { already++; continue; }

  // A move must not change the document's div balance.
  const open = (html.match(/<div\b[^>]*>/gi) || []).length;
  const close = (html.match(/<\/div>/gi) || []).length;
  const openB = (before.match(/<div\b[^>]*>/gi) || []).length;
  const closeB = (before.match(/<\/div>/gi) || []).length;
  if (open - close !== openB - closeB) {
    console.log(`  REFUSED ${rel} -- div balance changed, not writing`);
    refused++; process.exitCode = 1; continue;
  }

  changed++;
  console.log(`  ${WRITE ? "updated" : "would update"}: ${rel}`);
  if (WRITE) fs.writeFileSync(file, html);
}

console.log(`\nproduct pages     : ${products.length}`);
console.log(`already in place  : ${already}`);
console.log(`redirect stubs    : ${stubs}`);
console.log(`skipped (no shell): ${skipped}`);
if (refused) console.log(`REFUSED           : ${refused}`);
console.log(`${WRITE ? "updated" : "would update"}: ${changed} page(s)`);
if (!WRITE && changed) console.log("re-run with --write");
