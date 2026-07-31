// Points outbound content links that reference the legacy internal generator
// (/bingocardgenerator.html) to the featured external tool at
// bingocardgenerator.online instead - matching how the main nav's "Bingo Card
// Generator" item already works. /bingocardgenerator.html and
// bingocardgenerator2.html themselves are left alone (still real, live,
// independently-ranking pages) - only OTHER pages' outbound mentions change.
//
//   node _tools/redirect-generator-mentions-to-online.js            # dry run
//   node _tools/redirect-generator-mentions-to-online.js --write
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const WRITE = process.argv.includes("--write");
const SKIP = new Set(["_tools", "node_modules", ".git", ".claude"]);

// Don't touch the generator pages' own cross-link / self-references.
const EXCLUDE_FILES = new Set([
  "bingocardgenerator.html",
  "bingocardgenerator2.html",
]);

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

let filesChanged = 0, linksChanged = 0;

for (const file of walk(REPO)) {
  const rel = path.relative(REPO, file).replace(/\\/g, "/");
  if (EXCLUDE_FILES.has(rel)) continue;

  let html = fs.readFileSync(file, "utf8");
  const before = html;

  // href="/bingocardgenerator.html" possibly followed by an existing class
  // attribute; add target/rel if not already present, swap the href itself.
  html = html.replace(/href="\/bingocardgenerator\.html"/g, () => {
    linksChanged++;
    return 'href="https://bingocardgenerator.online/" target="_blank" rel="noopener"';
  });

  if (html !== before) {
    filesChanged++;
    if (WRITE) fs.writeFileSync(file, html);
  }
}

console.log(`files changed : ${filesChanged}`);
console.log(`links updated : ${linksChanged}`);
if (!WRITE) console.log("\nDRY RUN — nothing written. Re-run with --write.");
