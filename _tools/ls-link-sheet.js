// The round trip for a LemonSqueezy rebuild: hand out a CSV, get it back with
// the new checkout URLs filled in, write them into ls-links.js.
//
//   node _tools/ls-link-sheet.js                  # write the blank sheet
//   node _tools/ls-link-sheet.js --import <csv>   # read a filled-in one (dry run)
//   node _tools/ls-link-sheet.js --import <csv> --write
//
// Rebuilding every product in LemonSqueezy means every checkout URL changes, so
// all 94 of them have to come back into ls-links.js. Pasting them one at a time
// is the kind of job where one line lands in the wrong row and a buy button
// quietly charges for a different product — the landmine this repo already has
// a warning about. A sheet keyed by product id removes the chance to mis-file.
//
// The import is deliberately strict. It will not accept a URL that is not a
// LemonSqueezy checkout link, it refuses a URL used twice (the copy-paste
// failure that points two products at one checkout), and it reports every row
// it changed so the diff can be read before anything is written.
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "..");
const LS_PATH = path.join(REPO, "assets/js/ls-links.js");
const OUT = path.join(REPO, "_export/lemonsqueezy/checkout-links.csv");

const args = process.argv.slice(2);
const WRITE = args.includes("--write");
const importAt = args.indexOf("--import");
const IMPORT = importAt !== -1 ? args[importAt + 1] : null;

// Rows in ls-links.js look like:
//   "p97": "https://…", // [x] Halloween Party — $10.99 USD — /store/p97/…
const ROW = /^(\s*)"(p\d+|handbook)":\s*"([^"]*)",?\s*\/\/\s*\[(.)\]\s*(.*?)\s*—\s*((?:\$|CA\$)[0-9,.]+(?:\s*USD)?)\s*—\s*(\S+)\s*$/;
const csvCell = (v) => {
  const s = String(v == null ? "" : v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

function rows() {
  return fs.readFileSync(LS_PATH, "utf8").split("\n").map((line, i) => {
    const m = line.match(ROW);
    return m && { i, indent: m[1], pid: m[2], url: m[3], mark: m[4],
                  name: m[5], price: m[6], page: m[7], line };
  }).filter(Boolean);
}

if (!IMPORT) {
  const rs = rows();
  const out = ["product_id,name,current_price,page,current_checkout_url,NEW_CHECKOUT_URL"];
  for (const r of rs) {
    // The last column is the one to fill in. Everything left of it is context
    // so the row can be recognised in a spreadsheet without cross-referencing.
    out.push([r.pid, r.name, r.price, r.page, r.url, ""].map(csvCell).join(","));
  }
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, out.join("\n") + "\n");
  console.log(`wrote ${path.relative(REPO, OUT)}  (${rs.length} products)`);
  console.log(`  already wired : ${rs.filter((r) => r.url).length}`);
  console.log(`  blank         : ${rs.filter((r) => !r.url).length}`);
  console.log("\nFill in NEW_CHECKOUT_URL for every product you rebuild, leave the");
  console.log("rest blank, then send it back. Import with:");
  console.log(`  node _tools/ls-link-sheet.js --import <file.csv> --write`);
  process.exit(0);
}

// ------------------------------------------------------------------- import
if (!fs.existsSync(IMPORT)) {
  console.error(`no such file: ${IMPORT}`);
  process.exit(1);
}
// Minimal CSV reader: quoted fields with doubled quotes, no embedded newlines.
function parseCsv(text) {
  return text.replace(/\r\n?/g, "\n").split("\n").filter((l) => l.trim()).map((line) => {
    const out = []; let cur = ""; let q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (q) {
        if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (c === '"') q = false;
        else cur += c;
      } else if (c === '"') q = true;
      else if (c === ",") { out.push(cur); cur = ""; }
      else cur += c;
    }
    out.push(cur);
    return out;
  });
}

