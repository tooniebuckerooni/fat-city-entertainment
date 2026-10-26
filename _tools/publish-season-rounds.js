// Publish the free seasonal trivia rounds that load into Trivia Show Maker.
//
//   node _tools/publish-season-rounds.js           # dry run
//   node _tools/publish-season-rounds.js --write
//
// Source: _content/season-rounds/<slug>.json, the same shape as a city round
// ({ title, status, round: { name, format, ageRange, points, questions } }).
// Output, for a round whose status is "live" and nothing else:
//   trivia-show-maker/rounds/<slug>.json, which /trivia-show-maker/?round=<slug>
//   fetches. A draft publishes nothing, and flipping a live round back to
//   draft unpublishes it.
//
// WHY (26 Oct 2026). The election, Thanksgiving and Christmas pushes each give
// away one ten-question round, linked from a blog post or a hub, as a reason to
// come to the site and a way into the paid shows. The autoload already takes
// any [a-z0-9-] slug (it was built for the city pages), so the only missing
// piece was a publisher that is not tied to the city list. City rounds stay
// owned by add-city-rounds.js; a season slug that collides with a city slug is
// refused, so the two tools can never fight over one served file.
//
// Every answer goes through the city rounds' evidence pipeline before "live":
// node _tools/check-city-rounds.js --season <slug>.
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const WRITE = process.argv.includes("--write");
const SRC = path.join(REPO, "_content/season-rounds");
const OUT = path.join(REPO, "trivia-show-maker/rounds");
const CITIES = new Set(JSON.parse(fs.readFileSync(path.join(REPO, "_content/city-pages.json"), "utf8")).cities.map((c) => c.slug));

const problems = [];
const changes = [];
const drafts = [];
for (const f of fs.existsSync(SRC) ? fs.readdirSync(SRC).filter((f) => f.endsWith(".json")).sort() : []) {
  const slug = f.replace(/\.json$/, "");
  if (!/^[a-z0-9-]{1,40}$/.test(slug)) { problems.push(`${slug}: slug must match the autoload's [a-z0-9-]{1,40}`); continue; }
  if (CITIES.has(slug)) { problems.push(`${slug}: collides with a city round; add-city-rounds.js owns that file`); continue; }
  const data = JSON.parse(fs.readFileSync(path.join(SRC, f), "utf8"));
  const round = data.round || {};
  const qs = round.questions || [];
  if (qs.length !== 10 || qs.some((q) => !q.q || !q.a)) { problems.push(`${slug}: a round is 10 questions, each with an answer`); continue; }
  if (/—|&mdash;/.test(JSON.stringify(data))) { problems.push(`${slug}: em-dash in customer-facing copy`); continue; }
  const out = path.join(OUT, f);
  const live = data.status === "live";
  if (!live) drafts.push(slug);
  const served = JSON.stringify({ title: data.title || "", round }, null, 2) + "\n";
  const has = fs.existsSync(out) ? fs.readFileSync(out, "utf8") : null;
  if (live && has !== served) changes.push([out, served, "publish round"]);
  if (!live && has !== null) changes.push([out, null, "unpublish round"]);
}

for (const [file, body, what] of changes) {
  console.log(`  ${WRITE ? "wrote" : "would write"}  ${path.relative(REPO, file).padEnd(44)} ${what}`);
  if (!WRITE) continue;
  if (body === null) fs.unlinkSync(file);
  else fs.writeFileSync(file, body);
}
console.log(`\n${WRITE ? "updated" : "would update"}: ${changes.length} file(s)`);
if (drafts.length) console.log(`  draft, not published until checked and set to "live": ${drafts.join(", ")}`);
for (const p of problems) console.log(`  PROBLEM: ${p}`);
process.exitCode = problems.length ? 1 : 0;
