// Surface the playlist, which is the thing competitors don't ship.
//
// 56 music bingo packs link a ready-made Spotify playlist and 54 an Apple Music
// one — the host doesn't have to find and sequence 33 songs themselves. That is
// the single strongest reason to buy these over a competitor's card PDF, and it
// was sitting as a plain text link at the very bottom of the description, below
// the printing instructions.
//
// This puts a one-line statement of it immediately above the buy button, where
// the decision actually happens. It restates a fact the page already proves with
// its own links (which stay where they are, just above) rather than adding a
// second copy of them.
//
// Only pages that genuinely link a playlist get the badge, and the wording
// matches which services that page actually links.
//
//   node _tools/add-playlist-badge.js            # dry run
//   node _tools/add-playlist-badge.js --write
//
// Idempotent — an existing badge is replaced.
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const WRITE = process.argv.includes("--write");
const MARK_OPEN = '<p class="fce-playlist-badge">';

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

  const services =
    spotify && apple ? "Spotify and Apple Music playlists" :
    spotify ? "Spotify playlist" : "Apple Music playlist";

  const badge =
    `${MARK_OPEN}<strong>Playlist included.</strong> This pack comes with a ` +
    `ready-made ${services} — press play and host. No playlist building, no ` +
    `hunting for songs.</p>\n`;

  // Drop an earlier badge before inserting the current one.
  html = html.replace(/<p class="fce-playlist-badge">[\s\S]*?<\/p>\n?/i, () => { replaced++; return ""; });

  const anchor = '<div id="wsite-com-product-buy">';
  const at = html.indexOf(anchor);
  if (at === -1) { skipped++; continue; }

  html = html.slice(0, at) + badge + html.slice(at);

  if (html !== before) {
    if (WRITE) fs.writeFileSync(file, html);
    added++;
  }
}

console.log(`product pages       : ${products.length}`);
console.log(`badge on page       : ${added}   (${replaced} refreshed)`);
console.log(`no playlist linked  : ${noPlaylist}`);
console.log(`skipped             : ${skipped}`);
if (!WRITE) console.log("\nDRY RUN — nothing written. Re-run with --write.");
