// Add contextual internal cross-links to blog posts that have none.
//
//   node add-blog-crosslinks.js               report only
//   node add-blog-crosslinks.js --write       apply
//
// Inserts a short "More on [topic]" paragraph with 2-3 links before the
// blog-social div. Idempotent — skips posts that already contain a
// crosslink block (marked by <!-- fce:crosslinks -->).
//
// The link selection is keyword-driven: the script reads each post's title
// and body, matches against topic buckets, and picks the most relevant
// links from a curated set. Posts that already have 2+ inline blog-to-blog
// links are also skipped — they don't need the help.

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BLOG = path.join(ROOT, 'triviahostresources');

const write = process.argv.includes('--write');

// Posts we never touch (they already have good linking or are special)
const SKIP_SLUGS = new Set([
  'how-to-run-a-music-bingo-night',
  'decade-by-decade-music-bingo-playlist-guide',
  '19-music-bingo-games-our-crowds-cant-get-enough-of',
  'new-music-bingo-packs-worth-trying',
  'fall-trivia-night-ideas-to-kick-off-the-season',
  'how-to-build-a-custom-trivia-night-with-the-trivia-show-maker',
  'our-top-10-most-popular-music-bingo-games-by-sales-over-2023-and-2024-so-far',
  'experience-nostalgia-with-our-new-90s-rb-music-bingo-game',
]);

// Curated link targets
const LINKS = {
  hostingGuide: { href: '/triviahostresources/how-to-run-a-music-bingo-night/', text: 'How to Run a Music Bingo Night' },
  playlistGuide: { href: '/triviahostresources/decade-by-decade-music-bingo-playlist-guide/', text: 'The Decade-by-Decade Playlist Guide' },
  crowdFaves: { href: '/triviahostresources/19-music-bingo-games-our-crowds-cant-get-enough-of/', text: 'Games Our Crowds Can’t Get Enough Of' },
  newPacks: { href: '/triviahostresources/new-music-bingo-packs-worth-trying/', text: '6 New Music Bingo Packs Worth Trying' },
  fallIdeas: { href: '/triviahostresources/fall-trivia-night-ideas-to-kick-off-the-season/', text: 'Fall Trivia Night Ideas' },
  triviaShowMaker: { href: '/triviahostresources/how-to-build-a-custom-trivia-night-with-the-trivia-show-maker/', text: 'How to Build a Custom Trivia Night with the Trivia Show Maker' },
  triviaStore: { href: '/trivia-store.html', text: 'Browse the Trivia Store' },
  bingoGenerator: { href: '/bingocardgenerator.html', text: 'the free Bingo Card Generator' },
  top10: { href: '/triviahostresources/our-top-10-most-popular-music-bingo-games-by-sales-over-2023-and-2024-so-far/', text: 'Our Top 10 Most Popular Music Bingo Games' },
};

// Topic buckets: keyword patterns (matched against lowercase title + body excerpt)
// and the links to use for each. First match wins — order matters.
const BUCKETS = [
  {
    name: 'trivia-hosting',
    match: /trivia.*(host|night|show|present|run|tip)|host.*(trivia|game show)|pub.*(quiz|trivia)|game show.*host/,
    links: [LINKS.triviaShowMaker, LINKS.hostingGuide, LINKS.triviaStore],
  },
  {
    name: 'bingo-generator',
    match: /bingo.*(card|generator|maker|create|random|custom)|card.*(generator|maker)/,
    links: [LINKS.hostingGuide, LINKS.playlistGuide, LINKS.crowdFaves],
  },
  {
    name: 'music-bingo-hosting',
    match: /how to.*(music bingo|bingo night|bingo event)|run.*(music bingo|bingo night)|start.*(music bingo|bingo night)|host.*(music bingo|bingo)/,
    links: [LINKS.hostingGuide, LINKS.playlistGuide, LINKS.triviaStore],
  },
  {
    name: 'music-bingo-game',
    match: /music.*(bingo|doboff)|bingo.*(card|game|download|available|store)|doboff/,
    links: [LINKS.crowdFaves, LINKS.playlistGuide, LINKS.triviaStore],
  },
  {
    name: 'virtual-events',
    match: /virtual|zoom|online|streaming|remote/,
    links: [LINKS.triviaShowMaker, LINKS.hostingGuide, LINKS.triviaStore],
  },
  {
    name: 'holiday-seasonal',
    match: /christmas|halloween|valentine|thanksgiving|st\.?\s*patrick|holiday|easter|new year|fall season|summer/,
    links: [LINKS.crowdFaves, LINKS.hostingGuide, LINKS.triviaStore],
  },
  {
    name: 'corporate-events',
    match: /corporate|team.?building|company|office|event planning/,
    links: [LINKS.triviaShowMaker, LINKS.fallIdeas, LINKS.triviaStore],
  },
  {
    name: 'general-entertainment',
    match: /.*/,
    links: [LINKS.crowdFaves, LINKS.hostingGuide, LINKS.triviaStore],
  },
];

