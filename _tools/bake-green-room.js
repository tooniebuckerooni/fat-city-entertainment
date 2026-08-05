// Bake Green Room comment threads into static HTML so search engines (and
// anyone with JavaScript off) can read them. The live widget still fetches
// from the Worker and hydrates over this markup for real visitors; this is
// just what a crawler — or a browser that never runs the JS — sees first.
//
//   node bake-green-room.js                      # dry run, report only
//   node bake-green-room.js --write              # write the pages
//   node bake-green-room.js --from-file=x.json   # use a local JSON fixture
//                                                 # instead of fetching
//
// --from-file exists because this sandbox's egress proxy blocks
// *.workers.dev (403), so the fetch path can only be exercised in CI or on
// the owner's machine. The same fixture response is used for every thread
// being baked in that run — see _tools/greenroom-fixture.example.json for
// the shape.
//
// Threads come from greenroom-api/seed/threads.json (the same file
// greenroom-api/seed/seed.js reads). Only "launch": true threads are baked;
// a thread whose surface is an absolute URL is skipped — external domains
// aren't ours to write into.
//
// Each target page must already contain a `<div data-fc-thread="KEY"></div>`
// — this script replaces that div's INNER content and nothing else. No div,
// no bake: it reports the page and moves on rather than guessing where the
// content should go.
//
// Idempotent: the generated block is wrapped in `<!-- fce:greenroom:KEY -->`
// markers and only rewritten when it actually differs from what's already
// there, so re-running with no new comments produces a byte-identical file
// and `--write` is a no-op. A thread whose API response comes back with zero
// comments never overwrites an existing baked block — a transient empty
// response must not blank a page that already has real content on it.
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const THREADS_FILE = path.join(REPO, "greenroom-api", "seed", "threads.json");
const SITE = "https://www.fatcityentertainment.com";
const API_BASE = "https://fatcity-greenroom.dustinramsbottom.workers.dev";
const FETCH_TIMEOUT_MS = 15000;

const args = process.argv.slice(2);
const WRITE = args.includes("--write");
const fromFileArg = args.find((a) => a.startsWith("--from-file="));
const FROM_FILE = fromFileArg ? fromFileArg.slice("--from-file=".length) : null;

const MARKER_START = (key) => `<!-- fce:greenroom:${key} -->`;
const MARKER_END = (key) => `<!-- /fce:greenroom:${key} -->`;

