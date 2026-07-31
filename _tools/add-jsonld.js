// Structured data for the whole site.
//
// The site had exactly one JSON-LD block on it — an Organization on the
// homepage. Nothing else: no Product, no FAQPage, no BlogPosting, no
// breadcrumbs. The product pages carried Weebly's old microdata
// (itemtype="http://schema.org/Product", on http), which Google still reads but
// which most AI answer engines don't parse nearly as reliably as JSON-LD.
//
// That matters more than usual here: the data memo shows aio.online referrals up
// 76%, so answer engines are already surfacing this site. They quote what they
// can parse with confidence.
//
// What gets emitted, per page type:
//
//   product pages (73)  Product + Offer + BreadcrumbList
//   category pages      CollectionPage + ItemList + BreadcrumbList
//   blog posts (109)    BlogPosting + BreadcrumbList  (+ HowTo on the guide)
//   blog landing        Blog
//   faqs.html           FAQPage
//   index.html          Organization + WebSite
//
// Everything is derived from what the page already says — name, price, image,
// canonical, publish date. Nothing is invented, and no rating or review markup
// is emitted at all, because there are no real reviews to back it.
//
// The existing microdata is left alone. It does no harm and stripping it is
// churn with a risk of breaking the price tooling that reads those attributes.
//
//   node _tools/add-jsonld.js            # dry run, validates every block
//   node _tools/add-jsonld.js --write
//
// Idempotent: each block is wrapped in a marker and replaced wholesale on re-run.
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const WRITE = process.argv.includes("--write");
const SITE = "https://www.fatcityentertainment.com";
const ORG_ID = `${SITE}/#organization`;
const PERSON_ID = `${SITE}/#dustin-ramsbottom`;

// Pages written in the direct-answer format, whose Q&A schema is read out of
// their own headings rather than hand-maintained alongside them.
const ANSWER_PAGES = new Set(["what-is-music-bingo.html", "music-bingo-rules.html"]);

// Posts that got a genuine content edit during the Jul 2026 SEO pass — title,
// meta, description, or H1 actually changed, not just sitewide infrastructure
// churn (nav/link updates that touched every page). dateModified is only
// meaningful when it reflects a real edit, so this list is hand-maintained
// rather than derived from git, which can't tell content changes from those.
const MODIFIED = new Map([
  ["8-tips-for-hosting-a-most-excellent-trivia-show", "2026-07-31"],
  ["creating-the-perfect-music-bingo-sheet-a-video-tutorial", "2026-07-31"],
  ["how-to-create-an-awesome-music-bingo-party-event-in-3-easy-steps", "2026-07-31"],
  ["music-streaming-options-a-comparison", "2026-07-31"],
  ["the-easiest-way-to-start-a-music-bingo-trivia-night-in-2020", "2026-07-31"],
  ["7-reasons-companies-and-party-planners-are-switching-to-virtual-events", "2026-07-31"],
  ["how-to-host-fat-bottom-trivia-presentations-for-quick-and-easy-event-entertainment-6-steps", "2026-07-31"],
  ["music-bingo-cards-or-game-show-presentations-to-entertain-guests", "2026-07-31"],
  ["paper-decomposes-very-quickly-thats-why-music-bingo-is-the-best-choice-for-a-very-low-carbon-footprint-entertainment-option", "2026-07-31"],
  ["save-money-for-some-christmas-party-games-by-downloading-these-awesome-and-wildly-fun-games", "2026-07-31"],
  ["staff-christmas-parties-will-be-a-bit-different-this-year-but-we-have-you-covered-with-virtual-event-entertainment", "2026-07-31"],
  ["stump-us-with-your-best-sports-trivia-question", "2026-07-31"],
  ["and-then-there-was-hair-music-bingo", "2026-07-31"],
  ["youtube-zoom-tvs-and-twitch-you-can-share-and-play-triv101-anywhere", "2026-07-31"],
  ["experience-nostalgia-with-our-new-90s-rb-music-bingo-game", "2026-07-31"],
  ["from-one-to-10000-hours-our-freshest-and-best-new-music-bingo-category-is-numbers", "2026-07-31"],
]);

const START = "<!-- fce:jsonld -->";
const END = "<!-- /fce:jsonld -->";

