// Unique meta descriptions on the store pages, and og: tags on the main pages.
//
// Three separate gaps, all outside the blog (fix-blog-meta.js covers that):
//
// 1. 47 product pages shared one of two boilerplate descriptions — "Great bingo
//    games ready to print and play..." on 40 of them, and the generic host-
//    resources blurb on 7. These are the pages that actually sell things, and in
//    a search result they all read identically. Each now gets a description built
//    from its own name and its own short description.
//
// 2. 25 main pages had no og:title/og:description at all, so a share of
//    /aboutus.html or /faqs.html fell back to whatever the platform scraped.
//    Every product page already had them.
//
// 3. A handful of one-off duplicates and blanks (the store landing page and its
//    category twin, bingocardgenerator2.html, submit.html).
//
// Descriptions are derived from copy already on the page — nothing is invented.
// The one addition is the Spotify/Apple Music line, and only on the 56 pages that
// genuinely link a playlist: it's the thing competitors selling PDF card sets
// don't do, and it was buried at the bottom of the body copy.
//
//   node _tools/fix-page-meta.js            # dry run
//   node _tools/fix-page-meta.js --write
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const WRITE = process.argv.includes("--write");
const MAX = 158;

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const clean = (s) =>
  s.replace(/<[^>]+>/g, " ")
   .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"')
   .replace(/&#39;|&rsquo;/g, "'")
   // Weebly rendered mailto links as this placeholder; it must not reach a
   // search result. "Email [email protected] to..." -> "Email us to...".
   .replace(/\bEmail\s+\[email\s*protected\]/gi, "Email us")
   .replace(/\[email\s*protected\]/gi, "us")
   .replace(/​/g, "")
   .replace(/\s+/g, " ").trim();

// Prefer cutting at a sentence end — a description that stops mid-clause and
// then starts a new sentence reads like a bug.
function trim(s, max = MAX) {
  if (s.length <= max) return s;
  const window = s.slice(0, max);
  const stop = Math.max(window.lastIndexOf(". "), window.lastIndexOf("! "), window.lastIndexOf("? "));
  if (stop > max * 0.5) return s.slice(0, stop + 1);
  return window.replace(/\s+\S*$/, "") + "…";
}

// Boilerplate that shows up on many pages at once — the thing we're replacing.
const GENERIC = [
  /^Great bingo games ready to print and play/i,
  /^Discover the official Fat City Trivia and Music Bingo host resources/i,
];

function walk(dir, out = []) {
  const SKIP = new Set(["_tools", "node_modules", ".git", ".claude", "_export", "_content", "pages"]);
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith(".html")) out.push(p);
  }
  return out;
}

function getTitle(html) {
  const m = html.match(/<title>([\s\S]*?)<\/title>/i);
  return m ? clean(m[1]) : null;
}
function getDesc(html) {
  const m = html.match(/<meta[^>]+name="description"[^>]+content="([^"]*)"/i);
  return m ? clean(m[1]) : null;
}
function setDesc(html, d) {
  const tag = `<meta name="description" content="${esc(d)}">`;
  if (/<meta[^>]+name="description"[^>]*>/i.test(html)) {
    return html.replace(/<meta[^>]+name="description"[^>]*>/i, tag);
  }
  // NB: replacer FUNCTION, not a replacement string. A string replacement
  // re-reads "$1", "$&" etc. inside the text being inserted, so any
  // description or title containing a dollar amount is silently mangled --
  // "$13.98" became "</title>3.98" in a live twitter:description tag.
  return html.replace(/(<\/title>)/i, (m, t) => `${t}\n${tag}`);
}

