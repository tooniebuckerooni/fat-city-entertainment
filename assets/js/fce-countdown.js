/* Seasonal countdown chip. Placed by _tools/add-season-countdown.js on the
   seasonal product pages and written straight into the hub specs.

   <p class="fce-countdown fce-countdown--halloween" data-fce-countdown="2026-10-31"
      data-fce-from="2026-10-01" data-fce-event="Halloween" hidden>...</p>

   It ships `hidden` and only this script reveals it, so a page whose script
   never loads shows nothing rather than a stale date, and a crawler indexes no
   sentence that is only true for one day. It also hides itself after the date,
   which makes the takedown automatic: a forgotten block reads as nothing on
   1 November, not as "Halloween is in -3 days".

   Days are counted on the VISITOR's calendar (local midnight to local
   midnight), because "tonight" has to mean their tonight.

   No em-dashes in any string here: a visitor reads them (CLAUDE.md). */
(function () {
  "use strict";
  function day(iso) {
    var p = String(iso).split("-");
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }
  function run() {
    var els = document.querySelectorAll("[data-fce-countdown]");
    if (!els.length) return;
    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      try {
        var target = day(el.getAttribute("data-fce-countdown"));
        var from = el.getAttribute("data-fce-from");
        if (from && today < day(from)) continue;
        var n = Math.round((target - today) / 86400000);
        if (n < 0) continue;
        var ev = el.getAttribute("data-fce-event") || "The big night";
        var head, sub;
        if (n === 0) {
          head = ev + " is tonight.";
          sub = "It downloads instantly. Buy it, print it, host it.";
        } else if (n === 1) {
          head = ev + " is tomorrow.";
          sub = "Still time: everything here downloads the moment you pay.";
        } else if (n <= 7) {
          head = n + " days to " + ev + ".";
          sub = "Instant download, so a last-minute booking is still a good night.";
        } else {
          head = n + " days to " + ev + ".";
          sub = "Venues book two to four weeks out. Sort yours now and it is done.";
        }
        var h = el.querySelector(".fce-countdown-head");
        var s = el.querySelector(".fce-countdown-sub");
        if (h) h.textContent = head;
        if (s) s.textContent = sub;
        el.removeAttribute("hidden");
      } catch (e) { /* never break the page over a chip */ }
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run);
  else run();
})();
