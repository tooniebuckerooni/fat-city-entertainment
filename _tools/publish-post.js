// Publish a markdown draft from _content/drafts/ as a blog post.
//
//   node publish-post.js <draft.md> <slug> [--date M/D/YYYY] [--write]
//
// The blog is static Weebly output, so a post is built by cloning an existing
// post as a template and swapping its variable parts: title, description,
// canonical, og tags, the slug in every self-link, the date, and the body.
//
// Drafts carry a small header of SEO fields, then markdown:
//
//   **Title tag:** ...
//   **Meta description:** ...
//   **Target keyword:** ...
//   # H1            <- the on-page post title
//   ...body...
//
// Bracketed placeholders like [Music Bingo Gold Club] are resolved through the
// LINKS map below. An unresolved placeholder is a hard error rather than shipped
// as literal brackets.

const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "..");
const BLOG = path.join(REPO, "triviahostresources");
const TEMPLATE = path.join(BLOG, "get-wild-with-zoo-rock-music-bingo-cards", "index.html");

const args = process.argv.slice(2);
const WRITE = args.includes("--write");
const draftPath = args[0];
const slug = args[1];
const dateArg = (() => {
  const i = args.indexOf("--date");
  return i > -1 ? args[i + 1] : null;
})();
if (!draftPath || !slug) {
  console.error("usage: node publish-post.js <draft.md> <slug> [--date M/D/YYYY] [--write]");
  process.exit(1);
}

// Placeholder text -> destination. Matched case-insensitively on the bracket text.
const LINKS = {
  "try the free bingo card generator": "/bingocardgenerator.html",
  "the free bingo card generator": "/bingocardgenerator.html",
  "bingo card generator pro": "/store/p65/bingocardgeneratorpro.html",
  "music bingo gold club": "/store/p112/GoldClub.html",
  "explore music bingo gold club": "/store/p112/GoldClub.html",
  "playlist guide": "/triviahostresources/decade-by-decade-music-bingo-playlist-guide",
  "hosting guide": "/triviahostresources/how-to-run-a-music-bingo-night",
};

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// ------------------------------------------------------------------ draft parse
const raw = fs.readFileSync(path.resolve(draftPath), "utf8");
const field = (name) => {
  const m = raw.match(new RegExp(`\\*\\*${name}:\\*\\*\\s*(.+)`));
  return m ? m[1].trim() : null;
};
const titleTag = field("Title tag");
const metaDesc = field("Meta description");
if (!titleTag || !metaDesc) {
  console.error("draft is missing **Title tag:** or **Meta description:**");
  process.exit(1);
}
const bodyMd = raw.slice(raw.indexOf("\n# ") + 1);
const h1 = bodyMd.match(/^#\s+(.+)/)[1].trim();

// ------------------------------------------------------------- markdown -> html
const unresolved = [];
function inline(t) {
  t = esc(t);
  // [text](url) first, then bare [text] placeholders
  t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, txt, url) => `<a href="${url}">${txt}</a>`);
  t = t.replace(/\[([^\]]+)\]/g, (m, txt) => {
    const clean = txt.replace(/\s*(→|-&gt;)\s*$/, "").trim();
    const href = LINKS[clean.toLowerCase()];
    if (!href) { unresolved.push(clean); return m; }
    return `<a href="${href}">${clean}</a>`;
  });
  t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  t = t.replace(/(^|[\s(])\*([^*]+)\*/g, "$1<em>$2</em>");
  return t;
}

