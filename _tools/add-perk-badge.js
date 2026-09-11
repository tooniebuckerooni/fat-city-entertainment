// A corner badge on a product's main image and on every listing tile for it,
// naming something that comes with the product but is not visible in the art.
//
//   node _tools/add-perk-badge.js                # dry run, every badge
//   node _tools/add-perk-badge.js p189           # dry run, one product
//   node _tools/add-perk-badge.js p189 --write
//   node _tools/add-perk-badge.js --remove --write
//
// WHY
// ---
// The Halloween Complete Pack's whole differentiator is the free month of
// Bingo Card Generator 2.0, and the cover art is a music bingo box shot: a
// shopper scanning a grid of tiles has no way to see it. The price says
// "$35.97 down from $45.97" and nothing says "and a tool worth $24".
//
// Generic on purpose. Add a BADGES entry and re-run; the Christmas pack, the
// club tiers and anything else with a bundled perk use the same tool and the
// same two CSS classes. See .claude/skills/seasonal-push for how this fits the
// rest of a seasonal launch.
//
// WHERE IT GOES
// -------------
// Product page: the first child of #wsite-com-product-images, which
// site-extras.css makes position:relative. Deliberately NOT inside the
// cloud-zoom anchor: that element is rewritten by the zoom plugin at runtime,
// and anything parked inside it is a fight waiting to happen.
//
// Tile: inside the tile's own <div style="position:relative">, the wrapper
// Weebly already provides for the sale banner. The sale banner is a full-width
// strip along the BOTTOM (see .category__image-sale-banner-wrapper in
// sites.css), so a top-left badge cannot collide with it. Tiles are found by
// walking div depth from the tile's opening tag, never by string search: that
// is how an append once landed inside the previous product and blanked half of
// store/c11.
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
const WRITE = args.includes("--write");
const REMOVE = args.includes("--remove");
const ONLY = args.filter((a) => /^p\d+$/.test(a));

const SKIP_DIRS = new Set(["_tools", ".git", "node_modules", "assets", "files", "uploads", "pages", "4", "_export"]);

// pid -> what the badge says. `lead` is the shout, `sub` the qualifier.
const BADGES = {
  p189: { lead: "1 Month Free", sub: "Bingo Card Generator 2.0" },
};

const START = (pid) => `<!-- fce:perk-badge:${pid} -->`;
const END = (pid) => `<!-- /fce:perk-badge:${pid} -->`;
const blockRe = (pid) =>
  new RegExp(`\\n?[ \\t]*<!-- fce:perk-badge:${pid} -->[\\s\\S]*?<!-- \\/fce:perk-badge:${pid} -->`, "g");

// No em-dashes: a visitor reads this (CLAUDE.md writing-style rule).
const badge = (pid, b, size) =>
  `${START(pid)}<span class="fce-perk-badge fce-perk-badge--${size}">` +
  `<b>${b.lead}</b><i>${b.sub}</i></span>${END(pid)}`;

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

// End of the element opening at `at`, by depth. Cannot land mid-tile.
function tileEnd(html, at) {
  const TAG = /<div\b[^>]*>|<\/div>/gi;
  TAG.lastIndex = at;
  let depth = 0, m;
  while ((m = TAG.exec(html))) {
    depth += m[0][1] === "/" ? -1 : 1;
    if (depth === 0) return m.index + m[0].length;
  }
  return -1;
}

const files = walk(REPO, []);
const pids = Object.keys(BADGES).filter((p) => !ONLY.length || ONLY.includes(p));
let changed = 0, added = 0, removedN = 0;

for (const rel of files) {
  const abs = path.join(REPO, rel);
  let html = fs.readFileSync(abs, "utf8");
  const before = html;

  for (const pid of pids) {
    const b = BADGES[pid];

    if (REMOVE) {
      if (html.includes(START(pid))) {
        const n = (html.match(blockRe(pid)) || []).length;
        html = html.replace(blockRe(pid), () => "");
        removedN += n;
      }
      continue;
    }

    // --- the product's own page -------------------------------------------
    if (rel.startsWith(`store/${pid}/`) && html.includes(`data-product="${pid}"`)) {
      html = html.replace(blockRe(pid), () => "");
      const anchor = html.match(/<div id="wsite-com-product-images">/);
      if (anchor) {
        const at = anchor.index + anchor[0].length;
        html = html.slice(0, at) + "\n" + badge(pid, b, "lg") + html.slice(at);
        added++;
      }
      continue;
    }

    // --- every listing tile for it ----------------------------------------
    // Two tile shapes, not one: the storefront and the store root use
    // "wsite-com-category-product-featured", every category page uses
    // "wsite-com-category-product". Matching only the second silently missed
    // the two highest-traffic placements on the site.
    const TILE = new RegExp(
      `<div class="wsite-com-category-product(?:-featured)? [^"]*"[^>]*data-id="${pid.slice(1)}"[^>]*>`, "g");
    let m;
    const inserts = [];
    TILE.lastIndex = 0;
    while ((m = TILE.exec(html))) {
      const end = tileEnd(html, m.index);
      if (end < 0) continue;
      const slice = html.slice(m.index, end);
      const rel0 = slice.indexOf('<div style="position:relative">');
      if (rel0 < 0) continue;
      inserts.push(m.index + rel0 + '<div style="position:relative">'.length);
    }
    if (!inserts.length) continue;
    html = html.replace(blockRe(pid), () => "");
    // Recompute after the strip: offsets from the pre-strip pass are stale.
    const fresh = [];
    TILE.lastIndex = 0;
    while ((m = TILE.exec(html))) {
      const end = tileEnd(html, m.index);
      if (end < 0) continue;
      const slice = html.slice(m.index, end);
      const rel0 = slice.indexOf('<div style="position:relative">');
      if (rel0 < 0) continue;
      fresh.push(m.index + rel0 + '<div style="position:relative">'.length);
    }
    for (const at of fresh.reverse()) {
      html = html.slice(0, at) + badge(pid, b, "sm") + html.slice(at);
      added++;
    }
  }

  if (html !== before) {
    changed++;
    console.log(`  ${WRITE ? (REMOVE ? "cleared" : "badged") : "would update"}: ${rel}`);
    if (WRITE) fs.writeFileSync(abs, html);
  }
}

console.log(`\nproducts: ${pids.join(", ") || "(none)"}`);
if (!REMOVE) console.log(`badges placed: ${added}`);
else console.log(`badges removed: ${removedN}`);
console.log(`${WRITE ? "updated" : "would update"}: ${changed} page(s)`);
if (!WRITE && changed) console.log("re-run with --write");
