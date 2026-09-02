// Give the blog's 168 list pages a title, a description and an <h1> of their own.
//
// Every one of them — the landing page, 59 archive months, 14 categories, 26
// pagination pages and their nested page-2+ variants — shipped the identical
// title tag:
//
//     Trivia Host Resources - Fat City Entertainment Blog - Fat City Entertainment
//
// (brand name twice, and the same string on 181 URLs). None had a meta
// description, and none had an <h1>: fix-headings.js skips them deliberately,
// because .blog-title appears once per post in the list, so promoting the first
// would make one post's title the heading for the entire page.
//
// So each page gets metadata describing what that list actually is. It also
// fills in descriptions for the 15 individual posts that lack one, drawn from
// the post's own opening paragraph rather than invented.
//
//   node _tools/fix-blog-meta.js            # dry run
//   node _tools/fix-blog-meta.js --write
//
// Re-run after publishing posts. Idempotent — it rewrites from scratch each time.
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const WRITE = process.argv.includes("--write");
const BRAND = " - Fat City Entertainment";

const MONTHS = ["January","February","March","April","May","June",
                "July","August","September","October","November","December"];

// Slug -> the name used in the site's own nav and category links.
const CATEGORY_NAMES = {
  "all": "All Posts",
  "bingo-card-ideas": "Bingo Card Ideas",
  "entertainment": "Entertainment",
  "fat-city-faces": "Fat City Faces",
  "free-events": "Free Events",
  "holidays": "Holidays",
  "life-pro-tips": "Life Pro Tips",
  "music-bingo": "Music Bingo",
  "sports-pub-night": "Sports Pub Night",
  "standup-comedy": "Standup Comedy",
  "triv101": "Triv101",
  "trivia-hosting": "Trivia Hosting",
  "video-game-trivia": "Video Game Trivia",
  "vr-trivia": "VR Trivia",
};

