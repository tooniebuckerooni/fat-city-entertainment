// Generate a .webp twin beside every image the site actually references.
//
// Same pixel dimensions, same filename, different extension — so the HTML can
// offer the .webp via <picture><source> and keep the original as the fallback
// (see wrap-picture.js). Nothing is deleted and no original is modified.
//
// Only images referenced by served HTML/CSS/JS are converted. The repo carries
// ~520 unreferenced files (retired Weebly theme backgrounds, _orig masters);
// converting those would add weight to the repo for no gain to any visitor.
//
//   node _tools/to-webp.js            # dry run — prints what it would do
//   node _tools/to-webp.js --write    # actually write the .webp files
//
// Safe to re-run: an existing, up-to-date .webp is skipped.
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const REPO = path.resolve(__dirname, "..");
const WRITE = process.argv.includes("--write");

// Keep a .webp only if it beats the original by this much. Below that the
// second request and the extra repo weight aren't worth it.
const MIN_SAVING = 0.15;

// Referenced only as the cloud-zoom gallery's <a href>, so they never load with
// the page — and they're the masters the LemonSqueezy export is cut from.
const ZOOM_MASTER = /_w(?:2304|2560|3456|4160)\.(?:jpe?g|png)$/i;

const SKIP_DIRS = new Set(["_tools", "node_modules", ".git", ".claude", "_export"]);

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const all = walk(REPO);
const texts = all.filter((p) => /\.(html|css|js|xml)$/i.test(p));
const images = all.filter((p) => /\.(jpe?g|png|gif)$/i.test(p));

// Index candidates by basename. Weebly filenames are globally unique, and
// matching on basename sidesteps every relative/absolute/encoded href form the
// migrated markup uses.
const byBase = new Map();
for (const img of images) {
  const b = path.basename(img);
  if (!byBase.has(b)) byBase.set(b, []);
  byBase.get(b).push(img);
}

const referenced = new Set();
for (const t of texts) {
  let txt;
  try {
    txt = fs.readFileSync(t, "utf8");
  } catch {
    continue;
  }
  const hits = txt.match(/[A-Za-z0-9_\-.,%()&'+@]+\.(?:jpe?g|png|gif)/gi) || [];
  for (let hit of hits) {
    let name;
    try {
      name = path.basename(decodeURIComponent(hit.replace(/&amp;/g, "&")));
    } catch {
      name = path.basename(hit);
    }
    for (const f of byBase.get(name) || []) referenced.add(f);
  }
}

(async () => {
  let converted = 0, skippedSmall = 0, skippedExisting = 0, failed = 0;
  let origBytes = 0, webpBytes = 0;
  const wins = [];

  for (const src of [...referenced].sort()) {
    if (ZOOM_MASTER.test(src)) continue;

    const dest = src.replace(/\.(jpe?g|png|gif)$/i, ".webp");
    const orig = fs.statSync(src).size;

    if (fs.existsSync(dest) && fs.statSync(dest).mtimeMs >= fs.statSync(src).mtimeMs) {
      skippedExisting++;
      continue;
    }

    try {
      const input = fs.readFileSync(src);
      const isGif = /\.gif$/i.test(src);
      // animated:true keeps every frame of a GIF; on a still image it's a no-op.
      const buf = await sharp(input, isGif ? { animated: true } : {})
        .webp({ quality: 80, effort: 5 })
        .toBuffer();

      if (buf.length < orig * (1 - MIN_SAVING)) {
        if (WRITE) fs.writeFileSync(dest, buf);
        converted++;
        origBytes += orig;
        webpBytes += buf.length;
        wins.push([orig - buf.length, path.relative(REPO, src), orig, buf.length]);
      } else {
        skippedSmall++;
      }
    } catch (e) {
      console.log("  ERROR", path.relative(REPO, src), e.message);
      failed++;
    }
  }

  wins.sort((a, b) => b[0] - a[0]);
  console.log("\n--- biggest wins ---");
  for (const [saved, rel, o, w] of wins.slice(0, 15)) {
    console.log(
      `  ${(saved / 1024).toFixed(0).padStart(6)}K saved   ` +
        `${(o / 1024).toFixed(0)}K -> ${(w / 1024).toFixed(0)}K   ${rel}`
    );
  }

  console.log(`\nreferenced images : ${referenced.size}`);
  console.log(`converted         : ${converted}`);
  console.log(`skipped (<15% win): ${skippedSmall}`);
  console.log(`skipped (existing): ${skippedExisting}`);
  console.log(`failed            : ${failed}`);
  console.log(
    `total             : ${(origBytes / 1048576).toFixed(1)} MB -> ` +
      `${(webpBytes / 1048576).toFixed(1)} MB ` +
      `(${origBytes ? (100 * (1 - webpBytes / origBytes)).toFixed(0) : 0}% smaller)`
  );
  if (!WRITE) console.log("\nDRY RUN — nothing written. Re-run with --write.");
})();
