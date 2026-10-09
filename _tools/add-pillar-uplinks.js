// The link from a cluster post UP to its pillar page.
//
//   node _tools/add-pillar-uplinks.js            # dry run
//   node _tools/add-pillar-uplinks.js --write
//
// WHY
// ---
// The two guides link DOWN into their posts and, as of 11 Sept 2026, only 3 of
// 13 posts linked back up. Google reads an internal link as a vote, so a hub
// with almost nothing pointing at it collects no authority however good it is,
// and the posts that should feed it are dead ends instead.
//
// WHY NOT JUST RE-PUBLISH FROM THE DRAFT
// ---------------------------------------
// Because that is destructive, and CLAUDE.md recommending it is a landmine.
// Tested on a real post: `publish-post.js <draft> <slug> --write` regenerates
// the page from the Zoo Rock template and throws away everything added after
// publication. On the four GEO posts that is a hand-built <!-- fce:faq -->
// section, three of them with a bespoke inline SVG diagram, none of which any
// tool regenerates. It also resets twitter:title and twitter:description to the
// template's (the same bug new-content-page.js had fixed in it on 10 Sept, still
// live in publish-post.js) and resets the JSON-LD headline and datePublished.
//
// So the sentence goes in BOTH places: in the draft, so it survives a future
// re-publish, and on the live page through this tool, so it is there now
// without regenerating anything. The tool is the one that has to stay
// idempotent; the draft is just the source of record.
//
// Placement is the end of the prose, matching the three posts that already do
// it by hand. The body ends where the social strip begins.
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const WRITE = process.argv.includes("--write");

const START = "<!-- fce:uplink -->";
const END = "<!-- /fce:uplink -->";
// Matches exactly what insert writes, newline included, or the tool rewrites
// the same block on every run and never reports clean.
const BLOCK_RE = /<!-- fce:uplink -->[\s\S]*?<!-- \/fce:uplink -->\n?/;
// Where the prose ends. Two shapes, and the second one matters:
//   - the GEO posts end at the social strip, so the block goes just before it;
//   - the six blog posts carry a "Complete Your Night" CTA that add-blog-cta.js
//     parks between the prose and that strip. Anchoring on the strip alone
//     would have put an internal link AFTER the buy buttons on all six.
// So: insert before the CTA's heading when there is one, otherwise before the
// strip. add-blog-cta.js anchors on the strip, so re-running it lands after
// this block rather than on top of it, whichever order they run in.
const SOCIAL_RE = /<div class="blog-social/;
function insertAt(html) {
  const cta = html.indexOf('class="fce-cta"');
  if (cta !== -1) {
    const h2 = html.lastIndexOf('<h2 class="wsite-content-title">', cta);
    if (h2 !== -1) return h2;
  }
  const m = html.match(SOCIAL_RE);
  return m ? m.index : -1;
}

const TRIVIA = { href: "/trivia-night-guide.html", text: "trivia night guide" };
const BINGO = { href: "/bingo-card-generator-guide.html", text: "bingo card generator guide" };
// The seasonal hubs (9 Oct 2026). Same job one level over: the only Halloween
// and Christmas editorial on the site is six posts from 2017 to 2020, and none
// of them pointed at the hub that sells this year's games. A hub page with no
// internal links in is the orphan the Halloween hub already was once.
const HALLOWEEN = { href: "/halloween-trivia-and-music-bingo.html", text: "Halloween trivia and music bingo" };
const CHRISTMAS = { href: "/christmas-trivia-and-music-bingo.html", text: "Christmas trivia and music bingo" };

