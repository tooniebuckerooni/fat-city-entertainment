// Cross-sell links on store product pages (Aug 2026 conversion audit, item 3).
//
// LemonSqueezy's hosted checkout is one product per checkout — there is no
// cart, so "add another item" has to happen on the page, before checkout.
// Three placements, all injected right under the buy area between
// <!-- fce:cross-sell:start/end --> markers (re-runs replace the block, so
// edits here propagate):
//
//   - a single pack that's part of a bundle  -> the bundle, with the maths
//   - a bundle page                          -> "In this bundle:" linked list
//     (components are named in the prose but were never hyperlinked)
//   - a stand-alone music bingo pack         -> Gold Club upsell
//
// THE ARITHMETIC (Aug 27 2026)
// ----------------------------
// Moving one buyer from a $10.99 single to a $43 five-pack is a 4x order and
// needs no new traffic — the fastest lever available, per HOLIDAY-PLAN.md. But
// "this is also in a bundle" doesn't move anyone; "the other four work out at
// $8.00 each" does. So every price here is READ OFF THE PAGE at build time
// (itemprop="price", i.e. the price actually charged) rather than kept in a
// map here, which would drift the moment anything is repriced.
//
// Two rules that follow from that, and neither is optional:
//
//   1. RE-RUN THIS TOOL AFTER ANY PRICE CHANGE. The numbers are baked into the
//      HTML. A stale sale price in body copy is a promise the checkout won't
//      keep. The run warns about every page carrying a sale price for exactly
//      this reason.
//   2. Never quote a sale price in the copy. The three club tiers are all
//      marked down from a compare-at price, so the Gold Club line stays
//      qualitative — what you get, not what it costs. Bundles and singles are
//      not on sale, so their maths is safe to state.
//
// Membership is only asserted where it is verifiable from the bundle page's own
// prose. p108 ("Entertainers" 3-Pack) is deliberately absent: it names "Video
// Games, Tv Shows, & Movie Soundtracks" and there are two TV Shows games and
// three Movie Soundtracks games, so which ones is a guess. p166 (Party Starter)
// is still staged/noindex — add it when it publishes.
//
//   node _tools/add-cross-sell.js            # dry run
//   node _tools/add-cross-sell.js --write
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const WRITE = process.argv.includes("--write");
const PREVIEW = process.argv.includes("--preview");

// pid -> { path, name } for every page we link to.
const PRODUCTS = {
  p112: { path: "/store/p112/GoldClub.html", name: "Music Bingo Gold Club" },
  p165: { path: "/store/p165/aroundtheworldpack.html", name: "Around The World... And Beyond! 4-Pack" },
  p168: { path: "/store/p168/thingsinsongs.html", name: "“Things In Songs” 5-Pack" },
  p147: { path: "/store/p147/decades.html", name: "“Decades” 5-Pack" },
  p128: { path: "/store/p128/onehitwonders2pack.html", name: "One Hit Wonders 2-Pack" },
  p132: { path: "/store/p132/roadtrip.html", name: "Road Trip!" },
  p122: { path: "/store/p122/cities.html", name: "Cities" },
  p100: { path: "/store/p100/Countries.html", name: "Countries" },
  p110: { path: "/store/p110/outofthisworld.html", name: "Out of This World" },
  p145: { path: "/store/p145/colors.html", name: "Colors" },
  p109: { path: "/store/p109/bodyparts.html", name: "Body Parts" },
  p92: { path: "/store/p92/foodfight.html", name: "Food Fight" },
  p71: { path: "/store/p71/zoorock.html", name: "Zoo Rock" },
  p156: { path: "/store/p156/numbers.html", name: "Numbers" },
  p153: { path: "/store/p153/the60s.html", name: "The 60s" },
  p115: { path: "/store/p115/the1970s.html", name: "The 70s" },
  p144: { path: "/store/p144/the80s.html", name: "The 80s" },
  p113: { path: "/store/p113/the90s.html", name: "The 90s" },
  p146: { path: "/store/p146/the2000s.html", name: "The 2000s" },
  p81: { path: "/store/p81/onehitwonders.html", name: "One Hit Wonders" },
  p155: { path: "/store/p155/holidays.html", name: "“Holidays” 6-Pack" },
  p101: { path: "/store/p101/theyearwas4pack.html", name: "“The Year Was…” 5-Pack" },
  p162: { path: "/store/p162/Word_Games_-_3_Pack.html", name: "Word Games 3-Pack" },
  p127: { path: "/store/p127/moviesoundtracks3pack.html", name: "Movie Soundtracks 3-Pack" },
  p136: { path: "/store/p136/stpaddysbingo.html", name: "St. Patrick's Day" },
  p149: { path: "/store/p149/aprilsfoolsday.html", name: "April Fools (Soundalikes)" },
  p97: { path: "/store/p97/halloweenparty.html", name: "Halloween Party" },
  p103: { path: "/store/p103/christmasparty.html", name: "Christmas Party" },
  p116: { path: "/store/p116/anagrams.html", name: "Anagrams" },
  p114: { path: "/store/p114/antonyms.html", name: "Antonyms" },
  p158: { path: "/store/p158/acronyms.html", name: "Acronyms" },
  p106: { path: "/store/p106/moviesoundtracks.html", name: "Movie Soundtracks 1" },
};

