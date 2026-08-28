// Build the /go/<campaign>/ landing pages for the Sender email sends.
//
//   node _tools/build-campaign-pages.js            report only
//   node _tools/build-campaign-pages.js --write    apply
//
// The design rationale, the four sends, and why the direction comparison is
// explicitly NOT an A/B test all live in EMAIL-CAMPAIGNS.md. Read that first.
//
// WHAT THESE ARE FOR
// ------------------
// A send currently has nowhere good to point. trivia-store.html and the product
// pages are built for a stranger arriving from Google: full nav, dropdowns,
// price ladder, "what is music bingo". Someone who opened an email about
// Halloween has already decided, and every one of those elements is a way to
// leave. These pages are one occasion, one ladder, one button.
//
// They also give each send a known denominator — delivered → sessions →
// begin_checkout — which is the first thing on this site that has been
// measurable end to end.
//
// RULES, all load-bearing
// -----------------------
// - noindex,follow AND absent from sitemap.xml. These restate product copy;
//   the site spent Jul–Aug 2026 climbing out of a duplicate-content hole and
//   this is not the place to dig a new one.
// - Trailing slash on the canonical, like every directory page here.
// - Prices are READ FROM THE PRODUCT PAGES at build time, never typed. Re-run
//   after any repricing, same standing rule as add-cross-sell.js and
//   add-price-ladder.js.
// - Buy buttons carry class="ls-buy" data-product="pNN" so ls-buy.js, the promo
//   discount prefill, bake-buy-links.js and the GA4 tracking all work unchanged.
// - Self-contained CSS. No Weebly stylesheet, no 45KB of table scaffolding —
//   these load fast, and swapping the visual direction means swapping one
//   THEMES entry rather than rebuilding a page.
//
// Adding a campaign: add an entry to _content/campaigns.json and re-run.

const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const WRITE = process.argv.includes("--write");
const SITE = "https://www.fatcityentertainment.com";
const ROOT = "go";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
  .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const money = (n) => "$" + n.toFixed(2);

const campaigns = JSON.parse(
  fs.readFileSync(path.join(REPO, "_content/campaigns.json"), "utf8"));

// ---- product facts, read from the pages themselves ----------------------
const productCache = new Map();
function product(pid) {
  if (productCache.has(pid)) return productCache.get(pid);
  const dir = path.join(REPO, "store", pid);
  let out = null;
  if (fs.existsSync(dir)) {
    for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".html"))) {
      const rel = `store/${pid}/${f}`;
      const html = fs.readFileSync(path.join(REPO, rel), "utf8");
      if (/http-equiv="refresh"/i.test(html)) continue;
      const price = html.match(/itemprop="price"\s+content="([0-9.]+)"/);
      if (!price) continue;
      const name = html.match(/<h1[^>]*id="wsite-com-product-title"[^>]*>([\s\S]*?)<\/h1>/);
      const img = html.match(/property="og:image" content="([^"]+)"/);
      const shown = [...new Set(html.match(/\$[\d,]+\.\d\d USD/g) || [])];
      out = {
        pid,
        href: "/" + rel,
        price: Number(price[1]),
        onSale: shown.length > 1,
        name: name ? name[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : pid,
        image: img ? img[1] : null,
      };
      break;
    }
  }
  productCache.set(pid, out);
  return out;
}

// The checkout link, so the button works before any JS runs. ls-buy.js still
// re-applies this at runtime and is still the authority.
const LS = fs.readFileSync(path.join(REPO, "assets/js/ls-links.js"), "utf8");
function checkout(pid) {
  const m = LS.match(new RegExp(`"${pid}":\\s*"([^"]*)"`));
  return m && m[1] ? m[1] : null;
}

