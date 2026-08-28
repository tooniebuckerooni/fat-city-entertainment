// Put the multi-game Packs at the front of the storefront.
//
// Lemon Squeezy has no cart — a visitor can only buy one thing per checkout. So
// every single-game tile shown before a Pack is an invitation to a $10.99 order
// that ends the session. Leading with the Packs and the Gold Club puts the
// larger baskets where they're seen first.
//
// The tiles are reordered in place; nothing is added, removed or restyled. Order
// is set by ORDER below, and anything not listed keeps its existing relative
// position behind the listed items.
//
//   node _tools/order-store-tiles.js            # dry run
//   node _tools/order-store-tiles.js --write
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const WRITE = process.argv.includes("--write");

// Packs and clubs first, biggest basket first. Everything else follows in the
// order it already had.
const ORDER = ["112", "130", "131", "155", "147", "49", "123"];

// Sold-out items sink to the very end, after everything else including
// unlisted tiles — a dead-end click doesn't belong in prime real estate.
const LAST = ["3"]; // Fat Bottom Trivia Host T-shirt

const PAGES = ["trivia-store.html", "store/c1/triviastore/index.html",
               "store/c11/musicdoboff/index.html"];

// The storefront uses the "-featured" tile variant; category pages use the plain
// one. Match either.
// [^"]* (not just an optional space) so a tile carrying an extra class —
// e.g. the sold-out shirt's "... wsite-com-column wsite-soldout" — still
// matches. Without it, that tile was invisible to this whole script and
// never got reordered.
const TILE = /<div class="wsite-com-category-product(?:-featured)? wsite-com-column[^"]*"\s*data-id="(\d+)">/g;

for (const rel of PAGES) {
  const file = path.join(REPO, rel);
  if (!fs.existsSync(file)) { console.log(`  skip (missing): ${rel}`); continue; }
  const html = fs.readFileSync(file, "utf8");

  // Locate the group container that holds the tiles.
  const groupOpen = html.indexOf('<div id="wsite-com-category-product-group"');
  if (groupOpen === -1) { console.log(`  skip (no product group): ${rel}`); continue; }
  const groupBodyStart = html.indexOf(">", groupOpen) + 1;

  // Collect tile start offsets inside the group.
  TILE.lastIndex = groupBodyStart;
  const starts = [];
  let m;
  while ((m = TILE.exec(html))) starts.push({ at: m.index, id: m[1] });
  if (starts.length < 2) { console.log(`  skip (too few tiles): ${rel}`); continue; }

  // Each tile runs to the start of the next one; the last runs to the end of the
  // group, which is the last `</div>` before the group's own closing markup.
  const groupEnd = html.indexOf('<div class="clear">', starts[starts.length - 1].at);
  const lastEnd = groupEnd !== -1 ? groupEnd : html.indexOf("\n\t</div>", starts[starts.length - 1].at);
  if (lastEnd === -1) { console.log(`  skip (can't find group end): ${rel}`); continue; }

  const tiles = starts.map((s, i) => ({
    id: s.id,
    html: html.slice(s.at, i + 1 < starts.length ? starts[i + 1].at : lastEnd),
  }));

  const rank = (id) => {
    if (LAST.includes(id)) return Infinity;
    const i = ORDER.indexOf(id);
    return i === -1 ? ORDER.length + tiles.findIndex((t) => t.id === id) : i;
  };
  const sorted = [...tiles].sort((a, b) => rank(a.id) - rank(b.id));

  const before = tiles.map((t) => "p" + t.id).join(" ");
  const after = sorted.map((t) => "p" + t.id).join(" ");
  if (before === after) { console.log(`  already ordered: ${rel}`); continue; }

  const out =
    html.slice(0, starts[0].at) + sorted.map((t) => t.html).join("") + html.slice(lastEnd);

  console.log(`  ${rel}`);
  console.log(`      was: ${before}`);
  console.log(`      now: ${after}`);
  if (WRITE) fs.writeFileSync(file, out);
}

if (!WRITE) console.log("\nDRY RUN — nothing written. Re-run with --write.");
