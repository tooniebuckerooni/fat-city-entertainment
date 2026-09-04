// Build the LemonSqueezy catalogue callsheet — a single working page the owner
// keeps open beside the dashboard while updating every product.
//
//   node _tools/build-ls-callsheet.js [--out <path>]
//
// Inputs (all generated, all committed):
//   _tools/ls-product-sheet.json   image, current price, checkout state
//   _tools/ls-copy-bingo.json      titles + descriptions, 42 singles
//   _tools/ls-copy-bundles.json    titles + descriptions, 33 everything else
//
// Thumbnails are inlined as data URIs on purpose: the published page is served
// from claude.ai, whose CSP blocks images from fatcityentertainment.com, so a
// plain <img src> to the live site would silently render nothing.
//
// READ-ONLY with respect to the site. It writes one HTML file and nothing else.
const fs = require("fs");
const path = require("path");
const sharp = require(path.join(__dirname, "node_modules", "sharp"));

const REPO = path.resolve(__dirname, "..");
const outIdx = process.argv.indexOf("--out");
const OUT = outIdx !== -1 ? process.argv[outIdx + 1]
  : path.join(__dirname, "ls-callsheet.html");

const read = (f) => JSON.parse(fs.readFileSync(path.join(__dirname, f), "utf8"));
const sheet = read("ls-product-sheet.json");
const copy = [...read("ls-copy-bingo.json"), ...read("ls-copy-bundles.json"),
              ...read("ls-copy-shows.json")];
const copyBy = new Map(copy.map((c) => [c.pid, c]));

// ---------------------------------------------------------------- pricing plan
// The proposed fall prices. Anything absent keeps its current price. These are
// PROPOSED until the owner confirms — the page labels them as such, and nothing
// on the site has been repriced. Per the pricing-strategy skill, LemonSqueezy
// changes first; the site follows only once that is done.
const PROPOSED = {
  __singles: "11.99",          // all 42 games currently at $10.99
  p127: "25.99",               // 3-pack rung — the cheapest 3-pack sets the rung
  p147: "41.99", p168: "41.99", p101: "41.99",   // the three 5-packs
  p155: "48.99",               // Holidays 6-pack
  p130: "193.75",              // Silver — the one cut, to make the ladder descend
  // These three were in the brief but not here, so a rebuild driven off this
  // sheet would have put them back at their old prices. p108 and p162 sit at
  // $27.00 = $9.00/game, which is ABOVE an $8.99 sale single — during a sale
  // those two packs offer no reason to exist. $25.99 matches p127 and lands the
  // whole 3-pack rung on $8.66. p128 is the catalogue's weakest rung; $17.99
  // brings a 2-pack to $9.00, and both also pick up the .99 ending everything
  // else uses.
  p108: "25.99", p162: "25.99",
  p128: "17.99",
};
const isNew = (p) => Number(p.pid.slice(1)) >= 169;
const proposedFor = (p) => {
  if (isNew(p)) return null;
  if (PROPOSED[p.pid]) return PROPOSED[p.pid];
  if (p.price === "10.99") return PROPOSED.__singles;
  return null;
};

// --------------------------------------------------------------------- grouping
// Ordered by how the owner will actually work the dashboard: the big repricing
// batch first, then the rungs that move, then everything untouched.
function group(p) {
  if (isNew(p)) return "newshows";
  if (p.price === "10.99") return "singles";
  if (PROPOSED[p.pid]) return "rungs";
  if (["p112", "p130", "p131"].includes(p.pid)) return "clubs";
  if (["p9", "p13", "p28", "p33", "p42", "p49", "p53", "p123", "p126", "p135"].includes(p.pid)) return "shows";
  return "other";
}
const GROUPS = [
  ["newshows", "New — pre-made trivia shows", "Create these from scratch. Staged on the site already: noindex, no tile, no checkout. Price shown is the launch price."],
  ["singles", "Music bingo singles", "All 42 reprice together — the one batch that depends on no open decision."],
  ["rungs",   "Ladder rungs that move", "Repriced upward so per-game cost finally descends as pack size grows."],
  ["clubs",   "Club tiers", "Bronze and Gold hold. Their compare-at value stacks are rebuilt from the new single price."],
  ["shows",   "PowerPoint game shows", "Unchanged this round. Big-screen .ppsx presentations, not print-and-play."],
  ["other",   "Everything else", "Unchanged. Q&A packs, the generator, services and merch."],
];

