/*
 * TRIV101 survey backend — Cloudflare Worker (D1 + optional Ably)
 * ------------------------------------------------------------------
 * Routes:
 *   GET  /                 server-rendered survey stream (SEO-friendly)
 *   GET  /api/feed         surveying prompts (+ answers, comments) as JSON
 *   POST /api/answer       { prompt_id, text }         add/boost an answer
 *   POST /api/vote         { answer_id }               one vote per anon voter
 *   POST /api/comment      { prompt_id, name?, text }  visible immediately
 *   POST /api/suggest      { text }                    -> pending prompt
 *   GET  /api/game-bank     confirmed prompts' top 3 (the game loads this)
 *   GET  /api/ably-token    short-lived Ably token (if ABLY_API_KEY set)
 *   GET  /admin            moderation queue (basic auth)
 *   POST /admin/approve|reject|confirm|hide  moderation actions (basic auth)
 *
 * Moderation model: suggested prompts stay hidden until approved; answers and
 * comments are visible immediately and moderated by hiding. A prompt whose
 * votes reach QUOTA can be confirmed, snapshotting its top 3 into the game.
 */

const enc = (s) => String(s == null ? "" : s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
const uid = () => "id" + crypto.randomUUID().replace(/-/g, "").slice(0, 12);
const norm = (s) => String(s).trim().toLowerCase().replace(/\s+/g, " ");
const now = () => Date.now();

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    status: init.status || 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "cache-control": "no-store",
      ...(init.headers || {})
    }
  });
}
function bad(msg, status = 400) { return json({ error: msg }, { status }); }

function getVoter(request, setCookies) {
  const cookie = request.headers.get("cookie") || "";
  const m = cookie.match(/(?:^|;\s*)t101v=([^;]+)/);
  if (m) return m[1];
  const id = uid();
  setCookies.push(`t101v=${id}; Path=/; Max-Age=31536000; SameSite=Lax`);
  return id;
}

async function readBody(request) {
  try {
    const ct = request.headers.get("content-type") || "";
    if (ct.includes("application/json")) return await request.json();
    const fd = await request.formData();
    return Object.fromEntries(fd.entries());
  } catch (e) { return {}; }
}

// ---- Ably (optional) -------------------------------------------------------
async function ablyPublish(env, channel, name, data) {
  if (!env.ABLY_API_KEY) return;
  try {
    await fetch(`https://rest.ably.io/channels/${encodeURIComponent(channel)}/messages`, {
      method: "POST",
      headers: {
        "authorization": "Basic " + btoa(env.ABLY_API_KEY),
        "content-type": "application/json"
      },
      body: JSON.stringify({ name, data })
    });
  } catch (e) { /* realtime is best-effort */ }
}

// ---- Data helpers ----------------------------------------------------------
async function promptWithChildren(env, p) {
  const answers = (await env.DB.prepare(
    "SELECT id,text,votes FROM answers WHERE prompt_id=? AND status='visible' ORDER BY votes DESC, created_at ASC"
  ).bind(p.id).all()).results || [];
  const comments = (await env.DB.prepare(
    "SELECT id,name,text,created_at FROM comments WHERE prompt_id=? AND status='visible' ORDER BY created_at ASC"
  ).bind(p.id).all()).results || [];
  const total = answers.reduce((n, a) => n + a.votes, 0);
  return { id: p.id, q: p.text, status: p.status, total, answers, comments };
}

async function feed(env) {
  const rows = (await env.DB.prepare(
    "SELECT id,text,status FROM prompts WHERE status='surveying' ORDER BY created_at DESC LIMIT 200"
  ).all()).results || [];
  const out = [];
  for (const p of rows) out.push(await promptWithChildren(env, p));
  const quota = parseInt(env.QUOTA || "100", 10);
  return { quota, prompts: out.filter((p) => p.total < quota) };
}

