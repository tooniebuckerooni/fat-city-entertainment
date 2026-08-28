// Sitewide "Back 2 School" promo — a one-time entry popup, not a persistent
// banner. Injected on every page via _tools/add-promo-bar.js (still named
// for the original banner; only what it inserts changed) — don't hand-edit
// pages, edit this file (and re-run the tool if the insertion point ever
// changes).
//
// Shows once per browser while the promo is live, on whichever page a
// visitor lands on first, then never again this promo — closing it (X,
// backdrop click, Escape, or the buy link) all count as "seen," and so does
// simply having it appear, so it can't reopen mid-visit if someone navigates
// away before touching it.
//
// To retire this promo: delete the <script> tag site-wide by re-running
// _tools/add-promo-bar.js with REMOVE=true, or just let END pass — it stops
// rendering itself automatically and costs nothing left in place.
//
// To launch a NEW promo later, change CODE/PCT/END/COPY below in place;
// changing SEEN_KEY (it's derived from CODE) means anyone who saw the old
// one will see the new one once.
(function () {
  "use strict";
  var CODE = "BCK2SKL";
  var COPY = "Back 2 School Sale";
  var PCT = "22%";
  // Local-time midnight starting Sept 10, 2026 -- i.e. visible through all of
  // Sept 9 wherever the visitor is.
  var END = new Date(2026, 8, 10);
  var SEEN_KEY = "fce_promo_seen_" + CODE;

  if (new Date() >= END) return;

  // Expose the live promo for ls-buy.js, which appends the discount code to
  // every LemonSqueezy checkout URL so buyers get the sale price without
  // typing the code. Set unconditionally, before the "seen" check, on
  // purpose: the discount shouldn't depend on whether anyone ever saw or
  // dismissed the popup.
  window.FCE_PROMO = { code: CODE, pct: PCT, end: END };

  var seen = false;
  try {
    seen = localStorage.getItem(SEEN_KEY) === "1";
  } catch (e) {}
  if (seen) return;

  function markSeen() {
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch (e) {}
  }

  function show() {
    markSeen();

    var overlay = document.createElement("div");
    overlay.className = "fce-promo-modal-overlay";

    var modal = document.createElement("div");
    modal.className = "fce-promo-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-label", COPY + " promotion");
    modal.innerHTML =
      '<button type="button" class="fce-promo-modal-close" aria-label="Close">&times;</button>' +
      '<p class="fce-promo-modal-kicker">' + COPY + "</p>" +
      '<p class="fce-promo-modal-pct">' + PCT + " off everything</p>" +
      '<p class="fce-promo-modal-code">Code <code>' + CODE +
      "</code> — applied automatically at checkout, no need to enter it</p>" +
      '<a class="fce-promo-modal-cta" href="/trivia-store.html">Shop the Sale &rarr;</a>';

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    function close() {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      document.removeEventListener("keydown", onKey);
    }
    function onKey(e) {
      if (e.key === "Escape") close();
    }

    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) close();
    });
    modal.querySelector(".fce-promo-modal-close").addEventListener("click", close);
    modal.querySelector(".fce-promo-modal-cta").addEventListener("click", close);
    document.addEventListener("keydown", onKey);
  }

  // The script tag is `defer`, so the DOM is already parsed by the time this
  // runs; a short delay just keeps the popup from slamming in before the
  // page has visually settled.
  setTimeout(show, 500);
})();
