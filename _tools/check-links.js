// Verify every internal href/src in the built site resolves to a local file.
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

function resolves(urlPath) {
  let p = decodeURIComponent(urlPath.split("?")[0].split("#")[0]);
  if (p === "/" || p === "") return true;
  const fsPath = path.join(REPO, p.replace(/^\//, "").replace(/\//g, path.sep));
  if (fs.existsSync(fsPath)) {
    // directory must contain index.html
    if (fs.statSync(fsPath).isDirectory()) return fs.existsSync(path.join(fsPath, "index.html"));
    return true;
  }
  // GitHub Pages also serves /foo as /foo.html
  if (!/\.[a-z0-9]+$/i.test(p) && fs.existsSync(fsPath + ".html")) return true;
  return false;
}

const broken = {};
const files = walk(REPO);
for (const f of files) {
  const $ = cheerio.load(fs.readFileSync(f, "utf8"));
  const rel = path.relative(REPO, f).replace(/\\/g, "/");
  $("[href], [src]").each((_, el) => {
    for (const attr of ["href", "src"]) {
      let v = $(el).attr(attr);
      if (!v) continue;
      v = v.trim();
      if (/^(https?:|mailto:|tel:|javascript:|#|data:|about:)/i.test(v)) continue;
      // relative link in a subdirectory page resolves relative to that dir
      let target;
      if (v.startsWith("/")) target = v;
      else target = "/" + path.posix.join(path.posix.dirname(rel), v);
      if (!resolves(target)) {
        const key = (v.startsWith("/") ? v : `${v} (in ${path.posix.dirname(rel)}/)`).split("?")[0];
        if (!broken[key]) broken[key] = [];
        if (broken[key].length < 3) broken[key].push(rel);
      }
    }
  });
}

const keys = Object.keys(broken).sort();
console.log(`pages checked: ${files.length}`);
console.log(`broken refs: ${keys.length}`);
for (const k of keys.slice(0, 120)) console.log(`  ${k}  <- ${broken[k].join(", ")}`);
