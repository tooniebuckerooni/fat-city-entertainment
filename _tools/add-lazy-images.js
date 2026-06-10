// Add loading="lazy" decoding="async" to images site-wide, keeping the first
// image on each page eager (likely above the fold). Part of the post-transform
// fixer chain — safe to re-run.
const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
const REPO = path.resolve(__dirname, "..");

function walk(dir) {
  let out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["_tools", "node_modules", ".git", ".claude"].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out = out.concat(walk(p));
    else if (e.name.endsWith(".html")) out.push(p);
  }
  return out;
}

let pages = 0, imgs = 0;
for (const f of walk(REPO)) {
  const html = fs.readFileSync(f, "utf8");
  if (!html.includes("<img")) continue;
  const $ = cheerio.load(html);
  let first = true;
  let touched = false;
  $("img").each((_, el) => {
    if (first) { first = false; return; }
    if (!$(el).attr("loading")) {
      $(el).attr("loading", "lazy");
      $(el).attr("decoding", "async");
      imgs++;
      touched = true;
    }
  });
  if (touched) {
    fs.writeFileSync(f, $.html());
    pages++;
  }
}
console.log(`lazy-loaded ${imgs} images across ${pages} pages`);
