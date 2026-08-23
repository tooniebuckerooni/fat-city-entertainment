// Resilient drip publisher: link an already-built blog post (and/or a hub page)
// into the CURRENT state of the site, idempotently.
//
//   node publish-drip.js --post <slug> [--hub <file.html>] [--write]
//
// WHY THIS EXISTS
// --------------
// The GEO series ships one post at a time on a schedule. The earlier design
// advanced `main` to a pre-pinned commit, which broke whenever other work
// landed on `main` first (its stale landing-page / sitemap diffs conflicted).
// `main` moves — people publish from other sessions — so a drip must re-derive
// its additions against whatever `main` is at fire time, never carry a frozen
// diff.
//
// The post's own directory (triviahostresources/<slug>/) is a NEW path, so a
// `git checkout <branch> -- <that dir>` drops it onto current main with no
// possible conflict. This tool then does the only two edits that touch shared
// files — the landing-page tile and the sitemap entry — freshly and
// idempotently against the current files. Same idea for a hub page (a new
// top-level .html): it only needs a sitemap entry, no landing tile.
//
// Everything the tile needs is read back out of the built page, so there's no
// second copy of the title/date/excerpt to keep in sync.
//
// Idempotent: if the slug is already linked, it's a no-op. Safe to re-run.

const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const SITE = "https://www.fatcityentertainment.com";
const WRITE = process.argv.includes("--write");

const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i > -1 ? process.argv[i + 1] : null;
};
const postSlug = arg("--post");
const hubFile = arg("--hub");
if (!postSlug && !hubFile) {
  console.error("usage: node publish-drip.js --post <slug> [--hub <file.html>] [--write]");
  process.exit(1);
}

const problems = [];
let changed = false;

// ---- sitemap (shared helper) -------------------------------------------
function addSitemap(loc, lastmod) {
  const p = path.join(REPO, "sitemap.xml");
  const s = fs.readFileSync(p, "utf8");
  if (s.includes(loc)) { console.log(`  sitemap: already lists ${loc}`); return; }
  const entry = `  <url><loc>${loc}</loc><lastmod>${lastmod}</lastmod></url>\n`;
  const out = s.replace("</urlset>", entry + "</urlset>");
  if (WRITE) fs.writeFileSync(p, out);
  console.log(`  sitemap: ${WRITE ? "added" : "would add"} ${loc}`);
  changed = true;
}

// ---- post: landing tile + sitemap --------------------------------------
if (postSlug) {
  const pagePath = path.join(REPO, "triviahostresources", postSlug, "index.html");
  if (!fs.existsSync(pagePath)) {
    problems.push(`no built page at triviahostresources/${postSlug}/index.html — checkout the post dir from the branch first`);
  } else {
    const page = fs.readFileSync(pagePath, "utf8");
    const titleM = page.match(/<a class="blog-title-link blog-link" href="[^"]*">([^<]+)<\/a>/);
    const dateM = page.match(/<span class="date-text">\s*([^<]+?)\s*<\/span>/);
    const descM = page.match(/<meta name="description" content="([^"]*)"/);
    if (!titleM || !dateM || !descM) {
      problems.push(`${postSlug}: could not read title/date/description from the page`);
    } else {
      const title = titleM[1].trim();
      const date = dateM[1].trim();                       // M/D/YYYY
      const excerpt = descM[1].trim();
      const [mm, dd, yyyy] = date.split("/");
      const iso = `${yyyy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
      const rel = `/triviahostresources/${postSlug}/`;   // root-relative, like every other tile
      const url = `${SITE}${rel}`;                        // absolute, for the sitemap
      const id = `blog-post-${postSlug}`;

      const landing = path.join(REPO, "triviahostresources.html");
      let html = fs.readFileSync(landing, "utf8");
      if (html.includes(`href="${rel}"`)) {
        console.log(`  landing: already lists ${postSlug}`);
      } else {
        const tile =
          `<div id="${id}" class="blog-post">\n` +
          `\t\t<div class="blog-header">\n` +
          `\t\t\t<h2 class="blog-title">\n` +
          `\t\t\t\t\t<a class="blog-title-link blog-link" href="${rel}">${title}</a>\n` +
          `\t\t\t</h2>\n` +
          `\t\t\t<p class="blog-date">\n\t\t\t\t\t<span class="date-text">\n\t\t${date}\n\t</span>\n\t\t\t</p>\n` +
          `\t\t\t<p class="blog-comments">\n\t\t\t\t\t<a href="${rel}#comments" class="blog-link">\n\t\t0 Comments\n\t</a>\n\t\t\t</p>\n` +
          `\t\t</div>\n` +
          `\t\t<div class="blog-separator">&nbsp;</div>\n` +
          `\t\t<div class="blog-content">\n` +
          `<div class="paragraph">${excerpt}</div>\n\n` +
          `<div class="paragraph"><a class="blog-link" href="${rel}"><strong>Read More &#8594;</strong></a></div>\n` +
          `\t\t</div>\n` +
          `\t\t<div class="blog-post-separator"></div>\n` +
          `\t</div>\n\t`;
        const at = html.search(/<div id="blog-post-[^"]*" class="blog-post">/);
        if (at === -1) {
          problems.push("landing: no <div id=\"blog-post-…\" class=\"blog-post\"> anchor found");
        } else {
          html = html.slice(0, at) + tile + html.slice(at);
          if (WRITE) fs.writeFileSync(landing, html);
          console.log(`  landing: ${WRITE ? "added" : "would add"} tile for ${postSlug}`);
          changed = true;
        }
      }
      addSitemap(url, iso);
    }
  }
}

// ---- hub: sitemap only --------------------------------------------------
if (hubFile) {
  const hubPath = path.join(REPO, hubFile);
  if (!fs.existsSync(hubPath)) {
    problems.push(`no hub page at ${hubFile} — checkout it from the branch first`);
  } else {
    const hub = fs.readFileSync(hubPath, "utf8");
    const cM = hub.match(/<link rel="canonical" href="([^"]+)"/);
    if (!cM) problems.push(`${hubFile}: no canonical URL found`);
    else addSitemap(cM[1], new Date().toISOString().slice(0, 10));
  }
}

for (const p of problems) console.log(`  PROBLEM: ${p}`);
if (!WRITE) console.log("\n(dry run -- pass --write to apply)");
else console.log(changed ? "\napplied." : "\nnothing to do (already current).");
process.exitCode = problems.length ? 1 : 0;
