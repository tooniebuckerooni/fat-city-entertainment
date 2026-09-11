// One stray </div> on every page new-product.js has ever generated.
//
//   node _tools/fix-product-divs.js            # dry run
//   node _tools/fix-product-divs.js --write
//
// WHAT WENT WRONG
// ---------------
// new-product.js injects the spec's `body` into the short description with
//
//   /(<div id="wsite-com-product-short-description"[^>]*>)[\s\S]*?(<\/div>\s*<\/div>)/
//
// and puts group 2 back. In the template that pair is the closer of the inner
// <div class="paragraph"> AND the closer of the short-description div. Every
// spec body is itself wrapped in a <div>, so the rebuilt block carries the
// body's own closer plus BOTH of the template's: one too many.
//
// The result is a document with 25 unbalanced pages: #wsite-com-product-info-
// inner closes right after the description, so the buy button, the fact notes
// and the cross-sell block are siblings of it rather than children, every
// wrapper after that closes one level early, and the trailing </div> the
// browser drops is the one that was meant to close the page. It is invisible
// until something depends on the nesting, and then it is very hard to see.
//
// Nothing caught it: check-links.js reads references, check-tile-structure.js
// reads listing tiles, and every price tool reads one attribute. No tool read
// the shape of a product page. This does, and it is in the weekly health check.
//
// THE REPAIR IS VERIFIED, NOT PATTERN-MATCHED
// -------------------------------------------
// It walks div depth from the short-description open tag to find that element's
// real close, then removes the next closer only when doing so brings the whole
// document to balance. A page that is unbalanced for some other reason is
// reported and left alone rather than "fixed" into a different kind of wrong.
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const WRITE = process.argv.includes("--write");
const OPEN = '<div id="wsite-com-product-short-description"';

const balance = (html) => {
  let d = 0;
  for (const m of html.matchAll(/<div\b[^>]*>|<\/div>/gi)) d += m[0][1] === "/" ? -1 : 1;
  return d;
};

// Index just past the </div> that closes the element opening at `at`.
function closeOf(html, at) {
  let depth = 0;
  const re = /<div\b[^>]*>|<\/div>/gi;
  re.lastIndex = at;
  for (const m of html.matchAll(re)) {
    depth += m[0][1] === "/" ? -1 : 1;
    if (depth === 0) return m.index + m[0].length;
  }
  return -1;
}

const pages = [];
for (const dir of fs.readdirSync(path.join(REPO, "store"))) {
  if (!/^p\d+$/.test(dir)) continue;
  for (const f of fs.readdirSync(path.join(REPO, "store", dir))) {
    if (f.endsWith(".html")) pages.push(path.join("store", dir, f));
  }
}

let broken = 0, fixed = 0, unclear = 0;
for (const rel of pages.sort()) {
  const abs = path.join(REPO, rel);
  const html = fs.readFileSync(abs, "utf8");
  const off = balance(html);
  if (off === 0) continue;
  broken++;

  const at = html.indexOf(OPEN);
  if (off !== -1 || at < 0) {
    console.log(`  ! ${rel}: div balance ${off > 0 ? "+" : ""}${off}, not the known case, left alone`);
    unclear++;
    continue;
  }
  const end = closeOf(html, at);
  const after = html.slice(end);
  const m = after.match(/^(\s*)<\/div>/);
  if (end < 0 || !m) {
    console.log(`  ! ${rel}: div balance -1 but no stray closer after the description, left alone`);
    unclear++;
    continue;
  }
  const next = html.slice(0, end) + after.slice(m[0].length);
  if (balance(next) !== 0) {
    console.log(`  ! ${rel}: removing that closer does not balance the page, left alone`);
    unclear++;
    continue;
  }
  fixed++;
  console.log(`  ${WRITE ? "fixed" : "would fix"}: ${rel} (one stray </div> after the short description)`);
  if (WRITE) fs.writeFileSync(abs, next);
}

console.log(`\nscanned ${pages.length} product page(s)`);
console.log(`unbalanced: ${broken}`);
console.log(`${WRITE ? "fixed" : "would fix"}: ${fixed}`);
if (unclear) console.log(`needs a look: ${unclear}`);
if (!WRITE && fixed) console.log("re-run with --write");

// Exits non-zero on an unbalanced page rather than reporting a pending write
// count, so the weekly health check reads it by status alongside
// check-tile-structure.js. A page whose divs do not close is a defect that is
// already live, not a tool waiting to be re-run.
if (WRITE ? unclear : broken) process.exitCode = 1;
