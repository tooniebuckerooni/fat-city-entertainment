// Build the Music Bingo Song List Library — a hub plus one page per game pack.
//
//   node build-song-library.js          report only
//   node build-song-library.js --write  apply
//
// WHY THIS EXISTS
// ---------------
// The Aug 2026 Search Console data showed the site ranks for song-list queries
// by accident and captures none of them. An orphaned answer-sheet PDF — linked
// from nothing but 404.html — earned 91 clicks a quarter at position 1, more
// than every product page on the site combined, while the page selling that
// same game earned 0 clicks at position 23. A PDF has no snippet, no
// navigation and no buy button, so all of that demand dead-ends.
//
// This does it on purpose, fifty times, with a buy button on every page.
// Targets the long tail a DR-8 site can actually win: "what songs are in
// <pack> music bingo", "<theme> music bingo song list", "<decade> bingo
// playlist".
//
// WHAT IS AND ISN'T PUBLISHED
// ---------------------------
// Full song lists, by the owner's explicit decision: "I don't care if ALL the
// callsheets go out before the product… they are not a huge driving point,
// just an extra some people want with their bingo cards."
//
// Song title and artist only. The puzzle-answer columns — Anagram, Antonym
// Clue, Acronym, Nickname, Soundalike Pair, Country — are stripped in
// _content/song-lists.json and never reach a page. Those columns ARE the game
// for the packs that use them; the song list satisfies the search, the clue
// stays with the product. Packs with no Artist column (TV Themes, Video Games)
// use their identifying column instead, since a song title alone would be
// meaningless there.
//
// The paid pack remains: 250 randomized cards, the print-ready callsheet in
// play order, and the ready-made playlists.
//
// Every URL ends in a trailing slash — see "URL shape" in CLAUDE.md.
// Re-running rebuilds every page from the JSON, so edit the data and re-run
// rather than hand-editing generated HTML.

const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const WRITE = process.argv.includes("--write");
const SITE = "https://www.fatcityentertainment.com";
const ROOT = "music-bingo-song-lists";
const TEMPLATE = "printmusicbingocards.html";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
  .replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const data = JSON.parse(fs.readFileSync(path.join(REPO, "_content/song-lists.json"), "utf8"));
const packs = Object.values(data).sort((a, b) => a.pack.localeCompare(b.pack));