const esc = (s) => String(s == null ? "" : s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

async function thumb(rel) {
  if (!rel) return null;
  const file = path.join(REPO, rel.replace(/^\//, "").split("?")[0]);
  if (!fs.existsSync(file)) return null;
  try {
    const buf = await sharp(file)
      .resize(120, 120, { fit: "cover", position: "attention" })
      .webp({ quality: 62 })
      .toBuffer();
    return `data:image/webp;base64,${buf.toString("base64")}`;
  } catch (e) {
    console.warn(`  warn: could not thumbnail ${rel} — ${e.message}`);
    return null;
  }
}

(async () => {
  const rows = [];
  for (const p of sheet) {
    const c = copyBy.get(p.pid) || {};
    rows.push({ ...p, ...c, thumb: await thumb(p.image), group: group(p), proposed: proposedFor(p) });
  }

  const nChanging = rows.filter((r) => r.proposed).length;
  const nNew = rows.filter((r) => isNew(r)).length;
  const nUnwired = rows.filter((r) => !r.wired).length;

  const card = (r) => {
    const priceCell = r.proposed
      ? `<span class="was">$${esc(r.price)}</span><span class="arrow">→</span><span class="now">$${esc(r.proposed)}</span>`
      : isNew(r)
      ? `<span class="now">$${esc(r.price)}</span><span class="holdlab">new</span>`
      : `<span class="hold">$${esc(r.price)}</span><span class="holdlab">holds</span>`;
    const flags = [
      r.onSale ? `<span class="flag sale">on sale</span>` : "",
      !r.wired ? `<span class="flag warn">no checkout</span>` : "",
      r.currency !== "USD" ? `<span class="flag warn">${esc(r.currency)}</span>` : "",
    ].join("");
    return `
<article class="row" data-pid="${esc(r.pid)}" data-search="${esc((r.pid + " " + (r.title || "") + " " + r.file).toLowerCase())}">
  <label class="tick"><input type="checkbox" data-done="${esc(r.pid)}"><span class="box" aria-hidden="true"></span><span class="sr">Mark ${esc(r.pid)} done</span></label>
  ${r.thumb ? `<img class="thumb" src="${r.thumb}" alt="" loading="lazy">` : `<div class="thumb empty" aria-hidden="true"></div>`}
  <div class="ident">
    <div class="idline"><span class="pid">${esc(r.pid)}</span>${flags}</div>
    <h3>${esc(r.title || "—")}</h3>
    <a class="src" href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.file)}</a>
  </div>
  <div class="price">${priceCell}</div>
  <div class="fields">
    ${field("Name", r.title)}
    ${field("Summary", r.shortDescription)}
    ${field("Description", r.description, true)}
    ${field("Image", r.imageUrl, false, "img")}
  </div>
</article>`;
  };

  const field = (label, value, multiline, kind) => {
    if (!value) return "";
    const v = esc(value);
    return `<div class="field${multiline ? " multi" : ""}${kind === "img" ? " imgf" : ""}">
      <div class="flabel">${label}</div>
      <div class="fval" data-copy>${v.replace(/\n/g, "<br>")}</div>
      <button class="copy" type="button" data-val="${v}">Copy</button>
    </div>`;
  };

  const sections = GROUPS.map(([key, title, note]) => {
    const items = rows.filter((r) => r.group === key);
    if (!items.length) return "";
    return `<section class="group" id="g-${key}">
  <header class="ghead">
    <h2>${esc(title)}</h2>
    <p>${esc(note)}</p>
    <span class="count">${items.length}</span>
  </header>
  <div class="rows">${items.map(card).join("")}</div>
</section>`;
  }).join("");

  const html = `<title>Catalogue Callsheet</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans+Condensed:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap">
<style>
:root{
  --brass:#99790a; --brass-soft:#f0e7c8; --on-brass:#ffffff;
  --ink:#16161a; --ink-2:#4a4a52; --ink-3:#77777f;
  --ground:#f7f7f5; --panel:#ffffff; --line:#e2e2dd; --line-2:#efefe9;
  --good:#2f6f4e; --good-bg:#e6f0ea;
  --warn:#9a5b18; --warn-bg:#f6eadd;
  --hold-bg:#f0f0ec;
  --shadow:0 1px 2px rgba(22,22,26,.06);
}
@media (prefers-color-scheme:dark){
  :root:not([data-theme="light"]){
    --brass:#d8b544; --brass-soft:#3a3013; --on-brass:#16161a;
    --ink:#eeeeea; --ink-2:#b0b0b8; --ink-3:#85858e;
    --ground:#131316; --panel:#1c1c21; --line:#2e2e35; --line-2:#26262c;
    --good:#7fc4a0; --good-bg:#1b3128;
    --warn:#e0a765; --warn-bg:#35271a;
    --hold-bg:#232329;
    --shadow:0 1px 2px rgba(0,0,0,.4);
  }
}
:root[data-theme="dark"]{
  --brass:#d8b544; --brass-soft:#3a3013; --on-brass:#16161a;
  --ink:#eeeeea; --ink-2:#b0b0b8; --ink-3:#85858e;
  --ground:#131316; --panel:#1c1c21; --line:#2e2e35; --line-2:#26262c;
  --good:#7fc4a0; --good-bg:#1b3128;
  --warn:#e0a765; --warn-bg:#35271a;
  --hold-bg:#232329;
  --shadow:0 1px 2px rgba(0,0,0,.4);
}
*{box-sizing:border-box}
body{
  margin:0; background:var(--ground); color:var(--ink);
  font:400 15px/1.55 "IBM Plex Sans","Helvetica Neue",Arial,sans-serif;
  -webkit-font-smoothing:antialiased;
}
.wrap{max-width:1120px;margin:0 auto;padding:32px 20px 80px}

/* ---- masthead ---- */
.mast{border-bottom:2px solid var(--ink);padding-bottom:18px;margin-bottom:8px}
.eyebrow{
  font:600 11px/1 "IBM Plex Sans Condensed",sans-serif;
  letter-spacing:.16em;text-transform:uppercase;color:var(--brass);margin-bottom:10px;
}
h1{
  font:700 clamp(28px,4.4vw,42px)/1.05 "IBM Plex Sans Condensed",sans-serif;
  margin:0 0 8px; letter-spacing:-.01em; text-wrap:balance;
}
.lede{margin:0;max-width:62ch;color:var(--ink-2)}
.lede strong{color:var(--ink);font-weight:600}

/* ---- stat strip ---- */
.stats{display:flex;flex-wrap:wrap;gap:0;margin:18px 0 26px;border:1px solid var(--line);border-radius:3px;background:var(--panel);overflow:hidden}
.stat{flex:1 1 150px;padding:12px 16px;border-right:1px solid var(--line)}
.stat:last-child{border-right:0}
.stat b{display:block;font:600 22px/1.1 "IBM Plex Mono",monospace;font-variant-numeric:tabular-nums}
.stat span{font:600 10px/1.4 "IBM Plex Sans Condensed",sans-serif;letter-spacing:.13em;text-transform:uppercase;color:var(--ink-3)}

/* ---- controls ---- */
.controls{position:sticky;top:0;z-index:20;background:var(--ground);padding:12px 0;margin-bottom:20px;border-bottom:1px solid var(--line);display:flex;gap:10px;flex-wrap:wrap;align-items:center}
#q{flex:1 1 240px;min-width:0;padding:9px 12px;border:1px solid var(--line);border-radius:3px;background:var(--panel);color:var(--ink);font:400 14px "IBM Plex Sans",sans-serif}
#q:focus-visible,.copy:focus-visible,.tick input:focus-visible+.box,.ghost:focus-visible{outline:2px solid var(--brass);outline-offset:2px}
.ghost{padding:9px 13px;border:1px solid var(--line);border-radius:3px;background:var(--panel);color:var(--ink-2);font:600 12px "IBM Plex Sans Condensed",sans-serif;letter-spacing:.06em;text-transform:uppercase;cursor:pointer}
.ghost:hover{border-color:var(--brass);color:var(--brass)}
.ghost[aria-pressed="true"]{background:var(--brass);border-color:var(--brass);color:var(--on-brass)}
.prog{font:500 12px/1 "IBM Plex Mono",monospace;color:var(--ink-3);margin-left:auto;font-variant-numeric:tabular-nums}

/* ---- groups ---- */
.group{margin-bottom:34px}
.ghead{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;padding-bottom:8px;border-bottom:1px solid var(--line);margin-bottom:14px}
.ghead h2{font:700 18px/1.2 "IBM Plex Sans Condensed",sans-serif;margin:0;letter-spacing:.01em}
.ghead p{margin:0;flex:1 1 320px;color:var(--ink-3);font-size:13.5px}
.count{font:500 12px "IBM Plex Mono",monospace;color:var(--ink-3)}

/* ---- rows ---- */
.rows{display:flex;flex-direction:column;gap:8px}
.row{
  display:grid;
  grid-template-columns:26px 60px minmax(190px,1.15fr) 128px minmax(280px,1.5fr);
  gap:14px;align-items:start;
  background:var(--panel);border:1px solid var(--line);border-radius:3px;
  padding:12px 14px;box-shadow:var(--shadow);
}
.row.done{opacity:.5}
.row.hidden{display:none}
.tick{display:flex;align-items:center;justify-content:center;padding-top:2px;cursor:pointer}
.tick input{position:absolute;opacity:0;width:0;height:0}
.box{width:17px;height:17px;border:1.5px solid var(--ink-3);border-radius:2px;display:block}
.tick input:checked+.box{background:var(--good);border-color:var(--good)}
.tick input:checked+.box::after{content:"";display:block;width:4px;height:9px;margin:1px auto;border:solid #fff;border-width:0 2px 2px 0;transform:rotate(42deg)}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.thumb{width:60px;height:60px;object-fit:cover;border-radius:2px;border:1px solid var(--line-2);display:block}
.thumb.empty{background:var(--hold-bg)}
.ident h3{font:600 14.5px/1.3 "IBM Plex Sans",sans-serif;margin:3px 0 4px;text-wrap:balance}
.idline{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.pid{font:500 11px "IBM Plex Mono",monospace;color:var(--brass);background:var(--brass-soft);padding:1px 5px;border-radius:2px}
.flag{font:600 9.5px/1 "IBM Plex Sans Condensed",sans-serif;letter-spacing:.09em;text-transform:uppercase;padding:3px 5px;border-radius:2px}
.flag.sale{background:var(--good-bg);color:var(--good)}
.flag.warn{background:var(--warn-bg);color:var(--warn)}
.src{font:400 11px "IBM Plex Mono",monospace;color:var(--ink-3);text-decoration:none;word-break:break-all}
.src:hover{color:var(--brass);text-decoration:underline}
.price{font-family:"IBM Plex Mono",monospace;font-variant-numeric:tabular-nums;display:flex;align-items:baseline;gap:6px;flex-wrap:wrap;padding-top:2px}
.was{color:var(--ink-3);text-decoration:line-through;font-size:13px}
.arrow{color:var(--ink-3);font-size:12px}
.now{color:var(--brass);font-weight:500;font-size:15px}
.hold{font-size:14px;color:var(--ink-2)}
.holdlab{font:600 9.5px "IBM Plex Sans Condensed",sans-serif;letter-spacing:.09em;text-transform:uppercase;color:var(--ink-3)}

/* ---- copy fields ---- */
.fields{display:flex;flex-direction:column;gap:6px;min-width:0}
.field{display:grid;grid-template-columns:80px 1fr auto;gap:8px;align-items:start}
.flabel{font:600 9.5px/1.7 "IBM Plex Sans Condensed",sans-serif;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3);padding-top:2px}
.fval{font:400 12.5px/1.5 "IBM Plex Mono",monospace;background:var(--ground);border:1px solid var(--line-2);border-radius:2px;padding:5px 7px;min-width:0;overflow-wrap:anywhere}
.field.multi .fval{max-height:82px;overflow-y:auto}
.field.imgf .fval{font-size:11px;color:var(--ink-2)}
.copy{border:1px solid var(--line);background:var(--panel);color:var(--ink-2);border-radius:2px;padding:4px 9px;font:600 10px "IBM Plex Sans Condensed",sans-serif;letter-spacing:.07em;text-transform:uppercase;cursor:pointer;white-space:nowrap}
.copy:hover{border-color:var(--brass);color:var(--brass)}
.copy.ok{background:var(--good);border-color:var(--good);color:#fff}

.foot{margin-top:40px;padding-top:16px;border-top:1px solid var(--line);color:var(--ink-3);font-size:13px;max-width:70ch}
.foot code{font:400 12px "IBM Plex Mono",monospace;background:var(--hold-bg);padding:1px 4px;border-radius:2px}

@media (max-width:860px){
  .row{grid-template-columns:26px 52px 1fr;gap:10px}
  .price{grid-column:2 / -1;padding-top:0}
  .fields{grid-column:1 / -1}
  .field{grid-template-columns:76px 1fr auto}
}
@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
</style>

<div class="wrap">
  <header class="mast">
    <div class="eyebrow">Fat City Entertainment · Fall 2026</div>
    <h1>Catalogue Callsheet</h1>
    <p class="lede">Every product in one pass. LemonSqueezy has never carried images, titles or descriptions — the site pages have always been the real storefront. While each product is open for its new price, paste in the rest. <strong>Prices marked with an arrow are proposed and not yet live anywhere.</strong></p>
  </header>

  <div class="stats">
    <div class="stat"><b>${rows.length}</b><span>Products</span></div>
    <div class="stat"><b>${nChanging}</b><span>Prices moving</span></div>
    <div class="stat"><b>${rows.length - nChanging}</b><span>Holding</span></div>
    <div class="stat"><b>${rows.filter((r) => r.thumb).length}</b><span>Images ready</span></div>
    <div class="stat"><b>${nNew}</b><span>New to create</span></div>
    <div class="stat"><b>${nUnwired}</b><span>No checkout</span></div>
  </div>

  <div class="controls">
    <input id="q" type="search" placeholder="Filter by name, pid or path…" aria-label="Filter products">
    <button class="ghost" id="only" type="button" aria-pressed="false">Only price changes</button>
    <button class="ghost" id="hide" type="button" aria-pressed="false">Hide done</button>
    <button class="ghost" id="reset" type="button">Reset ticks</button>
    <span class="prog" id="prog">0 / ${rows.length} done</span>
  </div>

  ${sections}

  <footer class="foot">
    <p><strong>Order matters.</strong> Change the price in LemonSqueezy first, then the site — LS charges, the site only displays. A page promising less than the checkout takes is the one failure worth avoiding. Once every product is updated, the site side is <code>set-usd-price.js</code> per product, then the six re-bake tools, then <code>check-links.js</code>.</p>
    <p>Ticks are stored in this browser only. Regenerate with <code>node _tools/build-ls-callsheet.js</code>.</p>
  </footer>
</div>

<script>
(function(){
  var KEY="fce_ls_callsheet_done_v1", done={};
  try{ done=JSON.parse(localStorage.getItem(KEY)||"{}")||{}; }catch(e){ done={}; }
  var rows=[].slice.call(document.querySelectorAll(".row"));
  var prog=document.getElementById("prog");

  function save(){ try{ localStorage.setItem(KEY,JSON.stringify(done)); }catch(e){} }
  function paint(){
    var n=0;
    rows.forEach(function(r){
      var on=!!done[r.dataset.pid];
      r.classList.toggle("done",on);
      r.querySelector("input[data-done]").checked=on;
      if(on) n++;
    });
    prog.textContent=n+" / "+rows.length+" done";
    filter();
  }
  rows.forEach(function(r){
    r.querySelector("input[data-done]").addEventListener("change",function(){
      if(this.checked) done[r.dataset.pid]=1; else delete done[r.dataset.pid];
      save(); paint();
    });
  });

  var q=document.getElementById("q"),
      only=document.getElementById("only"),
      hide=document.getElementById("hide");
  function filter(){
    var t=q.value.trim().toLowerCase(),
        o=only.getAttribute("aria-pressed")==="true",
        h=hide.getAttribute("aria-pressed")==="true";
    rows.forEach(function(r){
      var show=(!t||r.dataset.search.indexOf(t)!==-1)
            && (!o||!!r.querySelector(".now"))
            && (!h||!done[r.dataset.pid]);
      r.classList.toggle("hidden",!show);
    });
    document.querySelectorAll(".group").forEach(function(g){
      var any=g.querySelector(".row:not(.hidden)");
      g.style.display=any?"":"none";
    });
  }
  q.addEventListener("input",filter);
  [only,hide].forEach(function(b){
    b.addEventListener("click",function(){
      b.setAttribute("aria-pressed",b.getAttribute("aria-pressed")==="true"?"false":"true");
      filter();
    });
  });
  document.getElementById("reset").addEventListener("click",function(){
    done={}; save(); paint();
  });

  document.addEventListener("click",function(e){
    var b=e.target.closest(".copy"); if(!b) return;
    var v=b.getAttribute("data-val");
    var ok=function(){ b.classList.add("ok"); var o=b.textContent; b.textContent="Copied";
      setTimeout(function(){ b.classList.remove("ok"); b.textContent=o; },1100); };
    if(navigator.clipboard&&navigator.clipboard.writeText){
      navigator.clipboard.writeText(v).then(ok,function(){fallback(v,ok);});
    } else fallback(v,ok);
  });
  function fallback(v,ok){
    var ta=document.createElement("textarea");
    ta.value=v; ta.style.position="fixed"; ta.style.opacity="0";
    document.body.appendChild(ta); ta.select();
    try{ document.execCommand("copy"); ok(); }catch(e){}
    document.body.removeChild(ta);
  }

  paint();
})();
</script>`;

  fs.writeFileSync(OUT, html);
  const kb = (fs.statSync(OUT).size / 1024).toFixed(0);
  console.log(`wrote ${path.relative(REPO, OUT)}  (${rows.length} products, ${kb} KB)`);
  console.log(`  thumbnails inlined : ${rows.filter((r) => r.thumb).length}`);
  console.log(`  prices proposed    : ${nChanging}`);
  console.log(`  missing copy       : ${rows.filter((r) => !r.title).map((r) => r.pid).join(", ") || "none"}`);
})();
