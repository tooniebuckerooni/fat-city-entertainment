// Revert the "Blog" nav item from a dropdown (holding one stale 2024 post)
// back to a flat link, across every live page (desktop AND mobile). The
// single dropdown entry wasn't a deliberate "top post" pick — nothing in the
// repo marked it as one — so the owner chose to drop it rather than replace
// it with current posts.
//
// Matched by the /triviahostresources.html link, not the <li> id (Weebly
// rewrites the id to "active" on triviahostresources.html itself).
//
//   node _tools/drop-blog-nav-dropdown.js            # dry run
//   node _tools/drop-blog-nav-dropdown.js --write
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const WRITE = process.argv.includes("--write");
const SKIP_DIRS = new Set(["_tools", ".git", "node_modules", "assets", "files", "uploads", "triv101", "pages", "4"]);

const DROPDOWN_RE = /([ \t]*)<li id="([^"]*)" class="wsite-menu-item-wrap">(\s*\n[ \t]*<a href="\/triviahostresources\.html" class="wsite-menu-item">\s*\n[ \t]*Blog\s*\n[ \t]*<\/a>)\s*\n[ \t]*<div class="wsite-menu-wrap"[\s\S]*?<\/div>\s*\n[ \t]*<\/li>/g;

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
let changed = 0, noMatch = 0;

for (const file of files) {
  const html = fs.readFileSync(file, "utf8");
  DROPDOWN_RE.lastIndex = 0;
  if (!DROPDOWN_RE.test(html)) { noMatch++; continue; }
  DROPDOWN_RE.lastIndex = 0;
  const next = html.replace(DROPDOWN_RE, (_, indent, id, anchor) => `${indent}<li id="${id}" class="wsite-menu-item-wrap">${anchor}\n${indent}\t\n${indent}</li>`);

  if (next !== html) {
    changed++;
    if (WRITE) fs.writeFileSync(file, next);
  }
}

console.log(`scanned:     ${files.length} html files`);
console.log(`no match:    ${noMatch}`);
console.log(`${WRITE ? "UPDATED" : "would update"}: ${changed}`);
if (!WRITE) console.log("\nDRY RUN — nothing written. Re-run with --write.");