function buildCrosslinksHtml(links, selfSlug) {
  // Filter out any link that points to the post itself
  const filtered = links.filter(l => !l.href.includes(selfSlug));
  if (filtered.length === 0) return null;
  const use = filtered.slice(0, 3);
  const parts = use.map(l => `<a href="${l.href}">${l.text}</a>`);
  let sentence;
  if (parts.length === 3) {
    sentence = `${parts[0]}, ${parts[1]}, and ${parts[2]}`;
  } else if (parts.length === 2) {
    sentence = `${parts[0]} and ${parts[1]}`;
  } else {
    sentence = parts[0];
  }
  return `<!-- fce:crosslinks -->\n<div class="paragraph" style="margin-top:1.5em;"><strong>Keep reading:</strong> ${sentence}.<br></div>\n<!-- /fce:crosslinks -->`;
}

function countExistingBlogLinks(html, selfSlug) {
  const contentMatch = html.match(/<div class="blog-content">([\s\S]*?)<\/div>\s*(?:<div[^>]*>)?\s*(?:<div class="blog-social|<div class="blog-post-sep)/);
  if (!contentMatch) return 0;
  const content = contentMatch[1];
  const re = /href="\/triviahostresources\/([^"]+)"/g;
  let count = 0;
  let m;
  while ((m = re.exec(content)) !== null) {
    if (!m[1].includes(selfSlug)) count++;
  }
  return count;
}

// Gather all blog post directories
const dirs = fs.readdirSync(BLOG).filter(d => {
  const full = path.join(BLOG, d, 'index.html');
  return !['archives', 'category', 'previous'].includes(d)
    && fs.existsSync(full)
    && fs.statSync(path.join(BLOG, d)).isDirectory();
});

let updated = 0;
let skipped = 0;
let alreadyLinked = 0;

for (const slug of dirs) {
  if (SKIP_SLUGS.has(slug)) {
    skipped++;
    continue;
  }

  const filePath = path.join(BLOG, slug, 'index.html');
  let html = fs.readFileSync(filePath, 'utf8');

  // Skip if already has crosslinks
  if (html.includes('fce:crosslinks')) {
    console.log(`  SKIP (already has crosslinks): ${slug}`);
    skipped++;
    continue;
  }

  // Skip if the post already has 2+ blog-to-blog links in content
  const existingLinks = countExistingBlogLinks(html, slug);
  if (existingLinks >= 2) {
    console.log(`  SKIP (${existingLinks} existing blog links): ${slug}`);
    alreadyLinked++;
    continue;
  }

  // Extract title for topic matching — use title only, not body HTML
  // (body HTML includes nav with "trivia" and "hosting" everywhere)
  const titleMatch = html.match(/blog-title-link[^>]*>([^<]+)/);
  const title = titleMatch ? titleMatch[1].toLowerCase() : slug.replace(/-/g, ' ');
  const matchText = title + ' ' + slug.replace(/-/g, ' ');

  // Find the right bucket
  let bucket = null;
  for (const b of BUCKETS) {
    if (b.match.test(matchText)) {
      bucket = b;
      break;
    }
  }
  if (!bucket) continue;

  const crosslinksHtml = buildCrosslinksHtml(bucket.links, slug);
  if (!crosslinksHtml) {
    skipped++;
    continue;
  }

  // Insert before blog-social
  const marker = '<div class="blog-social';
  const idx = html.indexOf(marker);
  if (idx === -1) {
    console.log(`  SKIP (no blog-social marker): ${slug}`);
    skipped++;
    continue;
  }

  html = html.slice(0, idx) + crosslinksHtml + '\n' + html.slice(idx);

  if (write) {
    fs.writeFileSync(filePath, html, 'utf8');
  }
  updated++;
  console.log(`  ${write ? 'UPDATED' : 'WOULD UPDATE'} [${bucket.name}]: ${slug}`);
}

console.log(`\n${updated} files ${write ? 'updated' : 'would be updated'}, ${skipped} skipped, ${alreadyLinked} already well-linked.`);
if (!write && updated > 0) {
  console.log('Run with --write to apply.');
}
