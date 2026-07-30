"use strict";

/*
 * TRIV101 — self-updating survey engine
 * ------------------------------------------------------------------
 * The game draws its questions from a live bank that is the SEED bank
 * (questions.js -> window.TRIV101_SEED) merged with anything real players
 * have contributed through the "Take a Survey" opt-in. Players answer fun
 * survey prompts; answers are tallied, and the top 3 most-common answers for
 * a prompt become that question's answers in the game.
 *
 * STORAGE IS INTENTIONALLY SWAPPABLE. The default `Store` below persists to
 * this browser's localStorage, so the feature is fully functional today with
 * zero setup (great for a single host screen / one venue). To make answers
 * crowd-source across EVERYONE and truly self-update the global bank, replace
 * the three Store methods (load / submit / aggregate) with calls to a shared
 * backend (Supabase, Google Sheets via Apps Script, Formspree + a baked JSON,
 * etc.). Keep the same data shape and nothing else has to change.
 */

(function () {
  var STORAGE_KEY = "triv101_surveys_v1";
  var MIN_ANSWERS_TO_PROMOTE = 3; // a prompt needs >=3 distinct answers to enter the game

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  /* ---- Storage adapter (swap this for a shared backend) --------------- */
  var Store = {
    _data: null,
    // shape: { "<prompt text>": { "<answer lowercased>": { label, count } } }
    load: function () {
      if (this._data) return this._data;
      try { this._data = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
      catch (e) { this._data = {}; }
      return this._data;
    },
    persist: function () {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this._data)); } catch (e) {}
    },
    submit: function (promptText, answerText) {
      var d = this.load();
      var p = String(promptText || "").trim();
      var a = String(answerText || "").trim();
      if (!p || !a) return false;
      if (!d[p]) d[p] = {};
      var key = a.toLowerCase();
      if (!d[p][key]) d[p][key] = { label: a, count: 0 };
      d[p][key].count += 1;
      this.persist();
      return true;
    },
    // Prompts with enough distinct answers, shaped as game questions.
    aggregate: function () {
      var d = this.load();
      var out = [];
      Object.keys(d).forEach(function (p) {
        var answers = Object.keys(d[p]).map(function (k) { return d[p][k]; });
        if (answers.length >= MIN_ANSWERS_TO_PROMOTE) {
          answers.sort(function (x, y) { return y.count - x.count; });
          out.push({ question: p, answers: answers.slice(0, 3).map(function (a) { return a.label.trim(); }) });
        }
      });
      return out;
    }
  };

  /* ---- Survey prompts to present to players -------------------------- */
  // The dedicated survey pool (survey-prompts.js). These are NOT yet in the
  // game; their answers are collected here and (in production) only enter the
  // game bank once a moderator confirms the top 3. Falls back to the seed
  // questions' text if the pool file isn't loaded.
  function surveyPrompts() {
    var pool = window.TRIV101_SURVEY_PROMPTS || [];
    if (pool.length) return pool;
    var seed = (window.TRIV101_SEED || []).map(function (q) { return q.question; });
    return seed.length ? seed : ["Name something you'd find at a party."];
  }

  /* ---- Public API ---------------------------------------------------- */
  window.TRIV101 = {
    // Live game bank = seed, with any survey-promoted prompt overriding the
    // seed's top-3 once real answers have accumulated for it.
    getQuestions: function () {
      var byText = {};
      (window.TRIV101_SEED || []).forEach(function (q) { byText[q.question] = q; });
      Store.aggregate().forEach(function (q) { byText[q.question] = q; });
      return Object.keys(byText).map(function (k) { return byText[k]; });
    },
    submitResponse: function (prompt, answer) { return Store.submit(prompt, answer); },
    randomPrompt: function () {
      var prompts = surveyPrompts();
      return prompts[Math.floor(Math.random() * prompts.length)];
    },
    openSurvey: function () { renderSurvey(window.TRIV101.randomPrompt(), false); }
  };

  /* ---- Survey UI (reuses the game's existing modal) ------------------ */
  function renderSurvey(promptText, thanked) {
    var thanks = thanked
      ? '<p style="color:#2e7d32;font-weight:bold;margin:0 0 8px">Thanks — added! Here\'s another:</p>'
      : '';
    var html =
      '<div class="default-modal-container" style="max-width:560px;color:#1a1a1a">' +
        '<p style="letter-spacing:.15em;text-transform:uppercase;font-size:.8em;opacity:.6;margin:0 0 6px">Fun Survey — help build the game</p>' +
        thanks +
        '<p id="survey-prompt" style="font-size:1.7em;margin:0 0 14px;text-align:center;line-height:1.25">' + escapeHtml(promptText) + '</p>' +
        '<input id="survey-input" type="text" placeholder="Type your answer..." autocomplete="off" ' +
          'style="font-size:1.25em;width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid #bbb;border-radius:6px;color:#1a1a1a;background:#fff" />' +
        '<div style="margin-top:16px;display:flex;flex-wrap:wrap;gap:8px;justify-content:center">' +
          '<button id="survey-submit" class="button success-bg" style="margin:0">Submit answer</button>' +
          '<button id="survey-skip" class="button warning-bg" style="margin:0">Skip / next</button>' +
          '<button class="button error-bg" style="margin:0" onclick="closeModal()">Done</button>' +
        '</div>' +
        '<p style="font-size:.85em;opacity:.65;margin:14px 0 0;text-align:center">Everyone\'s answers are tallied — the top 3 become the game\'s answers.</p>' +
      '</div>';

    openModal(html, { full: false });

    var input = document.querySelector("#survey-input");
    var submit = document.querySelector("#survey-submit");
    var skip = document.querySelector("#survey-skip");
    if (input) input.focus();

    function advance(save) {
      var didSave = false;
      if (save && input && input.value.trim()) {
        didSave = window.TRIV101.submitResponse(promptText, input.value);
      }
      renderSurvey(window.TRIV101.randomPrompt(), didSave);
    }
    if (submit) submit.addEventListener("click", function () { advance(true); });
    if (skip) skip.addEventListener("click", function () { advance(false); });
    if (input) input.addEventListener("keydown", function (e) {
      if (e.keyCode === 13) advance(true);
    });
  }
})();
