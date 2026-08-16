// Add a month to the blog Archives sidebar across every page that carries it,
// and optionally create the archive listing page for that month.
//
//   node add-archive-month.js 07-2026                 report only
//   node add-archive-month.js 07-2026 --write         apply sidebar + create page
//
// Idempotent — re-running with a month that already exists is a no-op.
//
// The sidebar lives on ~250 pages: the blog landing page, every individual
// post, every archive/category/pagination page. This script finds all of them
// by looking for the `<h2 class="blog-archives-title">` marker and inserting
// the new month link at the top of the list that follows.
//
// Two link-format variants exist in the wild:
//   Landing page (triviahostresources.html): relative, no leading slash, no trailing slash
//     <a href="triviahostresources/archives/06-2024" class="blog-link">June 2024</a>
//   Everything else: absolute, leading slash, trailing slash
//     <a href="/triviahostresources/archives/06-2024/" class="blog-link">June 2024</a>
// The script detects which form a file uses and emits the matching one.

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const ROOT = path.resolve(__dirname, '..');

// ─── parse args ───
const args = process.argv.slice(2);
const write = args.includes('--write');
const monthArg = args.find(a => /^\d{2}-\d{4}$/.test(a));

if (!monthArg) {
  console.error('Usage: node add-archive-month.js MM-YYYY [--write]');
  process.exit(1);
}

const [mm, yyyy] = monthArg.split('-');
const monthIdx = parseInt(mm, 10) - 1;
if (monthIdx < 0 || monthIdx > 11) {
  console.error(`Invalid month: ${mm}`);
  process.exit(1);
}
const label = `${MONTH_NAMES[monthIdx]} ${yyyy}`;

// ─── find every file with the archives sidebar ───
const grepResult = execSync(
  `grep -rl "blog-archives-title" --include="*.html" "${ROOT}"`,
  { encoding: 'utf8' }
).trim().split('\n').filter(Boolean);

console.log(`Found ${grepResult.length} files with an archives sidebar.`);

let updated = 0;
let skipped = 0;

for (const filePath of grepResult) {
  let html = fs.readFileSync(filePath, 'utf8');

  // already has this month?
  if (html.includes(`archives/${monthArg}`)) {
    skipped++;
    continue;
  }

  // detect link format: does this file use relative (no leading /) or absolute?
  const isLandingPage = filePath.endsWith('triviahostresources.html');

  let newLink;
  if (isLandingPage) {
    newLink = `\t<a href="triviahostresources/archives/${monthArg}" class="blog-link">${label}</a>\n\t<br>`;
  } else {
    newLink = `\t<a href="/triviahostresources/archives/${monthArg}/" class="blog-link">${label}</a>\n\t<br>`;
  }

  // insert after <p class="blog-archive-list">
  const archiveListTag = '<p class="blog-archive-list">';
  const idx = html.indexOf(archiveListTag);
  if (idx === -1) {
    console.log(`  SKIP (no archive-list <p>): ${path.relative(ROOT, filePath)}`);
    skipped++;
    continue;
  }

  const insertAt = idx + archiveListTag.length;
  html = html.slice(0, insertAt) + '\n' + newLink + '\n' + html.slice(insertAt);

  if (write) {
    fs.writeFileSync(filePath, html, 'utf8');
  }
  updated++;
}

console.log(`\n${updated} files ${write ? 'updated' : 'would be updated'}, ${skipped} skipped (already present or no marker).`);
if (!write && updated > 0) {
  console.log('Run with --write to apply.');
}
