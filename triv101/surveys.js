"use strict";

/*
 * TRIV101 — Community Surveys stream (preview)
 * ------------------------------------------------------------------
 * The public retention layer: players scroll proposed questions that haven't
 * hit their vote quota yet, vote on answers (most-voted rise to the top), and
 * comment below each question. When a question reaches its quota its top 3 are
 * ready to be confirmed into the game.
 *
 * THIS IS A FRONT-END PREVIEW. It runs on a swappable store (sample data +
 * localStorage for your own actions) so the experience is real to click
 * through today. The `Api` object below is the single seam: swap its methods
 * for fetch() calls to the Cloudflare Worker (D1 + Ably) and nothing else
 * changes. See TRIV101-BACKEND-PLAN.md.
 */

(function () {
  var QUOTA = 100;                 // votes a question needs before its top 3 graduate
  var KEY = "triv101_surveys_stream_v1";

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function uid() { return "id" + Math.random().toString(36).slice(2, 9); }
  function now() { return Date.now(); }
  function ago(ts) {
    var s = Math.floor((now() - ts) / 1000);
    if (s < 60) return "just now";
    var m = Math.floor(s / 60); if (m < 60) return m + "m ago";
    var h = Math.floor(m / 60); if (h < 24) return h + "h ago";
    return Math.floor(h / 24) + "d ago";
  }

  // --- Sample content so the preview feels alive -----------------------------
  function seed() {
    var t = now();
    return [
      { id: uid(), q: "Name a food that's messy to eat on a first date.",
        answers: [a("Spaghetti", 34), a("Ribs", 22), a("Tacos", 15), a("Buffalo wings", 9)],
        comments: [c("Dana", "Ribs should be illegal on a first date lol", t - 3600e3),
                   c("Marcus", "Anything with garlic honestly", t - 1800e3)] },
      { id: uid(), q: "Name a chore nobody likes doing.",
        answers: [a("Dishes", 44), a("Laundry", 25), a("Cleaning the bathroom", 20)],
        comments: [c("Priya", "Folding laundry is my villain origin story", t - 7200e3)] },
      { id: uid(), q: "Name something you always forget to pack for a trip.",
        answers: [a("Toothbrush", 40), a("Phone charger", 31), a("Socks", 12)],
        comments: [] },
      { id: uid(), q: "Name a reason someone might be running late to work.",
        answers: [a("Traffic", 39), a("Overslept", 33), a("Stopped for coffee", 8)],
        comments: [c("Sam", "The coffee stop is non-negotiable though", t - 5400e3)] },
      { id: uid(), q: "Name something people keep in their car but rarely use.",
        answers: [a("Umbrella", 22), a("First-aid kit", 18), a("Ice scraper", 9)],
        comments: [] },
      { id: uid(), q: "Name a topping that's a dealbreaker on a pizza.",
        answers: [a("Pineapple", 51), a("Anchovies", 33), a("Olives", 14)],
        comments: [c("Jess", "Pineapple belongs and I'll die on this hill", t - 600e3)] }
    ];
    function a(text, votes) { return { id: uid(), text: text, votes: votes }; }
    function c(name, text, ts) { return { id: uid(), name: name, text: text, ts: ts }; }
  }

  // --- Store (localStorage-backed; the Api seam wraps it) --------------------
  function load() {
    try { var d = JSON.parse(localStorage.getItem(KEY)); if (d && d.length) return d; } catch (e) {}
    var s = seed(); save(s); return s;
  }
  function save(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} }

  function totalVotes(q) { return q.answers.reduce(function (n, a) { return n + a.votes; }, 0); }
  function ranked(q) { return q.answers.slice().sort(function (x, y) { return y.votes - x.votes; }); }

  // The single integration seam. Replace each method's body with a fetch() to
  // the Worker; keep the return shapes and the UI is unchanged.
  var Api = {
    getFeed: function () {
      // Under-quota questions only, most-active first.
      return load()
        .filter(function (q) { return totalVotes(q) < QUOTA; })
        .sort(function (x, y) { return totalVotes(y) - totalVotes(x); });
    },
    getGraduated: function () {
      return load().filter(function (q) { return totalVotes(q) >= QUOTA; });
    },
    vote: function (qid, aid) {
      var d = load(); var q = find(d, qid); if (!q) return;
      var a = q.answers.filter(function (a) { return a.id === aid; })[0]; if (!a) return;
      a.votes += 1; save(d);
    },
    addAnswer: function (qid, text) {
      var d = load(); var q = find(d, qid); if (!q) return;
      text = text.trim(); if (!text) return;
      var existing = q.answers.filter(function (a) { return a.text.toLowerCase() === text.toLowerCase(); })[0];
      if (existing) { existing.votes += 1; } else { q.answers.push({ id: uid(), text: text, votes: 1 }); }
      save(d);
    },
    addComment: function (qid, name, text) {
      var d = load(); var q = find(d, qid); if (!q) return;
      text = text.trim(); if (!text) return;
      q.comments.push({ id: uid(), name: (name || "").trim() || "Guest", text: text, ts: now() });
      save(d);
    },
    suggest: function (text) {
      var d = load(); text = text.trim(); if (!text) return;
      d.unshift({ id: uid(), q: text, answers: [], comments: [], suggested: true });
      save(d);
    }
  };
  function find(d, id) { return d.filter(function (q) { return q.id === id; })[0]; }

  // --- Rendering -------------------------------------------------------------
  var root;
  function render() {
    var feed = Api.getFeed();
    var grad = Api.getGraduated();
    root.innerHTML =
      suggestBox() +
      '<div class="feed">' + feed.map(card).join("") + '</div>' +
      (grad.length ? '<h2 class="grad-h">Graduated into the game</h2><div class="feed grad">' +
        grad.map(gradCard).join("") + '</div>' : "");
    bind();
  }

  function suggestBox() {
    return '<div class="card suggest">' +
      '<label for="sg">Suggest a question for the community to answer</label>' +
      '<div class="row"><input id="sg" type="text" placeholder="Name something..." autocomplete="off" />' +
      '<button data-suggest class="btn gold">Suggest</button></div>' +
      '<p class="fine">New suggestions are reviewed before they go live.</p></div>';
  }

  function card(q) {
    var votes = totalVotes(q);
    var pct = Math.min(100, Math.round((votes / QUOTA) * 100));
    var rk = ranked(q);
    return '<div class="card" data-q="' + q.id + '">' +
      '<div class="q">' + esc(q.q) + (q.suggested ? ' <span class="tag">pending review</span>' : "") + '</div>' +
      '<div class="quota"><div class="bar"><span style="width:' + pct + '%"></span></div>' +
        '<span class="qn">' + votes + ' / ' + QUOTA + ' votes</span></div>' +
      '<ul class="answers">' + rk.map(function (a, i) {
        return '<li' + (i < 3 ? ' class="top"' : '') + '>' +
          '<button class="up" data-vote="' + a.id + '" title="Vote">▲</button>' +
          '<span class="atext">' + esc(a.text) + '</span>' +
          '<span class="av">' + a.votes + '</span></li>';
      }).join("") + '</ul>' +
      '<div class="row"><input class="ans" type="text" placeholder="Add an answer..." autocomplete="off" />' +
        '<button data-answer class="btn">Add</button></div>' +
      comments(q) +
      '</div>';
  }

  function gradCard(q) {
    var top = ranked(q).slice(0, 3);
    return '<div class="card grad-card"><div class="q">' + esc(q.q) + '</div>' +
      '<ol class="top3">' + top.map(function (a) { return '<li>' + esc(a.text) + '</li>'; }).join("") + '</ol>' +
      '<span class="tag ok">in the game</span></div>';
  }

  function comments(q) {
    var list = q.comments.map(function (c) {
      return '<li><b>' + esc(c.name) + '</b> <time>' + ago(c.ts) + '</time><p>' + esc(c.text) + '</p></li>';
    }).join("");
    return '<details class="comments"' + (q.comments.length ? " open" : "") + '>' +
      '<summary>' + q.comments.length + ' comment' + (q.comments.length === 1 ? "" : "s") + '</summary>' +
      '<ul>' + list + '</ul>' +
      '<div class="row"><input class="cname" type="text" placeholder="Name (optional)" autocomplete="off" />' +
      '<input class="ctext" type="text" placeholder="Add a comment..." autocomplete="off" />' +
      '<button data-comment class="btn">Post</button></div></details>';
  }

  function bind() {
    root.querySelectorAll("[data-vote]").forEach(function (b) {
      b.onclick = function () { Api.vote(b.closest("[data-q]").dataset.q, b.dataset.vote); render(); };
    });
    root.querySelectorAll("[data-answer]").forEach(function (b) {
      b.onclick = function () {
        var card = b.closest("[data-q]"); Api.addAnswer(card.dataset.q, card.querySelector(".ans").value); render();
      };
    });
    root.querySelectorAll("[data-comment]").forEach(function (b) {
      b.onclick = function () {
        var card = b.closest("[data-q]");
        Api.addComment(card.dataset.q, card.querySelector(".cname").value, card.querySelector(".ctext").value);
        render();
      };
    });
    var sg = root.querySelector("[data-suggest]");
    if (sg) sg.onclick = function () { Api.suggest(document.getElementById("sg").value); render(); };
  }

  document.addEventListener("DOMContentLoaded", function () {
    root = document.getElementById("stream");
    if (root) render();
  });
})();