// Build a product's description out of its own name and short description.
function productDescription(html) {
  const name = clean((html.match(
    /<h1[^>]*id="wsite-com-product-title"[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || "");
  if (!name) return null;

  const short = clean((html.match(
    /<div id="wsite-com-product-short-description"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i) ||
    html.match(/<div id="wsite-com-product-short-description"[^>]*>([\s\S]*?)<div id=/i) || [])[1] || "");

  // Only claim the playlists where the page actually links them.
  const hasSpotify = /open\.spotify\.com/i.test(html);
  const hasApple = /music\.apple\.com|itunes\.apple\.com/i.test(html);
  let playlist = "";
  if (hasSpotify && hasApple) playlist = " Includes ready-made Spotify and Apple Music playlists.";
  else if (hasSpotify) playlist = " Includes a ready-made Spotify playlist.";
  else if (hasApple) playlist = " Includes a ready-made Apple Music playlist.";

  const room = MAX - name.length - 2 - playlist.length;
  let body = "";
  if (short && room > 40) {
    // First sentence or two of the product's own copy.
    body = trim(short.replace(/^[-–—\s]+/, ""), room);
  }

  const out = body ? `${name}. ${body}${playlist}` : `${name}.${playlist}`;
  return trim(out, MAX + 40); // the playlist line is worth a little overflow
}

let prodFixed = 0, ogAdded = 0, descAdded = 0, oneOffs = 0;

for (const file of walk(REPO).sort()) {
  const rel = path.relative(REPO, file).replace(/\\/g, "/");
  let html = fs.readFileSync(file, "utf8");
  const before = html;

  if (/http-equiv="refresh"/i.test(html)) continue;
  if (/content="noindex/i.test(html)) continue;

  // fix-blog-meta.js owns blog titles and descriptions; the og: block below
  // still runs, because the blog landing page has no og:title of its own.
  const isBlog = /^triviahostresources/.test(rel);
  const desc = getDesc(html);

  // 1. Product pages carrying boilerplate.
  if (!isBlog && /^store\/p\d+\//.test(rel) && (!desc || GENERIC.some((re) => re.test(desc)))) {
    const d = productDescription(html);
    if (d) { html = setDesc(html, d); prodFixed++; }
  }

  // Two pairs of pages that shipped with the same description as each other.
  if (rel === "officegames.html") {
    html = setDesc(html,
      "Office party games that actually land: buzzer-driven trivia and music " +
      "bingo built for team socials, holiday parties and staff events.");
    oneOffs++;
  }
  if (rel === "store/c1/triviastore/index.html") {
    html = setDesc(html,
      "Browse every downloadable trivia game show and music bingo pack in the " +
      "Fat City store — questions, answer keys and callsheets, ready to host.");
    oneOffs++;
  }

  // 3. One-off blanks and duplicates.
  if (rel === "bingocardgenerator2.html" && !getDesc(html)) {
    html = setDesc(html,
      "Compare the two Fat City bingo card generators side by side and pick the " +
      "one that fits your night — both make printable, randomized music bingo cards.");
    oneOffs++;
  }
  if (rel === "submit.html" && !getDesc(html)) {
    html = setDesc(html,
      "Submit your trivia questions, music bingo ideas and show suggestions to " +
      "the Fat City Entertainment team.");
    oneOffs++;
  }
  if (rel === "store/c1/triviastore/index.html") {
    // Shares a title with the /trivia-store.html landing page.
    html = html.replace(/<title>[\s\S]*?<\/title>/i,
      "<title>Trivia Store: Browse All Downloadable Trivia Games &amp; Music Bingo - Fat City Entertainment</title>");
    oneOffs++;
  }

  // 2. og:title / og:description for pages that have none.
  if (!/property="og:title"/i.test(html)) {
    const t = getTitle(html);
    const d = getDesc(html);
    if (t) {
      const tags =
        `<meta property="og:title" content="${esc(t)}">\n` +
        (d ? `<meta property="og:description" content="${esc(d)}">\n` : "") +
        `<meta property="og:type" content="website">`;
      html = html.replace(/(<link rel="canonical"[^>]*>)/i, (m, c) => `${c}\n${tags}`);
      if (html === before || !/property="og:title"/i.test(html)) {
        html = html.replace(/(<\/title>)/i, (m, t) => `${t}\n${tags}`);
      }
      ogAdded++;
    }
  }

  if (html !== before) {
    if (WRITE) fs.writeFileSync(file, html);
  }
}

console.log(`product descriptions rewritten : ${prodFixed}`);
console.log(`og: tags added                 : ${ogAdded}`);
console.log(`one-off fixes                  : ${oneOffs}`);
if (!WRITE) console.log("\nDRY RUN — nothing written. Re-run with --write.");
