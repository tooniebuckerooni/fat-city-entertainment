// The Etsy launch kit: paste-ready listing copy, listing images, a START HERE
// guide per listing, and the shop banner and icon.
//
//   node _tools/build-etsy-kit.js              # dry run: validate, report
//   node _tools/build-etsy-kit.js --write      # write _content/etsy/LISTINGS.md
//   node _tools/build-etsy-kit.js --images     # also render _export/etsy/ (Chromium)
//   node _tools/build-etsy-kit.js --images --only p103,p144
//
// WHY (12 Oct 2026). The owner asked how close we could get them to being set up
// on Etsy. Everything Etsy asks for that is not an account, an ID or a bank
// detail can be prepared here, so it is: copy, tags, images, policies and the
// one file an Etsy buyer needs that a site buyer never did, START HERE. On the
// site, a game's Spotify and Apple Music playlists are linked on its product
// page. An Etsy buyer never sees that page, so without START HERE they get 250
// cards and no music.
//
// DATA: _content/etsy/listings.json. PRICES ARE NOT STORED THERE. Each listing
// reads its product page's own itemprop price at build time, so Etsy and the
// site quote one figure, the same discipline as add-cross-sell.js. Playlist
// links come from _content/song-lists.json (the library's own source), song
// titles for the preview image from the same file. Publishing song titles is
// already done free on the library pages; the puzzle-answer columns never reach
// this tool because they never reach that file.
//
// GUARDRAILS it enforces, because Etsy and CLAUDE.md both would:
//   - title 140 characters, exactly 13 tags of 20 or fewer, no duplicate tags;
//   - no em-dash in anything a buyer reads;
//   - no link or domain of ours in a listing (Etsy treats steering a buyer off
//     Etsy to buy as fee avoidance; the shop About page is the one place a
//     link is allowed, and that is typed by the owner, not here);
//   - no "spotify" or "apple" in a tag: descriptive use in the text is fine,
//     a trademark as a search tag is what gets listings flagged.
//
// Output under _export/ is gitignored (the export-ls-images.js idiom): these
// are copies of art already in the repo, regenerated on demand.
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const WRITE = process.argv.includes("--write");
const IMAGES = process.argv.includes("--images");
const onlyArg = process.argv.indexOf("--only");
const ONLY = onlyArg > -1 ? new Set(process.argv[onlyArg + 1].split(",")) : null;
const OUT = path.join(REPO, "_export/etsy");

const DATA = JSON.parse(fs.readFileSync(path.join(REPO, "_content/etsy/listings.json"), "utf8"));
const SONGS = JSON.parse(fs.readFileSync(path.join(REPO, "_content/song-lists.json"), "utf8"));
const problems = [];

function productPage(pid) {
  const dir = path.join(REPO, "store", pid);
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".html"))) {
    const html = fs.readFileSync(path.join(dir, f), "utf8");
    if (/itemprop="price"/.test(html)) return html;
  }
  return null;
}
function priceOf(pid) {
  const html = productPage(pid);
  const m = html && html.match(/itemprop="price" content="([\d.]+)"/);
  return m ? Number(m[1]).toFixed(2) : null;
}

