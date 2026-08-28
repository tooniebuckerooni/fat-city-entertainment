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

  function text(el) {
    return (el && (el.textContent || "")).replace(/\s+/g, " ").trim();
  }

  // ---- what product is this page about? -----------------------------------
  function currentProduct() {
    var price = document.querySelector('[itemprop="price"]');
    var title = document.getElementById("wsite-com-product-title");
    var buy = document.querySelector(".ls-buy[data-product]");
    if (!title && !buy) return null;
    return {
      item_id: buy ? buy.getAttribute("data-product") : null,
      item_name: text(title) || document.title,
      price: price ? Number(price.getAttribute("content") || price.content) : undefined,
      currency: "USD",
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
        var p = product && product.item_id === pid ? product : null;
        send("begin_checkout", {
          currency: "USD",
          value: p ? p.price : undefined,
          items: [{
            item_id: pid,
            item_name: p ? p.item_name : text(a) || pid,
            price: p ? p.price : undefined,
          }],
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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
