// The reassurance lines under a product's buy button.
//
//   node _tools/add-fact-notes.js            # dry run
//   node _tools/add-fact-notes.js --write
//
// WHY THIS EXISTS
// ---------------
// Five product pages carried these as hand-typed HTML that no tool owned, which
// is the same shape as the club "Quick math" paragraphs that advertised $89.00
// for months after Bronze dropped to $79.00. Four things had already gone wrong
// with them by 11 Sept 2026, none of them caught by anything:
//
//   - 10 of the 13 notes contained EM-DASHES, on live customer-facing copy,
//     against the repo's own writing rule. Unfixable by hand under that rule,
//     because the fix belongs in a template.
//   - Four pages put them ABOVE the button and one below, so the same three
//     sentences were an obstacle on four pages and reassurance on the fifth.
//   - p155 had one of the three and was missing the one-time-payment line and
//     the guarantee entirely.
//   - They quote the Generator licence price in prose, and a regeneration of
//     any of those pages from its spec would have dropped them silently.
//
// Placement is BELOW the button, deliberately. Between the price and the button
// these are three paragraphs of small print standing in the way of a decision;
// after it they are reassurance for someone who has already made one.
//
// The licence price comes from _content/generator-plans.json, the one place it
// lives, so it cannot disagree with the value stacks, the cross-sells or the
// redemption PDFs.
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const WRITE = process.argv.includes("--write");

const PLANS = JSON.parse(fs.readFileSync(path.join(REPO, "_content/generator-plans.json"), "utf8")).plans;
const money = (n) => "$" + Number(n).toFixed(2);
// $24.00 reads wrong in a sentence; $24 does. Whole dollars lose the cents.
const pretty = (n) => (Number(n) % 1 === 0 ? "$" + Number(n).toFixed(0) : money(n));

const START = "<!-- fce:fact-notes -->";
const END = "<!-- /fce:fact-notes -->";
const BLOCK_RE = /\n?[ \t]*<!-- fce:fact-notes -->[\s\S]*?<!-- \/fce:fact-notes -->/;
// The hand-written notes this replaces, so the first --write cleans up after
// itself instead of leaving two copies on the page.
const LEGACY_RE = /(?:[ \t]*<p class="fce-fact-note">[\s\S]*?<\/p>\n?)+/g;

// pid -> which Generator plan ships with it. Everything else about the notes is
// the same on every page, which is the point: a product either bundles a plan
// or it does not.
const PRODUCTS = {
  p131: { file: "store/p131/BronzeClub.html", plan: "daypass" },
  p130: { file: "store/p130/SilverClub.html", plan: "monthly" },
  p112: { file: "store/p112/GoldClub.html", plan: "annual" },
  p155: { file: "store/p155/holidays.html", plan: "monthly" },
  p189: { file: "store/p189/halloweencompletepack.html", plan: "monthly" },
};

// No em-dashes anywhere below: a visitor reads every word of it.
function notes(planKey) {
  const p = PLANS[planKey];
  const perk = p.recurring
    ? `<strong>Includes ${p.freeLabel} of Bingo Card Generator 2.0</strong> ` +
      `(a ${pretty(p.price)} value), redemption code included with your download. ` +
      `After the free ${p.period} it continues as a paid ${p.name} subscription ` +
      `unless you cancel, and you can cancel anytime.`
    : `<strong>Includes ${p.freeLabel}</strong> (a ${pretty(p.price)} value), ` +
      `redemption code included with your download. It is one-time and expires ` +
      `after ${p.period}, so there is nothing to cancel.`;
  return [
    "This pack is a <strong>one-time payment</strong>. No recurring charges for the games themselves.",
    perk,
    "Instant download. Satisfaction guaranteed, and exchanges for larger packs are always welcome.",
  ];
}

const block = (planKey) =>
  `${START}\n` +
  notes(planKey).map((n) => `  <p class="fce-fact-note">${n}</p>`).join("\n") +
  `\n  ${END}`;

// After the button AND after its no-JS fallback, still inside the buy area: the
// buy block has to keep ending in </p></div>, which is what add-cross-sell.js
// and bake-buy-links.js match on.
const ANCHOR_RE = /(<div id="wsite-com-product-buy">[\s\S]*?<p class="ls-pending"[\s\S]*?<\/p>\n)/;

let changed = 0, legacy = 0;
for (const [pid, spec] of Object.entries(PRODUCTS)) {
  const abs = path.join(REPO, spec.file);
  if (!fs.existsSync(abs)) { console.log(`  missing: ${spec.file}`); process.exitCode = 1; continue; }
  let html = fs.readFileSync(abs, "utf8");
  const before = html;
  const want = block(spec.plan);

  if (BLOCK_RE.test(html)) {
    html = html.replace(BLOCK_RE, () => "\n  " + want);
  } else {
    // First run on this page: strip whatever was typed there by hand, then
    // insert. Count it, so the run says plainly what it took over.
    const had = (html.match(LEGACY_RE) || []).length;
    if (had) { html = html.replace(LEGACY_RE, () => ""); legacy += had; }
    if (!ANCHOR_RE.test(html)) { console.log(`  no buy area: ${spec.file}`); process.exitCode = 1; continue; }
    // A function replacer, always: these notes contain prices, and "$24" in a
    // replacement string is read as a backreference (HANDOFF.md).
    html = html.replace(ANCHOR_RE, (m) => `${m}  ${want}\n`);
  }

  if (html === before) continue;
  changed++;
  console.log(`  ${WRITE ? "updated" : "would update"}: ${spec.file}  (${PLANS[spec.plan].name})`);
  if (WRITE) fs.writeFileSync(abs, html);
}

if (legacy) console.log(`\nreplaced ${legacy} hand-written note block(s)`);
console.log(`\n${WRITE ? "updated" : "would update"}: ${changed} page(s)`);
if (!WRITE && changed) console.log("re-run with --write");