// A playlist track title carries release cruft a card never shows.
function cleanSong(s) {
  return s
    .replace(/\s+-\s+.*$/, "")
    .replace(/\s*\((?:[^)]*(?:Remaster|Version|Stereo|Mono|Edit|Mix|Re-Recording|Live)[^)]*)\)/gi, "")
    .trim();
}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function description(L, price) {
  const S = DATA.shared;
  const how = L.kind === "trivia" ? S.how_trivia : L.kind === "gameshow" ? S.how_gameshow : S.how_bingo;
  const lines = [L.opener, "", "WHAT'S INCLUDED"];
  for (const i of L.includes) lines.push(`- ${i}`);
  if (L.rounds) lines.push("", "THE ROUNDS", L.rounds.join(", "));
  if (L.packs && L.packs.length > 1) {
    lines.push("", "THE GAMES");
    L.packs.forEach((p, n) => lines.push(`- ${(L.pack_labels || [])[n] || SONGS[p].pack}: ${SONGS[p].total} songs`));
  } else if (L.packs && L.kind === "bingo") {
    const t = SONGS[L.packs[0]].tracks.slice(0, 6).map((x) => cleanSong(x.song));
    lines.push("", "A FEW OF THE SONGS", `${t.join(", ")}, and ${SONGS[L.packs[0]].total - t.length} more.`);
  }
  if (L.needs) lines.push("", "YOU WILL NEED", L.needs);
  lines.push("", "HOW IT WORKS");
  how.forEach((h, n) => lines.push(`${n + 1}. ${h}`));
  lines.push("", "GOOD TO KNOW");
  for (const g of S.good_to_know) lines.push(`- ${g}`);
  lines.push("", "WHO WE ARE", S.about);
  return lines.join("\n");
}

