// ==========================================================================
// Lemon Squeezy checkout links — every product's Buy button reads from this map.
// --------------------------------------------------------------------------
// TO WIRE A PRODUCT:
//   1. Lemon Squeezy → Products → (product) → Share → copy the checkout link.
//   2. Paste it between the quotes for the matching "pNN" line below.
//   3. Flip that line's  [ ]  to  [x].  The buy button activates automatically;
//      products left empty show a "contact us to order" note instead.
//
// STATUS: 68 of 74 wired — 6 to go.  Search "[ ]" to find them.
//
// PRICES ARE NOW USD. The "CA$" amounts in the comments below are the OLD
// Weebly prices, kept as reference while you re-price each product in USD.
// After wiring a product, update the on-page price with:
//   node _tools/set-usd-price.js pNN <usd> [<sale-usd>]
// (see LEMONSQUEEZY-TODO.md for the full workflow)
// ==========================================================================
window.LS_LINKS = {
  "handbook": "", // [ ] The Music Bingo Handbook — NEW product — /musicbingohandbook.html
  "p3": "", // [ ] Fat Bottom Trivia Host T-shirt — $15.00 USD — /store/p3/Fat_Bottom_Trivia_Host_T-shirt.html
  "p7": "", // [ ] Triv101 Premium - 1000 Question Add-on — CA$22.00 — /store/p7/triv101premium.html
  "p9": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/b55753e0-7506-40f3-a71d-7cf310995455", // [x] The Wild West — $23.49 USD — /store/p9/thewildwest.html
  "p13": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/7f0f7864-82ce-4098-aef2-f2884f0d03b8", // [x] Sports Pub Night - 'The Olympics' — $23.49 USD — /store/p13/spn11.html
  "p18": "", // [ ] How To Start A Successful Trivia Night - The Fat Bottom Trivia Host Handbook — CA$8.00 — /store/p18/fbthandbook.html
  "p24": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/5b29383e-3b4e-4990-89bf-fd987490dfd6", // [x] 10,000+ Q&A Pack 1 — $15.00 USD — /store/p24/questionsandanswerspack1.html
  "p25": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/4fd1d1b0-181e-47af-8830-522cf7f9f782", // [x] 10,000+ Q&A Pack 2 — $15.00 USD — /store/p25/10,000__Q&A_Pack_2.html
  "p26": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/c98a7947-0563-4e5c-a55c-f96d4b7c3cf3", // [x] 13,000+ Q&A Pack 4 — $15.00 USD — /store/p26/13,000__Q&A_Pack_4.html
  "p27": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/f55c00b5-7139-41fe-935a-77bf0131bfb9", // [x] 10,000+ Q&A Pack 3 — $15.00 USD — /store/p27/10,000__Q&A_Pack_3.html
  "p28": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/b483369a-a045-4e71-aaf5-f6b8300a87bf", // [x] Touchdown Trivia (4-Pack) — $72.99 USD — /store/p28/touchdowntriviapack.html
  "p33": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/be117494-8134-4d41-a031-133901ee478b", // [x] Halloween Party Trivia 2-Pack — $32.99 USD — /store/p33/fatbottomtrivia15.html
  "p42": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/a28b7e57-be5d-4b5d-a14f-3ec9a6baa683", // [x] Christmas Party Trivia 3-Pack — $53.99 USD — /store/p42/Christmaspartypack.html
  "p49": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/10e8a04c-a720-48d6-9ee0-bd7c44755190", // [x] Game Show Trivia - 5 Pack — $87.99 USD — /store/p49/FBTgk5pack1.html
  "p51": "", // [ ] FBT 3.1 Valentine's Day Special — CA$29.00 — /store/p51/fatbottomtrivia31.html
  "p53": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/90825928-76b6-418b-a293-5bdf5af64756", // [x] St. Patrick's Day Trivia 2-Pack — $32.99 USD — /store/p53/stpatricksday.html
  "p62": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/7bdea84a-857c-48d4-8835-8645ac06ba72", // [x] Golden Oldies - 250 Music Bingo Cards — $10.99 USD — /store/p62/goldenoldies.html
  "p63": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/507a3fa6-f5fc-4152-a3ea-fadf740d4d9f", // [x] Hair Bands - 250 Music Bingo Cards — $10.99 USD — /store/p63/hairbands.html
  "p65": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/9f5766a5-d2c8-490e-b98c-50495012057e", // [x] Bingo Card Generator Pro *Lifetime Access* — $59.00 USD — /store/p65/bingocardgeneratorpro.html
  "p71": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/0f76b455-eabb-40c4-8ef2-70a879dbadb7", // [x] Zoo Rock - 250 Music Bingo Cards — $10.99 USD — /store/p71/zoorock.html
  "p72": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/8a401811-28e7-405a-befe-786fb9a59e65", // [x] Rocker Moms - (Great For Mother's Day Too!) — $10.99 USD — /store/p72/rockermoms.html
  "p81": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/70d9e978-42f1-4fd3-882e-c9eb6818d57a", // [x] One Hit Wonders - 250 Music Bingo Cards — $10.99 USD — /store/p81/onehitwonders.html
  "p92": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/77384b06-e917-4a34-8a1d-a9f0be7e6d03", // [x] Food Fight - 250 Music Bingo Cards — $10.99 USD — /store/p92/foodfight.html
  "p95": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/75865fb7-7abe-42d4-adc4-87eee0ad1ca9", // [x] Video Games - 250 Music Bingo Cards — $10.99 USD — /store/p95/videogames.html
  "p97": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/669361de-d488-48de-8d54-fbf27ca6151f", // [x] Halloween Party - 250 Music Bingo Cards — $10.99 USD — /store/p97/halloweenparty.html
  "p100": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/ce1e537e-d804-4132-bf7f-a2bd76751f4b", // [x] Countries - 250 Music Bingo Cards — $10.99 USD — /store/p100/Countries.html
  "p101": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/72357641-1bff-4494-9b1e-7000cd1ad6e9", // [x] 'The Year Was...' Music Bingo 5-Pack — $42.99 USD — /store/p101/theyearwas4pack.html
  "p102": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/7db5c34d-c10e-4265-82de-4c97f89ccfc3", // [x] TV Shows 1 - 250 Music Bingo Cards — $10.99 USD — /store/p102/tvshows.html
  "p103": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/2d99e2d4-8845-4b54-834f-5f0a4a7026f1", // [x] Christmas Party - 250 Music Bingo Cards — $10.99 USD — /store/p103/christmasparty.html
  "p106": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/770a5a32-9909-4de9-ab5a-83a4404d54fe", // [x] Movie Soundtracks 1 - 250 Music Bingo Cards — $10.99 USD — /store/p106/moviesoundtracks.html
  "p108": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/333e40b4-b1fd-4b91-a81e-ade465b3a601", // [x] 'Entertainers' Music Bingo 3-Pack — $27.00 USD — /store/p108/entertainerspack.html
  "p109": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/6a13d7d1-647f-40cb-9107-a70c47f52f3b", // [x] Body Parts - 250 Music Bingo Cards — $10.99 USD — /store/p109/bodyparts.html
  "p110": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/877e3537-426c-4eac-af48-bf35a0403ca8", // [x] Out Of This World - 250 Music Bingo Cards — $10.99 USD — /store/p110/outofthisworld.html
  "p111": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/ffd8f661-8551-4e58-aaaf-4a77753d709b", // [x] Girls Vs Boys — $10.99 USD — /store/p111/girlsvsboys.html
  "p112": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/81c3fbf2-d1e9-451d-9e7e-18b74eb37a9b", // [x] Music Bingo Gold Club — $235.50 USD — /store/p112/GoldClub.html
  "p113": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/f3c90249-36e1-41f5-ac59-a8544858f59b", // [x] The 90s - 250 Music Bingo Cards — $10.99 USD — /store/p113/the90s.html
  "p114": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/18bbeb2f-69bd-4180-b7bd-9d26becb9233", // [x] Antonyms - 250 Music Bingo Cards — $10.99 USD — /store/p114/antonyms.html
  "p115": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/337af8d7-2a69-4a93-a9d6-df79cc689b45", // [x] The 70s - 250 Music Bingo Cards — $10.99 USD — /store/p115/the1970s.html
  "p116": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/c47d859e-f545-4d90-8d08-4a0ff40233e6", // [x] Anagrams - 250 Music Bingo Cards — $10.99 USD — /store/p116/anagrams.html
  "p117": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/061d0519-e1b0-471c-ad2a-371f82f6625d", // [x] Nicknames - 250 Music Bingo Cards — $10.99 USD — /store/p117/nicknames.html
  "p121": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/7be9a955-1a63-4b0f-9e49-88df7b1900db", // [x] Life's A Beach - 250 Music Bingo Cards — $10.99 USD — /store/p121/lifesabeach.html
  "p122": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/8b9ba3e3-05f2-423a-8199-1ad8bc04e257", // [x] Cities - 250 Music Bingo Cards — $10.99 USD — /store/p122/cities.html
  "p123": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/291bfdbb-897d-43da-9c2c-0cbc8a1e332c", // [x] 'Music Trivia Party' Game Show - 3 Pack — $46.99 USD — /store/p123/MTPpack1.html
  "p124": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/e8094d8b-2de5-4e8d-8ec8-4cb8a1258e63", // [x] Stadium Songs - 250 Music Bingo Cards — $10.99 USD — /store/p124/stadiumsongs.html
  "p125": "", // [ ] 'One Hit Wonders 2' - 250 Music Bingo Cards — CA$11.00 — /store/p125/onehitwonders2.html
  "p126": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/a30d9c73-ba07-493a-b6da-3b87dca2f7f9", // [x] 'Video Games' Trivia - 3 Pack — $63.99 USD — /store/p126/videogametrivia.html
  "p127": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/274a06f1-c018-4259-944c-f0a4f112bfc5", // [x] Movie Soundtracks - 3 Pack — $23.99 USD — /store/p127/moviesoundtracks3pack.html
  "p128": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/de58d22b-4ddb-4d90-9d0c-a93a6eb69a90", // [x] One Hit Wonders 2-Pack — $18.99 USD — /store/p128/onehitwonders2pack.html
  "p129": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/63c7d3fb-45b4-48ea-b0e9-913aca4dcb56", // [x] Cover Tunes - 250 Music Bingo Cards — $10.99 USD — /store/p129/covertunes.html
  "p130": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/b4f4670c-3a7f-4503-8cd8-ad4efd5e2220", // [x] Music Bingo Silver Club — $209.00 USD — /store/p130/SilverClub.html
  "p131": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/028a1234-44ee-434f-b015-3f2bd6c4cbe1", // [x] Music Bingo Bronze - Top 10 Pack — $87.00 USD — /store/p131/BronzeClub.html
  "p132": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/35e35d4f-390a-47be-888a-8bc13914c8a5", // [x] Road Trip! - 250 Music Bingo Cards — $10.99 USD — /store/p132/roadtrip.html
  "p133": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/57441f4e-5bba-4394-8e50-dc88c4e3000c", // [x] Cartoons - 250 Music Bingo Cards — $10.99 USD — /store/p133/cartoons.html
  "p135": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/9623a506-8943-4cfe-9cad-5c162a720eb6", // [x] Valentine's Day Trivia 2-Pack — $32.99 USD — /store/p135/valentinestriviapack.html
  "p136": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/aad03863-e34e-4f37-897d-1c0ca35c3ccb", // [x] St. Patrick's Day - 250 Music Bingo Cards — $10.99 USD — /store/p136/stpaddysbingo.html
  "p137": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/f85a7f7b-b391-44da-8421-7bc344122753", // [x] Consult Hour — $65.00 USD — /store/p137/eventpayment.html
  "p138": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/50150a8f-c9ee-4e92-9ae5-dd606e4940f5", // [x] A Bunch of 'Babies' - 250 Music Bingo Cards — $10.99 USD — /store/p138/abunchofbabies.html
  "p140": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/e4559e54-ed4a-454d-8829-913826b70df8", // [x] Zoom Party - Music Bingo, Trivia, Comedy — $295.00 USD — /store/p140/virtualeventpayment.html
  "p141": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/b618b3fc-b10e-4498-aa31-2f6a9a191a7c", // [x] Rowdy Country - 250 Music Bingo Cards — $10.99 USD — /store/p141/rowdycountry.html
  "p143": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/5f276932-2485-48c1-ba1a-113f65677545", // [x] Motown - 250 Music Bingo Cards — $10.99 USD — /store/p143/motown.html
  "p144": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/11dcbdb3-bb30-46ad-a602-20c986a813a7", // [x] The 80s - 250 Music Bingo Cards — $10.99 USD — /store/p144/the80s.html
  "p145": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/92e17f57-8db9-4b0a-8417-821c42fef549", // [x] Colors - 250 Music Bingo Cards — $10.99 USD — /store/p145/colors.html
  "p146": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/e61ec31f-5e28-4e10-8614-90fed8556d28", // [x] The 2000s - 250 Music Bingo Cards — $10.99 USD — /store/p146/the2000s.html
  "p147": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/88eccd0a-0fd9-4cca-b941-76a833f3192a", // [x] 'Decades' Music Bingo 5-Pack — $43.00 USD — /store/p147/decades.html
  "p148": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/aecab422-61c9-4b39-bcda-5612b2a55699", // [x] Guitar Gods - 250 Music Bingo Cards — $10.99 USD — /store/p148/guitargods.html
  "p149": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/e8cad9f0-3e86-42d7-9e0f-dae62cc907b9", // [x] April Fools (Soundalikes) - 250 Music Bingo Cards — $10.99 USD — /store/p149/aprilsfoolsday.html
  "p153": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/1fe18c3a-5567-4558-a873-222bd36cc43b", // [x] The 60s - 250 Music Bingo Cards — $10.99 USD — /store/p153/the60s.html
  "p155": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/5cf46eea-20ac-4292-981b-0c7954334ab8", // [x] 'Holidays' Music Bingo 6-Pack — $46.99 USD — /store/p155/holidays.html
  "p156": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/8537c4bb-5de5-470c-aa19-1b8f46602b48", // [x] Numbers - 250 Music Bingo Cards — $10.99 USD — /store/p156/numbers.html
  "p158": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/d322bd9f-1b3c-4da6-8286-00d7611ac0de", // [x] Acronyms - 250 Music Bingo Cards — $10.99 USD — /store/p158/acronyms.html
  "p159": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/aee876f7-7267-4c45-a03d-c95a4375b54e", // [x] Disco - 250 Music Bingo Cards — $10.99 USD — /store/p159/Disco.html
  "p160": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/f1eac68d-e487-4613-8ed2-40f386bf5375", // [x] 90s R&B - 250 Music Bingo Cards — $10.99 USD — /store/p160/90sRnB.html
  "p162": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/57c2c76f-a157-4fd9-977d-370c3a7bd7cd", // [x] Word Games - 3 Pack — $27.00 USD — /store/p162/Word_Games_-_3_Pack.html
  "p163": "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/b6ff3a61-b96c-4149-9ce6-7e2771736807", // [x] TV Shows 2 - 250 Music Bingo Cards — $10.99 USD — /store/p163/tvthemes2.html
};

// USD display prices for NEW pages that use <span class="ls-price" data-product="...">
// (the legacy /store/ pages have their prices baked into the HTML — update those
// with _tools/set-usd-price.js instead). Format exactly as it should render,
// e.g. "$14 USD". Leave "" to hide the price until the product is listed.
window.LS_PRICES = {
  "handbook": "",
};
