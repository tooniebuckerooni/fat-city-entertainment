// Check every city round's answers against the evidence recorded for them, and
// check the EVIDENCE against the source it claims to quote.
//
//   node _tools/check-city-rounds.js            all cities with a round
//   node _tools/check-city-rounds.js london     one city
//   node _tools/check-city-rounds.js --offline  structure only, no fetching
//
// Evidence lives in _content/city-rounds/evidence/<slug>.json, written by a
// fact-checker who did NOT write the round:
//
//   { "slug": "london", "checked": "2026-09-23", "items": [
//     { "n": 1, "verdict": "confirmed", "wiki": "en:River_Thames",
//       "quote": "<a sentence copied verbatim from that article>",
//       "match": "Thames", "note": "" } ] }
//
// WHY A SECOND CHECK ON THE CHECKER
// ---------------------------------
// A fact-checker that is itself a language model can "confirm" an answer with a
// quote it made up. So this tool refetches every cited article and requires:
//   1. the quote really appears in the article (after both are reduced to plain
//      text: wiki links, bold, refs and templates flattened, whitespace folded);
//   2. `match` appears in the quote, AND in the round's own answer.
// Rule 2 is what ties the evidence to the answer: a genuine quote about the
// wrong thing fails it. An item passes only when all of that holds and the
// checker's verdict is "confirmed". Anything else is printed for the owner.
//
// This is evidence, not a substitute for the owner's read: a sentence can be on
// Wikipedia and still be the wrong answer to a badly worded question. It turns
// "check 220 answers" into "read the handful this prints".

const fs = require("fs");
const os = require("os");
const path = require("path");
const https = require("https");

const REPO = path.resolve(__dirname, "..");
const OFFLINE = process.argv.includes("--offline");
const ONLY = process.argv.slice(2).filter(a => !a.startsWith("--"));
const CACHE = path.join(os.tmpdir(), "fce-wiki-cache");
const UA = "FatCityFactCheck/1.0 (https://www.fatcityentertainment.com/)";
fs.mkdirSync(CACHE, { recursive: true });

// Fold case, accents, curly quotes and dashes, so "Montréal" matches "Montreal"
// and a typographic apostrophe matches a straight one.
const fold = s => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/[‘’ʼ]/g, "'").replace(/[“”«»]/g, '"')
  .replace(/[‐-―]/g, "-").replace(/ /g, " ")
  .toLowerCase().replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ").trim();

// Wikitext to roughly the words a reader sees.
function plain(wt) {
  let s = wt;
  s = s.replace(/<!--[\s\S]*?-->/g, " ");
  s = s.replace(/<ref[^>]*\/>/gi, " ").replace(/<ref[\s\S]*?<\/ref>/gi, " ");
  // Templates may nest; peel innermost first. {{convert|1,595|ft}} and the like
  // keep their first arguments so numbers survive.
  for (let i = 0; i < 6; i++) {
    s = s.replace(/\{\{(?:convert|cvt)\|([^{}|]*)\|([^{}|]*)[^{}]*\}\}/gi, "$1 $2");
    s = s.replace(/\{\{(?:lang|nowrap|small|nobr)\|(?:[^{}|]*\|)?([^{}|]*)\}\}/gi, "$1");
    s = s.replace(/\{\{[^{}]*\}\}/g, " ");
  }
  s = s.replace(/\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g, "$1");
  s = s.replace(/\[https?:[^\s\]]+ ([^\]]*)\]/g, "$1");
  s = s.replace(/'{2,}/g, "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ");
  return s;
}

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": UA } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return get(new URL(res.headers.location, url).href).then(resolve, reject);
      }
      let body = "";
      res.setEncoding("utf8");
      res.on("data", d => (body += d));
      res.on("end", () => (res.statusCode === 200 ? resolve(body) : reject(new Error(`HTTP ${res.statusCode}`))));
    }).on("error", reject);
  });
}

async function article(ref) {
  const m = /^([a-z]{2}):(.+)$/.exec(ref || "");
  if (!m) throw new Error(`wiki must look like "en:Title", got ${JSON.stringify(ref)}`);
  const [, lang, title] = m;
  const file = path.join(CACHE, `${lang}-${encodeURIComponent(title)}.txt`);
  if (fs.existsSync(file)) return fs.readFileSync(file, "utf8");
  let raw = await get(`https://${lang}.wikipedia.org/w/index.php?title=${encodeURIComponent(title)}&action=raw`);
  const redirect = /^#REDIRECT\s*\[\[([^\]|#]+)/i.exec(raw);
  if (redirect) raw = await get(`https://${lang}.wikipedia.org/w/index.php?title=${encodeURIComponent(redirect[1])}&action=raw`);
  const text = fold(plain(raw));
  fs.writeFileSync(file, text);
  return text;
}

(async () => {
  const cities = JSON.parse(fs.readFileSync(path.join(REPO, "_content", "city-pages.json"), "utf8")).cities
    .filter(c => c.status !== "planned" && (!ONLY.length || ONLY.includes(c.slug)));
  let pass = 0, total = 0;
  const report = [];

  for (const city of cities) {
    const round = JSON.parse(fs.readFileSync(path.join(REPO, "_content", "city-rounds", `${city.slug}.json`), "utf8")).round;
    const evFile = path.join(REPO, "_content", "city-rounds", "evidence", `${city.slug}.json`);
    const qs = round.questions;
    total += qs.length;
    if (!fs.existsSync(evFile)) { report.push(`${city.slug}: NO EVIDENCE FILE (0/${qs.length})`); continue; }
    const ev = JSON.parse(fs.readFileSync(evFile, "utf8"));
    const lines = [];
    let ok = 0;
    for (let i = 0; i < qs.length; i++) {
      const q = qs[i];
      const it = (ev.items || []).find(x => x.n === i + 1);
      const tag = `  Q${String(i + 1).padStart(2)} ${q.q.slice(0, 70)} => ${q.a}`;
      if (!it) { lines.push(`${tag}\n       no evidence item`); continue; }
      const problems = [];
      if (it.verdict !== "confirmed") problems.push(`checker says ${it.verdict}${it.note ? `: ${it.note}` : ""}`);
      if (!it.match || !fold(q.a).includes(fold(it.match))) problems.push(`match "${it.match}" is not in the answer`);
      if (!it.quote || !fold(it.quote).includes(fold(it.match || "\u0000"))) problems.push(`match "${it.match}" is not in the quote`);
      if (!OFFLINE && it.quote) {
        try {
          const text = await article(it.wiki);
          if (!text.includes(fold(it.quote))) problems.push(`quote NOT FOUND in ${it.wiki}`);
        } catch (e) { problems.push(`could not fetch ${it.wiki}: ${e.message}`); }
      }
      if (problems.length) lines.push(`${tag}\n       ${problems.join("; ")}\n       quote: ${String(it.quote || "").slice(0, 160)}`);
      else ok++;
    }
    pass += ok;
    report.push(`${city.slug}: ${ok}/${qs.length} verified${lines.length ? "\n" + lines.join("\n") : ""}`);
  }

  console.log(report.join("\n"));
  console.log(`\nverified: ${pass}/${total}${OFFLINE ? "  (offline: quotes not refetched)" : ""}`);
  process.exitCode = pass === total ? 0 : 1;
})();
