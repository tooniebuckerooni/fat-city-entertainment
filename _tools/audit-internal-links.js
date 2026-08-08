// Internal-link audit: cross-references each page's declared canonical
// against how many *other* pages actually link to it internally, to catch
// the pattern found on trivia-store.html / store/c1/triviastore - a page
// carries the bulk of the site's internal links while a *different* URL is
// declared canonical, so link equity and crawl signal point apart.
//
//   node audit-internal-links.js
//
// Report only - this doesn't write anything. Counts distinct *referring
// pages* per target (not raw <a> occurrences), same method used to find the
// trivia-store.html case by hand. Doesn't distinguish nav/footer links from
// body links - a known simplification, consistent with check-links.js.

const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
const REPO = path.resolve(__dirname, "..");

const SKIP = new Set(["_tools", "node_modules", ".git", ".claude"]);

function walk(dir) {
  let out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out = out.concat(walk(p));
    else if (e.name.endsWith(".html")) out.push(p);
  }
  return out;
}

// Resolve a raw href/canonical value to the repo-relative file it actually
// serves, mirroring check-links.js's rules (directory -> index.html,
// extensionless -> +.html). Null for external links, anchors, or anything
// that doesn't resolve to a real file.
function resolve(raw) {
  if (!raw) return null;
  let v = raw.trim();
  const abs = v.match(/^https?:\/\/(?:www\.)?fatcityentertainment\.com(\/.*)?$/i);
  if (abs) v = abs[1] || "/";
  else if (/^https?:\/\//i.test(v) || v.startsWith("//")) return null;
  if (/^(#|mailto:|tel:|javascript:)/i.test(v)) return null;
  v = v.split("#")[0].split("?")[0];
  if (!v.startsWith("/")) return null;
  v = decodeURIComponent(v);
  if (v === "/") v = "/index.html";
  const p = v.replace(/^\//, "");
  const fsPath = path.join(REPO, p);
  if (fs.existsSync(fsPath)) {
    if (fs.statSync(fsPath).isDirectory()) {
      const idx = path.join(fsPath, "index.html");
      return fs.existsSync(idx) ? path.relative(REPO, idx) : null;
    }
    return path.relative(REPO, fsPath);
  }
  if (!/\.[a-z0-9]+$/i.test(p) && fs.existsSync(fsPath + ".html")) {
    return path.relative(REPO, fsPath + ".html");
  }
  return null;
}

const files = walk(REPO);

const inlinks = new Map(); // target file -> Set of distinct referring source files
const canonicalOf = new Map(); // file -> resolved canonical target file

for (const f of files) {
  const rel = path.relative(REPO, f).replace(/\\/g, "/");
  const $ = cheerio.load(fs.readFileSync(f, "utf8"));

  const seenTargets = new Set();
  $("a[href]").each((_, el) => {
    const target = resolve($(el).attr("href"));
    if (!target || target === rel) return;
    seenTargets.add(target);
  });
  for (const t of seenTargets) {
    if (!inlinks.has(t)) inlinks.set(t, new Set());
    inlinks.get(t).add(rel);
  }

  const canonTarget = resolve($('link[rel="canonical"]').attr("href"));
  if (canonTarget) canonicalOf.set(rel, canonTarget);
}

const inCount = (f) => (inlinks.get(f) || new Set()).size;

// --- Part 1: canonical vs. internal-link mismatches ---
const mismatches = [];
for (const [self, target] of canonicalOf.entries()) {
  if (target === self) continue;
  const selfLinks = inCount(self);
  const targetLinks = inCount(target);
  if (selfLinks > targetLinks) {
    mismatches.push({ self, target, selfLinks, targetLinks, gap: selfLinks - targetLinks });
  }
}
mismatches.sort((a, b) => b.gap - a.gap);

console.log(`served pages scanned: ${files.length}`);
console.log(`pages with a canonical tag pointing at a different URL: ${[...canonicalOf.entries()].filter(([s, t]) => s !== t).length}`);
console.log(`\n=== canonical/internal-link mismatches (page gets MORE internal links than its own declared canonical target) ===`);
if (!mismatches.length) {
  console.log("none found");
} else {
  for (const m of mismatches) {
    console.log(`  ${m.self}  (${m.selfLinks} in-links)`);
    console.log(`    -> canonical: ${m.target}  (${m.targetLinks} in-links)  [gap +${m.gap}]`);
  }
}

// --- Part 2: most / least internally linked pages (self-canonical or no canonical tag) ---
const allTargets = [...inlinks.keys()].filter(
  (f) => f.endsWith(".html") && (!canonicalOf.has(f) || canonicalOf.get(f) === f)
);
const ranked = allTargets.map((f) => ({ f, n: inCount(f) })).sort((a, b) => b.n - a.n);

console.log(`\n=== top 15 most internally linked pages ===`);
ranked.slice(0, 15).forEach((r) => console.log(`  ${r.n}  ${r.f}`));

const LEGACY_PREFIXES = ["4/", "whatsnew/", "blog/", "inspiration/"];
const meaningful = ranked.filter((r) => {
  if (LEGACY_PREFIXES.some((p) => r.f.startsWith(p))) return false;
  const size = fs.statSync(path.join(REPO, r.f)).size;
  return size > 2000; // filters out the ~1KB "this page has moved" stubs
});

console.log(`\n=== bottom 15 least internally linked real pages (legacy URL mirrors + redirect stubs excluded) ===`);
meaningful
  .slice(-15)
  .reverse()
  .forEach((r) => console.log(`  ${r.n}  ${r.f}`));
