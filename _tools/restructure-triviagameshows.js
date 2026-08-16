// Rename the "Game Show" Trivia category to "Pre-made Trivia Shows" (display
// text only — URL stays /store/c6/triviagameshows/) and stop promoting "Hard
// Games" as a category: unlink it from the sidebar hierarchy and from the
// Music Bingo Card Downloads subcategory tile grid, but leave
// store/c42/hardgames/index.html itself untouched — it's still live, just
// not advertised as a shopping destination anymore.
//
// Traffic data showed "Game Show" and "Hard Games" don't match how anyone
// actually searches; "Pre-made Trivia Shows" mirrors the naming already
// working for Music Bingo Card Downloads.
//
//   node _tools/restructure-triviagameshows.js            # dry run
//   node _tools/restructure-triviagameshows.js --write
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const WRITE = process.argv.includes("--write");

const read = (rel) => fs.readFileSync(path.join(REPO, rel), "utf8");
const write = (rel, html) => { if (WRITE) fs.writeFileSync(path.join(REPO, rel), html); };

// Every store page that carries the category sidebar hierarchy widget.
const HIERARCHY_PAGES = [
  "trivia-store.html",
  "store/c1/triviastore/index.html",
  "store/c11/musicdoboff/index.html",
  "store/c33/Eras.html",
  "store/c34/Music_Bingo_&_Trivia_Bundles.html",
  "store/c40/holidays/index.html",
  "store/c41/virtualevents/index.html",
  "store/c42/hardgames/index.html",
  "store/c6/triviagameshows/index.html",
];

// Individual "Game Show" Trivia product pages whose breadcrumb names the category.
const BREADCRUMB_PAGES = [
  "store/p123/MTPpack1.html",
  "store/p126/videogametrivia.html",
  "store/p13/spn11.html",
  "store/p18/fbthandbook.html",
  "store/p28/touchdowntriviapack.html",
  "store/p49/FBTgk5pack1.html",
  "store/p9/thewildwest.html",
];

const HARDGAMES_LI = /[ \t]*<li class="[^"]*">\s*<a href="\/store\/c42\/hardgames\/"[\s\S]*?<\/li>\n/;
const GAMESHOW_HIERARCHY_TEXT = /(<div class="wsite-com-link-text[^"]*">\s*\n\s*)"Game Show" Trivia(\s*\n)/;
const GAMESHOW_TILE_TEXT = /(<span>\s*\n\s*)"Game Show" Trivia(\s*\n)/;
const GAMESHOW_BREADCRUMB_TEXT = /(<span class="wsite-com-link-text">\s*\n\s*)"Game Show" Trivia(\s*\n)/;

let touched = 0;

console.log("--- sidebar hierarchy: unlink Hard Games, rename Game Show Trivia ---");
for (const rel of HIERARCHY_PAGES) {
  let html = read(rel);
  let changed = false;

  if (HARDGAMES_LI.test(html)) {
    html = html.replace(HARDGAMES_LI, "");
    changed = true;
  } else {
    console.log(`  ${rel}: Hard Games <li> not found (already removed?)`);
  }

  if (GAMESHOW_HIERARCHY_TEXT.test(html)) {
    html = html.replace(GAMESHOW_HIERARCHY_TEXT, "$1Pre-made Trivia Shows$2");
    changed = true;
  } else {
    console.log(`  ${rel}: Game Show Trivia hierarchy label not found`);
  }

  console.log(`  ${rel}: ${changed ? "updated" : "no change"}`);
  if (changed) { write(rel, html); touched++; }
}

console.log("\n--- tile grid: rename Game Show Trivia label ---");
for (const rel of ["trivia-store.html", "store/c1/triviastore/index.html"]) {
  let html = read(rel);
  if (GAMESHOW_TILE_TEXT.test(html)) {
    html = html.replace(GAMESHOW_TILE_TEXT, "$1Pre-made Trivia Shows$2");
    console.log(`  ${rel}: tile label renamed`);
    write(rel, html);
    touched++;
  } else {
    console.log(`  ${rel}: tile label not found`);
  }
}

console.log("\n--- breadcrumbs: rename Game Show Trivia on its product pages ---");
for (const rel of BREADCRUMB_PAGES) {
  let html = read(rel);
  if (GAMESHOW_BREADCRUMB_TEXT.test(html)) {
    html = html.replace(GAMESHOW_BREADCRUMB_TEXT, "$1Pre-made Trivia Shows$2");
    console.log(`  ${rel}: breadcrumb renamed`);
    write(rel, html);
    touched++;
  } else {
    console.log(`  ${rel}: breadcrumb text not found`);
  }
}

console.log(`\nfiles touched: ${touched}`);
if (!WRITE) console.log("DRY RUN — nothing written. Re-run with --write.");
