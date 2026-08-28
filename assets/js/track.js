// Conversion tracking for the static site.
//
// WHY THIS EXISTS
// ---------------
// Audited 28 Aug 2026: the live site carried exactly one tracking ID
// (G-LYMVV05F3X, on 459 pages) firing gtag('config') and nothing else. Not one
// event. Nine months of pageviews and zero information about money.
//
// Worse, the one number that matters is unreachable from here by design:
// LemonSqueezy checkout happens on lemonsqueezy.com, so a tag on
// fatcityentertainment.com cannot see a purchase no matter how it is wired. The
// purchase event has to come from LemonSqueezy's own Google Analytics
// integration — an owner dashboard step, documented in SEO-HANDOFF.md.
//
// What this file does is capture everything up to that boundary, which is the
// part the site actually controls:
//
//   view_item        a product page was read
//   begin_checkout   a buy button was clicked  <- the money signal
//   select_item      an internal path into a product was taken
//
// begin_checkout is the honest proxy for a sale. It undercounts revenue and
// overcounts intent, and that is fine: what nobody could answer before is
// "does anything on this site send people to a checkout, and which things".
//
// GA4 ecommerce event names are used verbatim so the built-in Monetisation
// reports populate without any custom report building.
//
// DESIGN NOTES
// ------------
// - No new library, no tag manager, no second network request. It rides the
//   gtag() already on the page.
// - If gtag is missing, blocked by an ad blocker, or still loading, every call
//   is a silent no-op. Tracking must never break a buy button.
// - One delegated listener on document, so it costs nothing per element and
//   works for blocks injected after load (cross-sells, price ladder, the
//   library's "See all N songs" links).
// - Prices are read from the page's own itemprop="price", the same source
//   add-cross-sell.js and add-price-ladder.js use. Nothing is hardcoded.
(function () {
  "use strict";

  function send(name, params) {
    try {
      if (typeof window.gtag !== "function") return;
      window.gtag("event", name, params || {});
    } catch (e) {
      /* Never let a tracking failure surface to a buyer. */
    }
  }

  // `(el && el.textContent || "")` is the version that shipped first and it is
  // wrong: when el is null the expression evaluates to null, not "", and .replace
  // throws. It never fired on a product page because the title element is always
  // there — it took a page with a buy button and no product title to surface it,
  // and on that page it killed init() before a single event was sent.
  function text(el) {
    if (!el || !el.textContent) return "";
    return el.textContent.replace(/\s+/g, " ").trim();
  }

  // A campaign landing page is not a product page: it lists several products and
  // is entered from one known email. Both facts change what should be reported.
  function campaignSlug() {
    return document.body && document.body.getAttribute("data-fce-campaign");
  }

  // ---- what product is this page about? -----------------------------------
  // Only meaningful where the page is ABOUT one product. A campaign page has
  // buy buttons but no subject, so it returns null and the caller sends an
  // item-list event instead of pretending the first button is the page.
  function currentProduct() {
    var title = document.getElementById("wsite-com-product-title");
    if (!title || campaignSlug()) return null;
    var price = document.querySelector('[itemprop="price"]');
    var buy = document.querySelector(".ls-buy[data-product]");
    return {
      item_id: buy ? buy.getAttribute("data-product") : null,
      item_name: text(title),
      price: price ? Number(price.getAttribute("content") || price.content) : undefined,
      currency: "USD",
    };
  }

  // Buttons on generated pages carry their own name and price, because the
  // surrounding markup is not a Weebly product shell and there is nothing
  // reliable to scrape. Falls back to the link text.
  function itemFromButton(a) {
    var price = a.getAttribute("data-fce-price");
    return {
      item_id: a.getAttribute("data-product"),
      item_name: a.getAttribute("data-fce-name") || text(a) || a.getAttribute("data-product"),
      price: price ? Number(price) : undefined,
    };
  }

  // ---- where did a click come from? ---------------------------------------
  // Named so the report reads as a question about the work that was shipped:
  // is the song library selling anything, are the cross-sells being used, does
  // the price ladder move people up a tier.
  var ORIGINS = [
    [".fce-cross-sell", "cross-sell"],
    [".fce-ladder", "price-ladder"],
    [".fce-tracklist", "product-tracklist"],
    [".fce-songlist", "song-list"],
    ["#wsite-com-product-buy", "product-buy-area"],
    [".fce-copy", "page-copy"],
    ["nav, .wsite-menu, .wsite-nav", "nav"],
  ];

  function originOf(el) {
    for (var i = 0; i < ORIGINS.length; i++) {
      if (el.closest && el.closest(ORIGINS[i][0])) return ORIGINS[i][1];
    }
    // A library page's buy CTA sits outside the .fce-songlist table, so the
    // container rules above miss it and it lands in "page" — which is exactly
    // the click the library exists to produce. Fall back to the URL.
    if (songListSlug()) return "song-list-page";
    // On a campaign page every click belongs to that campaign; naming it is the
    // whole point, since the send is the denominator the numbers are read
    // against.
    if (campaignSlug()) return "campaign-" + campaignSlug();
    return "page";
  }

  // Library pages are the one place where the URL identifies the content better
  // than anything in the markup does.
  function songListSlug() {
    var m = location.pathname.match(/^\/music-bingo-song-lists\/([^/]+)\/?$/);
    return m ? m[1] : null;
  }

  function init() {
    var product = currentProduct();

    if (product && product.item_id) {
      send("view_item", {
        currency: "USD",
        value: product.price,
        items: [product],
      });
    }

    // A campaign page shows a ladder, so report the ladder. view_item_list is
    // GA4's event for exactly this and it keeps the Monetisation reports honest
    // — firing view_item for whichever product happened to be first would
    // attribute every campaign visit to the cheapest thing on the page.
    var campaign = campaignSlug();
    if (campaign) {
      var buttons = [].slice.call(document.querySelectorAll(".ls-buy[data-product]"));
      var seen = {};
      var listed = [];
      for (var i = 0; i < buttons.length; i++) {
        var it = itemFromButton(buttons[i]);
        if (!it.item_id || seen[it.item_id]) continue;
        seen[it.item_id] = 1;
        it.index = listed.length + 1;
        listed.push(it);
      }
      if (listed.length) {
        send("view_item_list", {
          item_list_id: "campaign-" + campaign,
          item_list_name: "Campaign: " + campaign,
          items: listed,
        });
      }
    }

    var slug = songListSlug();
    if (slug) {
      // Not an ecommerce event — it is a content page. Kept as a plain event so
      // it never pollutes revenue reporting.
      send("view_song_list", { song_list: slug });
    }

    // A general escape hatch: put data-fce-event="name" on any element and a
    // click on it is reported under that name. Used for things that aren't
    // links and so have no href to reason about — the Triv 101 START button,
    // and whatever the campaign pages need later.
    document.addEventListener("click", function (ev) {
      var tagged = ev.target && ev.target.closest && ev.target.closest("[data-fce-event]");
      if (tagged) {
        send(tagged.getAttribute("data-fce-event"), {
          label: tagged.getAttribute("data-fce-label") || text(tagged) || undefined,
        });
      }
    }, true);

    document.addEventListener("click", function (ev) {
      var a = ev.target && ev.target.closest && ev.target.closest("a");
      if (!a) return;

      // The money signal. Fires on the click, not on navigation, because
      // LemonSqueezy's overlay checkout never leaves the page.
      if (a.classList.contains("ls-buy") || a.classList.contains("kdp-buy")) {
        var pid = a.getAttribute("data-product");
        // Three sources, best first: the page's own product (a real product
        // page), the button's data attributes (a generated page), then the link
        // text. Without this a campaign click reported item_name "Get it now",
        // which is the button, not the thing being bought.
        var p = product && product.item_id === pid ? product : itemFromButton(a);
        send("begin_checkout", {
          currency: "USD",
          value: p.price,
          items: [{ item_id: pid, item_name: p.item_name, price: p.price }],
          origin: originOf(a),
          vendor: a.classList.contains("kdp-buy") ? "amazon" : "lemonsqueezy",
        });
        return;
      }

      // An internal link into a product or store page: which parts of the site
      // actually push people toward something that sells.
      var href = a.getAttribute("href") || "";
      if (/^\/store\/p\d+\//.test(href) || href === "/trivia-store.html" ||
          /^\/store\/c\d+/.test(href)) {
        send("select_item", {
          item_list_name: originOf(a),
          items: [{ item_id: (href.match(/\/store\/(p\d+)\//) || [])[1] || href,
                    item_name: text(a) || href }],
          from_song_list: songListSlug() || undefined,
        });
      }
    }, true);
  }

  // Belt and braces. send() is already wrapped, but everything around it —
  // reading the DOM, parsing a price — can throw on a page shaped differently
  // from the ones this was written against, and a throw here means no events at
  // all. Analytics failing quietly is the correct failure; analytics failing
  // loudly on a page with a buy button on it is not.
  function safeInit() {
    try {
      init();
    } catch (e) {
      /* no tracking on this page, and nothing the visitor can see */
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", safeInit);
  } else {
    safeInit();
  }
})();
