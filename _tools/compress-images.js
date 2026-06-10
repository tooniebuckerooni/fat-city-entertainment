// Recompress images over 300KB in place (same filename, same format, same
// pixel dimensions). JPEGs: quality 80 + mozjpeg. PNGs: palette quality 85.
// The original is kept unless the recompressed file is >=10% smaller.
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const REPO = path.resolve(__dirname, "..");
const LIMIT = 300 * 1024;

function walk(dir) {
  let out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["_tools", "node_modules", ".git", ".claude"].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out = out.concat(walk(p));
    else if (/\.(jpe?g|png)$/i.test(e.name)) out.push(p);
  }
  return out;
}

(async () => {
  let done = 0, skipped = 0, savedTotal = 0;
  for (const f of walk(REPO)) {
    const orig = fs.statSync(f).size;
    if (orig <= LIMIT) continue;
    try {
      const isPng = /\.png$/i.test(f);
      const input = fs.readFileSync(f); // buffer input avoids libvips file-handle issues on Windows
      const buf = await (isPng
        ? sharp(input).png({ quality: 85, compressionLevel: 9, palette: true })
        : sharp(input).jpeg({ quality: 80, mozjpeg: true })
      ).toBuffer();
      if (buf.length < orig * 0.9) {
        fs.writeFileSync(f, buf);
        savedTotal += orig - buf.length;
        done++;
      } else {
        skipped++;
      }
    } catch (e) {
      console.log("ERROR", path.relative(REPO, f), e.message);
      skipped++;
    }
  }
  console.log(`recompressed: ${done}, left as-is: ${skipped}, saved: ${(savedTotal / 1048576).toFixed(1)} MB`);
})();
