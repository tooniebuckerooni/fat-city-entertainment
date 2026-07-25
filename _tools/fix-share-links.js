// Point the blog's Twitter share buttons at each post's current URL.
//
//   node fix-share-links.js          report what would change
//   node fix-share-links.js --write  apply it
//
// Weebly baked the old permalink into every share button:
//
//   <a class="twitter-share-button"
//      href="http://twitter.com/share?url=http://www.fatcityentertainment.com/4/post/2017/09/<slug>.html"
//      data-text="..." data-count="horizontal">
//
// Three things were wrong with that once the site moved:
//   1. It shares a /4/post/... URL, which only resolves via the redirect stubs.
//      Anything that follows links server-side (social preview crawlers) handles a
//      meta-refresh less reliably than a real redirect, so shares should carry the
//      post's current canonical URL directly.
//   2. It's http:// on both the endpoint and the shared URL.
//   3. `data-text` only does anything when Twitter's widgets.js is on the page.
//      Weebly loaded it; nothing does now, so these are plain links and the post
//      title was being dropped. Moving it into the URL as `text=` restores it.
//
// Rewrites to the documented intent endpoint with the current canonical URL:
//
//   https://twitter.com/intent/tweet?url=<canonical>&text=<title>
//
// The slug comes from the old URL itself, and every target is checked against
// the post that exists on disk — the script refuses to write if any is missing.

const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "..");
const WRITE = process.argv.includes("--write");
const SKIP = new Set(["_tools", "node_modules", ".git", ".claude", "_content", "4"]);

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

// The whole anchor, so the title in data-text can be carried across. Two shapes
// exist: the legacy /4/post/ permalink on older posts, and the current
// /triviahostresources/<slug>/ URL on a handful of newer ones. Both go through
// the same rewrite so every share button ends up on the intent endpoint with the
// post title attached.
const ANCHOR = new RegExp(
  '<a class="twitter-share-button" href="https?://twitter\\.com/share\\?url=' +
    "https?://www\\.fatcityentertainment\\.com" +
    "(?:/4/post/\\d{4}/\\d{2}/([^\"]+?)\\.html|/triviahostresources/([^\"/]+)/?)" +
    '"([^>]*)>',
  "g"
);

const decode = (s) =>
  s.replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

let rewritten = 0, files = 0, missing = new Set();

for (const file of walk(REPO)) {
  const rel = path.relative(REPO, file).replace(/\\/g, "/");
  let html;
  try { html = fs.readFileSync(file, "utf8"); } catch { continue; }
  if (!html.includes("twitter-share-button")) continue;

  let n = 0;
  const out = html.replace(ANCHOR, (whole, legacySlug, currentSlug, rest) => {
    // the newer links are written as /triviahostresources/<slug>.html
    const slug = legacySlug || (currentSlug || "").replace(/\.html$/, "");
    // the post must actually exist at the new path
    if (!fs.existsSync(path.join(REPO, "triviahostresources", slug, "index.html"))) {
      missing.add(slug);
      return whole;
    }
    const canonical = `https://www.fatcityentertainment.com/triviahostresources/${slug}/`;
    const t = rest.match(/data-text="([^"]*)"/);
    const title = t ? decode(t[1]) : "";
    const href =
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(canonical)}` +
      (title ? `&amp;text=${encodeURIComponent(title)}` : "");
    n++;
    return `<a class="twitter-share-button" href="${href}"${rest}>`;
  });

  if (n) {
    rewritten += n;
    files++;
    if (WRITE) fs.writeFileSync(file, out);
    if (files <= 6) console.log(`  ${rel}: ${n}`);
  }
}

if (files > 6) console.log(`  … and ${files - 6} more file(s)`);
console.log(`\n${rewritten} share link(s) across ${files} file(s)`);
if (missing.size) {
  console.error(`\nrefusing to rewrite ${missing.size} link(s) whose post is missing:`);
  for (const s of missing) console.error(`  ${s}`);
  process.exit(1);
}
console.log(WRITE ? "written" : "\n(report only — pass --write to apply)");
