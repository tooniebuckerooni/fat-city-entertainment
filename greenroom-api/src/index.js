/**
 * The Green Room — comment layer for Fat City Entertainment.
 *
 * ONE FILE ON PURPOSE. This Worker is deployed by pasting it into the
 * Cloudflare dashboard (same as triv101-api), so it must never grow a second
 * module. If you split it, it stops being deployable by the person who deploys
 * it. See README-greenroom.md.
 *
 * Secrets (dashboard, never in the repo): IP_SALT, ADMIN_TOKEN, TURNSTILE_SECRET
 * Vars (dashboard, editable without re-pasting): ALLOWED_ORIGINS,
 *   TURNSTILE_SITE_KEY, DEV_BYPASS_TURNSTILE
 * Binding: DB -> D1 database "greenroom"
 */

const LIMITS = {
  comment: { max: 5, windowMs: 3600000 },
  vote: { max: 40, windowMs: 3600000 },
  flag: { max: 10, windowMs: 3600000 },
  datapoint: { max: 5, windowMs: 3600000 },
};

const BODY_MAX = 6000;
const HANDLE_MIN = 2;
const HANDLE_MAX = 24;
const MARKET_MAX = 40;
const MIN_DWELL_MS = 8000;
const FLAGS_TO_HIDE = 3;
const READ_CAP = 500; // top-level comments pulled before ranking in JS

// Impersonation blocklist. Compared against the handle with everything that
// isn't a letter or digit stripped out, so "f a t c i t y" and "F.A.T-City"
// both collapse to "fatcity" and get caught.
const HANDLE_BLOCK = [
  "fatcity", "fatcityentertainment", "admin", "administrator",
  "moderator", "mod", "official", "staff", "support", "owner",
];

const now = () => Date.now();

function json(data, status = 200, origin = null) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...cors(origin) },
  });
}

function fail(message, status, origin) {
  // `message` is shown to the person verbatim, so it says what happened and
  // what to do about it. No stack traces, no error codes.
  return json({ message }, status, origin);
}

/* ---------------------------------------------------------------- CORS -- */

