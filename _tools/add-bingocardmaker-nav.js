// Give the top-level "Bingo Card Maker" nav item a dropdown — the page it
// links to (/printmusicbingocards.html) is actually a hub presenting 4
// distinct tools, currently hidden behind a flat link. Matches the "Our
// Games" / "Trivia Store" submenu pattern. Touches every live page (desktop
// AND mobile nav).
//
// Matched by the /printmusicbingocards.html link, not the <li> id — Weebly
// rewrites the id to "active" on that page itself, so the id varies per page.
//
//   node _tools/add-bingocardmaker-nav.js            # dry run
//   node _tools/add-bingocardmaker-nav.js --write
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const WRITE = process.argv.includes("--write");
const SKIP_DIRS = new Set(["_tools", ".git", "node_modules", "assets", "files", "uploads", "triv101", "pages", "4"]);

const ANCHOR_RE = /([ \t]*)<li id="([^"]*)" class="wsite-menu-item-wrap">\s*\n[ \t]*<a href="\/printmusicbingocards\.html" class="wsite-menu-item">\s*\n[ \t]*Bingo Card Maker\s*\n[ \t]*<\/a>\s*\n[ \t]*\n[ \t]*<\/li>/g;

const MARKER = 'id="wsite-nav-bcm-free"';

const ITEMS = [
  ["wsite-nav-bcm-free", "/bingocardgenerator.html", "Free Generator"],
  ["wsite-nav-bcm-pro", "/store/p65/bingocardgeneratorpro.html", "Generator Pro — Lifetime Access"],
  ["wsite-nav-bcm-gen2", "/bingocardgenerator2.html", "Generator 2"],
  ["wsite-nav-bcm-rules", "/music-bingo-rules.html", "Music Bingo Rules"],
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
    `\n${t}<a href="/printmusicbingocards.html" class="wsite-menu-item">` +
    `\n${t}\tBingo Card Maker` +
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
