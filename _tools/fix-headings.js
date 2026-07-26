// Give every page an <h1>.
//
// Weebly never emitted one: 376 of the site's 381 indexable pages had no <h1>
// at all, using <h2 class="wsite-content-title"> (or .blog-title, or
// #wsite-com-product-title) as their top-level heading. Search engines and AI
// answer engines both lean on the <h1> to decide what a page is *about*, so the
// whole site was handing that signal back.
//
// This promotes the heading that already reads as the page title — it does not
// invent or move any text. What changes is the tag.
//
//   product page   -> <h2 id="wsite-com-product-title">   (the product name)
//   blog post      -> <h2 class="blog-title">             (the post title)
//   everything else-> first <h2 class="wsite-content-title">
//
// Blog *list* pages (the landing page, archives, categories, pagination) are
// skipped here: .blog-title appears once per post in the list, so promoting the
// first one would make one post's title the heading for the whole page. They get
// a real <h1> from fix-blog-meta.js, which knows what each list page is for.
//
// STYLING: the theme styles these through a bare `h2` element selector in
// files/main_style.css plus a per-page inline rule, neither of which follows the
// class — so an <h1> would lose the lot (Montserrat 24px/700 -> browser default
// Birdseye 32px). assets/css/site-extras.css carries matching h1 rules; the two
// changes belong together. Verified by diffing computed styles before and after.
//
//   node _tools/fix-headings.js            # dry run
//   node _tools/fix-headings.js --write
//
// Safe to re-run: a page that already has an <h1> is left alone.
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const WRITE = process.argv.includes("--write");
const SKIP_DIRS = new Set(["_tools", "node_modules", ".git", ".claude", "_export", "_content", "pages"]);

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith(".html")) out.push(p);
  }
  return out;
}

// A blog list page rather than a single post.
function isBlogList(rel) {
  return (
    rel === "triviahostresources.html" ||
    /^triviahostresources\/(archives|category|previous)\//.test(rel)
  );
}

let promoted = 0, hadH1 = 0, stub = 0, listPage = 0, noCandidate = 0;
const byKind = { product: 0, category: 0, post: 0, page: 0 };

for (const file of walk(REPO).sort()) {
  const rel = path.relative(REPO, file).replace(/\\/g, "/");
  let html = fs.readFileSync(file, "utf8");

  if (/http-equiv="refresh"/i.test(html)) { stub++; continue; }
  if (/<h1[\s>]/i.test(html)) { hadH1++; continue; }
  if (isBlogList(rel)) { listPage++; continue; }

  // Ordered: the most specific identifier for this page type wins.
  const candidates = [
    ["product", /<h2\b([^>]*\bid="wsite-com-product-title"[^>]*)>/i],
    ["category", /<h2\b([^>]*\bid="wsite-com-title"[^>]*)>/i],
    ["post", /<h2\b([^>]*\bclass="[^"]*\bblog-title\b[^"]*"[^>]*)>/i],
    ["page", /<h2\b([^>]*\bclass="[^"]*\bwsite-content-title\b[^"]*"[^>]*)>/i],
  ];

  let done = false;
  for (const [kind, re] of candidates) {
    const m = html.match(re);
    if (!m) continue;
    const open = m[0];
    const attrs = m[1];
    // Replace this one opening tag and its matching </h2>.
    const start = m.index;
    const closeAt = html.indexOf("</h2>", start);
    if (closeAt === -1) continue;
    html =
      html.slice(0, start) +
      `<h1${attrs}>` +
      html.slice(start + open.length, closeAt) +
      "</h1>" +
      html.slice(closeAt + "</h2>".length);
    byKind[kind]++;
    promoted++;
    done = true;
    break;
  }

  if (!done) { noCandidate++; continue; }
  if (WRITE) fs.writeFileSync(file, html);
}

console.log(`promoted to <h1>   : ${promoted}`);
console.log(`   product pages   : ${byKind.product}`);
console.log(`   blog posts      : ${byKind.post}`);
console.log(`   other pages     : ${byKind.page}`);
console.log(`already had an h1  : ${hadH1}`);
console.log(`blog list pages    : ${listPage}   (handled by fix-blog-meta.js)`);
console.log(`redirect stubs     : ${stub}`);
console.log(`no heading found   : ${noCandidate}`);
if (!WRITE) console.log("\nDRY RUN — nothing written. Re-run with --write.");
