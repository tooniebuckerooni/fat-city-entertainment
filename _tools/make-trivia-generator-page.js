// One-off: build /trivia-generator.html as a "coming soon" page on the site's
// existing shell, cloned from a live page so it inherits the real nav, footer,
// fonts and theme. Same content-region swap new-content-page.js uses, but
// standalone so it doesn't rebuild the other content-page specs.
//
//   node _tools/make-trivia-generator-page.js            # dry run
//   node _tools/make-trivia-generator-page.js --write
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const WRITE = process.argv.includes("--write");
const SITE = "https://www.fatcityentertainment.com";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
  .replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const slug = "trivia-generator.html";
const template = "contact.html";
const title = "Trivia Generator";
const description = "The Fat City Trivia Generator is coming soon — a fast way to build custom trivia rounds for your own events. Play Triv 101 now, or get notified when it launches.";
const url = `${SITE}/${slug}`;

const body = `
<h1 class="wsite-content-title">Trivia Generator</h1>
<div class="paragraph"><strong>Coming soon.</strong> We're building a Trivia Generator — a fast, no-fuss way to spin up custom trivia rounds for your bar night, party, or live show. It'll sit right alongside Triv 101 and the Bingo Card Generator as part of the Fat City game-tools lineup.</div>
<div class="paragraph">Want in early? <a href="/contact.html">Drop us a line</a> and we'll let you know the moment it's ready.</div>
<div style="height: 24px; overflow: hidden;"></div>
<div class="paragraph"><a class="fce-cta" href="/triv101/">Play Triv 101 now</a> <a class="fce-cta-secondary" href="https://bingocardgenerator.online/">Bingo Card Generator</a></div>
<div style="height: 16px; overflow: hidden;"></div>
<div class="paragraph">In the meantime, <a href="/trivia-store.html">browse the Trivia Store</a> for ready-to-host game packs.</div>
`.trim();

const CONTENT_OPEN = '<div id="wsite-content"';
const FOOTER_OPEN = '<div class="footer-wrap"';

let html = fs.readFileSync(path.join(REPO, template), "utf8");

html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${esc(title)} - Fat City Entertainment</title>`);
html = html.replace(/<meta[^>]+name="description"[^>]*>/i, `<meta name="description" content="${esc(description)}">`);
html = html.replace(/<link rel="canonical" href="[^"]*"/i, `<link rel="canonical" href="${url}"`);

const og =
  `<meta property="og:title" content="${esc(title)}">\n` +
  `<meta property="og:description" content="${esc(description)}">\n` +
  `<meta property="og:url" content="${url}">\n` +
  `<meta property="og:type" content="website">`;
html = html.replace(/<meta property="og:title"[^>]*>\s*/gi, "");
html = html.replace(/<meta property="og:description"[^>]*>\s*/gi, "");
html = html.replace(/<meta property="og:url"[^>]*>\s*/gi, "");
html = html.replace(/<meta property="og:type"[^>]*>\s*/gi, "");
html = html.replace(/(<link rel="canonical"[^>]*>)/i, `$1\n${og}`);
html = html.replace(/<!-- fce:jsonld -->[\s\S]*?<!-- \/fce:jsonld -->\n?/i, "");

const start = html.indexOf(CONTENT_OPEN);
const end = html.indexOf(FOOTER_OPEN);
if (start === -1 || end === -1) { console.error("Could not locate content region in template"); process.exit(1); }

const block =
  `<div id="wsite-content" class="wsite-elements wsite-not-footer">\n` +
  `\t<div class="wsite-section-wrap">\n` +
  `\t<div class="wsite-section wsite-body-section wsite-section-bg-color" ` +
  `style="height: auto;background-color: #ffffff;background-image: none;">\n` +
  `\t\t<div class="wsite-section-content">\n` +
  `\t\t\t<div class="container">\n` +
  `\t\t\t\t<div class="wsite-section-elements">\n` +
  body + "\n" +
  `\t\t\t\t</div>\n\t\t\t</div>\n\t\t</div>\n\t</div>\n</div>\n</div>\n\n    </div>\n\n    `;

html = html.slice(0, start) + block + html.slice(end);

console.log(`Building ${slug} from ${template} (${title})`);
if (WRITE) { fs.writeFileSync(path.join(REPO, slug), html); console.log("WROTE " + slug); }
else console.log("DRY RUN — re-run with --write.");
