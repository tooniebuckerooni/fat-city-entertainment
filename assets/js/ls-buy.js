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
  // or before `start` and an expiry at least ONE DAY AFTER `end` (dates here are
  // UTC midnights; a buffer means no visitor anywhere sees a chip the checkout
  // has already stopped honouring). A chip promising a discount the checkout
  // does not apply is the p140 failure from the buyer's side.
  //
  // SCOPE EVERY CODE TO ITS PRODUCTS in LemonSqueezy. The store is shared with
  // the Bingo Card Generator subscriptions; an unscoped code discounts those too.
  //
  // `end` is EXCLUSIVE: "2026-11-01" means the last day is 31 Oct. Copy a visitor
  // reads, so no em-dashes in `name` (CLAUDE.md). Owner's playbook, with the
  // reasons behind every entry: HOLIDAY-SALE-2026.md.
  var PROMOS = [
    { code: "SPOOKY20", name: "Halloween Countdown", pct: 20,
      start: "2026-10-10", end: "2026-11-01", live: false,
      products: ["p189"] },
    // Nov 1 to 8 is deliberately empty: the election promo's week.
    { code: "EARLYBIRD15", name: "Christmas Early Bird", pct: 15,
      start: "2026-11-09", end: "2026-11-27", live: false,
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

  function utc(d) { var p = d.split("-"); return Date.UTC(+p[0], +p[1] - 1, +p[2]); }
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
    var last = new Date(utc(pr.end) - 86400000);
    var chip = document.createElement("p");
    chip.className = "fce-promo-chip";
    var b = document.createElement("strong");
    b.textContent = pr.name + ": " + pr.pct + "% off";
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
      last.getUTCDate() + " " + MONTHS[last.getUTCMonth()] + "."));
    area.parentNode.insertBefore(chip, area.nextSibling);
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
