// Put a live product count on each subcategory tile.
//
//   node _tools/count-subcategory-tiles.js                  # dry run
//   node _tools/count-subcategory-tiles.js --write
//   node _tools/count-subcategory-tiles.js --remove --write # take them back off
//
// WHY
// ---
// The storefront is a curated 19 of 81 products, so a shopper standing on it
// has no way to learn that "Music Bingo Card Downloads" is 53 games. The filter
// chips used to be on that page and made it worse, not better: they counted the
// 19 tiles in front of them while reading as a claim about the catalogue
// ("Music bingo (11)"). Those were retired -- see add-store-filters.js RETIRED.
// A count on the tile is the honest version of the same information, because a
// tile LEAVES the page you are on, so the number it carries is the number you
// get when you click it.
//
// THE COUNT IS DERIVED, NEVER STORED
// ----------------------------------
// Each tile links somewhere. We resolve that href to a file on disk and count
// the product tiles on it. So the number cannot disagree with the catalogue,
// and adding a product to a category updates its tile on the next run. This is
// the same discipline as the DERIVED half of product-facets.json: a figure a
// human types is a figure that goes stale.
//
// TWO TILE SHAPES, AGAIN
// ----------------------
// Products are "wsite-com-category-product" OR
// "wsite-com-category-product-featured", and the class attribute carries a
// TRAILING SPACE before the closing quote. Matching only the first shape misses
// c11 entirely -- the trap add-perk-badge.js and track.js each hit once.
//
// BOUNDARIES BY DIV DEPTH
// -----------------------
// A tile's extent is found by walking div depth from its own opening tag, never
// by a string match. add-store-tile.js closed a grid at indexOf("\n\t</div>")
// once and spliced tiles into the middle of other tiles.
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
const WRITE = args.includes("--write");
const REMOVE = args.includes("--remove");

// Pages that carry subcategory tiles. Verified by grep, not assumed:
// trivia-store.html and store/c1/ are the storefront and its byte-identical
// twin; c11 carries Eras and Holidays.
const PAGES = [
  "trivia-store.html",
  "store/c1/triviastore/index.html",
  "store/c11/musicdoboff/index.html",
];

// A tile reading "(1)" advertises thinness at the exact moment someone is
// choosing where to go, and a category with one product is a page you can just
// visit. Below this the tile is left bare. Currently suppresses exactly one:
// Virtual Events (c41). Reported on every run so it cannot rot unnoticed.
const MIN_COUNT = 2;

const START = "<!-- fce:subcat-count -->";
const END = "<!-- /fce:subcat-count -->";
// The leading space is part of the block so removal restores the byte exactly.
const MARK_RE = / ?<!-- fce:subcat-count -->[\s\S]*?<!-- \/fce:subcat-count -->/g;

const TILE_OPEN = '<div class="wsite-com-category-subcategory wsite-com-column"';
const PRODUCT_RE =
  /class="wsite-com-category-product(?:-featured)? wsite-com-column ?"[^>]*data-id="\d+"/g;

// Walk div depth from the tile's own opening tag to the div that closes it.
// Returns the index just past that closer.
function tileEnd(html, start) {
  const re = /<div\b|<\/div>/g;
  re.lastIndex = start;
  let depth = 0, m;
  while ((m = re.exec(html))) {
    depth += m[0] === "</div>" ? -1 : 1;
    if (depth === 0) return re.lastIndex;
  }
  return -1;
}

// "/store/c34/Music_Bingo_%26_Trivia_Bundles.html" -> the file on disk.
// Percent-decoding matters: normalize-url-encoding.js keeps the four store
// files with "," and "&" in their names on the encoded form on purpose.
function resolveHref(href) {
  let p = href.split("#")[0].split("?")[0];
  if (!p.startsWith("/")) return null;
  try { p = decodeURIComponent(p); } catch (e) { return null; }
  p = p.replace(/^\//, "");
  if (p.endsWith("/")) p += "index.html";
  const file = path.join(REPO, p);
  return fs.existsSync(file) ? file : null;
}

function countProducts(file) {
  const html = fs.readFileSync(file, "utf8");
  const m = html.match(PRODUCT_RE);
  return m ? m.length : 0;
}

let changed = 0, problems = 0;
const seen = [];

for (const rel of PAGES) {
  const file = path.join(REPO, rel);
  if (!fs.existsSync(file)) {
    console.log(`  PROBLEM: missing ${rel}`);
    problems++; process.exitCode = 1; continue;
  }
  let html = fs.readFileSync(file, "utf8");
  const before = html;
  let at = 0;
  const pieces = [];
  let cursor = 0;

  while ((at = html.indexOf(TILE_OPEN, cursor)) !== -1) {
    const end = tileEnd(html, at);
    if (end === -1) {
      console.log(`  PROBLEM: unbalanced subcategory tile in ${rel} - refusing to guess`);
      problems++; process.exitCode = 1; break;
    }
    let tile = html.slice(at, end);

    // Strip first, always, so a re-run replaces rather than stacks.
    tile = tile.replace(MARK_RE, () => "");

    if (!REMOVE) {
      const hrefM = tile.match(/href="([^"]+)"/);
      const nameM = tile.match(
        /(<div class="wsite-com-category-subcategory-name-text">\s*<span>)([\s\S]*?)(<\/span>)/
      );
      if (!hrefM || !nameM) {
        console.log(`  PROBLEM: tile in ${rel} has no href or no name block - skipped`);
        problems++; process.exitCode = 1;
      } else {
        const target = resolveHref(hrefM[1]);
        if (!target) {
          console.log(`  PROBLEM: ${rel} tile links to ${hrefM[1]}, which is not on disk`);
          problems++; process.exitCode = 1;
        } else {
          const n = countProducts(target);
          // Split the span's inner text into leading space, the name, and
          // trailing space, so the count lands against the name and the
          // original whitespace survives untouched.
          const parts = nameM[2].match(/^(\s*)([\s\S]*?)(\s*)$/);
          const label = parts[2];
          seen.push({ page: rel, label, n, target: path.relative(REPO, target) });
          if (n >= MIN_COUNT) {
            const rebuilt =
              nameM[1] + parts[1] + label + ` ${START}(${n})${END}` + parts[3] + nameM[3];
            tile = tile.replace(nameM[0], () => rebuilt);
          }
        }
      }
    }

    pieces.push(html.slice(cursor, at), tile);
    cursor = end;
  }
  pieces.push(html.slice(cursor));
  html = pieces.join("");

  if (html === before) continue;
  changed++;
  console.log(`  ${WRITE ? "updated" : "would update"}: ${rel}`);
  if (WRITE) fs.writeFileSync(file, html);
}

if (seen.length) {
  console.log("\ncounts (derived from each tile's own link target):");
  const width = Math.max(...seen.map(s => s.label.length));
  const shown = new Set();
  for (const s of seen) {
    const key = s.label + s.n;
    if (shown.has(key)) continue;
    shown.add(key);
    const note = s.n < MIN_COUNT ? `  (suppressed, below ${MIN_COUNT})` : "";
    console.log(`  ${s.label.padEnd(width)}  ${String(s.n).padStart(3)}   ${s.target}${note}`);
  }
}

console.log(`\nlisting pages     : ${PAGES.length}`);
if (problems) console.log(`PROBLEM tiles     : ${problems}`);
console.log(`${WRITE ? "updated" : "would update"}: ${changed} page(s)`);
if (!WRITE && changed) console.log("re-run with --write");