function allowedOrigins(env) {
  return String(env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function pickOrigin(request, env) {
  const origin = request.headers.get("Origin");
  if (!origin) return null;
  const list = allowedOrigins(env);
  if (list.includes(origin)) return origin;
  // Origin comparison is exact-string, so "http://localhost:*" can never match.
  // Any localhost/127.0.0.1 port is allowed when the list opts in to it.
  if (list.some((o) => o === "http://localhost:*" || o === "localhost")) {
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return origin;
  }
  return null;
}

function cors(origin) {
  if (!origin) return { vary: "Origin" };
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type,authorization,x-gr-voter",
    "access-control-max-age": "86400",
    vary: "Origin",
  };
}

/* -------------------------------------------------------------- hashing -- */

async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// The raw IP never reaches D1 — only this.
const ipHash = (request, env) =>
  sha256((request.headers.get("CF-Connecting-IP") || "0.0.0.0") + "|" + (env.IP_SALT || ""));

/**
 * Identity for voting and flagging is the BROWSER, not the IP.
 *
 * The original spec hashed IP + thread, which would have made everyone sharing
 * one bar's wifi a single voter — and this audience is specifically people
 * sitting in bars. The browser token comes from localStorage via X-GR-Voter.
 * It is trivially resettable, which is why the IP hash still governs rate
 * limiting: reset the token all you like, the hourly caps don't move.
 */
async function voterHash(request, env) {
  const token = (request.headers.get("X-GR-Voter") || "").trim().slice(0, 80);
  if (token.length >= 8) return sha256("v1|" + token + "|" + (env.IP_SALT || ""));
  return sha256("ip|" + (await ipHash(request, env))); // no token: fall back
}

/* --------------------------------------------------------- rate limiting -- */

async function rateLimit(env, key, action) {
  const cfg = LIMITS[action];
  const k = key + ":" + action;
  const t = now();

  const row = await env.DB.prepare(
    "SELECT count, window_start FROM rate_limits WHERE key = ?"
  ).bind(k).first();

  if (!row || t - row.window_start > cfg.windowMs) {
    await env.DB.prepare(
      "INSERT INTO rate_limits (key, count, window_start) VALUES (?1, 1, ?2) " +
      "ON CONFLICT(key) DO UPDATE SET count = 1, window_start = ?2"
    ).bind(k, t).run();
    return { ok: true };
  }

  if (row.count >= cfg.max) {
    const mins = Math.max(1, Math.ceil((cfg.windowMs - (t - row.window_start)) / 60000));
    return { ok: false, retryMins: mins };
  }

  await env.DB.prepare("UPDATE rate_limits SET count = count + 1 WHERE key = ?")
    .bind(k).run();
  return { ok: true };
}

// The table would grow forever otherwise. Cheap, and only runs on writes.
async function sweepRateLimits(env) {
  if (Math.random() > 0.02) return;
  await env.DB.prepare("DELETE FROM rate_limits WHERE window_start < ?")
    .bind(now() - 7200000).run();
}

/* ------------------------------------------------------------ Turnstile -- */

async function verifyTurnstile(env, token, ip) {
  if (String(env.DEV_BYPASS_TURNSTILE || "") === "1") return true; // local only
  if (!env.TURNSTILE_SECRET) return true; // not configured yet — don't lock people out
  if (!token) return false;
  const body = new FormData();
  body.append("secret", env.TURNSTILE_SECRET);
  body.append("response", token);
  if (ip) body.append("remoteip", ip);
  try {
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST", body,
    });
    const out = await r.json();
    return out.success === true;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------ utilities -- */

const id = () => crypto.randomUUID().replace(/-/g, "").slice(0, 20);

// Normalise newlines and strip control characters, keeping \n and \t.
// Anything broader eats ordinary punctuation out of people's comments.
const CTRL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const clean = (s, max) =>
  String(s == null ? "" : s)
    .replace(/\r\n?/g, "\n")
    .replace(CTRL, "")
    .trim()
    .slice(0, max);

const ROLES = ["host", "operator", "venue", "player"];

function handleBlocked(handle) {
  const flat = handle.toLowerCase().replace(/[^a-z0-9]/g, "");
  return HANDLE_BLOCK.some((b) => flat === b || flat.includes(b));
}

function countUrls(body) {
  const m = body.match(/(https?:\/\/|www\.)[^\s<]+/gi);
  return m ? m.length : 0;
}

function shape(row) {
  return {
    id: row.id, thread: row.thread, parent_id: row.parent_id,
    handle: row.handle, role_tag: row.role_tag, market: row.market,
    body: row.body, votes: row.votes, flags: row.flags,
    status: row.status, created_at: row.created_at,
  };
}

// Hacker News-style decay. Pure vote count freezes week one at the summit
// forever, which kills a board this size before it starts.
const score = (votes, createdAt) =>
  votes / Math.pow((now() - createdAt) / 3600000 + 2, 1.5);

/* ------------------------------------------------------------- handlers -- */

async function getComments(env, url, origin) {
  const thread = clean(url.searchParams.get("thread"), 60);
  if (!thread) return fail("Missing thread.", 400, origin);
  const sort = url.searchParams.get("sort") === "new" ? "new" : "top";
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "25", 10) || 25));
  const offset = Math.max(0, parseInt(url.searchParams.get("cursor") || "0", 10) || 0);

  const parents = await env.DB.prepare(
    "SELECT * FROM comments WHERE thread = ? AND parent_id IS NULL " +
    "AND status IN ('visible','pinned') ORDER BY created_at DESC LIMIT ?"
  ).bind(thread, READ_CAP).all();

  let rows = (parents.results || []).map(shape);

  // Pinned always first, then the chosen sort.
  rows.sort((a, b) => {
    const ap = a.status === "pinned" ? 1 : 0;
    const bp = b.status === "pinned" ? 1 : 0;
    if (ap !== bp) return bp - ap;
    if (sort === "new") return b.created_at - a.created_at;
    return score(b.votes, b.created_at) - score(a.votes, a.created_at);
  });

  const total = rows.length;
  const page = rows.slice(offset, offset + limit);

  // Replies: votes only, no decay, one level. A reply to a reply was already
  // reparented to the top-level comment on the way in.
  if (page.length) {
    const ids = page.map((c) => c.id);
    const marks = ids.map(() => "?").join(",");
    const kids = await env.DB.prepare(
      "SELECT * FROM comments WHERE parent_id IN (" + marks + ") " +
      "AND status IN ('visible','pinned') ORDER BY votes DESC, created_at ASC"
    ).bind(...ids).all();
    const byParent = {};
    for (const k of kids.results || []) (byParent[k.parent_id] ||= []).push(shape(k));
    for (const c of page) c.replies = byParent[c.id] || [];
  }

  const next = offset + limit < total ? String(offset + limit) : null;
  return json({ comments: page, total, cursor: next }, 200, origin);
}