// ---- Admin (basic auth) ----------------------------------------------------
function checkAdmin(request, env) {
  const h = request.headers.get("authorization") || "";
  if (!h.startsWith("Basic ")) return false;
  let user = "", pass = "";
  try { [user, pass] = atob(h.slice(6)).split(":"); } catch (e) { return false; }
  return user === (env.ADMIN_USER || "admin") && pass && pass === env.ADMIN_PASS;
}
function authChallenge() {
  return new Response("Auth required", { status: 401, headers: { "www-authenticate": 'Basic realm="triv101-admin"' } });
}

// ---- HTML (server-rendered stream) ----------------------------------------
function page(data) {
  const quota = data.quota;
  const cards = data.prompts.map((p) => {
    const pct = Math.min(100, Math.round((p.total / quota) * 100));
    const answers = p.answers.map((a, i) =>
      `<li${i < 3 ? ' class="top"' : ""}><button class="up" data-vote="${a.id}">▲</button>` +
      `<span class="atext">${enc(a.text)}</span><span class="av">${a.votes}</span></li>`).join("");
    const comments = p.comments.map((c) =>
      `<li><b>${enc(c.name || "Guest")}</b><p>${enc(c.text)}</p></li>`).join("");
    return `<div class="card" data-q="${p.id}">
      <div class="q">${enc(p.q)}</div>
      <div class="quota"><div class="bar"><span style="width:${pct}%"></span></div><span class="qn">${p.total} / ${quota} votes</span></div>
      <ul class="answers">${answers}</ul>
      <div class="row"><input class="ans" placeholder="Add an answer..."><button class="btn" data-answer>Add</button></div>
      <details class="comments"${p.comments.length ? " open" : ""}><summary>${p.comments.length} comment${p.comments.length === 1 ? "" : "s"}</summary>
        <ul>${comments}</ul>
        <div class="row"><input class="cname" placeholder="Name (optional)"><input class="ctext" placeholder="Add a comment..."><button class="btn" data-comment>Post</button></div>
      </details>
    </div>`;
  }).join("");

  return `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Community Surveys — Triv 101 | Fat City Entertainment</title>
<meta name="description" content="Vote on answers to Triv 101 survey questions, add your own, and comment. The most popular answers become the game's answers.">
<link rel="canonical" href="https://www.fatcityentertainment.com/triv101/surveys.html">
<style>
:root{--stage:#0b0e1f;--stage-2:#131834;--ink:#f4f2ff;--dim:#9aa0c3;--hot:#ff4d6d;--amber:#ffb703;--gold:#e6b800;--line:rgba(255,255,255,.09)}
*{box-sizing:border-box;margin:0;padding:0}body{font-family:'PT Serif',Georgia,serif;background:var(--stage);color:var(--ink);line-height:1.5}
a{color:var(--amber)}.wrap{max-width:820px;margin:0 auto;padding:0 20px}
header.top{padding:40px 20px 20px;text-align:center}header.top h1{font-size:clamp(1.8rem,5vw,2.6rem)}
header.top .n{background:linear-gradient(120deg,var(--amber),var(--hot));-webkit-background-clip:text;background-clip:text;color:transparent}
header.top p{color:var(--dim);max-width:620px;margin:10px auto 0}
.card{background:var(--stage-2);border:1px solid var(--line);border-radius:14px;padding:18px;margin:0 0 18px}
.q{font-size:1.25rem;margin-bottom:12px}.quota{display:flex;align-items:center;gap:10px;margin-bottom:12px}
.bar{flex:1;height:8px;background:rgba(255,255,255,.08);border-radius:999px;overflow:hidden}
.bar span{display:block;height:100%;background:linear-gradient(90deg,var(--amber),var(--hot))}
.qn{color:var(--dim);font-size:.85rem;white-space:nowrap}
ul.answers{list-style:none;margin:0 0 12px}ul.answers li{display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--line)}
ul.answers li.top .atext{font-weight:bold}.atext{flex:1}.av{color:var(--dim);min-width:28px;text-align:right}
.up{background:rgba(255,183,3,.12);border:1px solid rgba(255,183,3,.4);color:var(--amber);border-radius:8px;width:34px;height:30px;cursor:pointer}
.row{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
.row input{flex:1 1 160px;padding:9px 12px;border-radius:8px;border:1px solid var(--line);background:rgba(255,255,255,.06);color:var(--ink);font-family:inherit}
.row input::placeholder{color:var(--dim)}
.btn{padding:9px 16px;border:none;border-radius:8px;cursor:pointer;font-family:inherit;background:#46c93a;color:#08210a;font-weight:bold}
details.comments{margin-top:12px;border-top:1px solid var(--line);padding-top:10px}
details.comments summary{cursor:pointer;color:var(--dim);font-size:.9rem}details.comments ul{list-style:none;margin:10px 0}
details.comments li{padding:8px 0;border-bottom:1px solid var(--line)}details.comments li p{margin-top:2px}
footer{border-top:1px solid var(--line);padding:24px;text-align:center;color:var(--dim);font-size:.88rem}
</style></head><body>
<header class="top"><div class="wrap">
  <h1>Triv <span class="n">101</span> — Community Surveys</h1>
  <p>Vote on the answers, add your own, and jump into the comments. The most popular answers become the answers we all play with.</p>
  <p style="margin-top:12px"><a href="/triv101/">← Back to the game</a></p>
</div></header>
<main class="wrap" id="stream">${cards || '<p style="color:#9aa0c3">No open surveys right now — check back soon.</p>'}</main>
<footer>Triv 101 is made by <a href="https://www.fatcityentertainment.com/">Fat City Entertainment</a>. Answers and comments are moderated.</footer>
<script>
const post=(u,b)=>fetch(u,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(b)}).then(r=>r.json());
document.addEventListener('click',async e=>{
  const card=e.target.closest('[data-q]'); if(!card)return; const id=card.dataset.q;
  if(e.target.matches('[data-vote]')){await post('/api/vote',{answer_id:e.target.dataset.vote});location.reload();}
  if(e.target.matches('[data-answer]')){await post('/api/answer',{prompt_id:id,text:card.querySelector('.ans').value});location.reload();}
  if(e.target.matches('[data-comment]')){await post('/api/comment',{prompt_id:id,name:card.querySelector('.cname').value,text:card.querySelector('.ctext').value});location.reload();}
});
</script>
</body></html>`;
}

