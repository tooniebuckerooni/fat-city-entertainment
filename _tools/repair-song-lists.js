// Repair extraction damage in _content/song-lists.json and _content/tracklists.json.
//
//   node _tools/repair-song-lists.js           # dry run: print every row it would change
//   node _tools/repair-song-lists.js --write
//
// Then: build-song-library.js --write, add-jsonld.js --write,
// add-tracklists.js --write, build-generator-links.js --write.
//
// WHY (20 Oct 2026). The song lists were extracted from the owner's callsheet
// PDFs, and the extractor broke in two repeatable ways. Both were live on the
// free library pages and in product-page sample tracklists for two months.
//
// 1. FIXED-WIDTH BLEED, about 180 rows in 20 packs (25 counting the merged rows), always the rows on a
//    callsheet's second page. The first letter of each artist landed on the end
//    of the song cell ("Walk This Way   A" / "erosmith   A"), and the first
//    letters of the THIRD column landed on the end of the artist. On Anagrams,
//    Antonyms, Acronyms, Nicknames, Numbers and Countries that third column is
//    the puzzle answer, which CLAUDE.md says must never reach a page. One
//    letter of it was on 60-odd rows. Every damaged cell carries a run of two
//    or more spaces, which no real title or artist does, so that run is what
//    the rules key on and a repaired row can never match again (idempotent).
// 2. MERGED ROWS, 26 rows. A title or artist that wrapped to a second line in
//    the PDF was glued onto the row above, and the next row kept only the
//    remainder ("Walking in Memphis San Francisco (Be Sure to" over "Wear
//    Flowers in Your Hair)"). Nothing about these is regular, so they are
//    hand-fixed in MANUAL, each guarded by the exact damaged text it replaces:
//    a row that has changed since is left alone and reported.
// The Christmas Party pack had the second kind and was fixed by hand on
// 18 Oct 2026; finding the same shape there is what led here.
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const WRITE = process.argv.includes("--write");
const LISTS = path.join(REPO, "_content/song-lists.json");
const TRACKS = path.join(REPO, "_content/tracklists.json");
const PAD = /^(.*?\S)\s{2,}(.*)$/;

