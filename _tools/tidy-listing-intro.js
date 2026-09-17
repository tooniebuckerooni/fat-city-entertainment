#!/usr/bin/env node
//
// Tidy what a shopper scrolls past BEFORE the first product on a listing page.
//
//   node _tools/tidy-listing-intro.js              # dry run (default)
//   node _tools/tidy-listing-intro.js --write
//   node _tools/tidy-listing-intro.js --remove --write   # restores byte for byte
//
// WHY THIS EXISTS
// ---------------
// Measured 17 Sept 2026 in Chromium at 390x844, against the live files:
//
//   trivia-store.html   2,247px (2.7 phone screens) before the first product
//   store/c11/          1,454px (1.7 screens)
//   every other grid    0.2 to 0.8 screens
//
// The storefront is the outlier and the copy above its grid is why. This moves
// and trims that copy. It does NOT touch a single image: the owner's call on
// 17 Sept was "we're light on imagery already and should not cut them. Focus on
// reducing and relocating copy." So the two tool banners are RELOCATED with both
// pictures intact, never removed.
//
// WHY A TOOL FOR TWO PAGES
// ------------------------
// CLAUDE.md: a hand-edited page is a page that goes stale silently. Nothing
// regenerates these two files wholesale today, so a hand edit would survive --
// but nothing would notice it being undone either. As a tool it is reversible,
// it is idempotent, and it goes in the Monday health check.
//
// HOW IT STAYS REVERSIBLE
// -----------------------
// Every change is an exact string swap recorded as a {from, to} pair. --remove
// applies the same list backwards, so apply/remove/apply lands on the identical
// bytes. A relocation is two paired swaps: cut the block where it is (taking its
// leading whitespace with it, the lesson reorder-product-cta.js learned the hard
// way) and paste it at the new anchor inside a marker pair.
//
// A swap whose `from` is missing is REPORTED AND SKIPPED, never guessed at.

"use strict";
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
const WRITE = args.includes("--write");
const REMOVE = args.includes("--remove");

// The "Also from Fat City" banners, lifted verbatim out of trivia-store.html.
// Two image cards; both travel with the move.
const TOOL_BANNERS = "\t\t\t\t<p class=\"fce-tool-banners-eyebrow\">Also from Fat City</p>\n\t\t\t\t<div class=\"fce-tool-banners\">\n\t<div class=\"fce-tool-banner-card\">\n\t\t<a class=\"fce-tool-banner-link\" href=\"/trivia-show-maker-plans.html\">\n\t\t\t<picture><source srcset=\"/uploads/4/3/3/6/43362499/triviamakerbanner.webp\" type=\"image/webp\"><img src=\"/uploads/4/3/3/6/43362499/triviamakerbanner.png\" alt=\"Trivia Show Maker \u2014 build &amp; print a host packet in minutes\" loading=\"lazy\" decoding=\"async\" width=\"1000\" height=\"667\"></picture>\n\t\t</a>\n\t</div>\n\t<div class=\"fce-tool-banner-card\">\n\t\t<a class=\"fce-tool-banner-link\" href=\"https://bingocardgenerator.online/#pricing\" target=\"_blank\" rel=\"noopener\">\n\t\t\t<picture><source srcset=\"/uploads/4/3/3/6/43362499/bingocardgenbanner.webp\" type=\"image/webp\"><img src=\"/uploads/4/3/3/6/43362499/bingocardgenbanner.png\" alt=\"Bingo Card Generator \u2014 free printable cards in seconds\" loading=\"lazy\" decoding=\"async\" width=\"1000\" height=\"667\"></picture>\n\t\t</a>\n\t</div>\n</div>\n";

// Same markup, same two pictures, with the em-dash gone from both alt attributes.
// alt text is read aloud by screen readers and indexed by Google, so CLAUDE.md's
// "nothing a visitor reads" rule covers it. Keeping the two constants separate is
// what keeps --remove byte exact: it puts the ORIGINAL bytes back.
const TOOL_BANNERS_CLEAN = "\t\t\t\t<p class=\"fce-tool-banners-eyebrow\">Also from Fat City</p>\n\t\t\t\t<div class=\"fce-tool-banners\">\n\t<div class=\"fce-tool-banner-card\">\n\t\t<a class=\"fce-tool-banner-link\" href=\"/trivia-show-maker-plans.html\">\n\t\t\t<picture><source srcset=\"/uploads/4/3/3/6/43362499/triviamakerbanner.webp\" type=\"image/webp\"><img src=\"/uploads/4/3/3/6/43362499/triviamakerbanner.png\" alt=\"Trivia Show Maker: build &amp; print a host packet in minutes\" loading=\"lazy\" decoding=\"async\" width=\"1000\" height=\"667\"></picture>\n\t\t</a>\n\t</div>\n\t<div class=\"fce-tool-banner-card\">\n\t\t<a class=\"fce-tool-banner-link\" href=\"https://bingocardgenerator.online/#pricing\" target=\"_blank\" rel=\"noopener\">\n\t\t\t<picture><source srcset=\"/uploads/4/3/3/6/43362499/bingocardgenbanner.webp\" type=\"image/webp\"><img src=\"/uploads/4/3/3/6/43362499/bingocardgenbanner.png\" alt=\"Bingo Card Generator: free printable cards in seconds\" loading=\"lazy\" decoding=\"async\" width=\"1000\" height=\"667\"></picture>\n\t\t</a>\n\t</div>\n</div>\n";

