// Add "Free Song Lists" to the Trivia Store nav dropdown, on every live page
// (desktop AND mobile copy).
//
//   node _tools/add-song-lists-nav.js            # dry run
//   node _tools/add-song-lists-nav.js --write
//
// WHY
// ---
// /music-bingo-song-lists/ is fifty pages of exactly the content the Search
// Console data says people search for, and a hub nobody can find is the failure
// mode this whole exercise exists to fix: the Anagrams answer-sheet PDF ranked
// at position 1 for 91 clicks a quarter while being linked from nothing but
// 404.html. A sitemap entry gets a page crawled; a nav link gets it treated as
// part of the site.
//
// It sits directly under "Music Bingo Card Downloads" because that is its
// natural pair — read the list free, buy the cards — and because a dropdown's
// second item is still read, where its sixth often isn't.
//
// This is an INSERT into a dropdown that already exists, so it can't reuse
// add-trivia-store-nav.js, which only knows how to create the dropdown whole and
// skips any page that already has one. Same matching discipline though: anchored
// on the subitem's link, never on a <li> id that Weebly rewrites to "active" on
// the current page. Idempotent — pages already carrying the item are skipped.
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const WRITE = process.argv.includes("--write");
const SKIP_DIRS = new Set(["_tools", ".git", "node_modules", "assets", "files", "uploads", "triv101", "pages", "4"]);

const MARKER = 'id="wsite-nav-store-songlists"';
const HREF = "/music-bingo-song-lists/";
const LABEL = "Free Song Lists";

// The item to insert after: Music Bingo Card Downloads. Captures its leading
// indent so the new <li> lines up whether it's the desktop copy (tabs) or the
// mobile one (four spaces then tabs).
const ANCHOR_RE =
  /([ \t]*)<li id="[^"]*" class="wsite-menu-subitem-wrap ">\s*\n[ \t]*<a href="\/store\/c11\/musicdoboff\/" class="wsite-menu-subitem">[\s\S]*?<\/li>/g;

function subitem(indent) {
  const i = indent;
  return (
    `\n${i}<li id="wsite-nav-store-songlists" class="wsite-menu-subitem-wrap ">` +
    `\n${i}<a href="${HREF}" class="wsite-menu-subitem">` +
    `\n${i}\t<span class="wsite-menu-title">` +
    `\n${i}\t\t${LABEL}` +
    `\n${i}\t</span>` +
    `\n${i}</a>` +
    `\n${i}</li>`
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
let changed = 0, skippedHave = 0, noAnchor = 0, inserted = 0;

for (const file of files) {
  const html = fs.readFileSync(file, "utf8");
  if (html.includes(MARKER)) { skippedHave++; continue; }

  ANCHOR_RE.lastIndex = 0;
  if (!ANCHOR_RE.test(html)) { noAnchor++; continue; }
  ANCHOR_RE.lastIndex = 0;

  let hits = 0;
  // A function replacer, always: a plain replacement string reads "$1" as a
  // backreference, and this site is full of prices like $10.99 (HANDOFF.md).
  const next = html.replace(ANCHOR_RE, (m, indent) => { hits++; return m + subitem(indent); });

  if (next !== html) {
    changed++;
    inserted += hits;
    if (WRITE) fs.writeFileSync(file, next);
  }
}

console.log(`scanned:        ${files.length} html files`);
console.log(`no nav anchor:  ${noAnchor} (skipped — no Trivia Store dropdown)`);
console.log(`already have:   ${skippedHave} (idempotent skip)`);
console.log(`${WRITE ? "updated" : "would update"}: ${changed} page(s), ${inserted} nav copies`);
if (!WRITE) console.log("\n(dry run -- pass --write to apply)");
