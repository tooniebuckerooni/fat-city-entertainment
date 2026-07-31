// Adds <meta name="robots" content="noindex,follow"> to the auto-generated
// /triviahostresources/category/* and /triviahostresources/archives/* listing
// pages. These are excerpt/link shells with no unique content of their own —
// the real posts they link to are untouched and stay fully indexed. `follow`
// keeps Google crawling through them to those posts.
//
//   node _tools/noindex-blog-taxonomy.js            # dry run
//   node _tools/noindex-blog-taxonomy.js --write
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const WRITE = process.argv.includes("--write");
const ROOTS = [
  path.join(REPO, "triviahostresources", "category"),
  path.join(REPO, "triviahostresources", "archives"),
];

const TAG = '<meta name="robots" content="noindex,follow">';

function findIndexFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...findIndexFiles(full));
    } else if (entry.isFile() && entry.name === "index.html") {
      out.push(full);
    }
  }
  return out;
}

let added = 0;
let alreadyPresent = 0;
let noTitle = 0;

for (const root of ROOTS) {
  if (!fs.existsSync(root)) continue;
  for (const file of findIndexFiles(root)) {
    const html = fs.readFileSync(file, "utf8");

    if (/name="robots"/i.test(html)) {
      alreadyPresent++;
      continue;
    }
    if (!/<\/title>/i.test(html)) {
      noTitle++;
      console.log(`  no <title> found, skipped: ${path.relative(REPO, file)}`);
      continue;
    }

    const updated = html.replace(/(<\/title>)/i, `$1${TAG}`);
    added++;
    if (WRITE) fs.writeFileSync(file, updated);
  }
}

console.log(`noindex,follow added   : ${added}`);
console.log(`already had robots meta: ${alreadyPresent}`);
console.log(`skipped (no <title>)   : ${noTitle}`);
if (!WRITE) console.log("\nDRY RUN — nothing written. Re-run with --write.");
