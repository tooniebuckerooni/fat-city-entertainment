// The thumbnail strip under a product's main image.
//
//   node _tools/add-product-gallery.js            # dry run, every product
//   node _tools/add-product-gallery.js p189       # dry run, one product
//   node _tools/add-product-gallery.js p189 --write
//
// WHY THIS EXISTS
// ---------------
// Weebly's product template has a gallery strip, #wsite-com-product-images-
// strip, and most of our pages carry an empty one: a bundle of three games and
// a software perk sells itself on one cover shot of one of the three. p189
// showed the music bingo box art and nothing of the trivia show, the game
// board, or a printed card.
//
// The markup is fiddly (a cloud-zoom anchor, an aspect-ratio wrapper, a
// <picture>, and a per-image crop offset), which is exactly why it must not be
// hand-written per page. CLAUDE.md's rule about never hand-editing generated
// product markup applies here more than anywhere: these pages are nested Weebly
// table scaffolding.
//
// THUMBNAILS ARE GENERATED, NOT ASSUMED
// -------------------------------------
// Each entry gets a real <base>-thumb file at 160px tall, plus a .webp twin
// when the twin is at least 15% smaller (to-webp.js's own threshold). The
// <source> is written ONLY when that twin is really on disk: a <source> that
// 404s does not fall back to the <img> beside it, it renders a blank box. That
// is how the Decades 5-Pack tile went blank on store/c11, and the same trap is
// one careless line away here.
//
// THE CROP IS DERIVED, NOT COPIED
// -------------------------------
// Centring an image of aspect a inside a container R as tall as it is wide is
//   top% = -((a - R) / 2R) * 100     when the image is taller than the slot
//   width% = (R / a) * 100           when it is wider (scale up, centre across)
// Same arithmetic as add-store-tile.js. R is read off the page's own inline
// #wsite-com-product-images rule rather than hardcoded, because Weebly writes a
// different one per template.
const fs = require("fs");
const path = require("path");
const sharp = require("./node_modules/sharp");

const REPO = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
const WRITE = args.includes("--write");
const ONLY = args.filter((a) => /^p\d+$/.test(a));

const THUMB_H = 160;      // the height Weebly's own strip thumbnails use
const MIN_WEBP_SAVING = 0.15;

// pid -> the shots that go in the strip, in order. The main image is always
// first in the rendered strip whether or not it is listed here, because that is
// how the theme's zoom gallery expects to find it.
const GALLERIES = {
  // The Halloween Complete Pack is three products in one download, so the strip
  // has to show all three or the page is arguing for a bundle with one picture.
  // Order follows the order the description lists them in.
  p189: [
    { src: "/uploads/4/3/3/6/43362499/halloween-party-music-bingo-sample-cards.png",
      alt: "Printed Halloween music bingo cards" },
    { src: "/uploads/4/3/3/6/43362499/trivia-show-halloween.png",
      alt: "Halloween Trivia Night, the print and play trivia show" },
    { src: "/uploads/4/3/3/6/43362499/halloween-trivia-game-board.png",
      alt: "The Halloween Party Game Show board" },
    { src: "/uploads/4/3/3/6/43362499/halloween-trivia-game-show-questions-screenshot.png",
      alt: "A question slide from the Halloween Party Game Show" },
  ],
};