// pack -> row number (1-based) -> [damaged song, damaged by, fixed song, fixed by]
const MANUAL = {
  "Golden Oldies": {
    17: ["The Lion Sleeps Tonight (Wimoweh) Big Girls Don't Cry (2007", "The Tokens Frankie Valli & The", "The Lion Sleeps Tonight (Wimoweh)", "The Tokens"],
    18: ["Remaster)", "Four Seasons", "Big Girls Don't Cry (2007 Remaster)", "Frankie Valli & The Four Seasons"],
  },
  "Food Fight": {
    10: ["Cherry Pie", "Warrant The Presidents Of The", "Cherry Pie", "Warrant"],
    11: ["Peaches", "United States Of America", "Peaches", "The Presidents Of The United States Of America"],
    25: ["Orange Crush - Remastered 2013 Eggs And Sausage (In A", null, "Orange Crush - Remastered 2013", "R.E.M."],
    26: ["Cadillac With Susan Michelson)", null, "Eggs And Sausage (In A Cadillac With Susan Michelson)", "Tom Waits"],
  },
  "Cities": {
    5: ["Walking in Memphis San Francisco (Be Sure to", "Marc Cohn", "Walking in Memphis", "Marc Cohn"],
    6: ["Wear Flowers in Your Hair) - Single Version", "Scott McKenzie", "San Francisco (Be Sure to Wear Flowers in Your Hair) - Single Version", "Scott McKenzie"],
    11: ["Angel Of Harlem", "U2 The Presidents Of The", "Angel Of Harlem", "U2"],
    12: ["Cleveland Rocks", "United States Of America", "Cleveland Rocks", "The Presidents Of The United States Of America"],
  },
  "Motown": {
    12: ["Nightshift What Becomes Of The", "The Commodores", "Nightshift", "The Commodores"],
    13: ["Brokenhearted (Single Version)", "Jimmy Ruffin", "What Becomes Of The Brokenhearted (Single Version)", "Jimmy Ruffin"],
  },
  "Colors": {
    8: ["Purple Haze White & Nerdy (Parody of", "Jimi Hendrix", "Purple Haze", "Jimi Hendrix"],
    9: ["\"Ridin'\" by Chamillionaire feat. Krayzie Bone)", "\"Weird Al\" Yankovic", "White & Nerdy (Parody of \"Ridin'\" by Chamillionaire feat. Krayzie Bone)", "\"Weird Al\" Yankovic"],
  },
  "Anagrams": {
    17: ["Dancing in the Dark CAN'T STOP THE FEELING!", "Bruce Springsteen", "Dancing in the Dark", "Bruce Springsteen"],
    18: ["(from DreamWorks Animation's \"TROLLS\")", "Justin Timberlake", "CAN'T STOP THE FEELING! (from DreamWorks Animation's \"TROLLS\")", "Justin Timberlake"],
  },
  "Movie Soundtracks 1": {
    18: ["Little Green Bag (I've Had) The Time of My Life", "The George Baker Selection Bill Medley, Jennifer", "Little Green Bag", "The George Baker Selection"],
    19: ["(From Dirty Dancing Soundtrack) I Don't Want to Miss a Thing", "Warnes", "(I've Had) The Time of My Life (From Dirty Dancing Soundtrack)", "Bill Medley, Jennifer Warnes"],
    20: ["(From Armageddon Soundtrack)", "Aerosmith", "I Don't Want to Miss a Thing (From Armageddon Soundtrack)", "Aerosmith"],
  },
  "Movie Soundtracks 3": {
    4: ["The Bird and the Worm Supercalifragilisticexpialidoci", "The Used Julie Andrews, Dick", "The Bird and the Worm", "The Used"],
    5: ["ous", "Van Dyke, The Pearlie Chorus", "Supercalifragilisticexpialidocious", "Julie Andrews, Dick Van Dyke, The Pearlie Chorus"],
    13: ["Mrs. Robinson - Version 2 CAN'T STOP THE FEELING!", "Simon & Garfunkel", "Mrs. Robinson - Version 2", "Simon & Garfunkel"],
    14: ["(from DreamWorks Animation's \"TROLLS\")", "Justin Timberlake", "CAN'T STOP THE FEELING! (from DreamWorks Animation's \"TROLLS\")", "Justin Timberlake"],
    16: ["Singin' In The Rain", "Gene Kelly Mickey Rooney, Feist,", "Singin' In The Rain", "Gene Kelly"],
    17: ["Life's A Happy Song", "Amy Adams, Jason Segel", "Life's A Happy Song", "Mickey Rooney, Feist, Amy Adams, Jason Segel"],
  },
  "Stadium Songs": {
    4: ["Gonna Fly Now - Theme From \"Rocky\" Gonna Make You Sweat", "Bill Conti C+C Music Factory,", "Gonna Fly Now - Theme From \"Rocky\"", "Bill Conti"],
    5: ["(Everybody Dance Now) (feat. Freedom Williams)", "Freedom Williams", "Gonna Make You Sweat (Everybody Dance Now) (feat. Freedom Williams)", "C+C Music Factory, Freedom Williams"],
    6: ["Hit Me With Your Best Shot - Remastered Take Me Out to the Ball Game", "Pat Benatar Ball Park Stadium", "Hit Me With Your Best Shot - Remastered", "Pat Benatar"],
    7: ["- Boston Red Sox Ballpark Version", "Organist", "Take Me Out to the Ball Game - Boston Red Sox Ballpark Version", "Ball Park Stadium Organist"],
    25: [null, null, "Rock You Like a Hurricane", "Scorpions"],
    27: [null, null, "We Are The Champions - Remastered 2011", "Queen"],
    28: [null, null, "La Copa de la Vida (La Cancion Oficial de la Copa Mundial, Francia '98) - Spanglish Radio Edit", "Ricky Martin"],
  },
  "The Year Was 1992": {
    2: ["Move This (Shake That Body) Tears in Heaven - Acoustic;", "Technotronic", "Move This (Shake That Body)", "Technotronic"],
    3: ["Live at MTV Unplugged, Bray Film Studios, Windsor, England, 1992", "Eric Clapton", "Tears in Heaven - Acoustic; Live at MTV Unplugged, Bray Film Studios, Windsor, England, 1992", "Eric Clapton"],
  },
  "Countries": {
    // The Korean title in brackets was extracted as five box characters.
    4: ["Gangnam Style (■■■■■)", "PSY", "Gangnam Style", "PSY"],
    25: [null, null, "Zenzenzense - movie ver.", "RADWIMPS"],
  },
};

