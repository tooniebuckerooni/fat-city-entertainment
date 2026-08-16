// Give the top-level "Trivia Store" nav item a dropdown listing the store's
// promoted categories, matching the existing "Our Games" submenu pattern
// (plain wsite-menu-item-wrap, no special class — unlike the gold-star
// "Featured!" treatment). Touches every live page (desktop AND mobile nav).
//
// Subitems mirror the 5 tiles now on trivia-store.html itself: Music Bingo
// Card Downloads, Eras, Pre-made Trivia Shows, Bundles, Virtual Events.
// Holidays stays out, same as it's not tiled on the store front either.
//
// Matched by the /trivia-store.html link, not the <li> id — Weebly rewrites
// the id to "active" on trivia-store.html itself, so the id varies per page.
//
//   node _tools/add-trivia-store-nav.js            # dry run
//   node _tools/add-trivia-store-nav.js --write
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const WRITE = process.argv.includes("--write");
const SKIP_DIRS = new Set(["_tools", ".git", "node_modules", "assets", "files", "uploads", "triv101", "pages", "4"]);

const ANCHOR_RE = /([ \t]*)<li id="([^"]*)" class="wsite-menu-item-wrap">\s*\n[ \t]*<a href="\/trivia-store\.html" class="wsite-menu-item">\s*\n[ \t]*Trivia Store\s*\n[ \t]*<\/a>\s*\n[ \t]*\n[ \t]*<\/li>/g;

const MARKER = 'id="wsite-nav-store-musicdoboff"';

const ITEMS = [
  ["wsite-nav-store-musicdoboff", "/store/c11/musicdoboff/", "Music Bingo Card Downloads"],
  ["wsite-nav-store-eras", "/store/c33/Eras.html", "Eras"],
  ["wsite-nav-store-premade-trivia", "/store/c6/triviagameshows/", "Pre-made Trivia Shows"],
  ["wsite-nav-store-bundles", "/store/c34/Music_Bingo_%26_Trivia_Bundles.html", "Music Bingo & Trivia Bundles"],
  ["wsite-nav-store-virtualevents", "/store/c41/virtualevents/", "Virtual Events"],
];

function dropdown(indent, id) {
  const i = indent, t = indent + "\t";
  const sub = (subId, href, label) =>
    `\n${t}<li id="${subId}" class="wsite-menu-subitem-wrap ">` +
    `\n${t}<a href="${href}" class="wsite-menu-subitem">` +
    `\n${t}\t<span class="wsite-menu-title">` +
    `\n${t}\t\t${label}` +
    `\n${t}\t</span>` +
    `\n${t}</a>` +
    `\n${t}</li>`;
  return (
    `${i}<li id="${id}" class="wsite-menu-item-wrap">` +
    `\n${t}<a href="/trivia-store.html" class="wsite-menu-item">` +
    `\n${t}\tTrivia Store` +
    `\n${t}</a>` +
    `\n${t}<div class="wsite-menu-wrap" style="display:none">` +
    `\n${t}<ul class="wsite-menu">` +
    ITEMS.map(([subId, href, label]) => sub(subId, href, label)).join("") +
    `\n${t}</ul>` +
    `\n${t}</div>` +
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
let changed = 0, skippedHave = 0, noAnchor = 0;

for (const file of files) {
  const html = fs.readFileSync(file, "utf8");
  if (html.includes(MARKER)) { skippedHave++; continue; }

  ANCHOR_RE.lastIndex = 0;
  if (!ANCHOR_RE.test(html)) { noAnchor++; continue; }
  ANCHOR_RE.lastIndex = 0;
  const next = html.replace(ANCHOR_RE, (_, indent, id) => dropdown(indent, id));

  if (next !== html) {
    changed++;
    if (WRITE) fs.writeFileSync(file, next);
  }
}

console.log(`scanned:        ${files.length} html files`);
console.log(`no nav anchor:  ${noAnchor} (skipped — not a modern-nav page)`);
console.log(`already have:   ${skippedHave} (idempotent skip)`);
console.log(`${WRITE ? "UPDATED" : "would update"}: ${changed}`);
if (!WRITE) console.log("\nDRY RUN — nothing written. Re-run with --write.");