// bundle pid -> components, in the order the bundle page names them.
//
// A component is either a pid (a game with its own product page, so it gets a
// link and counts toward the arithmetic) or a plain string (a game sold only
// inside this bundle — named honestly, but there is nothing to link to). A
// 6-pack has to list six things whether or not all six are separately for sale;
// listing four of them would misdescribe what's in the box.
const BUNDLES = {
  p165: ["p132", "p122", "p100", "p110"],
  p168: ["p145", "p109", "p92", "p71", "p156"],
  p147: ["p153", "p115", "p144", "p113", "p146"],
  // p125 ("One Hit Wonders 2") is NOT a component here: that page is a redirect
  // stub pointing at this very bundle, so the game has no standalone sale and
  // its leftover $11.00 price tag is not a real comparison. It stays a name.
  p128: ["p81", "One Hit Wonders 2"],
  p162: ["p116", "p114", "p158"],
  p127: ["p106", "Movie Soundtracks 2", "Movie Soundtracks 3"],
  p155: ["Valentine's Day", "p136", "p149", "Mother's Day", "p97", "p103"],
  p101: ["The Year Was… 1983", "The Year Was… 1992", "The Year Was… 2001",
         "The Year Was… 2009", "The Year Was… 2022"],
};

// Music bingo singles that get the Gold Club line. Bundle membership wins where
// a game is in both lists — a $46.99 six-pack is a far likelier next step from a
// $10.99 game than a club tier, and it's the right one to show a buyer looking
// at Halloween in October.
const GOLD_SINGLES = [
  "p62", "p63", "p95", "p97", "p102", "p103", "p106", "p111", "p114", "p116",
  "p117", "p121", "p124", "p129", "p133", "p136", "p138", "p141", "p143",
  "p148", "p149", "p158", "p159", "p160", "p163",
];

const link = (pid) => `<a href="${PRODUCTS[pid].path}">${PRODUCTS[pid].name}</a>`;
const isPid = (c) => /^p\d+$/.test(c) && PRODUCTS[c];
// A component reads as a link when it has its own page, and as plain text when
// it is only sold inside the bundle.
const namePart = (c) => (isPid(c) ? link(c) : c);