function toHtml(md) {
  const out = [];
  const lines = md.split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^#\s/.test(line)) { i++; continue; }          // H1 handled separately
    if (/^##\s/.test(line)) {
      out.push(`<h2 class="wsite-content-title">${inline(line.replace(/^##\s+/, ""))}</h2>`);
      i++; continue;
    }
    if (/^\s*$/.test(line)) { i++; continue; }
    if (/^[-*]\s/.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i])) {
        items.push(`<li>${inline(lines[i].replace(/^[-*]\s+/, ""))}</li>`); i++;
      }
      out.push(`<div class="paragraph"><ul>${items.join("")}</ul></div>`);
      continue;
    }
    if (/^\d+\.\s/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(`<li>${inline(lines[i].replace(/^\d+\.\s+/, ""))}</li>`); i++;
      }
      out.push(`<div class="paragraph"><ol>${items.join("")}</ol></div>`);
      continue;
    }
    // GFM pipe table: a "| … |" row followed by a "| --- | --- |" separator.
    if (/^\|(.+)\|\s*$/.test(line) && i + 1 < lines.length && /^\|[\s:|-]+\|\s*$/.test(lines[i + 1])) {
      const cells = (row) => row.replace(/^\||\|\s*$/g, "").split("|").map((c) => c.trim());
      const head = cells(line);
      i += 2; // consume header + separator
      const rows = [];
      while (i < lines.length && /^\|(.+)\|\s*$/.test(lines[i])) { rows.push(cells(lines[i])); i++; }
      const thead = `<thead><tr>${head.map((h) => `<th>${inline(h)}</th>`).join("")}</tr></thead>`;
      const tbody = `<tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody>`;
      out.push(`<div class="paragraph"><table class="fce-table">${thead}${tbody}</table></div>`);
      continue;
    }
    const para = [];
    while (i < lines.length && !/^\s*$/.test(lines[i]) && !/^(#|[-*]\s|\d+\.\s|\|)/.test(lines[i])) {
      para.push(lines[i]); i++;
    }
    out.push(`<div class="paragraph">${inline(para.join(" "))}<br></div>`);
  }
  return out.join("\n\n");
}

const contentHtml = toHtml(bodyMd);
if (unresolved.length) {
  console.error("unresolved placeholder link(s) — add them to LINKS:");
  for (const u of new Set(unresolved)) console.error(`  [${u}]`);
  process.exit(1);
}

// ----------------------------------------------------------------- build page
const tpl = fs.readFileSync(TEMPLATE, "utf8");
const TSLUG = "get-wild-with-zoo-rock-music-bingo-cards";
const now = new Date();
const date = dateArg || `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`;

let page = tpl;
// swap the template's body for ours
const bStart = page.indexOf('<div class="blog-content">');
const bEnd = page.indexOf('<div class="blog-social', bStart);
page = page.slice(0, bStart) + `<div class="blog-content">\n${contentHtml}\n</div>\n\n\t` + page.slice(bEnd);
// every self-reference to the template's slug becomes ours
page = page.split(TSLUG).join(slug);
// titles, description, dates
page = page.replace(/<title>[^<]*<\/title>/, `<title>${esc(titleTag)}</title>`);
page = page.replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${esc(titleTag)}">`);
page = page.replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${esc(metaDesc)}">`);
page = page.replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(metaDesc)}">`);
// NB: replacer FUNCTION, not a replacement string. A string replacement
// re-reads "$1", "$&" etc. inside the text being inserted, so any
// description or title containing a dollar amount is silently mangled --
// "$13.98" became "</title>3.98" in a live twitter:description tag.
page = page.replace(/(<a class="blog-title-link blog-link" href="[^"]*">)[^<]*(<\/a>)/, (m, a, b) => `${a}${esc(h1)}${b}`);
page = page.replace(/(<span class="date-text">)[\s\S]*?(<\/span>)/, `$1\n\t\t${date}\n\t$2`);
// share button carries this post's own URL and title
const canonical = `https://www.fatcityentertainment.com/triviahostresources/${slug}/`;
page = page.replace(
  /<a class="twitter-share-button" href="[^"]*"([^>]*)>/,
  `<a class="twitter-share-button" href="https://twitter.com/intent/tweet?url=${encodeURIComponent(canonical)}&amp;text=${encodeURIComponent(titleTag)}"$1>`
);
// the same button's legacy data-text attribute is a separate leftover from
// the template and isn't touched by the href swap above
page = page.replace(/data-text="[^"]*"/, `data-text="${esc(titleTag)}"`);

const outDir = path.join(BLOG, slug);
const outFile = path.join(outDir, "index.html");
console.log(`slug:  ${slug}`);
console.log(`title: ${titleTag}`);
console.log(`date:  ${date}`);
console.log(`body:  ${contentHtml.length} chars, ${(contentHtml.match(/<h2/g) || []).length} section heading(s)`);
console.log(`out:   ${path.relative(REPO, outFile)}${fs.existsSync(outFile) ? "  (OVERWRITES existing post)" : ""}`);

if (!WRITE) { console.log("\n(dry run — pass --write to publish)"); process.exit(0); }
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, page);
console.log("\nwritten");
