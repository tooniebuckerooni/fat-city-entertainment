// Sitewide "Back 2 School" promo bar. Slim, dismissible, self-expiring.
// Injected on every page via _tools/add-promo-bar.js — don't hand-edit pages,
// edit this file (and re-run the tool if the insertion point ever changes).
//
// To retire this promo: delete the <script> tag site-wide by re-running
// _tools/add-promo-bar.js with REMOVE=true, or just let END pass — the bar
// stops rendering itself automatically and costs nothing left in place.
//
// To launch a NEW promo later, change CODE/PCT/END/COPY below in place;
// changing DISMISS_KEY (it's derived from CODE) means anyone who dismissed
// the old one will see the new one once.
(function () {
  "use strict";
  var CODE = "BCK2SKL";
  var COPY = "Back 2 School Sale";
  var PCT = "22%";
  // Local-time midnight starting Sept 10, 2026 -- i.e. visible through all of
  // Sept 9 wherever the visitor is.
  var END = new Date(2026, 8, 10);
  var DISMISS_KEY = "fce_promo_dismiss_" + CODE;
  var DISMISS_HOURS = 24;

  if (new Date() >= END) return;

  var dismissedAt = 0;
  try {
    dismissedAt = parseInt(localStorage.getItem(DISMISS_KEY) || "0", 10) || 0;
  } catch (e) {}
  if (dismissedAt && Date.now() - dismissedAt < DISMISS_HOURS * 60 * 60 * 1000) return;

  var bar = document.createElement("div");
  bar.className = "fce-promo-bar";
  bar.setAttribute("role", "region");
  bar.setAttribute("aria-label", COPY + " promotion");
  bar.innerHTML =
    COPY + " — <strong>" + PCT + " off everything</strong> with code " +
    '<code>' + CODE + "</code> — ends Sept 9" +
    '<button type="button" class="fce-promo-bar-close" aria-label="Dismiss">&times;</button>';

  if (document.body.firstChild) {
    document.body.insertBefore(bar, document.body.firstChild);
  } else {
    document.body.appendChild(bar);
  }

  bar.querySelector(".fce-promo-bar-close").addEventListener("click", function () {
    bar.parentNode.removeChild(bar);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch (e) {}
  });
})();
