/* Trivia Generator Pro — AI Question Generator (paid add-on).
   Entirely optional: the free app works fully with this file absent or
   failing to load. Talks only to the Worker in worker.js — never calls
   LemonSqueezy or Anthropic directly, and never holds an API key. */
(() => {
  "use strict";
  const $ = s => document.querySelector(s);
  const KEY_STORE = "tgp_license_v1";

  // Fill in after deploying worker.js and creating the LemonSqueezy product.
  const WORKER_URL = "https://tgp-ai-gateway.dustinramsbottom.workers.dev";
  const CHECKOUT_URL = "https://bingocardgenerator.lemonsqueezy.com/checkout/buy/f5fe010c-30ed-46f6-b157-4466e165d143";

  // License state lives in its own storage key, separate from the game
  // state in app.js — it's account-level, not game-level, so it must
  // survive Reset and must never end up inside an exported .tgp.json file.
  let lic = { key: "", instance_id: "", active: false, status: "", used: null, cap: null, error: "" };

  function loadLicense() {
    try {
      const raw = localStorage.getItem(KEY_STORE);
      if (raw) lic = { ...lic, ...JSON.parse(raw) };
    } catch (e) { /* corrupted — start fresh */ }
  }

  function saveLicense() {
    try {
      localStorage.setItem(KEY_STORE, JSON.stringify({
        key: lic.key, instance_id: lic.instance_id, active: lic.active,
        status: lic.status, used: lic.used, cap: lic.cap
      }));
    } catch (e) { /* ignore */ }
  }

  async function call(action, extra) {
    const res = await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        license_key: lic.key,
        instance_id: lic.instance_id || undefined,
        ...extra
      })
    });
    return res.json();
  }

  async function activate(rawKey) {
    const key = (rawKey || "").trim();
    if (!key) return;
    lic = { key, instance_id: "", active: false, status: "activating", used: null, cap: null, error: "" };
    renderStatus();
    try {
      const data = await call("activate", { instance_name: (navigator.userAgent || "device").slice(0, 60) });
      if (data.valid) {
        lic = { key, instance_id: data.instance_id || "", active: true, status: data.status || "active", used: null, cap: null, error: "" };
        saveLicense();
        await checkStatus();
      } else {
        lic.active = false;
        lic.status = "error";
        lic.error = data.error || "Activation failed.";
        renderStatus();
      }
    } catch (e) {
      lic.active = false;
      lic.status = "error";
      lic.error = "Couldn't reach the license server.";
      renderStatus();
    }
  }

  async function checkStatus() {
    if (!lic.key) { renderStatus(); return; }
    try {
      const data = await call("validate", {});
      lic.active = !!data.valid;
      lic.status = data.status || lic.status;
      if (data.used != null) lic.used = data.used;
      if (data.cap != null) lic.cap = data.cap;
      lic.error = data.valid ? "" : (data.error || "License not valid.");
      saveLicense();
    } catch (e) {
      // Network hiccup — keep last-known state; validate itself fails open
      // server-side too, so this only affects the UI, not generation.
    }
    renderStatus();
  }

  function creditsLeft() {
    if (lic.cap == null || lic.used == null) return null;
    return Math.max(0, lic.cap - lic.used);
  }

  function renderStatus() {
    const box = $("#ai-status");
    if (box) {
      if (!lic.key) {
        box.innerHTML = '<p class="hint">No license yet — the rest of Trivia Generator Pro works fully without one. '
          + '<a href="' + CHECKOUT_URL + '" target="_blank" rel="noopener">Get AI credits →</a></p>';
      } else if (lic.status === "activating") {
        box.innerHTML = '<p class="hint">Activating…</p>';
      } else if (lic.active) {
        const left = creditsLeft();
        const usage = (left != null)
          ? "<b>" + left + "</b> credit" + (left === 1 ? "" : "s") + " remaining"
          : "Active";
        box.innerHTML = '<p class="ai-active">✓ AI Studio active — ' + usage + '</p>';
      } else {
        box.innerHTML = '<p class="ai-error">' + esc(lic.error || "License not active.") + '</p>';
      }
    }
    updateCreditChip();
  }

  // The always-visible top-bar balance. Owns none of the license logic —
  // just reflects `lic` so the credit balance is obvious everywhere.
  function updateCreditChip() {
    const chip = document.getElementById("credit-chip");
    if (!chip) return;
    const amt = document.getElementById("credit-amount");
    const sub = document.getElementById("credit-sub");
    chip.classList.remove("is-loading", "is-cta", "is-low", "is-active");
    if (!lic.key || !lic.active) {
      chip.classList.add("is-cta");
      amt.textContent = "Get AI Credits";
      sub.textContent = "power up your night";
      chip.onclick = () => window.open(CHECKOUT_URL, "_blank", "noopener");
      return;
    }
    chip.classList.add("is-active");
    const left = creditsLeft();
    if (left == null) {
      amt.textContent = "AI Ready";
      sub.textContent = "credits active";
    } else {
      amt.textContent = left + (left === 1 ? " credit" : " credits");
      sub.textContent = "remaining";
      if (left <= 3) chip.classList.add("is-low");
    }
    chip.onclick = null;
  }

  // A little dopamine when credits are spent: the gem pops and the cost
  // floats off the chip, so hitting an AI button feels rewarding.
  function animateSpend(delta) {
    const chip = document.getElementById("credit-chip");
    if (!chip || !(delta > 0)) return;
    chip.classList.add("spent");
    const fly = document.createElement("span");
    fly.className = "credit-fly";
    fly.textContent = "-" + delta;
    chip.appendChild(fly);
    setTimeout(() => { chip.classList.remove("spent"); fly.remove(); }, 950);
  }

  const esc = s => String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  function bindCard() {
    const btn = $("#btn-ai-activate");
    const input = $("#ai-key");
    if (!btn || !input) return;
    btn.addEventListener("click", () => activate(input.value));
    input.addEventListener("keydown", e => { if (e.key === "Enter") activate(input.value); });
  }

  function requireActive() {
    if (!lic.key || !lic.active) {
      throw new Error("Activate an AI license first (see the AI Question Generator panel).");
    }
  }

  function applyUsage(data) {
    const before = lic.used;
    if (data.used != null) lic.used = data.used;
    if (data.cap != null) lic.cap = data.cap;
    renderStatus();
    if (before != null && lic.used != null && lic.used > before) {
      animateSpend(lic.used - before);
    }
  }

  // Returns a Promise<[{question, answer[, choices]}, ...]>; throws with a
  // user-presentable message on any failure (no license, capped out,
  // network error, server error). opts: { mode, format, count, age, difficulty }
  async function generateForRound(topic, opts) {
    requireActive();
    opts = opts || {};
    let data;
    try {
      data = await call("generate", {
        topic, mode: opts.mode, format: opts.format, count: opts.count || 10,
        age: opts.age || "", difficulty: opts.difficulty || ""
      });
    } catch (e) {
      throw new Error("Couldn't reach the AI generator - check your connection and try again.");
    }
    applyUsage(data);
    if (!data.ok) throw new Error(data.error || "Generation failed.");
    return data.questions;
  }

  // Returns a Promise<string[]> of 5 category ideas. seed: drill deeper
  // into a specific idea, or "" for a fresh top-level batch. avoid: round
  // names already in this game, so suggestions stay fresh. age: bias
  // suggestions to a round's audience.
  async function suggestCategories(seed, avoid, age) {
    requireActive();
    let data;
    try {
      data = await call("suggest_categories", { seed: seed || "", avoid: avoid || [], age: age || "" });
    } catch (e) {
      throw new Error("Couldn't reach the AI generator - check your connection and try again.");
    }
    applyUsage(data);
    if (!data.ok) throw new Error(data.error || "Couldn't get suggestions.");
    return data.categories;
  }

  function init() {
    loadLicense();
    bindCard();
    renderStatus();
    if (lic.key) checkStatus();
  }

  window.TGP_AI = { init, generateForRound, suggestCategories };
})();
