// Cross-sell links on store product pages (Aug 2026 conversion audit, item 3).
//
// LemonSqueezy's hosted checkout is one product per checkout — there is no
// cart, so "add another item" has to happen on the page, before checkout.
// Three placements, all injected right under the buy area between
// <!-- fce:cross-sell:start/end --> markers (re-runs replace the block, so
// edits here propagate):
//
//   - a single pack that's part of a bundle  -> one line linking the bundle
//   - a bundle page                          -> "In this bundle:" linked list
//     (components are named in the prose but were never hyperlinked)
//   - a stand-alone music bingo pack         -> one-line Gold Club upsell
//
// Membership below is only asserted where it's verifiable: the three
// new-products.json bundles with structured `includes`, the two One Hit
// Wonders games, and the five decade games. p166 (Party Starter) is still
// staged/noindex — add it to BUNDLES when it publishes.
//
//   node _tools/add-cross-sell.js            # dry run
//   node _tools/add-cross-sell.js --write
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const WRITE = process.argv.includes("--write");

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
  p125: { path: "/store/p125/onehitwonders2.html", name: "One Hit Wonders 2" },
};

// bundle pid -> component pids
const BUNDLES = {
  p165: ["p132", "p122", "p100", "p110"],
  p168: ["p145", "p109", "p92", "p71", "p156"],
  p147: ["p153", "p115", "p144", "p113", "p146"],
  p128: ["p81", "p125"],
};

// Stand-alone music bingo packs (no bundle membership) -> Gold Club line.
const GOLD_SINGLES = [
  "p62", "p63", "p95", "p97", "p102", "p103", "p106", "p111", "p114", "p116",
  "p117", "p121", "p124", "p129", "p133", "p136", "p138", "p141", "p143",
  "p148", "p149", "p158", "p159", "p160", "p163",
];

const link = (pid) => `<a href="${PRODUCTS[pid].path}">${PRODUCTS[pid].name}</a>`;

function blockFor(pid) {
  const inBundle = Object.keys(BUNDLES).find((b) => BUNDLES[b].includes(pid));
  let inner;
  if (BUNDLES[pid]) {
    inner =
      `<strong>In this bundle:</strong> ` +
      BUNDLES[pid].map(link).join(" &middot; ") +
      `. One checkout, one download &mdash; less than buying them one at a time.`;
  } else if (inBundle) {
    inner =
      `<strong>Part of a pack:</strong> this game is also in the ${link(inBundle)} ` +
      `&mdash; more games per checkout, priced under buying them one at a time.`;
  } else if (GOLD_SINGLES.includes(pid)) {
    inner =
      `<strong>Hosting regularly?</strong> The ${link("p112")} includes every ` +
      `music bingo pack we make &mdash; this one included &mdash; plus each new release.`;
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

let added = 0, updated = 0, missing = 0, noSlot = 0;
const pids = new Set([...Object.keys(BUNDLES), ...GOLD_SINGLES]);
for (const b of Object.keys(BUNDLES)) BUNDLES[b].forEach((c) => pids.add(c));

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

  const block = blockFor(pid);
  if (!block) continue;
  let html = fs.readFileSync(file, "utf8");
  const before = html;

  if (MARKER_RE.test(html)) {
    html = html.replace(MARKER_RE, block);
    if (html !== before) { updated++; if (WRITE) fs.writeFileSync(file, html); }
  } else if (BUY_RE.test(html)) {
    html = html.replace(BUY_RE, `$1\n${block}`);
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
if (!WRITE) console.log("\nDRY RUN — nothing written. Re-run with --write.");
