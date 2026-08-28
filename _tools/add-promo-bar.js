// Drop the sitewide promo popup's script tag onto every real page. The file
// is still named for the original persistent banner it replaced — the popup
// it now injects (assets/js/promo-bar.js) shows once per browser on entry
// instead. Idempotent — safe to re-run any time; only writes where something
// changes.
//
//   node _tools/add-promo-bar.js            # dry run
//   node _tools/add-promo-bar.js --write
//
// Per CLAUDE.md: never hand-edit markup across pages, use a script — this is
// the same idiom as add-green-room.js, just wider (every real page instead of
// two named surfaces).
//
// "Real page" = links assets/css/site-extras.css. That one signal already
// separates the ~398 actual site pages from everything this must NOT touch:
// the 180 legacy /4/, /whatsnew/, /inspiration/ meta-refresh redirect stubs
// (flash-then-redirect, not worth a promo popup), admin/green-room.html
// (noindex moderation panel), and the standalone apps (triv101/,
// trivia-show-maker/, pages/*.html) that don't carry the marketing chrome
// at all.
//
// The popup itself lives in assets/js/promo-bar.js (copy, code, dates, the
// once-per-browser gate) and assets/css/site-extras.css (.fce-promo-modal*).
// Edit those to change the promo; this script only places/removes the
// <script> tag.

const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const WRITE = process.argv.includes("--write");
const REMOVE = process.argv.includes("--remove");

const TAG = '<script defer src="/assets/js/promo-bar.js"></script>';
const SKIP = new Set(["_tools", "_content", "node_modules", ".git", ".claude"]);

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

let touched = 0;
let skipped = 0;
for (const file of walk(REPO)) {
  const html = fs.readFileSync(file, "utf8");
  if (!html.includes("assets/css/site-extras.css")) continue; // not a "real" page
  if (!html.includes("</body>")) {
    skipped++;
    continue;
  }

  const has = html.includes(TAG);
  let next = html;

  if (REMOVE) {
    if (!has) continue;
    next = html.replace(TAG + "\n", "").replace(TAG, "");
  } else {
    if (has) continue;
    next = html.replace("</body>", `${TAG}\n</body>`);
  }

  touched++;
  console.log(`${REMOVE ? "remove" : "add"}: ${path.relative(REPO, file)}`);
  if (WRITE) fs.writeFileSync(file, next);
}

console.log(
  `\n${WRITE ? "wrote" : "would touch"} ${touched} file(s)` +
    (skipped ? `; skipped ${skipped} (site-extras.css but no </body>)` : "")
);
if (!WRITE) console.log("(dry run — pass --write to apply)");
