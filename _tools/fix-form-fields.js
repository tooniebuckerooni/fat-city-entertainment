// Give the migrated Weebly forms human-readable field names.
//
//   node fix-form-fields.js          report what would change
//   node fix-form-fields.js --write  apply it
//
// Weebly named every form input after its internal field id (`_u690125131196042535`).
// Formspree labels each row of the notification email with the input's `name`, so
// every enquiry arrived as a list of 18-digit numbers with no indication of which
// was the name, the email or the notes.
//
// This derives each field's name from its own <label> and rewrites the `name`
// attribute. `id`/`for` are left alone so label associations keep working.
//
// It also tidies what Formspree would otherwise show as junk rows: Weebly's inert
// hidden inputs (form_version, wsite_approved, ucfid, recaptcha_token — nothing
// references them now that Weebly's JS is gone) are removed, and the empty
// `wsite_subject` hidden input becomes Formspree's `_subject` with a real value,
// so notifications arrive with a useful subject line instead of a generic one.

const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "..");
const WRITE = process.argv.includes("--write");

// Page -> subject line for its notification email.
const SUBJECTS = {
  "contact.html": "Website contact form — event enquiry",
  "musicbingonearme.html": "Website — music bingo show listing submission",
  "virtualevents.html": "Website — virtual event enquiry",
  "vrtriviaparty.html": "Website — VR trivia enquiry",
  "yycevents.html": "Website — Calgary events enquiry",
};

// Labels whose slug would be awkward or ambiguous.
const OVERRIDES = {
  "email": "email", // keep bare: Formspree uses a field named `email` as reply-to
  "contact email": "email",
  "# of guests": "guests",
  "roughly, how many guests do you expect": "guests",
  "notes": "notes",
  "venue name & exact address": "venue_and_address",
  "day & start time": "day_and_start_time",
  "prizes?": "prizes",
  "trivia store order #": "trivia_store_order_number",
  "what is your show format?": "show_format",
  "interests": "interests",
  "more details": "more_details",
  "event date": "event_date",
  "phone number": "phone",
  "phone": "phone",
  "discord (optional)": "discord",
  "where are you interested in streaming?": "streaming_interest",
};

// Weebly's compound fields: name="_uNNN[first]" etc. The label only points at the
// first input of the pair, so map the bracket key rather than the label.
const COMPOUND = { first: "first_name", last: "last_name", number: "phone" };

const slug = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "field";

function labelsFor(html) {
  const out = {};
  const re = /<label[^>]*for="input-(\d+)"[^>]*>([\s\S]*?)<\/label>/g;
  for (const m of html.matchAll(re)) {
    out[m[1]] = m[2]
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/[:*\s]+$/, "")
      .trim();
  }
  return out;
}

let totalFields = 0;
let totalFiles = 0;

for (const [file, subject] of Object.entries(SUBJECTS)) {
  const p = path.join(REPO, file);
  let html = fs.readFileSync(p, "utf8");
  const before = html;
  const labels = labelsFor(html);
  const used = new Set();
  const renames = [];

  // Pass 1: work out the new name for every _uNNN field.
  const mapping = new Map(); // "_uNNN" -> base name
  const fieldRe = /<(?:input|textarea|select)\b[^>]*\bname="(_u\d+)(\[[^\]]*\])?"[^>]*>/g;
  for (const m of html.matchAll(fieldRe)) {
    const [tag, weeblyName, bracket] = [m[0], m[1], m[2] || ""];
    const key = bracket.slice(1, -1).toLowerCase();

    // Compound halves get their own distinct field name, so don't share a base.
    if (COMPOUND[key]) {
      mapping.set(weeblyName + bracket, COMPOUND[key]);
      continue;
    }
    if (mapping.has(weeblyName)) continue; // checkbox group: one base for all options

    // Text fields carry id="input-<n>" and their <label for> matches it. Checkbox
    // and radio options use id="checkbox-1-_u<n>" instead, and the group's single
    // <label for="input-<n>"> is keyed by the number inside the Weebly name.
    const idMatch = tag.match(/id="input-(\d+)"/);
    const label = labels[idMatch ? idMatch[1] : weeblyName.slice(2)] || "";
    const norm = label.toLowerCase().replace(/\s+/g, " ").trim();
    let base = OVERRIDES[norm] ?? (label ? slug(label) : slug(weeblyName));
    // Don't collide two fields in the same form.
    let n = 2;
    const first = base;
    while (used.has(base)) base = `${first}_${n++}`;
    used.add(base);
    mapping.set(weeblyName, base);
  }

  // Pass 2: rewrite. Longest keys first so "_uNNN[first]" wins over "_uNNN".
  for (const k of [...mapping.keys()].sort((a, b) => b.length - a.length)) {
    const to = mapping.get(k);
    const from = `name="${k}"`;
    const count = html.split(from).length - 1;
    if (!count) continue;
    html = html.split(from).join(`name="${to}"`);
    renames.push(`${k} -> ${to}${count > 1 ? `  (x${count})` : ""}`);
    totalFields += count;
  }
  // Remaining bracketed checkbox groups keep their option keys: _uNNN[Music Bingo]
  // becomes show_format[Music Bingo].
  for (const [k, to] of mapping) {
    if (k.includes("[")) continue;
    const re = new RegExp(`name="${k}(\\[[^\\]]*\\])"`, "g");
    let c = 0;
    html = html.replace(re, (_m, br) => { c++; return `name="${to}${br}"`; });
    if (c) { renames.push(`${k}[…] -> ${to}[…]  (x${c})`); totalFields += c; }
  }

  // Formspree subject line, in place of Weebly's empty wsite_subject.
  const subjBefore = html;
  html = html.replace(
    /<input type="hidden" name="wsite_subject">/g,
    `<input type="hidden" name="_subject" value="${subject}">`
  );
  if (html !== subjBefore) renames.push(`wsite_subject -> _subject "${subject}"`);

  // Inert Weebly plumbing: would show up as empty rows in the notification.
  for (const dead of ["form_version", "wsite_approved", "ucfid", "recaptcha_token"]) {
    const re = new RegExp(`\\s*<input type="hidden" name="${dead}"[^>]*>`, "g");
    const c = (html.match(re) || []).length;
    if (c) { html = html.replace(re, ""); renames.push(`removed hidden ${dead}${c > 1 ? ` (x${c})` : ""}`); }
  }

  console.log(`\n=== ${file}`);
  for (const r of renames) console.log(`   ${r}`);
  if (!renames.length) console.log("   (nothing to change)");
  if (WRITE && html !== before) { fs.writeFileSync(p, html); totalFiles++; }
}

console.log(
  WRITE
    ? `\nwrote ${totalFiles} file(s), ${totalFields} field name(s) renamed`
    : `\n${totalFields} field name(s) would be renamed — pass --write to apply`
);