async function postComment(request, env, origin) {
  const b = await request.json().catch(() => null);
  if (!b) return fail("That didn't send properly. Try again.", 400, origin);

  // Honeypot: a filled hidden field means a bot. Return success and drop it,
  // so whatever is doing it never learns it was caught.
  if (clean(b.website, 200)) return json({ ok: true, comment: null, unlock: null }, 200, origin);

  const thread = clean(b.thread, 60);
  const handle = clean(b.handle, HANDLE_MAX);
  const body = clean(b.body, BODY_MAX);
  const market = clean(b.market, MARKET_MAX) || null;
  let role = clean(b.role_tag, 20).toLowerCase();
  if (!ROLES.includes(role)) role = null;

  if (!thread) return fail("Missing thread.", 400, origin);
  if (handle.length < HANDLE_MIN) return fail("Pick a handle — at least 2 characters.", 400, origin);
  if (handleBlocked(handle))
    return fail("That handle is reserved. Pick another one.", 400, origin);
  if (!body) return fail("Write something first.", 400, origin);
  if (String(b.body || "").length > BODY_MAX)
    return fail("That's over the " + BODY_MAX.toLocaleString() + " character limit. Trim it and try again.", 400, origin);

  if (Number(b.dwell || 0) < MIN_DWELL_MS)
    return fail("Give it a moment before posting.", 400, origin);

  const ip = request.headers.get("CF-Connecting-IP") || "";
  if (!(await verifyTurnstile(env, b.turnstile_token, ip)))
    return fail("The spam check didn't pass. Reload the page and try again.", 403, origin);

  const iph = await ipHash(request, env);
  const rl = await rateLimit(env, iph, "comment");
  if (!rl.ok)
    return fail("That's " + LIMITS.comment.max + " comments in an hour — the cap. Try again in " + rl.retryMins + " minutes.", 429, origin);

  // One level of nesting, always. A reply to a reply attaches to the parent.
  let parent = clean(b.parent_id, 40) || null;
  if (parent) {
    const p = await env.DB.prepare("SELECT id, parent_id, thread FROM comments WHERE id = ?")
      .bind(parent).first();
    if (!p || p.thread !== thread) parent = null;
    else if (p.parent_id) parent = p.parent_id;
  }

  // Two or more links is the shape spam takes here. It posts, it just posts
  // hidden, and it shows up in the admin queue.
  const status = countUrls(body) >= 2 ? "hidden" : "visible";

  const cid = id();
  const t = now();
  await env.DB.prepare(
    "INSERT INTO comments (id, thread, parent_id, handle, role_tag, market, body, votes, flags, status, ip_hash, created_at) " +
    "VALUES (?,?,?,?,?,?,?,0,0,?,?,?)"
  ).bind(cid, thread, parent, handle, role, market, body, status, iph, t).run();

  await sweepRateLimits(env);

  // The go-first reward, rotated so a repeat poster gets a different one.
  let unlock = null;
  const pool = await env.DB.prepare("SELECT body FROM unlocks WHERE thread = ? ORDER BY id")
    .bind(thread).all();
  const list = (pool.results || []).map((r) => r.body);
  if (list.length) {
    const seq = Math.max(0, Math.min(999, parseInt(b.seq || 0, 10) || 0));
    unlock = list[seq % list.length];
  }

  const row = await env.DB.prepare("SELECT * FROM comments WHERE id = ?").bind(cid).first();
  return json({ ok: true, comment: shape(row), unlock }, 201, origin);
}

