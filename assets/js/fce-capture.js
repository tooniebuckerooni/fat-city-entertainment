// Email capture on the song library pages.
//
// Posts to the SAME endpoint the generator's email gate uses, so every address
// on this site lands in one Resend audience. Owner's call, 17 Sept 2026: Resend
// owns capture, because the free Sender plan is nearly full. The four planned
// sends still go from Sender for now and addresses move across by hand.
//
// WHY THIS FILE EXISTS RATHER THAN AN EMBED
// -----------------------------------------
// The library pages were built to carry a Sender embed that never shipped: its
// form ID sat as an owner placeholder, so the block rendered on zero of 50
// pages. Meanwhile a working capture had existed on bingocardgenerator.html
// since 1 Aug, posting here. Two mechanisms on two platforms, feeding two
// lists, and the second one was planned because an audit for capture grepped
// for "<form" and the gate is a <div> with a bare <input>. Hence the real
// <form> element below.
//
// THE ENDPOINT IS IN TWO PLACES. CHANGE BOTH.
// -------------------------------------------
// Here and in files/theme/script.js, which is the generator's own gate. That
// file is the generator's whole PDF engine and is loaded on exactly one page,
// so sharing an asset would mean editing the PDF engine to save one string.
// Same idiom as the perk amount living in add-cross-sell.js and
// check-value-stacks.js: documented, and noted in CLAUDE.md.
(function () {
  var ENDPOINT = "https://triv101-api.dustinramsbottom.workers.dev/api/subscribe";

  // The button ships disabled and the no-JS line ships visible, so a page whose
  // script never loads shows a route that still works (email us) rather than a
  // form that silently eats an address. The blank-tile trap, fixed the safe way
  // round: it degrades to true, never to broken.
  function wire(form) {
    var input = form.querySelector(".fce-capture-input");
    var button = form.querySelector(".fce-capture-button");
    var error = form.querySelector(".fce-capture-error");
    var nojs = form.querySelector(".fce-capture-nojs");
    var done = form.querySelector(".fce-capture-done");
    if (!input || !button) return;

    button.disabled = false;
    if (nojs) nojs.style.display = "none";

    // The network-failure branch below overwrites this element's text. Keep the
    // original so a later invalid address does not get told the request failed:
    // one message element serving two states has to be restored, not just
    // re-shown.
    var invalidMessage = error ? error.textContent : "";

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = input.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        if (error) {
          error.textContent = invalidMessage;
          error.style.display = "block";
        }
        input.focus();
        return;
      }
      if (error) error.style.display = "none";
      button.disabled = true;
      button.textContent = "Sending...";

      // Never leave the visitor staring at a spinner because the Worker is
      // slow or blocked: the generator gate's rule, which is that losing the
      // goodwill is worse than losing the address.
      fetch(ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: email,
          source: form.getAttribute("data-fce-source") || "song-list"
        })
      }).then(function (r) {
        return r && r.ok;
      }).catch(function () {
        return false;
      }).then(function (ok) {
        button.disabled = false;
        button.textContent = "Send them to me";
        if (ok) {
          if (done) {
            done.style.display = "block";
            input.style.display = "none";
            button.style.display = "none";
          }
        } else if (error) {
          error.textContent =
            "That did not go through. Please try again, or email info@fatcityentertainment.com.";
          error.style.display = "block";
        }
      });
    });
  }

  function init() {
    var forms = document.querySelectorAll(".fce-capture-form");
    for (var i = 0; i < forms.length; i++) wire(forms[i]);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
