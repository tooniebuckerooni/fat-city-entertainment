// Seasonal "Halloween" item at the top of the Trivia Store nav dropdown.
//
//   node _tools/add-halloween-nav.js                # dry run
//   node _tools/add-halloween-nav.js --write
//   node _tools/add-halloween-nav.js --remove       # dry run of the takedown
//   node _tools/add-halloween-nav.js --remove --write
//
// REMOVE IT AFTER 1 NOV. That is the whole reason this has a --remove flag
// rather than being a one-way edit: a "Halloween" item still in the nav in
// December is worse than never having had one.
//
// WHY
// ---
// /halloween-trivia-and-music-bingo.html shipped 10 Sept as the indexable
// Halloween hub and, as of 11 Sept, exactly ONE page linked to it. It was in
// the sitemap and orphaned everywhere else, which is the same failure the two
// blog pillar pages had: a sitemap entry gets a page crawled, a nav link gets
// it treated as part of the site. Seven weeks before Halloween is not the
// moment to leave the Halloween hub unreachable.
//
// It goes FIRST in the dropdown, above Music Bingo Card Downloads, because it
// is the seasonal item and a dropdown's first entry is the one that gets read.
// Everything else keeps its order, so the takedown restores the menu exactly.
//
// Same discipline as the other nav tools: anchored on the subitem's LINK, never
// on a <li> id, because Weebly rewrites the id to "active" on the current page.
// Idempotent in both directions.
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const WRITE = process.argv.includes("--write");
const REMOVE = process.argv.includes("--remove");
const SKIP_DIRS = new Set(["_tools", ".git", "node_modules", "assets", "files", "uploads", "triv101", "pages", "4"]);

const ID = "wsite-nav-store-halloween";
const MARKER = `id="${ID}"`;
const HREF = "/halloween-trivia-and-music-bingo.html";
const LABEL = "Halloween";

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
if (!WRITE) console.log(`\n(dry run -- pass --write to apply${REMOVE ? "" : "; --remove takes it down after 1 Nov"})`);