// ---- themes -------------------------------------------------------------
// One entry per visual direction in EMAIL-CAMPAIGNS.md. Direction A is the
// control: the site's own palette and type, in a single focused column with the
// nav stripped out. It answers "how much of the problem is layout rather than
// looks" before anything more opinionated gets tested against it.
const THEMES = {
  a: {
    name: "A — current, tightened",
    css: `
:root{
  --ink:#24242a; --muted:#5a5a62; --paper:#f7f7f5; --card:#ffffff;
  --rule:#e3e3dd; --gold:#99790a; --gold-dark:#7a5f08; --green:#398205;
}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{
  margin:0; background:var(--paper); color:var(--ink);
  font-family:"PT Serif",Georgia,serif; font-size:17px; line-height:1.65;
}
.wrap{max-width:680px;margin:0 auto;padding:0 20px}
h1,h2,h3,.sans{font-family:"Montserrat",Arial,sans-serif}
a{color:var(--green)}

header{border-bottom:1px solid var(--rule);background:var(--card)}
header .wrap{display:flex;align-items:center;justify-content:space-between;
  padding-top:14px;padding-bottom:14px;gap:12px}
.brand{font-family:"Montserrat",Arial,sans-serif;font-weight:700;
  font-size:15px;color:var(--gold);text-decoration:none;letter-spacing:-.2px}
.brand span{color:var(--ink);font-weight:600}
header .back{font-family:"Montserrat",Arial,sans-serif;font-size:13px;
  color:var(--muted);text-decoration:none}
header .back:hover{color:var(--gold)}

.hero{padding:44px 0 8px}
.hero h1{font-size:34px;line-height:1.15;margin:0 0 14px;color:#16161a;
  letter-spacing:-.5px;text-wrap:balance}
.hero p{margin:0;color:var(--muted);font-size:18px}

section{padding:32px 0}
h2{font-size:21px;margin:0 0 6px;color:#16161a;letter-spacing:-.2px}
.lead{color:var(--muted);margin:0 0 20px}

.pick{background:var(--card);border:1px solid var(--rule);border-radius:5px;
  padding:20px;margin-bottom:16px}
.pick.best{border-color:var(--gold);border-width:2px;padding:19px}
.pick-label{font-family:"Montserrat",Arial,sans-serif;font-size:11px;
  letter-spacing:.09em;text-transform:uppercase;color:var(--gold);
  font-weight:700;margin:0 0 6px}
.pick h3{font-size:18px;margin:0 0 6px;line-height:1.3;color:#16161a}
.pick p{margin:0 0 16px;font-size:15.5px;color:var(--muted)}
.pick .row{display:flex;align-items:center;gap:14px;flex-wrap:wrap}
.price{font-family:"Montserrat",Arial,sans-serif;font-weight:700;font-size:22px;
  color:#16161a;font-variant-numeric:tabular-nums}
.per{font-family:"Montserrat",Arial,sans-serif;font-size:13px;color:var(--muted)}

a.buy{display:inline-block;background:var(--gold);color:#fff;
  font-family:"Montserrat",Arial,sans-serif;font-weight:700;font-size:15px;
  padding:12px 22px;border-radius:4px;text-decoration:none;
  transition:background .15s}
a.buy:hover,a.buy:focus{background:var(--gold-dark);color:#fff}
a.buy:focus-visible{outline:3px solid var(--green);outline-offset:2px}

.included{background:var(--card);border:1px solid var(--rule);border-radius:5px;
  padding:20px 22px}
.included ul{margin:0;padding-left:20px}
.included li{margin-bottom:9px;font-size:16px}
.included li:last-child{margin-bottom:0}
.included strong{color:#16161a}

.proof{border-left:4px solid var(--gold);padding:4px 0 4px 18px;color:var(--muted)}
.proof a{font-weight:700}

.final{text-align:center;padding:34px 0 44px;border-top:1px solid var(--rule);
  margin-top:28px}
.final p{color:var(--muted);margin:0 0 18px}

footer{border-top:1px solid var(--rule);background:var(--card);
  padding:20px 0;font-size:14px;color:var(--muted)}
footer a{color:var(--muted)}

@media (max-width:600px){
  .hero{padding-top:30px}
  .hero h1{font-size:27px}
  .hero p{font-size:16.5px}
  a.buy{display:block;text-align:center}
  .pick .row{gap:10px}
}`,
  },
};

