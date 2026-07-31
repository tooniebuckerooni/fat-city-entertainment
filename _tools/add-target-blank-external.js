// Adds target="_blank" rel="noopener" to any <a> linking off-domain
// (not fatcityentertainment.com / www.fatcityentertainment.com) that doesn't
// already have a target attribute. Covers Spotify/Apple Music playlist
// links, Twitter share buttons, giphy embeds, third-party tool links, etc.
//
//   node _tools/add-target-blank-external.js            # dry run
//   node _tools/add-target-blank-external.js --write
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const WRITE = process.argv.includes("--write");
const SKIP = new Set(["_tools", "node_modules", ".git", ".claude"]);

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

// Matches an <a ...> opening tag whose href is off-domain, capturing
// everything between "<a" and the closing ">" so we can check for an
// existing target= attribute before touching it.
const A_TAG = /<a\s+([^>]*?href=["'](https?:)?\/\/(?!(?:www\.)?fatcityentertainment\.com)[^"']+["'][^>]*)>/gi;

let filesChanged = 0, linksChanged = 0;

for (const file of walk(REPO)) {
  const html = fs.readFileSync(file, "utf8");
  let changed = 0;

  const updated = html.replace(A_TAG, (whole, attrs) => {
    if (/\btarget\s*=/i.test(attrs)) return whole; // already has one
    changed++;
    return `<a ${attrs} target="_blank" rel="noopener">`;
  });

  if (changed > 0) {
    filesChanged++;
    linksChanged += changed;
    if (WRITE) fs.writeFileSync(file, updated);
  }
}

console.log(`files changed : ${filesChanged}`);
console.log(`links updated : ${linksChanged}`);
if (!WRITE) console.log("\nDRY RUN — nothing written. Re-run with --write.");
