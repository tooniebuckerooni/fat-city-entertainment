// Add the game-tools trio — Triv 101, Trivia Generator, Bingo Card Generator —
// to the top-level nav on every live page, right after "Trivia Store". Each
// page is a standalone Weebly export carrying its own copy of the nav (desktop
// AND mobile), so the item is inserted after BOTH occurrences of the Trivia
// Store <li>. Idempotent: a page that already has the Triv 101 item is skipped.
//
//   node _tools/add-app-nav.js            # dry run — lists what would change
//   node _tools/add-app-nav.js --write
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const WRITE = process.argv.includes("--write");

// Skip build tooling, scraped source copies, deps, and the game app itself.
const SKIP_DIRS = new Set(["_tools", ".git", "node_modules", "assets", "files", "uploads", "triv101", "pages", "4"]);

// The anchor we insert after: the "Trivia Store" top-level item. Match it by
// its link, not its id — Weebly rewrites the <li> id to "active" on whatever
// page is current (so store pages carry id="active" here). It has no submenu,
// so it always ends at the first </li>.
const ANCHOR_RE = /([ \t]*)<li id="[^"]*" class="wsite-menu-item-wrap">\s*<a href="\/trivia-store\.html" class="wsite-menu-item">[\s\S]*?<\/li>/g;

// Marker used for idempotency + so a re-run can find already-added items.
const MARKER = 'href="/triv101/" class="wsite-menu-item"';

function itemsFor(indent) {
  const i = indent;                 // indentation of the <li>
  const t = indent + "\t";          // one level deeper for inner lines
  const item = (id, href, label, extra) =>
    `\n${i}<li id="${id}" class="wsite-menu-item-wrap">` +
    `\n${t}<a href="${href}" class="wsite-menu-item"${extra || ""}>` +
    `\n${t}\t${label}` +
    `\n${t}</a>` +
    `\n${t}` +
    `\n${i}</li>`;
  return (
    item("pg-triv101-app", "/triv101/", "Triv 101", "") +
    item("pg-trivia-generator", "/trivia-generator.html", "Trivia Generator", "") +
    item("pg-bingo-generator", "https://bingocardgenerator.online/", "Bingo Card Generator", ' target="_blank" rel="noopener"')
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
  let html = fs.readFileSync(file, "utf8");
  if (!ANCHOR_RE.test(html)) { ANCHOR_RE.lastIndex = 0; noAnchor++; continue; }
  ANCHOR_RE.lastIndex = 0;
  if (html.includes(MARKER)) { skippedHave++; continue; }

  const next = html.replace(ANCHOR_RE, (m, indent) => m + itemsFor(indent));
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
