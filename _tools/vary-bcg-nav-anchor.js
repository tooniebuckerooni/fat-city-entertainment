// One-off: retitle the sitewide nav item pointing at bingocardgenerator.online
// from "Bingo Card Generator" to "Free Bingo Card Maker".
//
// Why: the item appears twice on every page (desktop + mobile nav), so 458 pages
// carry 916 links to that domain with identical exact-match commercial anchor
// text. That is the single most over-optimised signal pointing at a domain we
// are actively trying to rank — and Gen 2's own brand-entity-plan.md §WS-C says
// so outright: "Do NOT add sitewide footer/sidebar links to Gen 2
// (over-optimization risk). 2-4 well-placed editorial links total is the
// target." The editorial half of that was done; the sitewide half shipped anyway.
//
// The href does not change and nothing is hidden — only the visible label, which
// still describes the destination honestly and matches a real query cluster
// ("bingo card maker", 131 impressions). Anchored on the href +
// wsite-menu-title pair so page prose mentioning the phrase is untouched.
// Idempotent: after the swap the pattern no longer matches.
//   node _tools/vary-bcg-nav-anchor.js         # dry run
//   node _tools/vary-bcg-nav-anchor.js --write
const fs = require("fs"), path = require("path");
const REPO = path.resolve(__dirname, "..");
const WRITE = process.argv.includes("--write");
const SKIP = new Set(["_tools", "node_modules", ".git", "_content"]);

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
  /(<a href="https:\/\/bingocardgenerator\.online\/"[^>]*class="wsite-menu-subitem"[^>]*>\s*<span class="wsite-menu-title">\s*)Bingo Card Generator(\s*<\/span>)/g;

let files = 0, hits = 0;
for (const f of walk(REPO)) {
  const s = fs.readFileSync(f, "utf8");
  const n = (s.match(MENU_ITEM) || []).length;
  if (!n) continue;
  files++; hits += n;
  if (WRITE) fs.writeFileSync(f, s.replace(MENU_ITEM, "$1Free Bingo Card Maker$2"));
}
console.log(`${WRITE ? "updated" : "would update"}: ${files} pages, ${hits} nav anchors`);
if (!WRITE && files) console.log("(dry run — pass --write to apply)");
