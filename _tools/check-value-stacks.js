// Verify the club (and club-shaped-bundle) "Quick math" paragraphs still add up.
//
//   node _tools/check-value-stacks.js            # check
//   node _tools/check-value-stacks.js --write    # regenerate the prose
//
// The three club pages, plus any ADDON_PACKS entry, each carry a hand-written
// value stack — so many games at the single-game price, plus a Bingo Card
// Generator licence, plus (clubs only) the Handbook, totalling a compare-at
// figure. **No tool generates that prose**, which is exactly how Bronze ended
// up advertising $89 months after it dropped to $79, and how its cost-per-game
// cell stayed wrong because it was derived from the stale number.
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
    sells: 386.49, words: "All fifty games",   licName: "Annual licence" },
];

// Same "games + licence = value" arithmetic as the clubs, for a pack that
// bundles in a Generator licence perk without the Handbook — so it gets its
// own list rather than being forced into CLUBS, which goldclubplaylists.html
// below assumes is exactly the three real club tiers.
const ADDON_PACKS = [
  { pid: "p155", file: "store/p155/holidays.html", games: 6, licence: 24.00,
    sells: 57.56, words: "Six games", licName: "Monthly licence" },
];

const VALUE_STACKS = [
  ...CLUBS.map((c) => ({ ...c, handbook: true })),
  ...ADDON_PACKS.map((c) => ({ ...c, handbook: false })),
];

