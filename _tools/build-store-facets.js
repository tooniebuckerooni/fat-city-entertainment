// Per-product facets for the store filters, and the sheet the owner fills in.
//
//   node _tools/build-store-facets.js                 # dry run
//   node _tools/build-store-facets.js --write         # write assets/js/store-facets.js
//   node _tools/build-store-facets.js --sheet         # write the review CSV
//   node _tools/build-store-facets.js --from-sheet --write   # merge the CSV back
//
// WHY THIS EXISTS
// ---------------
// Nine listing pages render flat grids of up to 53 tiles with no way to narrow
// them. A host who wants a printable music bingo game under $15 has to read
// every tile. But nothing in this repo described a product as printable, hard,
// or family friendly -- those live as prose in the LemonSqueezy copy files, as
// category membership, and as a per-ROUND ageRange inside the trivia-show specs,
// which is not a per-product fact.
//
// TWO KINDS OF FACET, AND THE SPLIT IS THE WHOLE POINT
// ---------------------------------------------------
// DERIVED facets are recomputed from the repo on every run and are never stored:
// which category grid a product sits in, whether its page links a playlist,
// whether it has a free song list, how it is delivered. This is the same rule
// add-cross-sell.js and add-price-ladder.js follow -- a fact kept in a map here
// would drift the moment a product moved category.
//
// JUDGEMENT facets cannot be derived and are hand-owned in
// _content/product-facets.json: printable, challenging, family, and games. The
// last one especially. add-price-ladder.js:74 already says why:
//
//     "Games-per-pack is stated here rather than derived: a bundle page's
//      component list is prose, and guessing at it is how Countries once got
//      paired with Halloween Party."
//
// So this tool SEEDS those four where the repo genuinely proves them and leaves
// the rest null. A null never matches a filter, so a product is only ever
// included on a value somebody put there deliberately. Every run prints what is
// still blank, so the gaps cannot quietly become permanent.
//
// NOT HERE: "discounted". The filter reads that off the tile's own sale classes
// at runtime, so it cannot disagree with what the checkout charges.
//
// SWITCHING A CHIP OFF IS A DATA CHANGE, NOT A CODE EDIT. `hidden` in
// product-facets.json lists the chips and sorts the storefront must not offer, and
// is emitted as window.FCE_HIDDEN_FACETS for store-filters.js to honour first.
// That is the same reason this file exists at all: a merchandising decision should
// not need a developer. It is also non-destructive -- hiding `family` does not
// touch a single family value, so turning it back on costs nothing.
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
const WRITE = args.includes("--write");
const SHEET = args.includes("--sheet");
const FROM_SHEET = args.includes("--from-sheet");

const DATA = path.join(REPO, "_content", "product-facets.json");
const OUT = path.join(REPO, "assets", "js", "store-facets.js");
const CSV = path.join(REPO, "_tools", "product-facets-sheet.csv");

// The grids a product can sit in. Membership is the strongest derived signal we
// have: c11 and c6 are disjoint (53 and 18, verified), so music-vs-trivia needs
// no judgement at all.
const GRIDS = {
  music: "store/c11/musicdoboff/index.html",
  shows: "store/c6/triviagameshows/index.html",
  eras: "store/c33/Eras.html",
  holidays: "store/c40/holidays/index.html",
  bundles: "store/c34/Music_Bingo_&_Trivia_Bundles.html",
  hard: "store/c42/hardgames/index.html",
  virtual: "store/c41/virtualevents/index.html",
};

// Delivery is stated, not guessed: these four are the exceptions
// add-delivery-note.js already maintains, and p18 sells on Amazon.
const DELIVERY = { p137: "booking", p140: "booking", p65: "tool", p3: "ships", p18: "amazon", p900: "amazon" };

// An occasion is only labelled from the product's OWN title, and only for a
// product the Holidays grid already carries. That is a word match on the page's
// own words, not a similarity match between two products.
const OCCASIONS = [
  [/halloween/i, "halloween"], [/christmas|xmas/i, "christmas"],
  [/valentine/i, "valentines"], [/st\.? ?patrick/i, "stpatricks"],
  [/easter/i, "easter"], [/thanksgiving/i, "thanksgiving"],
  [/new year/i, "newyear"], [/mother/i, "mothersday"],
  [/father/i, "fathersday"], [/april fool/i, "aprilfools"],
];

function gridMembers(rel) {
  const file = path.join(REPO, rel);
  if (!fs.existsSync(file)) return new Set();
  const html = fs.readFileSync(file, "utf8");
  const at = html.indexOf('id="wsite-com-category-product-group"');
  if (at === -1) return new Set();
  const body = html.slice(at);
  // Permissive on purpose: the stricter form in add-store-tile.js skips the
  // sold-out tile, which would make p3 invisible to the filters.
  const RE = /<div class="wsite-com-category-product(?:-featured)?[^"]*" data-id="(\d+)"/g;
  const out = new Set();
  let m;
  while ((m = RE.exec(body))) out.add("p" + m[1]);
  return out;
}

