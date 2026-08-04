// Generate the site's favicon set.
//
// The mark is a 16x16 pixel-art city skyline, traced from Dustin's own
// fat_city_favicon.psd (a flat 16x16 RGB image, #373737 on white — no layers,
// no gradients, just the pixel grid). Reconstructed as vector rects at the
// source resolution rather than upscaling the raster, so it stays pixel-sharp
// at every size instead of blurring past 16px. PIXELS below is that grid, read
// as one string per row ("#" = ink, "." = white); regenerate it by re-running
// the trace against a new PSD if the art changes.
//
//   node _tools/make-favicon.js
//
// Writes favicon.ico, favicon-16/32/48.png and apple-touch-icon.png to the root,
// then add-favicon-links.js puts the <link> tags on every page.
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const REPO = path.resolve(__dirname, "..");
// Bumped from the source PSD's #373737 to true black — at 16px real-world
// scaling (non-integer DPI, browser tab chrome) the anti-aliased edges of a
// mid-dark gray wash out toward the background and read as blurry. Black
// keeps more contrast through that blend, same silhouette either way.
const INK = "#000000";
const GRID = 16;
const PIXELS = [
  "######....######",
  "######....######",
  "##...........##.",
  "##...#####...##.",
  "##...#...#...##.",
  "##...#.#.#...##.",
  "###..#.#.#...##.",
  "###..#.#.#...##.",
  "##...#...#...##.",
  "##.###...###.##.",
  "##.#.......#.##.",
  "##.#.#.#.#.#.##.",
  "##.#.#.#.#.#.##.",
  "##.#.#.#.#.#.##.",
  "##.#.......#.##.",
  "##.#.......#.##.",
];

// Merge each row's consecutive ink pixels into one <rect> instead of one per
// pixel — same crisp result, a fraction of the markup.
function pixelRects() {
  const rects = [];
  for (let y = 0; y < GRID; y++) {
    let x = 0;
    while (x < GRID) {
      if (PIXELS[y][x] === "#") {
        const x0 = x;
        while (x < GRID && PIXELS[y][x] === "#") x++;
        rects.push(`  <rect x="${x0}" y="${y}" width="${x - x0}" height="1"/>`);
      } else {
        x++;
      }
    }
  }
  return rects.join("\n");
}

const svg = () => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${GRID} ${GRID}" shape-rendering="crispEdges">
  <rect width="${GRID}" height="${GRID}" fill="#ffffff"/>
  <g fill="${INK}">
${pixelRects()}
  </g>
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
