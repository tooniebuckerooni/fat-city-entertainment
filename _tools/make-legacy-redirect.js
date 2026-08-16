// Generates tiny redirect stubs for retired Weebly blog URLs that were never
// given a forwarding path when the blog moved to /triviahostresources/. Google
// Analytics flagged a handful of old /inspiration/<slug>/ and /whatsnew/<slug>/
// posts still taking real traffic and dead-ending on the 404 page.
//
//   node _tools/make-legacy-redirect.js            # dry run
//   node _tools/make-legacy-redirect.js --write
//
// WHY A STUB AND NOT JUST THE 404 REDIRECT
// ----------------------------------------
// 404.html already client-side-redirects any legacy blog path by slug, which
// fixes the user-facing dead end. But a 404 page returns HTTP 404, so Google
// won't pass any backlink equity from the old URL to the live post. A real file
// at the old path returns HTTP 200 with an instant meta-refresh + rel=canonical
// to the live post — the standard static-hosting "soft 301". Google consolidates
// the signals to the canonical, and users still land on the live post.
//
// Every legacy post kept the SAME slug as its live counterpart, so the old URL
// is simply <prefix>/<live-slug>/. We emit a stub at BOTH legacy prefixes for
// each target so we don't have to know which one a given backlink used; the
// unused one is harmless (canonical + noindex-free redirect to the same place).
//
// SEO note: NO <meta robots noindex> here, on purpose. A noindex on top of a
// rel=canonical makes Google drop the page before it consolidates the canonical
// signal (see the header of noindex-blog-taxonomy.js). Canonical + refresh is
// the correct treatment for a duplicate/redirect. These stubs are deliberately
// NOT added to sitemap.xml — you don't submit redirecting URLs.
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const WRITE = process.argv.includes("--write");
const ORIGIN = "https://www.fatcityentertainment.com";
const MARKER = "fce:legacy-redirect";

// Legacy path prefixes Weebly served the same posts under.
const PREFIXES = ["inspiration", "whatsnew"];

// Live post slugs (under /triviahostresources/) that GA showed 404ing at their
// old legacy URLs. "Hosting presentations" was ambiguous between two live
// posts, so both are covered — an unused stub is a harmless no-op.
const TARGETS = [
  "a-night-at-the-movies-play-songs-from-movie-soundtracks-at-a-party-or-event-while-guests-dob-off-squares-on-their-bingo-cards-for-lines-and-prizes",
  "adding-a-little-flair-to-your-trivia-hosting-gig",
  "music-bingo-cards-or-game-show-presentations-to-entertain-guests",
  "how-to-host-fat-bottom-trivia-presentations-for-quick-and-easy-event-entertainment-6-steps",
  "how-to-host-trivia-presentations-using-microsoft-powerpoint-or-equivalent",
  // Second GA pass (full 61-day history) surfaced these three, each with a live
  // post and, for the membership one, an inbound Pinterest link worth keeping.
  "how-to-host-an-amazing-trivia-or-music-bingo-event-on-zoom",
  "host-your-own-show-with-a-music-bingo-membership",
  "3-fun-games-you-can-download-and-play-at-valentines-day",
];

function stub(slug) {
  const live = `/triviahostresources/${slug}/`; // trailing slash per the site URL rule
  return `<!DOCTYPE html>
<!-- ${MARKER} -->
<html lang="en">
<head>
<meta charset="utf-8">
<title>Redirecting… | Fat City Entertainment</title>
<link rel="canonical" href="${ORIGIN}${live}">
<meta http-equiv="refresh" content="0; url=${live}">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<script>location.replace(${JSON.stringify(live)});</script>
</head>
<body>
<p>This post has moved. If you are not redirected automatically,
<a href="${live}">continue to the post</a>.</p>
</body>
</html>
`;
}

let created = 0,
  refreshed = 0,
  skipped = 0,
  missing = 0;

for (const slug of TARGETS) {
  // Never redirect to a target that doesn't exist.
  if (!fs.existsSync(path.join(REPO, "triviahostresources", slug, "index.html"))) {
    console.warn(`! live target missing, skipping all stubs for: ${slug}`);
    missing++;
    continue;
  }
  for (const prefix of PREFIXES) {
    const dir = path.join(REPO, prefix, slug);
    const file = path.join(dir, "index.html");
    const rel = path.relative(REPO, file);

    if (fs.existsSync(file)) {
      const existing = fs.readFileSync(file, "utf8");
      if (!existing.includes(MARKER)) {
        // A real legacy copy already lives here (canonical'd duplicate) — leave it.
        console.log(`skip (real page)   ${rel}`);
        skipped++;
        continue;
      }
      if (existing === stub(slug)) {
        console.log(`ok (unchanged)     ${rel}`);
        continue;
      }
      if (WRITE) {
        fs.writeFileSync(file, stub(slug));
      }
      console.log(`refresh stub       ${rel}`);
      refreshed++;
      continue;
    }

    if (WRITE) {
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(file, stub(slug));
    }
    console.log(`create stub        ${rel}`);
    created++;
  }
}

console.log(
  `\n${WRITE ? "wrote" : "would write"}: ${created} new, ${refreshed} refreshed | ` +
    `skipped ${skipped} real page(s), ${missing} missing target(s)`
);
if (!WRITE) console.log("(dry run — re-run with --write to apply)");
