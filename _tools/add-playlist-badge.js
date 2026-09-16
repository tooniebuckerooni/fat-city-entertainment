// Surface the playlist, which is the thing competitors don't ship.
//
// 56 music bingo packs link a ready-made Spotify playlist and 54 an Apple Music
// one — the host doesn't have to find and sequence 33 songs themselves. That is
// the single strongest reason to buy these over a competitor's card PDF, and it
// was sitting as a plain text link at the very bottom of the description, below
// the printing instructions.
//
// This puts a one-line statement of it directly under the description, where
// the page has just finished describing what is in the box. It restates a fact
// the page already proves with its own links (which stay where they are, just
// above) rather than adding a second copy of them.
//
// Only pages that genuinely link a playlist get the badge, and the wording
// matches which services that page actually links.
//
//   node _tools/add-playlist-badge.js            # dry run
//   node _tools/add-playlist-badge.js --write
//
// WHERE IT GOES
// -------------
// Into the <!-- fce:playlist-slot --> that reorder-product-cta.js plants on every
// product page. It used to find its spot with
// indexOf('<div id="wsite-com-product-buy">') and insert just above it, which was
// right while the buy button was the last thing on the page. Once the button
// moved up under the price (Sept 2026) that same anchor would have put the
// playlist callout back BETWEEN the price and the button -- reintroducing the
// exact box the move was meant to clear. A slot the tool fills, rather than an
// anchor it hunts for, cannot drift that way again.
//
// Idempotent — the slot is replaced wholesale, so a clean re-run reports 0.
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const WRITE = process.argv.includes("--write");
const MARK_OPEN = '<p class="fce-playlist-badge">';
const SLOT_OPEN = "<!-- fce:playlist-slot -->";
const SLOT_CLOSE = "<!-- /fce:playlist-slot -->";
const SLOT_RE = /<!-- fce:playlist-slot -->[\s\S]*?<!-- \/fce:playlist-slot -->/;

const products = [];
for (const dir of fs.readdirSync(path.join(REPO, "store"))) {
  const full = path.join(REPO, "store", dir);
  if (!/^p\d+$/.test(dir) || !fs.statSync(full).isDirectory()) continue;
  for (const f of fs.readdirSync(full)) {
    if (f.endsWith(".html")) products.push(path.join(full, f));
  }
}

let added = 0, replaced = 0, noPlaylist = 0, skipped = 0;

for (const file of products.sort()) {
  let html = fs.readFileSync(file, "utf8");
  const before = html;

  if (/http-equiv="refresh"/i.test(html)) { skipped++; continue; }

  const spotify = /open\.spotify\.com/i.test(html);
  const apple = /music\.apple\.com|itunes\.apple\.com/i.test(html);
  if (!spotify && !apple) { noPlaylist++; continue; }

  // The article belongs to the phrase, not to the sentence: a page linking both
  // services used to read "comes with A ready-made Spotify and Apple Music
  // playlistS", which was live on every two-service pack.
  const services =
    spotify && apple ? "ready-made Spotify and Apple Music playlists" :
    spotify ? "a ready-made Spotify playlist" : "a ready-made Apple Music playlist";

  // No em-dash: this is customer-facing copy, and the rule says fix it in the
  // template rather than on the generated page. It was on every badged page.
  const badge =
    `${MARK_OPEN}<strong>Playlist included.</strong> This pack comes with ` +
    `${services}, so you press play and host. No playlist building, no ` +
    `hunting for songs.</p>`;

  // Fill the slot wholesale. A function replacer, always: the badge is plain
  // prose today, but "$1" in a replacement string is a backreference and this
  // repo has been bitten twice by exactly that.
  if (!SLOT_RE.test(html)) {
    console.log(`  PROBLEM: no playlist slot in ${path.relative(REPO, file)} — run reorder-product-cta.js first`);
    skipped++; process.exitCode = 1; continue;
  }
  const want = `${SLOT_OPEN}\n${badge}\n${SLOT_CLOSE}`;
  if (html.match(SLOT_RE)[0] !== want) replaced++;
  html = html.replace(SLOT_RE, () => want);

  if (html !== before) {
    if (WRITE) fs.writeFileSync(file, html);
    added++;
  }
}

console.log(`product pages       : ${products.length}`);
console.log(`${WRITE ? "updated" : "would update"}: ${added} page(s)   (${replaced} slot(s) rewritten)`);
console.log(`no playlist linked  : ${noPlaylist}`);
console.log(`skipped             : ${skipped}`);
if (!WRITE) console.log("\nDRY RUN — nothing written. Re-run with --write.");
