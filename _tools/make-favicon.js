// Generate the site's favicon set.
//
// The mark is a pixel-art city skyline that spells F-A-T (an F, a building, a
// T), from Dustin's own fat_city_favicon.psd, inside a gold frame. Drawn as
// vector rects on a whole-pixel grid so it stays sharp at every size; see
// PIXELS below for why the grid is 14x14.
//
//   node _tools/make-favicon.js
//
// Writes favicon.svg, favicon.ico, favicon-16/32/48.png and apple-touch-icon.png to the root,
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
// REDRAWN ON A 14x14 GRID (10 Nov 2026). The traced PSD is 16x16 and ran edge to
// edge, so fitting it inside the gold frame meant scaling it to 12/16. A 16px
// drawing squeezed into 12px cannot land on whole pixels: at tab size the
// building in the middle turned into a blob, and Firefox (which also rescales
// the icon on 125%/150% displays) showed it as a smudge. The owner's report and
// screenshot are what prompted this.
//
// The mark is the same F, building, T skyline, redrawn by hand two pixels
// narrower and shorter: the centre building keeps its outline and shoulders
// with two windows instead of three. With a ONE unit frame the whole icon is a
// 16x16 grid, so 16, 32 and 48px are exact 1x, 2x and 3x copies with no
// resampling anywhere. The original 16x16 trace is in git history (before this
// commit) if the art is ever wanted back at a size that can hold it.
const GRID = 16;   // full icon, frame included
const ART = 14;    // the mark itself
const PIXELS = [
  "#####....#####",
  "#####....#####",
  "##..#####..##.",
  "##..#...#..##.",
  "##..#.#.#..##.",
  "###.#.#.#..##.",
  "###.#...#..##.",
  "##.##...##.##.",
  "##.#.....#.##.",
  "##.#.#.#.#.##.",
  "##.#.#.#.#.##.",
  "##.#.#.#.#.##.",
  "##.#.....#.##.",
  "##.#.....#.##.",
];

// Merge each row's consecutive ink pixels into one <rect> instead of one per
// pixel — same crisp result, a fraction of the markup.
function pixelRects() {
  const rects = [];
  for (let y = 0; y < ART; y++) {
    let x = 0;
    while (x < ART) {
      if (PIXELS[y][x] === "#") {
        const x0 = x;
        while (x < ART && PIXELS[y][x] === "#") x++;
        rects.push(`  <rect x="${x0 + BORDER}" y="${y + BORDER}" width="${x - x0}" height="1"/>`);
      } else {
        x++;
      }
    }
  }
  return rects.join("\n");
}

const GOLD = "#D4AF37";
const BORDER = 1; // grid units thick; GRID = ART + 2 * BORDER
function borderRects() {
  const t = BORDER;
  return [
    `<rect x="0" y="0" width="${GRID}" height="${t}"/>`,
    `<rect x="0" y="${GRID - t}" width="${GRID}" height="${t}"/>`,
    `<rect x="0" y="${t}" width="${t}" height="${GRID - 2 * t}"/>`,
    `<rect x="${GRID - t}" y="${t}" width="${t}" height="${GRID - 2 * t}"/>`,
  ].join("\n");
}

const svg = () => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${GRID} ${GRID}" shape-rendering="crispEdges">
  <rect width="${GRID}" height="${GRID}" fill="#ffffff"/>
  <g fill="${GOLD}">
${borderRects()}
  </g>
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
  // The SVG is what Firefox and Chrome use when offered one. crispEdges keeps
  // every edge hard at whatever size the tab strip asks for, including the
  // 20px and 24px a 125% or 150% display wants, where a PNG would be resampled.
  fs.writeFileSync(path.join(REPO, "favicon.svg"), svg().trim() + "\n");

  // Apple wants a square with no transparency and no rounding of its own.
  fs.writeFileSync(path.join(REPO, "apple-touch-icon.png"), await png(180));

  const kb = (f) => (fs.statSync(path.join(REPO, f)).size / 1024).toFixed(1) + " KB";
  console.log(`favicon.ico          ${kb("favicon.ico")}  (16, 32, 48)`);
  for (const s of [16, 32, 48]) console.log(`favicon-${s}x${s}.png${" ".repeat(s === 16 ? 4 : 4)} ${kb(`favicon-${s}x${s}.png`)}`);
  console.log(`apple-touch-icon.png ${kb("apple-touch-icon.png")}  (180)`);
})();
