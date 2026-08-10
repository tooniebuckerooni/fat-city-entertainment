// ================================================================
// Trivia Generator Pro — AI Question Generator: License + Usage Gateway
// Deploy to Cloudflare Workers (free tier)
//
// SETUP:
// 1. Worker named "tgp-ai-gateway" in Cloudflare dashboard (same account
//    used for bcg-license-verify, if reusing the bingo card generator's).
// 2. Create a Workers KV namespace (e.g. "TGP_USAGE") and bind it to this
//    Worker as USAGE_KV (Settings -> Bindings -> KV Namespace).
// 3. Settings -> Variables and Secrets -> add:
//      Name: LS_API_KEY          Value: your LemonSqueezy API key
//      Name: ANTHROPIC_API_KEY   Value: your Anthropic API key
// 4. In LemonSqueezy: create a ONE-TIME product with License Keys ENABLED,
//    and put the credit count in its NAME, e.g. "Trivia Show Maker - 50 AI
//    Credits". The Worker reads that number as the pack size — no variant ID
//    to configure. New pack sizes are just new products named "... 200 AI
//    Credits", etc. (TIER_CAPS below is an optional override.)
// 5. Add your production origin(s) to ALLOWED_ORIGINS below.
// 6. Deploy.
//
// Credit economy: every AI action spends "credits" (the product's usage
// unit, unrelated to LLM/API tokens) from the license's credit balance.
//   - suggest_categories: 1 credit for a batch of 5 category ideas.
//   - generate: 2 credits for a batch of up to 10 Q&A pairs.
//   - generate_tiebreaker: 1 credit for a single numeric-answer question.
// Credits come from a one-time pack (size set by TIER_CAPS) and PERSIST until
// spent — they never reset. Buying another pack issues a new license key with
// its own fresh balance, so a host tops up by activating the new key.
//
// Design notes (mirrors the licensing pattern proven in the bingo card
// generator's worker.js, adapted for metered usage instead of export
// gating):
//   - activate / validate fail OPEN on transport errors, so a Cloudflare
//     or LemonSqueezy outage doesn't lock a paying host out of the app.
//   - generate / suggest_categories fail CLOSED, always. They're the only
//     actions with real variable API cost, so any doubt (bad license,
//     unreachable LS API, unreadable KV) refuses the call rather than
//     defaulting to "allow."
//   - Never hardcode a bypass/dev license code here. The bingo project
//     shipped one and had to find and remove it later — don't repeat it.
// ================================================================

const ALLOWED_ORIGINS = [
  'https://www.fatcityentertainment.com', // primary home — Trivia Show Maker
  'https://fatcityentertainment.com',
  'https://tooniebuckerooni.github.io', // GitHub Pages demo copy
];

// Credits per pack are normally read straight from the LemonSqueezy product
// name — a product called "... 50 AI Credits" grants 50 — so you don't need
// to configure anything here, and new pack sizes need no code change (just
// name them "... 200 AI Credits", etc.). TIER_CAPS is an OPTIONAL override:
// map a numeric variant_id to a credit count to force a specific amount
// regardless of the name. Leave it empty to rely on the product name.
const TIER_CAPS = {
  // '123456': 50,
};

const MODEL = 'claude-haiku-4-5-20251001';
const MAX_QUESTIONS_PER_CALL = 10;
const GENERATE_COST = 2;
const SUGGEST_COST = 1;
const TIEBREAKER_COST = 1;

function getAllowedOrigin(request) {
  const origin = request.headers.get('Origin') || '';
  return ALLOWED_ORIGINS.find(o => origin.startsWith(o)) || ALLOWED_ORIGINS[0];
}

// One persistent balance per license key (per pack). No date component, so
// credits accumulate for the life of the pack and never reset.
function balanceKey(licenseKey) {
  return 'credits:' + licenseKey;
}

// How many credits a license grants. Prefer an explicit TIER_CAPS entry
// (keyed by numeric variant_id); otherwise read the first number out of the
// LemonSqueezy variant/product name (e.g. "200 AI Credits" -> 200). Both
// fields are set by the store owner and returned by LemonSqueezy, so a buyer
// can't forge them. Returns null if no credit amount can be determined
// (the caller then fails closed).
function creditsForLicense(meta) {
  if (!meta) return null;
  const variantId = String(meta.variant_id ?? '');
  if (TIER_CAPS[variantId]) return TIER_CAPS[variantId];
  // Read the first number out of the product name, then the variant name.
  // Single-variant products often report variant_name as "Default", so the
  // product name — which carries the "50 AI Credits" title — is checked first.
  const firstNum = (s) => {
    const m = String(s || '').match(/\d[\d,]*/);
    if (!m) return null;
    const n = parseInt(m[0].replace(/,/g, ''), 10);
    return n > 0 ? n : null;
  };
  return firstNum(meta.product_name) ?? firstNum(meta.variant_name);
}

