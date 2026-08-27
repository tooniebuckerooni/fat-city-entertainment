// The price ladder on trivia-store.html — one table showing how the tiers
// compare, generated from the product pages themselves.
//
//   node _tools/add-price-ladder.js            # dry run
//   node _tools/add-price-ladder.js --preview  # show the rendered rows
//   node _tools/add-price-ladder.js --write
//
// WHY
// ---
// The catalogue runs from a $10.99 single to a $415.50 club, and nowhere on the
// site does it say what the steps are or what each one costs per game. A buyer
// looking at one product page has no way to see that the five-pack it belongs to
// works out at $8.00 a game, and no reason to go looking. Average order value is
// the fastest lever available to this site — no new traffic required — and it is
// hard to climb a ladder you can't see.
//
// WHY THIS IS GENERATED, NOT TYPED
// --------------------------------
// A table of prices hand-written into body copy is wrong the first time anything
// is repriced, and nobody finds out until a customer does. So every number here
// is read from the product page's own itemprop="price" — the price actually
// charged — and the block is regenerated in place on each run. Re-run this after
// any price change, exactly like add-cross-sell.js and bake-buy-links.js.
//
// The three club tiers carry a compare-at price as well ("$665.50 → $415.50").
// The table shows the charged price and marks the row, rather than quoting the
// anchor as if it were the price.
//
// WHAT THE TABLE REVEALS — read before "fixing" the copy
// -----------------------------------------------------
// Per-game price does NOT fall monotonically as you climb. As of Aug 27 2026:
//
//   3-pack $23.99 -> $8.00/game        5-pack  $43.00 -> $8.60/game
//   6-pack $46.99 -> $7.83/game        Bronze  $89.00 -> $8.90/game
//
// The five-pack and the ten-game Starter Pack are both worse per game than the
// cheapest three-pack. That is a pricing decision for the owner, not something
// to paper over here: the intro copy therefore claims only what is true — every
// multi-pack beats buying singles — and never "the more you buy the cheaper it
// gets", which the numbers do not support. If the ladder is ever repriced to
// actually descend, this comment and that sentence can both get stronger.
//
// The block is injected BEFORE the <!-- fce:copy --> marker, not inside it:
// add-page-copy.js owns everything between those markers and would overwrite
// anything placed there. It also puts the table above the long-form copy, which
// is where a decision aid belongs.

const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const WRITE = process.argv.includes("--write");
const PREVIEW = process.argv.includes("--preview");

const PAGE = "trivia-store.html";
const OPEN = "<!-- fce:price-ladder -->";
const CLOSE = "<!-- /fce:price-ladder -->";
const COPY_MARKER = "<!-- fce:copy -->";

// One representative product per rung, with the plain-language "who is this
// for" that the store page never says out loud. Games-per-pack is stated here
// rather than derived, because a bundle page's component list is prose and
// guessing at it is how Countries once got paired with Halloween Party.
const RUNGS = [
  { file: "store/p103/christmasparty.html", games: 1,
    tier: "A single game",
    who: "Trying music bingo for the first time, or filling one themed night." },
  { file: "store/p127/moviesoundtracks3pack.html", games: 3,
    tier: "A 3-pack",
    who: "One theme you want more of — three nights out of a single checkout." },
  { file: "store/p147/decades.html", games: 5,
    tier: "A 5-pack",
    who: "The most popular step. Enough variety for a month of weekly nights." },
  { file: "store/p155/holidays.html", games: 6,
    tier: "The Holidays 6-pack",
    who: "A year of seasonal nights, bought once — Valentine's through Christmas." },
  { file: "store/p131/BronzeClub.html", games: 10,
    tier: "Starter Pack (Bronze)",
    who: "The ten best-selling games. Where most regular hosts should start." },
  // Silver states its own count on the page — "the first 25 games in our full
  // collection" — so it gets the per-game figure. Gold says "all", which is a
  // number that changes with every release; asserting one here would be a
  // guess that goes stale, so its cell stays blank and the note explains why.
  { file: "store/p130/SilverClub.html", games: 25,
    tier: "Silver Club",
    who: "The first 25 games in the collection, plus a free month of the Bingo Card Generator." },
  { file: "store/p112/GoldClub.html", games: null,
    tier: "Gold Club",
    who: "Every music bingo game we make, every new release, and a free year of the Bingo Card Generator." },
];

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
  .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const money = (n) => "$" + n.toFixed(2);