const C11_STEPS_OLD = "<div class=\"paragraph\" style=\"text-align:left;\"><ul><li><font size=\"3\" color=\"#2a2a2a\">Each Game Pack Prints</font><font color=\"#2a2a2a\"><strong><font size=\"3\"> <u>Up To 250 Randomized Music Bingo Cards with Free Space.</u></font></strong></font></li><li><font size=\"3\" color=\"#2a2a2a\">Simply,</font><font color=\"#2a2a2a\"><strong><font size=\"3\">&nbsp;Download And Print. </font></strong><font size=\"3\">Then Hand Out To Your Guests.</font></font></li><li><font color=\"#2a2a2a\"><strong><font size=\"3\">2 Cards Fit Perfectly On&nbsp;Regular Sized Letter&nbsp;Paper.</font></strong></font><br></li><li><font size=\"3\" color=\"#2a2a2a\">Choose How Many Pages You Need To Print. </font></li><li><font color=\"#2a2a2a\"><strong><font size=\"3\">Make Sure To Print \"Landscape\" Or Horizontally.&nbsp;</font></strong></font></li><li><font size=\"3\" color=\"#2a2a2a\">\"Shuffle Play\" The Music For A Truly Random Winner. </font></li><li><font color=\"#2a2a2a\"><strong><font size=\"3\">Give Away Fun Prizes for \"1st Line, 4 Corners, or Blackout!\"&nbsp;(Optional)</font></strong></font></li></ul></div>";

const C11_STEPS_NEW =
  `<!-- fce:print-steps -->\n` +
  `<section class="fce-copy fce-print-steps">\n` +
  `<div class="fce-copy-inner">\n` +
  `<h2>How printing works</h2>\n` +
  `<ul>\n` +
  `<li>Every game pack prints <strong>up to 250 randomized cards</strong>, each with a free space.</li>\n` +
  `<li>Download, print, and hand them out. That is the whole setup.</li>\n` +
  `<li><strong>Two cards fit on a sheet of letter paper.</strong> Print landscape.</li>\n` +
  `<li>Print only the pages you need. You own the file, so you can print more later.</li>\n` +
  `<li>Shuffle the playlist so the winner is genuinely random.</li>\n` +
  `<li>Prizes for a line, four corners or a blackout are optional, and popular.</li>\n` +
  `</ul>\n` +
  `</div>\n` +
  `</section>\n` +
  `<!-- /fce:print-steps -->\n`;

const PAGES = [
  {
    file: "trivia-store.html",
    edits: [
      {
        // The credit-code offer was on this page TWICE. add-price-ladder.js:184
        // already writes it into the ladder note below the grid; this hand-placed
        // copy sat 3,700px above it, in different words. The tool-owned one wins,
        // because it survives every rebuild and this one does not.
        name: "drop the duplicate credit-code line",
        from:
          `\n<div class="paragraph" style="text-align:center;">Already own a game and want to upgrade to a <a href="/store/c34/Music_Bingo_%26_Trivia_Bundles.html" target="_blank">bundle</a> that includes it? Send us an email for a credit code.</div>\n`,
        to: `\n<!-- fce:credit-line-dropped -->\n`,
      },
      {
        // 38 words to 22, and the em-dash goes. This is the first sentence a
        // shopper reads, and CLAUDE.md's rule is about exactly that.
        name: "tighten the intro, drop its em-dash",
        from:
          `<div class="paragraph" style="text-align:center;">Instant digital download, host tonight. Every music bingo pack includes print-ready cards, a callsheet, and a ready-made playlist; every trivia set is ready to run from a screen. Buy once — no subscription, no account to keep alive.</div>`,
        to:
          `<div class="paragraph" style="text-align:center;">Download now, host tonight. Every music bingo pack has print-ready cards, a callsheet and a ready-made playlist. Buy once: no subscription, no account.</div>`,
      },
      {
        // Same rule, same page: an em-dash between the email and the phone. The
        // line itself is a good trust signal in a good place, so only the dash goes.
        name: "drop the em-dash from the store note",
        from:
          `<a href="mailto:info@fatcityentertainment.com">info@fatcityentertainment.com</a> — <a href="tel:9845003835">984-500-3835</a>`,
        to:
          `<a href="mailto:info@fatcityentertainment.com">info@fatcityentertainment.com</a> &middot; <a href="tel:9845003835">984-500-3835</a>`,
      },
      {
        // CUT: 473px of cross-promotion for OTHER products, sitting between the
        // category tiles and this store's own grid. A marker comment is left in
        // its place, which is what makes the return trip exact and unambiguous.
        name: "lift the Also from Fat City banners out",
        from: TOOL_BANNERS,
        to: `<!-- fce:tool-banners-slot -->\n`,
      },
      {
        // PASTE: the same two pictures, now under the products and above the
        // ladder. Nothing is removed; this is placement only.
        name: "put the banners back below the grid",
        sentinel: `<!-- fce:tool-banners -->`,
        from: `\n    <!-- fce:price-ladder -->`,
        to: `\n    <!-- fce:tool-banners -->\n` + TOOL_BANNERS_CLEAN + `<!-- /fce:tool-banners -->\n\n    <!-- fce:price-ladder -->`,
      },
    ],
  },
  {
    file: "store/c11/musicdoboff/index.html",
    edits: [
      {
        // 69 words and 511px telling you how to print, above 53 games you have
        // not chosen between yet. Post-purchase content on a browse page, in
        // Title Case, so every line read as a heading.
        name: "lift the print steps out from above the grid",
        from: C11_STEPS_OLD,
        to: `<!-- fce:print-steps-slot -->`,
      },
      {
        name: "put the print steps back below the grid, in sentences",
        sentinel: `<!-- fce:print-steps -->`,
        from: `\n    <div class="footer-wrap">`,
        to: `\n` + C11_STEPS_NEW + `\n    <div class="footer-wrap">`,
      },
    ],
  },
];

