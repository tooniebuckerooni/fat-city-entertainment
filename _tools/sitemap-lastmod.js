// Add accurate <lastmod> dates to sitemap.xml.
//
//   node sitemap-lastmod.js          report what it would set
//   node sitemap-lastmod.js --write  apply it
//
// Google only uses <lastmod> if it trusts it, and treats a date that doesn't
// reflect a real content change as a reason to ignore the field site-wide. So
// this sets a date only where we actually know one, and leaves it off otherwise:
//
//   * blog posts  -> the post's own published date, read from its .date-text
//                    element. That's the true date; git only knows when the file
//                    was imported.
//   * other pages -> the last git commit touching the file, but ONLY if that
//                    commit came after the migration import. A page untouched
//                    since import has no known content date, so it gets none —
//                    claiming the import date would say a 2016 page changed this
//                    month.
//
// Re-run it after content changes; it rewrites every <lastmod> from scratch.

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const REPO = path.resolve(__dirname, "..");
const SITEMAP = path.join(REPO, "sitemap.xml");
const WRITE = process.argv.includes("--write");

// Commits on or before this date are the migration import, not content edits.
const IMPORT_CUTOFF = "2026-07-18";

const git = (args) =>
  execFileSync("git", args, { cwd: REPO, encoding: "utf8" }).trim();

function fileFor(urlPath) {
  let p = decodeURIComponent(urlPath.replace(/^\//, ""));
  if (!p) p = "index.html";
  for (const cand of [p, `${p}.html`, path.join(p.replace(/\/$/, ""), "index.html")]) {
    const abs = path.join(REPO, cand);
    if (fs.existsSync(abs) && fs.statSync(abs).isFile()) return cand;
  }
  return null;
}

// Blog posts render their published date inside <span class="date-text">.
function publishedDate(file) {
  if (!/^triviahostresources\//.test(file)) return null;
  const html = fs.readFileSync(path.join(REPO, file), "utf8");
  const m = html.match(/class="date-text"[^>]*>\s*([^<]+?)\s*</);
  if (!m) return null;
  const d = m[1].match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!d) return null;
  const [, mm, dd, yyyy] = d;
  const iso = `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  return Number.isNaN(Date.parse(iso)) ? null : iso;
}

function gitDate(file) {
  const d = git(["log", "-1", "--format=%cs", "--", file]);
  return d || null;
}

let xml = fs.readFileSync(SITEMAP, "utf8");
// start from a clean slate so re-runs don't stack or go stale
xml = xml.replace(/<lastmod>[^<]*<\/lastmod>/g, "");

const stats = { published: 0, edited: 0, omitted: 0, unresolved: 0 };
xml = xml.replace(
  /<url><loc>https:\/\/www\.fatcityentertainment\.com([^<]*)<\/loc>\s*<\/url>/g,
  (whole, urlPath) => {
    const file = fileFor(urlPath);
    if (!file) { stats.unresolved++; return whole; }

    let date = publishedDate(file);
    if (date) stats.published++;
    else {
      const g = gitDate(file);
      if (g && g > IMPORT_CUTOFF) { date = g; stats.edited++; }
      else { stats.omitted++; return whole; }
    }
    return `<url><loc>https://www.fatcityentertainment.com${urlPath}</loc><lastmod>${date}</lastmod></url>`;
  }
);

console.log(`published date from the page: ${stats.published}`);
console.log(`git date (edited since import): ${stats.edited}`);
console.log(`no known date, omitted:        ${stats.omitted}`);
if (stats.unresolved) console.log(`unresolved URLs:               ${stats.unresolved}`);

if (!WRITE) {
  console.log("\n(report only — pass --write to apply)");
  process.exit(0);
}
fs.writeFileSync(SITEMAP, xml);
console.log("\nwrote sitemap.xml");
