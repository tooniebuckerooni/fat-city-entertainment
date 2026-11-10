// Mark the sitewide nav link to bingocardgenerator.online rel="nofollow".
//
// WHY (10 Nov 2026): that nav item (Featured! dropdown, desktop + mobile copy)
// is on every page, so Google sees roughly a thousand identical links from this
// one domain to a young sister site. Search Console for the sister site shows a
// site-wide demotion dated inside the September 2026 spam update (every query
// fell to position 80-95 together, 15 clicks -> 1 over 28 days). A link profile
// that is almost entirely one repeated template link is the likeliest thing on
// this side for that update to have objected to. It cannot be proved from the
// export, so this is insurance: the nav item stays for visitors, and stops
// being offered to Google as a vote.
//
// Only the nav item changes. The editorial links in page copy
// (bingocardgenerator.html, the seasonal posts, features.html) stay followed on
// purpose - those are real recommendations and are the links worth counting.
//
// Anchored on the href + wsite-menu-subitem class pair, the same shape
// tag-bcg-nav-utm.js and vary-bcg-nav-anchor.js use, so prose links are never
// touched. Idempotent: an anchor that already says nofollow no longer matches.
// --remove restores the previous rel exactly.
//   node _tools/nofollow-bcg-nav.js                  # dry run
//   node _tools/nofollow-bcg-nav.js --write
//   node _tools/nofollow-bcg-nav.js --remove --write
const fs = require("fs"), path = require("path");
const REPO = path.resolve(__dirname, "..");
const WRITE = process.argv.includes("--write");
const REMOVE = process.argv.includes("--remove");
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

const NAV_LINK = /<a href="https:\/\/bingocardgenerator\.online\/[^"]*"[^>]*class="wsite-menu-subitem"[^>]*>/g;

// Returns the tag as it should read, or the same string if nothing to do.
function fix(tag) {
  const rel = tag.match(/ rel="([^"]*)"/);
  const has = rel && /\bnofollow\b/.test(rel[1]);
  if (REMOVE) {
    if (!has) return tag;
    const rest = rel[1].split(/\s+/).filter((t) => t && t !== "nofollow").join(" ");
    return tag.replace(rel[0], rest ? ` rel="${rest}"` : "");
  }
  if (has) return tag;
  if (rel) return tag.replace(rel[0], ` rel="nofollow ${rel[1]}"`);
  return tag.replace(/>$/, ' rel="nofollow">');
}

let files = 0, hits = 0;
for (const f of walk(REPO)) {
  const s = fs.readFileSync(f, "utf8");
  let n = 0;
  const out = s.replace(NAV_LINK, (tag) => {
    const t = fix(tag);
    if (t !== tag) n++;
    return t;
  });
  if (!n) continue;
  files++; hits += n;
  if (WRITE) fs.writeFileSync(f, out);
}
console.log(`${WRITE ? "updated" : "would update"}: ${files} pages, ${hits} nav anchors`);
if (!WRITE && files) console.log("(dry run - pass --write to apply)");
