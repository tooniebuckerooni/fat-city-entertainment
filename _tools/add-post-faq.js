// Inject an FAQ block (+ optional inline-SVG diagram) into a blog post,
// idempotently, and emit the matching FAQPage JSON-LD alongside it.
//
//   node add-post-faq.js          report only
//   node add-post-faq.js --write  apply
//
// WHY THIS EXISTS
// --------------
// The GEO/"direct-answer" blog posts rank and get cited by answer engines on
// the strength of short, self-contained answers. A titled FAQ at the foot of a
// post is the single highest-leverage add for that: 3-4 Q&A pairs feed
// featured snippets and AI answers directly. An optional diagram breaks up the
// text and carries the "show the work" thesis of the visual posts.
//
// CONTENT LIVES IN PARTIALS, not in the fragile Weebly post shell:
//   _content/faq/<slug>.json       required. [{ "q": "...", "a": "... may
//                                  contain inline <a>/<strong> ..." }, ...]
//   _content/diagrams/<slug>.html  optional. A complete <figure> with an
//                                  inline <svg> and a <figcaption>.
// <slug> is the post's directory under triviahostresources/. A .json file is
// the trigger — a post gets an FAQ iff _content/faq/<slug>.json exists, so new
// posts are picked up automatically with no map to maintain here.
//
// The block is injected just before <div class="blog-post-separator"> (the one
// stable, unique anchor at the end of a post's article body), wrapped in
// <!-- fce:faq --> markers — same idiom as fce:copy / fce:jsonld. Re-running
// replaces whatever sits between the markers, so editing a partial and
// re-running is the whole update workflow.
//
// This deliberately owns the per-post FAQPage JSON-LD itself rather than
// pushing it into add-jsonld.js: the FAQ HTML and its schema are generated from
// the same partial in one place, and the site-wide structured-data pass stays
// untouched. add-jsonld.js still emits BlogPosting + BreadcrumbList for these
// posts; a page carrying both plus this FAQPage is valid and normal.
//
// Style lives in .fce-faq / .fce-diagram in assets/css/site-extras.css, linked
// on every page.

const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const WRITE = process.argv.includes("--write");
const SITE = "https://www.fatcityentertainment.com";
const FAQDIR = path.join(REPO, "_content", "faq");
const DIAGDIR = path.join(REPO, "_content", "diagrams");
const POSTDIR = path.join(REPO, "triviahostresources");

const OPEN = "<!-- fce:faq -->";
const CLOSE = "<!-- /fce:faq -->";
const ANCHOR = '<div class="blog-post-separator"></div>';

const esc = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// Plain-text form of an answer for JSON-LD: drop inline tags, collapse space,
// unescape the handful of entities we actually author.
const plain = (s) =>
  s
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

if (!fs.existsSync(FAQDIR)) {
  console.error("no _content/faq/ directory — nothing to do");
  process.exit(0);
}

let changed = 0;
let same = 0;
let absent = 0;
const problems = [];

for (const file of fs.readdirSync(FAQDIR).filter((f) => f.endsWith(".json")).sort()) {
  const slug = file.replace(/\.json$/, "");
  const target = path.join(POSTDIR, slug, "index.html");
  if (!fs.existsSync(target)) {
    // The post isn't published yet — normal during a staggered/drip release,
    // where a FAQ partial can exist before its post goes live. Skip quietly;
    // the post's own publish step re-runs this tool and picks it up then.
    absent++;
    continue;
  }

  let faq;
  try {
    faq = JSON.parse(fs.readFileSync(path.join(FAQDIR, file), "utf8"));
  } catch (e) {
    problems.push(`${file}: invalid JSON (${e.message})`);
    continue;
  }
  if (!Array.isArray(faq) || !faq.length || faq.some((x) => !x.q || !x.a)) {
    problems.push(`${file}: expected a non-empty array of {q, a}`);
    continue;
  }

  // Optional diagram partial (verbatim <figure> with inline SVG).
  const diagPath = path.join(DIAGDIR, `${slug}.html`);
  const diagram = fs.existsSync(diagPath)
    ? fs.readFileSync(diagPath, "utf8").trim() + "\n"
    : "";

  // Visible FAQ HTML.
  const items = faq
    .map(
      (x) =>
        `  <div class="fce-faq-item">\n` +
        `    <h3 class="fce-faq-q">${esc(x.q)}</h3>\n` +
        `    <div class="fce-faq-a"><p>${x.a}</p></div>\n` +
        `  </div>`
    )
    .join("\n");
  const faqHtml =
    `<section class="fce-faq" aria-label="Frequently asked questions">\n` +
    `  <h2>Frequently asked questions</h2>\n${items}\n</section>`;

  // FAQPage JSON-LD from the same source.
  const ld = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((x) => ({
      "@type": "Question",
      name: plain(x.q),
      acceptedAnswer: { "@type": "Answer", text: plain(x.a) },
    })),
  };
  const script = `<script type="application/ld+json">${JSON.stringify(ld)}</script>`;

  const block =
    `${OPEN}\n<section class="fce-extras">\n<div class="fce-extras-inner">\n` +
    `${diagram}${faqHtml}\n</div>\n</section>\n${script}\n${CLOSE}\n`;

  const html = fs.readFileSync(target, "utf8");
  let updated;
  const start = html.indexOf(OPEN);
  if (start !== -1) {
    const end = html.indexOf(CLOSE, start);
    if (end === -1) {
      problems.push(`${slug}: opening fce:faq marker with no closing marker`);
      continue;
    }
    updated = html.slice(0, start) + block + html.slice(end + CLOSE.length + 1);
  } else {
    const at = html.indexOf(ANCHOR);
    if (at === -1) {
      problems.push(`${slug}: no blog-post-separator anchor found`);
      continue;
    }
    updated = html.slice(0, at) + block + "\t\t" + html.slice(at);
  }

  if (updated === html) {
    same++;
    continue;
  }
  changed++;
  console.log(
    `  ${WRITE ? "wrote" : "would write"}  ${slug.padEnd(48)} ${faq.length} Q&A${
      diagram ? " + diagram" : ""
    }`
  );
  if (WRITE) fs.writeFileSync(target, updated);
}

console.log(
  `\nposts updated: ${changed}   already current: ${same}` +
    (absent ? `   not yet published: ${absent}` : "")
);
for (const p of problems) console.log(`  PROBLEM: ${p}`);
if (!WRITE) console.log("\n(dry run -- pass --write to apply)");
process.exitCode = problems.length ? 1 : 0;
