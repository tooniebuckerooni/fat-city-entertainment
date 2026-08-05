#!/usr/bin/env node
/**
 * Drop The Green Room embed onto its surfaces. Idempotent — run it as often as
 * you like; it only ever writes when something would actually change.
 *
 *   node _tools/add-green-room.js            # dry run
 *   node _tools/add-green-room.js --write
 *
 * Per CLAUDE.md: never hand-edit markup across pages, use a script. This is
 * only two pages today, but the Green Room is going to land on more of them
 * (the Trivia Generator once its home is settled, wordjab.io later), and a
 * hand-edit that worked once is how the nav ended up duplicated on 397 pages.
 *
 * The embed is deliberately EMPTY here. _tools/bake-green-room.js fills the div
 * with the real thread as static HTML so crawlers and no-JS visitors get
 * content; the widget then replaces it for everyone else.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const write = process.argv.includes("--write");

const WIDGET = "/assets/js/greenroom-widget.js";

/* Each surface names the exact markup the embed goes BEFORE. Anchors are
   matched as literal strings, so a Weebly re-export that renames a wrapper
   class doesn't silently move the block somewhere absurd — it just fails
   loudly and we look at it. */
const SURFACES = [
  {
    file: "features.html",
    thread: "green-room",
    // Above the three tool entrances: you pass through the green room, then
    // you pick a stage. The owner asked for it here specifically.
    before: '<h2 class="wsite-content-title">Triv 101</h2>',
  },
  {
    file: "gameshowhosts.html",
    thread: "hosting",
    // This page recruits hosts into Fat City's own programme, which makes it a
    // sharper place to host a pay-rate conversation than features.html is. The
    // thread goes at the FOOT of the content, below the closing divider, so the
    // pitch is read on its own terms and the discussion isn't wedged into it.
    after:
      '<hr class="styled-hr" style="width:100%;">\n' +
      '<div style="height: 20px; overflow: hidden; width: 100%;"></div></div>',
    fromEnd: true,
  },
];

function block(thread) {
  return (
    '<!-- fce:greenroom-embed -->\n' +
    '<div data-fc-thread="' + thread + '"></div>\n' +
    '<script src="' + WIDGET + '" defer></script>\n' +
    '<!-- /fce:greenroom-embed -->\n\n'
  );
}

function main() {
  let changed = 0;
  let failed = 0;

  for (const s of SURFACES) {
    const p = path.join(ROOT, s.file);
    if (!fs.existsSync(p)) {
      console.error(`  MISSING  ${s.file} — skipped`);
      failed++;
      continue;
    }

    let html = fs.readFileSync(p, "utf8");

    // Already there? Make sure it's the right thread, then leave it alone.
    if (html.includes("fce:greenroom-embed")) {
      const has = html.includes('data-fc-thread="' + s.thread + '"');
      console.log(`  ok       ${s.file} — embed already present` +
        (has ? "" : `  !! but not for thread "${s.thread}"`));
      if (!has) failed++;
      continue;
    }

    /* Bound the search to the page's CONTENT region. These Weebly exports
       repeat the same divider markup in the footer, so a naive lastIndexOf
       finds the footer copy and drops the thread under the site nav. */
    const cStart = html.indexOf('id="wsite-content"');
    const cEnd = html.indexOf('class="footer-wrap"');
    if (cStart < 0 || cEnd < 0 || cEnd < cStart) {
      console.error(`  FAILED   ${s.file} — can't locate the content region`);
      failed++;
      continue;
    }
    const region = html.slice(cStart, cEnd);

    const anchor = s.before || s.after;
    const rel = s.fromEnd ? region.lastIndexOf(anchor) : region.indexOf(anchor);
    const found = rel < 0 ? -1 : cStart + rel;
    if (found < 0) {
      console.error(`  FAILED   ${s.file} — anchor not found, refusing to guess`);
      failed++;
      continue;
    }

    const at = s.after ? found + anchor.length + 1 : found;
    html = html.slice(0, at) + "\n" + block(s.thread) + html.slice(at);

    console.log(`  add      ${s.file} — thread "${s.thread}" ` +
      (s.after ? "after " : "before ") + JSON.stringify(anchor.slice(0, 42)));
    if (write) fs.writeFileSync(p, html);
    changed++;
  }

  console.log(
    `\n${changed} page(s) ${write ? "written" : "would change"}` +
    (failed ? `, ${failed} problem(s)` : "") +
    (write || !changed ? "" : " — re-run with --write")
  );
  process.exit(failed ? 1 : 0);
}

main();
