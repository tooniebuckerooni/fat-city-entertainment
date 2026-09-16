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
        btn.setAttribute("href", withPromoCode(link));
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
