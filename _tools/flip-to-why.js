// Flip the homepage and the About page "inside out": WHY first, then HOW, then
// WHAT (Simon Sinek's Golden Circle).
//
//   node _tools/flip-to-why.js                 # dry run
//   node _tools/flip-to-why.js --write
//   node _tools/flip-to-why.js --remove        # dry run of the takedown
//   node _tools/flip-to-why.js --remove --write
//
// WHY (owner, 9 Oct 2026): "we offer too many solutions without covering the
// WHY Fat City is Fat City... We're Entertainers. We're ice-breakers. We bring
// people together in trying times." The homepage opened on "Professional-grade
// game packs, automated bingo generators" and a hero reading "Pay Once. Use
// Forever. No Monthly Fees." The About page had the real WHY in the owner's own
// words, buried under a joke tl;dr and above pack counts.
//
// WHAT IT DOES
// 1. Homepage hero: the headline and button become the WHY (HEADLINE / SUBLINE
//    / BUTTON below). Exact string swaps with a recorded inverse, the same
//    discipline as tidy-listing-intro.js. The "Fat City Entertainment" kicker
//    and the button's link to the store are untouched.
// 2. Homepage: _content/copy/why-home.html goes at the TOP of the first content
//    column, between <!-- fce:why --> markers. Nothing below it moves or goes:
//    the existing "Professional-grade game packs" copy becomes the HOW and WHAT
//    underneath, and it keeps the page's keyword <h1>, so search sees the same
//    page with a new opening.
// 3. About page: the content column is replaced by _content/copy/why-about.html
//    (the owner's own sentences, reordered Why, How, What; the em-dashes and the
//    pack counts that disagreed with each other are gone). The ORIGINAL column
//    is saved once to _content/copy/about-original.html, so --remove puts it
//    back byte for byte. The <title> loses its em-dash too.
//
// Edit the two partials and re-run to change the copy; never edit the pages.
// No em-dashes in anything here a visitor reads (CLAUDE.md).
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const WRITE = process.argv.includes("--write");
const REMOVE = process.argv.includes("--remove");

// The one line a visitor reads first. The owner picks it in the Why Workshop;
// change it here and re-run.
const HEADLINE = "We bring people together.";
const SUBLINE = "Music bingo and trivia nights, tested on live crowds since 1999.";
const BUTTON = "Find Your Night";

const HOME = "index.html";
const ABOUT = "aboutus.html";
const HOME_PARTIAL = "_content/copy/why-home.html";
const ABOUT_PARTIAL = "_content/copy/why-about.html";
const ABOUT_ORIGINAL = "_content/copy/about-original.html";

const SWAPS_HOME = [
  {
    from: '<h2 class="wsite-content-title" style="text-align:center;">Trivia &amp; Music Bingo Host Resources:<br>Pay Once. Use Forever. No Monthly Fees.<br></h2>',
    to: `<h2 class="wsite-content-title" style="text-align:center;">${HEADLINE}<br><span class="fce-why-hero-sub">${SUBLINE}</span></h2>`,
  },
  {
    from: '<span class="wsite-button-inner">Download Trivia Now</span>',
    to: `<span class="wsite-button-inner">${BUTTON}</span>`,
  },
];
// The "Bruce, Venue Manager" quote came down 9 Oct 2026: owner, in the Why
// Workshop, "Not real, take it down". Real reviews take its place, between
// <!-- fce:reviews --> markers filled from _content/copy/why-reviews.html. The
// swap only plants the empty marker pair, so editing the partial never breaks
// the inverse.
const BRUCE = '<h2 class="wsite-content-title">"Finally, a way to <strong>fill seats and boost revenue</strong> without the stress. Fat City’s music bingo and trivia nights have been a game-changer for our repeat business!" — <em>Bruce, Venue Manager</em><br></h2>';
const REVIEWS_EMPTY = "<!-- fce:reviews --><!-- /fce:reviews -->";
const REVIEWS_RE = /<!-- fce:reviews -->[\s\S]*?<!-- \/fce:reviews -->/;
const REVIEWS_PARTIAL = "_content/copy/why-reviews.html";
SWAPS_HOME.push({ from: BRUCE, to: REVIEWS_EMPTY });

const SWAPS_ABOUT = [
  {
    from: "<title>About Fat City Entertainment — Hosting Trivia &amp; Music Bingo Since 1999</title>",
    to: "<title>About Fat City Entertainment: Bringing People Together With Trivia &amp; Music Bingo Since 1999</title>",
  },
];

