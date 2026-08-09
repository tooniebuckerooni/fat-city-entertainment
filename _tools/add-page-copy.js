// Inject a hand-written copy block into a Weebly-exported page, idempotently.
//
//   node add-page-copy.js          report only
//   node add-page-copy.js --write  apply
//
// Source copy lives in `_content/copy/<name>.html` — one partial per page, plain
// semantic HTML (h2/h3/p/ul), no Weebly table scaffolding. The mapping from
// partial to page is PAGES below.
//
// The partial is injected just before `<div class="footer-wrap">`, wrapped in a
// `<section class="fce-copy">` inside `<!-- fce:copy -->` markers — the same
// marker idiom as fce:favicon / fce:jsonld / fce:greenroom. Re-running replaces
// whatever sits between the markers, so editing a partial and re-running is the
// whole update workflow. Nothing else on the page is touched.
//
// WHY THIS EXISTS
// ---------------
// These pages are Weebly exports: nested multicol <table> scaffolding with
// inline <font> tags. Hand-editing prose into that markup is how you end up
// with a broken layout on a live page. Keeping the words in a plain partial and
// letting a script own the injection means the copy stays reviewable as copy.
//
// Style lives in `.fce-copy` in assets/css/site-extras.css, which is already
// linked on every page.

const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const WRITE = process.argv.includes("--write");
const SRC = path.join(REPO, "_content", "copy");

// partial basename -> page it belongs on
const PAGES = {
  "trivia-store": "trivia-store.html",
  "officegames": "officegames.html",
  "holidayparty": "holidayparty.html",
  "yycevents": "yycevents.html",
  "vrtriviaparty": "vrtriviaparty.html",
};

const OPEN = "<!-- fce:copy -->";
const CLOSE = "<!-- /fce:copy -->";
const ANCHOR = '<div class="footer-wrap">';

let changed = 0;
let same = 0;
const problems = [];

for (const [name, page] of Object.entries(PAGES)) {
  const partial = path.join(SRC, `${name}.html`);
  const target = path.join(REPO, page);

  if (!fs.existsSync(partial)) {
    problems.push(`missing partial: _content/copy/${name}.html`);
    continue;
  }
  if (!fs.existsSync(target)) {
    problems.push(`missing page: ${page}`);
    continue;
  }

  const copy = fs.readFileSync(partial, "utf8").trim();
  const block = `${OPEN}\n<section class="fce-copy">\n<div class="fce-copy-inner">\n${copy}\n</div>\n</section>\n${CLOSE}\n`;

  const html = fs.readFileSync(target, "utf8");
  let updated;

  const start = html.indexOf(OPEN);
  if (start !== -1) {
    const end = html.indexOf(CLOSE, start);
    if (end === -1) {
      problems.push(`${page}: opening fce:copy marker with no closing marker`);
      continue;
    }
    updated = html.slice(0, start) + block + html.slice(end + CLOSE.length + 1);
  } else {
    const at = html.indexOf(ANCHOR);
    if (at === -1) {
      problems.push(`${page}: no <div class="footer-wrap"> anchor found`);
      continue;
    }
    updated = html.slice(0, at) + block + "\n    " + html.slice(at);
  }

  if (updated === html) {
    same++;
    continue;
  }
  changed++;
  const words = copy.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
  console.log(`  ${WRITE ? "wrote" : "would write"}  ${page.padEnd(24)} +${words} words`);
  if (WRITE) fs.writeFileSync(target, updated);
}

console.log(`\npages updated: ${changed}   already current: ${same}`);
for (const p of problems) console.log(`  PROBLEM: ${p}`);
if (!WRITE) console.log("\n(dry run -- pass --write to apply)");
process.exitCode = problems.length ? 1 : 0;
