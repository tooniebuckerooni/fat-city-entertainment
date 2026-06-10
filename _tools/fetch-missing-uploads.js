// Scan all site HTML for /uploads/... references, list ones missing locally.
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

const refs = new Set();
for (const f of walk(REPO)) {
  const html = fs.readFileSync(f, "utf8").replace(/&amp;/g, "&").replace(/&quot;/g, '"');
  for (const m of html.matchAll(/\/uploads\/[^"'\s)>\\]+/g)) {
    let u = m[0].split("?")[0].split("#")[0];
    u = decodeURIComponent(u);
    if (/\.(jpe?g|png|gif|webp|svg|pdf|mp4|mp3|zip|m4v|mov)$/i.test(u)) refs.add(u);
  }
}

const missing = [];
for (const u of refs) {
  const p = path.join(REPO, u.replace(/^\//, "").replace(/\//g, path.sep));
  if (!fs.existsSync(p)) missing.push(u);
}
fs.writeFileSync(path.join(__dirname, "missing-uploads.txt"), missing.sort().join("\n"));
console.log(`total upload refs: ${refs.size}, missing: ${missing.length}`);
