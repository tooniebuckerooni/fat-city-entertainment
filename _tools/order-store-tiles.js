// Order the product tiles on the storefront and each category page.
//
//   node _tools/order-store-tiles.js            # dry run
//   node _tools/order-store-tiles.js --write
//
// Tiles are reordered in place; nothing is added, removed or restyled. Anything
// not named in a page's list keeps its existing relative position behind the
// listed ones, so a new product never disappears — it just lands at the back
// until someone places it.
//
// WHY EACH PAGE DIFFERS. Until 6 Sept 2026 one global ORDER was applied to all
// three pages it knew about, which is why the categories looked arbitrary: a
// pack sat wherever add-store-tile.js had inserted it (at the front, newest
// first) and everything else stayed wherever Weebly's export left it. The
// storefront and the category pages are answering different questions, so they
// get different lists:
//
//   Storefront / store root — PACKS FIRST, biggest basket first. Lemon Squeezy
//     has no cart, so a visitor can only buy one thing per checkout; every
//     single-game tile shown before a pack is an invitation to a $11.99 order
//     that ends the session.
//
//   c11 Music Bingo Card Downloads — the opposite, on the owner's call: this is
//     where someone browses the GAMES, so the singles come first and every pack
//     sits at the foot of the page, smallest to largest, as the next step up.
//     The storefront still leads with packs, so the AOV argument above is not
//     lost — it just is not this page's job.
//
//   c33 Eras — chronological, because that is what an era means. Golden Oldies
//     through The 2000s, then the packs.
//
//   c40 Holidays — calendar order, Valentine's through Christmas, then the
//     packs. A holiday category sorted any other way makes a shopper hunt.
//
//   c34 Bundles — LARGEST first. Someone on a page called Bundles has already
//     decided they want more than one game; the biggest basket goes at the top.
//     Question packs and the ebooks follow, since they are not game bundles.
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const WRITE = process.argv.includes("--write");

// Packs and clubs first, biggest basket first.
const STOREFRONT = ["112", "130", "131", "155", "147", "101", "168", "166", "165",
                    "127", "162", "108", "128", "49", "123", "176"];

// Smallest to largest, for the foot of the music bingo category.
const PACKS_SMALL_TO_LARGE = ["128", "127", "162", "108", "165", "166",
                              "147", "168", "101", "155", "131", "130", "112"];

const PAGES = [
  { rel: "trivia-store.html", order: STOREFRONT, last: ["3"] },
  { rel: "store/c1/triviastore/index.html", order: STOREFRONT, last: ["3"] },

  // Singles keep the order they already have; the packs are pulled to the end.
  { rel: "store/c11/musicdoboff/index.html", order: [], last: PACKS_SMALL_TO_LARGE },

  // Eras: chronological. Punk Rock sits after The 70s — it is a late-70s scene,
  // and putting it first (where it landed as the newest tile) opened an era
  // category in the middle of its own timeline.
  { rel: "store/c33/Eras.html",
    order: ["62", "153", "143", "115", "159", "167", "144", "63", "113", "160", "146"],
    last: ["147", "101"] },

  // Holidays: calendar order, then the packs smallest to largest. The music
  // bingo game and the trivia pack for the same holiday sit together.
  { rel: "store/c40/holidays/index.html",
    order: ["111", "136", "149", "72", "97", "103"],
    // The 2-packs are all the same size, so calendar order decides between
    // them rather than leaving it arbitrary: Valentine's, St Patrick's,
    // Halloween, then the Christmas 3-pack and the 6-pack that covers the year.
    last: ["135", "53", "33", "42", "155"] },

  // Bundles: largest basket first. Question packs and the two ebooks are not
  // game bundles, so they follow rather than interleave by size.
  { rel: "store/c34/Music_Bingo_&_Trivia_Bundles.html",
    order: ["112", "130", "131", "155", "147", "168", "101", "176", "49",
            "165", "166", "28", "127", "162", "108", "123", "42", "126",
            "128", "33", "53", "135"],
    // The two ebooks sit together at the foot: they are the only Amazon/KDP
    // items in the store, and the only two with no price to compare.
    last: ["24", "25", "27", "26", "18", "900"] },
];

const TILE = /<div class="wsite-com-category-product(?:-featured)? wsite-com-column[^"]*"\s*data-id="(\d+)">/g;

for (const { rel, order: ORDER, last: LAST } of PAGES) {
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
  const lastEnd = tileEnd(html, starts[starts.length - 1].at);
  if (lastEnd === -1) { console.log(`  skip (can't find group end): ${rel}`); continue; }

  const tiles = starts.map((s, i) => ({
    id: s.id,
    html: html.slice(s.at, i + 1 < starts.length ? starts[i + 1].at : lastEnd),
  }));

  // Three bands: ORDER first in its own sequence, then anything unlisted in the
  // order it already had, then LAST in ITS own sequence. LAST used to return
  // Infinity for every entry, which sank them all to the end but left them in
  // whatever order they arrived in — so "packs at the foot, smallest to
  // largest" put them at the foot in no order at all.
  const TAIL = 1e6;
  const rank = (id) => {
    const l = LAST.indexOf(id);
    if (l !== -1) return TAIL + l;
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
