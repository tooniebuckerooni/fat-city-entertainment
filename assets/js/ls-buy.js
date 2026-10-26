// Activates LemonSqueezy buy buttons on product pages.
// Reads window.LS_LINKS (assets/js/ls-links.js). If a link exists for the
// product, the button is shown and opens LemonSqueezy's overlay checkout;
// otherwise a "contact us" note is shown instead.
//
// Note: _tools/bake-buy-links.js writes this same state into the HTML ahead of
// time, so the button already works before this file runs and still works if it
// never does. This stays the authority — it re-applies everything idempotently,
// which keeps a stale baked page correct after ls-links.js changes — and it is
// still the only thing that loads lemon.js for the overlay checkout.
//
// It also builds the sticky phone buy bar (see stickyBar() at the foot of this
// file). That lives here rather than in its own asset because this file is
// already on exactly the 100 pages that have a buy button, it already runs at
// the right moment, and it already owns the one clone-a-button idiom the bar
// needs. A separate asset would have meant a new injection tool, a new
// cache-bust to keep in step and another entry in the weekly health check, for
// no behaviour this file cannot reach.
(function () {
  // THE PROMO CALENDAR (9 Oct 2026). Dated, per-product LemonSqueezy discount
  // codes, set up ONCE in the dashboard and then run by the calendar: the owner
  // is at the dashboard on a few weekends, not on the day a sale starts, so a
  // sale that needs a dashboard visit to begin or end is a sale that overruns.
  //
  // For each entry, on the product pages it names and only between its dates:
  //   - the code is prefilled into the checkout URL (the same documented
  //     checkout[discount_code] parameter the sitewide promo uses), and
  //   - a chip under the price says what it is and when it ends.
  // Outside the window, or with `live: false`, nothing happens at all.
  //
  // `live` IS THE SAFETY CATCH. Flip it to true only once the code really
  // exists in LemonSqueezy, scoped to exactly these products, with a start on
  // or before `start` and an expiry at least ONE DAY AFTER `end`. Dates are the
  // VISITOR'S OWN midnights (changed 12 Oct 2026; they were UTC midnights, which
  // ended SPOOKY20 at 5pm Pacific on Halloween itself, while the countdown chip
  // was telling the same visitor to buy tonight). The last time zone reaches
  // `end` about 10:00 UTC the next day, so the one-day LS buffer still covers
  // every visitor, and no one anywhere sees a chip the checkout has stopped
  // honouring. A chip promising a discount the checkout
  // does not apply is the p140 failure from the buyer's side.
  //
  // SCOPE EVERY CODE TO ITS PRODUCTS in LemonSqueezy. The store is shared with
  // the Bingo Card Generator subscriptions; an unscoped code discounts those too.
  //
  // `end` is EXCLUSIVE: "2026-11-01" means the last day is 31 Oct. Copy a visitor
  // reads, so no em-dashes in `name` (CLAUDE.md). Owner's playbook, with the
  // reasons behind every entry: HOLIDAY-SALE-2026.md.
  var PROMOS = [
    // Widened 12 Oct 2026 (owner, one code only, 5-10 products): the Halloween
    // line plus the four best-selling packs, so one email can carry one code.
    { code: "SPOOKY20", name: "Halloween Sale", pct: 20,
      start: "2026-10-12", end: "2026-11-01", live: true, // owner confirmed live 12 Oct 2026
      products: ["p189", "p97", "p174", "p33", "p155", "p147", "p131", "p112"] },
    // Nov 1 to 8 is deliberately empty: the election promo's week.
    { code: "EARLYBIRD15", name: "Christmas Early Bird", pct: 15, // start moved 9 Nov to 4 Nov on 26 Oct 2026 (owner: full go Christmas)
      start: "2026-11-04", end: "2026-11-27", live: false,
      products: ["p190", "p42", "p155"] },
    { code: "BLACKFRIDAY25", name: "Black Friday", pct: 25,
      start: "2026-11-27", end: "2026-12-01", live: false,
      products: ["p190", "p189", "p42", "p155", "p131", "p130", "p112",
                 "p147", "p101", "p168", "p165", "p166", "p176", "p127",
                 "p108", "p162", "p128", "p123", "p126", "p49", "p28"] },
    // The 12 Days of Fat City: one PACK a day, 30% off, for 24 hours. Packs
    // only, on purpose: a single at 30% off is $8.39, a hair under the 5-pack's
    // $8.40 a game, and the ladder is the AOV engine (pricing-strategy skill).
    { code: "12DAYS-1", name: "12 Days of Fat City, day 1", pct: 30, start: "2026-12-01", end: "2026-12-02", live: false, products: ["p190"] },
    { code: "12DAYS-2", name: "12 Days of Fat City, day 2", pct: 30, start: "2026-12-02", end: "2026-12-03", live: false, products: ["p165"] },
    { code: "12DAYS-3", name: "12 Days of Fat City, day 3", pct: 30, start: "2026-12-03", end: "2026-12-04", live: false, products: ["p131"] },
    { code: "12DAYS-4", name: "12 Days of Fat City, day 4", pct: 30, start: "2026-12-04", end: "2026-12-05", live: false, products: ["p42"] },
    { code: "12DAYS-5", name: "12 Days of Fat City, day 5", pct: 30, start: "2026-12-05", end: "2026-12-06", live: false, products: ["p147"] },
    { code: "12DAYS-6", name: "12 Days of Fat City, day 6", pct: 30, start: "2026-12-06", end: "2026-12-07", live: false, products: ["p155"] },
    { code: "12DAYS-7", name: "12 Days of Fat City, day 7", pct: 30, start: "2026-12-07", end: "2026-12-08", live: false, products: ["p176"] },
    { code: "12DAYS-8", name: "12 Days of Fat City, day 8", pct: 30, start: "2026-12-08", end: "2026-12-09", live: false, products: ["p166"] },
    { code: "12DAYS-9", name: "12 Days of Fat City, day 9", pct: 30, start: "2026-12-09", end: "2026-12-10", live: false, products: ["p127"] },
    { code: "12DAYS-10", name: "12 Days of Fat City, day 10", pct: 30, start: "2026-12-10", end: "2026-12-11", live: false, products: ["p168"] },
    { code: "12DAYS-11", name: "12 Days of Fat City, day 11", pct: 30, start: "2026-12-11", end: "2026-12-12", live: false, products: ["p130"] },
    { code: "12DAYS-12", name: "12 Days of Fat City, day 12", pct: 30, start: "2026-12-12", end: "2026-12-13", live: false, products: ["p112"] },
    { code: "NEWYEAR20", name: "New Year's Eve", pct: 20,
      start: "2026-12-26", end: "2027-01-02", live: false,
      products: ["p101", "p147"] },
  ];
  window.FCE_PROMOS = PROMOS;

  // Local midnight of a "YYYY-MM-DD" date, on the visitor's calendar. (Named
  // utc() before 12 Oct 2026, when it was one; kept short because it is used
  // throughout this file.)
  function utc(d) { var p = d.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]).getTime(); }
  function promoFor(pid) {
    var now = Date.now();
    for (var i = 0; i < PROMOS.length; i++) {
      var pr = PROMOS[i];
      if (!pr.live || pr.products.indexOf(pid) === -1) continue;
      if (now >= utc(pr.start) && now < utc(pr.end)) return pr;
    }
    return null;
  }
  function addCode(url, code) {
    if (url.indexOf("lemonsqueezy.com/checkout/buy/") === -1) return url;
    if (url.indexOf("checkout[discount_code]") !== -1) return url;
    return url + (url.indexOf("?") === -1 ? "?" : "&") +
      "checkout[discount_code]=" + encodeURIComponent(code);
  }
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function promoChip(pr) {
    if (document.querySelector(".fce-promo-chip")) return;
    var area = document.getElementById("wsite-com-product-price-area");
    if (!area || !area.parentNode) return;
    var last = new Date(utc(pr.end) - 1);
    var chip = document.createElement("p");
    chip.className = "fce-promo-chip";
    var b = document.createElement("strong");
    // A page whose price area already shows a struck-through compare-at and a
    // "22% OFF" badge gets "an extra 20% off", so the two read as stacked.
    var extra = /show-price-on-sale/.test(area.className) ? "an extra " : "";
    b.textContent = pr.name + ": " + extra + pr.pct + "% off";
    chip.appendChild(b);
    // The price after the code, read off this page's own itemprop (never baked),
    // rounded the way a percentage discount is: the discount to the cent first.
    // A page already showing "22% OFF" plus a chip saying "20% off" reads as a
    // puzzle; a figure does not.
    var el = area.querySelector('[itemprop="price"]');
    var price = el ? parseFloat(el.getAttribute("content")) : NaN;
    var pay = "";
    if (price > 0) {
      var cents = Math.round(price * 100);
      pay = " You pay $" + ((cents - Math.round(cents * pr.pct / 100)) / 100).toFixed(2) + ";";
    }
    chip.appendChild(document.createTextNode("." + pay +
      " the code is applied at checkout for you. Ends " +
      last.getDate() + " " + MONTHS[last.getMonth()] + "."));
    area.parentNode.insertBefore(chip, area.nextSibling);
  }

  // Promo marks ANYWHERE the calendar should be visible, not just under a
  // product's price (12 Oct 2026, after the owner asked where SPOOKY20 was
  // visible beyond the email: only on the eight product pages). Three hooks,
  // all shipped `hidden` or showing the regular price, and all switched by the
  // same PROMOS entry, so they appear and vanish on its dates with no takedown:
  //   [data-fce-promo-pid="pNN"]   a tile tag: becomes "20% off" (add-promo-tags.js)
  //   [data-fce-promo-code="CODE"] a sentence: "<name>: 20% off <data-fce-promo-text>
  //                                with code CODE. Ends 31 Oct." (hub hero)
  //   [data-fce-promo-price="pNN"] with data-fce-price="35.97": shows the
  //                                regular price struck through and the price
  //                                after the code (hub cards)
  // Every number is derived from the entry and the page's own price; nothing
  // about a sale is ever typed into a page.
  function promoByCode(code){
    var now = Date.now();
    for (var i = 0; i < PROMOS.length; i++) {
      var pr = PROMOS[i];
      if (pr.live && pr.code === code && now >= utc(pr.start) && now < utc(pr.end)) return pr;
    }
    return null;
  }
  function endLabel(pr){ var d = new Date(utc(pr.end) - 1); return d.getDate() + " " + MONTHS[d.getMonth()]; }
  function afterCode(price, pct){ var c = Math.round(price * 100); return (c - Math.round(c * pct / 100)) / 100; }
  function promoMarks(){
    var i, el, pr;
    var tags = document.querySelectorAll("[data-fce-promo-pid]");
    for (i = 0; i < tags.length; i++) {
      el = tags[i]; pr = promoFor(el.getAttribute("data-fce-promo-pid"));
      if (!pr) continue;
      // A tile already showing Weebly's own sale strip ("22% OFF", from the
      // pack's value-stack compare-at) says "Extra 20% off", so the two
      // percentages read as stacked rather than as a contradiction.
      var tile = el.closest ? el.closest("[data-id]") : null;
      var striped = tile && tile.querySelector(".category__image-sale-banner-wrapper.sale-active");
      el.textContent = (striped ? "Extra " : "") + pr.pct + "% off";
      el.setAttribute("title", pr.name + ": " + pr.pct + "% off with code " + pr.code + " until " + endLabel(pr));
      el.removeAttribute("hidden");
    }
    var lines = document.querySelectorAll("[data-fce-promo-code]");
    for (i = 0; i < lines.length; i++) {
      el = lines[i]; pr = promoByCode(el.getAttribute("data-fce-promo-code"));
      if (!pr) continue;
      var b = document.createElement("strong");
      b.textContent = pr.name + ": " + pr.pct + "% off";
      el.textContent = "";
      el.appendChild(b);
      el.appendChild(document.createTextNode(" " + (el.getAttribute("data-fce-promo-text") || "") +
        " with code " + pr.code + ", taken off at checkout. Ends " + endLabel(pr) + "."));
      el.removeAttribute("hidden");
    }
    var prices = document.querySelectorAll("[data-fce-promo-price]");
    for (i = 0; i < prices.length; i++) {
      el = prices[i]; pr = promoFor(el.getAttribute("data-fce-promo-price"));
      var reg = parseFloat(el.getAttribute("data-fce-price"));
      if (!pr || !(reg > 0)) continue;
      var was = document.createElement("s");
      was.textContent = "$" + reg.toFixed(2);
      el.textContent = "";
      el.appendChild(was);
      el.appendChild(document.createTextNode(" $" + afterCode(reg, pr.pct).toFixed(2)));
      el.className += " is-on-promo";
    }
    // An email landing page (/go/<campaign>/): its buttons carry data-fce-price,
    // the product page's own button does not. A reader sent there by "20% off"
    // should see it before checkout, not only at it.
    var btns = document.querySelectorAll(".ls-buy[data-product][data-fce-price]");
    for (i = 0; i < btns.length; i++) {
      el = btns[i]; pr = promoFor(el.getAttribute("data-product"));
      var row = el.parentNode;
      if (!pr || !row || !row.parentNode || (row.nextSibling && row.nextSibling.className === "fce-promo-note")) continue;
      var note = document.createElement("p");
      note.className = "fce-promo-note";
      note.textContent = pr.name + ": " + pr.pct + "% off, you pay $" +
        afterCode(parseFloat(el.getAttribute("data-fce-price")), pr.pct).toFixed(2) +
        ". The code " + pr.code + " is applied at checkout. Ends " + endLabel(pr) + ".";
      row.parentNode.insertBefore(note, row.nextSibling);
    }
    // Cross-sell blocks on OTHER product pages ("The pack is $35.97..."): one
    // sentence per block per promo product it links, price from the link's own
    // data-fce-price (written by add-cross-sell.js).
    var xs = document.querySelectorAll(".fce-cross-sell a[data-fce-price]");
    for (i = 0; i < xs.length; i++) {
      el = xs[i];
      var m2 = (el.getAttribute("href") || "").match(/\/store\/(p\d+)\//);
      pr = m2 && promoFor(m2[1]);
      var block = el.closest ? el.closest(".fce-cross-sell") : null;
      if (!pr || !block || block.querySelector('.fce-promo-xs[data-for="' + m2[1] + '"]')) continue;
      var sp = document.createElement("span");
      sp.className = "fce-promo-xs";
      sp.setAttribute("data-for", m2[1]);
      sp.textContent = " " + pr.name + ": " + el.textContent.trim() + " is $" +
        afterCode(parseFloat(el.getAttribute("data-fce-price")), pr.pct).toFixed(2) +
        " until " + endLabel(pr) + ", code " + pr.code + " applied at checkout.";
      block.appendChild(sp);
    }
    // The storefront's price ladder: a row whose tier links a promo product
    // gets the after-code price beside its own (read off the row).
    var rows = document.querySelectorAll(".fce-ladder tr");
    for (i = 0; i < rows.length; i++) {
      var a = rows[i].querySelector('th a[href*="/store/p"]');
      var cell = rows[i].querySelector(".fce-ladder-price");
      var m3 = a && (a.getAttribute("href") || "").match(/\/store\/(p\d+)\//);
      pr = m3 && promoFor(m3[1]);
      if (!pr || !cell || cell.querySelector(".fce-promo-ladder")) continue;
      var m4 = cell.textContent.match(/\$([0-9,]+\.[0-9]{2})/);
      if (!m4) continue;
      var lp = document.createElement("span");
      lp.className = "fce-promo-ladder";
      lp.textContent = "$" + afterCode(parseFloat(m4[1].replace(/,/g, "")), pr.pct).toFixed(2) + " with " + pr.code;
      cell.appendChild(lp);
    }
  }

  // While a sitewide promo is live (window.FCE_PROMO, set by promo-bar.js —
  // a deferred script, so it runs before our DOMContentLoaded init), append
  // the discount code to LemonSqueezy checkout URLs so the sale price is
  // applied without the buyer finding the collapsed code field. LemonSqueezy
  // reads it via its documented checkout[discount_code] prefill parameter.
  function withPromoCode(url) {
    var promo = window.FCE_PROMO;
    if (!promo || !promo.code) return url;
    if (promo.end && new Date() >= promo.end) return url;
    if (url.indexOf("lemonsqueezy.com/checkout/buy/") === -1) return url;
    if (url.indexOf("checkout[discount_code]") !== -1) return url;
    return url + (url.indexOf("?") === -1 ? "?" : "&") +
      "checkout[discount_code]=" + encodeURIComponent(promo.code);
  }

  function init() {
    try { promoMarks(); } catch (e) { /* never let a sale tag break a buy button */ }
    var buttons = document.querySelectorAll(".ls-buy[data-product]");
    var anyActive = false;
    for (var i = 0; i < buttons.length; i++) {
      var btn = buttons[i];
      var link = (window.LS_LINKS || {})[btn.getAttribute("data-product")] || "";
      var pending = btn.parentNode.querySelector(".ls-pending");
      if (link) {
        var pr = promoFor(btn.getAttribute("data-product"));
        btn.setAttribute("href", pr ? addCode(link, pr.code) : withPromoCode(link));
        if (pr && btn.id === "wsite-com-product-add-to-cart") {
          try { promoChip(pr); } catch (e) { /* never break a buy button */ }
        }
        // Already baked in? Don't append the class a second time.
        if (!/(^|\s)lemonsqueezy-button(\s|$)/.test(btn.className)) {
          btn.className += " lemonsqueezy-button";
        }
        btn.style.display = "";
        if (pending) pending.style.display = "none";
        anyActive = true;
      } else {
        btn.style.display = "none";
        if (pending) pending.style.display = "";
      }
    }
    // Amazon KDP buttons (window.KDP_LINKS) work the same way, minus the overlay
    // checkout — the link just goes to Amazon. An entry is either a plain URL
    // string (one "Buy on Amazon" button) or {kindle, paperback} for editions
    // Amazon lists separately, which gives one labelled button per format.
    var kdp = document.querySelectorAll(".kdp-buy[data-product]");
    for (var k = 0; k < kdp.length; k++) {
      var kbtn = kdp[k];
      var entry = (window.KDP_LINKS || {})[kbtn.getAttribute("data-product")] || "";
      var editions = [];
      if (typeof entry === "string") {
        if (entry) editions.push({ href: entry, label: "" });
      } else if (entry) {
        if (entry.kindle) editions.push({ href: entry.kindle, label: "Kindle edition" });
        if (entry.paperback) editions.push({ href: entry.paperback, label: "Paperback" });
      }
      var kpending = kbtn.parentNode.querySelector(".kdp-pending");
      if (!editions.length) {
        kbtn.style.display = "none";
        if (kpending) kpending.style.display = "";
        continue;
      }
      // The first edition reuses the button already in the page; any second one
      // is cloned from it so it inherits the same styling.
      for (var e = 0; e < editions.length; e++) {
        var target = kbtn;
        if (e > 0) {
          target = kbtn.cloneNode(true);
          target.removeAttribute("id");
          target.style.marginLeft = "8px";
          kbtn.parentNode.insertBefore(target, kbtn.nextSibling);
        }
        target.setAttribute("href", editions[e].href);
        target.style.display = "";
        if (editions[e].label) {
          var inner = target.querySelector(".wsite-button-inner") || target;
          inner.textContent = editions[e].label;
        }
      }
      if (kpending) kpending.style.display = "none";
    }

    var prices = document.querySelectorAll(".ls-price[data-product]");
    for (var j = 0; j < prices.length; j++) {
      var price = (window.LS_PRICES || {})[prices[j].getAttribute("data-product")] || "";
      prices[j].textContent = price;
      prices[j].style.display = price ? "" : "none";
    }
    if (anyActive && !document.getElementById("lemon-js")) {
      var s = document.createElement("script");
      s.id = "lemon-js";
      s.src = "https://assets.lemonsqueezy.com/lemon.js";
      s.defer = true;
      document.body.appendChild(s);
    }
    try { stickyBar(); } catch (e) { /* never let the bar break a buy button */ }
  }

  // A sticky buy bar for phones.
  //
  // reorder-product-cta.js moved the button up under the price, which fixes the
  // first screen but means that on a long page the button is gone once you have
  // scrolled into the description. This puts it back within thumb reach.
  //
  // The bar's button is CLONED from the real one rather than written into the
  // page, for a specific reason: _tools/bake-buy-links.js rewrites only the
  // first .ls-buy anchor it matches (one html.match, one string-needle replace),
  // so a second button in the markup would keep a stale checkout URL the day a
  // link changed, with nothing reporting it. One button in the source, one
  // authority. This is the same clone-and-drop-the-id move the KDP second
  // edition above already makes.
  function stickyBar() {
    if (!window.matchMedia || !window.matchMedia("(max-width: 767px)").matches) return;
    if (!window.IntersectionObserver) return;
    if (document.querySelector(".fce-buybar")) return;

    var area = document.getElementById("wsite-com-product-buy");
    if (!area) return;
    var btn = area.querySelector(".ls-buy[data-product]");
    // No bar for a staged product whose button is deliberately hidden, or for
    // the Amazon page, whose button ls-buy.js may itself have cloned.
    if (!btn || btn.style.display === "none" || !btn.getAttribute("href")) return;
    if (btn.getAttribute("href").charAt(0) === "#") return;

    var title = document.getElementById("wsite-com-product-title");
    var sale = document.querySelector("#wsite-com-product-price-sale .wsite-com-product-price-amount");
    var list = document.querySelector("#wsite-com-product-price .wsite-com-product-price-amount");
    var onSale = /show-price-on-sale/.test(
      (document.getElementById("wsite-com-product-price-area") || {}).className || ""
    );

    var bar = document.createElement("div");
    bar.className = "fce-buybar";
    var inner = document.createElement("div");
    inner.className = "fce-buybar-inner";

    var meta = document.createElement("span");
    meta.className = "fce-buybar-meta";
    var name = document.createElement("span");
    name.className = "fce-buybar-name";
    name.textContent = title ? title.textContent.trim() : "";
    var price = document.createElement("span");
    price.className = "fce-buybar-price";
    // Read off the page, never baked, so the bar cannot quote a stale figure.
    if (onSale && list) {
      var was = document.createElement("span");
      was.className = "fce-buybar-was";
      // "USD" once, on the price being charged. The bar is the narrowest place
      // a price appears on the site and "$59.95 USD $41.99 USD" does not fit a
      // 360px phone without the currency being cut off the end.
      was.textContent = list.textContent.trim().replace(/\s*USD\s*$/, "");
      price.appendChild(was);
    }
    price.appendChild(
      document.createTextNode(((onSale ? sale : list) || {}).textContent
        ? ((onSale ? sale : list).textContent).trim() : "")
    );
    // A live promo: show what the bar's button actually charges, not the page
    // price (the clone carries the code), so the bar agrees with the chip.
    var bp = promoFor(btn.getAttribute("data-product"));
    var ip = document.querySelector('#wsite-com-product-price-area [itemprop="price"]');
    var ipv = ip ? parseFloat(ip.getAttribute("content")) : NaN;
    if (bp && ipv > 0) {
      price.textContent = "";
      var w2 = document.createElement("span");
      w2.className = "fce-buybar-was";
      w2.textContent = "$" + ipv.toFixed(2);
      price.appendChild(w2);
      price.appendChild(document.createTextNode("$" + afterCode(ipv, bp.pct).toFixed(2) + " USD"));
    }
    meta.appendChild(name);
    meta.appendChild(price);

    var clone = btn.cloneNode(true);
    clone.removeAttribute("id");
    clone.className += " fce-buybar-btn";
    clone.style.display = "";

    inner.appendChild(meta);
    inner.appendChild(clone);
    bar.appendChild(inner);
    document.body.appendChild(bar);
    document.body.className += " fce-has-buybar";

    // Show the bar only once the real button has scrolled out of view.
    var io = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting) bar.className = "fce-buybar";
        else bar.className = "fce-buybar fce-buybar--on";
      }
    }, { threshold: 0 });
    io.observe(btn);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
