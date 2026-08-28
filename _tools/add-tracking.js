// Put assets/js/track.js on every page that already carries the GA4 tag.
//
//   node _tools/add-tracking.js            # dry run
//   node _tools/add-tracking.js --write
//
// Idempotent: the block is marked and replaced wholesale on re-run, same idiom
// as add-favicon-links.js.
//
// It attaches only where gtag is already present. A page without the GA4 tag has
// nothing for track.js to talk to, and loading it there would be a request that
// can only no-op. That is also why the count here is 459 and not 728 — the
// difference is redirect stubs and the scraped archive.
//
// Loaded with `defer` and placed in <head>: it needs the DOM, not the parser,
// and deferring keeps it off the critical path. It does not depend on gtag
// having loaded yet — every send() checks first and silently does nothing.
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const WRITE = process.argv.includes("--write");
const SKIP = new Set(["_tools", "node_modules", ".git", ".claude", "_export", "_content"]);

const START = "<!-- fce:tracking -->";
const END = "<!-- /fce:tracking -->";
const BLOCK = `${START}\n<script defer src="/assets/js/track.js"></script>\n${END}`;

const GA_ID = "G-LYMVV05F3X";

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith(".html")) out.push(p);
  }
  return out;
}

let added = 0, refreshed = 0, noGa = 0, stubs = 0, noHead = 0;

for (const file of walk(REPO)) {
  const html = fs.readFileSync(file, "utf8");
  const rel = path.relative(REPO, file);

  // A redirect stub forwards before anything runs; a tag there records a
  // pageview for a URL nobody reads.
  if (/http-equiv="refresh"/i.test(html)) { stubs++; continue; }
  if (!html.includes(GA_ID)) { noGa++; continue; }

  let next;
  const s = html.indexOf(START);
  if (s !== -1) {
    const e = html.indexOf(END, s);
    if (e === -1) { console.log(`  PROBLEM: unclosed marker in ${rel}`); continue; }
    next = html.slice(0, s) + BLOCK + html.slice(e + END.length);
    if (next !== html) refreshed++;
    else continue;
  } else {
    if (!/<\/head>/i.test(html)) { console.log(`  no </head>: ${rel}`); noHead++; continue; }
    // A function replacer, always — see HANDOFF.md on "$1" in replacement text.
    next = html.replace(/<\/head>/i, () => `${BLOCK}\n</head>`);
    added++;
  }

  if (WRITE) fs.writeFileSync(file, next);
}

console.log(`${WRITE ? "added" : "would add"}   : ${added}`);
console.log(`refreshed : ${refreshed}`);
console.log(`no GA tag : ${noGa}   (nothing for track.js to talk to)`);
console.log(`stubs     : ${stubs}   (redirect pages, skipped)`);
if (noHead) console.log(`no <head> : ${noHead}`);
if (!WRITE) console.log("\n(dry run -- pass --write to apply)");