// Shared fail-closed gate for both metered actions: confirms the license
// is active with LemonSqueezy, resolves its credit pack size from TIER_CAPS,
// and checks there's enough left. Does NOT spend the credits - call
// commitUsage() only after the AI call actually succeeds, so a failed
// generation never costs the host anything.
async function checkLicenseAndReserve(env, license_key, instance_id, cost) {
  const lsRes = await fetch('https://api.lemonsqueezy.com/v1/licenses/validate', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.LS_API_KEY}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ license_key, instance_id: instance_id || undefined }),
  });
  const lsData = await lsRes.json();
  const isActive = lsData.valid === true && lsData.license_key?.status === 'active';
  if (!isActive) return { ok: false, error: 'License not active.' };

  const cap = creditsForLicense(lsData.meta);
  if (!cap) return { ok: false, error: "This license key isn't a valid AI credit pack." };

  if (!env.USAGE_KV) return { ok: false, error: 'Credit tracking is not configured on the server.' };

  const key = balanceKey(license_key);
  const used = parseInt((await env.USAGE_KV.get(key)) || '0', 10);
  if (used + cost > cap) {
    return {
      ok: false,
      error: 'Out of credits (' + Math.max(cap - used, 0) + ' of ' + cap + ' left). Buy another credit pack to keep generating.',
      used, cap,
    };
  }
  return { ok: true, key, used, cap };
}

async function commitUsage(env, key, used, cost) {
  const newUsed = used + cost;
  // No TTL — a pack's credits persist until spent.
  await env.USAGE_KV.put(key, String(newUsed));
  return newUsed;
}

