// Scaffold a new store product from an existing one.
//
// A product on this site isn't one file. It's a product page under a URL that
// has to match the /store/pNN/ scheme, a tile on one or more category pages, an
// entry in ls-links.js, and a line in sitemap.xml — plus title, description,
// og: tags and JSON-LD that all have to agree with each other. Hand-editing that
// is how a page ends up advertising one price while the checkout charges
// another, which is exactly the p140 bug POST-LAUNCH.md records.
//
// So new products are cloned from a real one, the same way publish-post.js
// clones a blog post. Everything product-specific is swapped; everything else —
// theme, nav, footer, scripts — comes along unchanged and stays consistent with
// the rest of the store.
//
// Define products in _tools/new-products.json, then:
//
//   node _tools/new-product.js            # dry run, reports what it would build
//   node _tools/new-product.js --write
//   node _tools/new-product.js --write --force   # also rebuild existing pages
//   node _tools/new-product.js --write --force --only p169,p170
//
// New products are created STAGED: noindex, not in the sitemap, no category
// tile. Nothing is public until you pass --publish for that id, which is
// deliberate — a half-finished product page on a live store is worse than none.
//
// After --publish, run:
//   node _tools/add-jsonld.js --write     (Product schema for the new page)
//   node _tools/sitemap-lastmod.js --write
//
// The buy button stays in its "contact us to order" state until you add a Lemon
// Squeezy link to ls-links.js and run bake-buy-links.js — same as any unwired
// product today.
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const WRITE = process.argv.includes("--write");
const PUBLISH = process.argv.includes("--publish");
// Regenerate a product whose page already exists. Off by default so a run
// that stages one new product cannot rewrite the rest of the catalogue.
const FORCE = process.argv.includes("--force");
// Limit a run to specific ids: --only p169,p170. Pairs with --force so an
// existing page can be rebuilt without putting the whole catalogue at risk.
const ONLY = (() => {
  const i = process.argv.indexOf("--only");
  if (i === -1 || !process.argv[i + 1]) return null;
  return new Set(process.argv[i + 1].split(",").map((x) => x.trim()).filter(Boolean));
})();
const SPEC = path.join(__dirname, "new-products.json");

if (!fs.existsSync(SPEC)) {
  console.error(`No spec found at ${path.relative(REPO, SPEC)}.`);
  process.exit(1);
}
const specs = JSON.parse(fs.readFileSync(SPEC, "utf8"));

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
  .replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function nextFreeId(taken) {
  let n = 164; // highest live id is p163
  while (taken.has("p" + n)) n++;
  return "p" + n;
}

const existing = new Set(
  fs.readdirSync(path.join(REPO, "store")).filter((d) => /^p\d+$/.test(d))
);

let built = 0, published = 0, skipped = 0;
const report = [];

