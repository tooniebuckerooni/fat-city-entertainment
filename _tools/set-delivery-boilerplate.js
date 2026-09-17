#!/usr/bin/env node
//
// The delivery and guarantee block under a product's buy area.
//
//   node _tools/set-delivery-boilerplate.js              # dry run (default)
//   node _tools/set-delivery-boilerplate.js --preview    # print the copy, then stop
//   node _tools/set-delivery-boilerplate.js --write
//   node _tools/set-delivery-boilerplate.js --remove --write
//
// WHY THIS EXISTS
// ---------------
// 92 product pages ended with 63 words of logistics wrapped ENTIRELY in <strong>.
// When every word is bold nothing is emphasised, and the last thing a shopper read
// before the footer was spam folders and link expiry rather than the guarantee.
//
// Nothing owned it. A grep finds it only in _tools/scraped/ (the archived Weebly
// export) and on the live pages, so it has been hand-carried through every product
// clone since the export. That is exactly the failure CLAUDE.md names: a page no
// tool owns is a page that drifts silently. It already had, twice over -- p108 had
// picked up its own punctuation somewhere along the way.
//
// WHAT CHANGED, AND WHAT DID NOT
// ------------------------------
// 63 words to 40. Every commitment survives, in a better order:
//
//   instant download  emailed links  spam-folder note  90-day expiry
//   a fresh link on request  satisfaction guaranteed  exchange for a larger pack
//
// The guarantee leads instead of trailing, and it is the only thing in bold.
// Nothing here is a price, a term, or a promise the old copy did not already make.
//
// ONE THING TO KNOW ABOUT --remove
// --------------------------------
// The live block came in FOUR shapes across 92 pages, which is what hand-carrying
// does over three years. The wording differed on p108; the other three differed
// only in invisible trailing whitespace (&nbsp;, a zero-width space, a <span> of
// two zero-width spaces) that renders identically:
//
//   39 pages  ...</strong><span>\u200b\u200b</span></div>
//   34 pages  ...</strong>\u200b</div>
//   19 pages  ...</strong></div>
//    1 page   p108, its own punctuation
//
// So the block is found by its opening and its closing </div>, never by matching
// the whole string: matching the whole string is how the first draft of this tool
// silently did 39 of 92 and reported success. --remove restores the CANONICAL
// shape on all of them, so the four converge to one. That is a normalisation, not
// a loss, and the run prints the count. Same idiom as add-delivery-note.js's
// REPAIRS list.

"use strict";
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
const WRITE = args.includes("--write");
const REMOVE = args.includes("--remove");
const PREVIEW = args.includes("--preview");

// The two forms found live on 17 Sept 2026. CANONICAL is what --remove restores.
const CANONICAL = "<div class=\"paragraph\"><strong>You'll be able to download your music bingo or trivia presentations immediately after checkout. You will also be emailed a copy of the download links. Check Spam folder, if it's your first time purchasing our game downloads, and you don't see the email right away. Links expire in 90 days.&nbsp;<a href=\"/contact.html\" target=\"_blank\">Contact Us</a>&nbsp;if you require a fresh link. Satisfaction guaranteed. Exchanges for larger packs permitted.&nbsp;</strong><span>\u200b\u200b</span></div>";
const VARIANT_P108_UNUSED = "<div class=\"paragraph\"><strong>You'll be able to download your music bingo or trivia presentations immediately after checkout. You will also be emailed a copy of the download links. Check Spam folder, if it's your first time purchasing our game downloads and you don't see it right away. Links expire in 90 days. <a href=\"/contact.html\" target=\"_blank\">Contact Us</a>&nbsp;if you require a fresh link. Satisfaction guaranteed. Exchanges for larger packs permitted.&nbsp;</strong></div>";

const NEW =
  '<!-- fce:delivery-terms -->\n' +
  '<div class="paragraph fce-delivery-terms"><strong>Satisfaction guaranteed</strong>, ' +
  'and you can exchange for a larger pack any time. Your download starts right after ' +
  'checkout and the links are emailed too, so check spam the first time. Links last ' +
  '90 days; <a href="/contact.html" target="_blank">ask us</a> for a fresh one.</div>\n' +
  '<!-- /fce:delivery-terms -->';

function productPages() {
  const dir = path.join(REPO, "store");
  const out = [];
  for (const d of fs.readdirSync(dir)) {
    if (!/^p\d+$/.test(d)) continue;
    for (const f of fs.readdirSync(path.join(dir, d))) {
      if (f.endsWith(".html")) out.push(path.join("store", d, f));
    }
  }
  return out.sort();
}

if (PREVIEW) {
  const words = NEW.replace(/<[^>]+>/g, " ").trim().split(/\s+/).filter(Boolean).length;
  const before = CANONICAL.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ")
    .trim().split(/\s+/).filter(Boolean).length;
  console.log(`\nbefore (${before} words, all bold):\n`);
  console.log("  " + CANONICAL.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim());
  console.log(`\nafter (${words} words, one bold phrase):\n`);
  console.log("  " + NEW.replace(/<!--.*?-->/g, "").replace(/<[^>]+>/g, "").trim());
  console.log("\nIt is the most-read small print on the site. Read it before --write.\n");
  process.exit(0);
}

const OPEN = `<div class="paragraph"><strong>You'll be able to download`;
const MARK_OPEN = "<!-- fce:delivery-terms -->";
const MARK_CLOSE = "<!-- /fce:delivery-terms -->";

// Find the block by its opening and the first </div> that follows. The block has
// no nested divs, so the first closer IS its closer -- but the boundary is still
// taken from the markup rather than from a remembered string, because four
// different trailing shapes exist and a full-string match found only 39 of 92.
function findBlock(html) {
  const i = html.indexOf(OPEN);
  if (i < 0) return null;
  const j = html.indexOf("</div>", i);
  if (j < 0) return null;
  return { start: i, end: j + "</div>".length };
}

let changed = 0, already = 0, converged = 0, problems = 0;

for (const rel of productPages()) {
  const abs = path.join(REPO, rel);
  const html = fs.readFileSync(abs, "utf8");
  let out = html;

  if (REMOVE) {
    const i = html.indexOf(MARK_OPEN);
    if (i < 0) { already++; continue; }
    const j = html.indexOf(MARK_CLOSE, i);
    if (j < 0) { console.log(`PROBLEM: ${rel} has an opening marker and no closing one`); problems++; continue; }
    out = html.slice(0, i) + CANONICAL + html.slice(j + MARK_CLOSE.length);
  } else {
    if (html.includes(MARK_OPEN)) { already++; continue; }
    const b = findBlock(html);
    if (!b) { already++; continue; }            // page simply has no such block
    const original = html.slice(b.start, b.end);
    if (original !== CANONICAL) converged++;
    out = html.slice(0, b.start) + NEW + html.slice(b.end);
  }

  if (out === html) { already++; continue; }
  changed++;
  if (WRITE) fs.writeFileSync(abs, out);
}

console.log("");
console.log(`product pages     : ${productPages().length}`);
console.log(`unchanged         : ${already}`);
if (converged) console.log(`normalised off a non-canonical shape        : ${converged}`);
console.log(`${WRITE ? (REMOVE ? "restored" : "updated") : "would update"}: ${changed} page(s)`);
if (!WRITE && changed) console.log("re-run with --write  (or --preview to read the copy first)");
if (problems) process.exit(1);
