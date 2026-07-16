// ==========================================================================
// Lemon Squeezy checkout links — every product's Buy button reads from this map.
// --------------------------------------------------------------------------
// TO WIRE A PRODUCT:
//   1. Lemon Squeezy → Products → (product) → Share → copy the checkout link.
//   2. Paste it between the quotes for the matching "pNN" line below.
//   3. Flip that line's  [ ]  to  [x].  The buy button activates automatically;
//      products left empty show a "contact us to order" note instead.
//
// STATUS: 22 of 74 wired — 52 to go.  Search "[ ]" to find them.
//
// PRICES ARE NOW USD. The "CA$" amounts in the comments below are the OLD
// Weebly prices, kept as reference while you re-price each product in USD.
// After wiring a product, update the on-page price with:
//   node _tools/set-usd-price.js pNN <usd> [<sale-usd>]
// (see LEMONSQUEEZY-TODO.md for the full workflow)
// ==========================================================================
window.LS_LINKS = {
  "handbook": "", // [ ] The Music Bingo Handbook — NEW product — /musicbingohandbook.html
  "p3": "", // [ ] Fat Bottom Trivia Host T-shirt — CA$19.99 — /store/p3/Fat_Bottom_Trivia_Host_T-shirt.html
  "p7": "", // [ ] Triv101 Premium - 1000 Question Add-on — CA$22.00 — /store/p7/triv101premium.html
  "p9": "", // [ ] The Wild West — CA$29.00 — /store/p9/thewildwest.html
  "p13": "", // [ ] Sports Pub Night - 'The Olympics' — CA$29.00 — /store/p13/spn11.html
  "p18": "", // [ ] How To Start A Successful Trivia Night - The Fat Bottom Trivia Host Handbook — CA$8.00 — /store/p18/fbthandbook.html
  "p24": "", // [ ] 10,000+ Q&A Pack 1 — $24.00 USD — /store/p24/questionsandanswerspack1.html
  "p25": "", // [ ] 10,000+ Q&A Pack 2 — CA$24.00 — /store/p25/10,000__Q&A_Pack_2.html
  "p26": "", // [ ] 13,000+ Q&A Pack 4 — CA$19.99 — /store/p26/13,000__Q&A_Pack_4.html
  "p27": "", // [ ] 10,000+ Q&A Pack 3 — CA$24.00 — /store/p27/10,000__Q&A_Pack_3.html
  "p28": "", // [ ] Touchdown Trivia (4-Pack) — CA$65.00 — /store/p28/touchdowntriviapack.html
  "p33": "", // [ ] Halloween Party Trivia 2-Pack — CA$27.00 — /store/p33/fatbottomtrivia15.html
  "p42": "", // [ ] Christmas Party Trivia 3-Pack — $44.00 USD — /store/p42/Christmaspartypack.html
  "p49": "", // [ ] Game Show Trivia - 5 Pack — CA$116.00 — /store/p49/FBTgk5pack1.html
  "p51": "", // [ ] FBT 3.1 Valentine's Day Special — CA$29.00 — /store/p51/fatbottomtrivia31.html
  "p53": "", // [ ] St. Patrick's Day Trivia 2-Pack — CA$27.00 — /store/p53/stpatricksday.html
  "p62": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/7bdea84a-857c-48d4-8835-8645ac06ba72", // [x] Golden Oldies - 250 Music Bingo Cards — $10.99 USD — /store/p62/goldenoldies.html
  "p63": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/507a3fa6-f5fc-4152-a3ea-fadf740d4d9f", // [x] Hair Bands - 250 Music Bingo Cards — $10.99 USD — /store/p63/hairbands.html
  "p65": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/9f5766a5-d2c8-490e-b98c-50495012057e", // [x] Bingo Card Generator Pro *Lifetime Access* — $59.00 USD — /store/p65/bingocardgeneratorpro.html
  "p71": "", // [ ] Zoo Rock - 250 Music Bingo Cards — $10.99 USD — /store/p71/zoorock.html
  "p72": "", // [ ] Rocker Moms - (Great For Mother's Day Too!) — $10.99 USD — /store/p72/rockermoms.html
  "p81": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/70d9e978-42f1-4fd3-882e-c9eb6818d57a", // [x] One Hit Wonders - 250 Music Bingo Cards — $10.99 USD — /store/p81/onehitwonders.html
  "p92": "", // [ ] Food Fight - 250 Music Bingo Cards — $10.99 USD — /store/p92/foodfight.html
  "p95": "", // [ ] Video Games - 250 Music Bingo Cards — $10.99 USD — /store/p95/videogames.html
  "p97": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/669361de-d488-48de-8d54-fbf27ca6151f", // [x] Halloween Party - 250 Music Bingo Cards — $10.99 USD — /store/p97/halloweenparty.html
  "p100": "", // [ ] Countries - 250 Music Bingo Cards — CA$11.00 — /store/p100/Countries.html
  "p101": "", // [ ] 'The Year Was...' Music Bingo 5-Pack — CA$45.00 — /store/p101/theyearwas4pack.html
  "p102": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/7db5c34d-c10e-4265-82de-4c97f89ccfc3", // [x] TV Shows 1 - 250 Music Bingo Cards — $10.99 USD — /store/p102/tvshows.html
  "p103": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/2d99e2d4-8845-4b54-834f-5f0a4a7026f1", // [x] Christmas Party - 250 Music Bingo Cards — $10.99 USD — /store/p103/christmasparty.html
  "p106": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/770a5a32-9909-4de9-ab5a-83a4404d54fe", // [x] Movie Soundtracks 1 - 250 Music Bingo Cards — $10.99 USD — /store/p106/moviesoundtracks.html
  "p108": "", // [ ] 'Entertainers' Music Bingo 3-Pack — CA$32.00 — /store/p108/entertainerspack.html
  "p109": "", // [ ] Body Parts - 250 Music Bingo Cards — $10.99 USD — /store/p109/bodyparts.html
  "p110": "", // [ ] Out Of This World - 250 Music Bingo Cards — $10.99 USD — /store/p110/outofthisworld.html
  "p111": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/ffd8f661-8551-4e58-aaaf-4a77753d709b", // [x] Girls Vs Boys — $10.99 USD — /store/p111/girlsvsboys.html
  "p112": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/81c3fbf2-d1e9-451d-9e7e-18b74eb37a9b", // [x] Music Bingo Gold Club — $235.50 USD — /store/p112/GoldClub.html
  "p113": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/f3c90249-36e1-41f5-ac59-a8544858f59b", // [x] The 90s - 250 Music Bingo Cards — $10.99 USD — /store/p113/the90s.html
  "p114": "", // [ ] Antonyms - 250 Music Bingo Cards — CA$11.00 — /store/p114/antonyms.html
  "p115": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/337af8d7-2a69-4a93-a9d6-df79cc689b45", // [x] The 70s - 250 Music Bingo Cards — $10.99 USD — /store/p115/the1970s.html
  "p116": "", // [ ] Anagrams - 250 Music Bingo Cards — $10.99 USD — /store/p116/anagrams.html
  "p117": "", // [ ] Nicknames - 250 Music Bingo Cards — $10.99 USD — /store/p117/nicknames.html
  "p121": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/7be9a955-1a63-4b0f-9e49-88df7b1900db", // [x] Life's A Beach - 250 Music Bingo Cards — $10.99 USD — /store/p121/lifesabeach.html
  "p122": "", // [ ] Cities - 250 Music Bingo Cards — $10.99 USD — /store/p122/cities.html
  "p123": "", // [ ] 'Music Trivia Party' Game Show - 3 Pack — CA$43.00 — /store/p123/MTPpack1.html
  "p124": "", // [ ] Stadium Songs - 250 Music Bingo Cards — $10.99 USD — /store/p124/stadiumsongs.html
  "p125": "", // [ ] 'One Hit Wonders 2' - 250 Music Bingo Cards — CA$11.00 — /store/p125/onehitwonders2.html
  "p126": "", // [ ] 'Video Games' Trivia - 3 Pack — $45.00 USD — /store/p126/videogametrivia.html
  "p127": "", // [ ] Movie Soundtracks - 3 Pack — $24.00 USD — /store/p127/moviesoundtracks3pack.html
  "p128": "", // [ ] One Hit Wonders 2-Pack — $16.99 USD — /store/p128/onehitwonders2pack.html
  "p129": "", // [ ] Cover Tunes - 250 Music Bingo Cards — $10.99 USD — /store/p129/covertunes.html
  "p130": "", // [ ] Music Bingo Silver Club — CA$225.00 — /store/p130/SilverClub.html
  "p131": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/028a1234-44ee-434f-b015-3f2bd6c4cbe1", // [x] Music Bingo Bronze - Top 10 Pack — $87.00 USD — /store/p131/BronzeClub.html
  "p132": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/35e35d4f-390a-47be-888a-8bc13914c8a5", // [x] Road Trip! - 250 Music Bingo Cards — $10.99 USD — /store/p132/roadtrip.html
  "p133": "", // [ ] Cartoons - 250 Music Bingo Cards — $10.99 USD — /store/p133/cartoons.html
  "p135": "", // [ ] Valentine's Day Trivia 2-Pack — CA$25.00 — /store/p135/valentinestriviapack.html
  "p136": "", // [ ] St. Patrick's Day - 250 Music Bingo Cards — $10.99 USD — /store/p136/stpaddysbingo.html
  "p137": "", // [ ] Consult Hour — CA$80.00 — /store/p137/eventpayment.html
  "p138": "", // [ ] A Bunch of 'Babies' - 250 Music Bingo Cards — $10.99 USD — /store/p138/abunchofbabies.html
  "p140": "", // [ ] Zoom Party - Music Bingo, Trivia, Comedy — CA$375.00 — /store/p140/virtualeventpayment.html
  "p141": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/b618b3fc-b10e-4498-aa31-2f6a9a191a7c", // [x] Rowdy Country - 250 Music Bingo Cards — $10.99 USD — /store/p141/rowdycountry.html
  "p143": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/5f276932-2485-48c1-ba1a-113f65677545", // [x] Motown - 250 Music Bingo Cards — $10.99 USD — /store/p143/motown.html
  "p144": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/11dcbdb3-bb30-46ad-a602-20c986a813a7", // [x] The 80s - 250 Music Bingo Cards — $10.99 USD — /store/p144/the80s.html
  "p145": "", // [ ] Colors - 250 Music Bingo Cards — $10.99 USD — /store/p145/colors.html
  "p146": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/e61ec31f-5e28-4e10-8614-90fed8556d28", // [x] The 2000s - 250 Music Bingo Cards — $10.99 USD — /store/p146/the2000s.html
  "p147": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/88eccd0a-0fd9-4cca-b941-76a833f3192a", // [x] 'Decades' Music Bingo 5-Pack — $43.00 USD — /store/p147/decades.html
  "p148": "", // [ ] Guitar Gods - 250 Music Bingo Cards — $10.99 USD — /store/p148/guitargods.html
  "p149": "", // [ ] April Fools (Soundalikes) - 250 Music Bingo Cards — CA$11.00 — /store/p149/aprilsfoolsday.html
  "p153": "", // [ ] The 60s - 250 Music Bingo Cards — $10.99 USD — /store/p153/the60s.html
  "p155": "", // [ ] 'Holidays' Music Bingo 6-Pack — CA$50.00 — /store/p155/holidays.html
  "p156": "", // [ ] Numbers - 250 Music Bingo Cards — $10.99 USD — /store/p156/numbers.html
  "p158": "", // [ ] Acronyms - 250 Music Bingo Cards — CA$11.00 — /store/p158/acronyms.html
  "p159": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/aee876f7-7267-4c45-a03d-c95a4375b54e", // [x] Disco - 250 Music Bingo Cards — $10.99 USD — /store/p159/Disco.html
  "p160": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/f1eac68d-e487-4613-8ed2-40f386bf5375", // [x] 90s R&B - 250 Music Bingo Cards — $10.99 USD — /store/p160/90sRnB.html
  "p162": "", // [ ] Word Games - 3 Pack — CA$32.00 — /store/p162/Word_Games_-_3_Pack.html
  "p163": "", // [ ] TV Shows 2 - 250 Music Bingo Cards — $10.99 USD — /store/p163/tvthemes2.html
};

// USD display prices for NEW pages that use <span class="ls-price" data-product="...">
// (the legacy /store/ pages have their prices baked into the HTML — update those
// with _tools/set-usd-price.js instead). Format exactly as it should render,
// e.g. "$14 USD". Leave "" to hide the price until the product is listed.
window.LS_PRICES = {
  "handbook": "",
};