// slug -> the pillar it belongs under, and the sentence that links to it.
// Varied on purpose: ten identical closing lines across ten posts reads as
// boilerplate to a reader and as a footprint to a crawler.
const UPLINKS = {
  "how-to-make-bingo-cards-with-no-duplicates": [BINGO,
    "Everything else a good generator should do, from card counts to colour themes, is in our"],
  "why-ai-trivia-questions-repeat-and-how-to-fix-it": [TRIVIA,
    "For the rest of the hosting playbook, from question counts to pacing and prizes, start with the"],
  "how-many-trivia-questions-for-a-trivia-night": [TRIVIA,
    "The full picture, from rounds and timing to what to put on the line, is in our"],
  "how-much-to-charge-to-host-trivia": [TRIVIA,
    "Still building the night itself? The format is covered end to end in our"],
  "how-to-run-a-music-bingo-night": [BINGO,
    "Making the cards is its own job, and it is covered end to end in our"],
  "19-music-bingo-games-our-crowds-cant-get-enough-of": [BINGO,
    "Would rather build a round from your own song list? That is what our"],
  "decade-by-decade-music-bingo-playlist-guide": [BINGO,
    "Turning any of these playlists into printable cards takes minutes, and our"],
  "new-music-bingo-packs-worth-trying": [BINGO,
    "Building your own instead? Making cards from any song list is covered in our"],
  "fall-trivia-night-ideas-to-kick-off-the-season": [TRIVIA,
    "New to hosting, or rebuilding the format from scratch? Start with our"],
  "how-to-build-a-custom-trivia-night-with-the-trivia-show-maker": [TRIVIA,
    "For the night around the questions, from rounds and pacing to prizes, see the"],
  "halloween-trivia-and-music-bingo-game-downloads-for-2019": [HALLOWEEN,
    "This post is from 2019. This year's lineup, including the Halloween Complete Pack, is on our"],
  "complete-halloween-trivia-game-show-questions-answers-ready-for-download": [HALLOWEEN,
    "Planning this year's night? Everything we make for Halloween is together on our"],
  "book-your-christmas-party-entertainment-now-for-a-bonus-discount-early-bird-special-on-until-september-31-2017": [CHRISTMAS,
    "This year's games, ready to download tonight, are all in one place on our"],
  "5-easy-ways-to-entertain-your-friends-or-coworkers-for-the-christmas-holidays": [CHRISTMAS,
    "Would rather have the games ready-made? Everything we make for the season is on our"],
  "staff-christmas-parties-will-be-a-bit-different-this-year-but-we-have-you-covered-with-virtual-event-entertainment": [CHRISTMAS,
    "Back in the room this year? The printable games for an in-person party are on our"],
  "save-money-for-some-christmas-party-games-by-downloading-these-awesome-and-wildly-fun-games": [CHRISTMAS,
    "Every Christmas game we make, at this year's prices, is on our"],
};

// Second halves, so each sentence ends naturally rather than on the link.
const TAILS = {
  "halloween-trivia-and-music-bingo-game-downloads-for-2019": " page.",
  "complete-halloween-trivia-game-show-questions-answers-ready-for-download": " page.",
  "book-your-christmas-party-entertainment-now-for-a-bonus-discount-early-bird-special-on-until-september-31-2017": " page.",
  "5-easy-ways-to-entertain-your-friends-or-coworkers-for-the-christmas-holidays": " page.",
  "staff-christmas-parties-will-be-a-bit-different-this-year-but-we-have-you-covered-with-virtual-event-entertainment": " page.",
  "save-money-for-some-christmas-party-games-by-downloading-these-awesome-and-wildly-fun-games": " page.",
  "19-music-bingo-games-our-crowds-cant-get-enough-of": " is for.",
  "decade-by-decade-music-bingo-playlist-guide": " walks through it.",
};

let changed = 0, already = 0, noAnchor = 0;
for (const [slug, [pillar, lead]] of Object.entries(UPLINKS)) {
  const rel = path.join("triviahostresources", slug, "index.html");
  const abs = path.join(REPO, rel);
  if (!fs.existsSync(abs)) { console.log(`  missing: ${rel}`); process.exitCode = 1; continue; }
  let html = fs.readFileSync(abs, "utf8");
  const before = html;

  const sentence =
    `${lead} <a href="${pillar.href}">${pillar.text}</a>${TAILS[slug] || "."}`;
  const block = `${START}<div class="paragraph">${sentence}<br></div>${END}`;

  if (BLOCK_RE.test(html)) {
    html = html.replace(BLOCK_RE, () => block + "\n");
  } else {
    // A post that already links to its pillar in hand-written prose is left
    // alone; a second link to the same page in the same paragraph block is
    // noise, not authority.
    // The BODY only. The seasonal hubs are also in the nav dropdown on every
    // page, so a whole-document check read every seasonal post as "already
    // linked" and placed nothing (found 9 Oct 2026, the first run).
    const at = insertAt(html);
    const bodyStart = html.indexOf('id="wsite-content"');
    if (html.slice(bodyStart === -1 ? 0 : bodyStart, at === -1 ? html.length : at)
      .includes(pillar.href)) { already++; continue; }
    if (at === -1) { console.log(`  no body end found: ${rel}`); noAnchor++; continue; }
    html = html.slice(0, at) + block + "\n" + html.slice(at);
  }

  if (html === before) continue;
  changed++;
  console.log(`  ${WRITE ? "linked" : "would link"}: ${slug} -> ${pillar.text}`);
  if (WRITE) fs.writeFileSync(abs, html);
}

console.log(`\nalready linked by hand: ${already}`);
if (noAnchor) { console.log(`no anchor: ${noAnchor}`); process.exitCode = 1; }
console.log(`${WRITE ? "updated" : "would update"}: ${changed} post(s)`);
if (!WRITE && changed) console.log("re-run with --write");
