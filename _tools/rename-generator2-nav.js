// One-off: rename the sitewide nav item "Generator 2" -> "All-Purpose Generator"
// (Bingo Card Maker dropdown; Aug 2026 conversion audit item 7 — "Generator 2"
// reads like a build label, not a product). Anchored on the href +
// wsite-menu-title pair so page prose mentioning "Generator 2" is untouched.
// The href itself does not change. Idempotent: after the swap the pattern no
// longer matches. (add-bingocardmaker-nav.js can't do renames — its marker
// guard makes re-runs a no-op.)
//   node _tools/rename-generator2-nav.js         # dry run
//   node _tools/rename-generator2-nav.js --write
const fs = require("fs"), path = require("path");
const REPO = path.resolve(__dirname, "..");
const WRITE = process.argv.includes("--write");
const SKIP = new Set(["_tools", "node_modules", ".git"]);

function walk(dir) {
  let out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out = out.concat(walk(p));
    else if (e.name.endsWith(".html")) out.push(p);
  }
  return out;
}

const MENU_ITEM =
  /(<a href="\/bingocardgenerator2\.html"[^>]*>\s*<span class="wsite-menu-title">\s*)Generator 2(\s*<\/span>)/g;
let files = 0, textHits = 0;
for (const f of walk(REPO)) {
  const s = fs.readFileSync(f, "utf8");
  const o = s.replace(MENU_ITEM, "$1All-Purpose Generator$2");
  if (o !== s) {
    files++; textHits += (s.match(MENU_ITEM) || []).length;
    if (WRITE) fs.writeFileSync(f, o);
  }
}
console.log((WRITE ? "WROTE" : "DRY RUN") + `: ${files} files, ${textHits} menu-text swaps`);
