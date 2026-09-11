// A price written in prose next to a link to the product it describes.
//
//   node _tools/check-linked-prices.js
//
// WHY
// ---
// Three times now a hand-written price has gone stale after a reprice, each in
// a different kind of file, each invisible to every other check:
//
//   - the club value stacks (fixed: check-value-stacks.js owns them now),
//   - a product page's own body copy (set-usd-price.js warns, since Sept),
//   - and the Halloween hub, which said $39.99 for two days after the pack
//     moved to $35.97. Nothing looks at content pages: set-usd-price.js only
//     walks product pages and listing tiles, and check-value-stacks.js only
//     knows the pages in its own maps.
//
// The pattern that catches all three cheaply is narrow on purpose: a link to
// /store/pNN/ followed closely by a dollar amount is a claim about THAT
// product's price, and it is checkable against the price on that product's own
// page. Anything further away is prose we cannot judge, so it is left alone.
//
// It reads the generated pages AND the specs that produce them, because fixing
// only the page is how a hand edit gets reverted by the next --write.
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
// The amount has to be the NEXT thing after the link, not merely near it.
// A window of "the next 90 characters" looked reasonable and was wrong: the
// cross-sell blocks read "<a>Holidays 6-Pack</a>. This game is $11.99." where
// the link points at the PACK and the amount is the price of the page you are
// standing on. That single shape produced 40 false positives on the first run.
// Only a parenthetical or an immediately-adjacent amount is a claim about the
// thing just linked.
const ADJACENT = /^[\s.,:;–—-]{0,4}(?:is\s+|costs\s+|for\s+)?\(?\s*\$([0-9][0-9,]*\.[0-9]{2})/;
const WINDOW = 40;
const SKIP_DIRS = new Set(["_tools", ".git", "node_modules", "assets", "files", "uploads", "pages", "4", "_export"]);
// Specs whose text is injected verbatim into a page. Checked as raw text.
const SPECS = ["_tools/new-content-pages.json", "_tools/new-products.json", "_content/campaigns.json"];

const money = (n) => "$" + Number(n).toFixed(2);

// pid -> the price actually charged, from that product's own page.
const PRICES = {};
for (const dir of fs.readdirSync(path.join(REPO, "store"))) {
  if (!/^p\d+$/.test(dir)) continue;
  for (const f of fs.readdirSync(path.join(REPO, "store", dir))) {
    if (!f.endsWith(".html")) continue;
    const html = fs.readFileSync(path.join(REPO, "store", dir, f), "utf8");
    if (!html.includes(`data-product="${dir}"`)) continue;
    const m = html.match(/itemprop="price"\s+content="([0-9.]+)"/);
    if (m) PRICES[dir] = Number(m[1]);
  }
}

function walk(dir, out) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const rel = path.relative(REPO, full);
    if (rel.split(path.sep).some((seg, i) => i === 0 && SKIP_DIRS.has(seg))) continue;
    const st = fs.statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (name.endsWith(".html")) out.push(rel);
  }
  return out;
}

// A product page quoting its OWN price is the price area, not prose, and a
// listing tile is generated. Only look at pages that are not the product's own.
const LINK_RE = /<a [^>]*href="\\?"?\/store\/(p\d+)\/[^"]*\\?"?[^>]*>([\s\S]{0,200}?)<\/a>/g;

const problems = [];
let checked = 0, claims = 0;

for (const rel of [...walk(REPO, []), ...SPECS]) {
  const abs = path.join(REPO, rel);
  if (!fs.existsSync(abs)) continue;
  const text = fs.readFileSync(abs, "utf8");
  checked++;
  LINK_RE.lastIndex = 0;
  let m;
  while ((m = LINK_RE.exec(text))) {
    const pid = m[1];
    if (PRICES[pid] === undefined) continue;
    // Skip the product's own page and its own listing tiles: those numbers are
    // generated from the same source this is comparing against.
    if (rel.startsWith(`store/${pid}/`)) continue;
    if (/wsite-com-category-product/.test(text.slice(Math.max(0, m.index - 400), m.index))) continue;

    const after = text.slice(m.index + m[0].length, m.index + m[0].length + WINDOW);
    const hit = after.match(ADJACENT);
    if (!hit) continue;
    claims++;
    const said = Number(hit[1].replace(/,/g, ""));
    if (Math.abs(said - PRICES[pid]) > 0.005) {
      const line = text.slice(0, m.index).split("\n").length;
      problems.push(
        `${rel}:${line}  ${pid} is quoted at ${money(said)} in prose, its page charges ${money(PRICES[pid])}`
      );
    }
  }
}

console.log(`products priced : ${Object.keys(PRICES).length}`);
console.log(`files scanned   : ${checked}`);
console.log(`price claims    : ${claims}`);
if (problems.length) {
  console.log(`\n${problems.length} STALE PRICE(S):`);
  problems.forEach((p) => console.log(`  ! ${p}`));
  console.log("\nFix the SPEC as well as the page, or the next --write reverts the page.");
  process.exit(1);
}
console.log("\nevery price written beside a product link matches that product's page.");