function apply(html, edits, reverse) {
  const list = reverse ? [...edits].reverse() : edits;
  const done = [];
  const already = [];
  const missing = [];
  let out = html;
  for (const e of list) {
    // A `sentinel` is for an edit whose anchor SURVIVES it. The paste anchors on
    // the ladder marker, and that marker is still there afterwards, so without
    // this a second run pastes the banners a second time. Found by running the
    // tool twice, which is why idempotence gets checked rather than assumed.
    if (e.sentinel) {
      const has = out.includes(e.sentinel);
      if (!reverse && has) { already.push(e.name); continue; }
      if (reverse && !has) { already.push(e.name); continue; }
    }
    const from = reverse ? e.to : e.from;
    const to = reverse ? e.from : e.to;
    if (from === to) continue;
    const n = out.split(from).length - 1;
    if (n === 0) { missing.push(e.name); continue; }
    // Refuse rather than corrupt. A pure deletion used to leave `to` as "\n",
    // which matched 1,799 times going backwards; this is what caught it.
    if (n > 1) { missing.push(e.name + " (matches " + n + " times, refusing)"); continue; }
    // A replacer function, never a string: a $ in the replacement reads as a
    // backreference otherwise, and these blocks carry hrefs and entities.
    out = out.replace(from, () => to);
    done.push(e.name);
  }
  return { out, done, already, missing };
}

let changed = 0;
let problems = 0;

for (const page of PAGES) {
  const abs = path.join(REPO, page.file);
  if (!fs.existsSync(abs)) {
    console.log(`PROBLEM: no such page ${page.file}`);
    problems++;
    continue;
  }
  const html = fs.readFileSync(abs, "utf8");
  const { out, done, already, missing } = apply(html, page.edits, REMOVE);

  if (done.length === 0) {
    // Every edit either already in the target state, or its anchor gone because
    // it has been applied. Either way there is nothing to do, which is the
    // normal quiet result on a clean re-run.
    console.log(`  up to date: ${page.file}`);
    continue;
  }
  if (missing.length) {
    // Some applied and some did not: the page is half-edited, which is the one
    // state worth shouting about. Nothing was written.
    console.log(`PROBLEM: ${page.file} applied ${done.length} of ${page.edits.length} edits`);
    missing.forEach((m) => console.log(`           missing: ${m}`));
    problems++;
    continue;
  }

  changed++;
  if (WRITE) {
    fs.writeFileSync(abs, out);
    console.log(`  ${REMOVE ? "restored" : "updated"}: ${page.file}`);
  } else {
    console.log(`  would update: ${page.file}`);
  }
  done.forEach((d) => console.log(`             ${d}`));
  already.forEach((d) => console.log(`             (already) ${d}`));
}

console.log("");
console.log(`listing pages     : ${PAGES.length}`);
console.log(`${WRITE ? (REMOVE ? "restored" : "updated") : "would update"}: ${changed} page(s)`);
if (problems) {
  console.log(`PROBLEM: ${problems} page(s) could not be matched cleanly`);
  process.exit(1);
}
if (!WRITE && changed) console.log("re-run with --write");
