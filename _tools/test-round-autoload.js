// End-to-end test of Trivia Show Maker's ?round=<slug> autoload, in a real
// browser, against every city round there is, draft or live.
//
//   node _tools/test-round-autoload.js            every city with a round
//   node _tools/test-round-autoload.js london     one city (plus the edge cases)
//
// Needs Playwright's Chromium (preinstalled in the agent sandbox; locally,
// `npx playwright install chromium`). PDF text checks also need PyMuPDF
// (`pip install pymupdf`); without it they are skipped and say so.
//
// It serves the repo itself on a local port, and answers requests for
// /trivia-show-maker/rounds/<slug>.json from _content/city-rounds/<slug>.json
// in exactly the shape add-city-rounds.js publishes, so a DRAFT round can be
// tested before it is ever served. Nothing in the repo is written.
//
// What it proves, per round:
//   - the round lands as round 1 of a fresh five-round show (rounds 2-5 empty),
//     with its title, 10 questions, every q and a identical
//     to the source, byte for byte (accents, curly quotes, « » included);
//   - the ?round= parameter is stripped from the address bar;
//   - the Host Packet PDF and the Question Packet PDF both contain every
//     question, and the host packet every answer, as extractable text. That is
//     the check a screen cannot make: a PDF font that cannot draw "é" or "’"
//     prints a blank or a wrong glyph, and nobody sees it until the night.
// And once, the behaviours that protect a visitor's own work:
//   - a show already in progress is only replaced after the visitor confirms;
//     "Keep my show" leaves it byte for byte, and reloading the link once it is
//     already round 1 changes nothing;
//   - other query parameters (utm_*) survive the strip;
//   - a traversal or malformed slug fetches nothing and changes nothing;
//   - a missing round, a malformed file and a wrong-shaped file each leave the
//     show exactly as it was and say so;
//   - no page errors anywhere.

const fs = require("fs");
const os = require("os");
const path = require("path");
const http = require("http");
const { execFileSync } = require("child_process");

let chromium;
try { ({ chromium } = require("playwright")); }
catch (e) { ({ chromium } = require("/opt/node22/lib/node_modules/playwright")); }

const REPO = path.resolve(__dirname, "..");
const ONLY = process.argv.slice(2).filter(a => !a.startsWith("--"));
const STORE_KEY = "tgp_state_v1";
const cities = JSON.parse(fs.readFileSync(path.join(REPO, "_content", "city-pages.json"), "utf8")).cities
  .filter(c => c.status !== "planned" && (!ONLY.length || ONLY.includes(c.slug)));

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".woff2": "font/woff2" };

// What the autoload would fetch for a slug: the same {title, round} shape
// add-city-rounds.js writes. A few extra slugs exist only to test failure.
function servedRound(slug) {
  if (slug === "zz-malformed") return "{ not json";
  if (slug === "zz-wrong-shape") return JSON.stringify({ title: "x", rounds: [] });
  const f = path.join(REPO, "_content", "city-rounds", `${slug}.json`);
  if (!fs.existsSync(f)) return null;
  const d = JSON.parse(fs.readFileSync(f, "utf8"));
  return JSON.stringify({ title: d.title || "", round: d.round }, null, 2) + "\n";
}

const fetched = [];
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  fetched.push(url);
  const m = /^\/trivia-show-maker\/rounds\/([^/]+)\.json$/.exec(url);
  if (m) {
    const body = servedRound(m[1]);
    res.writeHead(body === null ? 404 : 200, { "content-type": "application/json" });
    return res.end(body === null ? "not found" : body);
  }
  let file = path.join(REPO, url);
  if (!file.startsWith(REPO)) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
  if (!fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});

const fold = s => String(s).normalize("NFKC").replace(/\s+/g, " ").trim();
// What pdfgen.js can print: the Windows-1252 set, with any other accented
// letter reduced to its base letter (see pdfSafe there). The PDF check compares
// against this, so it tests the promise the generator actually makes.
const CP1252_EXTRA = "\u20ac\u201a\u0192\u201e\u2026\u2020\u2021\u02c6\u2030\u0160\u2039\u0152\u017d\u2018\u2019\u201c\u201d\u2022\u2013\u2014\u02dc\u2122\u0161\u203a\u0153\u017e\u0178";
const drawable = ch => { const c = ch.charCodeAt(0); return ch.length === 1 && ((c >= 0x20 && c <= 0x7e) || (c >= 0xa0 && c <= 0xff) || CP1252_EXTRA.includes(ch)); };
const printable = s => [...String(s)].map(ch => { if (drawable(ch)) return ch; const b = ({ "\u0141": "L", "\u0142": "l", "\u0110": "D", "\u0111": "d", "\u0131": "i", "\u0126": "H", "\u0127": "h", "\u0166": "T", "\u0167": "t" })[ch] || ch.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); return b && [...b].every(drawable) ? b : "?"; }).join("");
let pyOK = true;
function pdfText(file) {
  try {
    return execFileSync("python3", ["-c", "import sys\ntry:\n import pymupdf as fitz\nexcept ImportError:\n import fitz\nd=fitz.open(sys.argv[1]);print('\\n'.join(p.get_text() for p in d))", file], { encoding: "utf8" });
  } catch (e) { pyOK = false; return null; }
}