// The biggest HTML file in store/pNN is the product page; a pNN dir can hold a
// legacy long-filename duplicate alongside it.
function pageOf(pid) {
  const dir = path.join(REPO, "store", pid);
  if (!fs.existsSync(dir)) return null;
  let best = null, size = -1;
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith(".html")) continue;
    const s = fs.statSync(path.join(dir, f)).size;
    if (s > size) { size = s; best = path.join(dir, f); }
  }
  return best;
}

const grids = {};
for (const [k, rel] of Object.entries(GRIDS)) grids[k] = gridMembers(rel);

const songLists = require(path.join(REPO, "_content", "song-lists.json"));
const songListPids = new Set();
for (const entry of Object.values(songLists)) {
  const m = (entry.url || "").match(/\/store\/(p\d+)\//);
  if (m) songListPids.add(m[1]);
}

// Seeds for the judgement facets, from the only evidence the repo actually has.
//
// The games count is READ OFF THE PAGE rather than copied into a map here, for
// the reason add-price-ladder.js:74 gives about guessing at a component list.
// Three shapes state it in the page's own words:
//
//   * a bundle's cross-sell block:  "<strong>5 games in this pack:</strong>"
//   * a club's own button label:    "Get All 50 Games"
//   * the product's own title:      "...Music Bingo 5-Pack", "(4-Pack)"
//   * a single's cross-sell block:  "Also in a pack:" / "Hosting every week?"
//     -- those lines are only ever written onto a stand-alone game, so it is one
//   * last, a product the site itself files under Music Bingo or Pre-made Trivia
//     Shows but NOT under Bundles, which is the site's own statement that it is
//     one game
//
// Anything none of those covers stays null and goes on the review sheet. That is
// the right answer for the four Q&A question banks, the Zoom Party booking and
// the handbook, none of which is a countable number of game nights, and for
// p189, whose three components are two formats and want a human's eye.
function seedFor(pid, derived, html, title) {
  const seed = { printable: null, challenging: null, family: null, games: null };
  // A music bingo pack is cards you print; a pre-made trivia show is a
  // presentation that wants a screen. A bundle carrying both is left blank.
  if (derived.type === "music-bingo") seed.printable = true;
  else if (derived.type === "trivia-show") seed.printable = false;
  // The only per-product difficulty signal on the site is the Hard Games grid.
  // Everything else stays null rather than being asserted as easy.
  if (grids.hard.has(pid)) seed.challenging = true;

  const inPack = html.match(/<strong>(\d+) games in this pack:<\/strong>/);
  const club = html.match(/Get All (\d+) Games/);
  const packName = title.match(/(\d+)\s*[-–—]?\s*pack/i);
  const isSingle = /fce-cross-sell"><strong>(?:Also in a pack|Part of a pack|Hosting every week)/.test(html);
  const soloOnAGameGrid = (grids.music.has(pid) || grids.shows.has(pid)) && !grids.bundles.has(pid);
  if (inPack) seed.games = Number(inPack[1]);
  else if (club) seed.games = Number(club[1]);
  else if (packName) seed.games = Number(packName[1]);
  else if (isSingle) seed.games = 1;
  else if (songListPids.has(pid) && !grids.bundles.has(pid)) seed.games = 1;
  else if (soloOnAGameGrid) seed.games = 1;
  return seed;
}

let stored = { bestsellers: [], hidden: [], products: {} };
if (fs.existsSync(DATA)) stored = JSON.parse(fs.readFileSync(DATA, "utf8"));

// ------------------------------------------------------------ merge the sheet
if (FROM_SHEET) {
  if (!fs.existsSync(CSV)) { console.log(`no sheet at ${path.relative(REPO, CSV)} — run --sheet first`); process.exit(1); }
  const rows = fs.readFileSync(CSV, "utf8").trim().split(/\r?\n/);
  const head = rows.shift().split(",").map((h) => h.trim());
  const idx = (n) => head.indexOf(n);
  let merged = 0;
  for (const row of rows) {
    const cells = row.split(",").map((c) => c.trim());
    const pid = cells[idx("product")];
    if (!/^p\d+$/.test(pid)) continue;
    const rec = stored.products[pid] || {};
    for (const key of ["printable", "challenging", "family"]) {
      const v = cells[idx(key)];
      rec[key] = v === "yes" ? true : v === "no" ? false : null;
    }
    const g = cells[idx("games")];
    rec.games = /^\d+$/.test(g) ? Number(g) : null;
    stored.products[pid] = rec;
    merged++;
  }
  console.log(`merged ${merged} row(s) from ${path.relative(REPO, CSV)}`);
  if (WRITE) fs.writeFileSync(DATA, JSON.stringify(stored, null, 2) + "\n");
  else console.log("DRY RUN — nothing written. Re-run with --write.");
}

// -------------------------------------------------------------- build facets
const pids = fs.readdirSync(path.join(REPO, "store")).filter((d) => /^p\d+$/.test(d)).sort();
const facets = {};
const gaps = { printable: 0, challenging: 0, family: 0, games: 0 };
let unknown = 0;

for (const pid of pids) {
  const file = pageOf(pid);
  if (!file) continue;
  const html = fs.readFileSync(file, "utf8");
  if (/http-equiv="refresh"/i.test(html)) continue;
  // A staged product has no tile, so nothing would ever filter it.
  const onAGrid = Object.values(grids).some((s) => s.has(pid));
  if (!onAGrid) continue;

  const title = (html.match(/<h1 id="wsite-com-product-title"[^>]*>([\s\S]*?)<\/h1>/) || [])[1] || "";
  const derived = {
    type: grids.music.has(pid) ? "music-bingo" : grids.shows.has(pid) ? "trivia-show" : null,
    bundle: grids.bundles.has(pid) || null,
    era: grids.eras.has(pid) || null,
    playlist: /open\.spotify\.com|music\.apple\.com|itunes\.apple\.com/i.test(html) || null,
    songlist: songListPids.has(pid) || null,
    delivery: DELIVERY[pid] || "download",
    occasion: null,
  };
  if (grids.holidays.has(pid)) {
    for (const [re, name] of OCCASIONS) if (re.test(title)) { derived.occasion = name; break; }
  }

  const seed = seedFor(pid, derived, html, title);
  const held = stored.products[pid] || {};
  // A hand-set value always wins; the seed only fills a blank.
  const judged = {};
  for (const k of ["printable", "challenging", "family", "games"]) {
    judged[k] = held[k] === undefined || held[k] === null ? seed[k] : held[k];
    if (judged[k] === null) gaps[k]++;
  }
  facets[pid] = Object.assign({}, derived, judged);
}

// A stored entry for a product that no longer exists is rot.
for (const pid of Object.keys(stored.products)) {
  if (!facets[pid]) { console.log(`  PROBLEM: facets for ${pid}, which has no tile on any listing page`); unknown++; }
}
for (const pid of stored.bestsellers) {
  if (!facets[pid]) { console.log(`  PROBLEM: bestseller ${pid}, which has no tile on any listing page`); unknown++; }
}

const banner =
  "// GENERATED by _tools/build-store-facets.js — do not edit.\n" +
  "// Source of truth for the judgement facets is _content/product-facets.json;\n" +
  "// everything else is derived from the listing grids and the product pages.\n";
const body =
  banner +
  "window.FCE_FACETS = " + JSON.stringify(facets, null, 0) + ";\n" +
  "window.FCE_BESTSELLERS = " + JSON.stringify(stored.bestsellers || []) + ";\n" +
  "window.FCE_HIDDEN_FACETS = " + JSON.stringify(stored.hidden || []) + ";\n";

const had = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "";
const changed = had !== body;

if (SHEET) {
  const cols = ["product", "name", "type", "on_a_grid", "printable", "challenging", "family", "games"];
  const lines = [cols.join(",")];
  for (const pid of Object.keys(facets)) {
    const f = facets[pid];
    const file = pageOf(pid);
    const raw = (fs.readFileSync(file, "utf8").match(/<h1 id="wsite-com-product-title"[^>]*>([\s\S]*?)<\/h1>/) || [])[1] || "";
    const name = raw.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/\s+/g, " ").replace(/,/g, "").trim();
    const yn = (v) => (v === true ? "yes" : v === false ? "no" : "");
    lines.push([pid, name, f.type || "", Object.entries(grids).filter(([, s]) => s.has(pid)).map(([k]) => k).join(" "),
      yn(f.printable), yn(f.challenging), yn(f.family), f.games == null ? "" : f.games].join(","));
  }
  if (WRITE) { fs.writeFileSync(CSV, lines.join("\n") + "\n"); console.log(`wrote ${path.relative(REPO, CSV)} (${lines.length - 1} rows)`); }
  else console.log(`would write ${path.relative(REPO, CSV)} (${lines.length - 1} rows) — add --write`);
}

console.log(`\nproducts with a tile : ${Object.keys(facets).length}`);
console.log(`still blank          : printable ${gaps.printable}, challenging ${gaps.challenging}, family ${gaps.family}, games ${gaps.games}`);
console.log(`best sellers ranked  : ${(stored.bestsellers || []).length}   (empty = the sort is not offered)`);
console.log(`chips switched off   : ${(stored.hidden || []).join(", ") || "(none)"}`);
if (!SHEET) {
  console.log(`assets/js/store-facets.js: ${changed ? "(1 would change)" : "up to date"}`);
  if (WRITE && changed) fs.writeFileSync(OUT, body);
  if (!WRITE && changed) console.log("re-run with --write");
}
if (unknown) process.exitCode = 1;
