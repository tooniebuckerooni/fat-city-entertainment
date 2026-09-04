// Check every ls-links.js reference comment against the price its product page
// actually charges.
//
//   node _tools/check-ls-links.js
//
// Those comments are the checklist somebody works from in the LemonSqueezy
// dashboard, and LemonSqueezy is what charges the customer. A comment that
// disagrees with the page is therefore not cosmetic: it is an instruction to
// set the wrong price, at the one step where being wrong means the checkout
// and the site stop matching.
//
// Two real drifts this caught on its first run:
//   * 17 never-wired products still quoting a superseded $12.49 after the
//     catalogue settled on $11.99 and $8.99 — new-product.js wrote each entry
//     once and never refreshed it, so --force re-runs regenerated the page from
//     the spec and left the comment frozen at the original price.
//   * p103 at $12.49 against a $10.99 page (left behind by a repricing that was
//     tried and reverted), and p168 at $39.99 against a $43.00 page.
//
// Comments on unwired products ([ ]) are compared too — that is precisely the
// set nobody notices, because no customer is being charged yet to reveal it.
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "..");

const ls = fs.readFileSync(path.join(REPO, "assets/js/ls-links.js"), "utf8");
const problems = [];
let checked = 0;

const ROW = /^\s*"(p\d+)":\s*"([^"]*)",?\s*\/\/\s*\[(.)\][^—]*—\s*(?:\$|CA\$)([0-9,.]+)/gm;
for (const m of ls.matchAll(ROW)) {
  const [, pid, href, mark, quoted] = m;
  // "[!]" is a deliberate, human-written flag on a conflict that needs checking
  // in the dashboard. Leave it alone rather than nagging weekly about it.
  if (mark === "!" || mark === "—") continue;
  const dir = path.join(REPO, "store", pid);
  if (!fs.existsSync(dir)) continue;
  const priced = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".html"))
    .map((f) => ({ f, s: fs.readFileSync(path.join(dir, f), "utf8") }))
    .filter((c) => !/http-equiv="refresh"/i.test(c.s) && /itemprop="price"/.test(c.s));
  if (priced.length !== 1) continue;
  const pm = priced[0].s.match(/itemprop="price"\s+content="([0-9.]+)"/);
  if (!pm) continue;
  checked++;
  const page = Number(pm[1]);
  const said = Number(String(quoted).replace(/,/g, ""));
  if (Math.abs(page - said) > 0.005) {
    problems.push(
      `${pid} [${mark}] comment says $${said.toFixed(2)}, page charges $${page.toFixed(2)}` +
        (href ? " — and it is WIRED, so a customer is being charged one of these" : "")
    );
  }
}

console.log(`checked ${checked} ls-links comment(s) against their product pages`);
if (problems.length) {
  console.log(`\n${problems.length} PROBLEM(S):`);
  problems.forEach((p) => console.log(`  ! ${p}`));
  process.exit(1);
}
console.log("every comment matches the price its page charges.");
