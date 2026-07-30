// Relabel the "Features" nav dropdown to "Featured!" and tag it with the
// fce-featured class so site-extras.css can give it the gold-star treatment.
// Touches the parent item only (desktop + mobile), on every live page.
// Idempotent: the class-add and the relabel are both no-ops once applied.
//
//   node _tools/restyle-featured-nav.js            # dry run
//   node _tools/restyle-featured-nav.js --write
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const WRITE = process.argv.includes("--write");
const SKIP_DIRS = new Set(["_tools", ".git", "node_modules", "assets", "files", "uploads", "triv101", "pages", "4"]);

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

let changed = 0;
for (const file of walk(REPO, [])) {
  let html = fs.readFileSync(file, "utf8");
  if (!html.includes('id="pg-features"')) continue;
  const before = html;
  // 1) add the fce-featured class to the parent <li> (both nav copies)
  html = html.replace(/<li id="pg-features" class="wsite-menu-item-wrap">/g,
    '<li id="pg-features" class="wsite-menu-item-wrap fce-featured">');
  // 2) relabel the parent link text Features -> Featured! (nav item only)
  html = html.replace(/(<a href="\/features\.html" class="wsite-menu-item">\s*)Features(\s*<\/a>)/g,
    "$1Featured!$2");
  if (html !== before) { changed++; if (WRITE) fs.writeFileSync(file, html); }
}
console.log(`${WRITE ? "UPDATED" : "would update"}: ${changed} pages`);
if (!WRITE) console.log("DRY RUN — re-run with --write.");