async function voteComment(request, env, cid, origin) {
  const iph = await ipHash(request, env);
  const rl = await rateLimit(env, iph, "vote");
  if (!rl.ok) return fail("That's a lot of voting. Try again in " + rl.retryMins + " minutes.", 429, origin);

  const vh = await voterHash(request, env);
  const t = now();

  const existing = await env.DB.prepare(
    "SELECT 1 AS hit FROM votes WHERE comment_id = ? AND voter_hash = ?"
  ).bind(cid, vh).first();

  if (existing) {
    const c = await env.DB.prepare("SELECT votes FROM comments WHERE id = ?").bind(cid).first();
    if (!c) return fail("That comment is gone.", 404, origin);
    return json({ ok: true, votes: c.votes, already: true }, 200, origin); // idempotent
  }

  const c = await env.DB.prepare("SELECT id FROM comments WHERE id = ?").bind(cid).first();
  if (!c) return fail("That comment is gone.", 404, origin);

  await env.DB.batch([
    env.DB.prepare("INSERT OR IGNORE INTO votes (comment_id, voter_hash, created_at) VALUES (?,?,?)")
      .bind(cid, vh, t),
    env.DB.prepare("UPDATE comments SET votes = votes + 1 WHERE id = ?").bind(cid),
  ]);

  const out = await env.DB.prepare("SELECT votes FROM comments WHERE id = ?").bind(cid).first();
  return json({ ok: true, votes: out.votes }, 200, origin);
}

async function flagComment(request, env, cid, origin) {
  const iph = await ipHash(request, env);
  const rl = await rateLimit(env, iph, "flag");
  if (!rl.ok) return fail("Too many flags for one hour. Try again in " + rl.retryMins + " minutes.", 429, origin);

  const fh = await voterHash(request, env);

  // Deduped, or one person taps flag three times and hides anything they like.
  const dupe = await env.DB.prepare(
    "SELECT 1 AS hit FROM flags WHERE comment_id = ? AND flagger_hash = ?"
  ).bind(cid, fh).first();
  if (dupe) return json({ ok: true, already: true }, 200, origin);

  const c = await env.DB.prepare("SELECT id, flags, status FROM comments WHERE id = ?")
    .bind(cid).first();
  if (!c) return fail("That comment is gone.", 404, origin);

  await env.DB.batch([
    env.DB.prepare("INSERT OR IGNORE INTO flags (comment_id, flagger_hash, created_at) VALUES (?,?,?)")
      .bind(cid, fh, now()),
    env.DB.prepare("UPDATE comments SET flags = flags + 1 WHERE id = ?").bind(cid),
  ]);

  const after = await env.DB.prepare("SELECT flags, status FROM comments WHERE id = ?")
    .bind(cid).first();

  let hidden = after.status === "hidden";
  if (after.flags >= FLAGS_TO_HIDE && after.status === "visible") {
    await env.DB.prepare("UPDATE comments SET status = 'hidden' WHERE id = ?").bind(cid).run();
    hidden = true;
  }
  return json({ ok: true, flags: after.flags, hidden }, 200, origin);
}

/* ---------------------------------------------------------- the Index -- */

async function postDatapoint(request, env, origin) {
  const b = await request.json().catch(() => null);
  if (!b) return fail("That didn't send properly. Try again.", 400, origin);

  const thread = clean(b.thread, 60);
  const kind = clean(b.kind, 12);
  if (!thread) return fail("Missing thread.", 400, origin);
  if (!["number", "category", "item"].includes(kind))
    return fail("Unknown kind.", 400, origin);

  const iph = await ipHash(request, env);
  const rl = await rateLimit(env, iph, "datapoint");
  if (!rl.ok) return fail("Try again in " + rl.retryMins + " minutes.", 429, origin);

  let num = null, text = null;
  if (kind === "number") {
    num = Number(b.num_value);
    if (!isFinite(num) || num <= 0) return fail("That doesn't look like a number.", 400, origin);
    // A sanity ceiling, not a judgement. Junk still gets hidden in /admin.
    if (num > 100000) return fail("That's outside the range we can use.", 400, origin);
  } else {
    text = clean(b.text_value, 120);
    if (!text) return fail("Pick one first.", 400, origin);
  }

  await env.DB.prepare(
    "INSERT INTO datapoints (id, thread, comment_id, kind, num_value, text_value, unit, meta, market, status, created_at) " +
    "VALUES (?,?,?,?,?,?,?,?,?,'visible',?)"
  ).bind(
    id(), thread, clean(b.comment_id, 40) || null, kind, num, text,
    clean(b.unit, 40) || null, clean(b.meta, 40) || null,
    clean(b.market, MARKET_MAX) || null, now()
  ).run();

  return json({ ok: true }, 201, origin);
}

