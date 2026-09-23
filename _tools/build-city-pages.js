// Build the city pages under /trivia-nights/ and their hub. Idempotent.
//
//   node _tools/build-city-pages.js            report only
//   node _tools/build-city-pages.js --write    apply
//
// Sources:
//   _content/city-pages.json            the city list and each city's status
//   _content/city-pages/<slug>.json     that city's copy and look
//   _content/city-rounds/<slug>.json    its local round (placed by add-city-rounds.js)
//
// Outputs:
//   trivia-nights/index.html            the hub
//   trivia-nights/<slug>/index.html     one page per city with a content file
//   sitemap.xml                         a managed <!-- fce:city-pages --> block
//   musicbingonearme.html               its "Looking locally?" line, once the hub is live
//
// ONE SWITCH FOR EVERYTHING
// ------------------------
// A city is indexable only when its status in city-pages.json is "live", and
// "live" is also what makes add-city-rounds.js place and publish its round. So
// a page, its round, its sitemap entry, its hub listing and its sibling links
// all go up together, and all come down together. A draft page is built (so it
// can be previewed) but carries noindex,follow, is in no sitemap and is linked
// from nothing. The hub is indexable once any city is live.
//
// Calgary and Charlotte keep their own pages (yycevents.html and
// charlotte-events.html); they are listed on the hub and as siblings, but this
// tool never writes them.
//
// Blocks other tools own are CARRIED FORWARD from the page on disk rather than
// dropped: fce:jsonld (add-jsonld.js) and fce:city-round (add-city-rounds.js).
// Regenerating a page therefore never silently loses its round, and a dry run
// compares like with like, so the Monday loop reads 0 when nothing drifted.
//
// Order after an edit: this, then add-city-rounds.js --write, then
// add-jsonld.js --write, then check-links.js.

const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const WRITE = process.argv.includes("--write");
const SITE = "https://www.fatcityentertainment.com";
const ROOT = "trivia-nights";
const TEMPLATE = "printmusicbingocards.html";
const CONTENT_OPEN = '<div id="wsite-content"';
const FOOTER_OPEN = '<div class="footer-wrap"';
const ROUND_SLOT = "<!-- fce:city-round-slot -->";
const TRIVIA_SHOWS = "/store/c6/triviagameshows/";