// A pack whose components are NOT all the same price, so "N games at the single
// price" cannot describe it. p189 is one music bingo game at $11.99, a print
// and play trivia show at $11.99 and a game show presentation at $16.99, plus
// the Generator month.
//
// It gets its own pass rather than a `games` count, because the whole point is
// that there is no single figure to multiply. Each component price is read off
// that component's own page, so a reprice anywhere in the bundle moves this
// paragraph on the next run instead of leaving it quietly wrong — which is the
// failure this whole file exists to stop.
const MIXED_PACKS = [
  {
    pid: "p189",
    file: "store/p189/halloweencompletepack.html",
    components: [
      // `quote` overrides the price read off the page. KNOWN AND DELIBERATE,
      // owner's call 11 Sept 2026, in the owner's own words: "we're calling the
      // autoload feature an added $5". A music bingo game that ships with a
      // one-click autoload link into Generator 2.0 is $16.99; p97 sold on its
      // own does not have autoload yet and stays the plain $11.99 game. The
      // $5.00 gap the run prints below IS that feature, priced. Do not "fix" it
      // by dropping the quote back to $11.99, and do not add copy bragging
      // about the $5 either; whether p97 gets autoload standalone is a later
      // decision. Same idiom as the p155 accepted ladder inversion.
      //
      // An override is a liability, so it is loud: the run prints the gap and
      // the total it produces on every pass, and it CANNOT go stale quietly the
      // way a hand-typed paragraph does. Retire it the moment p97 itself moves
      // to $16.99 in LemonSqueezy, and the stack goes back to reading three
      // real page prices.
      { file: "store/p97/halloweenparty.html", quote: 16.99, why: "autoload edition" },
      { file: "store/p174/triviashowhalloween.html" },
      { file: "store/p33/fatbottomtrivia15.html" },
    ],
    words: "Bought one at a time the three games come to",
    // The Generator month is NOT in the compare-at any more. It reads better as
    // a free bonus on top of a real saving than as $24 of padding inside one,
    // and it keeps the compare-at to things that are genuinely for sale as
    // games. Set `licence` to fold it back in.
    licence: 0,
    bonus: "the month of Bingo Card Generator 2.0",
    sells: 35.97,
  },
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

// The same failure mode, smaller: two 4-pack pages state what their components
// cost bought separately, in prose, as a bare number. Nothing regenerated it,
// so a single-game reprice left both understating their own pack's saving.
// Not a club, so it gets its own tiny pass rather than being forced into the
// CLUBS shape — but the same rule: derive it, never type it.
const BUNDLE_PROSE = [
  { pid: "p165", file: "store/p165/aroundtheworldpack.html", games: 4, words: "all four" },
  { pid: "p166", file: "store/p166/partystarterpack.html",   games: 4, words: "all four" },
  { pid: "p147", file: "store/p147/decades.html",             games: 5, words: "all five" },
  { pid: "p168", file: "store/p168/thingsinsongs.html",       games: 5, words: "all five" },
];

const problems = [];

// goldclubplaylists.html is a standalone landing page — not a product page, so
// set-usd-price.js never sees it and its stale-copy WARN never fires. It carries
// the whole club comparison in hand-written prose and a hand-written table: all
// three tier prices, all three cost-per-game figures, and the single-game price
// quoted twice. Every one of them went stale in the fall repricing and nothing
// caught it. Derived here instead.
const LANDING = "goldclubplaylists.html";
{
  let html = read(LANDING);
  const before = html;
  const sells = CLUBS.map((c) => c.sells);
  // Cost per game backs the bundled licence out of the price first, which is
  // what the page's own "(after backing out the Gen 2 bonus value)" says.
  const perGame = CLUBS.map((c) => Number(((c.sells - c.licence) / c.games).toFixed(2)));

  const edits = [
    [/(<td>Price<\/td>)<td>\$[0-9,.]+<\/td><td>\$[0-9,.]+<\/td><td>\$[0-9,.]+<\/td>/,
     (m, a) => a + sells.map((v) => `<td>${money(v)}</td>`).join("")],
    [/(Cost per game[\s\S]{0,120}?<\/td>)<td>\$[0-9,.]+<\/td><td>\$[0-9,.]+<\/td><td>\$[0-9,.]+<\/td>/,
     (m, a) => a + perGame.map((v) => `<td>${money(v)}</td>`).join("")],
    [/(Get the Silver Club: )\$[0-9,.]+/g, (m, a) => a + money(CLUBS[1].sells)],
    [/(Get the Starter Pack: )\$[0-9,.]+/g, (m, a) => a + money(CLUBS[0].sells)],
    [/(Get the Gold Club: )\$[0-9,.]+/g, (m, a) => a + money(CLUBS[2].sells)],
    [/(sold individually for )\$[0-9,.]+/g, (m, a) => a + money(SINGLE)],
  ];
  for (const [re, fn] of edits) {
    if (!re.test(html)) { problems.push(`${LANDING}: could not find ${re.source.slice(0, 40)}…`); continue; }
    html = html.replace(re, fn);
  }
  if (html !== before) {
    if (WRITE) {
      fs.writeFileSync(path.join(REPO, LANDING), html);
      console.log(`  rewrote ${LANDING}`);
    } else {
      problems.push(`${LANDING}: prices are stale — re-run with --write`);
    }
  }
  console.log(
    `${"landing".padEnd(5)} ${LANDING}: tiers ${sells.map(money).join(" / ")}, ` +
    `per game ${perGame.map(money).join(" / ")}, single ${money(SINGLE)}`
  );
}

for (const b of BUNDLE_PROSE) {
  const want = Number((b.games * SINGLE).toFixed(2));
  const re = new RegExp(`(Buying ${b.words} separately costs )(\\$[0-9,]+\\.[0-9]{2})`);
  let html = read(b.file);
  let m = html.match(re);
  if (!m) {
    problems.push(`${b.pid}: no "Buying ${b.words} separately costs $X" sentence found`);
    continue;
  }
  if (WRITE && num(m[2]) !== want) {
    html = html.replace(re, (whole, lead) => lead + money(want));
    fs.writeFileSync(path.join(REPO, b.file), html);
    console.log(`  rewrote ${b.file}`);
    m = html.match(re);
  }
  if (Math.abs(num(m[2]) - want) > 0.005)
    problems.push(`${b.pid}: "bought separately" says ${m[2]}, ${b.games} × ${money(SINGLE)} is ${money(want)}`);
  else
    console.log(`${b.pid.padEnd(5)} ${b.games} games bought separately = ${money(want)}`);
}

for (const c of VALUE_STACKS) {
  const html = read(c.file);
  const expectGames = Number((c.games * SINGLE).toFixed(2));
  const expectTotal = Number(
    (expectGames + c.licence + (c.handbook ? HANDBOOK : 0)).toFixed(2)
  );
  const expectSave = Number((expectTotal - c.sells).toFixed(2));

  // Every dollar figure in the Quick math paragraph, in order.
  const SENTENCE = new RegExp(
    `${c.words} at \\$[0-9,.]+ is [\\s\\S]*?you keep <strong>\\$[0-9,.]+</strong>\\.`
  );
  if (WRITE) {
    const rebuilt = c.handbook
      ? `${c.words} at ${money(SINGLE)} is ${money(expectGames)}. Add the ` +
        `${money(c.licence)} ${c.licName} and the ${money(HANDBOOK)} Handbook: ` +
        `<strong>${money(expectTotal)}</strong> of value, yours for ` +
        `<strong>${money(c.sells)}</strong>, and you keep <strong>${money(expectSave)}</strong>.`
      : `${c.words} at ${money(SINGLE)} is ${money(expectGames)}. Add the ` +
        `${money(c.licence)} ${c.licName}: <strong>${money(expectTotal)}</strong> ` +
        `of value, yours for <strong>${money(c.sells)}</strong>, and you keep ` +
        `<strong>${money(expectSave)}</strong>.`;
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
  // single, games-value, licence, [handbook], total, sells, save
  const [gotSingle, gotGames, gotLic, gotHb, gotTotal, gotSells, gotSave] = c.handbook
    ? figs
    : [figs[0], figs[1], figs[2], undefined, figs[3], figs[4], figs[5]];

  const check = (label, got, want) => {
    if (got === undefined) problems.push(`${c.pid}: ${label} missing from Quick math`);
    else if (Math.abs(got - want) > 0.005)
      problems.push(`${c.pid}: ${label} says ${money(got)}, should be ${money(want)}`);
  };
  check("single-game price", gotSingle, SINGLE);
  check("games subtotal", gotGames, expectGames);
  check("licence price", gotLic, c.licence);
  if (c.handbook) check("handbook price", gotHb, HANDBOOK);
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
    (c.handbook ? `+ ${money(HANDBOOK)} handbook ` : "") +
    `= ${money(expectTotal)} -> sells ${money(c.sells)}, saves ${money(expectSave)}`
  );
}

for (const m of MIXED_PACKS) {
  let onPage = 0;
  const prices = m.components.map((c) => {
    const rel = typeof c === "string" ? c : c.file;
    const hit = read(rel).match(/itemprop="price"\s+content="([0-9.]+)"/);
    if (!hit) { problems.push(`${m.pid}: no price on ${rel}`); return null; }
    const real = Number(hit[1]);
    onPage += real;
    const quote = typeof c === "object" && c.quote ? c.quote : real;
    if (quote !== real) {
      console.log(
        `  NOTE ${m.pid}: ${rel} is quoted at ${money(quote)} (${c.why || "override"}) ` +
        `but its own page charges ${money(real)}`
      );
    }
    return quote;
  });
  if (prices.some((v) => v === null)) continue;

  const expectGames = Number(prices.reduce((n, v) => n + v, 0).toFixed(2));
  const expectTotal = Number((expectGames + m.licence).toFixed(2));
  const expectSave = Number((expectTotal - m.sells).toFixed(2));
  const gap = Number((expectGames - onPage).toFixed(2));
  if (gap > 0) {
    console.log(
      `  NOTE ${m.pid}: compare-at is ${money(gap)} above the ${money(onPage)} a shopper ` +
      `gets by adding up the linked product pages (deliberate, see the map)`
    );
  }

  const rebuilt = m.licence
    ? `${m.words} ${money(expectGames)}. Add the ${money(m.licence)} ${m.licName}: ` +
      `<strong>${money(expectTotal)}</strong> of value, yours for ` +
      `<strong>${money(m.sells)}</strong>, and you keep <strong>${money(expectSave)}</strong>.`
    : `${m.words} ${money(expectGames)}. In this pack they are ` +
      `<strong>${money(m.sells)}</strong>, so you keep <strong>${money(expectSave)}</strong>, ` +
      `and ${m.bonus} is free.`;

  // Anchored on the opening words and run to the end of the paragraph, rather
  // than to a "you keep $X." tail: a pack whose perk is a free bonus ends on the
  // bonus instead, and a tail-anchored pattern silently stops matching the
  // moment the sentence shape changes — which is how a stack goes unverified.
  const SENTENCE = new RegExp(
    `${m.words} \\$[0-9,.]+\\.[\\s\\S]*?(?=</p>)`
  );
  let html = read(m.file);
  if (!SENTENCE.test(html)) {
    problems.push(`${m.pid}: no "${m.words} …" Quick math sentence found`);
    continue;
  }
  if (WRITE) {
    const next = html.replace(SENTENCE, () => rebuilt);
    if (next !== html) {
      fs.writeFileSync(path.join(REPO, m.file), next);
      console.log(`  rewrote ${m.file}`);
      html = next;
    }
  }

  const got = (html.match(SENTENCE) || [""])[0];
  const figs = (got.match(/\$[0-9,]+\.[0-9]{2}/g) || []).map(num);
  const want = m.licence
    ? [expectGames, m.licence, expectTotal, m.sells, expectSave]
    : [expectGames, m.sells, expectSave];
  const labels = m.licence
    ? ["games subtotal", "licence price", "value total", "selling price", "saving"]
    : ["games subtotal", "selling price", "saving"];
  want.forEach((w, i) => {
    if (figs[i] === undefined) problems.push(`${m.pid}: ${labels[i]} missing from Quick math`);
    else if (Math.abs(figs[i] - w) > 0.005)
      problems.push(`${m.pid}: ${labels[i]} says ${money(figs[i])}, should be ${money(w)}`);
  });

  const priceM = html.match(/itemprop="price"\s+content="([0-9.]+)"/);
  const regM = html.match(
    /<div id="wsite-com-product-price" class="wsite-com-product-price-container">[\s\S]*?\$([0-9,]+\.[0-9]{2})/
  );
  if (priceM && Math.abs(Number(priceM[1]) - m.sells) > 0.005)
    problems.push(`${m.pid}: itemprop price is ${money(Number(priceM[1]))}, prose sells at ${money(m.sells)}`);
  if (regM && Math.abs(num(regM[1]) - expectTotal) > 0.005)
    problems.push(`${m.pid}: struck-through compare-at is ${money(num(regM[1]))}, value stack totals ${money(expectTotal)}`);

  console.log(
    `${m.pid.padEnd(5)} ${prices.map(money).join(" + ")} = ${money(expectGames)}` +
    (m.licence ? ` + ${money(m.licence)} licence = ${money(expectTotal)}` : "") +
    ` -> sells ${money(m.sells)}, saves ${money(expectSave)}`
  );
}

if (WRITE) {
  // The compare-at lives in the price area, which set-usd-price.js owns. Print
  // the exact command rather than reaching into another tool's territory.
  console.log("\nNow align each compare-at with its new total:");
  for (const c of VALUE_STACKS) {
    const t = (c.games * SINGLE + c.licence + (c.handbook ? HANDBOOK : 0)).toFixed(2);
    console.log(`  node _tools/set-usd-price.js ${c.pid} ${t} ${c.sells.toFixed(2)}`);
  }
  for (const m of MIXED_PACKS) {
    const games = m.components.reduce((n, c) => {
      const rel = typeof c === "string" ? c : c.file;
      if (typeof c === "object" && c.quote) return n + c.quote;
      const hit = read(rel).match(/itemprop="price"\s+content="([0-9.]+)"/);
      return n + (hit ? Number(hit[1]) : 0);
    }, 0);
    const t = (games + m.licence).toFixed(2);
    console.log(`  node _tools/set-usd-price.js ${m.pid} ${t} ${m.sells.toFixed(2)}`);
  }
}

if (problems.length) {
  console.log(`\n${problems.length} PROBLEM(S):`);
  problems.forEach((p) => console.log(`  ! ${p}`));
  process.exit(1);
}
console.log(`\nall ${VALUE_STACKS.length + MIXED_PACKS.length} value stacks add up, and match their compare-at prices.`);