const table = parseCsv(fs.readFileSync(IMPORT, "utf8"));
const header = table.shift().map((h) => h.trim().toLowerCase());
const cPid = header.indexOf("product_id");
const cUrl = header.indexOf("new_checkout_url");
// The sheet ships two URL columns — the existing one as context, and the empty
// one to fill — and typing into the wrong one is the obvious mistake, because
// for a product that has never been wired the "current" column is empty too and
// looks like the blank to fill. The first sheet came back exactly that way: all
// seven new links in current_checkout_url, and an importer that read only
// NEW_CHECKOUT_URL reported nothing to do, which is the worst possible answer —
// it looks like success. So read a URL from EITHER column, prefer the one meant
// for it, and let the ls-links.js comparison decide what is actually new.
const cCur = header.indexOf("current_checkout_url");
if (cPid === -1 || (cUrl === -1 && cCur === -1)) {
  console.error("CSV needs a product_id column and a NEW_CHECKOUT_URL (or current_checkout_url) column.");
  console.error(`found: ${header.join(", ")}`);
  process.exit(1);
}

const rs = rows();
const byPid = new Map(rs.map((r) => [r.pid, r]));
const problems = [];
const changes = [];
const seenUrl = new Map();
const misfiled = new Set();

for (const row of table) {
  const pid = (row[cPid] || "").trim();
  const fromNew = cUrl === -1 ? "" : (row[cUrl] || "").trim();
  const fromCur = cCur === -1 ? "" : (row[cCur] || "").trim();
  const url = fromNew || fromCur;
  if (!pid || !url) continue;
  if (!fromNew && fromCur) misfiled.add(pid);
  const r = byPid.get(pid);
  if (!r) { problems.push(`${pid}: no such product in ls-links.js`); continue; }
  if (!/^https:\/\/[a-z0-9-]+\.lemonsqueezy\.com\/(checkout|buy)\//i.test(url)) {
    problems.push(`${pid}: not a LemonSqueezy checkout URL — ${url.slice(0, 70)}`);
    continue;
  }
  // Two products sharing one checkout is the mis-paste that charges for the
  // wrong thing. Catch it here rather than in a customer's receipt.
  const key = url.split("?")[0];
  if (seenUrl.has(key)) { problems.push(`${pid}: same URL as ${seenUrl.get(key)} — ${key.slice(-40)}`); continue; }
  seenUrl.set(key, pid);
  if (r.url.split("?")[0] !== key) changes.push({ r, url });
}
// A URL already in the file, reused by a different product in the sheet.
for (const [key, pid] of seenUrl) {
  const clash = rs.find((r) => r.pid !== pid && r.url && r.url.split("?")[0] === key
                               && !changes.some((c) => c.r.pid === r.pid));
  if (clash) problems.push(`${pid}: URL already belongs to ${clash.pid} in ls-links.js`);
}

console.log(`${table.length} row(s) read, ${changes.length} would change`);
const misfiledChanges = changes.filter((c) => misfiled.has(c.r.pid));
if (misfiledChanges.length) {
  console.log(
    `  (${misfiledChanges.length} of them read from current_checkout_url, not NEW_CHECKOUT_URL — ` +
      `taken as intended, since they differ from what ls-links.js has)`
  );
}
for (const c of changes) {
  console.log(`  ${c.r.pid.padEnd(6)} ${c.r.url ? "re-wired" : "NEWLY WIRED"}  ${c.r.name.slice(0, 44)}`);
}
if (problems.length) {
  console.log(`\n${problems.length} PROBLEM(S) — nothing written:`);
  problems.forEach((p) => console.log(`  ! ${p}`));
  process.exit(1);
}
if (!changes.length) { console.log("\nnothing to do."); process.exit(0); }

if (WRITE) {
  const lines = fs.readFileSync(LS_PATH, "utf8").split("\n");
  for (const c of changes) {
    const r = c.r;
    // Rebuild the row rather than string-replacing inside it, and flip [ ] to
    // [x] so the file's own "search for [ ] to find what's left" convention
    // keeps working.
    lines[r.i] = `${r.indent}"${r.pid}": "${c.url}", // [x] ${r.name} — ${r.price} — ${r.page}`;
  }
  fs.writeFileSync(LS_PATH, lines.join("\n"));
  console.log(`\nwrote ${changes.length} link(s) into assets/js/ls-links.js`);
  console.log("Now bake them into every buy button:");
  console.log("  node _tools/bake-buy-links.js --write");
} else {
  console.log("\nDRY RUN — nothing written. Re-run with --write.");
}
