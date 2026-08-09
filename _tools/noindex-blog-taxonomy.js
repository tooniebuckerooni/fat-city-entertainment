// Adds <meta name="robots" content="noindex,follow"> to the auto-generated
// category / archive / pagination listing pages across every blog tree on the
// site. These are excerpt/link shells with no unique content of their own —
// the real posts they link to are untouched and stay fully indexed. `follow`
// keeps Google crawling through them to those posts.
//
//   node _tools/noindex-blog-taxonomy.js            # dry run
//   node _tools/noindex-blog-taxonomy.js --write
//
// SCOPE NOTE (Aug 2026 Search Console audit)
// ------------------------------------------
// The original pass covered only the two /triviahostresources/ roots, which
// left 104 listing shells indexable — most of the "Crawled - currently not
// indexed" report was those pages. The roots below close that gap: the
// /previous/N pagination chain, and the legacy Weebly blog trees (/whatsnew,
// /inspiration, /blog, /4) that still carry their own category and archive
// listings.
//
// What is deliberately NOT in this list: the legacy *post* duplicates
// (/4/post/*, /whatsnew/<slug>, /inspiration/<slug>, /blog/<slug>). Those
// already carry a rel=canonical pointing at the live post under
// /triviahostresources/. Adding noindex on top of a canonical sends Google two
// contradictory instructions — the usual outcome is that it honours the
// noindex, drops the page, and the canonical never gets a chance to pass
// consolidated signals to the real post. Canonical alone is the correct
// treatment for a duplicate; noindex is for a shell that is nobody's duplicate.
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const WRITE = process.argv.includes("--write");
const ROOTS = [
  path.join(REPO, "triviahostresources", "category"),
  path.join(REPO, "triviahostresources", "archives"),
  path.join(REPO, "triviahostresources", "previous"),
  path.join(REPO, "whatsnew", "category"),
  path.join(REPO, "whatsnew", "archives"),
  path.join(REPO, "inspiration", "category"),
  path.join(REPO, "inspiration", "archives"),
  path.join(REPO, "blog", "category"),
  path.join(REPO, "blog", "archives"),
  path.join(REPO, "4", "category"),
  path.join(REPO, "4", "archives"),
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