const clean = (s) =>
  s.replace(/<[^>]+>/g, " ")
   .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"')
   .replace(/&#39;|&rsquo;/g, "'").replace(/\s+/g, " ").trim();

const attr = (html, re) => { const m = html.match(re); return m ? m[1] : null; };

const canonical = (h) => attr(h, /<link rel="canonical" href="([^"]+)"/i);
const ogImage = (h) => attr(h, /<meta property="og:image" content="([^"]+)"/i);
const metaDesc = (h) => attr(h, /<meta[^>]+name="description"[^>]+content="([^"]*)"/i);
const pageTitle = (h) => { const t = attr(h, /<title>([\s\S]*?)<\/title>/i); return t ? clean(t) : null; };

function walk(dir, out = []) {
  const SKIP = new Set(["_tools", "node_modules", ".git", ".claude", "_export", "_content", "pages"]);
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith(".html")) out.push(p);
  }
  return out;
}

// ---------------------------------------------------------------- builders

// Who is actually saying all this.
//
// Answer engines weight author expertise heavily, and the blog is 109 posts of
// first-hand hosting experience going back to 2016 — written by someone who has
// been doing stand-up since 2011 and hosting trivia professionally throughout.
// None of that was declared anywhere a machine could read it: there was no
// Person on the site at all, so every post was attributed to the company.
//
// The dates here were wrong on the first pass and are worth explaining. They
// were inferred from the blog's earliest post (August 2016), which dated the
// career to the website rather than the person — understating it by seventeen
// years. Corrected from Dustin directly: hosting began in 1999.
//
// That gap is the whole point of this entity. "Hosting since 2016" reads as a
// side project; a run starting in 1999, across three employers and two of his
// own companies, is a career — and it is the single strongest credibility
// signal the site has.
//
// sameAs is an identity link, not a marketing one: it tells a search or answer
// engine that the Dustin Ramsbottom here is the same one on LinkedIn and X, so
// the expertise claim is corroborated off-site instead of self-declared. It
// works whether or not the accounts are active, which matters because these
// ones deliberately aren't. The Instagram account is the company's, so it
// belongs on the Organization rather than here.
function person() {
  return {
    "@type": "Person",
    "@id": PERSON_ID,
    name: "Dustin Ramsbottom",
    jobTitle: "Founder and Host",
    worksFor: { "@id": ORG_ID },
    url: SITE + "/aboutus.html",
    description:
      "Trivia and game show host since 1999, when he began hosting Name That " +
      "Tune for TNT Enterprizes in Calgary. Went on to host for Karaoke World " +
      "and others before founding his own companies — first The Party Factory, " +
      "then Fat City Entertainment. Stand-up comedian since 2011.",
    sameAs: [
      "https://www.linkedin.com/in/dustinramsbottom/",
      "https://x.com/dustyramsbottom",
    ],
    knowsAbout: [
      "music bingo",
      "pub trivia",
      "game show hosting",
      "karaoke hosting",
      "live event entertainment",
      "stand-up comedy",
    ],
  };
}

function organisation() {
  return {
    "@type": "Organization",
    "@id": ORG_ID,
    name: "Fat City Entertainment",
    url: SITE + "/",
    founder: { "@id": PERSON_ID },
    description:
      "Downloadable trivia games, music bingo cards, and game-show hosting " +
      "resources for bars, restaurants, and private parties.",
    // The company's own accounts and sister site. The founder's personal
    // profiles live on the Person entity, not here.
    sameAs: [
      "https://bingocardgenerator.online",
      "https://www.instagram.com/fatcityentertainment/",
    ],
    // Everything sells as a download or a remote booking, so there is no
    // storefront to claim. areaServed says where customers are without
    // asserting a physical address — which is also why there is no
    // LocalBusiness type here.
    areaServed: [
      { "@type": "Country", name: "United States" },
      { "@type": "Country", name: "Canada" },
    ],
  };
}

function website() {
  return {
    "@type": "WebSite",
    "@id": `${SITE}/#website`,
    url: SITE + "/",
    name: "Fat City Entertainment",
    publisher: { "@id": ORG_ID },
  };
}

function breadcrumbs(trail) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: trail.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: t.name,
      item: t.url,
    })),
  };
}