// Written to read naturally when the sentence below appends " — from the Fat
// City Entertainment blog.", so none of these should end in the word "blog".
const CATEGORY_BLURBS = {
  "all": "Every post we've published, newest first",
  "bingo-card-ideas": "Bingo card themes, layouts and printing tips",
  "entertainment": "Notes on live entertainment and running a room",
  "fat-city-faces": "The hosts, performers and regulars behind Fat City",
  "free-events": "Free games, giveaways and open events",
  "holidays": "Seasonal and holiday games for every time of year",
  "life-pro-tips": "Practical tips picked up from a decade of hosting",
  "music-bingo": "How to run music bingo, and the playlists that work",
  "sports-pub-night": "Sports trivia and game nights for pubs",
  "standup-comedy": "Comedy nights and the craft of working a crowd",
  "triv101": "The Triv101 countdown game show",
  "trivia-hosting": "Running a trivia night, from prep to prizes",
  "video-game-trivia": "Video game trivia rounds and themed nights",
  "vr-trivia": "Virtual reality and remote trivia",
};

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith(".html")) out.push(p);
  }
  return out;
}

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// What kind of blog page is this, and what should it be called?
function classify(rel) {
  if (rel === "triviahostresources.html") {
    return {
      kind: "landing",
      h1: "Trivia Host Resources",
      title: "Trivia Host Resources: Music Bingo & Trivia Hosting Blog",
      desc: "Ten years of notes on running music bingo, trivia nights and game " +
            "shows — playlists, hosting tips, and what actually works with a live crowd.",
    };
  }

  let m = rel.match(/^triviahostresources\/previous\/(\d+)\//);
  if (m) {
    const n = m[1];
    return {
      kind: "pagination",
      h1: `Trivia Host Resources — Page ${n}`,
      title: `Trivia Host Resources — Page ${n}`,
      desc: `Page ${n} of the Fat City Entertainment blog: music bingo, trivia ` +
            `hosting and game show notes from a decade of live shows.`,
    };
  }

  m = rel.match(/^triviahostresources\/archives\/(\d{2})-(\d{4})\/(?:(\d+)\/)?/);
  if (m) {
    const month = MONTHS[parseInt(m[1], 10) - 1];
    const year = m[2];
    const page = m[3];
    const label = `${month} ${year}`;
    return {
      kind: "archive",
      h1: page ? `${label} Archive — Page ${page}` : `${label} Archive`,
      title: page
        ? `Trivia Host Resources: ${label} Archive — Page ${page}`
        : `Trivia Host Resources: ${label} Archive`,
      desc: page
        ? `Music bingo and trivia hosting posts from ${label} — page ${page} of ` +
          `the ${label} archive on the Fat City Entertainment blog.`
        : `Music bingo and trivia hosting posts published in ${label} on the ` +
          `Fat City Entertainment blog.`,
    };
  }

  m = rel.match(/^triviahostresources\/category\/([^/]+)\/(?:(\d+)\/)?/);
  if (m) {
    const slug = m[1];
    const page = m[2];
    const name = CATEGORY_NAMES[slug] ||
      slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    const blurb = CATEGORY_BLURBS[slug] || `Posts about ${name.toLowerCase()}`;
    return {
      kind: "category",
      h1: page ? `${name} — Page ${page}` : name,
      title: page
        ? `${name}: Trivia Host Resources — Page ${page}`
        : `${name}: Trivia Host Resources`,
      // The page number has to be in here, or all 27 pages of a long category
      // share one description and Google treats them as near-duplicates.
      desc: page
        ? `${blurb} — page ${page} of the ${name} archive on the Fat City Entertainment blog.`
        : `${blurb} — from the Fat City Entertainment blog.`,
    };
  }

  return null; // an individual post
}

// A post's own headline, for the ones whose <title> is the generic blog title.
function postTitle(html) {
  const m = html.match(/<h1[^>]*\bclass="[^"]*\bblog-title\b[^"]*"[^>]*>([\s\S]*?)<\/h1>/i)
         || html.match(/<h2[^>]*\bclass="[^"]*\bblog-title\b[^"]*"[^>]*>([\s\S]*?)<\/h2>/i);
  if (!m) return null;
  const text = m[1]
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > 3 ? text : null;
}

// First real sentence or two of a post, for the posts with no description.
function describePost(html) {
  const body = html.slice(html.indexOf('class="blog-post"'));
  const paras = [...body.matchAll(/<(?:p|div class="paragraph")[^>]*>([\s\S]*?)<\/(?:p|div)>/gi)];
  for (const p of paras) {
    const text = p[1]
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ")
      .trim();
    if (text.length < 60) continue;
    return text.length > 155 ? text.slice(0, 152).replace(/\s+\S*$/, "") + "…" : text;
  }
  return null;
}

function setTitle(html, title) {
  return html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${esc(title)}</title>`);
}

function setDescription(html, desc) {
  const tag = `<meta name="description" content="${esc(desc)}">`;
  if (/<meta[^>]+name="description"[^>]*>/i.test(html)) {
    return html.replace(/<meta[^>]+name="description"[^>]*>/i, tag);
  }
  // Sit it right after the title, where the rest of the site keeps it.
  // NB: replacer FUNCTION, not a replacement string. A string replacement
  // re-reads "$1", "$&" etc. inside the text being inserted, so any
  // description or title containing a dollar amount is silently mangled --
  // "$13.98" became "</title>3.98" in a live twitter:description tag.
  return html.replace(/(<\/title>)/i,
    (m, t) => `${t}\n<meta name="description" content="${esc(desc)}">`);
}

// List pages have no heading of their own; put one above the list of posts.
function addListHeading(html, text) {
  if (/<h1[\s>]/i.test(html)) return html;
  const anchor = html.indexOf('<div id="wsite-content">');
  if (anchor === -1) return html;
  const at = anchor + '<div id="wsite-content">'.length;
  return (
    html.slice(0, at) +
    `<h1 class="wsite-content-title blog-list-title">${esc(text)}</h1>` +
    html.slice(at)
  );
}

const files = ["triviahostresources.html", ...walk(path.join(REPO, "triviahostresources"))]
  .map((f) => (path.isAbsolute(f) ? f : path.join(REPO, f)));

let lists = 0, postDescs = 0, postTitles = 0, headings = 0, untouched = 0;
const seenTitles = new Map();

for (const file of files.sort()) {
  const rel = path.relative(REPO, file).replace(/\\/g, "/");
  let html = fs.readFileSync(file, "utf8");
  const before = html;

  const info = classify(rel);

  if (info) {
    html = setTitle(html, info.title + BRAND);
    html = setDescription(html, info.desc);
    const withH1 = addListHeading(html, info.h1);
    if (withH1 !== html) headings++;
    html = withH1;
    lists++;
  } else {
    // An individual post. 14 of them inherited the generic blog title instead of
    // their own, so a search result for the post showed the blog's name.
    const cur = (html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || "";
    if (/Fat City Entertainment Blog\b/i.test(cur)) {
      const t = postTitle(html);
      if (t) { html = setTitle(html, t + BRAND); postTitles++; }
    }
    if (!/<meta[^>]+name="description"/i.test(html)) {
      const d = describePost(html);
      if (d) { html = setDescription(html, d); postDescs++; }
    }
  }

  const t = (html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1];
  if (t) seenTitles.set(t, (seenTitles.get(t) || 0) + 1);

  if (html === before) untouched++;
  else if (WRITE) fs.writeFileSync(file, html);
}

const dupes = [...seenTitles.entries()].filter(([, n]) => n > 1);
console.log(`blog pages processed  : ${files.length}`);
console.log(`list pages retitled   : ${lists}`);
console.log(`  of which got an h1  : ${headings}`);
console.log(`post descriptions add : ${postDescs}`);
console.log(`post titles fixed     : ${postTitles}`);
console.log(`unchanged             : ${untouched}`);
console.log(`duplicate titles left : ${dupes.length}`);
dupes.slice(0, 5).forEach(([t, n]) => console.log(`    ${n}x  ${t.slice(0, 80)}`));
if (!WRITE) console.log("\nDRY RUN — nothing written. Re-run with --write.");