function validate(L, desc) {
  const id = `${L.pid} ${L.slug}`;
  if (L.title.length > 140) problems.push(`${id}: title is ${L.title.length} characters (max 140)`);
  if (L.tags.length !== 13) problems.push(`${id}: ${L.tags.length} tags (use all 13)`);
  for (const t of L.tags) {
    if (t.length > 20) problems.push(`${id}: tag "${t}" is ${t.length} characters (max 20)`);
    if (/spotify|apple/i.test(t)) problems.push(`${id}: tag "${t}" uses a trademark`);
  }
  if (new Set(L.tags).size !== L.tags.length) problems.push(`${id}: duplicate tag`);
  const all = [L.title, desc, ...L.tags].join("\n");
  if (/[—]|&mdash;/.test(all)) problems.push(`${id}: em-dash in buyer-facing copy`);
  if (/fatcity|https?:\/\//i.test(desc + L.title)) problems.push(`${id}: a link or our domain in the listing`);
  for (const p of L.packs || []) if (!SONGS[p]) problems.push(`${id}: no song list called "${p}"`);
  if (!L.art) problems.push(`${id}: no art`);
  for (const f of [L.art, L.hero, L.sample].filter(Boolean))
    if (!fs.existsSync(path.join(REPO, f))) problems.push(`${id}: missing image ${f}`);
}

// ---------------------------------------------------------------- text
const S = DATA.shop;
const md = [
  "# Etsy listings, paste-ready",
  "",
  "Generated by `node _tools/build-etsy-kit.js --write` from `_content/etsy/listings.json`.",
  "**Edit the JSON and re-run, never this file.** Prices are read off each product page, so they match the site.",
  "",
];
const listings = DATA.listings.filter((L) => !ONLY || ONLY.has(L.pid));
for (const L of listings) {
  const price = priceOf(L.pid);
  if (!price) problems.push(`${L.pid}: no price on its product page`);
  const desc = description(L, price);
  validate(L, desc);
  L._price = price; L._desc = desc;
  md.push(`---`, ``, `## ${L.title.split(",")[0]} (${L.pid}, $${price})`, ``,
    `**Section:** ${L.section} · **Price:** $${price} USD · **Type:** Digital · **Images:** \`_export/etsy/${L.slug}/\``, ``,
    `**Title** (${L.title.length}/140)`, "```", L.title, "```", ``,
    `**Tags** (13, comma separated, paste into the tag box)`, "```", L.tags.join(", "), "```", ``,
    `**Description**`, "```", desc, "```", ``,
    `**Files to attach** (Etsy allows 5, 20MB each): \`START-HERE.pdf\` from the image folder, then the game files from the LemonSqueezy product.` +
      (L.perk_note ? `\n\n> ${L.perk_note}` : ""), ``);
}
md.push("---", "", "## Shop", "",
  `**Shop name options** (20 characters max, no spaces): ${S.name_options.map((n) => `\`${n}\` (${n.length})`).join(", ")}`, "",
  "**Shop title**", "```", S.title, "```", "",
  "**Announcement**", "```", S.announcement, "```", "",
  `**About: story headline**`, "```", S.about_story_headline, "```", "",
  "**About: story**", "```", S.about_story, "```", "",
  `**Sections:** ${S.sections.join(" · ")}`, "",
  "**Digital downloads policy**", "```", S.policies.digital_downloads, "```", "",
  "**Returns**", "```", S.policies.returns, "```", "",
  "**Exchanges**", "```", S.policies.exchanges, "```", "",
  "**FAQ** (Shop Manager > Settings > Info & Appearance > FAQs)", "");
for (const [q, a] of S.policies.faq) md.push(`- **${q}**`, "  ```", `  ${a}`, "  ```");
md.push("", "**Message to buyers** (Settings > Info & Appearance > Message to buyers for digital items)", "```", S.thank_you_message, "```", "",
  `> ${S.about_links_note}`, "");
const mdText = md.join("\n") + "\n";
for (const field of [S.title, S.announcement, S.about_story, S.thank_you_message, ...Object.values(S.policies).flat(2)])
  if (/[—]/.test(field)) problems.push(`shop copy has an em-dash: ${String(field).slice(0, 50)}...`);

const mdPath = path.join(REPO, "_content/etsy/LISTINGS.md");
const old = fs.existsSync(mdPath) ? fs.readFileSync(mdPath, "utf8") : "";
if (!ONLY) {
  if (mdText !== old) {
    console.log(`  ${WRITE ? "wrote" : "would update"}: _content/etsy/LISTINGS.md`);
    if (WRITE) fs.writeFileSync(mdPath, mdText);
  }
}
for (const L of listings) console.log(`  ${L.pid.padEnd(5)} $${String(L._price).padStart(6)}  ${L.title.length}/140  ${L.slug}`);

// ---------------------------------------------------------------- images
const FONTS = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;800;900&family=PT+Serif:ital,wght@0,700;1,400&display=swap">';
const BASE = `*{box-sizing:border-box;margin:0;padding:0}body{font-family:Montserrat,Arial,sans-serif;color:#1b1714}
.serif{font-family:"PT Serif",Georgia,serif}`;
const W = 2700, H = 2025; // 4:3, shortest side over Etsy's 2000px

function page(inner, css, w = W, h = H) {
  return `<!doctype html><html><head><meta charset="utf-8">${FONTS}<style>${BASE}
html,body{width:${w}px;height:${h}px;overflow:hidden}${css}</style></head><body>${inner}</body></html>`;
}
const img = (rel) => "file://" + path.join(REPO, rel);
const shortName = (L) => L.title.split(",")[0];

// The hero: the product's own art, blurred, as the backdrop (it is 300 to 900px
// wide, too small to show sharp at 2700), and in front the sharpest real thing
// we have: the sample cards for a bingo game, the show art for trivia. The big
// "-full" category images were tried first and are ONE generic photo of other
// games shared by every product: a Christmas listing showed Food Fight cards.
function front(L) { return L.hero || L.sample; }
function chips(L) {
  if (L.kind === "trivia") return ["Print and play", "Answers included", "No screen needed"];
  if (L.kind === "gameshow") return ["Big screen game show", "Music bingo included", "Instant download"];
  return ["Playlist included", "Instant download", "Print at home"];
}
function cardCount(L) {
  if (L.kind === "trivia") return L.pid === "p176" ? "5 nights · 250 questions" : "5 rounds · 50 questions";
  if (L.kind === "gameshow") return "3 games · 1 party";
  const n = (L.packs || []).length;
  return n > 1 ? `${n} games · ${(n * 250).toLocaleString("en-US")} cards` : "250 printable cards";
}

function imgHero(L) {
  return page(`<div class="bg" style="background-image:url('${img(L.art)}')"></div>
  <div class="wrap" style="--a:${L.accent}">
  <div class="txt"><div class="kick">Fat City Entertainment</div><h1 class="serif">${esc(shortName(L))}</h1>
  <div class="count">${cardCount(L)}</div><ul>${chips(L).map((c) => `<li>${c}</li>`).join("")}</ul></div>
  <div class="front"><img src="${img(front(L))}"></div></div>`,
  `.bg{position:absolute;inset:-80px;background-size:cover;background-position:center;filter:blur(36px) saturate(1.2)}
  .wrap{position:relative;display:flex;height:100%;padding:150px 120px;gap:80px;align-items:center;
    background:linear-gradient(90deg,color-mix(in srgb,var(--a) 92%,#000) 0%,color-mix(in srgb,var(--a) 80%,transparent) 45%,rgba(0,0,0,.15) 100%)}
  .txt{color:#fff;flex:0 0 840px}.kick{font-weight:800;letter-spacing:.18em;text-transform:uppercase;font-size:42px;opacity:.9}
  h1{font-size:136px;line-height:1;margin:40px 0 60px;text-shadow:0 6px 30px rgba(0,0,0,.35)}
  .count{font-weight:900;font-size:66px;background:#fff;color:var(--a);display:inline-block;padding:20px 40px;border-radius:18px}
  ul{list-style:none;margin-top:70px}li{font-weight:700;font-size:58px;margin:28px 0;padding-left:76px;position:relative;text-shadow:0 3px 14px rgba(0,0,0,.35)}
  li:before{content:"";position:absolute;left:0;top:16px;width:40px;height:40px;border-radius:50%;background:#fff}
  .front{flex:1;display:flex;align-items:center;justify-content:center;height:100%}
  .front img{width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 40px 60px rgba(0,0,0,.45))}`);
}

function imgSample(L) {
  return page(`<div class="wrap" style="--a:${L.accent}"><h2 class="serif">${L.kind === "gameshow" ? "The music bingo game in this pack" : "Real cards from the download"}</h2>
  <div class="shot"><img src="${img(L.sample)}"></div>
  <p>Every card is different, so everyone in the room can play. Print as many as you need.</p></div>`,
  `.wrap{height:100%;background:#f6f1e7;padding:130px 150px;display:flex;flex-direction:column;align-items:center}
  h2{font-size:96px;color:var(--a);margin-bottom:80px}
  .shot{flex:1;width:100%;display:flex;align-items:center;justify-content:center}
  .shot img{width:2400px;height:1380px;object-fit:contain;filter:drop-shadow(0 30px 50px rgba(0,0,0,.25))}
  p{font-size:54px;font-weight:600;margin-top:70px;text-align:center}`);
}

function imgHow(L) {
  const S = DATA.shared;
  const how = L.kind === "trivia" ? S.how_trivia : L.kind === "gameshow" ? S.how_gameshow : S.how_bingo;
  const head = L.kind === "trivia" ? ["Print", "Read", "Score"] : L.kind === "gameshow" ? ["Open", "Play", "Score"] : ["Print", "Press play", "Call bingo"];
  return page(`<div class="wrap" style="--a:${L.accent}"><h2 class="serif">How it works</h2><div class="steps">
  ${how.map((h, n) => `<div class="step"><div class="n">${n + 1}</div><h3>${head[n]}</h3><p>${esc(h)}</p></div>`).join("")}
  </div><div class="foot">${L.kind === "trivia" ? "No projector, no app, no software. If you can print, you can host." : "No app, no account, no setup. Hosting tonight is realistic."}</div></div>`,
  `.wrap{height:100%;background:#fff;padding:140px 150px;display:flex;flex-direction:column}
  h2{font-size:120px;color:var(--a);text-align:center;margin-bottom:110px}
  .steps{display:flex;gap:80px;flex:1}.step{flex:1;background:#f6f1e7;border-radius:40px;padding:80px 70px}
  .n{width:150px;height:150px;border-radius:50%;background:var(--a);color:#fff;font-weight:900;font-size:90px;display:flex;align-items:center;justify-content:center}
  h3{font-size:84px;font-weight:800;margin:60px 0 40px}p{font-size:62px;line-height:1.4}
  .foot{text-align:center;font-size:54px;font-weight:600;margin-top:90px}`);
}

function imgList(L) {
  let title, items, more = "";
  if (L.packs && L.packs.length > 1) {
    title = `${L.packs.length} games in one download`;
    items = L.packs.map((p, n) => `${(L.pack_labels || [])[n] || SONGS[p].pack}<span>${SONGS[p].total} songs · 250 cards</span>`);
  } else if (L.packs && L.kind === "bingo") {
    const pk = SONGS[L.packs[0]];
    title = "Songs in this game";
    items = pk.tracks.slice(0, 16).map((t) => esc(cleanSong(t.song)));
    more = `and ${pk.total - 16} more on the callsheet`;
  } else {
    title = "What's inside";
    items = (L.rounds ? L.rounds.map((r) => `Round: ${r}`) : []).concat(L.includes).slice(0, 9).map(esc);
  }
  const cols = items.length > 8 ? 2 : 1;
  return page(`<div class="wrap" style="--a:${L.accent}"><h2 class="serif">${esc(title)}</h2>
  <ol style="column-count:${cols}">${items.map((i) => `<li>${i}</li>`).join("")}</ol>${more ? `<div class="more">${more}</div>` : ""}</div>`,
  `.wrap{height:100%;background:var(--a);color:#fff;padding:140px 170px;display:flex;flex-direction:column}
  h2{font-size:110px;margin-bottom:80px}
  ol{list-style:none;column-gap:120px;flex:1}li{font-size:${cols === 2 ? 64 : 70}px;font-weight:600;padding:22px 0;border-bottom:3px solid rgba(255,255,255,.3);break-inside:avoid}
  li span{display:block;font-size:40px;font-weight:500;opacity:.85;margin-top:8px}
  .more{font-size:50px;font-weight:600;opacity:.9;margin-top:40px}`);
}

function imgWhy(L) {
  return page(`<div class="wrap" style="--a:${L.accent}"><div class="kick">Fat City Entertainment</div>
  <h2 class="serif">We bring people together.</h2>
  <p>Hosting music bingo and trivia on live crowds since 1999. Every game here was played on a real room first.</p>
  <ul>${DATA.shared.good_to_know.map((g) => `<li>${esc(g)}</li>`).join("")}</ul></div>`,
  `.wrap{height:100%;background:#1b1714;color:#f6f1e7;padding:170px 200px;display:flex;flex-direction:column;justify-content:center}
  .kick{font-weight:800;letter-spacing:.18em;text-transform:uppercase;font-size:42px;color:var(--a);filter:brightness(1.4)}
  h2{font-size:150px;margin:40px 0}p{font-size:60px;line-height:1.4;max-width:2000px}
  ul{list-style:none;margin-top:90px}li{font-size:50px;margin:22px 0;padding-left:60px;position:relative}
  li:before{content:"";position:absolute;left:0;top:18px;width:26px;height:26px;background:var(--a);filter:brightness(1.4)}`);
}

// song-lists.json has no Spotify link for six packs (The 90s among them): their
// product pages use Spotify's older /user/<name>/playlist/<id> URL, which the
// library's extractor did not recognise. Fall back to the pack's own product
// page, and only when it carries exactly one Spotify playlist, so a pack page
// can never lend its link to the wrong game.
function spotifyFor(pk) {
  if (pk.spotify) return pk.spotify;
  const f = pk.url && path.join(REPO, decodeURIComponent(pk.url));
  if (!f || !fs.existsSync(f)) return null;
  const ids = [...new Set([...fs.readFileSync(f, "utf8").matchAll(/open\.spotify\.com\/(?:user\/[^/"]+\/)?playlist\/([A-Za-z0-9]+)/g)].map((m) => m[1]))];
  return ids.length === 1 ? `https://open.spotify.com/playlist/${ids[0]}` : null;
}

function startHere(L) {
  const lists = [];
  for (const [n, p] of (L.packs || []).entries()) {
    const pk = SONGS[p];
    const sp = spotifyFor(pk);
    if (!sp || !pk.apple) problems.push(`${L.pid}: ${pk.pack} has no ${sp ? "Apple Music" : "Spotify"} link for START HERE`);
    lists.push([(L.pack_labels || [])[n] || pk.pack, sp, pk.apple]);
  }
  for (const x of L.playlists || []) lists.unshift(x);
  const S = DATA.shared;
  const how = L.kind === "trivia" ? S.how_trivia : L.kind === "gameshow" ? S.how_gameshow : S.how_bingo;
  const link = (u, t) => (u ? `<a href="${esc(u)}">${t}</a>` : "");
  return `<!doctype html><html><head><meta charset="utf-8">${FONTS}<style>${BASE}
  @page{size:Letter;margin:.6in}body{font-size:12.5pt;line-height:1.45}
  .top{border-bottom:4px solid ${L.accent};padding-bottom:12px;margin-bottom:18px}
  .kick{font-weight:800;letter-spacing:.14em;text-transform:uppercase;font-size:9pt;color:${L.accent}}
  h1{font-size:24pt;margin:4px 0 0}h2{font-size:14pt;margin:20px 0 8px;color:${L.accent}}
  table{width:100%;border-collapse:collapse}td{padding:6px 4px;border-bottom:1px solid #ddd;vertical-align:top}
  td:first-child{font-weight:600;width:42%}a{color:${L.accent};font-weight:600;margin-right:14px}
  ol{padding-left:20px}li{margin:4px 0}.note{background:#f6f1e7;padding:10px 14px;border-radius:6px;margin-top:16px}
  .foot{margin-top:24px;font-size:10pt;color:#555}</style></head><body>
  <div class="top"><div class="kick">Fat City Entertainment · Start here</div><h1 class="serif">${esc(shortName(L))}</h1></div>
  <p>Thank you for your order. Everything you need to host is in this download. This page is the map.</p>
  ${lists.length ? `<h2>Your playlists</h2><p>Already sequenced to match the callsheet. Tap a link, press play.</p>
  <table>${lists.map(([t, s, a]) => `<tr><td>${esc(t)}</td><td>${link(s, "Spotify")}${link(a, "Apple Music")}</td></tr>`).join("")}</table>
  <p style="margin-top:8px;font-size:10.5pt">Rather use your own music? The callsheet lists every song in play order.</p>` : ""}
  <h2>How to host</h2><ol>${how.map((h) => `<li>${esc(h.replace("from your START HERE file", "above"))}</li>`).join("")}</ol>
  ${L.kind !== "trivia" ? `<div class="note"><b>Printing:</b> print the cards landscape on US Letter paper. On A4, choose "Fit to page".</div>` : `<div class="note"><b>Printing:</b> print one set of answer sheets per team and keep the host packet face down until you start.</div>`}
  ${L.needs ? `<div class="note"><b>You will need:</b> ${esc(L.needs)}</div>` : ""}
  <h2>Something not right?</h2><p>If a file will not open, prints wrong, or anything is unclear, send us a message on Etsy. A real host answers, and we will fix it or refund you.</p>
  <p class="foot">Please host as often as you like, at home, at work or at your venue. Please do not share or resell the files.<br>We bring people together. Have a great night.</p>
  </body></html>`;
}

function banner() {
  return page(`<div class="wrap"><div><div class="kick">Fat City Entertainment</div><h1 class="serif">We bring people together.</h1>
  <p>Music bingo and trivia nights, tested on live crowds since 1999</p></div></div>`,
  `.wrap{height:100%;background:#1b1714;color:#f6f1e7;display:flex;align-items:center;justify-content:center;text-align:center}
  .kick{font-weight:800;letter-spacing:.2em;text-transform:uppercase;font-size:56px;color:#e8731a}
  h1{font-size:170px;margin:20px 0}p{font-size:64px;font-weight:600;opacity:.9}`, 3360, 840);
}
function icon() {
  return page(`<div class="wrap"><div class="fc serif">FC</div><div class="s">Fat City</div></div>`,
  `.wrap{height:100%;background:#1b1714;color:#f6f1e7;display:flex;flex-direction:column;align-items:center;justify-content:center}
  .fc{font-size:230px;line-height:1;color:#e8731a}.s{font-weight:800;letter-spacing:.16em;text-transform:uppercase;font-size:50px;margin-top:6px}`, 500, 500);
}

async function render() {
  let chromium;
  try { ({ chromium } = require("playwright")); }
  catch (e) { ({ chromium } = require("/opt/node22/lib/node_modules/playwright")); }
  // The repo's Playwright can be newer than the installed browser; fall back to
  // any Chromium on the machine (test-round-autoload.js does the same).
  let browser;
  try { browser = await chromium.launch(); }
  catch (e) {
    const dir = process.env.PLAYWRIGHT_BROWSERS_PATH || "/opt/pw-browsers";
    const exe = fs.existsSync(dir) && fs.readdirSync(dir).filter((d) => /^chromium-\d+$/.test(d)).sort().reverse()
      .map((d) => path.join(dir, d, "chrome-linux", "chrome")).find((p) => fs.existsSync(p));
    if (!exe) throw e;
    browser = await chromium.launch({ executablePath: exe });
  }
  const ctx = await browser.newContext();
  const shot = async (html, file, w = W, h = H) => {
    const pg = await ctx.newPage();
    await pg.setViewportSize({ width: w, height: h });
    const tmp = file.replace(/\.jpg$/, ".tmp.html");
    fs.writeFileSync(tmp, html);
    await pg.goto("file://" + tmp, { waitUntil: "load" });
    await pg.evaluate(() => document.fonts.ready);
    await pg.screenshot({ path: file, type: "jpeg", quality: 88 });
    fs.unlinkSync(tmp);
    await pg.close();
  };
  fs.mkdirSync(OUT, { recursive: true });
  let n = 0;
  for (const L of listings) {
    const dir = path.join(OUT, L.slug);
    fs.mkdirSync(dir, { recursive: true });
    const set = [["01-hero", imgHero(L)]];
    if (L.sample) set.push(["02-sample-cards", imgSample(L)]);
    set.push(["03-how-it-works", imgHow(L)], ["04-whats-inside", imgList(L)], ["05-who-we-are", imgWhy(L)]);
    for (const [name, html] of set) { await shot(html, path.join(dir, `${name}.jpg`)); n++; }
    const pg = await ctx.newPage();
    const tmp = path.join(dir, "start.tmp.html");
    fs.writeFileSync(tmp, startHere(L));
    await pg.goto("file://" + tmp, { waitUntil: "load" });
    await pg.evaluate(() => document.fonts.ready);
    await pg.pdf({ path: path.join(dir, "START-HERE.pdf"), format: "Letter", printBackground: true });
    fs.unlinkSync(tmp);
    await pg.close();
    console.log(`  rendered: _export/etsy/${L.slug}/ (${set.length} images + START-HERE.pdf)`);
  }
  if (!ONLY) {
    await shot(banner(), path.join(OUT, "shop-banner-3360x840.jpg"), 3360, 840);
    await shot(icon(), path.join(OUT, "shop-icon-500x500.jpg"), 500, 500);
    console.log("  rendered: shop banner and icon");
  }
  await browser.close();
  console.log(`\nimages: ${n}`);
}

(async () => {
  for (const L of listings) startHere(L); // surfaces missing playlist links on a dry run too
  if (IMAGES && !problems.length) await render();
  for (const p of problems) console.log(`  PROBLEM: ${p}`);
  console.log(`\n${listings.length} listing(s), ${problems.length} problem(s)`);
  if (!WRITE && !IMAGES) console.log("re-run with --write (text) and/or --images (render)");
  if (problems.length) process.exitCode = 1;
})();
