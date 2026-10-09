// A seasonal countdown chip directly under the buy button on the products a
// season is about: "22 days to Halloween. Venues book two to four weeks out."
//
//   node _tools/add-season-countdown.js            # dry run
//   node _tools/add-season-countdown.js --write
//   node _tools/add-season-countdown.js --remove   # dry run of the takedown
//   node _tools/add-season-countdown.js --remove --write
//
// WHY (9 Oct 2026)
// ----------------
// The Halloween banner sat on seven entry pages for four weeks and the owner's
// read was that it sold nothing. It was a note ABOUT the season on pages where
// nobody had chosen a game yet. The pricing skill names the actual gap on a
// product page: "No urgency? Nothing on the page says why to buy today." This
// puts the deadline on the page where the decision is made, next to the button,
// and nowhere else.
//
// SELF-EXPIRING, which is the property that matters here. The chip ships with
// `hidden` and assets/js/fce-countdown.js reveals it only between `from` and the
// date, on the visitor's own calendar. So a season nobody remembers to take down
// reads as NOTHING the day after, never as a stale or negative count, and no-JS
// visitors and crawlers see nothing at all. `--remove --write` still takes the
// markup off for good, and restores every page byte for byte.
//
// To add a season (the election promo, Valentine's), add a SEASONS entry. A
// page belongs to at most one season; the first match wins and the tool says so.
//
// Anchored BEFORE the short description, which on every product page is
// immediately after the buy div and its fact notes (reorder-product-cta.js puts
// the buy div there). So the chip reads price, button, reassurance, deadline.
// It never sits between the price and the button.
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const WRITE = process.argv.includes("--write");
const REMOVE = process.argv.includes("--remove");

const SEASONS = [
  {
    key: "halloween",
    event: "Halloween",
    date: "2026-10-31",
    from: "2026-10-01",
    pids: ["p97", "p174", "p33", "p189"],
  },
  {
    // Christmas runs on party season, not the 25th: staff parties land in the
    // first three weeks of December, so the chip appears from mid-November and
    // counts to Christmas Day.
    key: "christmas",
    event: "Christmas",
    date: "2026-12-25",
    from: "2026-11-15",
    pids: ["p103", "p42", "p175", "p155", "p190"],
  },
];

const START = "<!-- fce:countdown -->";
const END = "<!-- /fce:countdown -->";
const BLOCK_RE = /[ \t]*<!-- fce:countdown -->[\s\S]*?<!-- \/fce:countdown -->\n/g;
const ANCHOR_RE = /([ \t]*)<div id="wsite-com-product-short-description"/;

function block(s, indent) {
  return `${indent}${START}
${indent}<p class="fce-countdown fce-countdown--${s.key}" data-fce-countdown="${s.date}" data-fce-from="${s.from}" data-fce-event="${s.event}" hidden><span class="fce-countdown-head"></span> <span class="fce-countdown-sub"></span></p>
${indent}<script src="/assets/js/fce-countdown.js" defer></script>
${indent}${END}
`;
}

function pageFor(pid) {
  const dir = path.join(REPO, "store", pid);
  if (!fs.existsSync(dir)) return null;
  // The product page is the one carrying #wsite-com-product-gen with this id;
  // legacy duplicates in the same folder are refresh stubs or canonicals.
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".html"))) {
    const html = fs.readFileSync(path.join(dir, f), "utf8");
    if (ANCHOR_RE.test(html) && /itemprop="price"/.test(html)) return path.join(dir, f);
  }
  return null;
}

let changed = 0, unchanged = 0, missing = 0;
const seen = new Set();
for (const s of SEASONS) {
  for (const pid of s.pids) {
    if (seen.has(pid)) { console.log(`  ${pid}: already in an earlier season, skipped`); continue; }
    seen.add(pid);
    const abs = pageFor(pid);
    if (!abs) { console.log(`  ${pid}: no live product page yet (staged or missing), skipped`); missing++; continue; }
    const rel = path.relative(REPO, abs);
    const html = fs.readFileSync(abs, "utf8");
    const stripped = html.replace(BLOCK_RE, "");
    const next = REMOVE
      ? stripped
      : stripped.replace(ANCHOR_RE, (m, indent) => block(s, indent) + m);
    if (next === html) { unchanged++; continue; }
    changed++;
    console.log(`  ${WRITE ? (REMOVE ? "removed from" : "updated") : "would update"}: ${rel} (${s.key})`);
    if (WRITE) fs.writeFileSync(abs, next);
  }
}
console.log(`\nunchanged: ${unchanged}`);
if (missing) console.log(`not yet live: ${missing}`);
console.log(`${WRITE ? "updated" : "would update"}: ${changed} page(s)`);
if (!WRITE && changed) console.log("re-run with --write");