// Read a product page's charged price for the buy CTA. Cached: 50 leaf pages
// point at ~50 products and several share a bundle.
const priceCache = new Map();
function priceOf(url) {
  if (!url) return null;
  if (priceCache.has(url)) return priceCache.get(url);
  let out = null;
  const file = path.join(REPO, url.replace(/^\//, ""));
  if (fs.existsSync(file)) {
    const m = fs.readFileSync(file, "utf8").match(/itemprop="price"\s+content="([0-9.]+)"/);
    if (m) out = "$" + Number(m[1]).toFixed(2);
  }
  priceCache.set(url, out);
  return out;
}

const CONTENT_OPEN = '<div id="wsite-content"';
const FOOTER_OPEN = '<div class="footer-wrap"';
const shell = fs.readFileSync(path.join(REPO, TEMPLATE), "utf8");

// Every replacement below uses a FUNCTION replacer. A plain string passed to
// String.replace() has "$1" read back as a capture-group backreference, and
// these pages are full of prices like $10.99 — the exact bug documented in
// new-content-page.js and HANDOFF.md.
// No " - Fat City Entertainment" suffix on these titles, unlike the rest of the
// site. It costs 25 of the ~60 characters Google actually shows, and it buys
// nothing on a page whose entire audience arrives from "<theme> music bingo song
// list" — a query where the brand is not what anyone is scanning the results
// for. The audit already flagged ~100 over-length titles sitewide; there is no
// sense adding fifty more on the way past.
function build(slugPath, title, description, body) {
  const url = `${SITE}/${slugPath}/`;
  let html = shell;
  html = html.replace(/<title>[\s\S]*?<\/title>/i,
    () => `<title>${esc(title)}</title>`);
  html = html.replace(/<meta[^>]+name="description"[^>]*>/i,
    () => `<meta name="description" content="${esc(description)}">`);
  html = html.replace(/<link rel="canonical" href="[^"]*"/i,
    () => `<link rel="canonical" href="${url}"`);
  for (const p of ["og:title", "og:description", "og:url", "og:type"]) {
    html = html.replace(new RegExp(`<meta property="${p}"[^>]*>\\s*`, "gi"), "");
  }
  html = html.replace(/(<link rel="canonical"[^>]*>)/i, (m, c) =>
    `${c}\n<meta property="og:title" content="${esc(title)}">` +
    `\n<meta property="og:description" content="${esc(description)}">` +
    `\n<meta property="og:url" content="${url}">` +
    `\n<meta property="og:type" content="website">`);
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

// ---- leaf pages ---------------------------------------------------------
function leafBody(p, related) {
  const secondLabel = p.second_col === "Artist" ? "Artist" : (p.second_col || "");
  const rows = p.tracks.map((t, i) =>
    `<tr><td class="fce-sl-n">${i + 1}</td><td class="fce-sl-song">${esc(t.song)}</td>` +
    (secondLabel ? `<td class="fce-sl-by">${esc(t.by || "")}</td>` : "") + `</tr>`
  ).join("\n");

  const playlists = [];
  if (p.spotify) playlists.push(`<a href="${esc(p.spotify)}" target="_blank" rel="noopener">Spotify playlist</a>`);
  if (p.apple) playlists.push(`<a href="${esc(p.apple)}" target="_blank" rel="noopener">Apple Music playlist</a>`);

  // The price comes off the destination product page, the same source
  // add-cross-sell.js and add-price-ladder.js read. The JSON's own `price` field
  // is null for all 50 packs, which is how every one of these CTAs shipped
  // reading "Get The 80s — view price": a button that asks you to go and find
  // out. Re-run this tool after a repricing, like the other two.
  const priced = priceOf(p.url);
  // Product titles carry the store's SEO tail ("... - Download And Print Music
  // Bingo Cards"), which is right on a product page and far too long inside a
  // button. Keep the part that names the pack.
  const bundleName = String(p.product_title || "bundle")
    .split(/\s+[-–—]\s+Download\b/i)[0].trim() || "bundle";
  const buyLabel = p.via === "bundle"
    ? `Get it in the ${esc(bundleName)}${priced ? ` — ${priced}` : ""}`
    : `Get ${esc(p.pack)}${priced ? ` — ${priced}` : ""}`;
  const buyNote = p.via === "bundle"
    ? `<div class="paragraph">${esc(p.pack)} is sold as part of a multi-game pack rather than on its own.</div>`
    : "";

  return `<h1 class="wsite-content-title">${esc(p.pack)} Music Bingo — Full Song List</h1>

<div class="paragraph">Every one of the <strong>${p.total} songs</strong> in the ${esc(p.pack)} music bingo game, in play order. Free to read, copy, or use to plan your own night.</div>

${playlists.length ? `<div class="paragraph">Prefer to just press play? ${playlists.join(" · ")}</div>` : ""}

<div class="fce-songlist">
<table>
<thead><tr><th class="fce-sl-n">#</th><th>Song</th>${secondLabel ? `<th>${esc(secondLabel)}</th>` : ""}</tr></thead>
<tbody>
${rows}
</tbody>
</table>
</div>

<h2 class="wsite-content-title">Want to actually run this game?</h2>
<div class="paragraph">The song list is the easy part. The game pack is what saves you the evening:</div>
<div class="paragraph"><ul>
<li><strong>250 randomized bingo cards</strong> — every card different, so a full room can play at once without two people sharing a winning line. Prints landscape on ordinary letter paper.</li>
<li><strong>The printable callsheet</strong> — all ${p.total} answers in play order, so you can confirm a bingo in seconds instead of scrolling this page at the host table.</li>
<li><strong>The playlists, already sequenced</strong> — Spotify and Apple Music, ready to press play.</li>
</ul></div>
${buyNote}
<div style="height: 12px; overflow: hidden;"></div>
<div class="paragraph"><a class="fce-cta" href="${esc(p.url)}">${buyLabel}</a> <a class="fce-cta-secondary" href="/${ROOT}/">Browse all song lists</a></div>

${capture()}
<div style="height: 24px; overflow: hidden;"></div>
<h2 class="wsite-content-title">More song lists</h2>
<div class="paragraph"><ul>
${related.map(r => `<li><a href="/${ROOT}/${r.slug}/">${esc(r.pack)}</a> — ${r.total} songs</li>`).join("\n")}
</ul></div>`;
}

// ---- email capture ------------------------------------------------------
// The site has no email capture anywhere — audited 28 Aug 2026, zero forms on
// 458 pages. The Sender list of ~2,000 is therefore not growing, and
// HOLIDAY-PLAN.md calls that list the single biggest lever between now and
// Christmas. Fifty pages of people who arrived wanting music bingo song lists
// is precisely the audience to be adding to it.
//
// Placed AFTER the buy CTA on purpose: someone who scrolled past the button
// without buying is exactly who is worth capturing, and putting a form above
// the button would cost sales to gain addresses.
//
// Refuses to render until the form ID is real, the same idiom publish-post.js
// and greenroom seed.js use for owner placeholders. A broken embed on 51 pages
// is worse than no embed, so a placeholder simply omits the block and the run
// prints a reminder.
const SENDER_FORM_ID = "[OWNER: Sender > Forms > (form) > Embed — paste the form ID here]";
const captureReady = () => /^[A-Za-z0-9_-]{4,}$/.test(SENDER_FORM_ID);

function capture() {
  if (!captureReady()) return "";
  return `
<div style="height: 28px; overflow: hidden;"></div>
<div class="fce-capture">
  <h2>Want the printable version?</h2>
  <p>We'll email you this list as a clean one-page PDF you can take to the host
  table — plus the new song lists as we publish them. No more than a couple of
  emails a month, and one click to stop.</p>
  <div class="sender-form-field" data-sender-form-id="${SENDER_FORM_ID}"></div>
</div>
<script>(function (s, e, n, d, er) { s['Sender'] = er;
  s[er] = s[er] || function () { (s[er].q = s[er].q || []).push(arguments) };
  var f = e.createElement(n), z = e.getElementsByTagName(n)[0];
  f.async = 1; f.src = d; z.parentNode.insertBefore(f, z);
})(window, document, 'script', 'https://cdn.sender.net/accounts_resources/universal.js', 'sender');</script>`;
}

// ---- hub ----------------------------------------------------------------
function hubBody() {
  const items = packs.map(p =>
    `<li><a href="/${ROOT}/${p.slug}/">${esc(p.pack)}</a> — ${p.total} songs</li>`).join("\n");
  const totalTracks = packs.reduce((n, p) => n + p.total, 0);
  return `<h1 class="wsite-content-title">Music Bingo Song Lists</h1>

<div class="paragraph">The complete song list for every music bingo game we make — <strong>${packs.length} games, ${totalTracks} songs</strong>, free to read. Use them to plan a night, check a theme before you buy, or just settle an argument about which decade had the better hooks.</div>

<div class="paragraph">Each list is the real playing order. If you want to run the game rather than build it yourself, every pack comes with 250 randomized cards, a printable callsheet and ready-made Spotify and Apple Music playlists.</div>

<div class="paragraph"><ul>
${items}
</ul></div>

<div style="height: 20px; overflow: hidden;"></div>
<div class="paragraph"><a class="fce-cta" href="/store/c11/musicdoboff/">Browse the game packs</a> <a class="fce-cta-secondary" href="/what-is-music-bingo.html">New to music bingo?</a></div>`;
}

// ---- write --------------------------------------------------------------
let written = 0;
const outputs = [];

outputs.push({
  dir: ROOT,
  html: build(ROOT, "Free Music Bingo Song Lists — All 50 Games",
    `The full song list for all ${packs.length} Fat City music bingo games — ${packs.reduce((n,p)=>n+p.total,0)} songs in total, free to read. Plan a night or check a theme before you buy.`,
    hubBody()),
});

packs.forEach((p, i) => {
  const related = [packs[(i + 1) % packs.length], packs[(i + 2) % packs.length],
                   packs[(i + 3) % packs.length]].filter(r => r.slug !== p.slug);
  outputs.push({
    dir: `${ROOT}/${p.slug}`,
    html: build(`${ROOT}/${p.slug}`,
      `${p.pack} Music Bingo Song List — All ${p.total} Songs`,
      `The complete ${p.total}-song list for ${p.pack} music bingo, in play order. Free to read, with Spotify and Apple Music playlists.`,
      leafBody(p, related)),
  });
});

// Counted as CHANGED, not as "would write". This tool regenerates every page
// unconditionally, so a plain count always reads as 51 pending writes — which
// makes it useless to the weekly health check in .github/workflows, where the
// whole signal is "did anything drift". Compare against what is on disk.
let changed = 0;
for (const o of outputs) {
  const dir = path.join(REPO, o.dir);
  const file = path.join(dir, "index.html");
  // Compare on this tool's own terms. add-jsonld.js runs AFTER this one by
  // design (the build regenerates from the template shell, which drops the
  // block), so the file on disk always carries a fce:jsonld block that the
  // freshly generated HTML does not. Strip it from both sides or every run
  // reports 51 changes forever and the health check learns nothing.
  const stripJsonLd = (h) =>
    h === null ? null : h.replace(/<!-- fce:jsonld -->[\s\S]*?<!-- \/fce:jsonld -->\n?/i, "");
  const current = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
  // Remember it per-page, not just as a total: the sitemap block below needs to
  // know WHICH pages moved so it can leave the others' lastmod alone.
  o.changed = stripJsonLd(current) !== stripJsonLd(o.html);
  if (o.changed) changed++;
  if (WRITE) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file, o.html);
  }
  written++;
}

