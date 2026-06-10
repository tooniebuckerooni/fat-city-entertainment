// Final fixups:
// - Weebly-era permalink forms (/4/post/YYYY/MM/slug.html, /blog/slug,
//   /inspiration/slug) → the post's real URL when the post exists.
// - Renamed pages that died years ago but have obvious successors.
// - Dead "Reply" buttons on archived blog comments (called weebly.com).
const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
const REPO = path.resolve(__dirname, "..");

function walk(dir) {
  let out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["_tools", "node_modules", ".git", ".claude"].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out = out.concat(walk(p));
    else if (e.name.endsWith(".html")) out.push(p);
  }
  return out;
}

const postExists = (slug) =>
  fs.existsSync(path.join(REPO, "triviahostresources", slug, "index.html"));

let changed = 0;
for (const f of walk(REPO)) {
  let html = fs.readFileSync(f, "utf8");
  const before = html;

  html = html.replace(/href="\/4\/post\/\d{4}\/\d{2}\/([^"]+?)\.html"/g, (m, slug) =>
    postExists(slug) ? `href="/triviahostresources/${slug}"` : m
  );
  html = html.replace(/href="\/(?:blog|inspiration)\/([^"\/]+?)"/g, (m, slug) =>
    postExists(slug) ? `href="/triviahostresources/${slug}"` : m
  );
  // Renamed/retired pages — targets confirmed against the live site's redirects.
  const PAGE_REDIRECTS = {
    "costumedcharacters.html": "/costumeperformers.html",
    "musicbingo.html": "/musicdoboffbingocards.html",
    "store.html": "/trivia-store.html",
    "comedynights.html": "/partyentertainment.html",
    "mobileentertainment.html": "/partyentertainment.html",
    "triviagameshows.html": "/partyentertainment.html",
    "publicevents.html": "/triviahostresources.html",
  };
  html = html.replace(/href="\/?([a-z]+\.html)"/g, (m, page) =>
    PAGE_REDIRECTS[page] ? `href="${PAGE_REDIRECTS[page]}"` : m
  );
  html = html.replace(/href="\/whatsnew\/(category\/[^"]+)"/g, 'href="/triviahostresources/$1"');
  // bare blog-index link is ambiguous next to the triviahostresources/ directory
  html = html.replace(/href="\/triviahostresources"/g, 'href="/triviahostresources.html"');

  // Old product/category slugs: Weebly redirected /store/p28/<old-slug> to the
  // current page for that id (or to the store if the id is gone); mirror that.
  html = html.replace(/href="\/?store\/([pc]\d+)\/([^"]*)"/g, (m, id, rest) => {
    const slug = decodeURIComponent(rest.split("?")[0].split("#")[0]);
    const dir = path.join(REPO, "store", id);
    if (!fs.existsSync(dir)) return `href="/trivia-store.html"`; // id gone: live site sends these to the store
    if (slug && fs.existsSync(path.join(dir, slug.replace(/\/$/, "")))) {
      return m.startsWith('href="/') ? m : `href="/store/${id}/${rest}"`;
    }
    const entries = fs.readdirSync(dir);
    const file = entries.find((e) => e.endsWith(".html"));
    if (file) return `href="/store/${id}/${encodeURI(file)}"`;
    const sub = entries.find((e) => fs.existsSync(path.join(dir, e, "index.html")));
    if (sub) return `href="/store/${id}/${sub}"`;
    return `href="/trivia-store.html"`;
  });

  if (html.includes("blogCommentDisplayForm") || html.includes("showCommentForm")) {
    const $ = cheerio.load(html);
    $("[onclick*='blogCommentDisplayForm'], a[href*='showCommentForm']").remove();
    // dead "Leave a Reply" iframe form (posted to weebly.com)
    $("iframe[src*='showCommentForm']").closest(".blogCommentReplyWrapper").remove();
    $(".blogCommentReplyWrapper, #commentReplyTitle, .blog-notice-comments-pending").remove();
    $(".blog-comment-form, #commentForm, .blogCommentForm").remove();
    html = $.html();
  }

  if (html !== before) {
    fs.writeFileSync(f, html);
    changed++;
  }
}
console.log("files fixed:", changed);
