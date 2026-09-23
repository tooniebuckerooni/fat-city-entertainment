// Add "Trivia Nights by City" to the Trivia Store nav dropdown, on every live
// page (desktop AND mobile copy), directly under "Free Song Lists".
//
//   node _tools/add-city-nav.js                   # dry run
//   node _tools/add-city-nav.js --write
//   node _tools/add-city-nav.js --remove --write  # take it down, byte for byte
//
// Cloned from add-song-lists-nav.js (23 Sept 2026). The two free resources sit
// together: the song lists, then the city rounds. It links the /trivia-nights/
// hub, never a single city, so the menu does not grow as cities go live.
// Anchored on the Free Song Lists item's own id, which Weebly never rewrites.
//
// Original notes from add-song-lists-nav.js follow.
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
const REMOVE = process.argv.includes("--remove");
const SKIP_DIRS = new Set(["_tools", ".git", "node_modules", "assets", "files", "uploads", "triv101", "pages", "4"]);

const MARKER = 'id="wsite-nav-store-cities"';
const HREF = "/trivia-nights/";
const LABEL = "Trivia Nights by City";

// The item to insert after: Music Bingo Card Downloads. Captures its leading
// indent so the new <li> lines up whether it's the desktop copy (tabs) or the
// mobile one (four spaces then tabs).
const ANCHOR_RE =
  /([ \t]*)<li id="wsite-nav-store-songlists" class="wsite-menu-subitem-wrap ">[\s\S]*?<\/li>/g;

function subitem(indent) {
  const i = indent;
  return (
    `\n${i}<li id="wsite-nav-store-cities" class="wsite-menu-subitem-wrap ">` +
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
  if (REMOVE) {
    // Exactly what subitem() inserted, whatever its indent.
    const next = html.replace(/\n[ \t]*<li id="wsite-nav-store-cities" class="wsite-menu-subitem-wrap ">[\s\S]*?<\/li>/g, () => { inserted++; return ""; });
    if (next !== html) { changed++; if (WRITE) fs.writeFileSync(file, next); }
    continue;
  }
  // A page can carry the item in one menu copy and not the other (a hand edit,
  // a partial clone). Count both, so a half-present item is repaired and
  // reported rather than skipped as done.
  ANCHOR_RE.lastIndex = 0;
  const anchors = (html.match(ANCHOR_RE) || []).length;
  const have = html.split(MARKER).length - 1;
  if (anchors && have >= anchors) { skippedHave++; continue; }
  if (have) {
    const next = html.replace(ANCHOR_RE, (m, indent, off, str) => {
      const after = str.slice(off + m.length, off + m.length + 200);
      if (after.includes(MARKER)) return m;
      inserted++; return m + subitem(indent);
    });
    if (next !== html) { changed++; if (WRITE) fs.writeFileSync(file, next); }
    continue;
  }

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