async function getIndex(env, url, origin) {
  const thread = clean(url.searchParams.get("thread"), 60);
  if (!thread) return fail("Missing thread.", 400, origin);

  const rows = (await env.DB.prepare(
    "SELECT kind, num_value, text_value, meta, market FROM datapoints " +
    "WHERE thread = ? AND status = 'visible'"
  ).bind(thread).all()).results || [];

  if (!rows.length) return json({ thread, n: 0 }, 200, origin);

  const kind = rows[0].kind;

  if (kind === "number") {
    const nums = rows.map((r) => r.num_value).filter((n) => isFinite(n)).sort((a, b) => a - b);
    const at = (p) => nums[Math.min(nums.length - 1, Math.floor(nums.length * p))];
    const markets = {};
    for (const r of rows) {
      if (!r.market) continue;
      (markets[r.market] ||= []).push(r.num_value);
    }
    // Published as reported: distribution and n. Never a recommended number —
    // individuals disclosing is transparency, an operator publishing a
    // suggested rate is a different thing entirely.
    return json({
      thread, kind, n: nums.length,
      median: at(0.5), p25: at(0.25), p75: at(0.75),
      min: nums[0], max: nums[nums.length - 1],
      by_market: Object.entries(markets)
        .filter(([, v]) => v.length >= 3) // no market reported from one person
        .map(([m, v]) => {
          const s = v.slice().sort((a, b) => a - b);
          return { market: m, n: s.length, median: s[Math.floor(s.length / 2)] };
        })
        .sort((a, b) => b.n - a.n),
    }, 200, origin);
  }

  const tally = {};
  for (const r of rows) if (r.text_value) tally[r.text_value] = (tally[r.text_value] || 0) + 1;
  const items = Object.entries(tally)
    .map(([label, n]) => ({ label, n, pct: Math.round((n / rows.length) * 1000) / 10 }))
    .sort((a, b) => b.n - a.n);
  return json({ thread, kind, n: rows.length, items }, 200, origin);
}

/* ---------------------------------------------------------------- admin -- */

const authed = (request, env) => {
  const h = request.headers.get("Authorization") || "";
  const tok = h.startsWith("Bearer ") ? h.slice(7).trim() : "";
  return Boolean(env.ADMIN_TOKEN) && tok === env.ADMIN_TOKEN;
};

async function adminQueue(env, origin) {
  const q = (sql, ...args) => env.DB.prepare(sql).bind(...args).all();
  const [flagged, hidden, recent] = await Promise.all([
    q("SELECT * FROM comments WHERE flags > 0 ORDER BY flags DESC, created_at DESC LIMIT 100"),
    q("SELECT * FROM comments WHERE status = 'hidden' ORDER BY created_at DESC LIMIT 100"),
    q("SELECT * FROM comments ORDER BY created_at DESC LIMIT 50"),
  ]);
  return json({
    flagged: (flagged.results || []).map(shape),
    hidden: (hidden.results || []).map(shape),
    recent: (recent.results || []).map(shape),
  }, 200, origin);
}

