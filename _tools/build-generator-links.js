// Short, printable handoff links that open Bingo Card Generator 2.0 with a game
// already loaded.
//
//   node _tools/build-generator-links.js            # dry run
//   node _tools/build-generator-links.js --write
//   node _tools/build-generator-links.js --patch    # print the generator patch
//
// WHY A STUB ON OUR DOMAIN AND NOT THE RAW LINK
// ---------------------------------------------
// The generator takes the whole game in the query string, so the real link is
// about 1,700 characters. That is fine in an href and hopeless in print, in a
// QR code, or read out loud. Worse, it is unfixable once printed: the PDFs in
// _content/redemption-docs/ ship inside a paid download, and a customer who
// bought in October still has theirs in March.
//
// So the thing that gets printed is /cards/<slug>/, a file we own, and the long
// payload lives in that file. If the generator changes its param shape, or the
// song list is corrected, re-run this and every printed link keeps working.
//
// THE PAYLOAD SHAPE IS THE GENERATOR'S OWN
// -----------------------------------------
// Generator 2.0 already serialises a whole game for its share links:
//   btoa(encodeURIComponent(JSON.stringify(state)))
// and already has applyState() to put one back. This writes exactly that state,
// so nothing new has to be invented on the generator side — see --patch, which
// prints the handler that reads it (four lines, plus one guard).
//
// A generator that has NOT been patched ignores an unknown ?load= and shows an
// ordinary empty generator, so shipping the link early degrades to "the tool
// opened but did not fill itself in", never to an error page.
//
// NO TRACKING TAG ON THE STUB, ON PURPOSE
// ----------------------------------------
// It is a redirect, not a page anybody reads; tagging it would log a pageview
// nobody made (see CLAUDE.md on GA4 tag quality). The click is measured on the
// far side instead, from the UTMs this appends.
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const WRITE = process.argv.includes("--write");
const PATCH = process.argv.includes("--patch");

const ORIGIN = "https://www.fatcityentertainment.com";
const GENERATOR = "https://bingocardgenerator.online/";
const MARKER = "fce:generator-link";
// The generator declines to build a share link over 6,000 characters. Same
// ceiling here: past it the payload is probably going to be truncated by
// something between us and the browser.
const MAX_URL = 6000;

const SPEC = path.join(REPO, "_content/generator-links.json");
const SONGS = path.join(REPO, "_content/song-lists.json");

const PATCH_TEXT = `
Paste this into bingocardgenerator.online's index.html, in the INIT block at the
very bottom, immediately after the line:

    if(qp.has('card'))showCard(qp.get('card'));

--------------------------------------------------------------------------
// A preloaded game handed over from a link (a redemption PDF, an email, a
// product page). Same encoding as the ?card= share links, but it fills the
// editor in rather than rendering one finished card.
if(qp.has('load')){
  try{
    applyState(JSON.parse(decodeURIComponent(atob(qp.get('load')))));
    toast('Your game came with you. Pick a look and generate.','ok');
  }catch(e){toast('That preload link is not valid.','err');}
}
--------------------------------------------------------------------------

Then change the autosave-restore guard on the next line from:

    if(!qp.has('card')){

to:

    if(!qp.has('card') && !qp.has('load')){

That second edit is not optional. Without it a returning visitor's autosaved
work is restored on top of the preload and silently wins, so the link appears to
do nothing for exactly the people who use the generator most.
`;

const read = (p) => fs.readFileSync(p, "utf8");
const spec = JSON.parse(read(SPEC));
const songs = JSON.parse(read(SONGS));

// The generator's own encoding: btoa(encodeURIComponent(JSON.stringify(st))).
const encodeState = (st) =>
  Buffer.from(encodeURIComponent(JSON.stringify(st)), "utf8").toString("base64");

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function squaresFor(link) {
  if (Array.isArray(link.squares) && link.squares.length) return link.squares;
  if (!link.songList) throw new Error(`${link.slug}: needs either squares or songList`);
  const pack = songs[link.songList];
  if (!pack) throw new Error(`${link.slug}: no song list named "${link.songList}"`);
  // Song titles only. The square is what the host reads off the card, and the
  // artist is not on the card. This publishes nothing that the free song list
  // page does not already publish in full.
  return pack.tracks.map((t) => t.song);
}

function destination(link) {
  const squares = squaresFor(link);
  const st = {
    v: 1,
    t: link.title,
    w: squares.join("\n"),
    fn: link.font || "oswald",
    th: link.theme || "eco",
    fz: 11,
    fo: true,
    fp: "center",
    ft: link.freeText || "FREE",
    gw: 5,
    gh: 5,
    fm: "simple",
    br: true,
    md: "print",
    ly: "portrait",
    pc: 5,
    sc: 10,
    bo: false,
  };
  if (st.th === "custom") {
    if (!Array.isArray(link.colours) || link.colours.length !== 5) {
      throw new Error(`${link.slug}: theme "custom" needs exactly 5 colours`);
    }
    st.cc = link.colours;
  }
  const utm = new URLSearchParams({
    utm_source: "fatcityentertainment",
    utm_medium: "referral",
    utm_campaign: "game-preload",
    utm_content: link.utm_content || link.slug,
  });
  const url = `${GENERATOR}?load=${encodeURIComponent(encodeState(st))}&${utm}`;
  return { url, squares };
}

function stub(link, url) {
  const short = `/cards/${link.slug}/`;
  return `<!DOCTYPE html>
<!-- ${MARKER} -->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<meta http-equiv="refresh" content="0;url=${esc(url)}">
<title>Opening ${esc(link.name)} in the Bingo Card Generator</title>
<style>
  body{margin:0;padding:48px 20px;font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;color:#222;background:#fff;text-align:center}
  a{color:#0b62c4}
  .wrap{max-width:520px;margin:0 auto}
</style>
</head>
<body>
<div class="wrap">
  <p>Opening <strong>${esc(link.name)}</strong> in the Bingo Card Generator.</p>
  <p>If nothing happens, <a href="${esc(url)}">open it here</a>.</p>
</div>
<script>location.replace(${JSON.stringify(url)});</script>
</body>
</html>
`;
}

if (PATCH) {
  console.log(PATCH_TEXT);
  process.exit(0);
}

let changed = 0;
for (const link of spec.links) {
  const { url, squares } = destination(link);
  const rel = path.join("cards", link.slug, "index.html");
  const abs = path.join(REPO, rel);
  const html = stub(link, url);
  const before = fs.existsSync(abs) ? read(abs) : null;

  console.log(`${link.slug}`);
  console.log(`  printable  ${ORIGIN}/cards/${link.slug}/`);
  console.log(`  squares    ${squares.length}`);
  console.log(`  url length ${url.length}`);
  if (url.length > MAX_URL) {
    console.log(`  ** TOO LONG ** over ${MAX_URL} characters, trim the list`);
    process.exitCode = 1;
    continue;
  }
  if (before === html) {
    console.log(`  unchanged  ${rel}`);
    continue;
  }
  changed++;
  console.log(`  ${before === null ? "would create" : "would update"}: ${rel}`);
  if (WRITE) {
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, html);
    console.log(`  ${before === null ? "created" : "updated"}: ${rel}`);
  }
}

console.log(`\n${WRITE ? "wrote" : "would update"}: ${changed} file(s)`);
if (!WRITE && changed) console.log("re-run with --write");
if (changed) {
  console.log(
    "\nThe generator needs a ?load= handler for these to fill anything in.\n" +
    "Run: node _tools/build-generator-links.js --patch"
  );
}