function product(html, url) {
  const name = clean(attr(html, /<h1[^>]*id="wsite-com-product-title"[^>]*>([\s\S]*?)<\/h1>/i) || "");
  if (!name) return null;

  const price = attr(html, /itemprop="price"[^>]*content="([^"]*)"/i);
  const currency = attr(html, /itemprop="priceCurrency"[^>]*content="([^"]*)"/i) || "USD";
  // Weebly marks an unavailable product by dropping the show-price class.
  const inStock = /id="wsite-com-product-price-area"[^>]*class="[^"]*wsite-com-product-show-price/i.test(html);
  // A baked-in Lemon Squeezy href means it can actually be bought right now.
  const buyable = /class="[^"]*\bls-buy\b[^"]*"[^>]*href="https:\/\/[^"]*lemonsqueezy/i.test(html);

  const node = {
    "@type": "Product",
    name,
    url,
    description: metaDesc(html) ? clean(metaDesc(html)) : undefined,
    image: ogImage(html) || undefined,
    brand: { "@type": "Brand", name: "Fat City Entertainment" },
  };

  if (price) {
    node.offers = {
      "@type": "Offer",
      url,
      price,
      priceCurrency: currency,
      availability: inStock && buyable
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      seller: { "@id": ORG_ID },
    };
  }
  return node;
}

function collection(html, url) {
  const name = clean(attr(html, /<h1[^>]*id="wsite-com-title"[^>]*>([\s\S]*?)<\/h1>/i) || pageTitle(html) || "");
  if (!name) return null;

  // The product tiles already on the page, in the order they appear.
  const items = [];
  const re = /<a[^>]+href="(\/store\/p\d+\/[^"]+)"[^>]*>[\s\S]*?<div class="wsite-com-category-product-name"[^>]*>([\s\S]*?)<\/div>/gi;
  let m;
  while ((m = re.exec(html))) {
    const nm = clean(m[2]);
    if (!nm) continue;
    if (items.some((i) => i.item === SITE + m[1])) continue;
    items.push({ "@type": "ListItem", position: items.length + 1, name: nm, item: SITE + m[1] });
  }

  const node = { "@type": "CollectionPage", name, url };
  if (metaDesc(html)) node.description = clean(metaDesc(html));
  if (items.length) node.mainEntity = { "@type": "ItemList", numberOfItems: items.length, itemListElement: items };
  return node;
}

