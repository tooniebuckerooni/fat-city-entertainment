// Generate the site's favicon set.
//
// The site had no favicon at all — browsers fell back to a blank page icon in
// tabs, bookmarks and history. The only reference anywhere pointed at
// assets/favicon.ico from a single orphaned page, and that file didn't exist.
//
// The mark is "FC" in the site's own gold (#99790a, the colour of the
// "Fat City Entertainment" wordmark in the header) on black. Two letters is
// about the most that stays legible at 16px, which is the size that actually
// matters — a detailed logo turns to mush in a tab.
//
//   node _tools/make-favicon.js
//
// Writes favicon.ico, favicon-16/32/48.png and apple-touch-icon.png to the root,
// then add-favicon-links.js puts the <link> tags on every page.
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const REPO = path.resolve(__dirname, "..");
const GOLD = "#99790a";
const INK = "#000000";

// Slightly tightened letter-spacing and a heavy weight: at 16px the counters in
// "FC" close up otherwise and it reads as a smudge.
const svg = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="10" fill="${INK}"/>
  <text x="32" y="45"
        font-family="Arial Black, Arial, Helvetica, sans-serif"
        font-size="38" font-weight="900" letter-spacing="-2"
        text-anchor="middle" fill="${GOLD}">FC</text>
</svg>`;

// PNG-in-ICO. Valid since Vista and understood everywhere that still asks for a
// .ico; far simpler than emitting real BMP frames.
function ico(pngs) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);          // reserved
  header.writeUInt16LE(1, 2);          // type: icon
  header.writeUInt16LE(pngs.length, 4);

  let offset = 6 + 16 * pngs.length;
  const entries = [];
  for (const { size, data } of pngs) {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0); // width  (0 means 256)
    e.writeUInt8(size >= 256 ? 0 : size, 1); // height
    e.writeUInt8(0, 2);                      // palette size
    e.writeUInt8(0, 3);                      // reserved
    e.writeUInt16LE(1, 4);                   // colour planes
    e.writeUInt16LE(32, 6);                  // bits per pixel
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
    entries.push(e);
  }
  return Buffer.concat([header, ...entries, ...pngs.map((p) => p.data)]);
}

(async () => {
  const png = async (size) => sharp(Buffer.from(svg(size))).resize(size, size).png().toBuffer();

  const icoSizes = [16, 32, 48];
  const frames = [];
  for (const s of icoSizes) frames.push({ size: s, data: await png(s) });
  fs.writeFileSync(path.join(REPO, "favicon.ico"), ico(frames));

  for (const s of [16, 32, 48]) {
    fs.writeFileSync(path.join(REPO, `favicon-${s}x${s}.png`), await png(s));
  }
  // Apple wants a square with no transparency and no rounding of its own.
  fs.writeFileSync(path.join(REPO, "apple-touch-icon.png"), await png(180));

  const kb = (f) => (fs.statSync(path.join(REPO, f)).size / 1024).toFixed(1) + " KB";
  console.log(`favicon.ico          ${kb("favicon.ico")}  (16, 32, 48)`);
  for (const s of [16, 32, 48]) console.log(`favicon-${s}x${s}.png${" ".repeat(s === 16 ? 4 : 4)} ${kb(`favicon-${s}x${s}.png`)}`);
  console.log(`apple-touch-icon.png ${kb("apple-touch-icon.png")}  (180)`);
})();
