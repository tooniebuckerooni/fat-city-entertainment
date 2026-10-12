// Sanity check for the promo calendar (PROMOS in assets/js/ls-buy.js).
//
//   node _tools/check-promos.js
//
// Exits non-zero on a real problem, so it sits in the exit-status group of the
// Monday health check (.github/workflows/site-health.yml), not the drift loop.
//
// WHY (12 Oct 2026). SPOOKY20 went live with nothing watching it: a typo in a
// product id, a live entry whose product had lost its checkout link, or two live
// sales overlapping on one product would all have passed every check while
// buyers met a missing or wrong discount. An audit found that gap.
//
// What it CANNOT check: that the code really exists in LemonSqueezy, is scoped
// to the right products, or expires after `end`. Neither this sandbox nor the
// Action has LemonSqueezy API access. That is what `live: false` is for: an
// entry goes live only on the owner's word.
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const REPO = path.resolve(__dirname, "..");
const src = fs.readFileSync(path.join(REPO, "assets/js/ls-buy.js"), "utf8");
const start = src.indexOf("var PROMOS = [");
const end = src.indexOf("];", start);
if (start < 0 || end < 0) { console.log("PROBLEM: no PROMOS array in ls-buy.js"); process.exit(1); }
const PROMOS = vm.runInNewContext(src.slice(start + "var PROMOS = ".length, end + 1));

const linksSrc = fs.readFileSync(path.join(REPO, "assets/js/ls-links.js"), "utf8");
const sandbox = { window: {} };
vm.runInNewContext(linksSrc, sandbox);
const LINKS = sandbox.window.LS_LINKS || {};

const day = (d) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d || ""); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : NaN; };
const problems = [];
const info = [];
const now = Date.now();

function productPage(pid) {
  const dir = path.join(REPO, "store", pid);
  if (!fs.existsSync(dir)) return null;
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".html"))) {
    const html = fs.readFileSync(path.join(dir, f), "utf8");
    if (/itemprop="price"/.test(html) && html.includes(`data-product="${pid}"`)) return html;
  }
  return null;
}

for (const p of PROMOS) {
  const tag = p.code || "(no code)";
  if (!p.code || !/^[A-Z0-9-]+$/.test(p.code)) problems.push(`${tag}: code must be capitals, digits and hyphens`);
  if (/[—]/.test(p.name || "")) problems.push(`${tag}: name has an em-dash (a visitor reads it)`);
  if (!(p.pct > 0 && p.pct < 100)) problems.push(`${tag}: pct ${p.pct} is not between 0 and 100`);
  const s = day(p.start), e = day(p.end);
  if (isNaN(s) || isNaN(e)) { problems.push(`${tag}: start/end must be YYYY-MM-DD`); continue; }
  if (s >= e) problems.push(`${tag}: start is not before end`);
  if (!Array.isArray(p.products) || !p.products.length) problems.push(`${tag}: no products`);
  if (!p.live) continue;
  for (const pid of p.products || []) {
    if (!productPage(pid)) problems.push(`${tag}: ${pid} has no live product page with a buy button`);
    if (!/lemonsqueezy\.com\/checkout\/buy\//.test(LINKS[pid] || "")) problems.push(`${tag}: ${pid} has no LemonSqueezy link in ls-links.js`);
  }
  const daysLeft = Math.ceil((e - now) / 86400000);
  if (now > e + 3 * 86400000) problems.push(`${tag}: live but ended ${p.end}; set live: false`);
  else if (now >= s - 86400000 && now < e + 86400000) info.push(`${tag}: live, ${p.products.length} product(s), ${daysLeft} day(s) left (ends ${p.end})`);
  else if (now < s) info.push(`${tag}: live, starts ${p.start}`);
}

// Two LIVE entries covering one product on overlapping dates: the first in the
// array silently wins, which is never what anyone meant.
const live = PROMOS.filter((p) => p.live);
for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) {
  const a = live[i], b = live[j];
  if (day(a.start) < day(b.end) && day(b.start) < day(a.end)) {
    const both = a.products.filter((x) => b.products.includes(x));
    if (both.length) problems.push(`${a.code} and ${b.code} overlap on ${both.join(", ")}`);
  }
}

console.log(`promo calendar: ${PROMOS.length} entries, ${live.length} live`);
for (const l of info) console.log(`  ${l}`);
console.log("  (cannot verify the codes exist in LemonSqueezy from here; that is the owner's step)");
if (problems.length) {
  console.log(`\n${problems.length} PROBLEM(S):`);
  for (const p of problems) console.log(`  ! ${p}`);
  process.exit(1);
}
console.log("no problems.");