// Song cell padded: "<title>   <artist initial>[ <second artist initial>][ <title continuation>]"
// with the artist "<rest>   <third-column fragment>[ <second artist line>]".
function fixSongPadded(song, by) {
  const ms = PAD.exec(song);
  if (!ms) return null;
  const tok = ms[2].trim().split(/\s+/);
  const c1 = tok.shift();
  let c2 = null;
  const cont = [];
  for (const x of tok) {
    if (!c2 && !cont.length && /^[A-Z0-9]$/.test(x)) c2 = x;
    else cont.push(x);
  }
  const mb = PAD.exec(by);
  let artist = c1 + (mb ? mb[1] : by.trim());
  if (c2 && mb) {
    const tail = mb[2].trim().split(/\s+/);
    tail.shift(); // third-column fragment
    artist += " " + c2 + tail.join(" ");
  }
  return [(ms[1] + (cont.length ? " " + cont.join(" ") : "")).trim(), artist.trim()];
}

// Artist cell padded only: "<artist>   <third-column fragment>[ <artist continuation>]"
// repeated per wrapped line. Fragments are dropped; whole words are kept.
function fixByPadded(by) {
  if (!PAD.test(by)) return null;
  const segs = by.split(/\s{2,}/);
  const words = [segs[0].trim()];
  for (const seg of segs.slice(1)) {
    const tok = seg.trim().split(/\s+/);
    tok.shift();
    for (const t of tok) if (/^[A-Za-z][A-Za-z'.&]+$/.test(t)) words.push(t);
  }
  return words.join(" ");
}

const changes = [];
const problems = [];
const lists = JSON.parse(fs.readFileSync(LISTS, "utf8"));
const remap = new Map(); // "song\u0000by" before -> [song, by] after, for the tracklist excerpts

for (const [pack, p] of Object.entries(lists)) {
  p.tracks.forEach((t, i) => {
    const n = i + 1;
    const before = [t.song, t.by];
    let after = null;
    const m = MANUAL[pack] && MANUAL[pack][n];
    if (m) {
      const [s0, b0, s1, b1] = m;
      if (t.song === s1 && t.by === b1) return; // already repaired
      if ((s0 === null || t.song === s0) && (b0 === null || t.by === b0)) after = [s1, b1];
      else { problems.push(`${pack} #${n}: changed since this fix was written ("${t.song}" / "${t.by}"), left alone`); return; }
    } else {
      const sp = fixSongPadded(t.song, t.by);
      if (sp) after = sp;
      else { const bp = fixByPadded(t.by); if (bp) after = [t.song, bp]; }
    }
    if (!after || (after[0] === before[0] && after[1] === before[1])) return;
    changes.push(`${pack} #${n}\n    - ${before[0]} / ${before[1]}\n    + ${after[0]} / ${after[1]}`);
    remap.set(before.join("\u0000"), after);
    t.song = after[0];
    t.by = after[1];
  });
}

// The tracklist excerpts were extracted separately from the same PDFs, so they
// carry the same damage. Repair them by the same before/after pairs.
const tracks = JSON.parse(fs.readFileSync(TRACKS, "utf8"));
let trackFixes = 0;
for (const [page, tl] of Object.entries(tracks)) {
  for (const r of tl.tracks || []) {
    const hit = remap.get([r.song, r.artist].join("\u0000"));
    if (hit) { r.song = hit[0]; r.artist = hit[1]; trackFixes++; continue; }
    if (/\s{2,}/.test(r.song + "|" + r.artist) || /■/.test(r.song)) problems.push(`tracklist ${page}: unrepaired row "${r.song}" / "${r.artist}"`);
  }
}

// Nothing padded should survive.
for (const [pack, p] of Object.entries(lists))
  p.tracks.forEach((t, i) => { if (/\s{2,}|■/.test(t.song + "|" + t.by)) problems.push(`${pack} #${i + 1}: still damaged "${t.song}" / "${t.by}"`); });

for (const c of changes) console.log(c);
for (const p of problems) console.log(`  PROBLEM: ${p}`);
console.log(`\nsong-list rows: ${changes.length} · tracklist rows: ${trackFixes}`);
console.log(`${WRITE ? "wrote" : "would write"}: ${changes.length + trackFixes ? "_content/song-lists.json, _content/tracklists.json" : "nothing"}`);
if (WRITE && changes.length + trackFixes) {
  // Same shape as the files' own: one-space indent, original trailing newline or none.
  const eol = (f) => (fs.readFileSync(f, "utf8").endsWith("\n") ? "\n" : "");
  const el = eol(LISTS), et = eol(TRACKS);
  fs.writeFileSync(LISTS, JSON.stringify(lists, null, 1) + el);
  fs.writeFileSync(TRACKS, JSON.stringify(tracks, null, 1) + et);
}
if (problems.length) process.exitCode = 1;
