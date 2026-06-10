// Activates LemonSqueezy buy buttons on product pages.
// Reads window.LS_LINKS (assets/js/ls-links.js). If a link exists for the
// product, the button is shown and opens LemonSqueezy's overlay checkout;
// otherwise a "contact us" note is shown instead.
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
        btn.className += " lemonsqueezy-button";
        btn.style.display = "";
        if (pending) pending.style.display = "none";
        anyActive = true;
      } else {
        btn.style.display = "none";
        if (pending) pending.style.display = "";
      }
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
