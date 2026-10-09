// Seasonal "Christmas" item in the Trivia Store nav dropdown, pointing at the
// indexable hub /christmas-trivia-and-music-bingo.html.
//
//   node _tools/add-christmas-nav.js                # dry run
//   node _tools/add-christmas-nav.js --write
//   node _tools/add-christmas-nav.js --remove       # dry run of the takedown
//   node _tools/add-christmas-nav.js --remove --write
//
// REMOVE IT AFTER 26 DEC. A copy of add-halloween-nav.js with the label, href
// and id changed, as the seasonal-push skill says to do; the anchoring logic is
// the fiddly part and is untouched.
//
// WHY NOW (9 Oct 2026). The hub and its nav link ship in the SAME change, the
// lesson Halloween taught: its hub went up alone and sat linked from one page.
// Christmas is the one season that has to start early. Corporate parties book
// from late October and a new page needs six to eight weeks to rank, so a hub
// that goes up after Halloween is a hub that ranks after Christmas.
//
// It inserts immediately BEFORE Music Bingo Card Downloads, the same anchor as
// the Halloween item. Run after that tool and the dropdown reads Halloween,
// Christmas, Music Bingo Card Downloads; when Halloween comes off on 1 Nov,
// Christmas becomes the first item with no further edit. The takedown was
// proved to restore every page byte for byte before the item went on.
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const WRITE = process.argv.includes("--write");
const REMOVE = process.argv.includes("--remove");
const SKIP_DIRS = new Set(["_tools", ".git", "node_modules", "assets", "files", "uploads", "triv101", "pages", "4"]);

const ID = "wsite-nav-store-christmas";
const MARKER = `id="${ID}"`;
const HREF = "/christmas-trivia-and-music-bingo.html";
const LABEL = "Christmas";

// Insert BEFORE the Music Bingo Card Downloads item, capturing its indent so
// the new <li> lines up in the desktop copy (tabs) and the mobile one alike.
const ANCHOR_RE =
  /([ \t]*)<li id="[^"]*" class="wsite-menu-subitem-wrap ">\s*\n[ \t]*<a href="\/store\/c11\/musicdoboff\/" class="wsite-menu-subitem">[\s\S]*?<\/li>/g;

// The takedown: the whole <li> plus the newline and indent that preceded it, so
// removing it leaves no blank line behind.
const REMOVE_RE =
  new RegExp(`\\n[ \\t]*<li id="${ID}" class="wsite-menu-subitem-wrap ">[\\s\\S]*?<\\/li>`, "g");

function subitem(indent) {
  const i = indent;
  return (
    `${i}<li id="${ID}" class="wsite-menu-subitem-wrap ">` +
    `\n${i}<a href="${HREF}" class="wsite-menu-subitem">` +
    `\n${i}\t<span class="wsite-menu-title">` +
    `\n${i}\t\t${LABEL}` +
    `\n${i}\t</span>` +
    `\n${i}</a>` +
    `\n${i}</li>\n`
  );
}

function walk(dir, out) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const rel = path.relative(REPO, full);
    if (rel.split(path.sep).some((seg, idx) => idx === 0 && SKIP_DIRS.has(seg))) continue;
    const st = fs.statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (name.endsWith(".html")) out.push(full);
  }
  return out;
}

const files = walk(REPO, []);
let changed = 0, skipped = 0, noAnchor = 0, touched = 0;

for (const file of files) {
  const html = fs.readFileSync(file, "utf8");
  let next = html, hits = 0;

  if (REMOVE) {
    if (!html.includes(MARKER)) { skipped++; continue; }
    next = html.replace(REMOVE_RE, () => { hits++; return ""; });
  } else {
    if (html.includes(MARKER)) { skipped++; continue; }
    ANCHOR_RE.lastIndex = 0;
    if (!ANCHOR_RE.test(html)) { noAnchor++; continue; }
    ANCHOR_RE.lastIndex = 0;
    // A function replacer, always: a plain replacement string reads "$1" as a
    // backreference, and this site is full of prices like $10.99 (HANDOFF.md).
    next = html.replace(ANCHOR_RE, (m, indent) => { hits++; return subitem(indent) + m; });
  }

  if (next !== html) {
    changed++;
    touched += hits;
    if (WRITE) fs.writeFileSync(file, next);
  }
}

console.log(`scanned:        ${files.length} html files`);
if (!REMOVE) console.log(`no nav anchor:  ${noAnchor} (skipped, no Trivia Store dropdown)`);
console.log(`${REMOVE ? "nothing to remove" : "already have"}:   ${skipped} (idempotent skip)`);
console.log(`${WRITE ? "updated" : "would update"}: ${changed} page(s), ${touched} nav copies`);
if (!WRITE) console.log(`\n(dry run -- pass --write to apply${REMOVE ? "" : "; --remove takes it down after 26 Dec"})`);
