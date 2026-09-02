// Make sure every product page says how the thing you just bought reaches you.
//
// 52 of the 73 product pages carried the "download immediately after checkout,
// links also emailed, check spam" note. 21 did not — including Music Bingo Gold
// Club, the most expensive item on the site, which said nothing at all about
// delivery. Since Weebly's membership area went away with the migration, that
// silence is the gap where a buyer used to look for "where do I log in?".
//
// The wording is per product type, because the standard note is a lie on some of
// them: Consult Hour and Zoom Party are bookings, not downloads; the T-shirt
// ships; Bingo Card Generator Pro is access to a web tool. Each note below
// restates what that page's own description already promises.
//
//   node _tools/add-delivery-note.js            # dry run
//   node _tools/add-delivery-note.js --write
//
// Safe to re-run: a page that already has a note is left alone.
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const WRITE = process.argv.includes("--write");

// Verbatim from the 52 pages that already carry it, so the site reads as one voice.
const DOWNLOAD =
  "<strong>You'll be able to download your music bingo or trivia presentations " +
  "immediately after checkout. You will also be emailed a copy of the download " +
  "links. Check Spam folder, if it's your first time purchasing our game " +
  "downloads, and you don't see the email right away. Links expire in 90 days." +
  '&nbsp;<a href="/contact.html" target="_blank">Contact Us</a>&nbsp;if you ' +
  "require a fresh link. Satisfaction guaranteed. Exchanges for larger packs " +
  "permitted.&nbsp;</strong>";

const BOOKING =
  "<strong>This books your date — it isn't a download. After checkout you'll get " +
  "an email confirming your booking, and we'll follow up to lock in the details. " +
  'Please&nbsp;<a href="/contact.html" target="_blank">contact us</a>&nbsp;to ' +
  "confirm availability before you book.</strong>";

// Deliberately no spam-folder/fresh-link caveat here: on a tool this copy sits
// right at the buy button, and pre-warning about delivery failure reads as
// doubt at the worst possible moment (Aug 2026 conversion audit, item 5).
const TOOL =
  "<strong>Instant access — your link lands in your inbox right after " +
  "checkout. Bingo Card Generator Pro runs in your browser: nothing to " +
  "install, and lifetime access means no monthly fee, ever.</strong>";

const PHYSICAL =
  "<strong>This one ships to you — free shipping in the USA and Canada. You'll " +
  "get an order confirmation by email after checkout, and we'll be in touch about " +
  'sizing.&nbsp;<a href="/contact.html" target="_blank">Contact Us</a>&nbsp;with ' +
  "any questions.</strong>";

// Anything not listed is a file download.
const BY_TYPE = {
  p137: BOOKING,   // Consult Hour — "Deposits are fully-refundable up until 30 days prior"
  p140: BOOKING,   // Zoom Party — "Only book after speaking with us"
  p65: TOOL,       // Bingo Card Generator Pro — browser tool, lifetime access
  p3: PHYSICAL,    // Fat Bottom Trivia Host T-shirt — "Free shipping in USA and Canada"
};

// p18 sells on Amazon, which owns delivery and says so on the page already.
const SKIP = new Set(["p18"]);

const products = [];
for (const dir of fs.readdirSync(path.join(REPO, "store"))) {
  const full = path.join(REPO, "store", dir);
  if (!/^p\d+$/.test(dir) || !fs.statSync(full).isDirectory()) continue;
  for (const f of fs.readdirSync(full)) {
    if (f.endsWith(".html")) products.push([dir, path.join(full, f)]);
  }
}

let added = 0, hadIt = 0, skipped = 0, noSlot = 0;

for (const [pid, file] of products.sort()) {
  let html = fs.readFileSync(file, "utf8");

  if (/http-equiv="refresh"/i.test(html) || SKIP.has(pid)) { skipped++; continue; }
  if (/download your music bingo|emailed a copy|isn't a download|access link is emailed|instant access — your link|ships to you/i.test(html)) {
    hadIt++;
    continue;
  }

  const note = `<div class="paragraph">${BY_TYPE[pid] || DOWNLOAD}</div>`;
  const before = html;

  // Preferred slot: the long-description tab, where the other 52 keep it.
  if (/<div id="wsite-com-product-tab-long">/.test(html)) {
    html = html.replace(
      /(<div id="wsite-com-product-tab-long">)/,
      // NB: replacer FUNCTION, not a replacement string. A string replacement
      // re-reads "$1", "$&" etc. inside the text being inserted, so any
      // description or title containing a dollar amount is silently mangled --
      // "$13.98" became "</title>3.98" in a live twitter:description tag.
      (m, a) => `${a}\n\t\t\t\t\t\t${note}`
    );
  } else if (/<div id="wsite-com-product-tab">\s*<\/div>/.test(html)) {
    // Empty tab container — build the same nesting the other pages use.
    html = html.replace(
      /<div id="wsite-com-product-tab">\s*<\/div>/,
      `<div id="wsite-com-product-tab">\n\t\t\t\t\t<div id="wsite-com-product-tab-long">\n\t\t\t\t\t\t${note}\n\t\t\t\t\t</div>\n\t\t\t\t</div>`
    );
  } else {
    console.log("  no slot found:", path.relative(REPO, file));
    noSlot++;
    continue;
  }

  if (html !== before) {
    if (WRITE) fs.writeFileSync(file, html);
    added++;
  }
}

console.log(`product pages   : ${products.length}`);
console.log(`note added      : ${added}`);
console.log(`already had one : ${hadIt}`);
console.log(`skipped         : ${skipped}   (redirect stubs, and p18 which sells on Amazon)`);
console.log(`no slot found   : ${noSlot}`);
if (!WRITE) console.log("\nDRY RUN — nothing written. Re-run with --write.");
