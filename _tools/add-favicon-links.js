// Point every page at the favicon.
//
// Browsers will guess /favicon.ico on their own, but only that one file and only
// at the root — the PNG sizes and the Apple touch icon need declaring, and a
// stale wrong reference beats a missing one to the punch. One page
// (8j6e7n5n3y09.html) pointed at assets/favicon.ico, which has never existed.
//
//   node _tools/add-favicon-links.js            # dry run
//   node _tools/add-favicon-links.js --write
//
// Idempotent: the block is marked and replaced wholesale on re-run.
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const WRITE = process.argv.includes("--write");
const SKIP = new Set(["_tools", "node_modules", ".git", ".claude", "_export", "_content"]);

const START = "<!-- fce:favicon -->";
const END = "<!-- /fce:favicon -->";

const BLOCK = `${START}
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
${END}`;

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith(".html")) out.push(p);
  }
  return out;
}

let added = 0, refreshed = 0, cleaned = 0, noHead = 0;

for (const file of walk(REPO)) {
  let html = fs.readFileSync(file, "utf8");
  const before = html;

  // Drop any pre-existing icon declarations so there's exactly one source of
  // truth — including the broken assets/favicon.ico reference.
  const stale = html.match(/[ \t]*<link[^>]*rel="(?:shortcut )?icon"[^>]*>\n?/gi) || [];
  const outside = stale.filter((s) => !BLOCK.includes(s.trim()));
  if (outside.length && !html.includes(START)) cleaned += outside.length;
  html = html.replace(/[ \t]*<link[^>]*rel="(?:shortcut )?icon"[^>]*>\n?/gi, "");
  html = html.replace(/[ \t]*<link[^>]*rel="apple-touch-icon"[^>]*>\n?/gi, "");

  const s = html.indexOf(START);
  if (s !== -1) {
    const e = html.indexOf(END, s);
    html = html.slice(0, s) + BLOCK + html.slice(e + END.length);
    refreshed++;
  } else if (/<\/head>/i.test(html)) {
    html = html.replace(/<\/head>/i, `${BLOCK}\n</head>`);
    added++;
  } else {
    noHead++;
    continue;
  }

  if (html !== before && WRITE) fs.writeFileSync(file, html);
}

console.log(`favicon block added   : ${added}`);
console.log(`refreshed             : ${refreshed}`);
console.log(`stale icon links swept: ${cleaned}`);
console.log(`pages with no <head>  : ${noHead}`);
if (!WRITE) console.log("\nDRY RUN — nothing written. Re-run with --write.");
