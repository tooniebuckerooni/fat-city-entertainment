/* Trivia Generator Pro — state + UI */
(() => {
  "use strict";
  const $ = s => document.querySelector(s);
  const STORE_KEY = "tgp_state_v1";

  /* ---------- state ---------- */

  const blankQ = () => ({ q: "", a: "", choices: null });
  const blankRound = (name, n) => ({
    name: name || "",
    type: "standard",
    format: "open", /* "open" | "tf" | "mc" — answer format for this round's questions */
    ageRange: "family", /* who the round is for — steers samples + AI */
    difficulty: "balanced", /* AI-only knob; "balanced" adds no prompt instruction */
    points: 10,
    open: true,
    questions: Array.from({ length: n || 10 }, blankQ)
  });

  /* Audience bands. Age range is the friendly primary knob; difficulty is a
     secondary, AI-only control that defaults to "balanced". */
  const AGE_RANGES = [
    ["family", "👪 Family (all ages)"],
    ["kids",   "🧒 Kids (7–12)"],
    ["teens",  "🧑 Teens (13–17)"],
    ["adults", "🍺 Adults (18+)"]
  ];
  const DIFFICULTIES = [
    ["balanced", "🎚 Balanced"],
    ["easy",     "🟢 Easy"],
    ["medium",   "🟡 Medium"],
    ["hard",     "🔴 Hard"]
  ];
  const AGE_IDS = AGE_RANGES.map(a => a[0]);
  const DIFF_IDS = DIFFICULTIES.map(d => d[0]);
  /* Which sample audience bands a round's age range is allowed to draw from. */
  const AGE_SAMPLE_BANDS = {
    family: ["all"], kids: ["all"], teens: ["all", "teen"], adults: ["all", "teen", "adult"]
  };
  const sampleAllowed = (entry, ageRange) =>
    (AGE_SAMPLE_BANDS[ageRange] || AGE_SAMPLE_BANDS.family).includes(entry[2] || "all");

  /* Switching a round's answer format migrates existing questions rather
     than wiping them: open->mc keeps whatever was in `a` as choice A. */
  function setRoundFormat(r, format) {
    if (!["open", "tf", "mc"].includes(format)) format = "open";
    r.format = format;
    r.questions.forEach(q => {
      if (format === "tf") {
        q.choices = ["True", "False"];
        /* Only default an answer for rows that already have content —
           defaulting truly blank rows to "True" would make them look
           filled-in everywhere blank-ness is checked (stats, audit, PDFs). */
        const hasContent = q.q.trim() || q.a.trim();
        if (hasContent && q.a !== "True" && q.a !== "False") q.a = "True";
        else if (!hasContent) q.a = "";
      } else if (format === "mc") {
        if (!Array.isArray(q.choices) || q.choices.length !== 4) {
          q.choices = [q.a || "", "", "", ""];
        }
      } else {
        q.choices = null;
      }
    });
  }

  const DEFAULT_STATE = () => ({
    game: { title: "", subtitle: "", date: "", host: "" },
    branding: {
      org: "Fat City Entertainment",
      tagline: "Games • Trivia • Music Bingo",
      website: "www.fatcityentertainment.com",
      accent: "#d94f4f",
      font: "helvetica",
      logo: null, logoW: 0, logoH: 0,
      credit: false
    },
    options: { pageSize: "letter", showPoints: true, halfSheets: false, teams: 12, tiebreaker: true },
    tiebreaker: { q: "", a: "" },
    rounds: [blankRound("", 10)]
  });

  let state = DEFAULT_STATE();

  /* ---------- persistence ---------- */

  let saveTimer = null;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(state));
      } catch (e) {
        /* quota — retry without the logo image */
        try {
          localStorage.setItem(STORE_KEY, JSON.stringify({ ...state, branding: { ...state.branding, logo: null } }));
        } catch (e2) { /* give up quietly */ }
      }
    }, 400);
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return;
      adoptState(JSON.parse(raw));
    } catch (e) { /* corrupted save — start fresh */ }
  }

  function adoptState(obj) {
    const d = DEFAULT_STATE();
    state = {
      game: { ...d.game, ...(obj.game || {}) },
      branding: { ...d.branding, ...(obj.branding || {}) },
      options: { ...d.options, ...(obj.options || {}) },
      tiebreaker: { ...d.tiebreaker, ...(obj.tiebreaker || {}) },
      rounds: Array.isArray(obj.rounds) && obj.rounds.length
        ? obj.rounds.map(r => ({
            name: r.name || "",
            type: ["standard", "double", "wager"].includes(r.type) ? r.type : "standard",
            format: ["open", "tf", "mc"].includes(r.format) ? r.format : "open",
            ageRange: AGE_IDS.includes(r.ageRange) ? r.ageRange : "family",
            difficulty: DIFF_IDS.includes(r.difficulty) ? r.difficulty : "balanced",
            points: Number(r.points) || 10,
            open: r.open !== false,
            questions: Array.isArray(r.questions) && r.questions.length
              ? r.questions.map(q => ({
                  q: String(q.q || ""), a: String(q.a || ""),
                  choices: Array.isArray(q.choices) ? q.choices.map(x => String(x || "")) : null
                }))
              : [blankQ()]
          }))
        : d.rounds
    };
  }

  /* ---------- small utils ---------- */

  const esc = s => String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  function toast(msg, ms) {
    const t = $("#toast");
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { t.hidden = true; }, ms || 2600);
  }

  const shuffled = arr => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  function slug() {
    return (state.game.title || "trivia-game").toLowerCase()
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "trivia-game";
  }

  function autosize(el) {
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight + 2, 200) + "px";
  }

  /* ---------- settings bindings ---------- */

  const BINDINGS = [
    ["#g-title",   () => state.game.title,        v => state.game.title = v],
    ["#g-subtitle",() => state.game.subtitle,     v => state.game.subtitle = v],
    ["#g-date",    () => state.game.date,         v => state.game.date = v],
    ["#g-host",    () => state.game.host,         v => state.game.host = v],
    ["#b-org",     () => state.branding.org,      v => state.branding.org = v],
    ["#b-tagline", () => state.branding.tagline,  v => state.branding.tagline = v],
    ["#b-website", () => state.branding.website,  v => state.branding.website = v],
    ["#b-accent",  () => state.branding.accent,   v => { state.branding.accent = v; $("#accent-code").textContent = v; }],
    ["#b-font",    () => state.branding.font,     v => state.branding.font = v],
    ["#o-pagesize",() => state.options.pageSize,  v => state.options.pageSize = v],
    ["#o-teams",   () => state.options.teams,     v => state.options.teams = Number(v) || 12],
    ["#tb-q",      () => state.tiebreaker.q,      v => state.tiebreaker.q = v],
    ["#tb-a",      () => state.tiebreaker.a,      v => state.tiebreaker.a = v]
  ];
  const CHECKS = [
    ["#b-credit", () => state.branding.credit,    v => state.branding.credit = v],
    ["#o-points", () => state.options.showPoints, v => state.options.showPoints = v],
    ["#o-half",   () => state.options.halfSheets, v => state.options.halfSheets = v],
    ["#o-tb",     () => state.options.tiebreaker, v => { state.options.tiebreaker = v; syncTbVisibility(); }]
  ];

  function bindSettings() {
    BINDINGS.forEach(([sel, , set]) => {
      $(sel).addEventListener("input", e => { set(e.target.value); save(); });
    });
    CHECKS.forEach(([sel, , set]) => {
      $(sel).addEventListener("change", e => { set(e.target.checked); save(); });
    });
  }

  function applyControls() {
    BINDINGS.forEach(([sel, get]) => { $(sel).value = get(); });
    CHECKS.forEach(([sel, get]) => { $(sel).checked = !!get(); });
    $("#accent-code").textContent = state.branding.accent;
    syncTbVisibility();
    syncLogoPreview();
  }

  function syncTbVisibility() {
    $("#tb-fields").classList.toggle("off", !state.options.tiebreaker);
  }

  /* ---------- logo ---------- */

  function syncLogoPreview() {
    const box = $("#logo-preview");
    if (state.branding.logo) {
      box.classList.remove("empty");
      box.style.backgroundImage = "url(" + state.branding.logo + ")";
      box.textContent = "";
      $("#btn-logo-clear").hidden = false;
    } else {
      box.classList.add("empty");
      box.style.backgroundImage = "";
      box.textContent = "No logo";
      $("#btn-logo-clear").hidden = true;
    }
  }

  function bindLogo() {
    $("#btn-logo").addEventListener("click", () => $("#logo-file").click());
    $("#btn-logo-clear").addEventListener("click", () => {
      state.branding.logo = null;
      state.branding.logoW = state.branding.logoH = 0;
      syncLogoPreview(); save();
    });
    $("#logo-file").addEventListener("change", e => {
      const file = e.target.files[0];
      e.target.value = "";
      if (!file) return;
      if (!/^image\/(png|jpe?g)$/.test(file.type)) {
        toast("Please use a PNG or JPG image."); return;
      }
      if (file.size > 4 * 1024 * 1024) {
        toast("Logo is too large — keep it under 4 MB."); return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          state.branding.logo = reader.result;
          state.branding.logoW = img.naturalWidth;
          state.branding.logoH = img.naturalHeight;
          syncLogoPreview(); save();
          toast("Logo added — it will appear on every PDF.");
        };
        img.onerror = () => toast("Couldn't read that image file.");
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  /* ---------- rounds rendering ---------- */

  function qRowHtml(q, qi, ri, format) {
    const num = '<span class="q-num">' + (qi + 1) + '</span>';
    const acts = '<span class="q-acts">' +
      '<button class="btn btn-icon" data-act="qup" data-q="' + qi + '" title="Move up">↑</button>' +
      '<button class="btn btn-icon" data-act="qdel" data-q="' + qi + '" title="Delete question">✕</button>' +
      '</span>';

    if (format === "tf") {
      return '<div class="q-row q-row-tf">' + num +
        '<textarea rows="1" data-field="q" data-q="' + qi + '" placeholder="Statement…">' + esc(q.q) + '</textarea>' +
        '<span class="tf-toggle">' +
          '<button type="button" class="tf-btn' + (q.a === "True" ? " active" : "") + '" data-act="tfset" data-q="' + qi + '" data-val="True">True</button>' +
          '<button type="button" class="tf-btn' + (q.a === "False" ? " active" : "") + '" data-act="tfset" data-q="' + qi + '" data-val="False">False</button>' +
        '</span>' + acts + '</div>';
    }

    if (format === "mc") {
      const choices = Array.isArray(q.choices) && q.choices.length === 4 ? q.choices : ["", "", "", ""];
      const choicesHtml = choices.map((ch, ci) =>
        '<label class="q-choice">' +
          '<input type="radio" name="correct-' + ri + '-' + qi + '" data-act="mccorrect" data-q="' + qi + '" data-idx="' + ci + '"' + (ch !== "" && ch === q.a ? " checked" : "") + '>' +
          '<input type="text" class="choice-text" data-field="choice" data-q="' + qi + '" data-idx="' + ci + '" placeholder="Choice ' + String.fromCharCode(65 + ci) + '" value="' + esc(ch) + '">' +
        '</label>'
      ).join("");
      return '<div class="q-row q-row-mc">' + num +
        '<div class="q-row-main">' +
          '<textarea rows="1" data-field="q" data-q="' + qi + '" placeholder="Question…">' + esc(q.q) + '</textarea>' +
          '<div class="q-choices">' + choicesHtml + '</div>' +
        '</div>' + acts + '</div>';
    }

    return '<div class="q-row">' + num +
      '<textarea rows="1" data-field="q" data-q="' + qi + '" placeholder="Question…">' + esc(q.q) + '</textarea>' +
      '<textarea rows="1" data-field="a" data-q="' + qi + '" placeholder="Answer">' + esc(q.a) + '</textarea>' +
      acts + '</div>';
  }

  const AI_MODES = [
    ["topic", "Single Topic"],
    ["mixed", "Mixed Categories"],
    ["lightning", "Lightning (quick-fire)"],
    ["list", "List Round"],
    ["connections", "Connections (find the link)"]
  ];

  function roundHtml(r, i) {
    const cats = Object.keys(TGP_SAMPLES)
      .map(cat => '<option value="' + esc(cat) + '">' + esc(cat) + "</option>").join("");
    const modeOpts = AI_MODES.map(([v, label]) => '<option value="' + v + '">' + label + "</option>").join("");
    const ageOpts = AGE_RANGES.map(([v, label]) =>
      '<option value="' + v + '"' + ((r.ageRange || "family") === v ? " selected" : "") + ">" + label + "</option>").join("");
    const diffOpts = DIFFICULTIES.map(([v, label]) =>
      '<option value="' + v + '"' + ((r.difficulty || "balanced") === v ? " selected" : "") + ">" + label + "</option>").join("");
    const format = r.format || "open";
    return '<div class="round' + (r.open ? "" : " closed") + '" data-r="' + i + '">' +
      '<div class="round-head">' +
        '<div class="round-num">' + (i + 1) + "</div>" +
        '<input type="text" class="r-name" data-field="name" placeholder="Round category (e.g. Music)" maxlength="50" value="' + esc(r.name) + '">' +
        '<select class="r-type" data-field="type">' +
          '<option value="standard"' + (r.type === "standard" ? " selected" : "") + ">Standard</option>" +
          '<option value="double"' + (r.type === "double" ? " selected" : "") + ">Double Points</option>" +
          '<option value="wager"' + (r.type === "wager" ? " selected" : "") + ">Wager Round</option>" +
        "</select>" +
        '<select class="r-format" data-field="format" title="Answer format">' +
          '<option value="open"' + (format === "open" ? " selected" : "") + ">Open-ended</option>" +
          '<option value="tf"' + (format === "tf" ? " selected" : "") + ">True / False</option>" +
          '<option value="mc"' + (format === "mc" ? " selected" : "") + ">Multiple Choice</option>" +
        "</select>" +
        '<select class="r-age" data-field="age" title="Who is this round for? Steers samples and AI.">' + ageOpts + "</select>" +
        '<span class="pts-wrap">pts/q <input type="number" class="r-pts" data-field="points" min="1" max="999" value="' + esc(r.points) + '"></span>' +
        '<div class="round-tools">' +
          '<button class="btn btn-icon" data-act="shuffle" title="Shuffle question order">🔀</button>' +
          '<button class="btn btn-icon" data-act="dup" title="Duplicate round">⧉</button>' +
          '<button class="btn btn-icon" data-act="up" title="Move round up">↑</button>' +
          '<button class="btn btn-icon" data-act="down" title="Move round down">↓</button>' +
          '<button class="btn btn-icon" data-act="del" title="Delete round">✕</button>' +
          '<button class="btn btn-icon" data-act="toggle" title="Collapse / expand">' + (r.open ? "▾" : "▸") + "</button>" +
        "</div>" +
      "</div>" +
      '<div class="round-body">' +
        r.questions.map((q, qi) => qRowHtml(q, qi, i, format)).join("") +
        '<div class="round-foot">' +
          '<button class="btn btn-small" data-act="addq">+ Add Question</button>' +
          '<span class="spacer"></span>' +
          '<select class="fill-cat" title="Sample category">' + cats + "</select>" +
          '<button class="btn btn-small" data-act="fill" title="Append 10 ready-made questions">+ 10 Samples</button>' +
        "</div>" +
        '<div class="round-foot round-foot-ai">' +
          '<span class="ai-label">✨ AI</span>' +
          '<select class="ai-mode" title="Content style">' + modeOpts + "</select>" +
          '<select class="ai-diff" data-field="difficulty" title="Difficulty (AI only)">' + diffOpts + "</select>" +
          '<button class="btn btn-small btn-ai" data-act="ai-fill" title="Generate 10 AI questions for this round">✨ Generate 10 <span class="ai-cost">· 2</span></button>' +
          '<span class="spacer"></span>' +
          '<span class="ai-seed-label">Seed</span>' +
          '<input type="text" class="ai-seed" placeholder="e.g. Halloween" title="Optional seed to steer every dig for this round (e.g. Halloween, 90s, Sports)" maxlength="60">' +
          '<button class="btn btn-small btn-ai" data-act="ai-suggest" title="Dig up 5 surprising AI category ideas, seeded if you typed one">⛏ Dig for Categories <span class="ai-cost">· 1</span></button>' +
        "</div>" +
        '<div class="ai-suggest-tray" hidden></div>' +
      "</div></div>";
  }

  function renderRounds() {
    const box = $("#rounds");
    if (!state.rounds.length) {
      box.innerHTML = '<div class="empty-state">' +
        '<p class="empty-big">Your first round is a blank canvas.</p>' +
        '<p>Fill it three ways:</p>' +
        '<ul class="empty-ways">' +
          '<li>⛏ <b>Dig</b> for surprising AI categories</li>' +
          '<li>✨ <b>Generate</b> a whole round from a topic</li>' +
          '<li>📚 Drop in <b>vetted samples</b></li>' +
        '</ul>' +
        '<button class="btn btn-accent" id="empty-add">+ Add Your First Round</button></div>';
      $("#empty-add").addEventListener("click", () => { addRound(); });
    } else {
      box.innerHTML = state.rounds.map(roundHtml).join("");
      box.querySelectorAll("textarea").forEach(autosize);
    }
    updateStats();
  }

  function updateStats() {
    const a = TGP_PDF.audit(state);
    let pts = 0, hasWager = false;
    TGPClean().forEach(r => {
      if (r.type === "wager") hasWager = true;
      else pts += r.questions.length * (r.type === "double" ? r.points * 2 : r.points);
    });
    $("#stats").innerHTML =
      "<b>" + a.rounds + "</b> round" + (a.rounds === 1 ? "" : "s") +
      " &nbsp;•&nbsp; <b>" + a.questions + "</b> question" + (a.questions === 1 ? "" : "s") +
      (state.options.showPoints ? " &nbsp;•&nbsp; <b>" + pts + "</b> pts" + (hasWager ? " + wagers" : "") : "");
  }

  /* mirror of pdfgen's cleaner, for the stats line */
  function TGPClean() {
    return state.rounds
      .map(r => ({
        type: r.type, points: Math.max(1, Number(r.points) || 10),
        questions: r.questions.filter(q => (q.q || "").trim() || (q.a || "").trim())
      }))
      .filter(r => r.questions.length);
  }

  /* ---------- rounds events (delegated) ---------- */

  function addRound() {
    state.rounds.push(blankRound("", 10));
    renderRounds(); save();
  }

  function aiFillRound(r, btn, roundEl) {
    const modeSel = roundEl.querySelector(".ai-mode");
    const mode = modeSel ? modeSel.value : "topic";
    const diffSel = roundEl.querySelector(".ai-diff");
    const difficulty = diffSel ? diffSel.value : (r.difficulty || "balanced");
    const age = r.ageRange || "family";
    const needsTopic = mode === "topic" || mode === "lightning" || mode === "list";
    const topic = r.name.trim();
    if (needsTopic && !topic) { toast("Give this round a category/topic first, then generate."); return; }
    if (!window.TGP_AI) { toast("AI generator didn't load — try refreshing."); return; }
    const format = r.format || "open";
    btn.disabled = true;
    const original = btn.innerHTML;
    btn.textContent = "Generating…";
    TGP_AI.generateForRound(topic, { mode, format, count: 10, age, difficulty })
      .then(questions => {
        const fresh = questions.map(x => {
          const q = String((x && x.question) || "").trim();
          const a = String((x && x.answer) || "").trim();
          const choices = format === "mc" && Array.isArray(x && x.choices)
            ? x.choices.map(c => String(c || "").trim()).filter(Boolean)
            : (format === "tf" ? ["True", "False"] : null);
          return { q, a, choices };
        }).filter(x => x.q && x.a && (format !== "mc" || (x.choices && x.choices.length === 4)));
        if (!fresh.length) { toast("AI didn't return any usable questions — try again."); return; }
        /* fill empty rows first, then append — same pattern as sample-fill */
        let fi = 0;
        r.questions.forEach(q => {
          if (fi < fresh.length && !q.q.trim() && !q.a.trim()) {
            q.q = fresh[fi].q; q.a = fresh[fi].a; q.choices = fresh[fi].choices; fi++;
          }
        });
        while (fi < fresh.length) r.questions.push(fresh[fi++]);
        r.open = true;
        renderRounds(); save();
        toast("Added " + fresh.length + " AI-generated questions.");
      })
      .catch(err => toast(err.message || "AI generation failed."))
      .finally(() => { btn.disabled = false; btn.innerHTML = original; });
  }

  /* ---------- AI category spinner ---------- */

  // Describes what's steering the current batch, so the tray never leaves
  // it a mystery: the typed seed (persists across digs in this round) and,
  // once the user has clicked "dig deeper" at least once, the chain of
  // categories that batch was drilled out of.
  function digContext(theme, trail) {
    const parts = [];
    if (trail && trail.length) parts.push('deeper into “' + trail[trail.length - 1] + '”');
    if (theme) parts.push('seeded “' + theme + '”');
    return parts.join(", ");
  }

  function renderSuggestTray(roundEl, spinning, categories, theme, trail) {
    const tray = roundEl.querySelector(".ai-suggest-tray");
    if (!tray) return;
    tray.hidden = false;
    const ctx = digContext(theme, trail);
    if (spinning) {
      tray.innerHTML = '<span class="dig-hint">⛏ Digging' + (ctx ? " " + esc(ctx) : " for fresh categories") + '…</span>' +
        Array.from({ length: 5 }, (_, i) =>
          '<span class="chip chip-spin chip-gem" style="animation-delay:' + (i * 70) + 'ms">◆</span>'
        ).join("");
      return;
    }
    tray.innerHTML = '<span class="dig-hint">💎 Unearthed' + (ctx ? " — " + esc(ctx) : "") +
        ' — click a name to set it as this round\'s category, or ⛏ to dig deeper from it:</span>' +
      categories.map((cat, i) =>
      '<span class="chip chip-landed" style="animation-delay:' + (i * 70) + 'ms" data-cat="' + esc(cat) + '">' +
        '<button type="button" class="chip-text" data-act="usecat" title="Use as this round\'s category">' + esc(cat) + '</button>' +
        '<button type="button" class="chip-spin-btn" data-act="spincat" title="Dig deeper — spin off 5 more ideas from this one">⛏</button>' +
      '</span>'
    ).join("") + '<button type="button" class="chip-reset" data-act="respin">⛏ Start over</button>';
  }

  function spinCategories(r, roundEl, seed, theme, trail) {
    if (!window.TGP_AI) { toast("AI generator didn't load — try refreshing."); return; }
    renderSuggestTray(roundEl, true, null, theme, trail);
    const avoid = state.rounds.map(x => x.name.trim()).filter(Boolean);
    TGP_AI.suggestCategories(seed || "", avoid, r.ageRange || "family", theme || "")
      .then(categories => renderSuggestTray(roundEl, false, categories, theme, trail))
      .catch(err => {
        const tray = roundEl.querySelector(".ai-suggest-tray");
        if (tray) tray.hidden = true;
        toast(err.message || "Couldn't get suggestions.");
      });
  }

  // Briefly highlights a round's category field so it's obvious a dug-up
  // name actually landed there. Looks the round up by index rather than
  // holding a DOM reference, since renderRounds() just rebuilt the tree.
  function flashRoundName(i) {
    const el = document.querySelector('.round[data-r="' + i + '"] .r-name');
    if (!el) return;
    el.classList.remove("flash-set");
    void el.offsetWidth; /* restart the animation if it's still running */
    el.classList.add("flash-set");
    setTimeout(() => el.classList.remove("flash-set"), 900);
  }

  function bindRounds() {
    const box = $("#rounds");

    box.addEventListener("input", e => {
      const el = e.target;
      const roundEl = el.closest(".round");
      if (!roundEl) return;
      const r = state.rounds[Number(roundEl.dataset.r)];
      if (!r) return;
      const f = el.dataset.field;
      if (f === "q" || f === "a") {
        const q = r.questions[Number(el.dataset.q)];
        if (q) q[f] = el.value;
        autosize(el);
      } else if (f === "choice") {
        const q = r.questions[Number(el.dataset.q)];
        const idx = Number(el.dataset.idx);
        if (q && Array.isArray(q.choices)) {
          const wasCorrect = q.choices[idx] !== "" && q.choices[idx] === q.a;
          q.choices[idx] = el.value;
          if (wasCorrect) q.a = el.value;
        }
      } else if (f === "name") r.name = el.value;
      else if (f === "points") r.points = Math.max(1, Number(el.value) || 10);
      updateStats(); save();
    });

    box.addEventListener("change", e => {
      const el = e.target;
      const roundEl = el.closest(".round");
      const r = state.rounds[Number(roundEl.dataset.r)];
      if (!r) return;
      if (el.dataset.field === "type") { r.type = el.value; updateStats(); save(); }
      else if (el.dataset.field === "format") { setRoundFormat(r, el.value); renderRounds(); save(); }
      else if (el.dataset.field === "age") { r.ageRange = AGE_IDS.includes(el.value) ? el.value : "family"; save(); }
      else if (el.dataset.field === "difficulty") { r.difficulty = DIFF_IDS.includes(el.value) ? el.value : "balanced"; save(); }
      else if (el.dataset.act === "mccorrect") {
        const q = r.questions[Number(el.dataset.q)];
        const idx = Number(el.dataset.idx);
        if (q && Array.isArray(q.choices)) { q.a = q.choices[idx] || ""; save(); }
      }
    });

    box.addEventListener("click", e => {
      const btn = e.target.closest("button[data-act]");
      if (!btn) return;
      const roundEl = btn.closest(".round");
      if (!roundEl) return;
      const i = Number(roundEl.dataset.r);
      const r = state.rounds[i];
      if (!r) return;
      const act = btn.dataset.act;

      if (act === "toggle") { r.open = !r.open; }
      else if (act === "up" && i > 0) { state.rounds.splice(i - 1, 0, state.rounds.splice(i, 1)[0]); }
      else if (act === "down" && i < state.rounds.length - 1) { state.rounds.splice(i + 1, 0, state.rounds.splice(i, 1)[0]); }
      else if (act === "del") {
        const filled = r.questions.filter(q => q.q.trim() || q.a.trim()).length;
        if (filled && !confirm("Delete Round " + (i + 1) + " and its " + filled + " question(s)?")) return;
        state.rounds.splice(i, 1);
      }
      else if (act === "dup") {
        state.rounds.splice(i + 1, 0, JSON.parse(JSON.stringify({ ...r, name: r.name ? r.name + " (copy)" : "" })));
      }
      else if (act === "shuffle") { r.questions = shuffled(r.questions); toast("Round " + (i + 1) + " shuffled."); }
      else if (act === "addq") { r.questions.push(blankQ()); r.open = true; }
      else if (act === "fill") {
        const cat = roundEl.querySelector(".fill-cat").value;
        const ageRange = r.ageRange || "family";
        const pool = (TGP_SAMPLES[cat] || []).filter(e => sampleAllowed(e, ageRange));
        const have = new Set(r.questions.map(q => q.q.trim()).filter(Boolean));
        const fresh = shuffled(pool.filter(([q]) => !have.has(q))).slice(0, 10)
          .map(([q, a]) => ({ q, a }));
        if (!fresh.length) { toast("No more unused " + cat + " samples for this age range — try a wider Age Range or another category."); return; }
        /* fill empty rows first, then append */
        let fi = 0;
        r.questions.forEach(q => {
          if (fi < fresh.length && !q.q.trim() && !q.a.trim()) {
            q.q = fresh[fi].q; q.a = fresh[fi].a; fi++;
          }
        });
        while (fi < fresh.length) r.questions.push(fresh[fi++]);
        if (!r.name.trim()) r.name = cat;
        r.open = true;
        toast("Added " + fresh.length + " " + cat + " questions.");
      }
      else if (act === "ai-fill") {
        aiFillRound(r, btn, roundEl);
        return; /* async — aiFillRound does its own renderRounds()/save() */
      }
      else if (act === "ai-suggest" || act === "respin") {
        const theme = (roundEl.querySelector(".ai-seed") || {}).value || "";
        roundEl._digTrail = []; /* fresh top-level batch — clears any prior "dig deeper" chain */
        spinCategories(r, roundEl, "", theme, roundEl._digTrail);
        return; /* async, and the tray is ephemeral UI — not part of saved state */
      }
      else if (act === "spincat") {
        const seed = btn.closest(".chip").dataset.cat;
        const theme = (roundEl.querySelector(".ai-seed") || {}).value || "";
        roundEl._digTrail = (roundEl._digTrail || []).concat(seed); /* the true "dig deeper": spins off the pick just made */
        spinCategories(r, roundEl, seed, theme, roundEl._digTrail);
        return;
      }
      else if (act === "usecat") {
        const cat = btn.closest(".chip").dataset.cat;
        const filled = r.questions.filter(q => q.q.trim() || q.a.trim()).length;
        let cleared = false;
        if (filled) {
          cleared = confirm(
            'Set Round ' + (i + 1) + '’s category to “' + cat + '”?\n\n' +
            'It already has ' + filled + ' question' + (filled === 1 ? "" : "s") + ' filled in for the old category.\n\n' +
            'OK — clear them so you can fill fresh ones for “' + cat + '”.\n' +
            'Cancel — just rename the round and keep the existing questions.'
          );
          if (cleared) r.questions = r.questions.map(blankQ);
        }
        r.name = cat;
        renderRounds(); save();
        flashRoundName(i);
        toast('Round ' + (i + 1) + ' category set to “' + cat + '”' + (cleared ? " — questions cleared." : filled ? " — questions kept." : "."));
        return;
      }
      else if (act === "tfset") {
        const q = r.questions[Number(btn.dataset.q)];
        if (q) { q.a = btn.dataset.val; q.choices = ["True", "False"]; }
      }
      else if (act === "qup" || act === "qdel") {
        const qi = Number(btn.dataset.q);
        if (act === "qup" && qi > 0) {
          r.questions.splice(qi - 1, 0, r.questions.splice(qi, 1)[0]);
        } else if (act === "qdel") {
          const q = r.questions[qi];
          if ((q.q.trim() || q.a.trim()) && !confirm("Delete question " + (qi + 1) + "?")) return;
          r.questions.splice(qi, 1);
          if (!r.questions.length) r.questions.push(blankQ());
        } else return;
      }
      else return;

      renderRounds(); save();
    });

    $("#btn-add-round").addEventListener("click", addRound);
  }

  /* ---------- AI tiebreaker ---------- */

  function bindTiebreakerAI() {
    const btn = $("#btn-tb-ai");
    if (!btn) return;
    btn.addEventListener("click", () => {
      if (!window.TGP_AI) { toast("AI generator didn't load — try refreshing."); return; }
      const seed = ($("#tb-seed") || {}).value || "";
      const original = btn.innerHTML;
      btn.disabled = true;
      btn.textContent = "Generating…";
      TGP_AI.generateTiebreaker(seed, "family")
        .then(({ question, answer, category }) => {
          state.tiebreaker = { q: question, a: answer };
          state.options.tiebreaker = true;
          $("#tb-q").value = question;
          $("#tb-a").value = answer;
          autosize($("#tb-q"));
          $("#o-tb").checked = true;
          syncTbVisibility();
          save();
          toast(category ? "Generated a “" + category + "” tiebreaker." : "Generated a tiebreaker.");
        })
        .catch(err => toast(err.message || "Tiebreaker generation failed."))
        .finally(() => { btn.disabled = false; btn.innerHTML = original; });
    });
  }

  /* ---------- PDF generation ---------- */

  const DOC_META = {
    host:      { fn: s => TGP_PDF.host(s),      file: "host-packet" },
    questions: { fn: s => TGP_PDF.questions(s), file: "question-packet" },
    sheets:    { fn: s => TGP_PDF.sheets(s),    file: "answer-sheets" },
    scores:    { fn: s => TGP_PDF.scores(s),    file: "score-sheet" }
  };

  function makeDoc(kind, quiet) {
    const a = TGP_PDF.audit(state);
    if (!a.rounds) {
      toast("Write (or sample-fill) at least one question first.");
      return null;
    }
    if (!quiet && kind === "host" && a.missingAnswers &&
        !confirm(a.missingAnswers + " question(s) have no answer yet — they'll show a blank. Generate anyway?")) {
      return null;
    }
    try {
      return DOC_META[kind].fn(state);
    } catch (err) {
      console.error(err);
      toast("PDF generation failed: " + err.message);
      return null;
    }
  }

  function bindDownloads() {
    document.querySelectorAll("[data-download]").forEach(btn => {
      btn.addEventListener("click", () => {
        const kind = btn.dataset.download;
        const doc = makeDoc(kind);
        if (!doc) return;
        doc.save(slug() + "-" + DOC_META[kind].file + ".pdf");
        toast("Downloaded " + DOC_META[kind].file.replace(/-/g, " ") + ".");
      });
    });
    document.querySelectorAll("[data-preview]").forEach(btn => {
      btn.addEventListener("click", () => {
        const doc = makeDoc(btn.dataset.preview);
        if (!doc) return;
        const win = window.open(doc.output("bloburl"), "_blank");
        if (!win) toast("Pop-up blocked — allow pop-ups to preview.");
      });
    });
    $("#btn-all").addEventListener("click", () => {
      const a = TGP_PDF.audit(state);
      if (!a.rounds) { toast("Write (or sample-fill) at least one question first."); return; }
      if (a.missingAnswers &&
          !confirm(a.missingAnswers + " question(s) have no answer yet. Download the kit anyway?")) return;
      const kinds = Object.keys(DOC_META);
      kinds.forEach((kind, i) => {
        setTimeout(() => {
          const doc = makeDoc(kind, true);
          if (doc) doc.save(slug() + "-" + DOC_META[kind].file + ".pdf");
        }, i * 500);
      });
      toast("Downloading all 4 PDFs — your browser may ask permission for multiple files.");
    });
  }

  /* ---------- toolbar: sample game, save/open, reset ---------- */

  function hasContent() {
    return state.rounds.some(r => r.questions.some(q => q.q.trim() || q.a.trim()));
  }

  function loadSampleGame() {
    if (hasContent() && !confirm("Replace your current game with the sample game?")) return;
    const picks = ["General Knowledge", "Music", "Movies & TV"];
    state.game.title = "Thursday Night Trivia";
    state.game.subtitle = "Live Pub Trivia";
    state.game.date = new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
    state.rounds = picks.map(cat => ({
      name: cat, type: "standard", format: "open", ageRange: "teens", difficulty: "balanced",
      points: 10, open: true,
      questions: shuffled(TGP_SAMPLES[cat]).slice(0, 10).map(([q, a]) => ({ q, a }))
    }));
    state.rounds[2].type = "double";
    const tb = TGP_TIEBREAKERS[Math.floor(Math.random() * TGP_TIEBREAKERS.length)];
    state.options.tiebreaker = true;
    state.tiebreaker = { q: tb[0], a: tb[1] };
    applyControls(); renderRounds(); save();
    toast("Sample game loaded — 3 rounds, 30 questions, tiebreaker. Try a PDF!");
  }

  function bindToolbar() {
    $("#btn-sample").addEventListener("click", loadSampleGame);

    $("#btn-export").addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = slug() + ".tgp.json";
      a.click();
      URL.revokeObjectURL(a.href);
      toast("Game file saved — reload it anytime with Open Game File.");
    });

    $("#btn-import").addEventListener("click", () => $("#import-file").click());
    $("#import-file").addEventListener("change", e => {
      const file = e.target.files[0];
      e.target.value = "";
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const obj = JSON.parse(reader.result);
          if (!obj || !Array.isArray(obj.rounds)) throw new Error("not a game file");
          adoptState(obj);
          applyControls(); renderRounds(); save();
          toast("Game loaded: " + (state.game.title || "untitled") + ".");
        } catch (err) {
          toast("That doesn't look like a Trivia Generator Pro game file.");
        }
      };
      reader.readAsText(file);
    });

    $("#btn-reset").addEventListener("click", () => {
      if (!confirm("Reset everything? This clears the whole game (branding too).")) return;
      localStorage.removeItem(STORE_KEY);
      state = DEFAULT_STATE();
      applyControls(); renderRounds(); save();
      toast("Fresh start.");
    });

    /* collapsible settings cards */
    document.querySelectorAll(".card[data-collapse] .card-title").forEach(h => {
      h.addEventListener("click", () => h.parentElement.classList.toggle("closed"));
    });
  }

  /* ---------- init ---------- */

  load();
  applyControls();
  renderRounds();
  bindSettings();
  bindLogo();
  bindRounds();
  bindDownloads();
  bindToolbar();
  bindTiebreakerAI();
  if (window.TGP_AI) TGP_AI.init();
})();