// ------------------------------------------------------------------ escaping
// Every value below came from the API (user-submitted plaintext) and gets
// run through here before it touches the page. No exceptions — handles and
// markets included, not just the comment body.
function esc(v) {
  return String(v == null ? "" : v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Split on blank lines to preserve paragraph breaks; a single newline inside
// a paragraph is left as plain whitespace (browsers collapse it, same as
// markdown-style soft wraps).
function paragraphs(body) {
  return String(body == null ? "" : body)
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function isoDate(ms) {
  return new Date(Number(ms)).toISOString();
}
function humanDate(ms) {
  const d = new Date(Number(ms));
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

// ------------------------------------------------------------------- fetch
async function fetchComments(threadKey) {
  const url = `${API_BASE}/api/comments?thread=${encodeURIComponent(threadKey)}&sort=top&limit=100`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} from ${url}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function validateResponse(data) {
  if (!data || typeof data !== "object" || !Array.isArray(data.comments)) {
    throw new Error('malformed API response: expected an object with a "comments" array');
  }
  return data;
}

// Drop hidden comments/replies (defense in depth — the live API already
// filters these server-side, but --from-file fixtures and future API
// changes shouldn't be trusted blindly).
function sanitize(c) {
  const replies = Array.isArray(c.replies)
    ? c.replies.filter((r) => r && r.status !== "hidden").map(sanitize)
    : [];
  return Object.assign({}, c, { replies });
}

function countAll(comments) {
  return comments.reduce((n, c) => n + 1 + countAll(c.replies || []), 0);
}

// ------------------------------------------------------------------ render
function renderComment(c) {
  const meta = [`<span class="fce-gr-handle">${esc(c.handle)}</span>`];
  if (c.role_tag) meta.push(`<span class="fce-gr-role">${esc(c.role_tag)}</span>`);
  if (c.market) meta.push(`<span class="fce-gr-market">${esc(c.market)}</span>`);
  meta.push(`<time datetime="${isoDate(c.created_at)}">${humanDate(c.created_at)}</time>`);

  const body = paragraphs(c.body).map((p) => `<p>${esc(p)}</p>`).join("\n");
  const replies = (c.replies || []).map(renderComment).join("\n");
  const repliesBlock = replies ? `\n<div class="fce-gr-replies">\n${replies}\n</div>` : "";

  return (
    `<article class="fce-gr-c">\n` +
    `<header class="fce-gr-c-meta">${meta.join(" ")}</header>\n` +
    `${body}${repliesBlock}\n` +
    `</article>`
  );
}

function commentLdNode(c) {
  const node = {
    "@type": "Comment",
    author: { "@type": "Person", name: c.handle },
    text: c.body,
    dateCreated: isoDate(c.created_at),
  };
  if (c.replies && c.replies.length) node.comment = c.replies.map(commentLdNode);
  return node;
}

function renderJsonLd(thread, ordered, pageUrl) {
  const pinned = ordered.find((c) => c.status === "pinned");
  const others = ordered.filter((c) => c !== pinned);

  const node = { "@context": "https://schema.org", "@type": "DiscussionForumPosting", url: pageUrl };
  if (pinned) {
    node.headline = (paragraphs(pinned.body)[0] || thread.title).slice(0, 110);
    node.datePublished = isoDate(pinned.created_at);
    node.author = { "@type": "Person", name: pinned.handle };
    node.text = pinned.body;
  } else {
    node.headline = thread.title;
  }
  node.comment = others.map(commentLdNode);

  // JSON.stringify already produces valid JSON; the extra escape is only to
  // stop a literal "</script" inside user text from closing the tag early.
  const json = JSON.stringify(node, null, 2).replace(/</g, "\\u003c");
  return `<script type="application/ld+json">\n${json}\n</script>`;
}

function renderSection(thread, ordered, pageUrl) {
  const commentsHtml = ordered.map(renderComment).join("\n");
  return [
    `<section class="fce-gr fce-gr-baked" id="fce-gr-${esc(thread.key)}">`,
    `<h2 class="fce-gr-title">${esc(thread.title)}</h2>`,
    `<p class="fce-gr-tagline">${esc(thread.tagline)}</p>`,
    `<div class="fce-gr-comments">`,
    commentsHtml,
    `</div>`,
    renderJsonLd(thread, ordered, pageUrl),
    `<p class="fce-gr-baked-note">Showing the most recent discussion. ` +
      `<a href="${esc(pageUrl)}">Join in</a> — the live thread loads here.</p>`,
    `</section>`,
  ].join("\n");
}

function buildInner(thread, ordered, pageUrl) {
  const section = renderSection(thread, ordered, pageUrl);
  return `\n${MARKER_START(thread.key)}\n${section}\n${MARKER_END(thread.key)}\n`;
}

// -------------------------------------------------------------------- page
function resolveTargetFile(surface) {
  let rel = surface.replace(/^\//, "");
  if (rel === "" || rel.endsWith("/")) rel = path.join(rel, "index.html");
  return path.join(REPO, rel);
}

// Locate `<div data-fc-thread="KEY">...</div>` and return the offsets of its
// inner content, tracking nested <div> depth so replies wrapped in their own
// <div class="fce-gr-replies"> don't fool a naive "first </div>" match.
function findDivBlock(html, key) {
  const k = escapeRegExp(key);
  const openRe = new RegExp(`<div\\b[^>]*\\bdata-fc-thread=["']${k}["'][^>]*>`, "i");
  const open = openRe.exec(html);
  if (!open) return null;

  const contentStart = open.index + open[0].length;
  const tagRe = /<div\b[^>]*>|<\/div\s*>/gi;
  tagRe.lastIndex = contentStart;
  let depth = 1;
  let m;
  while ((m = tagRe.exec(html))) {
    if (/^<\/div/i.test(m[0])) {
      depth--;
      if (depth === 0) return { contentStart, contentEnd: m.index };
    } else {
      depth++;
    }
  }
  return null; // unbalanced divs — don't guess
}

// -------------------------------------------------------------------- main
async function main() {
  let doc;
  try {
    doc = JSON.parse(fs.readFileSync(THREADS_FILE, "utf8"));
  } catch (e) {
    console.error(`Could not read/parse ${path.relative(REPO, THREADS_FILE)}: ${e.message}`);
    process.exitCode = 1;
    return;
  }

  const threads = (doc.threads || []).filter((t) => t.launch);
  const notLaunched = (doc.threads || []).filter((t) => !t.launch).map((t) => t.key);
  if (!threads.length) {
    console.log('No threads have "launch": true — nothing to bake.');
    return;
  }

  let fixture = null;
  if (FROM_FILE) {
    try {
      fixture = JSON.parse(fs.readFileSync(path.resolve(FROM_FILE), "utf8"));
    } catch (e) {
      console.error(`Could not read/parse fixture ${FROM_FILE}: ${e.message}`);
      process.exitCode = 1;
      return;
    }
    console.log(`Using fixture ${FROM_FILE} for every thread this run (fetch skipped).\n`);
  }

  let toWrite = 0, actuallyWritten = 0, unchanged = 0, skipped = 0, failures = 0;

  for (const thread of threads) {
    const label = `[${thread.key}]`;

    if (/^https?:\/\//i.test(thread.surface)) {
      console.log(`${label} surface ${thread.surface} is external — skipping (not ours to write)`);
      skipped++;
      continue;
    }

    const targetFile = resolveTargetFile(thread.surface);
    const relTarget = path.relative(REPO, targetFile);

    if (!fs.existsSync(targetFile)) {
      console.error(`${label} FAIL: target page not found: ${relTarget}`);
      failures++;
      continue;
    }

    let data;
    try {
      data = fixture !== null ? fixture : await fetchComments(thread.key);
      validateResponse(data);
    } catch (e) {
      console.error(`${label} FAIL: ${e.message}`);
      failures++;
      continue;
    }

    const html = fs.readFileSync(targetFile, "utf8");
    const div = findDivBlock(html, thread.key);
    if (!div) {
      console.error(`${label} FAIL: no <div data-fc-thread="${thread.key}"> found in ${relTarget} — skipping, not inventing an insertion point`);
      failures++;
      continue;
    }

    const clean = data.comments.filter((c) => c && c.status !== "hidden").map(sanitize);
    const pinned = clean.filter((c) => c.status === "pinned");
    const rest = clean.filter((c) => c.status !== "pinned");
    const ordered = [...pinned, ...rest];

    const existingInner = html.slice(div.contentStart, div.contentEnd);

    if (ordered.length === 0) {
      if (existingInner.trim().length > 0) {
        console.log(`${label} API returned 0 comments — leaving the existing block in ${relTarget} alone`);
      } else {
        console.log(`${label} API returned 0 comments and ${relTarget} has no prior bake — nothing to write`);
      }
      skipped++;
      continue;
    }

    const pageUrl = `${SITE}${thread.surface}#fce-gr-${thread.key}`;
    const newInner = buildInner(thread, ordered, pageUrl);
    const total = countAll(ordered);
    const replies = total - ordered.length;

    console.log(`${label} ${relTarget}`);
    console.log(`${label}   ${total} comment(s) would be baked (${pinned.length} pinned, ${ordered.length - pinned.length} other top-level, ${replies} repl${replies === 1 ? "y" : "ies"})`);

    if (newInner === existingInner) {
      console.log(`${label}   content unchanged — skip`);
      unchanged++;
      continue;
    }

    console.log(`${label}   content differs from what's on the page`);
    toWrite++;
    if (WRITE) {
      const newHtml = html.slice(0, div.contentStart) + newInner + html.slice(div.contentEnd);
      fs.writeFileSync(targetFile, newHtml);
      console.log(`${label}   written`);
      actuallyWritten++;
    }
  }

  console.log("");
  console.log(`threads with changes : ${toWrite}`);
  if (WRITE) console.log(`threads written      : ${actuallyWritten}`);
  console.log(`threads unchanged    : ${unchanged}`);
  console.log(`threads skipped      : ${skipped}`);
  console.log(`threads failed       : ${failures}`);
  if (notLaunched.length) console.log(`not launched (ignored): ${notLaunched.join(", ")}`);
  if (!WRITE) console.log("\nDRY RUN — nothing written. Re-run with --write.");

  if (failures > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(`bake-green-room.js: unexpected error: ${err && err.stack ? err.stack : err}`);
  process.exitCode = 1;
});
