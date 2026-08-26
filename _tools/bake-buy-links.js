// Put the checkout link in the HTML instead of waiting for JavaScript to add it.
//
// Every product page shipped its buy button hidden:
//
//   <a ... class="... ls-buy" data-product="p62" href="/contact.html" style="display:none">
//
// and assets/js/ls-buy.js filled in the real href and unhid it on DOMContentLoaded.
// The "contact us instead" fallback started hidden too, so until that script ran
// the page offered *no* call to action at all — and with JS blocked or broken,
// never would.
//
// This bakes the state that ls-buy.js would have produced straight into the markup:
//
//   wired product   -> href = its Lemon Squeezy checkout, button visible,
//                      .lemonsqueezy-button present so lemon.js still upgrades
//                      it to the overlay once loaded
//   unwired product -> button stays hidden, but the pending note is visible
//
// ls-buy.js keeps running and stays authoritative: it still loads lemon.js, drives
// the Amazon/KDP buttons and the .ls-price spans, and re-applies everything here
// idempotently. The difference is that the page now works before it runs, and
// without it. With JS off a click goes to Lemon Squeezy's hosted checkout rather
// than the on-page overlay — a completed purchase either way.
//
//   node _tools/bake-buy-links.js            # dry run
//   node _tools/bake-buy-links.js --write
//
// Re-run after editing ls-links.js; it rewrites from that file every time.
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const WRITE = process.argv.includes("--write");

// Read the link map out of ls-links.js without executing it.
const linksSrc = fs.readFileSync(path.join(REPO, "assets/js/ls-links.js"), "utf8");
const LINKS = {};
{
  const body = linksSrc.slice(
    linksSrc.indexOf("window.LS_LINKS"),
    linksSrc.indexOf("window.LS_PRICES")
  );
  for (const m of body.matchAll(/"(p\d+|handbook)":\s*"([^"]*)"/g)) LINKS[m[1]] = m[2];
}

const products = [];
for (const dir of fs.readdirSync(path.join(REPO, "store"))) {
  const full = path.join(REPO, "store", dir);
  if (!/^p\d+$/.test(dir) || !fs.statSync(full).isDirectory()) continue;
  for (const f of fs.readdirSync(full)) {
    if (f.endsWith(".html")) products.push(path.join(full, f));
  }
}

let wired = 0, pending = 0, untouched = 0, skipped = 0, alreadyVisible = 0;

for (const file of products.sort()) {
  let html = fs.readFileSync(file, "utf8");
  const before = html;

  // A redirect stub has no buy button; leave it alone.
  if (/http-equiv="refresh"/i.test(html)) { skipped++; continue; }

  const btn = html.match(/<a\b[^>]*\bclass="[^"]*\bls-buy\b[^"]*"[^>]*>/i);
  if (!btn) { skipped++; continue; }

  const pid = (btn[0].match(/data-product="([^"]+)"/) || [])[1];
  if (!pid) { skipped++; continue; }

  const link = LINKS[pid] || "";

  if (link) {
    let tag = btn[0];
    tag = tag.replace(/\s*style="display:none"/i, "");
    tag = tag.replace(/\shref="[^"]*"/i, ` href="${link}"`);
    // lemon.js binds the overlay to this class; ls-buy.js adds it at runtime, so
    // baking it keeps behaviour identical while surviving a JS failure.
    if (!/\blemonsqueezy-button\b/.test(tag)) {
      tag = tag.replace(/\bclass="([^"]*)"/i, (_, c) => `class="${c} lemonsqueezy-button"`);
    }
    html = html.replace(btn[0], tag);
    wired++;
  } else {
    // No link yet: keep the button hidden and reveal the fallback note instead.
    const beforeNote = html;
    html = html.replace(
      /(<p\b[^>]*\bclass="[^"]*\bls-pending\b[^"]*"[^>]*\bstyle=")display:none;\s*/i,
      "$1"
    );
    // Count what actually changed, not what we intended. This used to increment
    // unconditionally, so it reported "fallback revealed: 3" on every run even
    // though all three notes were already visible and nothing was written —
    // which reads exactly like three broken product pages and costs someone an
    // afternoon proving otherwise.
    if (html !== beforeNote) pending++;
    else alreadyVisible++;
  }

  if (html === before) untouched++;
  else if (WRITE) fs.writeFileSync(file, html);
}

console.log(`product pages     : ${products.length}`);
console.log(`buy link baked in : ${wired}`);
console.log(`fallback revealed : ${pending}`);
if (alreadyVisible) console.log(`fallback already shown: ${alreadyVisible}   (no ls-links entry, note visible — nothing to do)`);
console.log(`already correct   : ${untouched}`);
console.log(`no ls-buy button  : ${skipped}   (redirect stubs and the Amazon/KDP page)`);
if (!WRITE) console.log("\nDRY RUN — nothing written. Re-run with --write.");
