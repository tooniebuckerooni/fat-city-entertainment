/* Trivia Generator Pro — PDF builders (jsPDF).
   All documents share the same branding context: logo, org name, website,
   accent color, and font chosen in the Branding panel. */
const TGP_PDF = (() => {
  const { jsPDF } = window.jspdf;

  /* ---------- helpers ---------- */

  function hexToRgb(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
    if (!m) return [217, 79, 79];
    const n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function newDoc(state, orientation = "portrait") {
    const format = state.options.pageSize === "a4" ? "a4" : "letter";
    const doc = new jsPDF({ unit: "mm", format, orientation, compress: true });
    return {
      doc,
      W: doc.internal.pageSize.getWidth(),
      H: doc.internal.pageSize.getHeight(),
      M: 18,
      accent: hexToRgb(state.branding.accent),
      font: state.branding.font || "helvetica",
      state
    };
  }

  function setF(c, style, size, color) {
    c.doc.setFont(c.font, style);
    c.doc.setFontSize(size);
    const col = color || [40, 40, 40];
    c.doc.setTextColor(col[0], col[1], col[2]);
  }

  const lh = pt => pt * 0.46; // comfortable line height in mm for a given pt size

  function drawLogo(c, x, y, maxW, maxH, align) {
    const b = c.state.branding;
    if (!b.logo) return 0;
    const ratio = b.logoW > 0 && b.logoH > 0 ? b.logoW / b.logoH : 2;
    let w = maxW, h = w / ratio;
    if (h > maxH) { h = maxH; w = h * ratio; }
    let lx = x;
    if (align === "center") lx = x - w / 2;
    else if (align === "right") lx = x - w;
    const fmt = b.logo.indexOf("data:image/png") === 0 ? "PNG" : "JPEG";
    try { c.doc.addImage(b.logo, fmt, lx, y, w, h); } catch (e) { return 0; }
    return h;
  }

  /* Compact page header used on packet round pages. Returns content start y. */
  function pageHeader(c) {
    const { doc, W, M } = c;
    const b = c.state.branding, g = c.state.game;
    let logoH = 0;
    if (b.logo) logoH = drawLogo(c, M, 10, 40, 13, "left");
    setF(c, "bold", 11, [70, 70, 70]);
    doc.text(g.title || "Trivia Night", W - M, 15, { align: "right" });
    if (b.org) {
      setF(c, "normal", 8.5, [130, 130, 130]);
      doc.text(b.org, W - M, 20, { align: "right" });
    }
    const y = Math.max(10 + logoH, 21) + 3;
    doc.setDrawColor(c.accent[0], c.accent[1], c.accent[2]);
    doc.setLineWidth(0.7);
    doc.line(M, y, W - M, y);
    return y + 8;
  }

  /* Accent banner bar. Returns y below the banner. */
  function banner(c, y, left, right) {
    const { doc, W, M } = c;
    doc.setFillColor(c.accent[0], c.accent[1], c.accent[2]);
    doc.roundedRect(M, y, W - 2 * M, 11, 1.5, 1.5, "F");
    setF(c, "bold", 12.5, [255, 255, 255]);
    doc.text(left, M + 5, y + 7.3);
    if (right) {
      setF(c, "bold", 9.5, [255, 255, 255]);
      doc.text(right, W - M - 5, y + 7.3, { align: "right" });
    }
    return y + 17;
  }

  /* Branding footer on every page (packets & score sheet). */
  function applyFooters(c) {
    const { doc, W, H, M } = c;
    const b = c.state.branding;
    const line = [b.org, b.website].filter(Boolean).join("   •   ");
    const n = doc.getNumberOfPages();
    for (let i = 1; i <= n; i++) {
      doc.setPage(i);
      doc.setDrawColor(205, 205, 205);
      doc.setLineWidth(0.2);
      doc.line(M, H - 13, W - M, H - 13);
      setF(c, "normal", 8, [135, 135, 135]);
      if (line) doc.text(line, M, H - 8.5);
      doc.text("Page " + i + " of " + n, W - M, H - 8.5, { align: "right" });
      if (b.credit) {
        setF(c, "italic", 6.8, [175, 175, 175]);
        doc.text("Made with Trivia Generator Pro", W / 2, H - 4.5, { align: "center" });
      }
    }
  }

  /* ---------- game data shaping ---------- */

  function cleanGame(state) {
    return state.rounds
      .map(r => ({
        name: (r.name || "").trim(),
        type: r.type || "standard",
        format: r.format || "open",
        points: Math.max(1, Number(r.points) || 10),
        questions: r.questions
          .map(q => ({
            q: (q.q || "").trim(), a: (q.a || "").trim(),
            choices: Array.isArray(q.choices) ? q.choices.map(x => String(x || "").trim()) : null
          }))
          .filter(q => q.q || q.a)
      }))
      .filter(r => r.questions.length > 0);
  }

  function roundPts(r) { return r.type === "double" ? r.points * 2 : r.points; }

  function roundLabel(r, i) {
    return "ROUND " + (i + 1) + (r.name ? " — " + r.name.toUpperCase() : "");
  }

  function roundRight(state, r) {
    if (r.type === "wager") return "WAGER ROUND";
    if (!state.options.showPoints) return r.type === "double" ? "DOUBLE POINTS" : "";
    if (r.type === "double") return "DOUBLE POINTS — " + roundPts(r) + " pts each";
    return roundPts(r) + " pts each";
  }

  function tiebreaker(state) {
    if (!state.options.tiebreaker) return null;
    const q = (state.tiebreaker.q || "").trim();
    if (!q) return null;
    return { q, a: (state.tiebreaker.a || "").trim() };
  }

  /* Pre-flight check used by the UI before generating. */
  function audit(state) {
    const rounds = cleanGame(state);
    let questions = 0, missingAnswers = 0;
    rounds.forEach(r => r.questions.forEach(q => {
      questions++;
      if (!q.a) missingAnswers++;
    }));
    let skipped = 0;
    state.rounds.forEach(r => r.questions.forEach(q => {
      if (!(q.q || "").trim() && !(q.a || "").trim()) skipped++;
    }));
    return { rounds: rounds.length, questions, skipped, missingAnswers };
  }

  /* ---------- host / question packet ---------- */

  function packet(state, withAnswers) {
    const rounds = cleanGame(state);
    if (!rounds.length) return null;
    const c = newDoc(state);
    const { doc, W, H, M } = c;
    const g = state.game, b = state.branding;
    const tb = tiebreaker(state);

    /* --- cover page --- */
    let y = 34;
    if (b.logo) {
      const lh2 = drawLogo(c, W / 2, y, 72, 34, "center");
      y += lh2 + 14;
    } else {
      y += 8;
    }
    setF(c, "bold", 30, c.accent);
    const titleLines = doc.splitTextToSize(g.title || "Trivia Night", W - 2 * M - 8);
    titleLines.forEach(t => { doc.text(t, W / 2, y, { align: "center" }); y += 13; });
    if (g.subtitle) {
      setF(c, "normal", 14, [95, 95, 95]);
      doc.text(g.subtitle, W / 2, y, { align: "center" });
      y += 9;
    }
    const meta = [g.date, g.host].filter(Boolean).join("    •    ");
    if (meta) {
      setF(c, "normal", 11, [125, 125, 125]);
      doc.text(meta, W / 2, y, { align: "center" });
      y += 8;
    }
    y += 4;
    doc.setDrawColor(c.accent[0], c.accent[1], c.accent[2]);
    doc.setLineWidth(1);
    doc.line(W / 2 - 32, y, W / 2 + 32, y);
    y += 13;

    setF(c, "bold", 13, [60, 60, 60]);
    doc.text(withAnswers ? "HOST PACKET" : "QUESTION PACKET", W / 2, y, { align: "center" });
    setF(c, "normal", 9.5, [150, 150, 150]);
    doc.text(withAnswers ? "Questions and answers — for the host's eyes only" : "Questions only — no answers inside",
      W / 2, y + 6, { align: "center" });
    y += 20;

    /* game summary box */
    const tbRow = tb ? 1 : 0;
    const boxH = 16 + (rounds.length + tbRow) * 7 + 10;
    doc.setDrawColor(210, 210, 210);
    doc.setLineWidth(0.3);
    doc.roundedRect(M + 6, y, W - 2 * M - 12, boxH, 2, 2, "S");
    setF(c, "bold", 10, c.accent);
    doc.text("GAME SUMMARY", W / 2, y + 8, { align: "center" });
    let sy = y + 16;
    let totalQ = 0, totalPts = 0, hasWager = false;
    rounds.forEach((r, i) => {
      totalQ += r.questions.length;
      if (r.type === "wager") hasWager = true;
      else totalPts += r.questions.length * roundPts(r);
      setF(c, "normal", 10.5, [70, 70, 70]);
      let line = "Round " + (i + 1) + ": " + (r.name || "Untitled") + "  —  " + r.questions.length + " questions";
      if (state.options.showPoints) {
        line += r.type === "wager" ? "  (wager round)" :
          "  (" + roundPts(r) + " pts each" + (r.type === "double" ? ", double points" : "") + ")";
      }
      doc.text(line, W / 2, sy, { align: "center" });
      sy += 7;
    });
    if (tb) {
      setF(c, "italic", 10.5, [110, 110, 110]);
      doc.text("Tiebreaker: closest answer wins", W / 2, sy, { align: "center" });
      sy += 7;
    }
    y += boxH + 9;
    setF(c, "bold", 11, [60, 60, 60]);
    let totals = totalQ + " questions";
    if (state.options.showPoints) {
      totals += "   •   " + totalPts + " possible points" + (hasWager ? " + wagers" : "");
    }
    doc.text(totals, W / 2, y, { align: "center" });

    if (b.tagline) {
      setF(c, "italic", 9.5, [140, 140, 140]);
      doc.text(b.tagline, W / 2, H - 24, { align: "center" });
    }

    /* --- round pages --- */
    const qX = M + 10, qW = W - M - qX;
    rounds.forEach((r, i) => {
      doc.addPage();
      y = pageHeader(c);
      y = banner(c, y, roundLabel(r, i), roundRight(state, r));
      if (r.type === "wager" && withAnswers) {
        setF(c, "italic", 9.5, [120, 120, 120]);
        doc.text("Collect each team's wager before reading the questions.", M, y - 4);
        y += 3;
      }
      r.questions.forEach((q, qi) => {
        const qLines = doc.splitTextToSize(q.q || "(no question text)", qW);
        const hasChoices = Array.isArray(q.choices) && q.choices.length > 0;
        const choiceLines = hasChoices
          ? q.choices.map((ch, ci) => doc.splitTextToSize(String.fromCharCode(65 + ci) + ")  " + (ch || "—"), qW - 6))
          : [];
        const aLines = (withAnswers && !hasChoices)
          ? doc.splitTextToSize("Answer:  " + (q.a || "—"), qW)
          : [];
        const choiceH = choiceLines.reduce((s, lines) => s + lines.length * lh(10) + 0.8, 0) + (hasChoices ? 1.5 : 0);
        const blockH = qLines.length * lh(11) + choiceH +
          (withAnswers && !hasChoices ? aLines.length * lh(10) + 1.5 : 0) + 6.5;
        if (y + blockH > H - 18) {
          doc.addPage();
          y = pageHeader(c);
          y = banner(c, y, roundLabel(r, i) + "  (cont.)", roundRight(state, r));
        }
        setF(c, "bold", 11, c.accent);
        doc.text((qi + 1) + ".", M + 6, y, { align: "right" });
        setF(c, "normal", 11, [35, 35, 35]);
        qLines.forEach(t => { doc.text(t, qX, y); y += lh(11); });
        if (hasChoices) {
          y += 1.5;
          const correctIdx = q.choices.findIndex(ch => ch.toLowerCase() === q.a.toLowerCase());
          choiceLines.forEach((lines, ci) => {
            const isCorrect = withAnswers && ci === correctIdx;
            setF(c, isCorrect ? "bold" : "normal", 10, isCorrect ? c.accent : [90, 90, 90]);
            lines.forEach((t, li) => {
              if (isCorrect && li === 0) drawCheckmark(c, qX - 4.5, y - 1.4, c.accent);
              doc.text(t, qX + 2, y);
              y += lh(10);
            });
          });
        } else if (withAnswers) {
          y += 1.5;
          setF(c, "bolditalic", 10, c.accent);
          aLines.forEach(t => { doc.text(t, qX, y); y += lh(10); });
        }
        y += 6.5;
      });
    });

    /* --- tiebreaker --- */
    if (tb) {
      if (y + 46 > H - 18) {
        doc.addPage();
        y = pageHeader(c);
      }
      y = banner(c, y, "TIEBREAKER", "closest answer wins");
      const qLines = doc.splitTextToSize(tb.q, qW);
      setF(c, "bold", 11, c.accent);
      doc.text("TB.", M + 6, y, { align: "right" });
      setF(c, "normal", 11, [35, 35, 35]);
      qLines.forEach(t => { doc.text(t, qX, y); y += lh(11); });
      if (withAnswers) {
        y += 1.5;
        setF(c, "bolditalic", 10, c.accent);
        doc.text("Answer:  " + (tb.a || "—"), qX, y);
      }
    }

    applyFooters(c);
    return c.doc;
  }

  /* ---------- answer sheets ---------- */

  /* Draws one team answer sheet into the region starting at `top` with height
     `regH`. Used once per page (full) or twice per page (half-sheet mode). */
  function answerRegion(c, r, i, isLast, top, regH) {
    const { doc, W, M } = c;
    const b = c.state.branding, g = c.state.game;
    const compact = regH < 180;
    const pad = compact ? 9 : 14;
    let y = top + pad;

    /* header: logo + game title, rule */
    let logoH = 0;
    if (b.logo) logoH = drawLogo(c, M, y - 3, compact ? 26 : 34, compact ? 9 : 12, "left");
    setF(c, "bold", compact ? 10 : 11, [70, 70, 70]);
    doc.text(g.title || "Trivia Night", W - M, y + 1, { align: "right" });
    if (b.org) {
      setF(c, "normal", compact ? 7.5 : 8.5, [130, 130, 130]);
      doc.text(b.org, W - M, y + (compact ? 4.5 : 5.5), { align: "right" });
    }
    y = Math.max(y - 3 + logoH, y + (compact ? 5 : 6.5)) + 2.5;
    doc.setDrawColor(c.accent[0], c.accent[1], c.accent[2]);
    doc.setLineWidth(0.6);
    doc.line(M, y, W - M, y);
    y += compact ? 7 : 10;

    /* round title + team name line */
    setF(c, "bold", compact ? 15 : 19, c.accent);
    doc.text("ROUND " + (i + 1), M, y);
    if (r.name) {
      setF(c, "bold", compact ? 10 : 12, [90, 90, 90]);
      doc.text(r.name.toUpperCase(), M, y + (compact ? 5 : 6.5));
    }
    const teamLabelX = W - M - (compact ? 62 : 74);
    setF(c, "bold", compact ? 9 : 10, [70, 70, 70]);
    doc.text("TEAM NAME", teamLabelX, y - (compact ? 4 : 5));
    doc.setDrawColor(120, 120, 120);
    doc.setLineWidth(0.35);
    doc.line(teamLabelX, y + 1, W - M, y + 1);
    /* round meta under team line */
    const right = roundRight(c.state, r);
    if (right) {
      setF(c, "normal", compact ? 7.5 : 8.5, [130, 130, 130]);
      doc.text(right, W - M, y + (compact ? 4.5 : 5.5), { align: "right" });
    }
    y += compact ? 10 : 13;

    if (r.type === "wager") {
      setF(c, "bold", compact ? 9 : 10, [70, 70, 70]);
      doc.text("WAGER:", M, y);
      doc.setDrawColor(120, 120, 120);
      doc.line(M + (compact ? 14 : 16), y + 1, M + (compact ? 44 : 52), y + 1);
      y += compact ? 6 : 8;
    }

    /* answer lines */
    const tb = isLast ? tiebreaker(c.state) : null;
    const footH = compact ? 13 : 17;          // score box + branding line
    const avail = top + regH - footH - y - 2;
    const n = r.questions.length;
    const twoCols = n * (compact ? 8 : 10) > avail && n > 5;
    const perCol = twoCols ? Math.ceil(n / 2) : n;
    const rowsInCol = perCol + (tb && !twoCols ? 1 : 0);
    let space = avail / Math.max(rowsInCol, 1);
    space = Math.max(compact ? 6.5 : 8, Math.min(space, compact ? 11 : 15));
    const colGap = 10;
    const colW = twoCols ? (W - 2 * M - colGap) / 2 : W - 2 * M;
    const numPt = compact ? 9 : 10.5;

    for (let q = 0; q < n; q++) {
      const col = twoCols && q >= perCol ? 1 : 0;
      const row = col ? q - perCol : q;
      const x = M + col * (colW + colGap);
      const ly = y + row * space + space - 3;
      setF(c, "bold", numPt, c.accent);
      doc.text((q + 1) + ".", x + (compact ? 5.5 : 6.5), ly, { align: "right" });
      const lineX0 = x + (compact ? 7.5 : 9);
      if (r.format === "tf") {
        drawChoiceBubbles(c, ["TRUE", "FALSE"], lineX0, ly, x + colW - lineX0, compact);
      } else if (r.format === "mc") {
        drawChoiceBubbles(c, ["A", "B", "C", "D"], lineX0, ly, x + colW - lineX0, compact);
      } else {
        doc.setDrawColor(165, 165, 165);
        doc.setLineWidth(0.3);
        doc.line(lineX0, ly + 0.8, x + colW, ly + 0.8);
      }
    }
    let usedRows = perCol;
    if (tb) {
      /* tiebreaker line spans full width below the numbered lines */
      const ly = y + usedRows * space + space - 3;
      setF(c, "bold", numPt, c.accent);
      doc.text("TB.", M + (compact ? 5.5 : 6.5), ly, { align: "right" });
      setF(c, "italic", compact ? 7.5 : 8.5, [120, 120, 120]);
      const tbq = doc.splitTextToSize(tb.q, W - 2 * M - 60)[0] || "";
      doc.text(tbq, M + (compact ? 9 : 11), ly - (compact ? 3.2 : 4));
      doc.setDrawColor(165, 165, 165);
      doc.line(M + (compact ? 7.5 : 9), ly + 0.8, W - M - 40, ly + 0.8);
      usedRows++;
    }

    /* score box + branding line */
    const by = top + regH - footH;
    const boxW = compact ? 26 : 32, boxH = compact ? 8.5 : 11;
    setF(c, "bold", compact ? 8 : 9, [70, 70, 70]);
    doc.text("ROUND SCORE", W - M - boxW - 2, by + boxH - (compact ? 2.5 : 3.5), { align: "right" });
    doc.setDrawColor(c.accent[0], c.accent[1], c.accent[2]);
    doc.setLineWidth(0.5);
    doc.roundedRect(W - M - boxW, by, boxW, boxH, 1, 1, "S");
    const fLine = [b.org, b.website].filter(Boolean).join("  •  ");
    if (fLine) {
      setF(c, "normal", compact ? 7 : 7.5, [150, 150, 150]);
      doc.text(fLine, M, by + boxH - (compact ? 2.5 : 3.5));
    }
  }

  /* jsPDF's built-in fonts only cover WinAnsi/Latin-1, so a Unicode
     checkmark character (✓) silently renders as the wrong glyph — draw it
     as two short vector strokes instead. */
  function drawCheckmark(c, x, y, color) {
    const { doc } = c;
    doc.setDrawColor(color[0], color[1], color[2]);
    doc.setLineWidth(0.7);
    doc.line(x, y, x + 1, y + 1.2);
    doc.line(x + 1, y + 1.2, x + 2.4, y - 1.5);
  }

  /* Small circle-and-label bubbles for a team to circle, replacing a blank
     answer line on True/False and Multiple Choice answer sheets. */
  function drawChoiceBubbles(c, labels, x0, ly, availW, compact) {
    const { doc } = c;
    const rad = compact ? 2 : 2.4;
    const gap = availW / labels.length;
    doc.setDrawColor(120, 120, 120);
    doc.setLineWidth(0.35);
    labels.forEach((lab, i) => {
      const cx = x0 + gap * i + rad + 1;
      doc.circle(cx, ly - 1, rad, "S");
      setF(c, "normal", compact ? 6.5 : 7.5, [90, 90, 90]);
      doc.text(lab, cx + rad + 1.8, ly - 1 + 1.2);
    });
  }

  function answerSheets(state) {
    const rounds = cleanGame(state);
    if (!rounds.length) return null;
    const c = newDoc(state);
    const { doc, W, H } = c;
    rounds.forEach((r, i) => {
      if (i > 0) doc.addPage();
      const isLast = i === rounds.length - 1;
      if (state.options.halfSheets) {
        answerRegion(c, r, i, isLast, 0, H / 2);
        doc.setDrawColor(175, 175, 175);
        doc.setLineWidth(0.25);
        doc.setLineDashPattern([2.5, 2], 0);
        doc.line(7, H / 2, W - 7, H / 2);
        doc.setLineDashPattern([], 0);
        answerRegion(c, r, i, isLast, H / 2, H / 2);
      } else {
        answerRegion(c, r, i, isLast, 0, H);
      }
    });
    return c.doc;
  }

  /* ---------- score sheet ---------- */

  function scoreSheet(state) {
    const rounds = cleanGame(state);
    if (!rounds.length) return null;
    const c = newDoc(state, "landscape");
    const { doc, W, H, M } = c;
    const g = state.game;
    const teams = Math.max(4, Math.min(24, Number(state.options.teams) || 12));
    const tb = tiebreaker(state);

    let y = 16;
    if (c.state.branding.logo) {
      const lhh = drawLogo(c, M, 10, 36, 13, "left");
      y = Math.max(y, 10 + lhh + 4);
    }
    setF(c, "bold", 18, c.accent);
    doc.text((g.title || "Trivia Night") + "  —  SCORE SHEET", W / 2, 18, { align: "center" });
    const meta = [g.subtitle, g.date].filter(Boolean).join("   •   ");
    if (meta) {
      setF(c, "normal", 10, [120, 120, 120]);
      doc.text(meta, W / 2, 25, { align: "center" });
    }
    y = Math.max(y, 31);

    /* grid geometry */
    const teamW = 58, totalW = 26, tbW = tb ? 16 : 0;
    const gridW = W - 2 * M;
    const roundW = (gridW - teamW - totalW - tbW) / rounds.length;
    const headH = 13;
    const bottom = H - 16;
    let rowH = (bottom - y - headH) / teams;
    rowH = Math.min(rowH, 14);
    const gridH = headH + rowH * teams;
    const x0 = M;

    /* header row */
    doc.setFillColor(c.accent[0], c.accent[1], c.accent[2]);
    doc.rect(x0, y, gridW, headH, "F");
    setF(c, "bold", 10, [255, 255, 255]);
    doc.text("TEAM", x0 + 3, y + 8);
    rounds.forEach((r, i) => {
      const cx = x0 + teamW + i * roundW + roundW / 2;
      const label = roundW > 26 ? "ROUND " + (i + 1) : "R" + (i + 1);
      doc.setFontSize(roundW > 20 ? 10 : 8.5);
      doc.text(label, cx, y + (r.name && roundW > 30 ? 6 : 8), { align: "center" });
      if (r.name && roundW > 30) {
        doc.setFontSize(6.5);
        let nm = r.name.toUpperCase();
        if (doc.getTextWidth(nm) > roundW - 4) nm = nm.slice(0, 14) + "…";
        doc.text(nm, cx, y + 10.5, { align: "center" });
        doc.setFontSize(10);
      }
    });
    if (tb) {
      setF(c, "bold", 9, [255, 255, 255]);
      doc.text("TB", x0 + teamW + rounds.length * roundW + tbW / 2, y + 8, { align: "center" });
    }
    setF(c, "bold", 10, [255, 255, 255]);
    doc.text("TOTAL", x0 + gridW - totalW / 2, y + 8, { align: "center" });

    /* zebra rows */
    for (let t = 0; t < teams; t++) {
      const ry = y + headH + t * rowH;
      if (t % 2 === 1) {
        doc.setFillColor(243, 243, 243);
        doc.rect(x0, ry, gridW, rowH, "F");
      }
      setF(c, "normal", 8, [170, 170, 170]);
      doc.text(String(t + 1), x0 + 3, ry + rowH / 2 + 1.2);
    }

    /* grid lines */
    doc.setDrawColor(120, 120, 120);
    doc.setLineWidth(0.25);
    for (let t = 0; t <= teams; t++) {
      const ry = y + headH + t * rowH;
      doc.line(x0, ry, x0 + gridW, ry);
    }
    const vXs = [x0, x0 + teamW];
    rounds.forEach((_, i) => vXs.push(x0 + teamW + (i + 1) * roundW));
    if (tb) vXs.push(x0 + teamW + rounds.length * roundW + tbW);
    vXs.push(x0 + gridW);
    vXs.forEach(vx => doc.line(vx, y, vx, y + gridH));
    doc.setLineWidth(0.6);
    doc.rect(x0, y, gridW, gridH, "S");

    applyFooters(c);
    return c.doc;
  }

  return {
    audit,
    host: s => packet(s, true),
    questions: s => packet(s, false),
    sheets: answerSheets,
    scores: scoreSheet
  };
})();
