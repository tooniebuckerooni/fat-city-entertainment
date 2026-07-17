/**
 * Weebly → static GitHub Pages transformer for fatcityentertainment.com
 *
 * - Exported root pages are cleaned in place.
 * - Scraped pages (_tools/scraped/**) are cleaned and written to their live-URL
 *   locations (extensionless URLs become <path>/index.html).
 * - All Weebly platform JS/CSS is removed or replaced with self-hosted assets.
 * - Product pages get a LemonSqueezy buy button driven by /assets/js/ls-links.js.
 */
const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");

const REPO = path.resolve(__dirname, "..");
const SCRAPED = path.join(__dirname, "scraped");
const DOMAIN = "https://www.fatcityentertainment.com";

const products = []; // { id, title, price, salePrice, urlPath }
const outputs = [];  // live URL paths of every page written (for sitemap parity check)

// ---------- helpers ----------
function cfDecode(hex) {
  const k = parseInt(hex.slice(0, 2), 16);
  let s = "";
  for (let i = 2; i < hex.length; i += 2) s += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16) ^ k);
  return s;
}

function walk(dir) {
  let out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out = out.concat(walk(p));
    else out.push(p);
  }
  return out;
}

const GTAG_SNIPPET = `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-LYMVV05F3X"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-LYMVV05F3X');
</script>`;

const REMOVE_SRC = [
  /editmysite\.com/i,
  /templateArtifacts/i,
  /gdpr\/gdprscript/i,
  /googleadservices\.com/i,
  /\/cdn-cgi\//i,
  /recaptcha/i,
];

