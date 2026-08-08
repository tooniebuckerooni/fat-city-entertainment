// One-off: repoint the sitewide nav item "Trivia Generator" -> "Trivia Show Maker"
// and its href from /trivia-generator.html -> /trivia-show-maker/. Scoped to the
// exact nav href string and the wsite-menu-title span text so page prose is untouched.
//   node _tools/rename-trivia-generator-nav.js         # dry run
//   node _tools/rename-trivia-generator-nav.js --write
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

const MENU_TEXT = /(<span class="wsite-menu-title">\s*)Trivia Generator(\s*<\/span>)/g;
let files = 0, hrefHits = 0, textHits = 0;
for (const f of walk(REPO)) {
  const s = fs.readFileSync(f, "utf8");
  let o = s;
  const hrefCount = (o.match(/href="\/trivia-generator\.html"/g) || []).length;
  o = o.split('href="/trivia-generator.html"').join('href="/trivia-show-maker/"');
  const textCount = (o.match(MENU_TEXT) || []).length;
  o = o.replace(MENU_TEXT, "$1Trivia Show Maker$2");
  if (o !== s) {
    files++; hrefHits += hrefCount; textHits += textCount;
    if (WRITE) fs.writeFileSync(f, o);
  }
}
console.log((WRITE ? "WROTE" : "DRY RUN") + `: ${files} files, ${hrefHits} href swaps, ${textHits} menu-text swaps`);
