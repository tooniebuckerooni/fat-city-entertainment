// Publish a partial sample tracklist on each single-game product page.
//
//   node add-tracklists.js          report only
//   node add-tracklists.js --write  apply
//
// WHY
// ---
// All 83 store product pages sit between 184 and 450 words, and roughly 90% of
// that is boilerplate shared with every other product page — strip the shell and
// each one carries about forty unique words. That is why Google was leaving them
// in "Crawled – currently not indexed": not length on its own, but that they are
// near-duplicates of each other. Padding them with more shared copy would have
// made it worse.
//
// A sample tracklist is the one thing that is genuinely unique per product, and
// it matches real search intent — "what songs are in cover tunes music bingo"
// is a query people actually type.
//
// WHAT IS AND ISN'T PUBLISHED  <-- read before changing anything here
// -------------------------------------------------------------------
// `_content/tracklists.json` holds ONLY the excerpt that appears on the page:
// song title and artist, for about a third of each pack's songs. It is
// generated from the owner's full callsheet PDFs, and **those PDFs must never
// be committed to this repo**. This repo is public — GitHub Pages serves it, and
// the robots.txt Disallow on /_tools/ and /_content/ stops polite crawlers, not
// anyone with a URL. The full callsheet is the product people pay for.
//
// Two rules follow from that, and neither is optional:
//
//   1. Never raise the excerpt beyond a sample. A third is deliberate.
//   2. Never publish the answer column. Several packs answer on something other
//      than the song title — Anagram, Antonym Clue, Acronym, Country, Nickname,
//      TV Show, Movie, Game, Soundalike Pair. That column IS the game. The
//      generator strips it; the published JSON only ever has `song` and
//      `artist` keys.
//
// Bundles and multi-packs are deliberately excluded — they have no single
// tracklist. They are detected by having no "N Songs" line on the page.

const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const WRITE = process.argv.includes("--write");
const DATA = path.join(REPO, "_content", "tracklists.json");

const OPEN = "<!-- fce:tracklist -->";
const CLOSE = "<!-- /fce:tracklist -->";
const ANCHOR = '<div class="footer-wrap">';

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

if (!fs.existsSync(DATA)) {
  console.error("missing _content/tracklists.json");
  process.exit(1);
}
const data = JSON.parse(fs.readFileSync(DATA, "utf8"));

let changed = 0, same = 0, missing = 0, tracks = 0;

for (const [rel, info] of Object.entries(data)) {
  const file = path.join(REPO, rel);
  if (!fs.existsSync(file)) {
    console.log(`  MISSING page: ${rel}`);
    missing++;
    continue;
  }

  const rows = info.tracks
    .map((t) => {
      const artist = t.artist ? ` <span class="fce-tl-artist">${esc(t.artist)}</span>` : "";
      return `    <li><span class="fce-tl-song">${esc(t.song)}</span>${artist}</li>`;
    })
    .join("\n");

  const heading = `A sample of what&rsquo;s in this pack`;
  const sub =
    `${info.shown} of the ${info.total} songs in ` +
    `<strong>${esc(info.pack)}</strong>. The full callsheet &mdash; every song in ` +
    `play order, with the answers &mdash; comes with your download.`;

  // A call to action at the FOOT of the list matters more than it looks. This
  // block is below the buy button, and the traffic it attracts — people
  // searching "what songs are in <pack> music bingo" — lands, scrolls, reads to
  // the end, and would otherwise be at the bottom of the page with nothing to
  // click. The anchor jumps back to the page's own buy button rather than
  // linking a checkout directly, so this stays navigation and never touches
  // pricing or the LemonSqueezy wiring.
  const cta =
    `    <p class="fce-tl-cta">` +
    `<a class="fce-cta" href="#wsite-com-product-add-to-cart">Get ${esc(info.pack)}</a>` +
    `<span class="fce-tl-cta-note">250 randomized cards, the full callsheet, ` +
    `and ready-made Spotify &amp; Apple Music playlists.</span></p>\n`;

  const block =
    `${OPEN}\n<section class="fce-tracklist">\n  <div class="fce-tracklist-inner">\n` +
    `    <h2>${heading}</h2>\n    <p>${sub}</p>\n    <ol class="fce-tl">\n${rows}\n    </ol>\n` +
    cta +
    `  </div>\n</section>\n${CLOSE}\n`;

  const html = fs.readFileSync(file, "utf8");
  let updated;
  const start = html.indexOf(OPEN);
  if (start !== -1) {
    const end = html.indexOf(CLOSE, start);
    if (end === -1) {
      console.log(`  PROBLEM: unclosed marker in ${rel}`);
      continue;
    }
    updated = html.slice(0, start) + block + html.slice(end + CLOSE.length + 1);
  } else {
    const at = html.indexOf(ANCHOR);
    if (at === -1) {
      console.log(`  PROBLEM: no footer-wrap anchor in ${rel}`);
      continue;
    }
    updated = html.slice(0, at) + block + "\n    " + html.slice(at);
  }

  if (updated === html) { same++; continue; }
  changed++;
  tracks += info.shown;
  if (WRITE) fs.writeFileSync(file, updated);
}

console.log(
  `${WRITE ? "wrote" : "would write"} ${changed} product page(s), ${tracks} sample tracks` +
  `   already current: ${same}   missing: ${missing}`
);
if (!WRITE) console.log("(dry run -- pass --write to apply)");
