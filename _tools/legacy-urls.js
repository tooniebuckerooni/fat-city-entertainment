// Scan the SERVED site for references to the legacy Weebly blog URL scheme
// (/4/post/..., /4/archives/..., /4/category/..., /4/feed) and map each one to
// its current equivalent.
//
//   node legacy-urls.js          report only
//   node legacy-urls.js --write  also generate the redirect stubs under /4/
//
// Every legacy URL must map onto a page that already exists; the script refuses
// to write stubs if any target is missing.

const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "..");
const WRITE = process.argv.includes("--write");

// Same exclusions as check-links.js: only files GitHub Pages actually serves.
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

// Matches the legacy paths whether written absolute (http/https, with or without
// www) or root-relative. Stops at a quote, &, whitespace, < or ).
const LEGACY = /(?:https?:\/\/(?:www\.)?fatcityentertainment\.com)?(\/4\/(?:post|archives|category)\/[^"'&<>\s)]+|\/4\/feed)/g;

// legacy path -> { target, refs, files:Set }
const found = new Map();

const files = walk(REPO);
for (const f of files) {
  const rel = path.relative(REPO, f).replace(/\\/g, "/");
  const html = fs.readFileSync(f, "utf8");
  for (const m of html.matchAll(LEGACY)) {
    const legacy = decodeURIComponent(m[1]).replace(/\/$/, "") || m[1];
    if (!found.has(legacy)) found.set(legacy, { refs: 0, files: new Set() });
    const rec = found.get(legacy);
    rec.refs++;
    rec.files.add(rel);
  }
}

// Map a legacy path to its current equivalent, or null if we can't place it.
function mapTarget(legacy) {
  let m;
  if ((m = legacy.match(/^\/4\/post\/\d{4}\/\d{2}\/(.+?)\.html$/))) {
    return `/triviahostresources/${m[1]}/`;
  }
  if ((m = legacy.match(/^\/4\/archives\/(\d{2}-\d{4})$/))) {
    return `/triviahostresources/archives/${m[1]}/`;
  }
  if ((m = legacy.match(/^\/4\/category\/(.+)$/))) {
    return `/triviahostresources/category/${m[1]}/`;
  }
  if (legacy === "/4/feed") return "/triviahostresources.html";
  return null;
}

function exists(urlPath) {
  const p = urlPath.replace(/^\//, "").replace(/\/$/, "");
  const fsPath = path.join(REPO, p);
  if (fs.existsSync(fsPath)) {
    return fs.statSync(fsPath).isDirectory()
      ? fs.existsSync(path.join(fsPath, "index.html"))
      : true;
  }
  return fs.existsSync(fsPath + ".html");
}

const rows = [...found.entries()]
  .map(([legacy, rec]) => ({ legacy, ...rec, target: mapTarget(legacy) }))
  .sort((a, b) => a.legacy.localeCompare(b.legacy));

const unmapped = rows.filter((r) => !r.target);
const missing = rows.filter((r) => r.target && !exists(r.target));

const byKind = (k) => rows.filter((r) => r.legacy.startsWith(`/4/${k}`));
const sum = (rs) => rs.reduce((n, r) => n + r.refs, 0);

console.log(`served pages scanned: ${files.length}\n`);
for (const k of ["post", "archives", "category", "feed"]) {
  const rs = k === "feed" ? rows.filter((r) => r.legacy === "/4/feed") : byKind(k);
  if (!rs.length) continue;
  const fileCount = new Set(rs.flatMap((r) => [...r.files])).size;
  console.log(
    `/4/${k}: ${rs.length} distinct URL(s), ${sum(rs)} reference(s) across ${fileCount} served page(s)`
  );
}
console.log(`\ntotal distinct legacy URLs: ${rows.length}`);
console.log(`unmapped: ${unmapped.length}   target missing on disk: ${missing.length}`);
for (const r of unmapped) console.log(`  UNMAPPED  ${r.legacy}`);
for (const r of missing) console.log(`  NO TARGET ${r.legacy} -> ${r.target}`);

if (!WRITE) {
  console.log(`\n(report only — pass --write to generate the stubs)`);
  process.exit(unmapped.length || missing.length ? 1 : 0);
}

if (unmapped.length || missing.length) {
  console.error(`\nrefusing to write stubs while any URL is unmapped or missing.`);
  process.exit(1);
}

const stub = (target, title) => `<!DOCTYPE html><html lang="en"><head>
<meta charset="utf-8">
<title>${title} - Fat City Entertainment</title>
<link rel="canonical" href="https://www.fatcityentertainment.com${target}">
<meta http-equiv="refresh" content="0; url=${target}">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body>
<p>This page has moved. <a href="${target}">Continue to ${title}</a>.</p>
</body></html>
`;

// Where the stub file lives for a given legacy URL. Paths ending in .html get a
// file; extensionless paths get a directory + index.html, matching how the blog's
// archive and category pages are already laid out.
function stubPath(legacy) {
  const p = legacy.replace(/^\//, "");
  return p.endsWith(".html") ? p : path.join(p, "index.html");
}

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Returns HTML-ready (already-escaped) title text.
function titleFor(r) {
  let m;
  if ((m = r.legacy.match(/^\/4\/post\/\d{4}\/\d{2}\/(.+?)\.html$/))) {
    // Reuse the real post's <title> so the stub isn't a content-free dead end.
    // It comes out of HTML, so it is already escaped — don't escape it again.
    const idx = path.join(REPO, "triviahostresources", m[1], "index.html");
    const t = fs.readFileSync(idx, "utf8").match(/<title>([^<]*)<\/title>/);
    if (t) return t[1].replace(/\s*-\s*Fat City Entertainment\s*$/i, "").trim();
    return esc(m[1].replace(/-/g, " "));
  }
  if ((m = r.legacy.match(/^\/4\/archives\/(\d{2}-\d{4})$/))) return `Blog archive ${m[1]}`;
  if ((m = r.legacy.match(/^\/4\/category\/(.+)$/))) return `Blog category: ${esc(m[1].replace(/-/g, " "))}`;
  return "Trivia Host Resources";
}

let written = 0;
for (const r of rows) {
  const out = path.join(REPO, stubPath(r.legacy));
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, stub(r.target, titleFor(r)));
  written++;
}
console.log(`\nwrote ${written} redirect stub(s) under /4/`);
