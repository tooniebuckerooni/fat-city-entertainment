// Generate cover art for the pre-made General Knowledge trivia shows.
//
//   node _tools/make-trivia-show-covers.js [--write]
//
// The five GK shows are new products with no artwork, and the store's other
// listings all carry a real image. A blank or borrowed tile reads as broken,
// so this renders a consistent set in the site's own palette — the brass
// (#99790a) and near-black (#16161a) that assets/css/site-extras.css already
// uses — sized 1200x800 to match the 3:2 of the existing product images.
//
// These are deliberate placeholders, not final art: they are typographic, so
// they look intentional next to photographic tiles rather than unfinished.
// Replacing any of them is a drop-in — same filename, same directory.
//
// Output goes to uploads/4/3/3/6/43362499/ alongside the rest of the artwork,
// as both .png (what product pages link) and .webp (the <picture> source).
const fs = require("fs");
const path = require("path");
const sharp = require(path.join(__dirname, "node_modules", "sharp"));

const REPO = path.resolve(__dirname, "..");
const OUT = path.join(REPO, "uploads/4/3/3/6/43362499");
const WRITE = process.argv.includes("--write");

const W = 1200, H = 800;
const BRASS = "#99790a", INK = "#16161a", CREAM = "#f7f7f5", MUTED = "#8a8a92";

// `accent` and `eyebrow` default to the brass general-knowledge treatment.
// The Halloween edition overrides both: it is the same product line, but a
// seasonal tile that reads as general knowledge will not get picked up in
// October, which is the only month it has.
const SHOWS = [
  { slug: "trivia-show-gk-night-one",   n: "ONE",   title: "Night One",   sub: "The Opener" },
  { slug: "trivia-show-gk-night-two",   n: "TWO",   title: "Night Two",   sub: "The Regular" },
  { slug: "trivia-show-gk-night-three", n: "THREE", title: "Night Three", sub: "The Mixer" },
  { slug: "trivia-show-gk-night-four",  n: "FOUR",  title: "Night Four",  sub: "The Curveball" },
  { slug: "trivia-show-gk-night-five",  n: "FIVE",  title: "Night Five",  sub: "The Decider" },
  { slug: "trivia-show-halloween", n: "31", title: "Halloween", sub: "Fright Night",
    eyebrow: "SEASONAL TRIVIA SHOW", accent: "#d2691e" },
  { slug: "trivia-show-christmas", n: "25", title: "Christmas", sub: "The Long Night",
    eyebrow: "SEASONAL TRIVIA SHOW", accent: "#2f7a55" },
  { slug: "trivia-show-gk-5pack", n: "5", title: "General Knowledge", sub: "The Full Set",
    eyebrow: "FIVE-SHOW BUNDLE", titleSize: 84,
    line1: "5 shows · 250 questions · 5 tiebreakers" },
  { slug: "trivia-show-classroom-math", n: "M", title: "Math", sub: "Numbers to percents",
    eyebrow: "CLASSROOM TRIVIA · GRADES 5–8", accent: "#2f6f8f" },
  { slug: "trivia-show-classroom-science", n: "S", title: "Science", sub: "Life, Earth and matter",
    eyebrow: "CLASSROOM TRIVIA · GRADES 5–8", accent: "#2f6f8f" },
  { slug: "trivia-show-classroom-english", n: "E", title: "English", sub: "Words to figures of speech",
    eyebrow: "CLASSROOM TRIVIA · GRADES 5–8", accent: "#2f6f8f" },
  { slug: "trivia-show-classroom-history", n: "H", title: "History", sub: "Ancient world to modern",
    eyebrow: "CLASSROOM TRIVIA · GRADES 5–8", accent: "#2f6f8f" },
  { slug: "trivia-show-classroom-geography", n: "G", title: "Geography", sub: "Continents to maps",
    eyebrow: "CLASSROOM TRIVIA · GRADES 5–8", accent: "#2f6f8f" },
  { slug: "trivia-show-classroom-5pack", n: "5", title: "Classroom Trivia", sub: "All five subjects",
    eyebrow: "FIVE-SUBJECT BUNDLE", accent: "#2f6f8f", titleSize: 84,
    line1: "5 subjects · 250 questions · grades 5–8" },
];

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// DejaVu Sans is the one face guaranteed present here; naming it explicitly
// beats "sans-serif", which fontconfig can resolve to something with different
// metrics and silently shift the layout.
const FACE = "DejaVu Sans, sans-serif";

function svg(s) {
  const A = s.accent || BRASS;
  const EY = s.eyebrow || "GENERAL KNOWLEDGE";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${INK}"/>
  <!-- a brass rule top and bottom, so the tile reads as a set member -->
  <rect x="0" y="0" width="${W}" height="10" fill="${A}"/>
  <rect x="0" y="${H - 10}" width="${W}" height="10" fill="${A}"/>
  <!-- oversized round numeral, ghosted, as the one graphic element -->
  <text x="${W - 60}" y="${H - 96}" text-anchor="end"
        font-family="${FACE}" font-weight="bold" font-size="300"
        fill="${A}" fill-opacity="0.13">${esc(s.n)}</text>
  <text x="72" y="188" font-family="${FACE}" font-weight="bold" font-size="30"
        fill="${A}" letter-spacing="7">${esc(EY)}</text>
  <text x="72" y="330" font-family="${FACE}" font-weight="bold" font-size="${s.titleSize || 112}"
        fill="${CREAM}">${esc(s.title)}</text>
  <text x="72" y="404" font-family="${FACE}" font-size="46"
        fill="${MUTED}" font-style="italic">${esc(s.sub)}</text>
  <rect x="72" y="470" width="132" height="5" fill="${A}"/>
  <text x="72" y="556" font-family="${FACE}" font-size="34" fill="${CREAM}">
    ${esc(s.line1 || "5 rounds · 50 questions · tiebreaker")}
  </text>
  <text x="72" y="608" font-family="${FACE}" font-size="34" fill="${MUTED}">
    Print and play — no screen needed
  </text>
  <text x="72" y="716" font-family="${FACE}" font-weight="bold" font-size="24"
        fill="${A}" letter-spacing="4">FAT CITY ENTERTAINMENT</text>
</svg>`;
}

(async () => {
  if (!WRITE) {
    console.log(`would render ${SHOWS.length} covers at ${W}x${H} into ${path.relative(REPO, OUT)}/`);
    SHOWS.forEach((s) => console.log(`  ${s.slug}.png  +  .webp`));
    console.log("\n(dry run -- pass --write to render)");
    return;
  }
  for (const s of SHOWS) {
    const buf = Buffer.from(svg(s));
    await sharp(buf).png({ compressionLevel: 9 }).toFile(path.join(OUT, `${s.slug}.png`));
    await sharp(buf).webp({ quality: 88 }).toFile(path.join(OUT, `${s.slug}.webp`));
    const kb = (fs.statSync(path.join(OUT, `${s.slug}.png`)).size / 1024).toFixed(0);
    console.log(`  ${s.slug}.png (${kb} KB) + .webp`);
  }
  console.log(`\nrendered ${SHOWS.length} covers into ${path.relative(REPO, OUT)}/`);
})();
