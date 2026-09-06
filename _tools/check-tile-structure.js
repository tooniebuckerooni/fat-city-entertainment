// Verify that every store listing tile is a well-formed, self-contained block.
//
//   node _tools/check-tile-structure.js
//
// Exists because a malformed tile is invisible to every other check. On
// 5 Sept 2026 add-store-tile.js spliced p128's tile INTO p103's image
// container on store/c11: the page still had the right number of tiles, every
// link still resolved, check-links.js passed, and the price tools were happy —
// but Christmas rendered with no name and no price and the fourteen tiles after
// it did not render at all, because they were nested inside a broken box.
//
// The cause was a boundary that fell back to indexOf("\n\t</div>"), which also
// matches the image-height div a few lines into every tile. Counting div depth
// is what makes a tile boundary trustworthy; this checks the result.
//
// Two structural facts, per tile:
//   depth      a product tile opens and closes its own divs, so the slice from
//              one tile's opening tag to the next tile's must balance
//   name       every tile carries a *-name div; losing it is what a truncated
//              tile looks like to a shopper
//
// Subcategory tiles are exempt from the depth check: the subcategory list has
// its own wrapper that closes after the last one, so the final subcategory
// legitimately reads +1. That has been true in every revision since the Weebly
// export, so treating it as damage would make this check cry wolf forever.
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const PAGES = [
  "trivia-store.html",
  "store/c1/triviastore/index.html",
  "store/c11/musicdoboff/index.html",
  "store/c33/Eras.html",
  "store/c40/holidays/index.html",
  "store/c34/Music_Bingo_&_Trivia_Bundles.html",
  "store/c6/triviagameshows/index.html",
];
const OPEN = /<div class="wsite-com-category-(product-featured|product|subcategory)[^"]*" data-id="(\d+)"/g;
const NAME = /wsite-com-category-(?:product|subcategory)-name/;

const depthOf = (s) =>
  (s.match(/<div\b/g) || []).length - (s.match(/<\/div>/g) || []).length;

// The offset just past a tile's own closing </div>, by walking div depth.
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

let problems = 0;
for (const rel of PAGES) {
  const file = path.join(REPO, rel);
  if (!fs.existsSync(file)) { console.log(`  skip (missing): ${rel}`); continue; }
  const html = fs.readFileSync(file, "utf8");

  OPEN.lastIndex = 0;
  const starts = [];
  let m;
  while ((m = OPEN.exec(html))) starts.push({ at: m.index, kind: m[1], id: m[2] });
  if (!starts.length) { console.log(`  skip (no tiles): ${rel}`); continue; }

  const bad = [];
  starts.forEach((s, i) => {
    // The last tile has no next sibling to bound it, so close it by depth.
    const end = i + 1 < starts.length ? starts[i + 1].at : tileEnd(html, s.at);
    if (end === -1) { bad.push(`p${s.id}: never closes`); return; }
    const seg = html.slice(s.at, end);
    const d = i + 1 < starts.length ? depthOf(seg) : 0;
    if (d !== 0 && s.kind !== "subcategory") bad.push(`p${s.id}: unbalanced (${d > 0 ? "+" : ""}${d} div)`);
    if (!NAME.test(seg)) bad.push(`p${s.id}: no name block — tile is truncated`);
  });

  if (bad.length) {
    problems += bad.length;
    console.log(`  BROKEN TILE  ${rel}`);
    for (const b of bad) console.log(`      ${b}`);
  } else {
    console.log(`  ok  ${rel}  (${starts.length} tiles)`);
  }
}

console.log(problems ? `\n${problems} broken tile(s)` : "\nall tiles well-formed");
process.exit(problems ? 1 : 0);
