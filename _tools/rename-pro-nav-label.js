// One-off: retitle the sitewide nav item "Generator Pro — Lifetime Access" to
// "Generator Pro (Lifetime Access)".
//
// Why: CLAUDE.md's writing-style rule bans em-dashes in anything a visitor
// reads. This one label was 964 of the ~2,500 em-dashes on the live site by
// itself — it renders twice per page (desktop + mobile nav) across 482 pages,
// so it is far and away the single biggest source. Parentheses are the
// natural replacement for a parenthetical qualifier in a menu item.
//
// The href does not change and nothing is hidden. Anchored on the href +
// wsite-menu-title pair so page prose mentioning the phrase is untouched.
// Idempotent: after the swap the pattern no longer matches.
// (add-bingocardmaker-nav.js can't do renames — its marker guard makes
// re-runs a no-op, same reason rename-generator2-nav.js exists.)
//
//   node _tools/rename-pro-nav-label.js         # dry run
//   node _tools/rename-pro-nav-label.js --write
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

const LABEL = "Generator Pro (Lifetime Access)";
// Matches whichever form is in place, so the tool lands on LABEL from any
// prior state: the em-dash original, or the &mdash; entity form.
const MENU_ITEM = new RegExp(
  `(<a href="/store/p65/bingocardgeneratorpro\\.html"[^>]*>\\s*<span class="wsite-menu-title">\\s*)` +
  `Generator Pro (?:—|&mdash;) Lifetime Access(\\s*</span>)`,
  "g");

let files = 0, hits = 0;
for (const f of walk(REPO)) {
  const s = fs.readFileSync(f, "utf8");
  const n = (s.match(MENU_ITEM) || []).length;
  if (!n) continue;
  files++; hits += n;
  if (WRITE) fs.writeFileSync(f, s.replace(MENU_ITEM, `$1${LABEL}$2`));
}
console.log((WRITE ? "WROTE" : "DRY RUN") + `: ${files} files, ${hits} menu-text swaps`);