export default {
  async fetch(request, env) {

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': getAllowedOrigin(request),
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        }
      });
    }

    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': getAllowedOrigin(request),
    };

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ valid: false, error: 'Method not allowed' }), { status: 405, headers });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ valid: false, error: 'Invalid request body' }), { status: 400, headers });
    }

    const { license_key, instance_id, action } = body;

    if (!license_key) {
      return new Response(JSON.stringify({ valid: false, error: 'No license key provided' }), { status: 400, headers });
    }

    // --- GENERATE (fail CLOSED: real API cost) ---
    // Handled before the shared try/catch below so a license-check error
    // can never fall into the fail-open path further down. Any doubt here
    // means no generation, full stop.
    if (action === 'generate') {
      try {
        const gate = await checkLicenseAndReserve(env, license_key, instance_id, GENERATE_COST);
        if (!gate.ok) {
          return new Response(JSON.stringify({ ok: false, error: gate.error, used: gate.used, cap: gate.cap }), { headers });
        }
        if (!env.ANTHROPIC_API_KEY) {
          return new Response(JSON.stringify({ ok: false, error: 'AI generation is not configured on the server.' }), { headers });
        }

        const mode = ['topic', 'mixed', 'lightning', 'list', 'connections'].includes(body.mode) ? body.mode : 'topic';
        const format = ['open', 'tf', 'mc'].includes(body.format) ? body.format : 'open';
        const needsTopic = mode === 'topic' || mode === 'lightning' || mode === 'list';
        const topic = String(body.topic || '').slice(0, 200);
        if (needsTopic && !topic) {
          return new Response(JSON.stringify({ ok: false, error: 'This mode needs a topic.' }), { headers });
        }
        const count = Math.min(Math.max(parseInt(body.count, 10) || 10, 1), MAX_QUESTIONS_PER_CALL);
        const age = ['family', 'kids', 'teens', 'adults'].includes(body.age) ? body.age : '';
        const difficulty = ['easy', 'medium', 'hard'].includes(body.difficulty) ? body.difficulty : '';

        const questions = await generateQuestions(env.ANTHROPIC_API_KEY, { topic, mode, format, count, age, difficulty });

        const newUsed = await commitUsage(env, gate.key, gate.used, GENERATE_COST);
        return new Response(JSON.stringify({ ok: true, questions, used: newUsed, cap: gate.cap }), { headers });
      } catch (e) {
        console.error('generate error:', e.message);
        return new Response(JSON.stringify({ ok: false, error: 'Generation failed - please try again.' }), { headers });
      }
    }

    // --- SUGGEST_CATEGORIES (fail CLOSED: real API cost) ---
    if (action === 'suggest_categories') {
      try {
        const gate = await checkLicenseAndReserve(env, license_key, instance_id, SUGGEST_COST);
        if (!gate.ok) {
          return new Response(JSON.stringify({ ok: false, error: gate.error, used: gate.used, cap: gate.cap }), { headers });
        }
        if (!env.ANTHROPIC_API_KEY) {
          return new Response(JSON.stringify({ ok: false, error: 'AI generation is not configured on the server.' }), { headers });
        }

        const seed = String(body.seed || '').slice(0, 200);
        const theme = String(body.theme || '').slice(0, 100);
        const avoid = Array.isArray(body.avoid) ? body.avoid.slice(0, 20).map(x => String(x).slice(0, 80)).filter(Boolean) : [];
        const age = ['family', 'kids', 'teens', 'adults'].includes(body.age) ? body.age : '';

        const categories = await suggestCategoryNames(env.ANTHROPIC_API_KEY, { seed, avoid, age, theme });

        const newUsed = await commitUsage(env, gate.key, gate.used, SUGGEST_COST);
        return new Response(JSON.stringify({ ok: true, categories, used: newUsed, cap: gate.cap }), { headers });
      } catch (e) {
        console.error('suggest_categories error:', e.message);
        return new Response(JSON.stringify({ ok: false, error: 'Suggestion failed - please try again.' }), { headers });
      }
    }

    // --- GENERATE_TIEBREAKER (fail CLOSED: real API cost) ---
    if (action === 'generate_tiebreaker') {
      try {
        const gate = await checkLicenseAndReserve(env, license_key, instance_id, TIEBREAKER_COST);
        if (!gate.ok) {
          return new Response(JSON.stringify({ ok: false, error: gate.error, used: gate.used, cap: gate.cap }), { headers });
        }
        if (!env.ANTHROPIC_API_KEY) {
          return new Response(JSON.stringify({ ok: false, error: 'AI generation is not configured on the server.' }), { headers });
        }

        const seed = String(body.seed || '').slice(0, 100);
        const age = ['family', 'kids', 'teens', 'adults'].includes(body.age) ? body.age : '';

        const tb = await generateTiebreaker(env.ANTHROPIC_API_KEY, { seed, age });

        const newUsed = await commitUsage(env, gate.key, gate.used, TIEBREAKER_COST);
        return new Response(JSON.stringify({
          ok: true, question: tb.question, answer: tb.answer, category: tb.category, used: newUsed, cap: gate.cap,
        }), { headers });
      } catch (e) {
        console.error('generate_tiebreaker error:', e.message);
        return new Response(JSON.stringify({ ok: false, error: 'Tiebreaker generation failed - please try again.' }), { headers });
      }
    }

    try {
      // --- ACTIVATE (first use on a device) ---
      if (action === 'activate') {
        const res = await fetch('https://api.lemonsqueezy.com/v1/licenses/activate', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.LS_API_KEY}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            license_key,
            instance_name: body.instance_name || 'TGP Device',
          }),
        });

        const data = await res.json();

        if (data.activated) {
          return new Response(JSON.stringify({
            valid: true,
            instance_id: data.instance?.id || null,
            status: data.license_key?.status || 'active',
          }), { headers });
        }

        return new Response(JSON.stringify({
          valid: false,
          error: data.error || 'Activation failed - check your license key and try again.',
        }), { headers });
      }

      // --- VALIDATE (periodic re-check, on load if a license is stored) ---
      const res = await fetch('https://api.lemonsqueezy.com/v1/licenses/validate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.LS_API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ license_key, instance_id: instance_id || undefined }),
      });

      const data = await res.json();
      const isActive = data.valid === true && data.license_key?.status === 'active';

      let used = null, cap = null;
      const packCap = isActive ? creditsForLicense(data.meta) : null;
      if (packCap && env.USAGE_KV) {
        cap = packCap;
        used = parseInt((await env.USAGE_KV.get(balanceKey(license_key))) || '0', 10);
      }

      return new Response(JSON.stringify({
        valid: isActive,
        status: data.license_key?.status || 'unknown',
        used, cap,
        error: isActive ? null : (
          data.license_key?.status === 'inactive'
            ? 'Subscription has been cancelled or expired.'
            : data.error || 'License not valid.'
        ),
      }), { headers });

    } catch (e) {
      // If the LemonSqueezy API is down, fail open for general UI unlock
      // only. Both metered actions are gated separately above and always
      // fail closed.
      console.error('LS API error:', e.message);
      return new Response(JSON.stringify({
        valid: true,
        status: 'unverified',
        warning: 'Could not reach the verification server - access temporarily granted.',
      }), { headers });
    }
  }
};