// ---- sitemap ------------------------------------------------------------
// Sitemap entries for generated pages are normally hand-added (see CLAUDE.md),
// which is a fine rule for one post at a time and a bad one for fifty pages that
// get rebuilt from JSON. So this block is managed: marked, replaced wholesale on
// re-run, and left alone by every other tool. sitemap-lastmod.js only refreshes
// dates on URLs already present, so it stays correct either way.
const SM_START = "  <!-- fce:song-lists -->";
const SM_END = "  <!-- /fce:song-lists -->";
const smFile = path.join(REPO, "sitemap.xml");
const today = new Date().toISOString().slice(0, 10);
let sitemap = fs.readFileSync(smFile, "utf8");

// Carry forward the lastmod already in the sitemap for any page whose content
// did NOT change on this run. Stamping `today` on all 51 unconditionally meant
// a re-run that altered one page told Google fifty others were freshly edited —
// the same false-freshness signal CLAUDE.md warns about for blog dateModified,
// and a costly one to send while the library is still being indexed. A page
// that genuinely changed still gets today's date.
const priorLastmod = new Map(
  [...fs.readFileSync(smFile, "utf8").matchAll(
    /<loc>([^<]*)<\/loc>\s*<lastmod>([0-9]{4}-[0-9]{2}-[0-9]{2})<\/lastmod>/g
  )].map((m) => [m[1], m[2]])
);

