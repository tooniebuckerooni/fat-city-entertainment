// Verify the club "Quick math" paragraphs still add up.
//
//   node _tools/check-value-stacks.js            # check
//   node _tools/check-value-stacks.js --write    # regenerate the prose
//
// The three club pages each carry a hand-written value stack — so many games at
// the single-game price, plus a Bingo Card Generator licence, plus the Handbook,
// totalling a compare-at figure. **No tool generates that prose**, which is
// exactly how Bronze ended up advertising $89 months after it dropped to $79,
// and how its cost-per-game cell stayed wrong because it was derived from the
// stale number.
//
// This recomputes every figure from the live single-game price and the licence
// prices, and checks the struck-through compare-at on the page matches the total
// the prose claims.
//
// With --write it REGENERATES that paragraph, which is the point: it moves the
// club value stacks out of "hand-written prose no tool owns" and into the same
// regenerate-and-verify loop as every other derived price on this site. After a
// single-game reprice, run this instead of editing three paragraphs by hand.
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "..");
const WRITE = process.argv.includes("--write");

// The single-game price every stack is built from. Read it off a real product
// rather than hardcoding, so the check follows a reprice automatically.
// p103 Christmas Party is the same product add-price-ladder.js uses to anchor
// its "a single game" rung, so the two tools agree by construction.
const ANCHOR = "store/p103/christmasparty.html";

// Perks bundled with each tier. These ARE hardcoded: they are third-party
// prices (a Generator licence, an Amazon ebook) that appear nowhere in this
// repo as a machine-readable figure. If one changes, change it here AND in the
// three club pages AND on printmusicbingocards.html.
const HANDBOOK = 10.99;
const CLUBS = [
  { pid: "p131", file: "store/p131/BronzeClub.html", games: 10, licence: 6.99,
    sells: 79.00,  words: "Ten games",        licName: "Day Pass" },
  { pid: "p130", file: "store/p130/SilverClub.html", games: 25, licence: 24.00,
    sells: 193.75, words: "Twenty-five games", licName: "Monthly licence" },
  { pid: "p112", file: "store/p112/GoldClub.html",   games: 50, licence: 116.00,
    sells: 415.50, words: "All fifty games",   licName: "Annual licence" },
];

const read = (rel) => fs.readFileSync(path.join(REPO, rel), "utf8");
const money = (n) => "$" + n.toFixed(2);
const num = (s) => Number(String(s).replace(/[$,]/g, ""));

const anchorHtml = read(ANCHOR);
const singleM = anchorHtml.match(/itemprop="price"\s+content="([0-9.]+)"/);
if (!singleM) {
  console.error(`could not read the single-game price from ${ANCHOR}`);
  process.exit(1);
}
const SINGLE = Number(singleM[1]);
console.log(`single-game price (from ${ANCHOR}): ${money(SINGLE)}\n`);

const problems = [];

for (const c of CLUBS) {
  const html = read(c.file);
  const expectGames = Number((c.games * SINGLE).toFixed(2));
  const expectTotal = Number((expectGames + c.licence + HANDBOOK).toFixed(2));
  const expectSave = Number((expectTotal - c.sells).toFixed(2));

  // Every dollar figure in the Quick math paragraph, in order.
  const SENTENCE = new RegExp(
    `${c.words} at \\$[0-9,.]+ is [\\s\\S]*?you keep <strong>\\$[0-9,.]+</strong>\\.`
  );
  if (WRITE) {
    const rebuilt =
      `${c.words} at ${money(SINGLE)} is ${money(expectGames)}. Add the ` +
      `${money(c.licence)} ${c.licName} and the ${money(HANDBOOK)} Handbook: ` +
      `<strong>${money(expectTotal)}</strong> of value, yours for ` +
      `<strong>${money(c.sells)}</strong> — you keep <strong>${money(expectSave)}</strong>.`;
    if (SENTENCE.test(html)) {
      const next = html.replace(SENTENCE, () => rebuilt);
      if (next !== html) {
        fs.writeFileSync(path.join(REPO, c.file), next);
        console.log(`  rewrote ${c.file}`);
      }
    } else {
      problems.push(`${c.pid}: could not find the Quick math sentence to rewrite`);
      continue;
    }
  }
  const html2 = read(c.file);
  const mathM = html2.match(/Quick math[\s\S]{0,900}?you keep <strong>\$[0-9,.]+<\/strong>/i);
  if (!mathM) {
    problems.push(`${c.pid}: no "Quick math" block found — has the copy been rewritten?`);
    continue;
  }
  const figs = (mathM[0].match(/\$[0-9,]+\.[0-9]{2}/g) || []).map(num);
  // single, games-value, licence, handbook, total, sells, save
  const [gotSingle, gotGames, gotLic, gotHb, gotTotal, gotSells, gotSave] = figs;

  const check = (label, got, want) => {
    if (got === undefined) problems.push(`${c.pid}: ${label} missing from Quick math`);
    else if (Math.abs(got - want) > 0.005)
      problems.push(`${c.pid}: ${label} says ${money(got)}, should be ${money(want)}`);
  };
  check("single-game price", gotSingle, SINGLE);
  check("games subtotal", gotGames, expectGames);
  check("licence price", gotLic, c.licence);
  check("handbook price", gotHb, HANDBOOK);
  check("value total", gotTotal, expectTotal);
  check("selling price", gotSells, c.sells);
  check("saving", gotSave, expectSave);

  // The struck-through compare-at must equal the total the prose claims, or the
  // page argues with itself in two places a buyer reads together.
  const priceM = html2.match(/itemprop="price"\s+content="([0-9.]+)"/);
  const regM = html2.match(
    /<div id="wsite-com-product-price" class="wsite-com-product-price-container">[\s\S]*?\$([0-9,]+\.[0-9]{2})/
  );
  if (priceM && Math.abs(Number(priceM[1]) - c.sells) > 0.005)
    problems.push(`${c.pid}: itemprop price is ${money(Number(priceM[1]))}, prose sells at ${money(c.sells)}`);
  if (regM && Math.abs(num(regM[1]) - expectTotal) > 0.005)
    problems.push(`${c.pid}: struck-through compare-at is ${money(num(regM[1]))}, value stack totals ${money(expectTotal)}`);

  console.log(
    `${c.pid.padEnd(5)} ${c.games} games ${money(expectGames)} + ${money(c.licence)} licence ` +
    `+ ${money(HANDBOOK)} handbook = ${money(expectTotal)} -> sells ${money(c.sells)}, saves ${money(expectSave)}`
  );
}

if (WRITE) {
  // The compare-at lives in the price area, which set-usd-price.js owns. Print
  // the exact command rather than reaching into another tool's territory.
  console.log("\nNow align each compare-at with its new total:");
  for (const c of CLUBS) {
    const t = (c.games * SINGLE + c.licence + HANDBOOK).toFixed(2);
    console.log(`  node _tools/set-usd-price.js ${c.pid} ${t} ${c.sells.toFixed(2)}`);
  }
}

if (problems.length) {
  console.log(`\n${problems.length} PROBLEM(S):`);
  problems.forEach((p) => console.log(`  ! ${p}`));
  process.exit(1);
}
console.log("\nall three value stacks add up, and match their compare-at prices.");
