// Build a new content page on the site's existing shell.
//
// Every page here is a full standalone HTML document carrying the whole theme —
// nav, dropdowns, fonts, footer, analytics, the lot. Writing one from scratch
// means reproducing ~14 KB of that by hand and getting the nav subtly wrong. So
// new pages are cloned from a real one and only the content region is replaced,
// the same approach new-product.js and publish-post.js already use.
//
// Pages are defined in _tools/new-content-pages.json. Body HTML uses the theme's
// own classes so it inherits the site's typography with no new CSS:
//
//   <h1 class="wsite-content-title">   page heading (exactly one)
//   <h2 class="wsite-content-title">   section heading
//   <div class="paragraph">…</div>     body text
//   <a class="fce-cta">…</a>           the black CTA button from site-extras.css
//
//   node _tools/new-content-page.js            # dry run
//   node _tools/new-content-page.js --write
//
// Re-running rebuilds each page from its spec, so edit the JSON and re-run
// rather than hand-editing the generated HTML.
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const WRITE = process.argv.includes("--write");
const SITE = "https://www.fatcityentertainment.com";
const SPEC = path.join(__dirname, "new-content-pages.json");

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
  .replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const specs = JSON.parse(fs.readFileSync(SPEC, "utf8"));

// The content region runs from the opening #wsite-content div to the footer.
const CONTENT_OPEN = '<div id="wsite-content"';
const FOOTER_OPEN = '<div class="footer-wrap"';

let built = 0;
for (const spec of specs) {
  const tplPath = path.join(REPO, spec.template);
  if (!fs.existsSync(tplPath)) {
    console.error(`  SKIP ${spec.slug} — no template at ${spec.template}`);
    continue;
  }
  let html = fs.readFileSync(tplPath, "utf8");
  const url = `${SITE}/${spec.slug}`;

  // --- head -----------------------------------------------------------
  // Every replacement below uses a FUNCTION, not a plain string. A plain
  // string passed to String.replace() has "$1", "$2" etc. read back out as
  // capture-group backreferences — and a description or title containing a
  // dollar amount like "$13.98" starts with exactly that pattern. This is
  // the same bug class as add-store-tile.js rendering $197.00 as $97.00,
  // documented in HANDOFF.md — it silently corrupted trivia-show-maker-plans.html's
  // og:description on 2026-08-12 (a "$13.98" ate the canonical <link> tag
  // into itself) before this fix. Function replacers are immune: their
  // return value is inserted literally, no matter what it contains.
  html = html.replace(/<title>[\s\S]*?<\/title>/i,
    () => `<title>${esc(spec.title)} - Fat City Entertainment</title>`);
  html = html.replace(/<meta[^>]+name="description"[^>]*>/i,
    () => `<meta name="description" content="${esc(spec.description)}">`);
  html = html.replace(/<link rel="canonical" href="[^"]*"/i, () => `<link rel="canonical" href="${url}"`);

  // og: tags — replace if present, otherwise add after the canonical.
  const og =
    `<meta property="og:title" content="${esc(spec.title)}">\n` +
    `<meta property="og:description" content="${esc(spec.description)}">\n` +
    `<meta property="og:url" content="${url}">\n` +
    `<meta property="og:type" content="website">`;
  html = html.replace(/<meta property="og:title"[^>]*>\s*/gi, "");
  html = html.replace(/<meta property="og:description"[^>]*>\s*/gi, "");
  html = html.replace(/<meta property="og:url"[^>]*>\s*/gi, "");
  html = html.replace(/<meta property="og:type"[^>]*>\s*/gi, "");
  html = html.replace(/(<link rel="canonical"[^>]*>)/i, (m, canonical) => `${canonical}\n${og}`);

  // Drop the template's structured data; add-jsonld.js regenerates per page.
  html = html.replace(/<!-- fce:jsonld -->[\s\S]*?<!-- \/fce:jsonld -->\n?/i, "");

  // --- content ------------------------------------------------------------
  const start = html.indexOf(CONTENT_OPEN);
  const end = html.indexOf(FOOTER_OPEN);
  if (start === -1 || end === -1) {
    console.error(`  SKIP ${spec.slug} — could not locate the content region`);
    continue;
  }
  // Keep the wrapper divs the template closes after the footer marker by
  // rebuilding the same nesting the shell expects.
  const block =
    `<div id="wsite-content" class="wsite-elements wsite-not-footer">\n` +
    `\t<div class="wsite-section-wrap">\n` +
    `\t<div class="wsite-section wsite-body-section wsite-section-bg-color" ` +
    `style="height: auto;background-color: #ffffff;background-image: none;">\n` +
    `\t\t<div class="wsite-section-content">\n` +
    `\t\t\t<div class="container">\n` +
    `\t\t\t\t<div class="wsite-section-elements">\n` +
    spec.body.trim() + "\n" +
    `\t\t\t\t</div>\n\t\t\t</div>\n\t\t</div>\n\t</div>\n</div>\n</div>\n\n    </div>\n\n    `;

  html = html.slice(0, start) + block + html.slice(end);

  const outPath = path.join(REPO, spec.slug);
  console.log(`  ${spec.slug}`);
  console.log(`      ${spec.title}`);
  if (WRITE) fs.writeFileSync(outPath, html);
  built++;
}

console.log(`\npages built: ${built}`);
if (!WRITE) console.log("DRY RUN — nothing written. Re-run with --write.");
else console.log("Now run: node _tools/add-jsonld.js --write && node _tools/sitemap-lastmod.js --write");