// ---- Anthropic calls -------------------------------------------------------

async function callAnthropic(apiKey, { prompt, tool, maxTokens, temperature }) {
  const body = {
    model: MODEL,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
    tools: [tool],
    tool_choice: { type: 'tool', name: tool.name },
  };
  if (temperature !== undefined) body.temperature = temperature;
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Anthropic API error: ' + res.status);
  const data = await res.json();
  const toolUse = (data.content || []).find(b => b.type === 'tool_use');
  if (!toolUse) throw new Error('No structured output returned.');
  return toolUse.input || {};
}

const MODE_INSTRUCTIONS = {
  topic: (topic, count) => 'All ' + count + ' questions should be about this single topic: ' + topic + '.',
  mixed: (topic, count) => 'Generate a diverse mix of trivia questions spanning many different categories' +
    (topic ? ' (loosely inspired by: ' + topic + ')' : '') +
    ' - no two questions should be on the same narrow subject.',
  lightning: (topic, count) => 'All ' + count + ' questions should be about: ' + topic +
    '. Keep them SHORT and quick to read aloud, with short, unambiguous answers (a word or two) - these are for a fast-paced lightning round.',
  list: (topic, count) => 'All ' + count + ' questions should be about: ' + topic +
    ', phrased as "list" questions (e.g. "Name 3 of the 5 ..."). The answer should state which items count as correct.',
  connections: (topic, count) => 'Generate ' + count + ' "what connects these?" puzzle questions' +
    (topic ? ' (loosely inspired by: ' + topic + ')' : '') +
    ' - each question gives 3-4 short clues/items and asks what links them, and the answer states the connection.',
};

// Audience + difficulty instructions appended to the generation prompt.
// Age range always adds an appropriateness/reading-level line; difficulty
// only speaks up when it isn't the default "balanced".
const AGE_INSTRUCTIONS = {
  family: ' Keep every question and its subject matter family-friendly and suitable for all ages, including young children - nothing crude, violent, or adult.',
  kids:   ' Aim at children roughly ages 7-12: simple wording and well-known, kid-friendly subjects; nothing crude or adult.',
  teens:  ' Aim at teenagers (about 13-17): age-appropriate with no explicit or adult content; some current pop-culture is welcome.',
  adults: ' Aimed at an adult pub audience (18+); wide-ranging references are fine, but avoid explicit or offensive content.',
};
const DIFFICULTY_INSTRUCTIONS = {
  easy:   ' Keep them easy - most casual players should know the answers.',
  medium: ' Aim for moderate difficulty.',
  hard:   ' Make them genuinely challenging, for seasoned trivia players.',
};

async function generateQuestions(apiKey, { topic, mode, format, count, age, difficulty }) {
  const schemaProps = {
    question: { type: 'string' },
    answer: { type: 'string' },
  };
  const required = ['question', 'answer'];
  let formatInstructions = '';
  if (format === 'tf') {
    formatInstructions = ' Each question must be a statement that is answerable as True or False; set "answer" to exactly "True" or "False".';
  } else if (format === 'mc') {
    formatInstructions = ' Each question needs exactly 4 short answer choices (one correct, three plausible-but-wrong) in "choices", and "answer" must exactly match the correct choice\'s text.';
    schemaProps.choices = { type: 'array', items: { type: 'string' }, minItems: 4, maxItems: 4 };
    required.push('choices');
  }

  const tool = {
    name: 'return_trivia_questions',
    description: 'Return a set of original pub-trivia question/answer pairs.',
    input_schema: {
      type: 'object',
      properties: {
        questions: {
          type: 'array',
          items: { type: 'object', properties: schemaProps, required },
        },
      },
      required: ['questions'],
    },
  };

  const prompt = 'Write ' + count + ' original pub-trivia questions with concise, unambiguous answers.\n' +
    (MODE_INSTRUCTIONS[mode] || MODE_INSTRUCTIONS.topic)(topic, count) +
    formatInstructions +
    (AGE_INSTRUCTIONS[age] || '') +
    (DIFFICULTY_INSTRUCTIONS[difficulty] || '') +
    '\nAccuracy matters most: use only well-established, verifiable facts. If you are not fully' +
    ' confident a date, name, statistic, or other specific detail is correct, do not guess or' +
    ' invent it - pick a different question or angle you are sure about instead.' +
    '\nQuestions must be suitable for reading aloud at a live trivia night.';

  // Low temperature: this is a factual-recall task, not a creative-writing one -
  // favor the model's most likely (best-supported) answer over variety.
  const out = await callAnthropic(apiKey, { prompt, tool, maxTokens: 1536, temperature: 0.3 });
  let questions = out.questions;
  if (!Array.isArray(questions) || questions.length === 0) throw new Error('Empty result.');

  if (format === 'mc') {
    // Defensive: drop anything the model returned malformed rather than
    // shipping a multiple-choice question with no matching correct choice.
    questions = questions.filter(q =>
      Array.isArray(q.choices) && q.choices.length === 4 && q.choices.includes(q.answer));
    if (!questions.length) throw new Error('AI returned no valid multiple-choice questions - try again.');
  }
  return questions;
}

