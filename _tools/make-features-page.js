// One-off: build /features.html — a hub introducing the interactive tools
// (Triv 101, Trivia Generator, Bingo Card Generator). Cloned from a live page
// so it inherits the site nav, footer, fonts and theme.
//
//   node _tools/make-features-page.js            # dry run
//   node _tools/make-features-page.js --write
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const WRITE = process.argv.includes("--write");
const SITE = "https://www.fatcityentertainment.com";
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
  .replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const slug = "features.html";
const template = "contact.html";
const title = "Features: Games & Interactive Tools";
const description = "Play Triv 101, the survey-style countdown game show, generate custom trivia with the AI Trivia Generator, and print bingo cards free with the Bingo Card Generator.";
const url = `${SITE}/${slug}`;

const body = `
<h1 class="wsite-content-title">Features</h1>
<div class="paragraph">Free, interactive game tools from Fat City Entertainment — play them in your browser, use them at your next event.</div>

<h2 class="wsite-content-title">Triv 101</h2>
<div class="paragraph">Our survey-style trivia game show meets a darts countdown. Every team starts at 101 — guess the most popular survey answers, press your luck for bonus points, and race down to exactly zero. Play it on a bar TV, a stream, or your living-room screen. And the question bank grows from real player surveys.</div>
<div class="paragraph"><a class="fce-cta" href="/triv101/">Play Triv 101</a></div>
<div style="height: 20px; overflow: hidden;"></div>

<h2 class="wsite-content-title">Trivia Generator</h2>
<div class="paragraph"><strong>Coming soon.</strong> An AI-powered way to spin up custom trivia rounds in seconds — pick a theme, get a ready-to-host set of questions and answers.</div>
<div class="paragraph"><a class="fce-cta-secondary" href="/trivia-generator.html">See what's coming</a></div>
<div style="height: 20px; overflow: hidden;"></div>

<h2 class="wsite-content-title">Bingo Card Generator</h2>
<div class="paragraph">Generate and print randomized bingo cards free, for any occasion — no signup, no software.</div>
<div class="paragraph"><a class="fce-cta-secondary" href="https://bingocardgenerator.online/">Open the Bingo Card Generator</a></div>
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
// NB: replacer FUNCTION, not a replacement string. A string replacement
// re-reads "$1", "$&" etc. inside the text being inserted, so any
// description or title containing a dollar amount is silently mangled --
// "$13.98" became "</title>3.98" in a live twitter:description tag.
html = html.replace(/(<link rel="canonical"[^>]*>)/i, (m, c) => `${c}\n${og}`);
html = html.replace(/<!-- fce:jsonld -->[\s\S]*?<!-- \/fce:jsonld -->\n?/i, "");

const start = html.indexOf(CONTENT_OPEN);
const end = html.indexOf(FOOTER_OPEN);
if (start === -1 || end === -1) { console.error("Could not locate content region"); process.exit(1); }
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

console.log(`Building ${slug} from ${template}`);
if (WRITE) { fs.writeFileSync(path.join(REPO, slug), html); console.log("WROTE " + slug); }
else console.log("DRY RUN — re-run with --write.");
