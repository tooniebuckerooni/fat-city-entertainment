// One-pass fix: protocol-relative own-domain URLs → root-relative.
const fs = require("fs");
const path = require("path");
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

let changed = 0;
for (const f of walk(REPO)) {
  const html = fs.readFileSync(f, "utf8");
  const fixed = html.replace(/(href|src)="(?:https?:)?\/\/(?:www\.)?fatcityentertainment\.com\/?/gi, '$1="/');
  if (fixed !== html) {
    fs.writeFileSync(f, fixed);
    changed++;
  }
}
console.log("files fixed:", changed);