function blogPosting(html, url, slug) {
  const name = clean(attr(html, /<h1[^>]*class="[^"]*\bblog-title\b[^"]*"[^>]*>([\s\S]*?)<\/h1>/i) || "");
  if (!name) return null;

  // "7/25/2026" in the post's own .date-text — the true publish date, which git
  // does not know because every post was imported on the same day.
  let published;
  const d = attr(html, /<span class="date-text">\s*([\d/]+)\s*<\/span>/i);
  if (d) {
    const [mo, day, yr] = d.split("/").map(Number);
    if (yr && mo && day) {
      published = `${yr}-${String(mo).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }

  return {
    "@type": "BlogPosting",
    headline: name.slice(0, 110),
    url,
    mainEntityOfPage: url,
    datePublished: published,
    dateModified: MODIFIED.get(slug) || undefined,
    description: metaDesc(html) ? clean(metaDesc(html)) : undefined,
    image: ogImage(html) || undefined,
    // A named human, not the company. This is the expertise signal answer
    // engines actually weigh, and it was the one thing the round-one schema
    // had nothing to point at.
    author: { "@id": PERSON_ID },
    publisher: { "@id": ORG_ID },
  };
}

// The four real questions on faqs.html. Transcribed from the page rather than
// parsed: they live inside one <div class="paragraph"> separated by <br><br>,
// which is far too loose a shape to parse safely. The fifth heading on that page
// ("Planning an Event?") is a nav label, not a question.
const FAQS = [
  ["What kind of computer do I need to run the games?",
   "Any kind — PC or Mac both work. You only need Microsoft PowerPoint installed. You can even run the games from a phone or tablet. If you don't have PowerPoint, free apps may work fine, though sometimes without full functionality."],
  ["What makes these trivia games different than regular trivia games?",
   "Because you connect a computer or tablet to a big screen, guests can see the questions as well as images and videos. It's more fun when guests read along, and picture questions give a much greater range. Buzzers make the night genuinely interactive."],
  ["Do all the game shows have music?",
   "Sound effects and theme songs are included in every game. We also recommend playing music alongside the games — a service like Spotify works well for keeping the room going while you entertain the crowd."],
  ["How do we keep score?",
   "When a team answers correctly, write the question's value under their name on a scoresheet. With a competitive crowd it can be fun to subtract points for wrong answers. We also recommend bonus points for participation — singing, dancing, or the best moonwalk."],
];

function faqPage(url) {
  return {
    "@type": "FAQPage",
    url,
    mainEntity: FAQS.map(([q, a]) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };
}

// Pages written as question-shaped <h2>s followed by a self-contained answer —
// what-is-music-bingo.html and music-bingo-rules.html. Reading the Q&A pairs out
// of the markup means the schema can't drift from the visible copy, which is the
// failure mode of hand-written FAQ blocks.
function faqFromHeadings(html, url) {
  const pairs = [];
  const re = /<h2[^>]*>([\s\S]*?)<\/h2>([\s\S]*?)(?=<h2[^>]*>|$)/gi;
  let m;
  while ((m = re.exec(html))) {
    const q = clean(m[1]);
    if (!q.endsWith("?")) continue;
    // First paragraph after the heading — the answer meant to stand alone.
    const p = m[2].match(/<div class="paragraph"[^>]*>([\s\S]*?)<\/div>/i);
    if (!p) continue;
    const a = clean(p[1]);
    if (a.length < 40) continue;
    pairs.push([q, a]);
  }
  if (pairs.length < 2) return null;
  return {
    "@type": "FAQPage",
    url,
    mainEntity: pairs.map(([q, a]) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
    // Voice assistants read the heading and its answer; both are the useful part.
    speakable: { "@type": "SpeakableSpecification", cssSelector: ["h1", "h2", ".paragraph"] },
  };
}

// The one post that is genuinely a step-by-step guide. Its section headings are
// the steps, so they're read straight off the page.
function howTo(html, url, name) {
  const steps = [...html.matchAll(/<h2[^>]*class="[^"]*wsite-content-title[^"]*"[^>]*>([\s\S]*?)<\/h2>/gi)]
    .map((m) => clean(m[1]))
    .filter((s) => s && s.length > 3);
  if (steps.length < 3) return null;
  return {
    "@type": "HowTo",
    name,
    url,
    step: steps.map((s, i) => ({ "@type": "HowToStep", position: i + 1, name: s })),
  };
}

// ------------------------------------------------------------------ emit

function injectBlock(html, graph) {
  const json = JSON.stringify(
    { "@context": "https://schema.org", "@graph": graph },
    (k, v) => (v === undefined ? undefined : v),
    1
  );
  JSON.parse(json); // fail loudly here rather than shipping broken markup
  const block = `${START}\n<script type="application/ld+json">\n${json}\n</script>\n${END}`;

  // Replace an earlier managed block if there is one.
  const s = html.indexOf(START);
  if (s !== -1) {
    const e = html.indexOf(END, s);
    if (e !== -1) return html.slice(0, s) + block + html.slice(e + END.length);
  }
  return html.replace(/<\/head>/i, `${block}\n</head>`);
}

let counts = {};
let emitted = 0, skipped = 0;
const bump = (k) => (counts[k] = (counts[k] || 0) + 1);

for (const file of walk(REPO).sort()) {
  const rel = path.relative(REPO, file).replace(/\\/g, "/");
  let html = fs.readFileSync(file, "utf8");
  const before = html;

  if (/http-equiv="refresh"/i.test(html)) { skipped++; continue; }
  if (/content="noindex/i.test(html)) { skipped++; continue; }

  const url = canonical(html);
  if (!url) { skipped++; continue; }

  const graph = [];

  if (rel === "index.html") {
    // The homepage had a hand-written Organization block before this tool
    // existed. Leaving it would declare the entity twice, with the older copy
    // missing areaServed and the @id that everything else now references.
    html = html.replace(
      /\s*<script type="application\/ld\+json">\s*\{[\s\S]*?"@type":\s*"Organization"[\s\S]*?\}\s*<\/script>/i,
      (m) => (html.indexOf(START) !== -1 && html.indexOf(m) > html.indexOf(START) ? m : "")
    );
    graph.push(organisation(), person(), website());
    bump("homepage");
  } else if (/^store\/p\d+\//.test(rel)) {
    const p = product(html, url);
    if (p) {
      graph.push(p, breadcrumbs([
        { name: "Home", url: SITE + "/" },
        { name: "Trivia Store", url: SITE + "/trivia-store.html" },
        { name: p.name, url },
      ]));
      bump("product");
    }
  } else if (/^store\/c\d+/.test(rel)) {
    const c = collection(html, url);
    if (c) {
      graph.push(c, breadcrumbs([
        { name: "Home", url: SITE + "/" },
        { name: "Trivia Store", url: SITE + "/trivia-store.html" },
        { name: c.name, url },
      ]));
      bump("category");
    }
  } else if (rel === "aboutus.html") {
    // person().url points here, so this is where the full entity belongs.
    graph.push(person(), {
      "@type": "AboutPage",
      url,
      name: pageTitle(html) || "About Fat City Entertainment",
      description: metaDesc(html) ? clean(metaDesc(html)) : undefined,
      mainEntity: { "@id": ORG_ID },
    });
    bump("about");
  } else if (rel === "faqs.html") {
    graph.push({
      ...faqPage(url),
      speakable: { "@type": "SpeakableSpecification", cssSelector: ["h1", ".paragraph"] },
    });
    bump("faq");
  } else if (ANSWER_PAGES.has(rel)) {
    const faq = faqFromHeadings(html, url);
    if (faq) {
      graph.push(faq);
      bump("answer page");
      // No HowTo here. These pages are written as questions, and HowToStep is
      // meant to hold an action — emitting "What counts as a win?" as a step
      // would be describing the markup rather than the page. FAQPage is the
      // honest shape for a Q&A page; the hosting guide keeps the HowTo.
    }
  } else if (rel === "triviahostresources.html") {
    graph.push({
      "@type": "Blog",
      "@id": `${SITE}/triviahostresources.html#blog`,
      url,
      name: "Trivia Host Resources",
      description: metaDesc(html) ? clean(metaDesc(html)) : undefined,
      publisher: { "@id": ORG_ID },
    });
    bump("blog");
  } else if (/^triviahostresources\/[^/]+\/index\.html$/.test(rel)) {
    const slug = rel.split("/")[1];
    const b = blogPosting(html, url, slug);
    if (b) {
      graph.push(b, breadcrumbs([
        { name: "Home", url: SITE + "/" },
        { name: "Trivia Host Resources", url: SITE + "/triviahostresources.html" },
        { name: b.headline, url },
      ]));
      bump("post");
      if (/how-to-run-a-music-bingo-night/.test(rel)) {
        const h = howTo(html, url, b.headline);
        if (h) { graph.push(h); bump("howto"); }
      }
    }
  }

  if (!graph.length) { skipped++; continue; }

  // Every page carries the org so answer engines can tie the entities together.
  if (!graph.some((n) => n["@id"] === ORG_ID)) graph.push({ "@id": ORG_ID, "@type": "Organization", name: "Fat City Entertainment", url: SITE + "/" });

  // A page that names the author by @id has to define it too — a dangling
  // reference to an entity declared only on the homepage is a reference most
  // parsers won't follow.
  if (JSON.stringify(graph).includes(PERSON_ID) && !graph.some((n) => n["@id"] === PERSON_ID)) {
    graph.push({ "@id": PERSON_ID, "@type": "Person", name: "Dustin Ramsbottom", url: SITE + "/aboutus.html" });
  }

  html = injectBlock(html, graph);
  if (html !== before) {
    if (WRITE) fs.writeFileSync(file, html);
    emitted++;
  }
}

console.log("blocks emitted by page type:");
for (const [k, v] of Object.entries(counts).sort()) console.log(`   ${k.padEnd(10)} ${v}`);
console.log(`\npages written : ${emitted}`);
console.log(`pages skipped : ${skipped}   (redirect stubs, noindex, list pages)`);
if (!WRITE) console.log("\nDRY RUN — nothing written. Re-run with --write.");
