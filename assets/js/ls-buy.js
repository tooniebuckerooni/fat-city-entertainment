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
(function () {
  function init() {
    var buttons = document.querySelectorAll(".ls-buy[data-product]");
    var anyActive = false;
    for (var i = 0; i < buttons.length; i++) {
      var btn = buttons[i];
      var link = (window.LS_LINKS || {})[btn.getAttribute("data-product")] || "";
      var pending = btn.parentNode.querySelector(".ls-pending");
      if (link) {
        btn.setAttribute("href", link);
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
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
