// The sitewide nav item pointing at bingocardgenerator.online (Featured!
// dropdown, desktop + mobile, every page) is the one outbound link to that
// domain with no UTM tag. The site's own _content/drafts/utm-tagging-standard.md
// already says a cross-property link to BCG.O should carry
// utm_source=fatcityentertainment&utm_medium=referral&utm_campaign=onsite-upsell
// - the three body-copy links on bingocardgenerator.html, bingocardgenerator2.html
// and printmusicbingocards.html already do. Nav was the gap: it's also the
// highest-volume single exit link in the exit-link report (StatCounter, 11
// Sept 2026 pull), and being untagged it was invisible - no way to tell how
// much of the BCG.O traffic is nav curiosity vs. a genuine on-page upsell.
//
// utm_content=nav (not a page slug, since the one anchor is identical on
// every page).
//
// Anchored on the href + wsite-menu-subitem class pair, same shape as
// vary-bcg-nav-anchor.js which already edits this exact link (for the label,
// not the href) - so page prose mentioning the domain is untouched, and the
// two known #load-bearing prose links keep their own existing tags rather
// than getting double-tagged.
// Idempotent: once the href carries a query string it no longer matches.
//   node _tools/tag-bcg-nav-utm.js         # dry run
//   node _tools/tag-bcg-nav-utm.js --write
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

const UTM = "utm_source=fatcityentertainment&amp;utm_medium=referral&amp;utm_campaign=onsite-upsell&amp;utm_content=nav";
const NAV_LINK_RE = /<a href="https:\/\/bingocardgenerator\.online\/"([^>]*class="wsite-menu-subitem"[^>]*>)/g;

let files = 0, hits = 0;
for (const f of walk(REPO)) {
  const s = fs.readFileSync(f, "utf8");
  const n = (s.match(NAV_LINK_RE) || []).length;
  if (!n) continue;
  files++; hits += n;
  if (WRITE) {
    fs.writeFileSync(f, s.replace(NAV_LINK_RE, `<a href="https://bingocardgenerator.online/?${UTM}"$1`));
  }
}
console.log(`${WRITE ? "updated" : "would update"}: ${files} pages, ${hits} nav anchors`);
if (!WRITE && files) console.log("(dry run - pass --write to apply)");
