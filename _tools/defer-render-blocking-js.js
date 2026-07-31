// Sitewide fix for the homepage's mobile PageSpeed audit (Performance 45,
// LCP 11.2s): jQuery 1.8.3, plugins.js, and custom.js all load synchronously
// in <head>, blocking first paint on every page.
//
// Safe to `defer` as a group because `defer` preserves document order among
// deferred scripts and always runs before DOMContentLoaded — so as long as
// jquery -> plugins.js -> custom.js stay deferred *together*, custom.js's
// top-level `jQuery(function($){...})` call still finds jQuery defined by
// the time it runs. Verified: only 3 pages (yycevents.html,
// costumeperformers.html, holidayparty.html) have an inline <script> that
// calls jQuery directly (a slideshow init) — those get `defer` added too,
// which is safe for the same document-order reason. No other inline script
// in the site calls $()/jQuery() outside of a .ready() callback registered
// on page load, so nothing else depends on jQuery's *load* timing, only on
// $(document).ready() firing at DOMContentLoaded, which is unaffected.
//
// jQuery ships two ways across the export (local copy and Weebly's CDN,
// single- and double-quoted), and plugins.js/custom.js sometimes carry a
// cache-busting query string — all variants handled below.
//
//   node _tools/defer-render-blocking-js.js            # dry run
//   node _tools/defer-render-blocking-js.js --write
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const WRITE = process.argv.includes("--write");
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

// Adds `defer` right after `<script` for any <script ...src="...">` tag
// whose src matches `srcTest`, unless it already has defer/async.
function deferScriptsBySrc(html, srcTest) {
  let count = 0;
  html = html.replace(/<script([^>]*?)\ssrc=(["'])([^"']*)\2([^>]*)>/g, (m, pre, q, src, post) => {
    if (!srcTest.test(src)) return m;
    if (/\bdefer\b|\basync\b/.test(pre) || /\bdefer\b|\basync\b/.test(post)) return m;
    count++;
    return `<script defer${pre} src=${q}${src}${q}${post}>`;
  });
  return { html, count };
}

const INLINE_DEFER_PAGES = new Set([
  "yycevents.html",
  "costumeperformers.html",
  "holidayparty.html",
]);

let jqueryFixed = 0, pluginsFixed = 0, customFixed = 0, inlineFixed = 0;

for (const file of walk(REPO)) {
  let html = fs.readFileSync(file, "utf8");
  const before = html;
  const rel = path.relative(REPO, file).replace(/\\/g, "/");

  let r;
  r = deferScriptsBySrc(html, /jquery-1\.8\.3\.min\.js$/);
  html = r.html; jqueryFixed += r.count;

  r = deferScriptsBySrc(html, /\/files\/theme\/plugins\.js(\?.*)?$/);
  html = r.html; pluginsFixed += r.count;

  r = deferScriptsBySrc(html, /\/files\/theme\/custom\.js(\?.*)?$/);
  html = r.html; customFixed += r.count;

  if (INLINE_DEFER_PAGES.has(path.basename(rel))) {
    const inlineRe = /<script type="text\/javascript">(\s*\(function\(jQuery\) \{[\s\S]*?jQuery\(document\)\.ready\(init\);\s*\}\)\(window\.jQuery\)\s*)<\/script>/;
    if (inlineRe.test(html)) {
      html = html.replace(inlineRe, '<script defer type="text/javascript">$1</script>');
      inlineFixed++;
    }
  }

  if (html !== before && WRITE) fs.writeFileSync(file, html);
}

console.log(`jquery-1.8.3.min.js deferred : ${jqueryFixed}`);
console.log(`plugins.js deferred          : ${pluginsFixed}`);
console.log(`custom.js deferred           : ${customFixed}`);
console.log(`inline slideshow scripts     : ${inlineFixed}`);
if (!WRITE) console.log("\nDRY RUN — nothing written. Re-run with --write.");