const esc = s => String(s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// The market decides the document language, which is what a crawler reads to
// decide which country's results a page belongs in.
const LOCALE = { US: "en-US", CA: "en-CA", GB: "en-GB", IE: "en-IE", AU: "en-AU", NZ: "en-NZ" };
const OG_LOCALE = { US: "en_US", CA: "en_CA", GB: "en_GB", IE: "en_IE", AU: "en_AU", NZ: "en_NZ" };
const COUNTRY = {
  US: "United States", CA: "Canada", GB: "United Kingdom", IE: "Ireland", AU: "Australia", NZ: "New Zealand",
};

// Every visitor-facing string the tool itself contributes. The French page is
// the test of whether a second language is worth doing, so it has to be French
// all the way down, not French copy inside English furniture.
const T = {
  en: {
    eyebrow: "Trivia nights by city",
    more: "More cities",
    all: "All cities",
  },
  fr: {
    eyebrow: "Soirées quiz par ville",
    more: "Autres villes",
    all: "Toutes les villes",
  },
};

const HEX = /^#[0-9a-f]{6}$/i;
const lum = hex => {
  const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

const list = JSON.parse(fs.readFileSync(path.join(REPO, "_content", "city-pages.json"), "utf8")).cities;
const shell = fs.readFileSync(path.join(REPO, TEMPLATE), "utf8");
const problems = [];
const changes = [];

const hrefOf = c => (c.page && !c.page.startsWith(ROOT + "/") ? `/${c.page}` : `/${ROOT}/${c.slug}/`);
const isLive = c => c.status === "live";
const generated = list.filter(c => c.status !== "planned" && c.page === `${ROOT}/${c.slug}/index.html`);
const liveAll = list.filter(isLive);
const hubLive = liveAll.length > 0;

function shellPage({ url, title, description, lang, ogLocale, indexable, body }) {
  let html = shell;
  html = html.replace(/<html lang="[^"]*"/i, () => `<html lang="${lang}"`);
  html = html.replace(/<title>[\s\S]*?<\/title>/i, () => `<title>${esc(title)}</title>`);
  html = html.replace(/<meta[^>]+name="description"[^>]*>/i, () => `<meta name="description" content="${esc(description)}">`);
  html = html.replace(/<link rel="canonical" href="[^"]*"/i, () => `<link rel="canonical" href="${url}"`);
  for (const p of ["og:title", "og:description", "og:url", "og:type", "og:locale"]) {
    html = html.replace(new RegExp(`<meta property="${p}"[^>]*>\\s*`, "gi"), "");
  }
  html = html.replace(/<meta name="robots"[^>]*>\s*/gi, "");
  html = html.replace(/(<link rel="canonical"[^>]*>)/i, (m, c) =>
    `${c}\n<meta property="og:title" content="${esc(title)}">` +
    `\n<meta property="og:description" content="${esc(description)}">` +
    `\n<meta property="og:url" content="${url}">` +
    `\n<meta property="og:type" content="website">` +
    `\n<meta property="og:locale" content="${ogLocale}">` +
    (indexable ? "" : `\n<meta name="robots" content="noindex,follow">`));
  html = html.replace(/<meta name="twitter:title" content="[^"]*"/i, () => `<meta name="twitter:title" content="${esc(title)}"`);
  html = html.replace(/<meta name="twitter:description" content="[^"]*"/i, () => `<meta name="twitter:description" content="${esc(description)}"`);
  html = html.replace(/<!-- fce:jsonld -->[\s\S]*?<!-- \/fce:jsonld -->\n?/i, "");
  const start = html.indexOf(CONTENT_OPEN);
  const end = html.indexOf(FOOTER_OPEN);
  if (start === -1 || end === -1) throw new Error(`no content region in ${TEMPLATE}`);
  const block =
    `<div id="wsite-content" class="wsite-elements wsite-not-footer">\n` +
    `\t<div class="wsite-section-wrap">\n` +
    `\t<div class="wsite-section wsite-body-section wsite-section-bg-color" ` +
    `style="height: auto;background-color: #ffffff;background-image: none;">\n` +
    `\t\t<div class="wsite-section-content">\n\t\t\t<div class="container">\n` +
    `\t\t\t\t<div class="wsite-section-elements">\n` + body.trim() + "\n" +
    `\t\t\t\t</div>\n\t\t\t</div>\n\t\t</div>\n\t</div>\n</div>\n</div>\n\n    </div>\n\n    `;
  return html.slice(0, start) + block + html.slice(end);
}

// Carry forward what other tools placed on the page last time.
// Structured data is carried only onto an indexable page: add-jsonld.js skips a
// noindex page without stripping it, so a city taken back to draft would
// otherwise keep describing itself to crawlers it has asked to stay away.
function carry(fresh, onDisk) {
  if (!onDisk) return fresh;
  let out = fresh;
  const jl = onDisk.match(/<!-- fce:jsonld -->[\s\S]*?<!-- \/fce:jsonld -->/);
  if (jl && !/name="robots" content="noindex/.test(fresh)) out = out.replace(/<\/head>/i, () => `${jl[0]}\n</head>`);
  const rd = onDisk.match(/<!-- fce:city-round -->[\s\S]*?<!-- \/fce:city-round -->\n/);
  if (rd && out.includes(ROUND_SLOT)) out = out.replace(ROUND_SLOT, () => rd[0] + ROUND_SLOT);
  return out;
}

function stage(rel, html) {
  const file = path.join(REPO, rel);
  const onDisk = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
  const next = carry(html, onDisk);
  if (next !== onDisk) changes.push([file, next, onDisk === null ? "create" : "update"]);
  return next;
}

// Sibling links: other live cities, same country first, then list order.
function siblings(city) {
  const pool = liveAll.filter(c => c.slug !== city.slug);
  pool.sort((a, b) => (b.country === city.country) - (a.country === city.country));
  return pool.slice(0, 4);
}

const pageWords = {};

for (const city of generated) {
  const src = path.join(REPO, "_content", "city-pages", `${city.slug}.json`);
  if (!fs.existsSync(src)) { problems.push(`${city.slug}: no _content/city-pages/${city.slug}.json`); continue; }
  const c = JSON.parse(fs.readFileSync(src, "utf8"));
  const L = city.lang === "fr" ? "fr" : "en";
  const t = T[L];
  const look = c.look || {};
  if (![look.accent, look.paper, look.ink].every(h => HEX.test(h || ""))) { problems.push(`${city.slug}: look needs accent, paper, ink as #rrggbb`); continue; }
  if (contrast(look.ink, look.paper) < 7) { problems.push(`${city.slug}: ink on paper is ${contrast(look.ink, look.paper).toFixed(1)}:1, needs 7:1`); continue; }
  for (const k of ["title", "description", "h1", "kicker"]) if (!c[k]) problems.push(`${city.slug}: missing ${k}`);
  if (!Array.isArray(c.poem) || c.poem.length < 2) problems.push(`${city.slug}: poem needs 2+ paragraphs`);

  const url = `${SITE}/${ROOT}/${city.slug}/`;
  const sibs = siblings(city);
  const sections = (c.sections || []).map(s =>
    `<h2 class="wsite-content-title">${esc(s.h2)}</h2>\n` + s.paras.map(p => `<div class="paragraph">${esc(p)}</div>`).join("\n")
  ).join("\n\n");
  const more = isLive(city) && sibs.length
    ? `<nav class="fce-city-more" aria-label="${esc(t.more)}"><span>${esc(t.more)}:</span> ` +
      sibs.map(s => `<a href="${hrefOf(s)}">${esc(s.name)}</a>`).join(" · ") +
      ` · <a href="/${ROOT}/">${esc(t.all)}</a></nav>`
    : "";

  const body = `<div class="fce-city" style="--city-accent:${look.accent};--city-paper:${look.paper};--city-ink:${look.ink}">
<header class="fce-city-hero">
<span class="fce-city-motif" aria-hidden="true">${esc(look.motif || "")}</span>
<p class="fce-city-eyebrow">${isLive(city) ? `<a href="/${ROOT}/">${esc(t.eyebrow)}</a>` : esc(t.eyebrow)}</p>
<h1 class="wsite-content-title">${esc(c.h1)}</h1>
<p class="fce-city-kicker">${esc(c.kicker)}</p>
</header>
<div class="fce-city-poem">
${c.poem.map(p => `<p>${esc(p)}</p>`).join("\n")}
</div>
${sections}
${ROUND_SLOT}
${more}
</div>`;

  const visible = [c.title, c.description, c.h1, c.kicker, ...c.poem, ...(c.sections || []).flatMap(s => [s.h2, ...s.paras])].join(" ");
  if (/[–—]|&mdash;|&ndash;/.test(visible)) problems.push(`${city.slug}: em- or en-dash in visitor-facing copy`);
  pageWords[city.slug] = visible.split(/\s+/).filter(Boolean).length;

  stage(`${ROOT}/${city.slug}/index.html`, shellPage({
    url, title: c.title, description: c.description,
    lang: L === "fr" ? "fr-CA" : LOCALE[city.country] || "en",
    ogLocale: L === "fr" ? "fr_CA" : OG_LOCALE[city.country] || "en_US",
    indexable: isLive(city), body,
  }));
}

// ---- hub ----------------------------------------------------------------
{
  const order = ["US", "CA", "GB", "IE", "AU", "NZ"];
  const groups = order.map(cc => {
    const cs = liveAll.filter(c => c.country === cc);
    if (!cs.length) return "";
    return `<h2 class="wsite-content-title">${esc(COUNTRY[cc])}</h2>\n<ul class="fce-city-list">\n` +
      cs.map(c => `<li><a href="${hrefOf(c)}">${esc(c.name)}</a></li>`).join("\n") + `\n</ul>`;
  }).filter(Boolean).join("\n\n");

  const body = `<div class="fce-city fce-city-hub" style="--city-accent:#b0122b;--city-paper:#f7f4ee;--city-ink:#16161a">
<header class="fce-city-hero">
<span class="fce-city-motif" aria-hidden="true">?</span>
<p class="fce-city-eyebrow">Free local rounds</p>
<h1 class="wsite-content-title">Trivia and Quiz Nights by City</h1>
<p class="fce-city-kicker">Ten local questions for every city, free to play.</p>
</header>
<div class="paragraph">Every city runs its quiz a little differently. London calls it a pub quiz, Dublin a table quiz, Montréal a soirée quiz, and most of North America a trivia night. What they share is a room of people who came out on a weeknight to argue about the answers, and a host who kept them there.</div>
<div class="paragraph">Each page below carries a free round of ten questions about that city, written to be read aloud. Use it as it is, or load it into <a href="/trivia-show-maker/">Trivia Show Maker</a> with one click and build the rest of the night around it. The games on this site were all tested on live crowds, starting in Calgary in 1999.</div>
${groups || `<div class="paragraph">The first cities are on their way.</div>`}
<div class="paragraph fce-city-ctas"><a class="fce-cta" href="/trivia-show-maker/">Build a night in Trivia Show Maker</a> <a class="fce-cta-secondary" href="${TRIVIA_SHOWS}">Browse pre-made trivia shows</a></div>
</div>`;

  stage(`${ROOT}/index.html`, shellPage({
    url: `${SITE}/${ROOT}/`,
    title: "Trivia and Quiz Nights by City: Free Local Rounds",
    description: "Free 10-question local trivia rounds for cities across the US, Canada, the UK, Ireland, Australia and New Zealand. Read them aloud or load them into Trivia Show Maker.",
    lang: "en", ogLocale: "en_US", indexable: hubLive, body,
  }));
}

// ---- the one inbound link from an existing page --------------------------
// musicbingonearme.html already answers "is there anything near me?", so it is
// where the hub belongs. The original line is restored exactly while the hub is
// not live, which also keeps the swap reversible byte for byte.
{
  const file = path.join(REPO, "musicbingonearme.html");
  const ORIGINAL = `<div class="paragraph">Looking locally? We have pages for <a href="/yycevents.html">Calgary</a> and <a href="/charlotte-events.html">Charlotte, NC</a> — and every game downloads anywhere.</div>`;
  const LIVE = `<div class="paragraph"><!-- fce:city-hub-link -->Looking locally? We have pages for <a href="/yycevents.html">Calgary</a> and <a href="/charlotte-events.html">Charlotte, NC</a>, and <a href="/${ROOT}/">free local trivia rounds for cities around the world</a>. Every game downloads anywhere.<!-- /fce:city-hub-link --></div>`;
  const html = fs.readFileSync(file, "utf8");
  const want = hubLive ? LIVE : ORIGINAL;
  const have = html.includes(LIVE) ? LIVE : html.includes(ORIGINAL) ? ORIGINAL : null;
  if (!have) problems.push("musicbingonearme.html: its \"Looking locally?\" line has changed; update ORIGINAL here");
  else if (have !== want) changes.push([file, html.replace(have, () => want), hubLive ? "link the hub" : "unlink the hub"]);
}

// ---- sitemap ------------------------------------------------------------
{
  const file = path.join(REPO, "sitemap.xml");
  const START = "  <!-- fce:city-pages -->";
  const END = "  <!-- /fce:city-pages -->";
  const today = new Date().toISOString().slice(0, 10);
  const xml = fs.readFileSync(file, "utf8");
  const prior = new Map([...xml.matchAll(/<loc>([^<]*)<\/loc>\s*<lastmod>([0-9-]{10})<\/lastmod>/g)].map(m => [m[1], m[2]]));
  const changed = new Set(changes.map(c => c[0]));
  const locs = hubLive
    ? [[`${SITE}/${ROOT}/`, path.join(REPO, ROOT, "index.html")]]
        .concat(generated.filter(isLive).map(c => [`${SITE}/${ROOT}/${c.slug}/`, path.join(REPO, ROOT, c.slug, "index.html")]))
    : [];
  const block = locs.length
    ? [START, ...locs.map(([loc, f]) => `  <url><loc>${loc}</loc><lastmod>${changed.has(f) ? today : prior.get(loc) || today}</lastmod></url>`), END].join("\n")
    : "";
  const s = xml.indexOf(START);
  let next;
  if (s !== -1) {
    const e = xml.indexOf(END, s) + END.length;
    next = block ? xml.slice(0, s) + block + xml.slice(e) : xml.slice(0, s).replace(/\n$/, "") + xml.slice(e);
  } else {
    next = block ? xml.replace("</urlset>", () => `${block}\n</urlset>`) : xml;
  }
  if (next !== xml) changes.push([file, next, block ? "sitemap block" : "remove sitemap block"]);
}

for (const [file, body, what] of changes) {
  console.log(`  ${WRITE ? "wrote" : "would write"}  ${path.relative(REPO, file).padEnd(40)} ${what}`);
  if (!WRITE) continue;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, body);
}

for (const c of generated) {
  if (pageWords[c.slug]) console.log(`  ${c.slug.padEnd(12)} ${c.status.padEnd(6)} ${pageWords[c.slug]} words of copy${isLive(c) ? "" : "  (noindex until live)"}`);
}
console.log(`\n${WRITE ? "updated" : "would update"}: ${changes.length} file(s)`);
console.log(`  hub ${hubLive ? "indexable" : "noindex"}: ${liveAll.length} live cit${liveAll.length === 1 ? "y" : "ies"} of ${list.length}`);
for (const p of problems) console.log(`  PROBLEM: ${p}`);
if (!WRITE && changes.length) console.log("\n(dry run -- pass --write to apply)");
process.exitCode = problems.length ? 1 : 0;
