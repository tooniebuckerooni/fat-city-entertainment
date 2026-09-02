// Validate the pre-made trivia show files in _content/trivia-shows/.
//
//   node _tools/check-trivia-shows.js
//
// These are a paid product read aloud to a live room, so the failure modes are
// expensive and mostly silent: a multiple-choice round whose answer isn't among
// its own options, a True/False round that is secretly all True, or the same
// question turning up in two games a host bought as a set.
//
// Structural only. It cannot tell you whether an answer is FACTUALLY right —
// that needs a human or a research pass, and is the one check that matters most.
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const DIR = path.join(REPO, "_content", "trivia-shows");

if (!fs.existsSync(DIR)) {
  console.error(`no ${path.relative(REPO, DIR)}/ — nothing to check`);
  process.exit(1);
}

const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".tgp.json")).sort();
const problems = [];
const warnings = [];
const seen = new Map(); // normalised question -> "file round Qn"
const allQ = []; // every question, for the answer-spoiler scan below

const norm = (s) => String(s).toLowerCase()
  .replace(/[‘’']/g, "'").replace(/[“”]/g, '"')
  .replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

for (const file of files) {
  const where = file.replace(".tgp.json", "");
  let g;
  try {
    g = JSON.parse(fs.readFileSync(path.join(DIR, file), "utf8"));
  } catch (e) {
    problems.push(`${where}: not valid JSON — ${e.message}`);
    continue;
  }

  if (!g.game || !g.game.title) problems.push(`${where}: missing game.title`);
  if (!g.tiebreaker || !g.tiebreaker.q || !g.tiebreaker.a)
    problems.push(`${where}: missing tiebreaker`);
  if (!Array.isArray(g.rounds) || !g.rounds.length) {
    problems.push(`${where}: no rounds`);
    continue;
  }

  // The app's adoptState() silently drops anything it doesn't recognise, so an
  // out-of-range value here becomes a wrong default rather than an error.
  const VALID_TYPE = ["standard", "double", "wager"];
  const VALID_FMT = ["open", "tf", "mc"];
  const VALID_AGE = ["family", "kids", "teens", "adults"];

  const answers = new Map();
  let doubles = 0;

  g.rounds.forEach((r, ri) => {
    const rw = `${where} R${ri + 1} "${r.name || "(unnamed)"}"`;
    if (!VALID_TYPE.includes(r.type)) problems.push(`${rw}: bad type "${r.type}"`);
    if (!VALID_FMT.includes(r.format)) problems.push(`${rw}: bad format "${r.format}"`);
    if (!VALID_AGE.includes(r.ageRange)) problems.push(`${rw}: bad ageRange "${r.ageRange}"`);
    if (r.type === "double") doubles++;
    // A "double" round that also carries raised points doubles twice at render.
    if (r.type === "double" && Number(r.points) !== 10)
      warnings.push(`${rw}: type=double AND points=${r.points} — the renderer doubles it, so this scores ${Number(r.points) * 2}`);
    if (!Array.isArray(r.questions) || r.questions.length !== 10)
      problems.push(`${rw}: ${r.questions ? r.questions.length : 0} questions, expected 10`);

    const positions = [];
    const tf = [];

    (r.questions || []).forEach((q, qi) => {
      const qw = `${rw} Q${qi + 1}`;
      if (!q.q || !String(q.q).trim()) problems.push(`${qw}: empty question`);
      if (!q.a || !String(q.a).trim()) problems.push(`${qw}: empty answer`);

      if (r.format === "mc") {
        if (!Array.isArray(q.choices) || q.choices.length !== 4)
          problems.push(`${qw}: mc needs exactly 4 choices, has ${q.choices ? q.choices.length : 0}`);
        else if (!q.choices.includes(q.a))
          problems.push(`${qw}: mc answer "${q.a}" is not one of its own choices`);
        else {
          positions.push(q.choices.indexOf(q.a));
          if (new Set(q.choices).size !== 4) problems.push(`${qw}: duplicate choices`);
        }
      } else {
        if (q.choices !== null) problems.push(`${qw}: ${r.format} round must have choices:null`);
      }

      if (r.format === "tf") {
        if (!["True", "False"].includes(q.a)) problems.push(`${qw}: tf answer must be "True"/"False", got "${q.a}"`);
        else tf.push(q.a);
      }

      // Duplicate question across the whole set — a host who bought all five
      // should never meet the same question twice.
      allQ.push({ show: where, showTitle: (g.game && g.game.title) || "", where: qw,
        order: ri * 100 + qi, question: q.q, answer: q.a });
      const key = norm(q.q);
      if (key) {
        if (seen.has(key)) problems.push(`${qw}: duplicate question, also at ${seen.get(key)}`);
        else seen.set(key, qw);
      }
      // Duplicate answer within one game reads as a mistake at the table.
      if (r.format !== "tf") {
        const ak = norm(q.a);
        if (ak) {
          if (answers.has(ak)) warnings.push(`${qw}: answer "${q.a}" repeats ${answers.get(ak)} in the same game`);
          else answers.set(ak, `R${ri + 1}Q${qi + 1}`);
        }
      }
    });

    if (r.format === "mc" && positions.length === 10) {
      const spread = new Set(positions).size;
      if (spread < 3) problems.push(`${rw}: mc answers only sit in ${spread} of 4 slots — players will spot it`);
      const most = Math.max(...[0, 1, 2, 3].map((i) => positions.filter((p) => p === i).length));
      if (most > 5) warnings.push(`${rw}: ${most} of 10 mc answers in the same slot`);
    }
    if (r.format === "tf" && tf.length === 10) {
      const t = tf.filter((x) => x === "True").length;
      if (t < 3 || t > 7) problems.push(`${rw}: ${t} True / ${10 - t} False — too lopsided`);
      const run = tf.join(" ").match(/(True|False)( \1){3,}/);
      if (run) warnings.push(`${rw}: 4+ identical answers in a row`);
    }
  });

  if (doubles !== 1) warnings.push(`${where}: ${doubles} double rounds (expected exactly 1)`);

  const qc = g.rounds.reduce((s, r) => s + (r.questions || []).length, 0);
  console.log(`${where.padEnd(16)} ${g.rounds.length} rounds, ${qc} questions, ` +
    `tiebreaker ${g.tiebreaker && g.tiebreaker.a ? "yes" : "MISSING"}`);
}

// --- product pages advertise the round list, and nothing regenerates it ------
// A round renamed in the JSON leaves the store page selling a line-up the
// customer will not get. Same class as every other baked-derived-data problem
// in this repo, so check it here rather than discover it in a refund email.
const PRODUCTS = {
  "gk-night-one": "p169", "gk-night-two": "p170", "gk-night-three": "p171",
  "gk-night-four": "p172", "gk-night-five": "p173",
  "halloween-fright-night": "p174",
  "christmas-long-night": "p175",
  "classroom-math": "p177", "classroom-science": "p178",
  "classroom-english": "p179", "classroom-history": "p180",
  "classroom-geography": "p181",
  "music-name-that-tune": "p183", "tv-prime-time": "p184",
  "movies-big-screen": "p185", "sports-game-on": "p186",
  "rewind-80s-90s": "p187",
};
for (const [stem, pid] of Object.entries(PRODUCTS)) {
  const showFile = path.join(DIR, `${stem}.tgp.json`);
  const dir = path.join(REPO, "store", pid);
  if (!fs.existsSync(showFile) || !fs.existsSync(dir)) continue;
  const page = fs.readdirSync(dir).find((f) => f.endsWith(".html"));
  if (!page) continue;
  const html = fs.readFileSync(path.join(dir, page), "utf8");
  const g = JSON.parse(fs.readFileSync(showFile, "utf8"));
  for (const r of g.rounds) {
    if (r.name && !html.includes(r.name))
      problems.push(`${pid} page does not list round "${r.name}" from ${stem}`);
  }
  const qs = g.rounds.reduce((s, r) => s + (r.questions || []).length, 0);
  if (!html.includes(`${qs} questions`))
    warnings.push(`${pid} page does not state "${qs} questions"`);
}


// --- a question that gives away another question's answer ---------------------
// The duplicate check above only catches identical question TEXT. It misses the
// costlier overlap: one question's wording containing another's answer. A show
// asking "which city is Will sent away from?" (Philadelphia) is spoiled by any
// other question that says "a teenager from West Philadelphia" -- and a host
// running both never notices until a team shouts it out.
//
// Inside one show that is a defect: the same host reads both. Across shows it is
// only a warning, since they are separate products a buyer may never pair.
const spoilers = [];
{
  const strip = (a) => String(a)
    .replace(/\([^)]*\)/g, " ")          // "(accept ...)" is marker guidance
    .replace(/[“”"'’]/g, " ")
    .replace(/^(the|a|an)\s+/i, "")
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .replace(/\s+/g, " ").trim().toLowerCase();
  // Place names and a handful of generic terms turn up in dozens of question
  // stems without spoiling anything -- "which ocean lies between Africa and
  // Australia" does not give away a question whose answer happens to be
  // Australia in another show. Only distinctive answers are worth flagging.
  const GENERIC = new Set([
    "united states", "canada", "australia", "the united kingdom", "new zealand",
    "south korea", "south america", "north america", "antarctica", "ice hockey",
    "christopher columbus", "the atlantic ocean", "the pacific ocean",
    "rio de janeiro", "new york city", "philadelphia", "the north pole",
  ].map((x) => x.replace(/^the /, "")));
  for (const a of allQ) {
    const ans = strip(a.answer);
    // Short or numeric answers match everything; only distinctive ones count.
    if (ans.length < 9 || /^[0-9 ]+$/.test(ans)) continue;
    if (GENERIC.has(ans)) continue;
    // An answer that is also a word in its own show's title is unavoidable --
    // the Halloween show says "Halloween" in half its questions, which does not
    // spoil the film of the same name.
    if (a.showTitle && a.showTitle.toLowerCase().includes(ans)) continue;
    for (const b of allQ) {
      if (a === b) continue;
      // Only a spoiler if it is READ FIRST -- a later question repeating an
      // answer the room already gave is just a callback, not a giveaway.
      if (a.show === b.show && b.order >= a.order) continue;
      const text = strip(b.question);
      // Word boundaries, or "0 degrees" matches "less than 90 degrees".
      if (!new RegExp("(^| )" + ans.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "($| )").test(text)) continue;
      const msg = `${b.where} gives away the answer to ${a.where} ("${a.answer}")`;
      if (a.show === b.show) spoilers.push(["problem", msg]);
      else spoilers.push(["warning", msg]);
    }
  }
}
for (const [kind, msg] of spoilers) (kind === "problem" ? problems : warnings).push(msg);

console.log(`\n${files.length} show(s), ${seen.size} unique questions across the set`);
if (warnings.length) {
  console.log(`\n${warnings.length} warning(s):`);
  warnings.forEach((w) => console.log(`  - ${w}`));
}
if (problems.length) {
  console.log(`\n${problems.length} PROBLEM(S):`);
  problems.forEach((p) => console.log(`  ! ${p}`));
  process.exit(1);
}
console.log("\nstructure OK. NOTE: this checks shape, never whether an answer is factually true.");
