// Group the interactive tools under a "Features" dropdown in the top-level nav
// of every live page (desktop AND mobile), immediately after "Trivia Store"
// (which stays first). The dropdown parent links to /features.html and holds
// Triv 101, Trivia Generator, and Bingo Card Generator as subitems — matching
// the site's existing "Our Games" submenu markup.
//
// Handles two starting states, so it's safe to re-run:
//   * pages that already carry the earlier FLAT trio  -> replace it
//   * pages with just the Trivia Store anchor          -> insert after it
// Idempotent: a page that already has the Features dropdown is skipped.
//
//   node _tools/add-app-nav.js            # dry run
//   node _tools/add-app-nav.js --write
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const WRITE = process.argv.includes("--write");
const SKIP_DIRS = new Set(["_tools", ".git", "node_modules", "assets", "files", "uploads", "triv101", "pages", "4"]);

// "Trivia Store" top-level item — matched by link, not id (Weebly rewrites the
// <li> id to "active" on whatever page is current).
const ANCHOR_RE = /([ \t]*)<li id="[^"]*" class="wsite-menu-item-wrap">\s*<a href="\/trivia-store\.html" class="wsite-menu-item">[\s\S]*?<\/li>/g;
// The earlier flat trio, spanning all three <li>s (first through third's </li>).
const FLAT_RE = /[ \t]*<li id="pg-triv101-app" class="wsite-menu-item-wrap">[\s\S]*?<li id="pg-bingo-generator" class="wsite-menu-item-wrap">[\s\S]*?<\/li>/g;

const MARKER = 'id="pg-features"';

function dropdown(indent) {
  const i = indent, t = indent + "\t";
  const sub = (id, href, label, extra) =>
    `\n${t}<li id="${id}" class="wsite-menu-subitem-wrap ">` +
    `\n${t}<a href="${href}" class="wsite-menu-subitem"${extra || ""}>` +
    `\n${t}\t<span class="wsite-menu-title">` +
    `\n${t}\t\t${label}` +
    `\n${t}\t</span>` +
    `\n${t}</a>` +
    `\n${t}</li>`;
  return (
    `\n${i}<li id="pg-features" class="wsite-menu-item-wrap">` +
    `\n${t}<a href="/features.html" class="wsite-menu-item">` +
    `\n${t}\tFeatures` +
    `\n${t}</a>` +
    `\n${t}<div class="wsite-menu-wrap" style="display:none">` +
    `\n${t}<ul class="wsite-menu">` +
    sub("wsite-nav-triv101", "/triv101/", "Triv 101", "") +
    sub("wsite-nav-trivia-generator", "/trivia-generator.html", "Trivia Generator", "") +
    sub("wsite-nav-bingo-generator", "https://bingocardgenerator.online/", "Bingo Card Generator", ' target="_blank" rel="noopener"') +
    `\n${t}</ul>` +
    `\n${t}</div>` +
    `\n${i}</li>`
  );
}

function walk(dir, out) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const rel = path.relative(REPO, full);
    if (rel.split(path.sep).some((seg, idx) => idx === 0 && SKIP_DIRS.has(seg))) continue;
    const st = fs.statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (name.endsWith(".html")) out.push(full);
  }
  return out;
}

const files = walk(REPO, []);
let changed = 0, skippedHave = 0, noAnchor = 0;

for (const file of files) {
  let html = fs.readFileSync(file, "utf8");
  if (html.includes(MARKER)) { skippedHave++; continue; }

  let next = html;
  if (FLAT_RE.test(next)) {
    // Replace the flat trio in place, reusing its indentation.
    FLAT_RE.lastIndex = 0;
    next = next.replace(FLAT_RE, (m) => {
      const indent = (m.match(/^([ \t]*)</) || [, ""])[1];
      return dropdown(indent);
    });
  } else if (ANCHOR_RE.test(next)) {
    ANCHOR_RE.lastIndex = 0;
    next = next.replace(ANCHOR_RE, (m, indent) => m + dropdown(indent));
  } else {
    noAnchor++;
    continue;
  }

  if (next !== html) {
    changed++;
    if (WRITE) fs.writeFileSync(file, next);
  }
}

console.log(`scanned:        ${files.length} html files`);
console.log(`no nav anchor:  ${noAnchor} (skipped — not a modern-nav page)`);
console.log(`already have:   ${skippedHave} (idempotent skip)`);
console.log(`${WRITE ? "UPDATED" : "would update"}: ${changed}`);
if (!WRITE) console.log("\nDRY RUN — nothing written. Re-run with --write.");
