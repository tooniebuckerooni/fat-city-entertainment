// Makes the theme's <a class="wsite-button"> Submit buttons actually submit
// their form (Weebly's platform JS used to handle this).
(function () {
  function init() {
    var forms = document.querySelectorAll("form[action*='formspree']");
    for (var i = 0; i < forms.length; i++) {
      (function (form) {
        var btns = form.querySelectorAll("a.wsite-button");
        for (var j = 0; j < btns.length; j++) {
          btns[j].addEventListener("click", function (e) {
            e.preventDefault();
            if (form.requestSubmit) form.requestSubmit();
            else form.submit();
          });
        }
      })(forms[i]);
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
