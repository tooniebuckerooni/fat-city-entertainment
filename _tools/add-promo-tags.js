// A sale tag ("20% off") in the corner of every listing tile for a product
// that any PROMOS entry in assets/js/ls-buy.js covers.
//
//   node _tools/add-promo-tags.js            # dry run
//   node _tools/add-promo-tags.js --write
//   node _tools/add-promo-tags.js --remove   # dry run of the takedown
//   node _tools/add-promo-tags.js --remove --write
//
// WHY (12 Oct 2026). SPOOKY20 went live on eight products and the owner asked
// where a visitor would see it outside the email. The answer was: only after
// clicking into one of the eight product pages. A shopper browsing the store
// grid saw regular prices on every tile.
//
// SELF-SWITCHING, the same discipline as the countdown chip. The tag ships
// `hidden` and empty; ls-buy.js fills it with "<pct>% off" only while a live
// PROMOS entry covers that product today, and leaves it hidden otherwise. So
// the markup can sit on a tile for Black Friday's products weeks early and
// cost nothing, and nothing needs taking down on 1 November.
//
// The product list is READ FROM PROMOS, never typed here: a product added to a
// sale gets its tags on the next --write, and the Monday health check reports
// a tile that is missing one ("would update: N").
//
// Tiles are found by both shapes ("wsite-com-category-product" and
// "-featured") and their extent by div depth, exactly as add-perk-badge.js does
// (CLAUDE.md: the c11 mid-tile append). The tag goes inside the tile's own
// <div style="position:relative">, top RIGHT: the perk badge owns top left and
// Weebly's sale strip owns the bottom.
//
// A listing page does not otherwise load ls-buy.js, so the tool also adds one
// deferred <script> to any page it tags, between markers. ls-buy.js finds no
// buy buttons there and does nothing else (no lemon.js, no sticky bar).
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const WRITE = process.argv.includes("--write");
const REMOVE = process.argv.includes("--remove");
const SKIP_DIRS = new Set(["_tools", ".git", "node_modules", "assets", "files", "uploads", "pages", "4", "_export"]);

function promoPids() {
  const src = fs.readFileSync(path.join(REPO, "assets/js/ls-buy.js"), "utf8");
  const block = src.slice(src.indexOf("var PROMOS = ["), src.indexOf("window.FCE_PROMOS"));
  const set = new Set();
  for (const m of block.matchAll(/products:\s*\[([^\]]*)\]/g))
    for (const p of m[1].match(/p\d+/g) || []) set.add(p);
  return [...set].sort((a, b) => a.slice(1) - b.slice(1));
}

const START = (pid) => `<!-- fce:promo-tag:${pid} -->`;
const END = (pid) => `<!-- /fce:promo-tag:${pid} -->`;
const TAG = (pid) => `${START(pid)}<span class="fce-promo-tag" data-fce-promo-pid="${pid}" hidden></span>${END(pid)}`;
const ANY_TAG_RE = /<!-- fce:promo-tag:p\d+ -->[\s\S]*?<!-- \/fce:promo-tag:p\d+ -->/g;
const JS = '<!-- fce:promo-js --><script src="/assets/js/ls-buy.js" defer></script><!-- /fce:promo-js -->';
const JS_RE = /\n?<!-- fce:promo-js -->[\s\S]*?<!-- \/fce:promo-js -->/g;

function walk(dir, out) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const rel = path.relative(REPO, full);
    if (rel.split(path.sep).some((seg, i) => i === 0 && SKIP_DIRS.has(seg))) continue;
    const st = fs.statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (name.endsWith(".html")) out.push(rel);
  }
  return out;
}

function tileEnd(html, at) {
  const T = /<div\b[^>]*>|<\/div>/gi;
  T.lastIndex = at;
  let depth = 0, m;
  while ((m = T.exec(html))) {
    depth += m[0][1] === "/" ? -1 : 1;
    if (depth === 0) return m.index + m[0].length;
  }
  return -1;
}

const pids = promoPids();
let changed = 0, tags = 0;
for (const rel of walk(REPO, [])) {
  const abs = path.join(REPO, rel);
  const before = fs.readFileSync(abs, "utf8");
  let html = before.replace(ANY_TAG_RE, "").replace(JS_RE, "");
  let placed = 0;
  if (!REMOVE) {
    const inserts = [];
    for (const pid of pids) {
      const TILE = new RegExp(`<div class="wsite-com-category-product(?:-featured)? [^"]*"[^>]*data-id="${pid.slice(1)}"[^>]*>`, "g");
      let m;
      while ((m = TILE.exec(html))) {
        const end = tileEnd(html, m.index);
        if (end < 0) continue;
        const rel0 = html.slice(m.index, end).indexOf('<div style="position:relative">');
        if (rel0 < 0) continue;
        inserts.push([m.index + rel0 + '<div style="position:relative">'.length, pid]);
      }
    }
    for (const [at0, pid] of inserts.sort((a, b) => b[0] - a[0])) {
      // AFTER a perk badge if the tile has one. Both tools anchor on the same
      // wrapper; inserting first would make add-perk-badge.js, which strips and
      // re-inserts its badge at the wrapper start, see a change on every run,
      // and the two would reorder each other every Monday.
      let at = at0;
      const pb = html.slice(at).match(/^<!-- fce:perk-badge:p\d+ -->[\s\S]*?<!-- \/fce:perk-badge:p\d+ -->/);
      if (pb) at += pb[0].length;
      html = html.slice(0, at) + TAG(pid) + html.slice(at);
      placed++;
    }
    // The script goes right after the tracking block in <head>, a spot no other
    // tool appends to. (Before </body> it fought add-store-filters.js, which
    // also appends there, and each run reordered the other's script.)
    if (placed && !html.includes('src="/assets/js/ls-buy.js"')) {
      html = html.replace(/<!-- \/fce:tracking -->/, (m) => `${m}\n${JS}`);
    }
  }
  if (html === before) continue;
  changed++; tags += placed;
  console.log(`  ${WRITE ? (REMOVE ? "cleared" : "tagged") : "would update"}: ${rel}${placed ? ` (${placed} tile(s))` : ""}`);
  if (WRITE) fs.writeFileSync(abs, html);
}
console.log(`\nproducts in PROMOS: ${pids.join(", ")}`);
if (!REMOVE) console.log(`tags placed: ${tags}`);
console.log(`${WRITE ? "updated" : "would update"}: ${changed} page(s)`);
if (!WRITE && changed) console.log("re-run with --write");