// ---- page ---------------------------------------------------------------
function page(slug, c) {
  const theme = THEMES[c.direction];
  if (!theme) throw new Error(`unknown direction "${c.direction}" for ${slug}`);

  const url = `${SITE}/${ROOT}/${slug}/`;
  const items = c.products.map(product).filter(Boolean);
  if (items.length !== c.products.length) {
    const missing = c.products.filter((p) => !product(p));
    throw new Error(`${slug}: no price found for ${missing.join(", ")}`);
  }

  const cheapest = Math.min(...items.map((i) => i.price));
  const picks = items.map((p, i) => {
    const meta = (c.picks && c.picks[p.pid]) || {};
    const best = i === items.length - 1 && items.length > 1;
    const href = checkout(p.pid);

    // The arithmetic, only where it is true and checkable: how the top of the
    // ladder compares with the entry price on this same page.
    let per = "";
    const games = (p.name.match(/(\d+)\s*-?\s*Pack/i) || [])[1];
    if (games && Number(games) > 1) {
      per = `<span class="per">${money(p.price / Number(games))} a night</span>`;
    } else if (p.price === cheapest) {
      per = `<span class="per">one night</span>`;
    }

    return `      <div class="pick${best ? " best" : ""}">
        ${meta.label ? `<p class="pick-label">${esc(meta.label)}</p>` : ""}
        <h3>${esc(p.name)}</h3>
        ${meta.blurb ? `<p>${esc(meta.blurb)}</p>` : ""}
        <div class="row">
          <span class="price">${money(p.price)}</span>
          ${per}
          <a class="buy ls-buy" data-product="${p.pid}" data-fce-name="${esc(p.name)}" data-fce-price="${p.price}"${href ? ` href="${esc(href)}"` : ""} target="_blank" rel="noopener">Get it now</a>
        </div>
      </div>`;
  }).join("\n");

  const last = items[items.length - 1];
  const songList = c.song_list
    ? `    <section>
      <p class="proof">Not sure the songs suit your crowd? <a href="/music-bingo-song-lists/${esc(c.song_list)}/">${esc(c.song_list_label || "Read the full song list, free")}</a> — every track, in play order, before you spend anything.</p>
    </section>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(c.title)} - Fat City Entertainment</title>
<meta name="description" content="${esc(c.meta)}">
<meta name="robots" content="noindex,follow">
<link rel="canonical" href="${url}">
<meta property="og:title" content="${esc(c.title)}">
<meta property="og:description" content="${esc(c.meta)}">
<meta property="og:url" content="${url}">
<meta property="og:type" content="website">
<link rel="stylesheet" href="/assets/fonts/Montserrat/font.css">
<!-- fce:favicon -->
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<!-- /fce:favicon -->
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-LYMVV05F3X"></script>
<script>
	window.dataLayer = window.dataLayer || [];
	function gtag(){dataLayer.push(arguments);}
	gtag('js', new Date());
	gtag('config', 'G-LYMVV05F3X');
</script>
<style>${theme.css}
</style>
</head>
<body data-fce-campaign="${esc(slug)}">

<header>
  <div class="wrap">
    <a class="brand" href="/">FAT CITY <span>ENTERTAINMENT</span></a>
    <a class="back" href="/trivia-store.html">All games &rarr;</a>
  </div>
</header>

<main>
  <div class="wrap">

    <div class="hero">
      <h1>${esc(c.hero)}</h1>
      <p>${esc(c.sub)}</p>
    </div>

    <section>
      <h2>Pick one and print it</h2>
      <p class="lead">Every option below is an instant download. Nothing ships, nothing renews.</p>
${picks}
    </section>

${songList}

    <section>
      <h2>What's in every download</h2>
      <div class="included">
        <ul>
          <li><strong>250 randomized cards.</strong> Every card different, so a full room can play at once without two people sharing a winning line. Prints landscape on ordinary letter paper.</li>
          <li><strong>The printable callsheet.</strong> Every answer in play order, so you can confirm a win in seconds from the host table.</li>
          <li><strong>Playlists, already sequenced.</strong> Spotify and Apple Music — press play and host.</li>
        </ul>
      </div>
    </section>

    <div class="final">
      <p>Downloads are instant. You could be printing in ten minutes.</p>
      <a class="buy ls-buy" data-product="${last.pid}" data-fce-name="${esc(last.name)}" data-fce-price="${last.price}"${checkout(last.pid) ? ` href="${esc(checkout(last.pid))}"` : ""} target="_blank" rel="noopener">Get the ${esc(last.name.split(/\s+[-–—]\s+/)[0])}</a>
    </div>

  </div>
</main>

<footer>
  <div class="wrap">
    Fat City Entertainment &middot; <a href="/contact.html">Questions? Get in touch</a> &middot; <a href="/trivia-store.html">Browse all games</a>
  </div>
</footer>

<script src="/assets/js/ls-links.js"></script>
<script src="/assets/js/ls-buy.js"></script>
<script defer src="/assets/js/promo-bar.js"></script>
<!-- fce:tracking -->
<script type="text/javascript">
    (function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", "y99er61yhf");
</script>
<script defer src="/assets/js/track.js"></script>
<!-- /fce:tracking -->
</body>
</html>
`;
}

// ---- write --------------------------------------------------------------
let written = 0;
const onSale = [];
for (const [slug, c] of Object.entries(campaigns)) {
  const html = page(slug, c);
  const dir = path.join(REPO, ROOT, slug);
  if (WRITE) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "index.html"), html);
  }
  written++;
  const theme = THEMES[c.direction].name;
  const prices = c.products.map((p) => `${p} ${money(product(p).price)}`).join("  ");
  console.log(`  /${ROOT}/${slug}/   direction ${theme}`);
  console.log(`      send: ${c.send}   products: ${prices}`);
  for (const p of c.products) if (product(p).onSale) onSale.push(`${slug}: ${p}`);
}

console.log(`\n${WRITE ? "wrote" : "would write"} ${written} campaign page(s) under /${ROOT}/`);
if (onSale.length) {
  console.log(`  on sale, so re-run after any repricing: ${onSale.join(", ")}`);
}
console.log("  noindex + absent from sitemap.xml, deliberately — see EMAIL-CAMPAIGNS.md");
if (!WRITE) console.log("\n(dry run -- pass --write to apply)");
else console.log("\nNow run: bake-buy-links.js, check-links.js");