function readProduct(rel) {
  const file = path.join(REPO, rel);
  if (!fs.existsSync(file)) return null;
  const html = fs.readFileSync(file, "utf8");
  const price = html.match(/itemprop="price"\s+content="([0-9.]+)"/);
  const title = html.match(/<h1[^>]*id="wsite-com-product-title"[^>]*>([\s\S]*?)<\/h1>/);
  if (!price) return null;
  const shown = [...new Set(html.match(/\$[\d,]+\.\d\d USD/g) || [])];
  return {
    href: "/" + rel,
    amount: Number(price[1]),
    onSale: shown.length > 1,
    name: title ? title[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : rel,
  };
}

const rows = [];
const problems = [];
for (const rung of RUNGS) {
  const p = readProduct(rung.file);
  if (!p) { problems.push(rung.file); continue; }
  rows.push({ ...rung, ...p });
}

function render() {
  const body = rows.map((r) => {
    const each = r.games ? `${money(r.amount / r.games)} a game` : "&mdash;";
    const sale = r.onSale ? ' <span class="fce-ladder-sale">on sale</span>' : "";
    return `      <tr>\n` +
      `        <th scope="row"><a href="${r.href}">${esc(r.tier)}</a></th>\n` +
      `        <td class="fce-ladder-price">${money(r.amount)}${sale}</td>\n` +
      `        <td class="fce-ladder-each">${each}</td>\n` +
      `        <td>${esc(r.who)}</td>\n` +
      `      </tr>`;
  }).join("\n");

  return `${OPEN}
<section class="fce-copy fce-ladder">
<div class="fce-copy-inner">
<h2>How the packs compare</h2>
<p>Every game is the same thing in the box &mdash; 250 randomized cards, the
printable callsheet, and ready-made Spotify and Apple Music playlists. The only
question is how many nights you're buying at once. <strong>Every multi-game pack
works out cheaper per night than buying singles</strong>, so if you know you'll
run more than one, the pack pays for itself on the second game.</p>
<div class="fce-ladder-scroll">
  <table>
    <thead>
      <tr><th scope="col">Tier</th><th scope="col">Price</th><th scope="col">Works out at</th><th scope="col">Who it's for</th></tr>
    </thead>
    <tbody>
${body}
    </tbody>
  </table>
</div>
<p class="fce-ladder-note">Prices in USD. The Gold Club has no per-game figure
because it doesn't have a fixed number of games &mdash; every new release is
included as it lands. Already own a game that's inside a pack you want? Email us
before you buy and we'll send you a credit code.</p>
</div>
</section>
${CLOSE}`;
}

const pageFile = path.join(REPO, PAGE);
let html = fs.readFileSync(pageFile, "utf8");
const before = html;
const block = render();

if (PREVIEW) {
  for (const r of rows) {
    const each = r.games ? money(r.amount / r.games) + "/game" : "—";
    console.log(`  ${r.tier.padEnd(24)} ${money(r.amount).padStart(9)} ${r.onSale ? "(sale)" : "      "} ${each.padStart(12)}`);
  }
  console.log();
}

const start = html.indexOf(OPEN);
let action;
if (start !== -1) {
  const end = html.indexOf(CLOSE, start);
  if (end === -1) { console.error(`unclosed ${OPEN} in ${PAGE}`); process.exit(1); }
  html = html.slice(0, start) + block + html.slice(end + CLOSE.length);
  action = html === before ? "unchanged" : "updated";
} else {
  const at = html.indexOf(COPY_MARKER);
  if (at === -1) { console.error(`no ${COPY_MARKER} anchor in ${PAGE}`); process.exit(1); }
  html = html.slice(0, at) + block + "\n\n    " + html.slice(at);
  action = "added";
}

if (WRITE && action !== "unchanged") fs.writeFileSync(pageFile, html);

console.log(`${PAGE}: price ladder ${action} (${rows.length} rungs)`);
for (const p of problems) console.log(`  NO PRICE FOUND: ${p}`);
const sale = rows.filter((r) => r.onSale);
if (sale.length) {
  console.log(`  ${sale.length} tier(s) on sale — re-run this tool after any repricing:`);
  for (const r of sale) console.log(`    ${r.tier} — charging ${money(r.amount)}`);
}
if (!WRITE) console.log("\n(dry run -- pass --write to apply)");