let failures = 0;
const fail = (what) => { failures++; console.log(`  FAIL ${what}`); };
const pass = (what) => console.log(`  ok   ${what}`);

(async () => {
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  const BASE = `http://127.0.0.1:${server.address().port}`;
  // The repo's own Playwright can be newer than the browser installed beside it;
  // fall back to any Chromium already on the machine rather than failing.
  let browser;
  try { browser = await chromium.launch(); }
  catch (e) {
    const dir = process.env.PLAYWRIGHT_BROWSERS_PATH || "/opt/pw-browsers";
    const exe = fs.existsSync(dir) && fs.readdirSync(dir).filter(d => /^chromium-\d+$/.test(d)).sort().reverse()
      .map(d => path.join(dir, d, "chrome-linux", "chrome")).find(p => fs.existsSync(p));
    if (!exe) throw e;
    browser = await chromium.launch({ executablePath: exe });
  }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "fce-autoload-"));

  async function fresh() {
    const ctx = await browser.newContext({ acceptDownloads: true });
    await ctx.route(url => !url.href.startsWith(BASE), r => r.abort());
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", e => errors.push(e.message));
    return { ctx, page, errors };
  }
  const state = page => page.evaluate(k => JSON.parse(localStorage.getItem(k) || "null"), STORE_KEY);
  const toast = page => page.$eval("#toast", t => t.textContent).catch(() => "");
  async function settle(page) { await page.waitForTimeout(900); } // save() debounces 400ms

  // ---- every round -------------------------------------------------------
  for (const city of cities) {
    const src = JSON.parse(fs.readFileSync(path.join(REPO, "_content", "city-rounds", `${city.slug}.json`), "utf8"));
    console.log(`\n${city.slug} (${city.status})`);
    const { ctx, page, errors } = await fresh();
    await page.goto(`${BASE}/trivia-show-maker/?round=${city.slug}`);
    await settle(page);
    const s = await state(page);
    const url = page.url();
    if (!s) { fail("nothing saved"); await ctx.close(); continue; }
    const got = s.rounds;
    const want = src.round.questions;
    if (s.game.title === src.title) pass(`title "${s.game.title}"`); else fail(`title "${s.game.title}" != "${src.title}"`);
    const rest = got.slice(1);
    if (got.length === 5 && got[0].name === src.round.name && rest.every(r => !r.name && r.questions.length === 10 && r.questions.every(q => !q.q && !q.a)))
      pass(`round 1 is "${got[0].name}", rounds 2-5 empty`);
    else fail(`rounds: ${got.map(r => r.name || "(empty)").join(" | ")}`);
    const diffs = want.filter((q, i) => !got[0] || !got[0].questions[i] || got[0].questions[i].q !== q.q || got[0].questions[i].a !== q.a);
    if (got[0] && got[0].questions.length === want.length && !diffs.length) pass(`${want.length} questions and answers identical to source`);
    else fail(`${diffs.length} question(s) differ from source`);
    if (!/[?&]round=/.test(url)) pass("?round= stripped from the address bar"); else fail(`address still ${url}`);

    // The PDFs a host actually prints.
    for (const kind of ["host", "questions"]) {
      const [dl] = await Promise.all([page.waitForEvent("download"), page.click(`[data-download="${kind}"]`)]);
      const file = path.join(tmp, `${city.slug}-${kind}.pdf`);
      await dl.saveAs(file);
      const text = pdfText(file);
      if (text === null) { console.log(`  skip ${kind} PDF text (no PyMuPDF)`); continue; }
      // jsPDF's failure mode for an undrawable character is to re-encode the
      // whole string as UTF-16, which extracts as NULs between letters.
      if (/\u0000/.test(text)) fail(`${kind} PDF contains re-encoded (garbled) text`);
      const flat = fold(text);
      const missingQ = want.filter(q => !flat.includes(fold(printable(q.q))));
      const missingA = kind === "host" ? want.filter(q => !flat.includes(fold(printable(q.a)))) : [];
      if (!missingQ.length && !missingA.length) pass(`${kind} PDF carries every question${kind === "host" ? " and answer" : ""}`);
      else {
        fail(`${kind} PDF missing ${missingQ.length} question(s), ${missingA.length} answer(s)`);
        for (const q of missingQ.slice(0, 3)) console.log(`         Q: ${q.q}`);
        for (const q of missingA.slice(0, 3)) console.log(`         A: ${q.a}`);
      }
    }
    if (errors.length) fail(`page errors: ${errors.join(" | ")}`);
    await ctx.close();
  }

  // ---- behaviours that protect a visitor's own work ----------------------
  const probe = cities.find(c => c.slug === "london") || cities[0];
  console.log(`\nedge cases (using ${probe.slug})`);
  {
    const { ctx, page, errors } = await fresh();
    await page.goto(`${BASE}/trivia-show-maker/`);
    const mine = { game: { title: "My Pub Night", subtitle: "", date: "", host: "" },
      rounds: [{ name: "My Round", questions: [{ q: "Mine?", a: "Yes" }] }, { name: "Second", questions: [{ q: "Two?", a: "2" }] }] };
    await page.evaluate(([k, v]) => localStorage.setItem(k, JSON.stringify(v)), [STORE_KEY, mine]);

    const mineBefore = JSON.stringify(await (async () => { await page.goto(`${BASE}/trivia-show-maker/`); await settle(page); return state(page); })());

    // Decline: the show in progress must survive untouched.
    await page.goto(`${BASE}/trivia-show-maker/?round=${probe.slug}&utm_source=city-page`);
    await page.waitForSelector("#confirm-modal:not([hidden])", { timeout: 5000 }).catch(() => {});
    const asked = await page.isVisible("#confirm-modal");
    if (asked) await page.click("#confirm-modal .confirm-cancel");
    await settle(page);
    let s = await state(page);
    if (asked && JSON.stringify(s) === mineBefore) pass(`existing show: asked first, "Keep my show" left it untouched`);
    else fail(`existing show: asked=${asked}, changed=${JSON.stringify(s) !== mineBefore}`);
    if (/utm_source=city-page/.test(page.url()) && !/round=/.test(page.url())) pass("utm_source kept, round stripped");
    else fail(`address after load: ${page.url()}`);

    // Accept: a fresh five-round show, round 1 the city, branding kept.
    await page.goto(`${BASE}/trivia-show-maker/?round=${probe.slug}`);
    await page.waitForSelector("#confirm-modal:not([hidden])", { timeout: 5000 });
    await page.click("#confirm-modal .confirm-ok");
    await settle(page);
    s = await state(page);
    const names = s.rounds.map(r => r.name || "(empty)");
    if (s.rounds.length === 5 && s.rounds[0].questions.length === 10 && s.rounds.slice(1).every(r => !r.name) && s.game.title !== "My Pub Night")
      pass(`"Start new show" replaced it: ${names.join(" | ")}`);
    else fail(`after accepting: title "${s.game.title}", ${names.join(" | ")}`);

    // The same link again: no prompt, no change.
    const once = JSON.stringify(s);
    await page.goto(`${BASE}/trivia-show-maker/?round=${probe.slug}`);
    await settle(page);
    s = await state(page);
    if (JSON.stringify(s) === once && !(await page.isVisible("#confirm-modal"))) pass(`same link again: nothing changed ("${await toast(page)}")`);
    else fail("reloading the same round changed the show or prompted");

    const before = JSON.stringify(await state(page));
    for (const bad of ["../_content/trivia-shows/gk-night-one.tgp", "..%2F_content%2Ftrivia-shows%2Fgk-night-one.tgp", "LONDON", `${probe.slug}.json`, "a".repeat(41), "", "%00"]) {
      fetched.length = 0;
      await page.goto(`${BASE}/trivia-show-maker/?round=${bad}`);
      await settle(page);
      const hit = fetched.filter(u => /rounds\/|trivia-shows/.test(u));
      const same = JSON.stringify(await state(page)) === before;
      if (!hit.length && same) pass(`slug ${JSON.stringify(bad.slice(0, 44))}: nothing fetched, show unchanged`);
      else fail(`slug ${JSON.stringify(bad)}: fetched ${hit.join(",") || "nothing"}, show ${same ? "unchanged" : "CHANGED"}`);
    }
    for (const [slug, label] of [["zz-missing", "missing round (404)"], ["zz-malformed", "malformed JSON"], ["zz-wrong-shape", "wrong shape"]]) {
      await page.goto(`${BASE}/trivia-show-maker/?round=${slug}`);
      await settle(page);
      const same = JSON.stringify(await state(page)) === before;
      const t = await toast(page);
      if (same && /isn't available/.test(t)) pass(`${label}: show unchanged, told "${t}"`);
      else fail(`${label}: show ${same ? "unchanged" : "CHANGED"}, toast "${t}"`);
    }
    if (errors.length) fail(`page errors: ${errors.join(" | ")}`); else pass("no page errors");
    await ctx.close();
  }

  await browser.close();
  server.close();
  if (!pyOK) console.log("\n(PyMuPDF not available: PDF text checks were skipped)");
  console.log(`\n${failures ? `FAILED: ${failures}` : "all passed"}`);
  process.exitCode = failures ? 1 : 0;
})();