const smBlock = [SM_START]
  .concat(outputs.map((o) => {
    const loc = `${SITE}/${o.dir}/`;
    const when = o.changed ? today : (priorLastmod.get(loc) || today);
    return `  <url><loc>${loc}</loc><lastmod>${when}</lastmod></url>`;
  }))
  .concat([SM_END]).join("\n");

const s = sitemap.indexOf(SM_START);
let smAction;
if (s !== -1) {
  const e = sitemap.indexOf(SM_END, s);
  const replaced = sitemap.slice(0, s) + smBlock + sitemap.slice(e + SM_END.length);
  smAction = replaced === sitemap ? "unchanged" : "updated";
  sitemap = replaced;
} else {
  sitemap = sitemap.replace("</urlset>", () => `${smBlock}\n</urlset>`);
  smAction = "added";
}
if (WRITE && smAction !== "unchanged") fs.writeFileSync(smFile, sitemap);

console.log(`${WRITE ? "wrote" : "checked"} ${written} page(s) under /${ROOT}/  (${changed} would change)`);
console.log(`  hub + ${packs.length} game pages, ${packs.reduce((n,p)=>n+p.total,0)} songs published`);
console.log(`  sitemap block ${smAction} (${outputs.length} <url> entries)`);
if (!captureReady()) {
  console.log("  EMAIL CAPTURE OFF — SENDER_FORM_ID is still the owner placeholder.");
  console.log("    The block is written and styled; paste the real form ID at the top of");
  console.log("    this file and re-run to put it on all 51 pages. Until then it is omitted");
  console.log("    rather than shipped broken.");
}
if (!WRITE) console.log("\n(dry run -- pass --write to apply)");
else console.log("\nNow run: add-jsonld.js --write, canonicalize-trailing-slash.js --write, check-links.js");