const AGE_HINT = {
  family: ' Keep them family-friendly and suitable for all ages.',
  kids:   ' Aim them at kids roughly 7-12.',
  teens:  ' Aim them at teens roughly 13-17.',
  adults: ' Aim them at an adult pub crowd (18+), but nothing explicit or offensive.',
};

async function suggestCategoryNames(apiKey, { seed, avoid, age, theme }) {
  const tool = {
    name: 'return_categories',
    description: 'Return short, punchy trivia round category name ideas.',
    input_schema: {
      type: 'object',
      properties: {
        categories: { type: 'array', items: { type: 'string' }, minItems: 5, maxItems: 5 },
      },
      required: ['categories'],
    },
  };

  let prompt;
  if (seed) {
    prompt = 'Suggest 5 fresh, more specific/niche pub-trivia round category ideas that drill deeper into or riff on this one: "' + seed + '". Go more specific and surprising, not broader.';
    if (theme) prompt += ' Stay within the overall theme: "' + theme + '".';
  } else if (theme) {
    prompt = 'Suggest 5 fun, surprising pub-trivia round category ideas themed around "' + theme + '" - a mix of obvious and delightfully unexpected angles within that theme. Every idea must clearly relate to the theme.';
  } else {
    prompt = 'Suggest 5 fun, surprising pub-trivia round category ideas - a mix of well-known and delightfully unexpected angles.';
  }
  prompt += ' Short, punchy names (2-6 words each), no explanations.' +
    (AGE_HINT[age] || '') +
    (avoid.length ? ('\nAvoid repeating (already used in this game): ' + avoid.join(', ') + '.') : '');

  const out = await callAnthropic(apiKey, { prompt, tool, maxTokens: 300 });
  const categories = out.categories;
  if (!Array.isArray(categories) || categories.length === 0) throw new Error('Empty result.');
  return categories;
}

async function generateTiebreaker(apiKey, { seed, age }) {
  const tool = {
    name: 'return_tiebreaker',
    description: 'Return one pub-trivia "closest answer wins" tiebreaker question with a precise numeric answer.',
    input_schema: {
      type: 'object',
      properties: {
        question: { type: 'string' },
        answer: { type: 'string' },
        category: { type: 'string', description: 'A short 1-4 word label for what the question is about, e.g. "Movies".' },
      },
      required: ['question', 'answer', 'category'],
    },
  };

  const prompt = 'Write one "closest answer wins" pub-trivia tiebreaker question.' +
    ' It must have a single precise, verifiable NUMERIC answer (a year, a count, a measurement, a duration, etc.) - never something that requires guessing an approximate or debatable fact.' +
    (seed
      ? ' Base it on this seed/topic: "' + seed + '".'
      : ' Pick any well-known, broadly appealing subject.') +
    ' Also return a short 1-4 word "category" label describing what it\'s about (e.g. "Movies", "US History", "Music").' +
    (AGE_HINT[age] || '') +
    ' The question should read naturally aloud, and the answer must be just the number, optionally with a simple unit (e.g. "151 feet", "1989", "88").' +
    '\nAccuracy matters most: use only a well-established, verifiable figure. If you are not fully confident in a specific number, pick a different question you are sure about instead.';

  const out = await callAnthropic(apiKey, { prompt, tool, maxTokens: 300, temperature: 0.4 });
  const question = String(out.question || '').trim();
  const answer = String(out.answer || '').trim();
  const category = String(out.category || '').trim();
  if (!question || !answer) throw new Error('Empty result.');
  return { question, answer, category };
}