async function adminComment(request, env, cid, origin) {
  const b = await request.json().catch(() => ({}));
  const action = clean(b.action, 20);
  const map = { hide: "hidden", restore: "visible", pin: "pinned", unpin: "visible" };

  if (action === "delete") {
    await env.DB.batch([
      env.DB.prepare("DELETE FROM comments WHERE id = ? OR parent_id = ?").bind(cid, cid),
      env.DB.prepare("DELETE FROM votes WHERE comment_id = ?").bind(cid),
      env.DB.prepare("DELETE FROM flags WHERE comment_id = ?").bind(cid),
    ]);
    return json({ ok: true, deleted: true }, 200, origin);
  }

  if (!map[action]) return fail("Unknown action.", 400, origin);

  // Restoring clears the flags, otherwise the next single flag re-hides it.
  const sql = action === "restore"
    ? "UPDATE comments SET status = ?, flags = 0 WHERE id = ?"
    : "UPDATE comments SET status = ? WHERE id = ?";
  await env.DB.prepare(sql).bind(map[action], cid).run();

  const row = await env.DB.prepare("SELECT * FROM comments WHERE id = ?").bind(cid).first();
  if (!row) return fail("That comment is gone.", 404, origin);
  return json({ ok: true, comment: shape(row) }, 200, origin);
}

async function adminDatapoints(env, url, origin) {
  const thread = clean(url.searchParams.get("thread"), 60);
  const rows = thread
    ? await env.DB.prepare("SELECT * FROM datapoints WHERE thread = ? ORDER BY created_at DESC LIMIT 200").bind(thread).all()
    : await env.DB.prepare("SELECT * FROM datapoints ORDER BY created_at DESC LIMIT 200").all();
  return json({ datapoints: rows.results || [] }, 200, origin);
}

async function adminDatapoint(request, env, did, origin) {
  const b = await request.json().catch(() => ({}));
  const action = clean(b.action, 20);
  if (action === "delete") {
    await env.DB.prepare("DELETE FROM datapoints WHERE id = ?").bind(did).run();
    return json({ ok: true }, 200, origin);
  }
  const map = { hide: "hidden", restore: "visible" };
  if (!map[action]) return fail("Unknown action.", 400, origin);
  await env.DB.prepare("UPDATE datapoints SET status = ? WHERE id = ?").bind(map[action], did).run();
  return json({ ok: true }, 200, origin);
}

/* ---------------------------------------------------------------- router -- */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";
    const method = request.method;
    const origin = pickOrigin(request, env);

    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors(origin) });
    }

    // Browsers only enforce CORS on the response, but a write with no allowed
    // origin is either misconfiguration or someone else's page. Refuse it.
    if (method === "POST" && request.headers.get("Origin") && !origin) {
      return fail("This site isn't allowed to post here.", 403, null);
    }

    try {
      if (path === "/" || path === "/health") {
        return json({ ok: true, service: "greenroom" }, 200, origin);
      }

      // Public config for the widget: the Turnstile site key is public by design.
      if (method === "GET" && path === "/api/config") {
        return json({ turnstile_site_key: env.TURNSTILE_SITE_KEY || null }, 200, origin);
      }

      if (method === "GET" && path === "/api/comments") return getComments(env, url, origin);
      if (method === "POST" && path === "/api/comments") return postComment(request, env, origin);
      if (method === "GET" && path === "/api/index") return getIndex(env, url, origin);
      if (method === "POST" && path === "/api/datapoints") return postDatapoint(request, env, origin);

      let m = path.match(/^\/api\/comments\/([A-Za-z0-9_-]{1,40})\/(vote|flag)$/);
      if (m && method === "POST") {
        return m[2] === "vote"
          ? voteComment(request, env, m[1], origin)
          : flagComment(request, env, m[1], origin);
      }

      if (path.startsWith("/api/admin/")) {
        if (!authed(request, env)) return fail("Not authorised.", 401, origin);
        if (method === "GET" && path === "/api/admin/queue") return adminQueue(env, origin);
        if (method === "GET" && path === "/api/admin/datapoints") return adminDatapoints(env, url, origin);
        m = path.match(/^\/api\/admin\/comments\/([A-Za-z0-9_-]{1,40})$/);
        if (m && method === "POST") return adminComment(request, env, m[1], origin);
        m = path.match(/^\/api\/admin\/datapoints\/([A-Za-z0-9_-]{1,40})$/);
        if (m && method === "POST") return adminDatapoint(request, env, m[1], origin);
      }

      return fail("No such endpoint.", 404, origin);
    } catch (err) {
      console.error("greenroom", err && err.stack ? err.stack : err);
      return fail("Something broke on our end. Try again in a minute.", 500, origin);
    }
  },
};
