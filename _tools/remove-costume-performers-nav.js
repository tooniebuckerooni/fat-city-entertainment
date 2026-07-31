// Removes the "Costume Performers" nav dropdown item sitewide (desktop +
// mobile copies). The business isn't doing travel/costume events currently,
// and costumeperformers.html is being retired - matched by its link, not the
// <li> id, since Weebly rewrites the wrapping class (not the id, in this
// case) to wsite-nav-current on the page itself.
//
//   node _tools/remove-costume-performers-nav.js            # dry run
//   node _tools/remove-costume-performers-nav.js --write
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const WRITE = process.argv.includes("--write");
const SKIP = new Set(["_tools", "node_modules", ".git", ".claude"]);

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

const ITEM = /<li id="[^"]*" class="wsite-menu-subitem-wrap[^"]*">\s*<a href="\/costumeperformers\.html" class="wsite-menu-subitem">[\s\S]*?<\/a>\s*<\/li>\n?/g;

let filesChanged = 0, itemsRemoved = 0;

for (const file of walk(REPO)) {
  const html = fs.readFileSync(file, "utf8");
  const matches = html.match(ITEM);
  if (!matches) continue;
  const updated = html.replace(ITEM, "");
  itemsRemoved += matches.length;
  filesChanged++;
  if (WRITE) fs.writeFileSync(file, updated);
}

console.log(`files changed  : ${filesChanged}`);
console.log(`nav items removed : ${itemsRemoved}`);
if (!WRITE) console.log("\nDRY RUN — nothing written. Re-run with --write.");
