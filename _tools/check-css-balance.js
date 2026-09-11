// Brace balance on the stylesheets this repo owns.
//
//   node _tools/check-css-balance.js
//
// WHY
// ---
// One stray `}` in assets/css/site-extras.css broke every rule after it, and
// what the owner saw was the Halloween perk badge floating off the product
// image into the breadcrumbs. The rule it needed,
// `#wsite-com-product-images { position: relative; }`, sat below the damage and
// never applied, so the badge positioned against the viewport instead.
//
// It shipped because nothing reads CSS. check-links.js reads references,
// check-tile-structure.js and fix-product-divs.js read HTML shape, and a
// browser silently recovers from a stray brace by skipping ahead rather than
// erroring. The only symptom is rules quietly not applying, somewhere below.
//
// Comments and quoted strings are stripped before counting, because a `}`
// inside either is not a brace. An earlier hand-rolled count that skipped the
// string pass reported a phantom imbalance 260 lines away from the real one,
// which is worse than no check.
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
// Ours to keep valid. The Weebly theme's own CSS is vendored and not edited.
const FILES = ["assets/css/site-extras.css"];

let problems = 0;
for (const rel of FILES) {
  const abs = path.join(REPO, rel);
  if (!fs.existsSync(abs)) { console.log(`  missing: ${rel}`); problems++; continue; }
  const src = fs.readFileSync(abs, "utf8");

  // Blank out comments and strings in place, so line numbers stay true.
  const blank = (s, re) => s.replace(re, (m) => m.replace(/[^\n]/g, " "));
  let t = blank(src, /\/\*[\s\S]*?\*\//g);
  t = blank(t, /"(?:[^"\\\n]|\\.)*"/g);
  t = blank(t, /'(?:[^'\\\n]|\\.)*'/g);

  let depth = 0, line = 1, firstNegative = null, maxDepth = 0;
  for (const ch of t) {
    if (ch === "\n") line++;
    else if (ch === "{") { depth++; maxDepth = Math.max(maxDepth, depth); }
    else if (ch === "}") {
      depth--;
      if (depth < 0 && firstNegative === null) firstNegative = line;
    }
  }

  if (depth === 0 && firstNegative === null) {
    console.log(`  ok  ${rel}  (${src.split("\n").length} lines, max nesting ${maxDepth})`);
    continue;
  }
  problems++;
  if (firstNegative !== null) {
    console.log(`  ! ${rel}:${firstNegative}  a closing brace with nothing open.`);
    console.log(`      Everything after it is skipped by the browser and silently does not apply.`);
  }
  if (depth > 0) {
    console.log(`  ! ${rel}  ${depth} block(s) left open at end of file.`);
  } else if (depth < 0) {
    console.log(`  ! ${rel}  ${-depth} stray closing brace(s) overall.`);
  }
}

if (problems) {
  console.log(`\n${problems} STYLESHEET PROBLEM(S).`);
  process.exit(1);
}
console.log("\nstylesheets balance.");
