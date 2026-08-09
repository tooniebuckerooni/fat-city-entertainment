// Force every reference to a file whose NAME contains a reserved character
// onto the percent-encoded form of its URL.
//
//   node normalize-url-encoding.js          report only
//   node normalize-url-encoding.js --write  apply
//
// WHY
// ---
// Four Weebly-era product pages have `,` and `&` in the filename itself:
//
//   store/p25/10,000__Q&A_Pack_2.html
//   store/p26/13,000__Q&A_Pack_4.html
//   store/p27/10,000__Q&A_Pack_3.html
//   store/c34/Music_Bingo_&_Trivia_Bundles.html
//
// Both `,` and `&` are sub-delims under RFC 3986, so `%2C` and `,` are NOT the
// same URL to a search engine even though the server decodes both to the same
// file. The site was writing them both ways at once: sitemap.xml and most
// internal links used the encoded form, while the rel=canonical tag on each
// page used the raw one. That is the same duplicate-URL split that
// canonicalize-trailing-slash.js fixes for directory pages, just with a
// different character.
//
// Encoded wins here because that is what the sitemap and the large majority of
// internal links already said, so it is much the smaller move — and a raw `&`
// sitting in a path is the kind of thing intermediate proxies and link
// scrapers mangle.
//
// Note the two spellings of `&` in HTML source: a raw `&` and the entity
// `&amp;`. Both appear in this repo and both mean the same character in a URL,
// so both are rewritten.

const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const WRITE = process.argv.includes("--write");
const SKIP = new Set(["_tools", "_content", "node_modules", ".git", ".claude"]);

function walk(dir, pred) {
  let out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out = out.concat(walk(p, pred));
    else if (pred(e.name)) out.push(p);
  }
  return out;
}

// Every served file whose own name carries a character we want encoded.
const RESERVED = /[,&]/;
const offenders = walk(REPO, (n) => RESERVED.test(n)).map((f) =>
  path.relative(REPO, f).replace(/\\/g, "/")
);

// raw path -> encoded path, for the URL forms that actually occur in source.
const rewrites = [];
for (const rel of offenders) {
  const encoded = rel.replace(/,/g, "%2C").replace(/&/g, "%26");
  rewrites.push(["/" + rel, "/" + encoded]); // raw `&`
  rewrites.push(["/" + rel.replace(/&/g, "&amp;"), "/" + encoded]); // entity form
}

const targets = walk(REPO, (n) => n.endsWith(".html"));
targets.push(path.join(REPO, "sitemap.xml"));

let files = 0;
let refs = 0;
for (const file of targets) {
  if (!fs.existsSync(file)) continue;
  const before = fs.readFileSync(file, "utf8");
  let after = before;
  let n = 0;
  for (const [from, to] of rewrites) {
    if (from === to || !after.includes(from)) continue;
    n += after.split(from).length - 1;
    after = after.split(from).join(to);
  }
  if (!n || after === before) continue;
  files++;
  refs += n;
  if (WRITE) fs.writeFileSync(file, after);
}

console.log(`Files on disk with a reserved char in the name: ${offenders.length}`);
for (const o of offenders) console.log(`   ${o}`);
console.log(
  `\n${WRITE ? "Rewrote" : "Would rewrite"} ${refs} reference(s) across ${files} file(s).`
);
if (!WRITE) console.log("(dry run -- pass --write to apply)");
