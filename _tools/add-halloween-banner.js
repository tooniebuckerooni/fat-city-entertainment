// The seasonal Halloween banner: an in-flow block at the top of the content
// area on the pages a shopper actually lands on.
//
//   node _tools/add-halloween-banner.js            # dry run
//   node _tools/add-halloween-banner.js --write
//   node _tools/add-halloween-banner.js --remove   # dry run of the takedown
//   node _tools/add-halloween-banner.js --remove --write
//
// TAKE IT DOWN AFTER 1 NOV, with --remove --write.
//
// NOT A PROMO BAR, ON PURPOSE (twice over)
// -----------------------------------------
// 1. It is not promo-bar.js. That mechanism is a discount popup: it needs a
//    LemonSqueezy code, it fires once per browser, and the owner's call on
//    11 Sept was that it did not look good. This is a plain announcement in the
//    page, with no discount attached and nothing to expire.
// 2. It sits INSIDE #wsite-content, in normal document flow, never fixed or
//    floated. The old sitewide bar was position:relative while the mobile
//    header nav is position:fixed;top:0 in the theme CSS, so the bar sat on top
//    of the hamburger and completely covered it on every phone for as long as
//    any promo was live. A block in the content column cannot reach the header.
//
// The price is READ OFF p189's own page at build time, the same discipline as
// add-cross-sell.js and add-price-ladder.js: a price typed in here would be a
// promise the checkout stops keeping the moment anything is repriced. That puts
// this tool on the re-run-after-repricing list with the others.
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const WRITE = process.argv.includes("--write");
const REMOVE = process.argv.includes("--remove");

// TONE: "subtle" or "bold". Owner's call 11 Sept: subtle while Halloween is
// still seven weeks out, because a full-strength promo block in mid-September
// is shouting at people who are not shopping yet and stops registering by the
// time they are. Change this one word and re-run to turn it up in October; both
// treatments live in site-extras.css, so nothing else moves.
const TONE = "subtle";

const START = "<!-- fce:halloween-banner -->";
const END = "<!-- /fce:halloween-banner -->";
const BLOCK_RE = /\n?[ \t]*<!-- fce:halloween-banner -->[\s\S]*?<!-- \/fce:halloween-banner -->/g;

const HUB = "/halloween-trivia-and-music-bingo.html";
const PACK = "/store/p189/halloweencompletepack.html";
const PACK_PAGE = "store/p189/halloweencompletepack.html";

// Entry points, not product pages. A product page already carries its own
// cross-sell block, and two competing Halloween pitches on one screen is worse
// than one. The hub itself is excluded for the obvious reason.
const PAGES = [
  "index.html",
  "trivia-store.html",
  "store/c1/triviastore/index.html",
  "store/c11/musicdoboff/index.html",
  "store/c40/holidays/index.html",
  "store/c6/triviagameshows/index.html",
  "store/c34/Music_Bingo_&_Trivia_Bundles.html",
  "musicdoboffbingocards.html",
  "partyentertainment.html",
];

const money = (n) => "$" + Number(n).toFixed(2);

function packPrice() {
  const html = fs.readFileSync(path.join(REPO, PACK_PAGE), "utf8");
  const m = html.match(/itemprop="price"\s+content="([0-9.]+)"/);
  if (!m) throw new Error(`no price on ${PACK_PAGE}`);
  return Number(m[1]);
}

// No em-dashes: this is copy a visitor reads (CLAUDE.md writing-style rule).
function block(price) {
  // The subtle treatment drops the headline as well as the colour. A kicker,
  // one sentence and a text link is a note; three stacked lines and a filled
  // button is a promo however it is painted.
  const body = TONE === "subtle"
    ? `  <div class="fce-hw-banner-text">
    <p class="fce-hw-banner-kicker">Planning Halloween</p>
    <p class="fce-hw-banner-sub">Music bingo, a print and play trivia show and the game show presentation. The <a href="${PACK}">Halloween Complete Pack</a> has all three for ${money(price)}, with a free month of the Bingo Card Generator.</p>
  </div>
  <a class="fce-hw-banner-cta" href="${HUB}">See the Halloween games &rarr;</a>`
    : `  <div class="fce-hw-banner-text">
    <p class="fce-hw-banner-kicker">Halloween is 31 October</p>
    <p class="fce-hw-banner-head">Three ways to run the night</p>
    <p class="fce-hw-banner-sub">Music bingo with the playlist, a print and play trivia show, and the full game show presentation. The <a href="${PACK}">Halloween Complete Pack</a> has all three for ${money(price)}, with a free month of the Bingo Card Generator.</p>
  </div>
  <a class="fce-hw-banner-cta" href="${HUB}">See the Halloween games</a>`;
  return `${START}
<div class="fce-hw-banner fce-hw-banner--${TONE}">
${body}
</div>
${END}`;
}

// Right after the content wrapper opens, so it is the first thing in the column
// and still below the header. #wsite-content carries different class lists per
// template, hence the loose attribute match.
const ANCHOR_RE = /(<div id="wsite-content"[^>]*>)/;

let changed = 0, missing = 0, noAnchor = 0, unchanged = 0;
const price = packPrice();
if (!REMOVE) console.log(`p189 price read from its own page: ${money(price)}\n`);

for (const rel of PAGES) {
  const abs = path.join(REPO, rel);
  if (!fs.existsSync(abs)) { console.log(`  missing: ${rel}`); missing++; continue; }
  const html = fs.readFileSync(abs, "utf8");
  let next;

  if (REMOVE) {
    if (!html.includes(START)) { unchanged++; continue; }
    next = html.replace(BLOCK_RE, () => "");
  } else if (BLOCK_RE.test(html)) {
    BLOCK_RE.lastIndex = 0;
    // Replace in place so a reprice refreshes the copy rather than stacking.
    next = html.replace(BLOCK_RE, () => "\n" + block(price));
  } else {
    if (!ANCHOR_RE.test(html)) { console.log(`  no content wrapper: ${rel}`); noAnchor++; continue; }
    // A function replacer, always: a plain replacement string reads "$1" as a
    // backreference, and this block contains a price (HANDOFF.md).
    next = html.replace(ANCHOR_RE, (m) => `${m}\n${block(price)}`);
  }

  if (next === html) { unchanged++; continue; }
  changed++;
  console.log(`  ${WRITE ? (REMOVE ? "removed from" : "updated") : "would update"}: ${rel}`);
  if (WRITE) fs.writeFileSync(abs, next);
}

console.log(`\nunchanged: ${unchanged}`);
if (missing) console.log(`missing:   ${missing}`);
if (noAnchor) console.log(`no anchor: ${noAnchor}`);
console.log(`${WRITE ? "updated" : "would update"}: ${changed} page(s)`);
if (!WRITE && changed) console.log(`re-run with --write${REMOVE ? "" : "; --remove takes it down after 1 Nov"}`);