function adminPage(rows) {
  const sec = (title, items) => `<h2>${title} (${items.length})</h2>` + (items.map(i => i).join("") || "<p>None.</p>");
  return `<!DOCTYPE html><meta charset="utf-8"><title>Triv 101 — Moderation</title>
<style>body{font-family:system-ui,Arial,sans-serif;max-width:820px;margin:24px auto;padding:0 16px}
.item{border:1px solid #ddd;border-radius:8px;padding:10px 12px;margin:8px 0}form{display:inline}
button{margin-left:6px;padding:5px 10px;border-radius:6px;border:1px solid #ccc;cursor:pointer}
.p{color:#666;font-size:13px}</style>
<h1>Triv 101 — Moderation</h1>
${sec("Suggested questions (pending)", rows.suggested)}
${sec("Prompts ready to confirm (hit quota)", rows.ready)}
${sec("Recent comments", rows.comments)}
${sec("Recent answers", rows.answers)}`;
}
const act = (action, id, label) =>
  `<form method="POST" action="/admin/${action}"><input type="hidden" name="id" value="${id}"><button>${label}</button></form>`;

// ---- Router ----------------------------------------------------------------
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const setCookies = [];

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET,POST,OPTIONS",
        "access-control-allow-headers": "content-type"
      }});
    }

    try {
      // ---- public reads
      if (request.method === "GET" && (path === "/" || path === "/surveys")) {
        const data = await feed(env);
        return new Response(page(data), { headers: { "content-type": "text/html; charset=utf-8" } });
      }
      if (request.method === "GET" && path === "/api/feed") {
        return json(await feed(env));
      }
      if (request.method === "GET" && path === "/api/game-bank") {
        const rows = (await env.DB.prepare(
          "SELECT p.text q, p.id FROM prompts p WHERE p.status='confirmed'"
        ).all()).results || [];
        const out = [];
        for (const p of rows) {
          const top = (await env.DB.prepare(
            "SELECT text FROM answers WHERE prompt_id=? AND status='visible' ORDER BY votes DESC LIMIT 3"
          ).bind(p.id).all()).results || [];
          if (top.length === 3) out.push({ question: p.q, answers: top.map((a) => a.text) });
        }
        return json({ questions: out });
      }
      if (request.method === "GET" && path === "/api/ably-token") {
        if (!env.ABLY_API_KEY) return json({ configured: false });
        const keyName = env.ABLY_API_KEY.split(":")[0];
        // Delegate token creation to Ably REST using the key.
        const res = await fetch(`https://rest.ably.io/keys/${keyName}/requestToken`, {
          method: "POST",
          headers: { "authorization": "Basic " + btoa(env.ABLY_API_KEY), "content-type": "application/json" },
          body: JSON.stringify({ capability: JSON.stringify({ "triv101:*": ["subscribe"] }), ttl: 3600000 })
        });
        return json(await res.json());
      }

      // ---- public writes
      if (request.method === "POST" && path === "/api/vote") {
        const b = await readBody(request);
        if (!b.answer_id) return bad("answer_id required");
        const voter = getVoter(request, setCookies);
        const a = await env.DB.prepare("SELECT prompt_id FROM answers WHERE id=?").bind(b.answer_id).first();
        if (!a) return bad("no such answer", 404);
        // one vote per voter per answer
        const r = await env.DB.prepare(
          "INSERT OR IGNORE INTO votes (id,answer_id,voter,created_at) VALUES (?,?,?,?)"
        ).bind(uid(), b.answer_id, voter, now()).run();
        if (r.meta && r.meta.changes) {
          await env.DB.prepare("UPDATE answers SET votes=votes+1 WHERE id=?").bind(b.answer_id).run();
          await ablyPublish(env, "triv101:prompt:" + a.prompt_id, "vote", { answer_id: b.answer_id });
        }
        return json({ ok: true }, { headers: setCookies.length ? { "set-cookie": setCookies[0] } : {} });
      }
      if (request.method === "POST" && path === "/api/answer") {
        const b = await readBody(request);
        const text = (b.text || "").trim();
        if (!b.prompt_id || !text) return bad("prompt_id and text required");
        if (text.length > 80) return bad("answer too long");
        const p = await env.DB.prepare("SELECT id FROM prompts WHERE id=? AND status='surveying'").bind(b.prompt_id).first();
        if (!p) return bad("prompt not open", 404);
        const n = norm(text);
        const existing = await env.DB.prepare("SELECT id FROM answers WHERE prompt_id=? AND norm=?").bind(b.prompt_id, n).first();
        if (existing) {
          await env.DB.prepare("UPDATE answers SET votes=votes+1 WHERE id=?").bind(existing.id).run();
        } else {
          await env.DB.prepare(
            "INSERT INTO answers (id,prompt_id,text,norm,votes,status,created_at) VALUES (?,?,?,?,?, 'visible', ?)"
          ).bind(uid(), b.prompt_id, text, n, 1, now()).run();
        }
        await ablyPublish(env, "triv101:prompt:" + b.prompt_id, "answer", { text });
        return json({ ok: true });
      }
      if (request.method === "POST" && path === "/api/comment") {
        const b = await readBody(request);
        const text = (b.text || "").trim();
        if (!b.prompt_id || !text) return bad("prompt_id and text required");
        if (text.length > 500) return bad("comment too long");
        await env.DB.prepare(
          "INSERT INTO comments (id,prompt_id,name,text,status,created_at) VALUES (?,?,?,?, 'visible', ?)"
        ).bind(uid(), b.prompt_id, (b.name || "").trim().slice(0, 40) || "Guest", text, now()).run();
        await ablyPublish(env, "triv101:prompt:" + b.prompt_id, "comment", {});
        return json({ ok: true });
      }
      if (request.method === "POST" && path === "/api/suggest") {
        const b = await readBody(request);
        const text = (b.text || "").trim();
        if (!text) return bad("text required");
        if (text.length > 140) return bad("too long");
        await env.DB.prepare(
          "INSERT INTO prompts (id,text,source,status,created_at) VALUES (?,?, 'suggested','suggested', ?)"
        ).bind(uid(), text, now()).run();
        return json({ ok: true, pending: true });
      }

      // ---- admin
      if (path === "/admin" || path.startsWith("/admin/")) {
        if (!checkAdmin(request, env)) return authChallenge();
        if (request.method === "GET" && path === "/admin") {
          const suggested = (await env.DB.prepare("SELECT id,text FROM prompts WHERE status='suggested' ORDER BY created_at DESC").all()).results || [];
          const quota = parseInt(env.QUOTA || "100", 10);
          const surveying = (await env.DB.prepare("SELECT id,text FROM prompts WHERE status='surveying'").all()).results || [];
          const ready = [];
          for (const p of surveying) {
            const t = await env.DB.prepare("SELECT COALESCE(SUM(votes),0) v FROM answers WHERE prompt_id=? AND status='visible'").bind(p.id).first();
            if ((t.v || 0) >= quota) ready.push(p);
          }
          const comments = (await env.DB.prepare("SELECT id,name,text FROM comments WHERE status='visible' ORDER BY created_at DESC LIMIT 30").all()).results || [];
          const answers = (await env.DB.prepare("SELECT id,text,votes FROM answers WHERE status='visible' ORDER BY created_at DESC LIMIT 30").all()).results || [];
          return new Response(adminPage({
            suggested: suggested.map((p) => `<div class="item">${enc(p.text)} ${act("approve", p.id, "Approve")} ${act("reject", p.id, "Reject")}</div>`),
            ready: ready.map((p) => `<div class="item">${enc(p.text)} ${act("confirm", p.id, "Confirm top 3 → game")}</div>`),
            comments: comments.map((c) => `<div class="item"><b>${enc(c.name)}:</b> ${enc(c.text)} <span class="p">${act("hide-comment", c.id, "Hide")}</span></div>`),
            answers: answers.map((a) => `<div class="item">${enc(a.text)} <span class="p">(${a.votes}) ${act("hide-answer", a.id, "Hide")}</span></div>`)
          }), { headers: { "content-type": "text/html; charset=utf-8" } });
        }
        if (request.method === "POST") {
          const b = await readBody(request);
          const id = b.id;
          if (!id) return bad("id required");
          if (path === "/admin/approve") await env.DB.prepare("UPDATE prompts SET status='surveying' WHERE id=?").bind(id).run();
          else if (path === "/admin/reject") await env.DB.prepare("UPDATE prompts SET status='rejected' WHERE id=?").bind(id).run();
          else if (path === "/admin/confirm") await env.DB.prepare("UPDATE prompts SET status='confirmed', confirmed_at=? WHERE id=?").bind(now(), id).run();
          else if (path === "/admin/hide-comment") await env.DB.prepare("UPDATE comments SET status='hidden' WHERE id=?").bind(id).run();
          else if (path === "/admin/hide-answer") await env.DB.prepare("UPDATE answers SET status='hidden' WHERE id=?").bind(id).run();
          else return bad("unknown action", 404);
          return new Response(null, { status: 303, headers: { "location": "/admin" } });
        }
      }

      return new Response("Not found", { status: 404 });
    } catch (err) {
      return json({ error: String(err && err.message || err) }, { status: 500 });
    }
  }
};