for (const spec of specs) {
  const required = ["slug", "name", "price", "template", "description"];
  const missing = required.filter((k) => !spec[k]);
  if (missing.length) {
    console.error(`  SKIP ${spec.slug || "(no slug)"} — missing: ${missing.join(", ")}`);
    skipped++;
    continue;
  }

  const pid = spec.id || nextFreeId(existing);
  existing.add(pid);
  if (ONLY && !ONLY.has(pid)) { skipped++; continue; }
  const num = pid.slice(1);

  const templatePath = path.join(REPO, spec.template);
  if (!fs.existsSync(templatePath)) {
    console.error(`  SKIP ${spec.slug} — template not found: ${spec.template}`);
    skipped++;
    continue;
  }

  // Never silently rewrite a product that already exists. The spec file is
  // append-only in practice, so every run used to regenerate EVERY product in
  // it — meaning "stage one new product" quietly rewrote live pages from their
  // templates. That is how p167's artwork was overwritten during an unrelated
  // change. Regenerating is still available, but you have to ask for it.
  if (fs.existsSync(path.join(REPO, "store", pid)) && !FORCE) {
    console.log(`  keep ${pid}  ${spec.name} — already exists (--force to regenerate)`);
    skipped++;
    continue;
  }

  const tplId = (spec.template.match(/store\/(p\d+)\//) || [])[1];
  const tplNum = tplId.slice(1);
  let html = fs.readFileSync(templatePath, "utf8");

  const outDir = path.join(REPO, "store", pid);
  const outFile = path.join(outDir, `${spec.slug}.html`);
  const url = `https://www.fatcityentertainment.com/store/${pid}/${spec.slug}.html`;

  // --- identifiers -------------------------------------------------------
  html = html.replace(new RegExp(`data-product="${tplId}"`, "g"), `data-product="${pid}"`);
  html = html.replace(new RegExp(`data-id="${tplNum}"`, "g"), `data-id="${num}"`);

  // --- name --------------------------------------------------------------
  const tplName = (html.match(/<h1[^>]*id="wsite-com-product-title"[^>]*>([\s\S]*?)<\/h1>/i) || [])[1];
  if (tplName) {
    html = html.replace(
      /(<h1[^>]*id="wsite-com-product-title"[^>]*>)[\s\S]*?(<\/h1>)/i,
      `$1\n\t\t\t\t\t\t${esc(spec.name)}\n\t\t\t\t\t$2`
    );
  }

  // --- head metadata -----------------------------------------------------
  html = html.replace(/<title>[\s\S]*?<\/title>/i,
    `<title>${esc(spec.title || spec.name)} - Fat City Entertainment</title>`);
  html = html.replace(/<meta[^>]+name="description"[^>]*>/i,
    `<meta name="description" content="${esc(spec.description)}">`);
  html = html.replace(/<link rel="canonical" href="[^"]*"/i, `<link rel="canonical" href="${url}"`);
  html = html.replace(/<meta property="og:url" content="[^"]*"/i, `<meta property="og:url" content="${url}"`);
  html = html.replace(/<meta property="og:title" content="[^"]*"/i,
    `<meta property="og:title" content="${esc(spec.title || spec.name)}"`);
  html = html.replace(/<meta property="og:description" content="[^"]*"/i,
    `<meta property="og:description" content="${esc(spec.description)}"`);

  // --- price -------------------------------------------------------------
  // Both the visible amounts and the microdata, so they can't drift apart.
  html = html.replace(/(itemprop="price"[^>]*content=")[^"]*(")/i, `$1${spec.price}$2`);
  html = html.replace(/<span class="wsite-com-product-price-amount"([^>]*)>[^<]*<\/span>/gi,
    (m, attrs) => `<span class="wsite-com-product-price-amount"${attrs}>$${spec.price} USD</span>`);

  // --- body copy ---------------------------------------------------------
  if (spec.body) {
    html = html.replace(
      /(<div id="wsite-com-product-short-description"[^>]*>)[\s\S]*?(<\/div>\s*<\/div>)/i,
      `$1\n${spec.body}\n$2`
    );
  }

  // --- breadcrumbs -------------------------------------------------------
  // Rebuilt rather than patched: the template's trail names its own category
  // and its own product, both wrong for the clone. Without this a Word Nerd
  // bundle tells the visitor they are under Eras > "Decades" 5-Pack.
  {
    const trail = spec.breadcrumb || [
      { name: "Trivia Store", href: "/store/c1/triviastore" },
      { name: "Music Bingo Card Downloads", href: "/store/c11/musicdoboff" },
    ];
    const arrow =
      '\n\t\t\t<li class="wsite-com-breadcrumb">\n\t\t\t\t' +
      '<span class="wsite-com-breadcrumb-arrow">&gt;</span>\n\t\t\t</li>';
    const links = trail
      .map(
        (t) =>
          '\n\t\t<li class="wsite-com-breadcrumb">\n\t\t\t' +
          `<a href="${t.href}" class="wsite-com-link">\n\t\t\t\t` +
          `<span class="wsite-com-link-text">${esc(t.name)}</span>\n\t\t\t</a>\n\t\t</li>`
      )
      .join(arrow);
    const self =
      arrow +
      '\n\t\t<li class="wsite-com-breadcrumb">\n\t\t\t' +
      `<span class="wsite-com-link-text">${esc(spec.name)}</span>\n\t\t</li>`;
    html = html.replace(
      /<ul id="wsite-com-breadcrumbs"[^>]*>[\s\S]*?<\/ul>/i,
      `<ul id="wsite-com-breadcrumbs" class="wsite-com-product-breadcrumbs">${links}${self}\n\t</ul>`
    );
  }

  // Weebly left an embedded product JSON blob in a data- attribute. Nothing
  // reads it now, but leaving the template's price in it is a trap for anyone
  // who greps the repo for what a product costs.
  html = html.replace(/(&quot;price&quot;:)\d+(?:\.\d+)?/g, `$1${parseFloat(spec.price)}`);

  // --- image -------------------------------------------------------------
  if (spec.image) {
    // Old Weebly renders, still used by some templates.
    html = html.replace(
      new RegExp(`/uploads/4/3/3/6/43362499/s240281505130794070_${tplId}_i\\d+_w\\d+\\.(?:jpe?g|png|webp)`, "g"),
      spec.image
    );

    // Templates whose art has since been renamed to something human-readable
    // (the-wild-west-trivia-game-show.png) matched nothing above, so the clone
    // silently kept the TEMPLATE's artwork — a staged product showing another
    // product's picture. Swap by filename stem instead, which also catches the
    // .webp twin: product images sit in a <picture> whose <source> is WebP, so
    // replacing only the .png leaves every modern browser still rendering the
    // template's image.
    const tplTag =
      (html.match(/<img[^>]*wsite-com-product-images-main-image[^>]*>/i) || [])[0] || "";
    const tplSrc = (tplTag.match(/src="([^"?]*)(?:\?[^"]*)?"/) || [])[1];
    if (tplSrc) {
      const tplStem = tplSrc.replace(/\.[a-z0-9]+$/i, "");
      const newStem = spec.image.replace(/\.[a-z0-9]+$/i, "");
      const newExt = (spec.image.match(/\.([a-z0-9]+)$/i) || [, "png"])[1];
      const onDisk = (p) => fs.existsSync(path.join(REPO, p.replace(/^\//, "")));

      if (tplStem && tplStem !== newStem) {
        // Templates carry -full and -thumb zoom variants beside the main image.
        // A blind stem swap invents filenames for variants the new product does
        // not have, so resolve each reference against the disk and fall back to
        // the main image. The extension comes from the spec, not the template —
        // swapping golden-oldies.jpeg to punk-rock-music-bingo.jpeg when the
        // real file is a .png is how a product ends up with no artwork at all.
        const re = new RegExp(
          tplStem.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "([a-z0-9-]*)\\.(jpe?g|png|webp)",
          "gi"
        );
        html = html.replace(re, (m, suffix, ext) => {
          const want = ext.toLowerCase() === "webp" ? "webp" : newExt;
          const variant = `${newStem}${suffix}.${want}`;
          if (onDisk(variant)) return variant;
          const main = `${newStem}.${want}`;
          return onDisk(main) ? main : variant;
        });
      }
    }
    // Alt text otherwise still names the template's product.
    html = html.replace(
      /(<img[^>]*wsite-com-product-images-main-image[^>]*\balt=")[^"]*(")/i,
      `$1${esc(spec.name)}$2`
    );
  }

  // --- JSON-LD -----------------------------------------------------------
  // Drop the template's block; add-jsonld.js regenerates it correctly on publish.
  html = html.replace(/<!-- fce:jsonld -->[\s\S]*?<!-- \/fce:jsonld -->\n?/i, "");

  // --- staged unless published -------------------------------------------
  const isPublished = PUBLISH && (spec.publish === true);
  if (!isPublished) {
    if (!/name="robots"/i.test(html)) {
      html = html.replace(/(<\/title>)/i, `$1\n<meta name="robots" content="noindex">`);
    } else {
      html = html.replace(/<meta name="robots"[^>]*>/i, `<meta name="robots" content="noindex">`);
    }
    // The template is a real, already-wired product, so its buy button clones
    // in live and pointing at the TEMPLATE's checkout — a staged page would
    // otherwise sell whatever the template sells. Reset it to the same
    // hidden/"contact us" state bake-buy-links.js gives any unwired product,
    // regardless of what ls-links.js says for this pid (it may still carry a
    // stale link from a template that has since moved on).
    html = html.replace(
      /(<a\b[^>]*\bclass="[^"]*\bls-buy\b[^"]*")([^>]*)>/i,
      (m, head, rest) => {
        rest = rest.replace(/\s+target="_blank"/i, "")
                    .replace(/\s+rel="noopener"/i, "")
                    .replace(/\s+href="[^"]*"/i, ' href="/contact.html"');
        if (!/style="display:none"/i.test(rest)) rest += ' style="display:none"';
        return `${head.replace(/\s+lemonsqueezy-button\b/, "")}${rest}>`;
      }
    );
    // Same for the "contact us" fallback note — make sure it's visible so a
    // staged page still shows a call to action instead of none at all.
    html = html.replace(
      /(<p\b[^>]*\bclass="[^"]*\bls-pending\b[^"]*"[^>]*\bstyle=")display:none;\s*/i,
      "$1"
    );
  } else {
    html = html.replace(/\s*<meta name="robots" content="noindex">/i, "");
  }

  report.push({
    pid, slug: spec.slug, name: spec.name, price: spec.price,
    staged: !isPublished, file: `store/${pid}/${spec.slug}.html`,
    template: spec.template, includes: spec.includes || [],
  });

  if (WRITE) {
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(outFile, html);

    // ls-links.js entry, left blank so the page shows its "contact us" note
    // until a real checkout link exists.
    const lsPath = path.join(REPO, "assets/js/ls-links.js");
    let ls = fs.readFileSync(lsPath, "utf8");
    if (!new RegExp(`"${pid}":`).test(ls)) {
      const line = `  "${pid}": "", // [ ] ${spec.name} — $${spec.price} USD — /store/${pid}/${spec.slug}.html`;
      // LS_LINKS closes with a bare "}" on its own line, not "};" — an earlier
      // version searched for "};" and silently dropped four products' entries
      // into LS_PRICES instead, so their buy buttons kept the template's link
      // and pointed at the wrong product's checkout.
      const rows = ls.split("\n");
      const from = rows.findIndex((l) => l.includes("window.LS_LINKS"));
      const close = rows.findIndex((l, i) => i > from && l.trim() === "}");
      if (from === -1 || close === -1) throw new Error("could not locate the LS_LINKS block in ls-links.js");
      rows.splice(close, 0, line);
      ls = rows.join("\n");
      fs.writeFileSync(lsPath, ls);
    }
  }
  built++;
  if (isPublished) published++;
}

console.log(`products in spec : ${specs.length}`);
console.log(`built            : ${built}`);
console.log(`published        : ${published}`);
console.log(`skipped          : ${skipped}\n`);
for (const r of report) {
  console.log(`  ${r.pid}  ${r.name}`);
  console.log(`        $${r.price} USD   ${r.staged ? "STAGED (noindex, unlinked)" : "PUBLISHED"}`);
  console.log(`        ${r.file}   from ${r.template}`);
  if (r.includes.length) console.log(`        bundles: ${r.includes.join(", ")}`);
}
if (!WRITE) console.log("\nDRY RUN — nothing written. Re-run with --write.");
else if (!PUBLISH) console.log("\nAll staged. Set \"publish\": true in the spec and re-run with --write --publish to go live.");
