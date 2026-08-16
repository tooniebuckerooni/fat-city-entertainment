// Add a "Complete Your Night" CTA box to the end of blog posts.
//
//   node add-blog-cta.js                 report only
//   node add-blog-cta.js --write         apply
//
// Targets the 5 July 2026 blog posts. Inserts a horizontal rule + CTA box
// between the closing </div> of blog-content and the blog-social div.
// Idempotent — skips files that already contain the CTA.

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const POSTS = [
  'triviahostresources/new-music-bingo-packs-worth-trying/index.html',
  'triviahostresources/fall-trivia-night-ideas-to-kick-off-the-season/index.html',
  'triviahostresources/how-to-run-a-music-bingo-night/index.html',
  'triviahostresources/19-music-bingo-games-our-crowds-cant-get-enough-of/index.html',
  'triviahostresources/decade-by-decade-music-bingo-playlist-guide/index.html',
  'triviahostresources/how-to-build-a-custom-trivia-night-with-the-trivia-show-maker/index.html',
];

const CTA_HTML = `
<div><div style="height: 30px; overflow: hidden; width: 100%;"></div>
<hr class="styled-hr" style="width:100%;">
<div style="height: 30px; overflow: hidden; width: 100%;"></div></div>

<h2 class="wsite-content-title">Complete Your Night</h2>
<div class="paragraph">You've got the ideas — now grab a themed pack to match, or go all-in with Gold 50 and get every game we make, including the ones we haven't released yet.<br></div>
<div class="paragraph">
<a class="fce-cta" href="/trivia-store.html">Shop Packs</a>
&nbsp;&nbsp;
<a class="fce-cta-secondary" href="/store/p112/GoldClub.html">Explore Gold 50</a>
</div>
`;

const write = process.argv.includes('--write');
let updated = 0;
let skipped = 0;

for (const rel of POSTS) {
  const filePath = path.join(ROOT, rel);
  let html = fs.readFileSync(filePath, 'utf8');

  if (html.includes('Complete Your Night')) {
    console.log(`  SKIP (already present): ${rel}`);
    skipped++;
    continue;
  }

  // Insert before the blog-social div
  const marker = '<div class="blog-social';
  const idx = html.indexOf(marker);
  if (idx === -1) {
    console.log(`  SKIP (no blog-social marker): ${rel}`);
    skipped++;
    continue;
  }

  html = html.slice(0, idx) + CTA_HTML + '\n' + html.slice(idx);

  if (write) {
    fs.writeFileSync(filePath, html, 'utf8');
  }
  updated++;
  console.log(`  ${write ? 'UPDATED' : 'WOULD UPDATE'}: ${rel}`);
}

console.log(`\n${updated} files ${write ? 'updated' : 'would be updated'}, ${skipped} skipped.`);
if (!write && updated > 0) {
  console.log('Run with --write to apply.');
}