const REMOVE_INLINE = [
  /_W[\s.=\[]/,
  /initCustomerAccountsModels|initMembershipModels|initFlyouts/,
  /com_currentSite|setup_rpc|configDomain|relinquish|STATIC_BASE|recaptchaUrl|themePlugins/,
  /IS_ARCHIVE\s*=/,
  /ASSETS_BASE\s*=|base_context\s*=/,
  /googletagmanager\.com\/gtag\/js\?id=UA-/, // old UA loader, replaced by G- snippet
  /UA-66104811/,
];

function transform(html, opts) {
  // opts: { livePath, isProduct, productId, depth }
  const $ = cheerio.load(html);

  // ----- stylesheets -----
  $("link[rel=stylesheet], link[title='wsite-theme-css']").each((_, el) => {
    const href = $(el).attr("href") || "";
    if (/site_membership\.css/.test(href)) return $(el).remove();
    if (/css\/sites\.css/.test(href)) return $(el).attr("href", "/assets/css/sites.css");
    if (/old\/fancybox\.css/.test(href)) return $(el).attr("href", "/assets/css/fancybox.css");
    if (/css\/social-icons\.css/.test(href)) return $(el).attr("href", "/assets/css/social-icons.css");
    if (/fonts\/Montserrat\/font\.css/.test(href)) return $(el).attr("href", "/assets/fonts/Montserrat/font.css");
    if (/fonts\/Open_Sans\/font\.css/.test(href)) return $(el).attr("href", "/assets/fonts/Open_Sans/font.css");
    if (/main_style\.css/.test(href)) return $(el).attr("href", "/files/main_style.css");
    if (/editmysite\.com/.test(href)) return $(el).remove(); // anything else from their CDN
  });
  // our extras (dropdown menus etc.)
  if (!$("link[href='/assets/css/site-extras.css']").length) {
    $("head").append('<link rel="stylesheet" type="text/css" href="/assets/css/site-extras.css" />\n');
  }

  // ----- inline style blocks: self-host wicons/wsocial fonts -----
  $("style").each((_, el) => {
    let css = $(el).html() || "";
    if (/editmysite\.com\/fonts\/w(Icons|Social)/.test(css)) {
      css = css.replace(/(?:https?:)?\/\/cdn\d*\.editmysite\.com\/fonts\/(wIcons|wSocial)\//g, "/assets/fonts/$1/");
      css = css.replace(/\?buildTime=\d+/gi, "");
      $(el).html(css);
    }
  });

  // ----- scripts -----
  let removedUA = false;
  $("script").each((_, el) => {
    const src = $(el).attr("src") || "";
    const text = $(el).html() || "";
    if (src) {
      if (/jquery-1\.8\.3/.test(src)) return $(el).attr("src", "/assets/js/jquery-1.8.3.min.js");
      if (/old\/slideshow-jq\.js/.test(src)) return $(el).attr("src", "/assets/js/slideshow-jq.js");
      if (/files\/theme\//.test(src)) { // normalize theme js to root-absolute
        return $(el).attr("src", "/" + src.replace(/^\//, "").replace(/^https?:\/\/[^/]+\//, ""));
      }
      if (REMOVE_SRC.some((re) => re.test(src))) return $(el).remove();
      if (/googletagmanager\.com\/gtag\/js\?id=UA-/.test(src)) { removedUA = true; return $(el).remove(); }
    } else {
      const type = $(el).attr("type") || "";
      if (type === "html/template") return $(el).remove();
      if (REMOVE_INLINE.some((re) => re.test(text))) {
        if (/UA-66104811/.test(text)) removedUA = true;
        return $(el).remove();
      }
    }
  });

  // ensure GA4 tag exists (scraped pages only had the dead UA- tag)
  if (!/G-LYMVV05F3X/.test($.html())) $("head").append(GTAG_SNIPPET + "\n");

  // ----- Weebly video embeds → native <video> -----
  $("script").each((_, el) => {
    const text = $(el).html() || "";
    if (!text.includes("generateVideo.php")) return;
    const vm = text.match(/video=([^&"'\\]+)/);
    const im = text.match(/image=([^&"'\\]+)/);
    const container = $(el).closest(".wsite-video-container");
    if (vm && container.length) {
      const poster = im ? ` poster="/uploads/${im[1]}"` : "";
      container.html(
        `<video controls preload="metadata" src="/uploads/${vm[1]}"${poster} style="width:100%;height:auto;background:#000;"></video>`
      );
    } else {
      $(el).remove();
    }
  });

  // ----- RSS feed links (no feed on a static host) -----
  $("p.blog-feed-link, link[type='application/rss+xml']").remove();

  // ----- platform leftovers -----
  $("#customer-accounts-app, #dialog-region, #member-login").remove();
  $("[id*='wsite-nav-cart'], .wsite-nav-cart").closest("li").remove();
  $("[class*='recaptcha'], [id*='recaptcha']").remove();

  // ----- Cloudflare email de-obfuscation -----
  $("span.__cf_email__").each((_, el) => {
    const email = cfDecode($(el).attr("data-cfemail") || "");
    $(el).replaceWith(email);
  });
  $("a[href*='email-protection']").each((_, el) => {
    const href = $(el).attr("href") || "";
    const m = href.match(/#([0-9a-f]+)$/i);
    if (m) $(el).attr("href", "mailto:" + cfDecode(m[1]));
    else $(el).attr("href", "mailto:" + $(el).text().trim());
  });

  // ----- forms: Weebly formSubmit.php cannot work on a static host -----
  $("form[action*='formSubmit']").each((_, el) => {
    $(el).attr("action", "https://formspree.io/f/YOUR_FORM_ID");
    $(el).attr("method", "POST");
    $(el).prepend("<!-- TODO: create a free form at https://formspree.io and replace YOUR_FORM_ID above -->");
  });
  if ($("form[action*='formspree']").length && !$("script[src='/assets/js/forms.js']").length) {
    $("body").append('<script src="/assets/js/forms.js"></script>\n');
  }

  // ----- own-domain absolute links → root-relative; https for metas -----
  const ownDomain = /^(https?:)?\/\/(www\.)?fatcityentertainment\.com/i;
  $("[href], [src]").each((_, el) => {
    for (const attr of ["href", "src"]) {
      const v = $(el).attr(attr);
      if (v && ownDomain.test(v) && el.tagName !== "link" && !(el.tagName === "meta")) {
        const rest = v.replace(ownDomain, "");
        $(el).attr(attr, rest === "" ? "/" : rest);
      }
    }
  });
  $("a[href='']").attr("href", "/");
  $("meta[property^='og:'][content], meta[itemprop][content]").each((_, el) => {
    const v = $(el).attr("content") || "";
    if (/^http:\/\/(www\.)?fatcityentertainment\.com/.test(v)) {
      $(el).attr("content", v.replace(/^http:/, "https:"));
    }
  });

  // canonical
  $("link[rel='canonical']").remove();
  const canonicalPath = opts.canonicalPath || opts.livePath;
  $("head").append(`<link rel="canonical" href="${DOMAIN}${canonicalPath}" />\n`);

  // ----- relative → root-absolute for root pages' local refs (safe everywhere) -----
  $("[href], [src]").each((_, el) => {
    for (const attr of ["href", "src"]) {
      const v = $(el).attr(attr);
      if (!v) continue;
      if (/^(uploads|files)\//.test(v)) $(el).attr(attr, "/" + v);
      else if (/^[a-z0-9_-]+\.html/i.test(v) && !/^https?:/i.test(v)) $(el).attr(attr, "/" + v);
    }
  });

  // ----- product pages: swap Weebly cart for LemonSqueezy -----
  if (opts.isProduct) {
    const pid = opts.productId;
    const title = $("#wsite-com-product-title").text().trim();
    const price = $("#wsite-com-product-price .wsite-com-product-price-amount").first().text().trim();
    const sale = $("#wsite-com-product-price-sale .wsite-com-product-price-amount").first().text().trim();
    products.push({ id: pid, title, price, salePrice: sale && sale !== price ? sale : "", urlPath: opts.livePath });

    $("#wsite-com-product-options, #wsite-com-product-modifiers, #wsite-com-product-inventory").remove();
    $("#wsite-com-product-buy").replaceWith(`
<div id="wsite-com-product-buy">
  <a id="wsite-com-product-add-to-cart" class="wsite-button wsite-button-large wsite-button-highlight wsite-buy-button ls-buy" data-product="${pid}" href="/contact.html" style="display:none">
    <span class="wsite-button-inner">Buy &amp; Download</span>
  </a>
  <p class="ls-pending" style="display:none;color:#777;font-size:14px;">
    This item is moving to our new checkout. <a href="/contact.html">Contact us</a> to order it directly.
  </p>
</div>`);
    $("body").append('<script src="/assets/js/ls-links.js"></script>\n<script src="/assets/js/ls-buy.js"></script>\n');
  }

  return $.html();
}

// ---------- run ----------
// 1) exported root pages
const rootPages = fs.readdirSync(REPO).filter(
  (f) => f.endsWith(".html") && f !== "404.html" && f !== "trivia-store.html"
);
for (const f of rootPages) {
  const p = path.join(REPO, f);
  const livePath = "/" + f;
  const html = fs.readFileSync(p, "utf8");
  fs.writeFileSync(p, transform(html, { livePath }));
  outputs.push(livePath);
}

// 2) scraped pages
const allUrls = fs.readFileSync(path.join(__dirname, "all-urls.txt"), "utf8")
  .replace(/^﻿/, "")
  .split(/\r?\n/).map((u) => u.trim()).filter(Boolean)
  .map((u) => decodeURIComponent(new URL(u).pathname));
const htmlUrlSet = new Set(allUrls);

for (const file of walk(SCRAPED)) {
  if (!file.endsWith(".html")) continue;
  const rel = path.relative(SCRAPED, file).replace(/\\/g, "/"); // e.g. store/p62/goldenoldies.html
  let livePath, outRel, canonicalPath;

  const decoded = decodeURIComponent(rel);
  if (rel === "trivia-store.html") {
    livePath = "/trivia-store.html";
    canonicalPath = "/store/c1/triviastore";
    outRel = "trivia-store.html";
  } else if (htmlUrlSet.has("/" + decoded) || /^store\/p\d+\//.test(decoded)) {
    // live URL genuinely ends in .html (all products, some categories)
    livePath = "/" + decoded;
    outRel = decoded;
  } else {
    // extensionless live URL → directory with index.html
    livePath = "/" + decoded.replace(/\.html$/, "");
    outRel = decoded.replace(/\.html$/, "") + "/index.html";
  }

  const m = livePath.match(/^\/store\/(p\d+)\//);
  const html = fs.readFileSync(file, "utf8");
  const out = transform(html, {
    livePath,
    canonicalPath,
    isProduct: !!m,
    productId: m ? m[1] : null,
  });
  const outPath = path.join(REPO, outRel.replace(/\//g, path.sep));
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, out);
  outputs.push(livePath);
}

// 3) ls-links.js (placeholder map, one line per product, sorted numerically)
products.sort((a, b) => parseInt(a.id.slice(1)) - parseInt(b.id.slice(1)));
const lsLines = products.map((p) =>
  `  "${p.id}": "", // ${p.title.replace(/"/g, "'")} — ${p.salePrice || p.price} — ${p.urlPath}`
);
fs.writeFileSync(path.join(REPO, "assets", "js", "ls-links.js"),
`// LemonSqueezy checkout links.
// As you re-add each product in LemonSqueezy, paste its "Share" / Buy Link URL
// between the quotes for the matching product below. The buy button on that
// product page goes live automatically; until then the page shows a
// "contact us to order" note instead.
window.LS_LINKS = {
${lsLines.join("\n")}
};
`);

// 4) LEMONSQUEEZY-TODO.md
const rows = products.map((p) =>
  `| ${p.id} | ${p.title.replace(/\|/g, "\\|")} | ${p.price}${p.salePrice ? " (sale " + p.salePrice + ")" : ""} | [${p.urlPath}](${p.urlPath.slice(1)}) |`
);
fs.writeFileSync(path.join(REPO, "LEMONSQUEEZY-TODO.md"),
`# LemonSqueezy re-listing checklist

All ${products.length} product pages were migrated with their original URLs.
Each page has a hidden **Buy & Download** button that activates as soon as you
paste that product's LemonSqueezy buy link into [assets/js/ls-links.js](assets/js/ls-links.js).

How to wire up a product:
1. Create the product in LemonSqueezy (upload the file, set the price).
2. Copy its **Buy Link** (Share button), e.g. \`https://yourstore.lemonsqueezy.com/buy/xxxx\`.
3. Paste it into \`assets/js/ls-links.js\` next to the matching product id.
4. Commit + push. The button opens LemonSqueezy's overlay checkout on the same page.

| ID | Product | Old price (CAD) | Page |
|----|---------|-----------------|------|
${rows.join("\n")}
`);

console.log(`pages written: ${outputs.length}`);
console.log(`products found: ${products.length}`);
const missingTitle = products.filter((p) => !p.title);
if (missingTitle.length) console.log("PRODUCTS MISSING TITLE:", missingTitle.map((p) => p.id).join(", "));
