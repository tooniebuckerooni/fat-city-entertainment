/*!
 * The Green Room — embeddable comment widget for Fat City Entertainment.
 *
 * Served from GitHub Pages, NOT from the Worker. That keeps the Worker small
 * enough to stay a single pasteable file, and this gets Pages' caching.
 *
 * Embed:
 *   <div data-fc-thread="green-room"></div>
 *   <script src="https://www.fatcityentertainment.com/assets/js/greenroom-widget.js" defer></script>
 *
 * The div may already contain a baked static copy of the thread (written by
 * _tools/bake-green-room.js) so crawlers and no-JS visitors get real content.
 * This script replaces it once the live thread loads — and deliberately leaves
 * it alone if the fetch fails, so an outage degrades to a readable thread
 * rather than an empty box.
 */
(function () {
  "use strict";

  var API = "https://fatcity-greenroom.dustinramsbottom.workers.dev";
  var FOLD_AT = 800;      // characters before a comment folds
  var COUNTER_AT = 5000;  // no character counter until here
  var BODY_MAX = 6000;
  var MIN_DWELL = 8000;

  /* Harvest config — the one optional structured field per thread that feeds
     the Index. Keep in sync with greenroom-api/seed/threads.json. */
  var HARVEST = {
    "green-room": {
      kind: "number", unit: "usd_per_show",
      prompt: "One more, optional: add your number to the index.",
      label: "Your rate per show (USD)",
      metaLabel: "Show length",
      metaOptions: ["45 min", "1 hr", "90 min", "2 hr", "3 hr+"]
    },
    "hosting": {
      kind: "category",
      prompt: "One more, optional: how did you get your first venue?",
      label: "How you got in",
      options: ["Someone referred me", "I was already a regular there", "Cold walk-in",
                "Cold email or DM", "They approached me", "Through an agency or operator"]
    },
    "trivia-generator": {
      kind: "item", prompt: "One more, optional: add the theme to the list.", label: "Theme"
    },
    "bingo": {
      kind: "category", prompt: "One more, optional: what's the occasion?", label: "Occasion",
      options: ["Bar or pub night", "Classroom", "Baby or bridal shower",
                "Staff party or team building", "Church or community group",
                "Family or holiday", "Something else"]
    },
    "triv101": { kind: "item", prompt: "One more, optional: add it to the survey queue.", label: "The question" }
  };

  var COPY = {
    "green-room": { title: "The Green Room", tagline: "Hosts talking shop",
      norm: "Share your own numbers. Don't tell anyone else what to charge." },
    "hosting": { title: "The Green Room", tagline: "Getting the gig",
      norm: "Share what worked for you. Don't tell anyone else what to charge." }
  };
  var DEFAULT_COPY = { title: "The Green Room", tagline: "Talking shop", norm: "Share your own experience." };

  var DISCLOSURE = "The Green Room is hosted by Fat City Entertainment. We run trivia too — " +
                   "we're in here as participants, and we post our own numbers.";

  /* ------------------------------------------------------------- storage -- */

  function ls(key, val) {
    try {
      if (val === undefined) return window.localStorage.getItem(key);
      window.localStorage.setItem(key, val);
    } catch (e) { /* private mode: features degrade, nothing breaks */ }
    return null;
  }

  function voterToken() {
    var t = ls("fcgr_voter");
    if (!t) {
      t = "v" + Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
      ls("fcgr_voter", t);
    }
    return t;
  }

  var voted = {
    has: function (id) { return (ls("fcgr_voted") || "").split(",").indexOf(id) > -1; },
    add: function (id) {
      var v = (ls("fcgr_voted") || "").split(",").filter(Boolean);
      if (v.indexOf(id) < 0) v.push(id);
      ls("fcgr_voted", v.slice(-400).join(","));
    }
  };

  /* --------------------------------------------------------------- utils -- */

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text; // never innerHTML for server data
    return n;
  }

  function ago(ms) {
    var s = Math.max(0, (Date.now() - ms) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return Math.floor(s / 60) + "m ago";
    if (s < 86400) return Math.floor(s / 3600) + "h ago";
    var d = Math.floor(s / 86400);
    if (d < 30) return d + "d ago";
    return new Date(ms).toLocaleDateString();
  }

  function api(path, opts) {
    opts = opts || {};
    var h = { "X-GR-Voter": voterToken() };
    if (opts.body) h["content-type"] = "application/json";
    return fetch(API + path, {
      method: opts.method || "GET",
      headers: h,
      body: opts.body ? JSON.stringify(opts.body) : undefined
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok) throw new Error(d.message || "Something went wrong. Try again.");
        return d;
      });
    });
  }

  /* ----------------------------------------------------------------- CSS -- */
  /* Derived from assets/css/site-extras.css: Montserrat, #000/#222 on white,
     #99790a link gold, #e6b800 bulb gold, 2px radii, #eaeaea hairlines. The
     only new colour is the deep green-black on the marquee. */

  var CSS = [
    '.fcgr{font-family:"Montserrat",Arial,sans-serif;color:#222;font-size:15px;line-height:1.6;margin:24px 0}',
    '.fcgr *{box-sizing:border-box}',
    '.fcgr-mq{background:linear-gradient(#14261f,#0c1813);border-radius:3px 3px 0 0;padding:0 0 16px;position:relative;overflow:hidden}',
    '.fcgr-mq::after{content:"";position:absolute;left:0;right:0;bottom:0;height:2px;background:#e6b800}',
    '.fcgr-bulbs{display:flex;justify-content:center;gap:13px;padding:11px 12px 9px;flex-wrap:wrap}',
    '.fcgr-bulbs i{width:7px;height:7px;border-radius:50%;flex:none;background:radial-gradient(circle at 38% 34%,#fff6cf 0,#e6b800 52%,#6d5a00 100%);box-shadow:0 0 7px rgba(230,184,0,.85);animation:fcgrb 3.4s ease-in-out infinite}',
    '@keyframes fcgrb{0%,100%{opacity:1}50%{opacity:.42}}',
    '.fcgr-bulbs i:nth-child(2n){animation-delay:.42s}.fcgr-bulbs i:nth-child(3n){animation-delay:.86s}.fcgr-bulbs i:nth-child(5n){animation-delay:1.3s}',
    '@media(prefers-reduced-motion:reduce){.fcgr-bulbs i{animation:none}}',
    '.fcgr-title{text-align:center;color:#fff;font-size:19px;font-weight:700;letter-spacing:.26em;text-transform:uppercase;margin:0;padding:0 8px}',
    '.fcgr-sub{text-align:center;color:#b9b9b9;font-size:11.5px;letter-spacing:.1em;text-transform:uppercase;margin:7px 0 0;padding:0 12px}',
    '.fcgr-body{border:1px solid #eaeaea;border-top:0;border-radius:0 0 3px 3px;padding:0 16px 18px}',
    '@media(max-width:560px){.fcgr-body{padding:0 11px 14px}}',
    '.fcgr-disc{font-size:12.5px;color:#888;line-height:1.55;padding:12px 0 0;margin:0}',
    '.fcgr-bar{display:flex;align-items:center;gap:14px;flex-wrap:wrap;padding:13px 0 11px;border-bottom:1px solid #eaeaea}',
    '.fcgr-count{font-size:12.5px;color:#888}',
    '.fcgr-sort{display:flex;gap:4px;margin-left:auto}',
    '.fcgr-sort button{font:inherit;font-size:12px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;background:none;border:1px solid transparent;color:#888;padding:4px 10px;border-radius:2px;cursor:pointer}',
    '.fcgr-sort button[aria-pressed="true"]{color:#000;border-color:#000}',
    '.fcgr-c{padding:15px 0;border-bottom:1px solid #eaeaea;display:flex;gap:12px}',
    '.fcgr-c:last-child{border-bottom:0}',
    '.fcgr-v{flex:none;width:34px;display:flex;flex-direction:column;align-items:center;padding-top:2px}',
    '.fcgr-v button{background:none;border:0;cursor:pointer;padding:2px 4px;line-height:1;color:#bdbdbd;font-size:13px}',
    '.fcgr-v button:hover{color:#000}.fcgr-v button[aria-pressed="true"]{color:#99790a;cursor:default}',
    '.fcgr-n{font-size:12.5px;font-weight:700;color:#222}',
    '.fcgr-main{min-width:0;flex:1}',
    '.fcgr-meta{font-size:12.5px;color:#888;margin:0 0 5px;line-height:1.5}',
    '.fcgr-h{color:#222;font-weight:700}',
    '.fcgr-role{font-size:10.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#333;border:1px solid #d8d8d8;border-radius:2px;padding:1px 5px;margin-left:5px;white-space:nowrap}',
    '.fcgr-role.fcgr-fc{border-color:#e6b800;color:#7a6100;background:#fdf7e0}',
    '.fcgr-text{margin:0;font-size:14.5px;line-height:1.65;color:#333;white-space:pre-wrap;overflow-wrap:anywhere}',
    '.fcgr-text a{color:#99790a}',
    '.fcgr-fold{position:relative;max-height:8.6em;overflow:hidden}',
    '.fcgr-fold::after{content:"";position:absolute;left:0;right:0;bottom:0;height:3.1em;background:linear-gradient(rgba(255,255,255,0),#fff 88%)}',
    '.fcgr-open .fcgr-fold{max-height:none}.fcgr-open .fcgr-fold::after{display:none}',
    // The pinned block sits on cream, not white — it needs its own fade or the
    // gradient paints a white band across the middle of the disclosure.
    '.fcgr-pin .fcgr-fold::after{background:linear-gradient(rgba(252,250,241,0),#fcfaf1 88%)}',
    '.fcgr-more,.fcgr-act button{font:inherit;background:none;border:0;padding:0;cursor:pointer;text-decoration:underline;text-underline-offset:2px}',
    '.fcgr-more{font-size:12.5px;font-weight:700;color:#99790a;padding:6px 0 0}',
    '.fcgr-act{margin-top:7px;display:flex;gap:14px;font-size:12.5px}',
    '.fcgr-act button{color:#888}.fcgr-act button:hover{color:#000}',
    '.fcgr-pin{background:#fcfaf1;margin:0 -16px;padding:16px;border-bottom:2px solid #e6b800}',
    '@media(max-width:560px){.fcgr-pin{margin:0 -11px;padding:14px 11px}}',
    '.fcgr-pinflag{font-size:10.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#7a6100;margin:0 0 7px}',
    '.fcgr-pinq{font-size:16.5px;font-weight:700;color:#000;margin:0 0 9px;line-height:1.35}',
    '.fcgr-replies{margin-left:46px;border-left:2px solid #eaeaea;padding-left:14px;margin-top:8px}',
    '@media(max-width:560px){.fcgr-replies{margin-left:0}}',
    '.fcgr-replies .fcgr-c{padding:11px 0}',
    '.fcgr-compose{padding-top:16px}',
    '.fcgr-norm{font-size:12.5px;font-weight:700;color:#222;border-left:2px solid #000;padding:1px 0 1px 10px;margin:0 0 11px}',
    '.fcgr-fields{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px}',
    '.fcgr input,.fcgr select,.fcgr textarea{font:inherit;font-size:14px;color:#222;border:1px solid #ccc;border-radius:2px;padding:9px 10px;background:#fff}',
    '.fcgr-fields input{flex:1 1 130px;min-width:0}.fcgr-fields select{flex:0 1 130px}',
    '.fcgr textarea{width:100%;min-height:84px;resize:vertical;line-height:1.6;display:block}',
    '.fcgr :is(input,select,textarea):focus-visible,.fcgr button:focus-visible,.fcgr a:focus-visible{outline:2px solid #99790a;outline-offset:1px}',
    '.fcgr-send{font:inherit;font-size:13.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;background:#000;color:#fff;border:1px solid #000;border-radius:2px;padding:11px 24px;margin-top:9px;cursor:pointer}',
    '.fcgr-send:hover{background:#fff;color:#000}.fcgr-send[disabled]{opacity:.55;cursor:default}',
    '.fcgr-hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}',
    '.fcgr-chars{font-size:12px;color:#888;margin:6px 0 0}',
    '.fcgr-err{font-size:13px;color:#b00020;margin:9px 0 0}',
    '.fcgr-unlock{border:2px solid #1d5c45;background:#f7fbf9;border-radius:3px;padding:17px 16px;margin-top:16px}',
    '.fcgr-unlock h3{font-size:14.5px;font-weight:700;color:#14402f;margin:0 0 9px}',
    '.fcgr-unlock p{font-size:14.5px;line-height:1.65;color:#333;margin:0}',
    '.fcgr-harvest{margin-top:14px;padding-top:13px;border-top:1px solid #d8e7e0}',
    '.fcgr-harvest p{font-size:13px;color:#333;margin:0 0 8px}',
    '.fcgr-harvest .fcgr-fields{margin-bottom:0}',
    '.fcgr-link{font:inherit;font-size:12.5px;background:none;border:0;padding:11px 0 0;color:#99790a;cursor:pointer;text-decoration:underline;text-underline-offset:2px;display:block}',
    '.fcgr-empty{padding:22px 0;font-size:15px;color:#333}',
    '.fcgr-foot{font-size:12px;color:#888;margin:13px 0 0;line-height:1.55}'
  ].join("");

  function injectCSS() {
    if (document.getElementById("fcgr-css")) return;
    var s = el("style");
    s.id = "fcgr-css";
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* ---------------------------------------------------------------- links -- */
  /* At most one bare URL per comment becomes a link, rel="nofollow ugc
     noopener". Everything else stays text. Built with DOM nodes, never
     innerHTML, so a comment can't inject markup. */

  function renderBody(p, text) {
    var m = text.match(/(https?:\/\/[^\s<]+)/);
    if (!m) { p.textContent = text; return; }
    var i = m.index;
    p.appendChild(document.createTextNode(text.slice(0, i)));
    var a = el("a", null, m[1]);
    a.href = m[1];
    a.rel = "nofollow ugc noopener";
    a.target = "_blank";
    p.appendChild(a);
    p.appendChild(document.createTextNode(text.slice(i + m[1].length)));
  }

  /* ------------------------------------------------------------- rendering -- */

  function Room(mount, thread) {
    this.mount = mount;
    this.thread = thread;
    this.copy = COPY[thread] || DEFAULT_COPY;
    this.sort = ls("fcgr_sort") === "new" ? "new" : "top";
    this.loadedAt = Date.now();
    this.data = null;
    this.turnstileKey = null;
  }

  Room.prototype.commentNode = function (c, isReply) {
    var row = el("article", "fcgr-c");
    row.setAttribute("data-id", c.id);

    var v = el("div", "fcgr-v");
    var btn = el("button", null, "▲");
    btn.type = "button";
    btn.setAttribute("aria-label", "Upvote " + c.handle);
    var already = voted.has(c.id);
    btn.setAttribute("aria-pressed", already ? "true" : "false");
    var n = el("span", "fcgr-n", String(c.votes));
    var self = this;
    btn.addEventListener("click", function () {
      if (btn.getAttribute("aria-pressed") === "true") return;
      btn.setAttribute("aria-pressed", "true");
      n.textContent = String(Number(n.textContent) + 1);
      voted.add(c.id);
      api("/api/comments/" + c.id + "/vote", { method: "POST" })
        .then(function (d) { if (d.votes != null) n.textContent = String(d.votes); })
        .catch(function () { /* the optimistic count stands; server is truth next load */ });
    });
    v.appendChild(btn);
    v.appendChild(n);
    row.appendChild(v);

    var main = el("div", "fcgr-main");

    var meta = el("p", "fcgr-meta");
    meta.appendChild(el("span", "fcgr-h", c.handle));
    if (c.role_tag) {
      var isFC = c.handle.toLowerCase().indexOf("fat city") === 0;
      meta.appendChild(el("span", "fcgr-role" + (isFC ? " fcgr-fc" : ""), c.role_tag));
    }
    var tail = (c.market ? " · " + c.market : "") + " · " + ago(c.created_at);
    meta.appendChild(document.createTextNode(tail));
    main.appendChild(meta);

    var long = c.body.length > FOLD_AT;
    var holder = long ? el("div", "fcgr-fold") : main;
    var p = el("p", "fcgr-text");
    renderBody(p, c.body);
    holder.appendChild(p);

    if (long) {
      main.appendChild(holder);
      var more = el("button", "fcgr-more", "Read the rest ↓");
      more.type = "button";
      more.addEventListener("click", function () {
        var open = main.classList.toggle("fcgr-open");
        more.textContent = open ? "Show less ↑" : "Read the rest ↓";
      });
      main.appendChild(more);
    }

    var act = el("div", "fcgr-act");
    if (!isReply) {
      var rep = el("button", null, "Reply");
      rep.type = "button";
      rep.addEventListener("click", function () { self.openReply(row, c.id); });
      act.appendChild(rep);
    }
    var flag = el("button", null, "Flag");
    flag.type = "button";
    flag.addEventListener("click", function () {
      flag.disabled = true;
      api("/api/comments/" + c.id + "/flag", { method: "POST" })
        .then(function () { flag.textContent = "Flagged"; })
        .catch(function (e) { flag.textContent = e.message; });
    });
    act.appendChild(flag);
    main.appendChild(act);

    if (!isReply && c.replies && c.replies.length) {
      var wrap = el("div", "fcgr-replies");
      for (var i = 0; i < c.replies.length; i++) {
        wrap.appendChild(this.commentNode(c.replies[i], true));
      }
      main.appendChild(wrap);
    }

    row.appendChild(main);
    return row;
  };

  Room.prototype.pinnedNode = function (c) {
    var box = el("div", "fcgr-pin");
    box.appendChild(el("p", "fcgr-pinflag", "Pinned · " + c.handle +
      (c.role_tag ? " · " + c.role_tag : "")));

    var parts = c.body.split("\n\n");
    box.appendChild(el("p", "fcgr-pinq", parts[0]));
    if (parts.length < 2) return box;

    /* A real disclosure runs long — ours is ~1,400 characters. Unfolded, that
       alone pushes the tool entrances off a phone screen, and on features.html
       the whole point of the bounded block is that the tools stay within one
       scroll. So the pinned body folds like any other long comment; the
       question above it never does. */
    var rest = parts.slice(1).join("\n\n");
    var p = el("p", "fcgr-text");
    renderBody(p, rest);

    if (rest.length <= FOLD_AT) {
      box.appendChild(p);
      return box;
    }

    var fold = el("div", "fcgr-fold");
    fold.appendChild(p);
    box.appendChild(fold);
    var more = el("button", "fcgr-more", "Read the rest ↓");
    more.type = "button";
    more.addEventListener("click", function () {
      var open = box.classList.toggle("fcgr-open");
      more.textContent = open ? "Show less ↑" : "Read the rest ↓";
    });
    box.appendChild(more);
    return box;
  };

  Room.prototype.openReply = function (row, parentId) {
    if (row.querySelector(".fcgr-compose")) return;
    var box = this.composeNode(parentId);
    row.querySelector(".fcgr-main").appendChild(box);
    var t = box.querySelector("textarea");
    if (t) t.focus();
  };

  /* ------------------------------------------------------------- composing -- */

  Room.prototype.composeNode = function (parentId) {
    var self = this;
    var wrap = el("div", "fcgr-compose");

    if (!parentId) wrap.appendChild(el("p", "fcgr-norm", this.copy.norm));

    var fields = el("div", "fcgr-fields");
    var handle = el("input");
    handle.type = "text";
    handle.placeholder = "Handle";
    handle.maxLength = 24;
    handle.setAttribute("aria-label", "Handle");
    handle.value = ls("fcgr_handle") || "";

    var role = el("select");
    role.setAttribute("aria-label", "Role");
    [["", "I'm a…"], ["host", "Host"], ["operator", "Operator"],
     ["venue", "Venue"], ["player", "Player"]].forEach(function (o) {
      var op = el("option", null, o[1]);
      op.value = o[0];
      role.appendChild(op);
    });
    role.value = ls("fcgr_role") || "";

    var market = el("input");
    market.type = "text";
    market.placeholder = "Market (optional)";
    market.maxLength = 40;
    market.setAttribute("aria-label", "Market");
    market.value = ls("fcgr_market") || "";

    fields.appendChild(handle);
    fields.appendChild(role);
    fields.appendChild(market);
    wrap.appendChild(fields);

    var body = el("textarea");
    body.setAttribute("aria-label", parentId ? "Your reply" : "Your comment");
    body.placeholder = parentId ? "Write a reply…" : "Type your comment…";
    body.maxLength = BODY_MAX;
    wrap.appendChild(body);

    // Honeypot. Anything that fills this gets a 200 and goes nowhere.
    var hp = el("div", "fcgr-hp");
    var hpi = el("input");
    hpi.type = "text";
    hpi.name = "website";
    hpi.tabIndex = -1;
    hpi.setAttribute("autocomplete", "off");
    hpi.setAttribute("aria-hidden", "true");
    hp.appendChild(hpi);
    wrap.appendChild(hp);

    var chars = el("p", "fcgr-chars");
    chars.hidden = true;
    wrap.appendChild(chars);
    body.addEventListener("input", function () {
      // The compose box grows with typing; no counter until it actually matters.
      body.style.height = "auto";
      body.style.height = Math.min(600, body.scrollHeight + 2) + "px";
      if (body.value.length >= COUNTER_AT) {
        chars.hidden = false;
        chars.textContent = (BODY_MAX - body.value.length).toLocaleString() + " characters left";
      } else { chars.hidden = true; }
    });

    var ts = el("div", "fcgr-ts");
    wrap.appendChild(ts);

    var err = el("p", "fcgr-err");
    err.hidden = true;
    err.setAttribute("role", "alert");
    wrap.appendChild(err);

    var send = el("button", "fcgr-send", parentId ? "Reply" : "Post");
    send.type = "button";
    wrap.appendChild(send);

    if (this.turnstileKey) this.renderTurnstile(ts);

    send.addEventListener("click", function () {
      err.hidden = true;
      send.disabled = true;

      var token = null;
      try {
        if (window.turnstile && ts.firstChild) token = window.turnstile.getResponse(ts.firstChild);
      } catch (e) { /* not rendered; server decides */ }

      ls("fcgr_handle", handle.value);
      ls("fcgr_role", role.value);
      ls("fcgr_market", market.value);

      var seq = parseInt(ls("fcgr_seq_" + self.thread) || "0", 10) || 0;

      api("/api/comments", {
        method: "POST",
        body: {
          thread: self.thread,
          handle: handle.value,
          role_tag: role.value || null,
          market: market.value || null,
          body: body.value,
          parent_id: parentId || null,
          website: hpi.value,
          dwell: Date.now() - self.loadedAt,
          turnstile_token: token,
          seq: seq
        }
      }).then(function (d) {
        ls("fcgr_seq_" + self.thread, String(seq + 1));
        if (parentId) { self.load(); return; }
        self.showUnlock(wrap, d);
      }).catch(function (e) {
        send.disabled = false;
        err.hidden = false;
        err.textContent = e.message;
        try { if (window.turnstile) window.turnstile.reset(ts.firstChild); } catch (x) {}
      });
    });

    return wrap;
  };

  /* --------------------------------------------------- unlock + the Index -- */

  Room.prototype.showUnlock = function (composeWrap, res) {
    var self = this;
    var box = el("div", "fcgr-unlock");
    box.setAttribute("role", "status");

    if (res.unlock) {
      box.appendChild(el("h3", null, "You went first. Here's one we don't usually give away —"));
      box.appendChild(el("p", null, res.unlock));
    } else {
      box.appendChild(el("h3", null, "Posted. Thanks for going first."));
    }

    var h = HARVEST[this.thread];
    if (h) box.appendChild(this.harvestNode(h, res.comment ? res.comment.id : null));

    var again = el("button", "fcgr-link", "Write another");
    again.type = "button";
    again.addEventListener("click", function () { self.load(); });
    box.appendChild(again);

    composeWrap.parentNode.replaceChild(box, composeWrap);
    this.load(box);
  };

  Room.prototype.harvestNode = function (h, commentId) {
    var self = this;
    var wrap = el("div", "fcgr-harvest");
    wrap.appendChild(el("p", null, h.prompt));

    var fields = el("div", "fcgr-fields");
    var input, meta = null;

    if (h.kind === "number") {
      input = el("input");
      input.type = "number";
      input.min = "1";
      input.placeholder = h.label;
      input.setAttribute("aria-label", h.label);
      fields.appendChild(input);
      if (h.metaOptions) {
        meta = el("select");
        meta.setAttribute("aria-label", h.metaLabel);
        var d0 = el("option", null, h.metaLabel);
        d0.value = "";
        meta.appendChild(d0);
        h.metaOptions.forEach(function (o) {
          var op = el("option", null, o);
          op.value = o;
          meta.appendChild(op);
        });
        fields.appendChild(meta);
      }
    } else if (h.options) {
      input = el("select");
      input.setAttribute("aria-label", h.label);
      var d = el("option", null, h.label);
      d.value = "";
      input.appendChild(d);
      h.options.forEach(function (o) {
        var op = el("option", null, o);
        op.value = o;
        input.appendChild(op);
      });
      fields.appendChild(input);
    } else {
      input = el("input");
      input.type = "text";
      input.maxLength = 120;
      input.placeholder = h.label;
      input.setAttribute("aria-label", h.label);
      fields.appendChild(input);
    }

    var add = el("button", "fcgr-send", "Add");
    add.type = "button";
    add.style.marginTop = "0";
    fields.appendChild(add);
    wrap.appendChild(fields);

    add.addEventListener("click", function () {
      var val = input.value;
      if (!val) return;
      add.disabled = true;
      api("/api/datapoints", {
        method: "POST",
        body: {
          thread: self.thread,
          comment_id: commentId,
          kind: h.kind,
          unit: h.unit || null,
          num_value: h.kind === "number" ? Number(val) : null,
          text_value: h.kind === "number" ? null : val,
          meta: meta && meta.value ? meta.value : null,
          market: ls("fcgr_market") || null
        }
      }).then(function () {
        wrap.textContent = "";
        wrap.appendChild(el("p", null, "Added. Thank you — that's what makes the index worth anything."));
      }).catch(function (e) {
        add.disabled = false;
        var er = el("p", "fcgr-err", e.message);
        wrap.appendChild(er);
      });
    });

    return wrap;
  };

  /* ------------------------------------------------------------- Turnstile -- */

  Room.prototype.renderTurnstile = function (host) {
    var key = this.turnstileKey;
    if (!key || host.firstChild) return;
    function go() {
      try { window.turnstile.render(host, { sitekey: key, size: "flexible" }); } catch (e) {}
    }
    if (window.turnstile) { go(); return; }
    if (!document.getElementById("fcgr-ts-script")) {
      var s = el("script");
      s.id = "fcgr-ts-script";
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      s.async = true;
      s.defer = true;
      s.onload = go;
      document.head.appendChild(s);
    } else {
      setTimeout(go, 600);
    }
  };

  /* ---------------------------------------------------------------- render -- */

  Room.prototype.render = function () {
    var self = this;
    var root = el("section", "fcgr");

    var mq = el("div", "fcgr-mq");
    var bulbs = el("div", "fcgr-bulbs");
    bulbs.setAttribute("aria-hidden", "true");
    for (var i = 0; i < 13; i++) bulbs.appendChild(el("i"));
    mq.appendChild(bulbs);
    mq.appendChild(el("h2", "fcgr-title", this.copy.title));
    mq.appendChild(el("p", "fcgr-sub", this.copy.tagline));
    root.appendChild(mq);

    var body = el("div", "fcgr-body");
    body.appendChild(el("p", "fcgr-disc", DISCLOSURE));

    var data = this.data;
    var all = data.comments || [];
    var pinned = all.filter(function (c) { return c.status === "pinned"; });
    var rest = all.filter(function (c) { return c.status !== "pinned"; });

    var bar = el("div", "fcgr-bar");
    bar.appendChild(el("span", "fcgr-count",
      data.total === 1 ? "1 comment" : (data.total || 0) + " comments"));
    var sortWrap = el("div", "fcgr-sort");
    sortWrap.setAttribute("role", "group");
    sortWrap.setAttribute("aria-label", "Sort comments");
    [["top", "Top"], ["new", "Newest"]].forEach(function (o) {
      var b = el("button", null, o[1]);
      b.type = "button";
      b.setAttribute("aria-pressed", self.sort === o[0] ? "true" : "false");
      b.addEventListener("click", function () {
        if (self.sort === o[0]) return;
        self.sort = o[0];
        ls("fcgr_sort", o[0]);
        self.load();
      });
      sortWrap.appendChild(b);
    });
    bar.appendChild(sortWrap);
    body.appendChild(bar);

    pinned.forEach(function (c) { body.appendChild(self.pinnedNode(c)); });

    var list = el("div", "fcgr-list");
    list.setAttribute("aria-live", "polite");
    if (!rest.length) {
      list.appendChild(el("p", "fcgr-empty", "Nobody's said anything yet. Go first."));
    } else {
      rest.forEach(function (c) { list.appendChild(self.commentNode(c, false)); });
    }
    body.appendChild(list);

    body.appendChild(this.composeNode(null));
    body.appendChild(el("p", "fcgr-foot",
      "Plaintext only. Comments appear immediately; we moderate by removal, not by queue."));

    root.appendChild(body);

    this.mount.textContent = "";
    this.mount.appendChild(root);
  };

  Room.prototype.load = function (keepNode) {
    var self = this;
    return api("/api/comments?thread=" + encodeURIComponent(this.thread) +
               "&sort=" + this.sort + "&limit=25")
      .then(function (d) {
        self.data = d;
        self.render();
        if (keepNode) {
          // Put the unlock back after a reload so the reward isn't yanked away.
          var c = self.mount.querySelector(".fcgr-compose");
          if (c && c.parentNode) c.parentNode.replaceChild(keepNode, c);
        }
      })
      .catch(function () {
        // Leave the baked static thread exactly where it is. A readable thread
        // beats an error box, and the baked copy is real content.
      });
  };

  Room.prototype.start = function () {
    var self = this;
    fetch(API + "/api/config")
      .then(function (r) { return r.json(); })
      .then(function (c) { self.turnstileKey = c.turnstile_site_key || null; })
      .catch(function () {})
      .then(function () { return self.load(); });
  };

  /* ------------------------------------------------------------------ boot -- */

  function boot() {
    var mounts = document.querySelectorAll("[data-fc-thread]");
    if (!mounts.length) return;
    injectCSS();
    for (var i = 0; i < mounts.length; i++) {
      var thread = mounts[i].getAttribute("data-fc-thread");
      if (!thread) continue;
      new Room(mounts[i], thread).start();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
