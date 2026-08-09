// Normalise every reference to a directory-style page onto its trailing-slash
// form, sitewide.
//
//   node canonicalize-trailing-slash.js          report only
//   node canonicalize-trailing-slash.js --write  apply
//
// WHY THIS EXISTS
// ---------------
// GitHub Pages serves `foo/index.html` at `/foo/`. Ask for `/foo` and you get
// the same bytes back, so every directory page on this site has always had two
// live URLs. That is only a problem when the site can't keep its story
// straight about which one is real -- and it couldn't. As of the Aug 2026
// Search Console audit:
//
//   * 302 of 382 canonical tags said `/foo`, the other 76 said `/foo/`
//   * sitemap.xml said `/foo` 116 times and `/foo/` twice
//   * internal links said `/foo` 1453 times and `/foo/` 218 times
//   * publish-post.js has been stamping `/foo/` on every new post
//   * the Twitter/Facebook share links were already `/foo/` too
//
// Google resolved that contradiction the way it always does. It crawled `/foo/`
// (that's what the blog landing page links), read the tag saying "the real one
// is /foo", and filed `/foo/` under "Alternate page with proper canonical tag"
// -- 24 pages and climbing since 24 Jul 2026. Then it crawled `/foo`, found a
// byte-identical duplicate with no more internal links pointing at it than the
// twin it had just demoted, and left it in "Crawled - currently not indexed".
// Neither URL got indexed. The post simply wasn't in Google.
//
// So the fix isn't a redirect (GitHub Pages can't issue one anyway) -- it's
// picking a side and saying it everywhere. Trailing slash is the side to pick:
// it's what Pages serves natively for a directory, which makes it correct
// whether or not Pages 301s the slashless form, and it's what the tooling
// already emits.
//
// WHAT COUNTS AS A DIRECTORY PAGE
// -------------------------------
// A path only gets a slash if `<repo>/<path>/index.html` actually exists on
// disk. That single test is what keeps this script safe: it can't touch a
// `.html` URL, an asset under /uploads or /assets, an external host, or a
// directory that has no index (like /triviahostresources, which Pages serves
// from triviahostresources.html and which would 404 with a slash on the end).
//
// Rewrites both the plain form and the percent-encoded form (%2F separators),
// because the share links in every post body carry the URL encoded.
// Idempotent: a URL that already ends in `/` is left alone.

const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const WRITE = process.argv.includes("--write");
const HOST = "https://www.fatcityentertainment.com";

// Same exclusions as check-links.js: only files GitHub Pages actually serves,
// plus _content (markdown drafts, not served).
const SKIP = new Set(["_tools", "_content", "node_modules", ".git", ".claude"]);

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

// Cache: does <repo>/<path>/index.html exist?
const dirCache = new Map();
function isDirectoryPage(urlPath) {
  if (dirCache.has(urlPath)) return dirCache.get(urlPath);
  let ok = false;
  try {
    // Percent-decode so /store/p25/10%2C000... resolves against the real file.
    const rel = decodeURIComponent(urlPath).replace(/^\/+/, "");
    ok = rel !== "" && fs.existsSync(path.join(REPO, rel, "index.html"));
  } catch {
    ok = false; // malformed escape sequence -- leave the URL alone
  }
  dirCache.set(urlPath, ok);
  return ok;
}

// Plain form: absolute (our host) or root-relative, stopping at any delimiter
// that could end a URL in HTML, XML, JSON-LD or a query string.
const PLAIN = new RegExp(
  "(https://www\\.fatcityentertainment\\.com)?(/[^\"'<>\\s)&?#]*)",
  "g"
);

// Encoded form, as it appears inside share-link query strings.
const ENCODED = /https%3A%2F%2Fwww\.fatcityentertainment\.com((?:%2F[^"'<>\s)&?#]*)+)/g;

function normalisePlain(text, tally) {
  return text.replace(PLAIN, (match, origin, urlPath) => {
    if (urlPath.endsWith("/")) return match;          // already normalised
    if (!isDirectoryPage(urlPath)) return match;      // not a directory page
    tally.count++;
    return `${origin || ""}${urlPath}/`;
  });
}

function normaliseEncoded(text, tally) {
  return text.replace(ENCODED, (match, encPath) => {
    if (encPath.endsWith("%2F")) return match;
    const urlPath = encPath.replace(/%2F/g, "/");
    if (!isDirectoryPage(urlPath)) return match;
    tally.count++;
    return `${match}%2F`;
  });
}

// Named processFile, not process: a hoisted `function process` would shadow
// the global and break the argv read at the top of the file.
function processFile(file) {
  const before = fs.readFileSync(file, "utf8");
  const tally = { count: 0 };
  let after = normalisePlain(before, tally);
  after = normaliseEncoded(after, tally);
  if (after === before) return 0;
  if (WRITE) fs.writeFileSync(file, after);
  return tally.count;
}

const targets = walk(REPO);
const sitemap = path.join(REPO, "sitemap.xml");
if (fs.existsSync(sitemap)) targets.push(sitemap);

let files = 0;
let refs = 0;
const perDir = new Map();
for (const f of targets) {
  const n = processFile(f);
  if (!n) continue;
  files++;
  refs += n;
  const rel = path.relative(REPO, f).replace(/\\/g, "/");
  const bucket = rel.includes("/") ? rel.split("/")[0] + "/" : "(top level)";
  perDir.set(bucket, (perDir.get(bucket) || 0) + n);
}

console.log(
  `${WRITE ? "Rewrote" : "Would rewrite"} ${refs} reference(s) across ${files} file(s).`
);
for (const [bucket, n] of [...perDir].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(6)}  ${bucket}`);
}
if (!WRITE) console.log("\n(dry run -- pass --write to apply)");
