// Put the sort-and-filter controls on a store listing page.
//
//   node _tools/add-store-filters.js                  # dry run
//   node _tools/add-store-filters.js --write
//   node _tools/add-store-filters.js --remove --write # take them back off
//
// WHAT IT PLACES
// --------------
// An empty host element above the grid, between <!-- fce:store-filters -->
// markers, plus the two script tags. assets/js/store-filters.js builds the
// controls inside that host at runtime, because which chips are worth showing
// depends on how many tiles on THAT page carry each facet -- a question only
// answerable once the grid is in front of you. Keeping that logic in one place
// is why the injected markup is deliberately empty.
//
// WHAT IT DOES NOT TOUCH
// ----------------------
// Any tile. add-store-tile.js and order-store-tiles.js both match a tile with
// the ">" immediately after data-id, so adding an attribute there would make
// them match zero tiles -- while check-tile-structure.js, which does not require
// that ">", would carry on reporting every tile well formed. The filters look a
// product up by the data-id already present instead.
//
// ROLLOUT
// -------
// Storefront and the Music Bingo category first. The remaining grids are listed
// below, commented, and include store/c42/hardgames and store/c41/virtualevents
// -- two pages that are in NEITHER order-store-tiles.js NOR
// check-tile-structure.js, so every hardcoded page list in this repo skips them.
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
const WRITE = args.includes("--write");
const REMOVE = args.includes("--remove");

// Bump when either script changes so a returning visitor is not served a
// cached half of the pair (the add-green-room.js idiom).
const VERSION = "2";

const PAGES = [
  "trivia-store.html",
  "store/c11/musicdoboff/index.html",
  // Next, once this has run for a week:
  // "store/c1/triviastore/index.html",   // the storefront's store-root twin
  // "store/c33/Eras.html",
  // "store/c34/Music_Bingo_&_Trivia_Bundles.html",
  // "store/c40/holidays/index.html",
  // "store/c6/triviagameshows/index.html",
  // "store/c42/hardgames/index.html",    // in no other tool's page list
  // "store/c41/virtualevents/index.html",// in no other tool's page list
];

const START = "<!-- fce:store-filters -->";
const END = "<!-- /fce:store-filters -->";
const BLOCK_RE = /\n?[ \t]*<!-- fce:store-filters -->[\s\S]*?<!-- \/fce:store-filters -->/;
const TAGS_RE = /\n?[ \t]*<!-- fce:store-filters:js -->[\s\S]*?<!-- \/fce:store-filters:js -->/;

const block =
  `${START}\n` +
  `<div class="fce-filters" data-fce-filters></div>\n` +
  `${END}`;

const tags =
  `<!-- fce:store-filters:js -->\n` +
  `<script defer src="/assets/js/store-facets.js?v=${VERSION}"></script>\n` +
  `<script defer src="/assets/js/store-filters.js?v=${VERSION}"></script>\n` +
  `<!-- /fce:store-filters:js -->`;

// The grid's own opening tag. Anchoring to it rather than to a line of
// whitespace means the controls land immediately above the tiles on every page
// shape, and it is the one string both grid variants share.
const GRID = '<div id="wsite-com-category-product-group"';

let changed = 0, missing = 0;

for (const rel of PAGES) {
  const file = path.join(REPO, rel);
  if (!fs.existsSync(file)) {
    console.log(`  PROBLEM: missing ${rel}`);
    missing++; process.exitCode = 1; continue;
  }
  let html = fs.readFileSync(file, "utf8");
  const before = html;

  // Strip first, always, so a re-run replaces rather than stacks.
  html = html.replace(BLOCK_RE, () => "");
  html = html.replace(TAGS_RE, () => "");

  if (!REMOVE) {
    const at = html.indexOf(GRID);
    if (at === -1) {
      console.log(`  PROBLEM: no product grid in ${rel} — refusing to guess`);
      missing++; process.exitCode = 1; continue;
    }
    // Walk back to the start of the grid's own line so the block is not
    // spliced into the middle of it.
    let line = at;
    while (line > 0 && html[line - 1] !== "\n") line--;
    html = html.slice(0, line) + block + "\n" + html.slice(line);

    const body = html.lastIndexOf("</body>");
    if (body === -1) {
      console.log(`  PROBLEM: no </body> in ${rel} — refusing to guess`);
      missing++; process.exitCode = 1; continue;
    }
    html = html.slice(0, body) + tags + "\n" + html.slice(body);
  }

  if (html === before) continue;
  changed++;
  console.log(`  ${WRITE ? "updated" : "would update"}: ${rel}`);
  if (WRITE) fs.writeFileSync(file, html);
}

console.log(`\nlisting pages     : ${PAGES.length}`);
if (missing) console.log(`PROBLEM pages     : ${missing}`);
console.log(`${WRITE ? "updated" : "would update"}: ${changed} page(s)`);
if (!WRITE && changed) console.log("re-run with --write");