const START = "<!-- fce:why -->";
const END = "<!-- /fce:why -->";
const BLOCK_RE = /<!-- fce:why -->[\s\S]*?<!-- \/fce:why -->\n/;
const read = (rel) => fs.readFileSync(path.join(REPO, rel), "utf8");

// Swaps apply forward, or in reverse with --remove. A swap whose target is
// already in place is skipped, so a re-run is a no-op; a swap that finds
// neither side is reported, because the page changed under the tool.
function applySwaps(html, swaps, rel, problems) {
  for (const s of swaps) {
    const [a, b] = REMOVE ? [s.to, s.from] : [s.from, s.to];
    if (html.includes(b) && !html.includes(a)) continue;
    if (!html.includes(a)) { problems.push(`${rel}: swap anchor not found: ${a.slice(0, 70)}...`); continue; }
    html = html.split(a).join(b);
  }
  return html;
}

// The first content column inside #wsite-content, found by div depth, never by
// a string match on its closer (CLAUDE.md: tile boundaries).
function column(html) {
  const c = html.indexOf('<div id="wsite-content"');
  const open = html.indexOf('<div class="wsite-section-elements">', c);
  if (c === -1 || open === -1) return null;
  const start = open + '<div class="wsite-section-elements">'.length;
  const re = /<div\b|<\/div>/g;
  re.lastIndex = start;
  let depth = 1, m;
  while ((m = re.exec(html))) {
    depth += m[0] === "</div>" ? -1 : 1;
    if (depth === 0) return { start, end: m.index };
  }
  return null;
}

const problems = [];
let changed = 0;

// ---- homepage
{
  const html = read(HOME);
  // Empty the reviews block first, so the swap below can see its own marker
  // pair in either direction.
  let next = html.replace(REVIEWS_RE, () => REVIEWS_EMPTY);
  next = applySwaps(next, SWAPS_HOME, HOME, problems).replace(BLOCK_RE, "");
  if (!REMOVE && next.includes(REVIEWS_EMPTY)) {
    next = next.replace(REVIEWS_EMPTY, () =>
      `<!-- fce:reviews -->\n${read(REVIEWS_PARTIAL).trim()}\n<!-- /fce:reviews -->`);
  }
  if (!REMOVE) {
    const col = column(next);
    if (!col) problems.push(`${HOME}: no content column`);
    else {
      const block = `${START}\n${read(HOME_PARTIAL).trim()}\n${END}\n`;
      next = next.slice(0, col.start) + "\n" + block + next.slice(col.start).replace(/^\n/, "");
    }
  }
  if (next !== html) {
    changed++;
    console.log(`  ${WRITE ? "updated" : "would update"}: ${HOME}`);
    if (WRITE) fs.writeFileSync(path.join(REPO, HOME), next);
  }
}

// ---- About
{
  const html = read(ABOUT);
  let next = applySwaps(html, SWAPS_ABOUT, ABOUT, problems);
  const col = column(next);
  if (!col) problems.push(`${ABOUT}: no content column`);
  else {
    const inner = next.slice(col.start, col.end);
    const flipped = inner.includes(START);
    const origPath = path.join(REPO, ABOUT_ORIGINAL);
    if (REMOVE) {
      if (flipped) {
        if (!fs.existsSync(origPath)) problems.push(`${ABOUT_ORIGINAL} missing: cannot restore`);
        else next = next.slice(0, col.start) + read(ABOUT_ORIGINAL) + next.slice(col.end);
      }
    } else {
      if (!flipped && !fs.existsSync(origPath)) {
        console.log(`  ${WRITE ? "saved" : "would save"} the original About column to ${ABOUT_ORIGINAL}`);
        if (WRITE) fs.writeFileSync(origPath, inner);
      }
      const block = `\n${START}\n${read(ABOUT_PARTIAL).trim()}\n${END}\n\t\t\t`;
      next = next.slice(0, col.start) + block + next.slice(col.end);
    }
  }
  if (next !== html) {
    changed++;
    console.log(`  ${WRITE ? "updated" : "would update"}: ${ABOUT}`);
    if (WRITE) fs.writeFileSync(path.join(REPO, ABOUT), next);
  }
}

for (const p of problems) console.log(`  PROBLEM: ${p}`);
console.log(`\n${WRITE ? "updated" : "would update"}: ${changed} page(s)`);
if (!WRITE && changed) console.log(`re-run with --write${REMOVE ? "" : "; --remove restores both pages"}`);
if (problems.length) process.exitCode = 1;
