// Put a free local trivia round on each city page, and publish it for
// Trivia Show Maker's ?round= autoload. Idempotent.
//
//   node _tools/add-city-rounds.js                  report only
//   node _tools/add-city-rounds.js --write          apply
//   node _tools/add-city-rounds.js --preview        print each block, drafts too
//   node _tools/add-city-rounds.js --remove --write take every block and file down
//
// Sources:
//   _content/city-pages.json        the city list: slug, name, page, status
//   _content/city-rounds/<slug>.json the round, in Trivia Show Maker's shape
//
// Outputs, for a city whose status is "live" and nothing else:
//   trivia-show-maker/rounds/<slug>.json  what /trivia-show-maker/?round=<slug> fetches
//   a block between <!-- fce:city-round --> markers on the city's page, placed
//   before <!-- fce:copy --> when the page has one, else before the footer
//
// WHY A STATUS GATE
// -----------------
// A local round is read aloud to a room, and a wrong local fact is the kind a
// room corrects out loud. So a round ships as "draft": it is NOT published to
// the served rounds/ folder and puts nothing on the page until the owner has
// checked every answer and flipped it to "live". Flipping it back (or
// --remove) takes both the block and the served file down again.
//
// Order: charlotte-events.html is regenerated whole by new-content-page.js,
// which drops this block. Re-run this tool after that one.

const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const WRITE = process.argv.includes("--write");
const REMOVE = process.argv.includes("--remove");
const PREVIEW = process.argv.includes("--preview");

const LIST = path.join(REPO, "_content", "city-pages.json");
const SRC = path.join(REPO, "_content", "city-rounds");
const OUT = path.join(REPO, "trivia-show-maker", "rounds");

const OPEN = "<!-- fce:city-round -->";
const CLOSE = "<!-- /fce:city-round -->";
const ANCHORS = ["    <!-- fce:copy -->", '    <div class="footer-wrap">'];
const TRIVIA_SHOWS = "/store/c6/triviagameshows/";

const esc = s => String(s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// What the round is called in that market: "trivia" for a trivia night, "quiz"
// for a pub, table or quiz night. A London page reading "trivia round" is the
// tell that it was written from somewhere else.
const noun = city => /quiz/.test(city.term || "") ? "quiz" : "trivia";

function block(city, round) {
  const qs = round.questions.map(q => `<li>${esc(q.q)}</li>`).join("\n");
  const as = round.questions.map(q => `<li>${esc(q.a)}</li>`).join("\n");
  return `${OPEN}
<section class="fce-copy fce-city-round">
<div class="fce-copy-inner">
<h2>A free ${esc(city.name)} ${esc(noun(city))} round</h2>
<p>Ten questions about ${esc(city.name)}, free to use at your next ${esc(city.term || "trivia night")}. Read them out as they are, or load the round into Trivia Show Maker to add it to a full show and print the answer sheets.</p>
<ol>
${qs}
</ol>
<details>
<summary>Show the answers</summary>
<ol>
${as}
</ol>
</details>
<p><a class="fce-cta" href="/trivia-show-maker/?round=${city.slug}">Load this round into Trivia Show Maker</a> <a class="fce-cta-secondary" href="${TRIVIA_SHOWS}">Browse full trivia shows</a></p>
</div>
</section>
${CLOSE}
`;
}

// The page with any existing block taken out, byte for byte what it was before.
function strip(html) {
  const start = html.indexOf(OPEN);
  if (start === -1) return html;
  const end = html.indexOf(CLOSE, start);
  if (end === -1) throw new Error("opening fce:city-round marker with no closing marker");
  return html.slice(0, start) + html.slice(end + CLOSE.length + 1);
}

function place(html, blk) {
  for (const a of ANCHORS) {
    const at = html.indexOf(a);
    if (at !== -1) return html.slice(0, at) + blk + html.slice(at);
  }
  return null;
}

const { cities } = JSON.parse(fs.readFileSync(LIST, "utf8"));
const changes = [];
const problems = [];
const drafts = [];
let planned = 0;

for (const city of cities) {
  // planned: on the list, but no page or round yet. Nothing to place or check.
  if (city.status === "planned") { planned++; continue; }
  if (!/^[a-z0-9-]{1,40}$/.test(city.slug)) { problems.push(`${city.slug}: slug must match the autoload's [a-z0-9-]`); continue; }
  const page = path.join(REPO, city.page);
  const src = path.join(SRC, `${city.slug}.json`);
  const out = path.join(OUT, `${city.slug}.json`);
  if (!fs.existsSync(page)) { problems.push(`${city.slug}: missing page ${city.page}`); continue; }
  if (!fs.existsSync(src)) { problems.push(`${city.slug}: missing _content/city-rounds/${city.slug}.json`); continue; }

  const data = JSON.parse(fs.readFileSync(src, "utf8"));
  const round = data.round || {};
  if (!Array.isArray(round.questions) || round.questions.length !== 10 ||
      round.questions.some(q => !String(q.q || "").trim() || !String(q.a || "").trim())) {
    problems.push(`${city.slug}: a round is 10 questions, each with an answer`);
    continue;
  }
  const blk = block(city, round);
  if (/—|&mdash;/.test(blk + (data.title || ""))) { problems.push(`${city.slug}: em-dash in customer-facing copy`); continue; }

  const live = city.status === "live" && !REMOVE;
  if (city.status !== "live") drafts.push(city.slug);
  if (PREVIEW) console.log(`\n----- ${city.page} (${city.status})\n${blk}`);

  const html = fs.readFileSync(page, "utf8");
  let next;
  try { next = strip(html); } catch (e) { problems.push(`${city.page}: ${e.message}`); continue; }
  if (live) {
    next = place(next, blk);
    if (next === null) { problems.push(`${city.page}: no fce:copy or footer-wrap anchor`); continue; }
  }
  if (next !== html) changes.push([page, next, live ? "place round block" : "remove round block"]);

  const served = JSON.stringify({ title: data.title || "", round }, null, 2) + "\n";
  const has = fs.existsSync(out) ? fs.readFileSync(out, "utf8") : null;
  if (live && has !== served) changes.push([out, served, "publish round"]);
  if (!live && has !== null) changes.push([out, null, "unpublish round"]);
}

for (const [file, body, what] of changes) {
  console.log(`  ${WRITE ? "wrote" : "would write"}  ${path.relative(REPO, file).padEnd(44)} ${what}`);
  if (!WRITE) continue;
  if (body === null) fs.unlinkSync(file);
  else { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, body); }
}

console.log(`\n${WRITE ? "updated" : "would update"}: ${changes.length} file(s)`);
if (drafts.length && !REMOVE) console.log(`  draft, not on any page until checked and set to "live": ${drafts.join(", ")}`);
if (planned) console.log(`  planned, no page yet: ${planned}`);
for (const p of problems) console.log(`  PROBLEM: ${p}`);
if (!WRITE && changes.length) console.log("\n(dry run -- pass --write to apply)");
process.exitCode = problems.length ? 1 : 0;
