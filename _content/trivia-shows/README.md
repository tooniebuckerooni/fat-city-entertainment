# Pre-made trivia shows

Source content for the print-and-play trivia shows (`p169`–`p182`) — five
**General Knowledge** nights, two **seasonal** editions, and five **classroom**
subject shows for grades 5–8. One `.tgp.json` per game. These are the master copies — edit
here, never in an exported PDF.

## What each file is

A saved game in the **Trivia Show Maker**'s own format
(`/trivia-show-maker/`, source in `trivia-show-maker/`). The app's `adoptState()`
reads exactly these keys and silently drops anything else, so a typo in a field
name doesn't error — it just quietly becomes a default. Run the checker.

| file | product | subtitle | flavour |
|---|---|---|---|
| `gk-night-one.tgp.json` | p169 | The Opener | world / movies / history |
| `gk-night-two.tgp.json` | p170 | The Regular | science / music / sport |
| `gk-night-three.tgp.json` | p171 | The Mixer | food / television / language |
| `gk-night-four.tgp.json` | p172 | The Curveball | inventions / faces / landmarks |
| `gk-night-five.tgp.json` | p173 | The Decider | animals / numbers / art |
| `halloween-fright-night.tgp.json` | p174 | Fright Night | seasonal — monsters / horror film / superstitions |
| `christmas-long-night.tgp.json` | p175 | The Long Night | seasonal — world traditions / carols / films |
| `classroom-math.tgp.json` | p177 | Grades 5–8 | classroom — numbers to percents |
| `classroom-science.tgp.json` | p178 | Grades 5–8 | classroom — life, Earth, body, matter |
| `classroom-english.tgp.json` | p179 | Grades 5–8 | classroom — words to figures of speech |
| `classroom-history.tgp.json` | p180 | Grades 5–8 | classroom — ancient world to modern |
| `classroom-geography.tgp.json` | p181 | Grades 5–8 | classroom — continents to maps |

Bundles carry no game file of their own: **p176** is the five General
Knowledge nights, **p182** the five classroom subjects.

The classroom shows follow different rules to the pub ones — see
"Classroom shows" at the foot of this file.

Every game is 5 rounds × 10 questions, plus a tiebreaker. Round 4 is always
`type: "double"` — a table that starts badly can still win, which keeps the
room in it to the last round.

## Producing the customer's files

The app runs in a browser with no build step and no login.

1. Open `/trivia-show-maker/` (locally: open `trivia-show-maker/index.html`).
2. Click **📂 Open** and pick the `.tgp.json`.
3. Export the PDFs — host packet, answer sheets, score sheet.
4. Those PDFs are what the customer downloads. **Do not commit them**: this
   repo is public and served by GitHub Pages, so a committed host packet
   publishes the answers to a product being sold. Same rule that keeps the
   full music-bingo callsheets out of the repo.

The buyer fills in `date` and `host` themselves, so both are left empty here.

## Editing

Change the JSON, then:

```bash
node _tools/check-trivia-shows.js
```

It verifies structure across the whole set: multiple-choice answers actually
appear among their own options, True/False rounds aren't secretly lopsided or
running in a pattern, exactly one double round per game, and — the one that
matters for a five-game set — **no question duplicated across two games** a
host bought together.

**It cannot tell you whether an answer is factually true.** That check is a
human or a research pass, and it is the one that matters most: these are read
aloud to a paying room, and a wrong answer is a public failure plus a refund.

## The rules the questions were written to

Worth keeping if you add a sixth game:

- **Evergreen only.** No current office-holders, champions, record-holders,
  populations or "how many X are there today". If it could be different in two
  years, it doesn't go in.
- **One defensible answer.** Watch remakes, famous covers, people who share a
  name, and superlatives that depend on how you measure. Where priority is
  genuinely disputed — the telephone, powered flight — the question is scoped
  so the intended answer is the only one (who received the *first US patent*,
  rather than who "invented" it).
- **Markable by a volunteer.** Where a near-miss ought to score, the answer
  string says so, e.g. `Sheep (accept "sheep and goat" — PDO feta is at least
  70% sheep's milk, up to 30% goat)`.
- **Reads aloud.** Nobody sees a screen, so nothing that depends on spelling or
  seeing the word.
- **Difficulty ramps within each round** — Q1–3 get everyone on the board, Q8–10
  separate the strong teams. A question nobody can answer is a dead round, not
  a hard one.

## Classroom shows

`classroom-*.tgp.json` are a different product for a different buyer, and they
are written to different rules:

- **A teacher runs it in a period, for marks that don't count.** Engagement
  beats difficulty — a question nobody can answer is worse than an easy one.
  They skew easier than a pub night throughout.
- **Rounds 1–2 are `ageRange: "kids"`, 3–5 `"teens"`**, so each packet ramps
  across a class rather than sitting at one level.
- **Nothing needs a screen, a device or a textbook.** Read aloud, answered on
  paper. That rules out spelling questions and anything needing a diagram or a
  written equation — which is why the English show asks for the *term* given an
  example, rather than asking anyone to punctuate a sentence.
- **No question turns on which curriculum a class follows.** Measurement
  questions name their unit system every time.
- **Where the classroom answer and the strictly-correct answer differ, scope
  the question rather than fudge it.** "The three states of matter usually
  taught in class" sidesteps plasma without teaching anything false.
- **School-safe, not merely family-safe.** Nothing on violence, religion as a
  truth-claim, or the politics of the last 30 years. No "who discovered"
  framing for places that were already inhabited. The Holocaust, apartheid and
  residential schools were all deliberately kept out: they belong in a lesson,
  not in a round scored for points.

### Still undecided before these go on sale
**Classroom licensing.** A teacher will photocopy for 30 students, and their
school will ask whether it can be shared department-wide. Nothing in the
product copy makes any claim about this yet, deliberately — it is the owner's
call, and inventing a term would be worse than leaving it open. Settle it
before publishing p177–p182.