const abs = (rel) => path.join(REPO, rel.replace(/^\//, ""));
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
// The main image's alt is read back OUT of the page, so it is already escaped.
// Decoding first stops esc() turning &amp; into &amp;amp; on every re-run, which
// would compound: the tool is idempotent only if what it reads and what it
// writes are in the same form.
const unesc = (s) => String(s)
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

function pageFor(pid) {
  const dir = path.join(REPO, "store", pid);
  if (!fs.existsSync(dir)) return null;
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith(".html"))
    .map((f) => path.join("store", pid, f))
    .find((f) => fs.readFileSync(path.join(REPO, f), "utf8").includes(`data-product="${pid}"`)) || null;
}

// margin-bottom on the strip's aspect box, as a fraction. 0.66 on the standard
// product template.
function ratioOf(html) {
  const m = html.match(/#wsite-com-product-images[^{]*\{\s*margin-bottom:\s*([\d.]+)%/i);
  return m ? Number(m[1]) / 100 : 0.66;
}

async function thumbFor(src) {
  const ext = path.extname(src);
  const thumbRel = src.replace(new RegExp(`${ext.replace(".", "\\.")}$`), `-thumb${ext}`);
  const webpRel = thumbRel.replace(/\.(jpe?g|png|gif)$/i, ".webp");
  const srcAbs = abs(src), thumbAbs = abs(thumbRel), webpAbs = abs(webpRel);
  if (!fs.existsSync(srcAbs)) throw new Error(`no such image: ${src}`);

  const made = [];
  // Tracked rather than re-tested with existsSync at render time: on a dry run
  // nothing is on disk yet, so an existsSync check would omit the <source> the
  // real --write run goes on to emit, and the two would disagree.
  let hasWebp = fs.existsSync(webpAbs);
  if (!fs.existsSync(thumbAbs)) {
    const buf = await sharp(srcAbs).resize({ height: THUMB_H, withoutEnlargement: true }).toBuffer();
    if (WRITE) fs.writeFileSync(thumbAbs, buf);
    made.push(`${thumbRel} (${(buf.length / 1024).toFixed(0)}KB)`);
  }
  if (!fs.existsSync(webpAbs)) {
    const base = fs.existsSync(thumbAbs) ? fs.statSync(thumbAbs).size : null;
    const buf = await sharp(fs.existsSync(thumbAbs) ? thumbAbs : srcAbs)
      .resize({ height: THUMB_H, withoutEnlargement: true })
      .webp({ quality: 80, effort: 5 })
      .toBuffer();
    // Same 15% floor as to-webp.js. Below it the twin is not worth a second
    // file, and writing the <source> anyway is what blanks an image.
    if (base === null || buf.length < base * (1 - MIN_WEBP_SAVING)) {
      if (WRITE) fs.writeFileSync(webpAbs, buf);
      made.push(`${webpRel} (${(buf.length / 1024).toFixed(0)}KB)`);
      hasWebp = true;
    }
  }
  const meta = await sharp(srcAbs).metadata();
  return { thumbRel, webpRel, hasWebp, made, aspect: meta.height / meta.width };
}

function cell(i, shot, t, R, alt) {
  let width = 100, left = 0, top = 0;
  if (t.aspect >= R) {
    top = -((t.aspect - R) / (2 * R)) * 100;
  } else {
    width = (R / t.aspect) * 100;
    left = -(width - 100) / 2;
  }
  const style = `width:${width.toFixed(2)}%;top:${top.toFixed(2)}%;left:${left.toFixed(2)}%`;
  const img = `<img class="wsite-com-product-images-secondary-image wsite-imageaspectratio-image" ` +
    `src="${t.thumbRel}" style="${style}" loading="lazy" decoding="async" alt="${esc(alt)}">`;
  const picture = t.hasWebp
    ? `<picture><source srcset="${t.webpRel}" type="image/webp">${img}</picture>`
    : img;
  return `\t\t\t\t\t\t<a id="wsite-com-product-images-secondary-${i}" href="${shot.src}" ` +
    `class="wsite-com-product-images-secondary wsite-com-column cloud-zoom-gallery" ` +
    `data-zoom-id="zoom1" data-small-image="${shot.src}">
\t\t\t\t\t\t\t<div class="wsite-com-product-images-secondary-outer">
\t\t\t\t\t\t\t\t<div class="wsite-com-product-images-secondary-image-container wsite-imageaspectratio-image-container">
\t<div class="wsite-com-product-images-secondary-image-height wsite-imageaspectratio-image-height">
\t</div>
\t<div class="wsite-com-product-images-secondary-image-wrap wsite-imageaspectratio-image-wrap">
\t\t${picture}
\t</div>
</div>

\t\t\t\t\t\t\t</div>
\t\t\t\t\t\t</a>`;
}

(async () => {
  const pids = Object.keys(GALLERIES).filter((p) => !ONLY.length || ONLY.includes(p));
  let changed = 0, assets = 0;
  for (const pid of pids) {
    const rel = pageFor(pid);
    if (!rel) { console.log(`  no page for ${pid}`); process.exitCode = 1; continue; }
    let html = fs.readFileSync(path.join(REPO, rel), "utf8");
    const R = ratioOf(html);

    const mainM = html.match(
      /<a href="(\/uploads\/[^"]+)" class="cloud-zoom" id="zoom1"[\s\S]*?alt="([^"]*)"/
    );
    if (!mainM) { console.log(`  ${pid}: no main image found`); process.exitCode = 1; continue; }

    // The main shot leads the strip: clicking a thumbnail swaps the zoom target,
    // so without it there is no way back to the cover.
    const shots = [{ src: mainM[1], alt: unesc(mainM[2]) }, ...GALLERIES[pid]];
    console.log(`${pid}  ${rel}  (slot ratio ${R})`);

    const cells = [];
    for (let i = 0; i < shots.length; i++) {
      const t = await thumbFor(shots[i].src);
      t.made.forEach((m) => console.log(`  ${WRITE ? "wrote" : "would write"} ${m}`));
      assets += t.made.length;
      cells.push(cell(i + 1, shots[i], t, R, shots[i].alt || unesc(mainM[2])));
    }

    const strip = `<div id="wsite-com-product-images-strip" class="wsite-com-column-group">\n` +
      cells.join("\n") + `\n\t\t\t\t</div>`;
    const STRIP_RE = /<div id="wsite-com-product-images-strip"[^>]*>[\s\S]*?<\/div>\s*<\/div>\s*<div id="wsite-com-product-info">/;
    if (!STRIP_RE.test(html)) {
      // Fall back to the empty-strip shape, which has no nested cells to walk.
      const EMPTY = /<div id="wsite-com-product-images-strip"[^>]*>\s*<\/div>/;
      if (!EMPTY.test(html)) { console.log(`  ${pid}: no image strip to fill`); process.exitCode = 1; continue; }
      html = html.replace(EMPTY, () => strip);
    } else {
      html = html.replace(STRIP_RE, () => `${strip}\n\t\t</div>\t\n\t\t<div id="wsite-com-product-info">`);
    }

    const before = fs.readFileSync(path.join(REPO, rel), "utf8");
    if (before === html) { console.log(`  unchanged`); continue; }
    changed++;
    console.log(`  ${WRITE ? "updated" : "would update"}: ${rel} (${shots.length} shots)`);
    if (WRITE) fs.writeFileSync(path.join(REPO, rel), html);
  }
  // Reported separately from the page count, and reported at all, because a
  // deleted thumbnail changes no HTML: the tool would quietly regenerate it and
  // still say "0 pages". Until it is re-run the <source> points at nothing and
  // the strip shows a blank box. check-links.js catches the dangling reference
  // too, but a tool whose dry run says "nothing to do" while a file it owns is
  // missing is the blind spot CLAUDE.md warns about.
  console.log(`\n${WRITE ? "updated" : "would update"}: ${changed} page(s)`);
  console.log(`${WRITE ? "wrote" : "would write"}: ${assets} thumbnail file(s)`);
  if (!WRITE && (changed || assets)) console.log("re-run with --write");
})();