// Prices come off the page, never out of a map here — see the header. The
// itemprop value is the price actually charged; a page carrying two visible
// prices is running a sale, which the caller warns about.
const priceCache = new Map();
function priceOf(pid) {
  if (priceCache.has(pid)) return priceCache.get(pid);
  let value = null;
  const p = PRODUCTS[pid] && path.join(REPO, PRODUCTS[pid].path.replace(/^\//, ""));
  if (p && fs.existsSync(p)) {
    const html = fs.readFileSync(p, "utf8");
    const m = html.match(/itemprop="price"\s+content="([0-9.]+)"/);
    const shown = new Set((html.match(/\$[\d,]+\.\d\d USD/g) || []));
    if (m) value = { amount: Number(m[1]), onSale: shown.size > 1 };
  }
  priceCache.set(pid, value);
  return value;
}
const money = (n) => "$" + n.toFixed(2);

function blockFor(pid) {
  const inBundle = Object.keys(BUNDLES).find((b) => BUNDLES[b].includes(pid));
  let inner;

  if (BUNDLES[pid]) {
    const parts = BUNDLES[pid];
    const bundle = priceOf(pid);
    const each = bundle ? money(bundle.amount / parts.length) : null;

    // "You save X" is only stated when every component has a page and a price
    // to compare against. Four of six games priced is not a saving anyone can
    // check, and an unverifiable number is worse than no number.
    const known = parts.filter(isPid).map(priceOf);
    const allKnown = known.length === parts.length && known.every(Boolean);
    const separately = allKnown ? known.reduce((n, p) => n + p.amount, 0) : null;
    const saving = allKnown && bundle ? separately - bundle.amount : null;

    let maths = "";
    if (each && saving > 0) {
      maths = ` That is <strong>${each} a game</strong> against ` +
              `${money(separately)} bought one at a time &mdash; you keep ${money(saving)}.`;
    } else if (each) {
      maths = ` One checkout, one download &mdash; <strong>${each} a game</strong>.`;
    }

    inner = `<strong>${parts.length} games in this pack:</strong> ` +
            parts.map(namePart).join(" &middot; ") + "." + maths;

  } else if (inBundle) {
    const mine = priceOf(pid);
    const bundle = priceOf(inBundle);
    const others = BUNDLES[inBundle].length - 1;

    // The number that moves someone: not what the bundle costs, but what the
    // games they are not currently buying cost if they take it.
    let maths = "";
    if (mine && bundle && others > 0) {
      const rest = (bundle.amount - mine.amount) / others;
      const tail = others === 1
        ? `which puts the second at <strong>${money(rest)}</strong>.`
        : `which puts the other ${others} at <strong>${money(rest)} each</strong>.`;
      maths = ` This game is ${money(mine.amount)}; the pack is ` +
              `${money(bundle.amount)} &mdash; ${tail}`;
    }

    inner = `<strong>Also in a pack:</strong> ${link(inBundle)}.` + maths;

  } else if (GOLD_SINGLES.includes(pid)) {
    // No price quoted here on purpose: the club tiers are all marked down from
    // a compare-at price, and a sale price baked into body copy goes stale the
    // day the sale ends.
    inner =
      `<strong>Hosting every week?</strong> The ${link("p112")} unlocks every ` +
      `music bingo game we make &mdash; this one included &mdash; plus each new ` +
      `release and a year of the Bingo Card Generator.`;
  } else {
    return null;
  }

  return (
    `<!-- fce:cross-sell:start -->\n` +
    `<div class="paragraph fce-cross-sell">${inner}</div>\n` +
    `<!-- fce:cross-sell:end -->`
  );
}

const MARKER_RE = /<!-- fce:cross-sell:start -->[\s\S]*?<!-- fce:cross-sell:end -->/;
// The buy area: button + ls-pending fallback, then the div closes.
const BUY_RE = /(<div id="wsite-com-product-buy">[\s\S]*?<\/p>\s*<\/div>)/;

let added = 0, updated = 0, missing = 0, noSlot = 0, stubs = 0;
const pids = new Set([...Object.keys(BUNDLES), ...GOLD_SINGLES]);
// Components that are plain strings are games sold only inside their bundle —
// there is no page of their own to write a block onto.
for (const b of Object.keys(BUNDLES)) BUNDLES[b].filter(isPid).forEach((c) => pids.add(c));

for (const pid of [...pids].sort()) {
  const dir = path.join(REPO, "store", pid);
  if (!fs.existsSync(dir)) { console.log("  missing dir:", pid); missing++; continue; }
  // A pNN dir can hold stray extra files (p110 has one) — pick the mapped
  // filename when we know it, otherwise the page whose buy button carries
  // this pid.
  let file = PRODUCTS[pid] && path.join(REPO, PRODUCTS[pid].path.replace(/^\//, ""));
  if (!file || !fs.existsSync(file)) {
    file = fs.readdirSync(dir)
      .filter((f) => f.endsWith(".html"))
      .map((f) => path.join(dir, f))
      .find((f) => fs.readFileSync(f, "utf8").includes(`data-product="${pid}"`));
  }
  if (!file) { console.log("  no page found:", pid); missing++; continue; }

  // Redirect stubs forward before anything renders, so a block here is copy
  // nobody reads and a price nobody maintains — p125's leftover $11.00 tag is
  // exactly how a stub goes stale unnoticed.
  if (/http-equiv="refresh"/i.test(fs.readFileSync(file, "utf8"))) {
    console.log("  redirect stub, skipped:", path.relative(REPO, file));
    stubs++;
    continue;
  }

  const block = blockFor(pid);
  if (!block) continue;
  // Prices are baked in, so make them reviewable without diffing 49 pages.
  if (PREVIEW) {
    console.log(`\n${pid} — ${PRODUCTS[pid] ? PRODUCTS[pid].name : path.relative(REPO, file)}`);
    console.log("  " + block.split("\n")[1].replace(/<[^>]+>/g, "").replace(/&mdash;/g, "—")
      .replace(/&middot;/g, "·").replace(/&amp;/g, "&").trim());
  }
  let html = fs.readFileSync(file, "utf8");
  const before = html;

  // Both replacements use FUNCTION replacers. The block now contains prices,
  // and in a replacement *string* "$10.99" is read as backreference $1 followed
  // by "0.99" — which would splice the entire captured buy area into the middle
  // of a sentence. Same trap documented in HANDOFF.md, reached from the other
  // direction: there the "$1" was in the data, here the data walked into a
  // pattern that really does have a group 1.
  if (MARKER_RE.test(html)) {
    html = html.replace(MARKER_RE, () => block);
    if (html !== before) { updated++; if (WRITE) fs.writeFileSync(file, html); }
  } else if (BUY_RE.test(html)) {
    html = html.replace(BUY_RE, (m) => `${m}\n${block}`);
    added++;
    if (WRITE) fs.writeFileSync(file, html);
  } else {
    console.log("  no buy area:", path.relative(REPO, file));
    noSlot++;
  }
}

console.log(`added   : ${added}`);
console.log(`updated : ${updated}`);
console.log(`missing : ${missing}`);
console.log(`no slot : ${noSlot}`);
console.log(`stubs   : ${stubs}   (redirect pages, deliberately skipped)`);

// Every price this tool quotes is baked into HTML, so a repricing silently
// makes the copy wrong. Sales are the common case, so name them.
const onSale = [...priceCache.entries()].filter(([, v]) => v && v.onSale);
if (onSale.length) {
  console.log(`\nprices read from ${priceCache.size} page(s); ${onSale.length} on sale:`);
  for (const [pid, v] of onSale) {
    console.log(`  ${pid.padEnd(6)} ${PRODUCTS[pid].name} — charging ${money(v.amount)}`);
  }
  console.log("  (no sale price is quoted in the copy — re-run this tool after any repricing)");
}
if (!WRITE) console.log("\nDRY RUN — nothing written. Re-run with --write.");
