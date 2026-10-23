/* ATLAS - Animierte Hintergründe in den Seitenköpfen: jede Seite / jeder Bereich hat einen eigenen Effekt */
"use strict";

const FX = { raf: 0, cur: null };
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789{}[]<>/=+*#$%&?";
function rgbOf(col) {
  const c = document.createElement("canvas").getContext("2d");
  c.fillStyle = col || "#9d8bff";
  const v = c.fillStyle;
  if (v[0] === "#") return [1, 3, 5].map((i) => parseInt(v.slice(i, i + 2), 16));
  return v.match(/\d+/g).slice(0, 3).map(Number);
}

// ------------------------------------------------------------ Effekte: init(w, h, o) -> Zustand, draw(ctx, w, h, t, dt, s, C)
// C(a) = Seitenfarbe mit Deckkraft a; o.words = passende Wörter (Projektnamen usw.)
const EFFECTS = {
  // Buchstaben-Feld: Wörter entschlüsseln sich aus Zufallszeichen, bleiben kurz und zerfallen wieder
  glyphs: {
    init(w, h, o) {
      const cw = 9.6, lh = 19, cols = Math.floor(w / cw), rows = Math.floor(h / lh);
      const cells = Array.from({ length: cols * rows }, () => ({ c: pick(GLYPHS), a: Math.random() < 0.35 ? rnd(0.06, 0.24) : 0, n: rnd(0, 3) }));
      return { cw, lh, cols, rows, cells, words: [], words0: (o.words || []).filter((x) => x && x.length < cols * 0.4), next: 0 };
    },
    draw(ctx, w, h, t, dt, s, C) {
      ctx.font = "600 13px Cascadia Code, Consolas, monospace";
      ctx.textBaseline = "top";
      for (let i = 0; i < s.cells.length; i++) {
        const cell = s.cells[i];
        if ((cell.n -= dt) < 0) { cell.c = pick(GLYPHS); cell.a = Math.random() < 0.35 ? rnd(0.06, 0.26) : 0; cell.n = rnd(0.6, 4); }
        if (cell.a > 0.01) { ctx.fillStyle = C(cell.a); ctx.fillText(cell.c, (i % s.cols) * s.cw, Math.floor(i / s.cols) * s.lh + 4); }
      }
      if (t > s.next && s.words.length < 6 && s.words0.length) {
        const txt = pick(s.words0).toUpperCase();
        const row = Math.floor(rnd(0, s.rows));
        const col = Math.floor(rnd(s.cols * 0.35, Math.max(s.cols * 0.36, s.cols - txt.length - 1)));
        if (!s.words.some((x) => x.row === row)) s.words.push({ txt, row, col, t0: t });
        s.next = t + rnd(0.5, 1.4);
      }
      ctx.save();
      ctx.shadowColor = C(0.9);
      for (const wd of s.words) {
        const age = t - wd.t0, n = wd.txt.length;
        for (let k = 0; k < n; k++) {
          const solved = age > 0.15 + k * 0.05 && age < 3.2 + k * 0.03;
          const gone = age > 3.6 + k * 0.03;
          if (gone) continue;
          const ch = solved ? wd.txt[k] : pick(GLYPHS);
          ctx.shadowBlur = solved ? 8 : 0;
          ctx.fillStyle = solved ? C(0.95) : C(0.45);
          ctx.fillText(ch, (wd.col + k) * s.cw, wd.row * s.lh + 4);
        }
      }
      ctx.restore();
      s.words = s.words.filter((x) => t - x.t0 < 4.4);
    },
  },
  // Code-Regen: Spalten aus Zeichen fallen, Kopf hell, Spur verblasst
  rain: {
    init(w, h) {
      const cw = 15, cols = Math.ceil(w / cw);
      return { cw, lh: 15, cols: Array.from({ length: cols }, () => ({ y: rnd(-h, h), v: rnd(28, 70), len: Math.floor(rnd(6, 16)), ch: Array.from({ length: 18 }, () => pick(GLYPHS)) })) };
    },
    draw(ctx, w, h, t, dt, s, C) {
      ctx.font = "500 12.5px Cascadia Code, Consolas, monospace";
      ctx.textBaseline = "top";
      s.cols.forEach((c, i) => {
        c.y += c.v * dt;
        if (c.y - c.len * s.lh > h) { c.y = rnd(-60, 0); c.v = rnd(28, 70); }
        if (Math.random() < 0.04) c.ch[Math.floor(rnd(0, c.ch.length))] = pick(GLYPHS);
        for (let k = 0; k < c.len; k++) {
          const y = c.y - k * s.lh;
          if (y < -s.lh || y > h) continue;
          ctx.fillStyle = k === 0 ? `rgba(255,255,255,.85)` : C(0.55 * (1 - k / c.len));
          ctx.fillText(c.ch[k % c.ch.length], i * s.cw, y);
        }
      });
    },
  },
  // Folien schweben nach oben (Präsentationen)
  slides: {
    init(w, h) {
      return { list: Array.from({ length: 11 }, () => ({ x: rnd(w * 0.3, w), y: rnd(0, h), z: rnd(0.45, 1.1), r: rnd(-0.2, 0.2), p: rnd(0, 6) })) };
    },
    draw(ctx, w, h, t, dt, s, C) {
      for (const sl of s.list.sort((a, b) => a.z - b.z)) {
        sl.y -= 10 * sl.z * dt;
        if (sl.y < -90) { sl.y = h + 60; sl.x = rnd(w * 0.3, w); }
        const W = 132 * sl.z, H = W * 0.5625;
        ctx.save();
        ctx.translate(sl.x + Math.sin(t * 0.4 + sl.p) * 14, sl.y);
        ctx.rotate(sl.r + Math.sin(t * 0.3 + sl.p) * 0.05);
        ctx.globalAlpha = 0.25 + sl.z * 0.45;
        ctx.fillStyle = C(0.08); ctx.strokeStyle = C(0.55); ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.roundRect(-W / 2, -H / 2, W, H, 5 * sl.z); ctx.fill(); ctx.stroke();
        ctx.fillStyle = C(0.7);
        ctx.fillRect(-W / 2 + 10 * sl.z, -H / 2 + 10 * sl.z, W * 0.5, 5 * sl.z);
        ctx.fillStyle = C(0.35);
        for (let k = 0; k < 3; k++) ctx.fillRect(-W / 2 + 10 * sl.z, -H / 2 + (24 + k * 9) * sl.z, W * (0.25 + ((k * 37) % 20) / 100), 3 * sl.z);
        ctx.fillStyle = C(0.18);
        ctx.fillRect(W * 0.1, -H / 2 + 22 * sl.z, W * 0.32, H * 0.5);
        ctx.restore();
      }
    },
  },
  // Tabelle: Zellen leuchten auf, Zahlen rollen, ein Auswahlrahmen wandert (Excel)
  cells: {
    init(w, h) {
      const cw = 70, ch = 22, x0 = Math.floor(w * 0.34), cols = Math.ceil((w - x0) / cw), rows = Math.ceil(h / ch);
      return { cw, ch, x0, cols, rows, lit: [], sel: { c: 1, r: 2, tc: 1, tr: 2, x: 0, y: 0 }, next: 0, nextSel: 0, formula: "" };
    },
    draw(ctx, w, h, t, dt, s, C) {
      ctx.strokeStyle = C(0.22); ctx.lineWidth = 1;
      for (let c = 0; c <= s.cols; c++) { ctx.beginPath(); ctx.moveTo(s.x0 + c * s.cw + 0.5, 0); ctx.lineTo(s.x0 + c * s.cw + 0.5, h); ctx.stroke(); }
      for (let r = 0; r <= s.rows; r++) { ctx.beginPath(); ctx.moveTo(s.x0, r * s.ch + 0.5); ctx.lineTo(w, r * s.ch + 0.5); ctx.stroke(); }
      ctx.font = "600 10.5px Segoe UI, sans-serif"; ctx.textBaseline = "middle"; ctx.textAlign = "center";
      ctx.fillStyle = C(0.35);
      for (let c = 0; c < s.cols; c++) ctx.fillText(String.fromCharCode(65 + c), s.x0 + c * s.cw + s.cw / 2, s.ch / 2);
      if (t > s.next) { s.lit.push({ c: Math.floor(rnd(0, s.cols)), r: Math.floor(rnd(1, s.rows)), t0: t, v: rnd(10, 9999) }); s.next = t + rnd(0.08, 0.3); }
      ctx.textAlign = "right"; ctx.font = "500 11.5px Cascadia Code, Consolas, monospace";
      for (const L of s.lit) {
        const age = t - L.t0, a = age < 0.3 ? age / 0.3 : Math.max(0, 1 - (age - 1.6) / 1.2);
        ctx.fillStyle = C(0.16 * a); ctx.fillRect(s.x0 + L.c * s.cw + 1, L.r * s.ch + 1, s.cw - 1, s.ch - 1);
        const val = age < 0.6 ? rnd(10, 9999) : L.v;
        ctx.fillStyle = C(0.85 * a); ctx.fillText(val.toFixed(age < 0.6 ? 0 : 2), s.x0 + L.c * s.cw + s.cw - 6, L.r * s.ch + s.ch / 2 + 1);
      }
      s.lit = s.lit.filter((L) => t - L.t0 < 3);
      const S2 = s.sel;
      if (t > s.nextSel) { S2.tc = Math.floor(rnd(0, s.cols)); S2.tr = Math.floor(rnd(1, s.rows)); s.nextSel = t + rnd(1.2, 2.2); s.formula = pick(["=SUMME(B2:B9)", "=MITTELWERT(C:C)", "=SVERWEIS(A2;D:E;2)", "=WENN(D4>0;\"ok\")", "=ANZAHL(A:A)"]); }
      S2.x += (s.x0 + S2.tc * s.cw - S2.x) * Math.min(1, dt * 8); S2.y += (S2.tr * s.ch - S2.y) * Math.min(1, dt * 8);
      ctx.strokeStyle = C(0.95); ctx.lineWidth = 2; ctx.strokeRect(S2.x + 1, S2.y + 1, s.cw - 2, s.ch - 2);
      ctx.fillStyle = C(0.95); ctx.fillRect(S2.x + s.cw - 5, S2.y + s.ch - 5, 5, 5);
      ctx.textAlign = "left"; ctx.font = "600 12px Cascadia Code, Consolas, monospace"; ctx.fillStyle = C(0.6);
      ctx.fillText("fx  " + s.formula.slice(0, Math.floor((t - (s.nextSel - 1.7)) * 18)), S2.x, Math.max(10, S2.y - 10));
    },
  },
  // Text wird Zeile für Zeile getippt (Dokumente, Schule)
  typing: {
    init(w, h, o) { return { x0: w * 0.42, lines: [], row: 0, t0: 0, words: o.words?.length ? o.words : ["Ausgangslage", "Auftrag", "Umsetzung", "Fazit"] }; },
    draw(ctx, w, h, t, dt, s, C) {
      const PH = ["Einleitung und Ausgangslage", "Ziel dieser Arbeit ist es,", "die Umsetzung zu dokumentieren.", "Im nächsten Schritt wurde", "getestet und ausgewertet.", "Fazit und Reflexion", "Was ich gelernt habe:"];
      const lh = 22, maxRows = Math.floor((h - 16) / lh);
      if (!s.lines.length || (s.lines[s.lines.length - 1].done && t - s.lines[s.lines.length - 1].tDone > 0.25)) {
        if (s.lines.length >= maxRows) { s.fade = s.fade || t; if (t - s.fade > 1) { s.lines = []; s.fade = 0; } }
        else s.lines.push({ txt: Math.random() < 0.3 ? pick(s.words) : pick(PH), t0: t, head: s.lines.length === 0 });
      }
      const fa = s.fade ? Math.max(0, 1 - (t - s.fade)) : 1;
      ctx.textBaseline = "top";
      s.lines.forEach((L, i) => {
        const n = Math.min(L.txt.length, Math.floor((t - L.t0) * 26));
        if (n >= L.txt.length && !L.done) { L.done = true; L.tDone = t; }
        ctx.font = L.head ? "700 16px Bahnschrift, Segoe UI, sans-serif" : "400 13.5px Segoe UI, sans-serif";
        ctx.fillStyle = C((L.head ? 0.95 : 0.7) * fa);
        const shown = L.txt.slice(0, n);
        ctx.fillText(shown, s.x0, 12 + i * lh);
        if (i === s.lines.length - 1 && Math.floor(t * 2.5) % 2 === 0) { ctx.fillStyle = C(0.95 * fa); ctx.fillRect(s.x0 + ctx.measureText(shown).width + 2, 12 + i * lh, 2, L.head ? 18 : 15); }
      });
    },
  },
  // Herzschlag-Linie (Monitor)
  ecg: {
    warm: 5,
    init(w) { return { buf: new Array(Math.ceil(w / 3) + 1).fill(0), acc: 0, beat: 0 }; },
    draw(ctx, w, h, t, dt, s, C) {
      const mid = h * 0.55;
      ctx.strokeStyle = C(0.07); ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 24) { ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, h); ctx.stroke(); }
      for (let y = 0; y < h; y += 24) { ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(w, y + 0.5); ctx.stroke(); }
      s.acc += dt * 46;
      while (s.acc >= 1) {
        s.acc -= 1; s.beat += 1;
        const p = s.beat % 64;
        // Herzschlag-Form aus Stützpunkten (Abstand in Samples, Höhe in px), dazwischen linear
        const K = [[0, 0], [22, 0], [25, 5], [28, 0], [31, 0], [33, -7], [36, 50], [39, -26], [42, 0], [48, 0], [53, 10], [58, 0], [64, 0]];
        let v = 0;
        for (let i = 1; i < K.length; i++) if (p <= K[i][0]) { const [x0, y0] = K[i - 1], [x1, y1] = K[i]; v = y0 + (y1 - y0) * (p - x0) / (x1 - x0); break; }
        v += (Math.random() - 0.5) * 1.2;
        s.buf.push(v); s.buf.shift();
      }
      ctx.save(); ctx.shadowColor = C(1); ctx.shadowBlur = 10; ctx.lineWidth = 2.4; ctx.lineJoin = "round";
      const grad = ctx.createLinearGradient(0, 0, w, 0); grad.addColorStop(0, C(0)); grad.addColorStop(0.85, C(0.9)); grad.addColorStop(1, "rgba(255,255,255,.95)");
      ctx.strokeStyle = grad; ctx.beginPath();
      s.buf.forEach((v, i) => { const x = i * 3, y = mid - v; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.stroke(); ctx.restore();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc((s.buf.length - 1) * 3, mid - s.buf[s.buf.length - 1], 3.5, 0, 7); ctx.fill();
    },
  },
  // Knoten-Netz mit wandernden Funken (Automationen, Notizen, Plattform)
  graph: {
    init(w, h, o) {
      const n = o.labels ? 16 : 22;
      const nodes = Array.from({ length: n }, (_, i) => ({ x: rnd(w * 0.32, w - 20), y: rnd(16, h - 16), vx: rnd(-6, 6), vy: rnd(-5, 5), r: rnd(2.5, 5), p: 0, label: o.labels ? pick(o.words || [""]) : "" }));
      return { nodes, sparks: [], next: 0, labels: o.labels, w0: w * 0.32 };
    },
    draw(ctx, w, h, t, dt, s, C) {
      const N = s.nodes;
      for (const a of N) {
        a.x += a.vx * dt; a.y += a.vy * dt;
        if (a.x < s.w0 || a.x > w - 10) a.vx *= -1;
        if (a.y < 10 || a.y > h - 10) a.vy *= -1;
        a.p = Math.max(0, a.p - dt * 1.5);
      }
      const edges = [];
      for (let i = 0; i < N.length; i++) for (let j = i + 1; j < N.length; j++) {
        const d = Math.hypot(N[i].x - N[j].x, N[i].y - N[j].y);
        if (d < 150) { edges.push([i, j]); ctx.strokeStyle = C(0.28 * (1 - d / 150)); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(N[i].x, N[i].y); ctx.lineTo(N[j].x, N[j].y); ctx.stroke(); }
      }
      if (!s.labels && t > s.next && edges.length) { const [a, b] = pick(edges); s.sparks.push({ a, b, k: 0 }); s.next = t + rnd(0.1, 0.35); }
      ctx.save(); ctx.shadowColor = C(1); ctx.shadowBlur = 12;
      for (const sp of s.sparks) {
        sp.k += dt * 1.6;
        const A = N[sp.a], B = N[sp.b];
        for (let q = 0; q < 6; q++) {
          const k = sp.k - q * 0.04; if (k < 0 || k > 1) continue;
          ctx.fillStyle = q ? C(0.5 - q * 0.08) : "rgba(255,255,255,.95)";
          ctx.beginPath(); ctx.arc(A.x + (B.x - A.x) * k, A.y + (B.y - A.y) * k, q ? 2 : 2.6, 0, 7); ctx.fill();
        }
        if (sp.k >= 1 && !sp.hit) { sp.hit = true; B.p = 1; }
      }
      s.sparks = s.sparks.filter((x) => x.k < 1.3);
      for (const a of N) {
        ctx.fillStyle = C(0.55 + a.p * 0.45); ctx.beginPath(); ctx.arc(a.x, a.y, a.r + a.p * 3, 0, 7); ctx.fill();
      }
      ctx.restore();
      if (s.labels) {
        ctx.font = "500 11px Segoe UI, sans-serif"; ctx.textBaseline = "middle"; ctx.fillStyle = C(0.6);
        for (const a of N) if (a.label) ctx.fillText(a.label.slice(0, 22), a.x + 8, a.y);
      }
    },
  },
  // Beitrags-Kästchen wie auf GitHub, Wellen von Commits
  contrib: {
    init(w, h) { const sz = 12, gap = 4, rows = Math.floor((h - 10) / (sz + gap)), x0 = w * 0.36; return { sz, gap, rows, x0, cols: Math.ceil((w - x0) / (sz + gap)), pops: [] }; },
    draw(ctx, w, h, t, dt, s, C) {
      const st = s.sz + s.gap, y0 = (h - s.rows * st) / 2;
      if (Math.random() < dt * 6) s.pops.push({ c: Math.floor(rnd(0, s.cols)), r: Math.floor(rnd(0, s.rows)), t0: t });
      for (let c = 0; c < s.cols; c++) for (let r = 0; r < s.rows; r++) {
        const wave = Math.sin(c * 0.35 - t * 1.6 + Math.sin(r * 0.9 + c * 0.1) * 1.4);
        let lv = wave > 0.75 ? 4 : wave > 0.4 ? 3 : wave > 0 ? 2 : wave > -0.5 ? 1 : 0;
        const pop = s.pops.find((p) => p.c === c && p.r === r);
        const a = [0.04, 0.12, 0.24, 0.42, 0.66][lv] + (pop ? Math.max(0, 1 - (t - pop.t0)) * 0.6 : 0);
        ctx.fillStyle = pop && t - pop.t0 < 0.4 ? "rgba(255,255,255,.9)" : C(Math.min(1, a));
        ctx.beginPath(); ctx.roundRect(s.x0 + c * st, y0 + r * st, s.sz, s.sz, 3); ctx.fill();
      }
      s.pops = s.pops.filter((p) => t - p.t0 < 1);
    },
  },
  // Drehende 3D-Würfel steigen auf (Roblox, Spiele)
  cubes: {
    init(w, h) { return { list: Array.from({ length: 12 }, () => ({ x: rnd(w * 0.32, w), y: rnd(0, h), z: rnd(0.5, 1.2), a: rnd(0, 6), va: rnd(-0.8, 0.8), b: rnd(0.4, 0.8) })) }; },
    draw(ctx, w, h, t, dt, s, C) {
      const V = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]];
      const F = [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [2, 3, 7, 6], [1, 2, 6, 5], [0, 3, 7, 4]];
      for (const q of s.list.sort((a, b) => a.z - b.z)) {
        q.y -= 12 * q.z * dt; q.a += q.va * dt;
        if (q.y < -50) { q.y = h + 40; q.x = rnd(w * 0.32, w); }
        const size = 15 * q.z, ca = Math.cos(q.a), sa = Math.sin(q.a), cb = Math.cos(q.b), sb = Math.sin(q.b);
        const P = V.map(([x, y, z]) => { const x1 = x * ca + z * sa, z1 = -x * sa + z * ca; const y1 = y * cb - z1 * sb, z2 = y * sb + z1 * cb; return [q.x + x1 * size, q.y + y1 * size, z2]; });
        const faces = F.map((f) => ({ f, z: f.reduce((a, i) => a + P[i][2], 0) / 4 })).sort((a, b) => a.z - b.z);
        faces.slice(3).forEach(({ f }, k) => {
          ctx.beginPath(); f.forEach((i, j) => (j ? ctx.lineTo(P[i][0], P[i][1]) : ctx.moveTo(P[i][0], P[i][1]))); ctx.closePath();
          ctx.fillStyle = C((0.1 + k * 0.1) * q.z); ctx.fill(); ctx.strokeStyle = C(0.6 * q.z); ctx.lineWidth = 1; ctx.stroke();
        });
      }
    },
  },
  // Chat-Blasen steigen auf, eine tippt gerade (Discord)
  bubbles: {
    warm: 5,
    init() { return { list: [], next: 0, side: 0 }; },
    draw(ctx, w, h, t, dt, s, C) {
      if (t > s.next) { s.side ^= 1; s.list.push({ y: h + 30, w: rnd(90, 200), lines: Math.random() < 0.4 ? 2 : 1, side: s.side, typing: Math.random() < 0.25, t0: t }); s.next = t + rnd(0.9, 1.6); }
      for (const b of s.list) {
        b.y -= 22 * dt;
        const x = b.side ? w - b.w - 40 : w * 0.45, H = b.typing ? 30 : 16 + b.lines * 12, a = Math.min(1, b.y / 50, (h + 30 - b.y) / 30);
        if (a <= 0) continue;
        ctx.globalAlpha = a;
        ctx.fillStyle = C(0.5); ctx.beginPath(); ctx.arc(b.side ? w - 22 : x - 18, b.y + H - 8, 9, 0, 7); ctx.fill();
        ctx.fillStyle = b.side ? C(0.28) : C(0.12); ctx.strokeStyle = C(0.45);
        ctx.beginPath(); ctx.roundRect(x, b.y, b.typing ? 52 : b.w, H, 12); ctx.fill(); ctx.stroke();
        ctx.fillStyle = C(0.75);
        if (b.typing) for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(x + 15 + k * 11, b.y + 15 + Math.sin(t * 7 - k) * 3, 3, 0, 7); ctx.fill(); }
        else for (let k = 0; k < b.lines; k++) ctx.fillRect(x + 12, b.y + 10 + k * 12, (b.w - 24) * (k ? 0.6 : 1), 4);
        ctx.globalAlpha = 1;
      }
      s.list = s.list.filter((b) => b.y > -60);
    },
  },
  // Briefumschläge fliegen mit Spur über den Kopf (E-Mails)
  planes: {
    warm: 5,
    init() { return { list: [], next: 0 }; },
    draw(ctx, w, h, t, dt, s, C) {
      if (t > s.next) { s.list.push({ x: w * 0.25, y0: rnd(25, h - 25), amp: rnd(8, 26), f: rnd(1.2, 2.4), v: rnd(70, 130), sz: rnd(0.8, 1.3), trail: [] }); s.next = t + rnd(0.7, 1.4); }
      for (const p of s.list) {
        p.x += p.v * dt;
        const y = p.y0 + Math.sin(p.x / 60 * p.f) * p.amp;
        p.trail.push([p.x, y]); if (p.trail.length > 40) p.trail.shift();
        ctx.setLineDash([3, 5]); ctx.strokeStyle = C(0.35); ctx.lineWidth = 1.2; ctx.beginPath();
        p.trail.forEach(([x, yy], i) => (i ? ctx.lineTo(x - 12, yy) : ctx.moveTo(x - 12, yy))); ctx.stroke(); ctx.setLineDash([]);
        const W = 22 * p.sz, H = 15 * p.sz;
        ctx.save(); ctx.translate(p.x, y); ctx.rotate(Math.cos(p.x / 60 * p.f) * 0.25);
        ctx.fillStyle = C(0.22); ctx.strokeStyle = C(0.9); ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.roundRect(-W / 2, -H / 2, W, H, 2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-W / 2, -H / 2); ctx.lineTo(0, 1.5); ctx.lineTo(W / 2, -H / 2); ctx.stroke();
        ctx.restore();
      }
      s.list = s.list.filter((p) => p.x < w + 40);
    },
  },
  // Pegel-Balken + Verlaufslinie (System)
  bars: {
    init(w, h) { return { n: 34, x0: w * 0.38, hist: new Array(120).fill(h * 0.5) }; },
    draw(ctx, w, h, t, dt, s, C) {
      const bw = (w - s.x0) / s.n;
      for (let i = 0; i < s.n; i++) {
        const v = (Math.sin(t * 2.1 + i * 0.5) * 0.5 + 0.5) * (Math.sin(t * 0.7 + i * 0.23) * 0.35 + 0.65) * (0.6 + 0.4 * Math.sin(t * 5 + i * 1.7));
        const bh = v * h * 0.75, x = s.x0 + i * bw;
        const g = ctx.createLinearGradient(0, h, 0, h - bh); g.addColorStop(0, C(0.15)); g.addColorStop(1, C(0.7));
        ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(x + 2, h - bh, bw - 4, bh, 3); ctx.fill();
        ctx.fillStyle = C(0.95); ctx.fillRect(x + 2, h - bh - 4, bw - 4, 2);
      }
      s.hist.push(h * 0.35 + Math.sin(t * 1.3) * h * 0.12 + Math.sin(t * 3.7) * h * 0.05); s.hist.shift();
      ctx.save(); ctx.strokeStyle = "rgba(255,255,255,.75)"; ctx.shadowColor = C(1); ctx.shadowBlur = 8; ctx.lineWidth = 1.6; ctx.beginPath();
      s.hist.forEach((y, i) => { const x = s.x0 + (i / (s.hist.length - 1)) * (w - s.x0); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.stroke(); ctx.restore();
    },
  },
  // Oszilloskop-Wellen (Steuerung)
  waves: {
    init() { return {}; },
    draw(ctx, w, h, t, dt, s, C) {
      const x0 = w * 0.3;
      for (let k = 0; k < 4; k++) {
        ctx.save(); ctx.strokeStyle = k ? C(0.55 - k * 0.1) : "rgba(255,255,255,.85)"; ctx.shadowColor = C(1); ctx.shadowBlur = k ? 0 : 10; ctx.lineWidth = k ? 1.3 : 2;
        ctx.beginPath();
        for (let x = x0; x <= w; x += 3) {
          const u = (x - x0) / (w - x0);
          const y = h / 2 + Math.sin(u * (8 + k * 3) - t * (2 + k * 0.6)) * h * 0.28 * Math.sin(u * Math.PI) * (1 - k * 0.18) + Math.sin(u * 31 + t * 4) * 2;
          x === x0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke(); ctx.restore();
      }
    },
  },
  // Dateien werden in einen Wirbel gesogen (Aufräumen)
  sweep: {
    init(w, h) { return { cx: w * 0.78, cy: h / 2, list: Array.from({ length: 70 }, () => ({ r: rnd(30, w * 0.45), a: rnd(0, 6.3), s: rnd(3, 7) })) }; },
    draw(ctx, w, h, t, dt, s, C) {
      for (const p of s.list) {
        p.a += dt * (60 / (p.r + 20)); p.r -= dt * (14 + 900 / (p.r + 30));
        if (p.r < 6) { p.r = rnd(w * 0.3, w * 0.5); p.a = rnd(0, 6.3); }
        const x = s.cx + Math.cos(p.a) * p.r, y = s.cy + Math.sin(p.a) * p.r * 0.45, sz = p.s * Math.min(1, p.r / 120);
        ctx.save(); ctx.translate(x, y); ctx.rotate(p.a * 2);
        ctx.fillStyle = C(0.2 + 0.6 * (1 - Math.min(1, p.r / 300))); ctx.fillRect(-sz / 2, -sz * 0.65, sz, sz * 1.3);
        ctx.restore();
      }
      const g = ctx.createRadialGradient(s.cx, s.cy, 0, s.cx, s.cy, 40); g.addColorStop(0, "rgba(255,255,255,.6)"); g.addColorStop(0.3, C(0.5)); g.addColorStop(1, C(0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s.cx, s.cy, 40, 0, 7); ctx.fill();
    },
  },
  // Zeitstrahl läuft, Ereignisse tauchen auf (Zeitachse)
  timeline: {
    warm: 5,
    init(w, h, o) { return { off: 0, ev: [], next: 0, words: o.words || [] }; },
    draw(ctx, w, h, t, dt, s, C) {
      const y = h * 0.55, now = w * 0.82;
      s.off += dt * 40;
      ctx.strokeStyle = C(0.35); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(w * 0.3, y); ctx.lineTo(w, y); ctx.stroke();
      ctx.fillStyle = C(0.4);
      for (let x = w - (s.off % 20); x > w * 0.3; x -= 20) ctx.fillRect(x, y - (Math.round((x + s.off) / 20) % 5 ? 3 : 7), 1, Math.round((x + s.off) / 20) % 5 ? 6 : 14);
      if (t > s.next) { s.ev.push({ x: now, up: Math.random() < 0.5, l: rnd(40, 110), txt: pick(s.words.length ? s.words : ["commit", "deploy", "abgabe"]), t0: t }); s.next = t + rnd(1.3, 2.3); }
      ctx.font = "500 11px Segoe UI, sans-serif"; ctx.textBaseline = "middle";
      for (const e of s.ev) {
        e.x -= dt * 40;
        const a = Math.min(1, (t - e.t0) * 3, (e.x - w * 0.3) / 80), yy = e.up ? y - 28 : y + 28;
        if (a <= 0) continue;
        ctx.strokeStyle = C(0.4 * a); ctx.beginPath(); ctx.moveTo(e.x, y); ctx.lineTo(e.x, yy); ctx.stroke();
        ctx.fillStyle = C(0.9 * a); ctx.beginPath(); ctx.arc(e.x, y, 3.5, 0, 7); ctx.fill();
        ctx.fillStyle = C(0.6 * a); ctx.fillText(e.txt.slice(0, 16), e.x + 6, yy);
      }
      s.ev = s.ev.filter((e) => e.x > w * 0.25);
      ctx.save(); ctx.strokeStyle = "rgba(255,255,255,.8)"; ctx.shadowColor = C(1); ctx.shadowBlur = 10; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(now, 8); ctx.lineTo(now, h - 8); ctx.stroke(); ctx.restore();
    },
  },
  // Karten wandern durch Spalten und werden abgehakt (Bewerbungen)
  kanban: {
    warm: 5,
    init(w, h) { const cols = 4, x0 = w * 0.4, cw = (w - x0 - 20) / cols; return { cols, x0, cw, cards: [], next: 0 }; },
    draw(ctx, w, h, t, dt, s, C) {
      for (let c = 0; c < s.cols; c++) { ctx.strokeStyle = C(0.15); ctx.setLineDash([4, 4]); ctx.strokeRect(s.x0 + c * s.cw + 6, 8, s.cw - 12, h - 16); }
      ctx.setLineDash([]);
      if (t > s.next) { s.cards.push({ col: 0, x: s.x0 + 12, y: rnd(16, h - 40), t0: t, step: t }); s.next = t + rnd(1, 1.8); }
      for (const k of s.cards) {
        if (t - k.step > 1.3 && k.col < s.cols - 1) { k.col++; k.step = t; k.ty = rnd(16, h - 40); }
        const tx = s.x0 + k.col * s.cw + 12; k.x += (tx - k.x) * Math.min(1, dt * 5); k.y += ((k.ty ?? k.y) - k.y) * Math.min(1, dt * 5);
        const a = k.col === s.cols - 1 ? Math.max(0, 1 - (t - k.step - 0.8) / 0.8) : 1;
        ctx.globalAlpha = a;
        ctx.fillStyle = C(0.2); ctx.strokeStyle = C(0.6); ctx.beginPath(); ctx.roundRect(k.x, k.y, s.cw - 24, 24, 6); ctx.fill(); ctx.stroke();
        ctx.fillStyle = C(0.7); ctx.fillRect(k.x + 8, k.y + 8, (s.cw - 40) * 0.6, 3); ctx.fillRect(k.x + 8, k.y + 14, (s.cw - 40) * 0.35, 3);
        if (k.col === s.cols - 1) { ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(k.x + s.cw - 44, k.y + 12); ctx.lineTo(k.x + s.cw - 39, k.y + 17); ctx.lineTo(k.x + s.cw - 31, k.y + 7); ctx.stroke(); ctx.lineWidth = 1; }
        ctx.globalAlpha = 1;
      }
      s.cards = s.cards.filter((k) => !(k.col === s.cols - 1 && t - k.step > 1.6));
    },
  },
  // Suchstrahl gleitet über Code-Zeilen und markiert Treffer (Code-Suche)
  scan: {
    init(w, h) { return { lines: Array.from({ length: Math.floor(h / 16) }, () => Array.from({ length: 6 }, () => ({ w: rnd(20, 80), hit: Math.random() < 0.12 }))) }; },
    draw(ctx, w, h, t, dt, s, C) {
      const bx = w * 0.35 + ((t * 120) % (w * 0.75));
      s.lines.forEach((L, r) => {
        let x = w * 0.36 + (r % 3) * 18;
        for (const seg of L) {
          const lit = seg.hit && bx > x;
          ctx.fillStyle = lit ? C(0.85) : C(0.16);
          ctx.beginPath(); ctx.roundRect(x, 8 + r * 16, seg.w, 6, 3); ctx.fill();
          x += seg.w + 8;
        }
      });
      const g = ctx.createLinearGradient(bx - 60, 0, bx, 0); g.addColorStop(0, C(0)); g.addColorStop(1, C(0.35));
      ctx.fillStyle = g; ctx.fillRect(bx - 60, 0, 60, h);
      ctx.fillStyle = "rgba(255,255,255,.8)"; ctx.fillRect(bx, 0, 1.5, h);
    },
  },
  // Funkelnde Sterne, die sich zu Sternbildern verbinden (Favoriten, Freizeit)
  stars: {
    init(w, h) { return { list: Array.from({ length: 60 }, () => ({ x: rnd(w * 0.3, w), y: rnd(0, h), r: rnd(0.6, 2.2), p: rnd(0, 6) })), con: [], next: 0 }; },
    draw(ctx, w, h, t, dt, s, C) {
      if (t > s.next) {
        const pts = [pick(s.list)];
        for (let k = 0; k < 4; k++) {
          const last = pts[pts.length - 1];
          const nb = s.list.filter((b) => !pts.includes(b)).map((b) => [b, Math.hypot(last.x - b.x, last.y - b.y)]).filter(([, d]) => d < 120).sort((x, y) => x[1] - y[1])[0];
          if (!nb) break;
          pts.push(nb[0]);
        }
        s.con.push({ pts, t0: t }); s.next = t + rnd(1.2, 2.2);
      }
      for (const c of s.con) {
        const age = t - c.t0, a = Math.min(1, age) * Math.max(0, 1 - (age - 2.5) / 1);
        ctx.strokeStyle = C(0.45 * a); ctx.lineWidth = 1; ctx.beginPath();
        c.pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke();
      }
      s.con = s.con.filter((c) => t - c.t0 < 3.6);
      ctx.save(); ctx.shadowColor = C(1);
      for (const st of s.list) {
        const tw = 0.5 + 0.5 * Math.sin(t * 2 + st.p * 3);
        ctx.shadowBlur = 6 * tw; ctx.fillStyle = tw > 0.85 ? "rgba(255,255,255,.95)" : C(0.35 + tw * 0.5);
        ctx.beginPath(); ctx.arc(st.x, st.y, st.r * (0.7 + tw * 0.5), 0, 7); ctx.fill();
      }
      ctx.restore();
    },
  },
};

// Radar: ein Strahl kreist, Geräte leuchten auf, wenn er sie trifft (Netzwerk)
EFFECTS.radar = {
  init(w, h) { return { cx: w * 0.78, cy: h / 2, R: Math.max(h * 1.4, 160), blips: Array.from({ length: 16 }, () => ({ a: rnd(0, 6.283), r: rnd(0.15, 0.95), hit: -9 })) }; },
  draw(ctx, w, h, t, dt, s, C) {
    const ang = (t * 1.4) % 6.283;
    ctx.strokeStyle = C(0.22); ctx.lineWidth = 1;
    for (let k = 1; k <= 4; k++) { ctx.beginPath(); ctx.arc(s.cx, s.cy, (s.R * k) / 4, 0, 6.283); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(s.cx - s.R, s.cy); ctx.lineTo(s.cx + s.R, s.cy); ctx.moveTo(s.cx, s.cy - s.R); ctx.lineTo(s.cx, s.cy + s.R); ctx.stroke();
    for (let k = 0; k < 24; k++) {
      const a0 = ang - k * 0.03;
      ctx.fillStyle = C(0.22 * (1 - k / 24)); ctx.beginPath(); ctx.moveTo(s.cx, s.cy); ctx.arc(s.cx, s.cy, s.R, a0 - 0.03, a0); ctx.closePath(); ctx.fill();
    }
    ctx.save(); ctx.shadowColor = C(1); ctx.shadowBlur = 10;
    for (const b of s.blips) {
      const d = ((ang - b.a) % 6.283 + 6.283) % 6.283;
      if (d < 0.05) b.hit = t;
      const a = Math.max(0, 1 - (t - b.hit) / 2.2);
      if (a <= 0) continue;
      const x = s.cx + Math.cos(b.a) * b.r * s.R, y = s.cy + Math.sin(b.a) * b.r * s.R;
      ctx.fillStyle = a > 0.9 ? "rgba(255,255,255,.95)" : C(a); ctx.beginPath(); ctx.arc(x, y, 3 + a * 2, 0, 6.283); ctx.fill();
    }
    ctx.restore();
  },
};

// ------------------------------------------------------------ Welche Seite bekommt welchen Effekt
const FX_PAGE = { fav: "stars", grep: "scan", control: "waves", automations: "graph", system: "bars", storage: "sweep", monitor: "ecg",
  roblox: "cubes", github: "contrib", timeline: "timeline", apply: "kanban", mail: "planes", discord: "bubbles", notes: "graph",
  net: "radar", hosts: "graph", report: "typing", inventory: "scan" };
const FX_SECTION = { plattform: "graph", apps: "rain", games: "cubes", web: "rain", tools: "rain", schule: "typing", praesentationen: "slides",
  excel: "cells", dokumente: "typing", officeweitere: "graph", karriere: "kanban", freizeit: "stars" };
function fxFor(route) {
  const [a, b] = route.parts;
  const names = (list) => list.map((p) => p.name);
  if (a === "s" && S.sec[b]) {
    const top = secChain(b)[0]?.id;
    const list = []; const col = (x) => { list.push(...x.projects); x.children.forEach(col); }; col(S.sec[b]);
    const words = names(list).concat(S.sec[b].children.map((c) => c.name));
    return { kind: FX_SECTION[top] || "glyphs", words };
  }
  if (a === "notes") return { kind: "graph", labels: true, words: ["Modul 346", "ATLAS", "Lernjournal", "Ideen", "Bewerbung", "Projektwoche", "Notizen", "Hermes", "Cloud", "Kubernetes"] };
  if (a === "timeline") return { kind: "timeline", words: names(allProjects()) };
  if (a === "unsorted") return { kind: "glyphs", words: S.data.unsorted.map((u) => u.name).concat(names(allProjects())) };
  if (a === "recent") return { kind: "glyphs", words: names([...allProjects()].sort((x, y) => (y.scan.last || 0) - (x.scan.last || 0)).slice(0, 20)) };
  return { kind: FX_PAGE[a] || "glyphs", words: names(allProjects()) };
}

function startFx(head) {
  cancelAnimationFrame(FX.raf);
  const cv = document.createElement("canvas");
  cv.className = "head-fx";
  cv.setAttribute("aria-hidden", "true");
  head.prepend(cv);
  const opt = fxFor(parseRoute());
  const eff = EFFECTS[opt.kind] || EFFECTS.glyphs;
  const [r, g, b] = rgbOf(getComputedStyle(head).getPropertyValue("--sc").trim());
  const C = (a) => `rgba(${r},${g},${b},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
  const ctx = cv.getContext("2d");
  let w = 0, h = 0, st = null, last = performance.now(), t = 0;
  const size = () => {
    const dpr = (window.devicePixelRatio || 1) * (LOOK.zoom || 1);
    w = head.clientWidth; h = head.clientHeight;
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    st = eff.init(w, h, opt);
    // Effekte, die erst «anlaufen» müssen, vorab ein paar Sekunden simulieren
    for (let i = 0; i < (eff.warm || 0) * 15; i++) { t += 1 / 15; eff.draw(ctx, w, h, t, 1 / 15, st, C); }
    ctx.clearRect(0, 0, w, h);
  };
  size();
  const still = LOOK.motion === "aus" || matchMedia("(prefers-reduced-motion: reduce)").matches;
  FX.cur = cv;
  const frame = (now) => {
    if (!cv.isConnected) return;
    FX.raf = requestAnimationFrame(frame);
    if (document.hidden) { last = now; return; }
    const dt = Math.min(0.05, (now - last) / 1000);
    if (dt < 1 / 50) return;  // ~45 Bilder pro Sekunde reichen
    last = now; t += dt;
    if (Math.abs(head.clientWidth - w) > 2 || Math.abs(head.clientHeight - h) > 2) size();
    ctx.clearRect(0, 0, w, h);
    eff.draw(ctx, w, h, t, dt, st, C);
  };
  if (still) { for (let i = 0; i < 90; i++) { t += 1 / 30; ctx.clearRect(0, 0, w, h); eff.draw(ctx, w, h, t, 1 / 30, st, C); } return; }
  FX.raf = requestAnimationFrame(frame);
}

// Titel «entschlüsselt» sich beim Öffnen einer Seite
function decodeTitle(el) {
  if (!el || LOOK.motion === "aus" || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const final = el.textContent, t0 = performance.now();
  const step = (now) => {
    const k = (now - t0) / 650;
    if (k >= 1 || !el.isConnected) { el.textContent = final; return; }
    el.textContent = [...final].map((ch, i) => (ch === " " || i / final.length < k * 1.15 - 0.15 ? ch : pick(GLYPHS))).join("");
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
