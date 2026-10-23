/* ATLAS · Website: Willkommen. Verstreute Dateien fliegen zusammen und bilden das Wort ATLAS,
   danach erscheinen Karten-Pins mit Zahlen. Die Maus schiebt die Teilchen weg, sie kehren zurück. */
"use strict";
(() => {
  const cv = document.querySelector("#introFx");
  if (!cv) return;
  const ctx = cv.getContext("2d");
  const sec = cv.parentElement;
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const FILES = ["praesi_final_v2.pptx", "index.html", "backup (3).zip", "launch.ps1", "Notizen.md", "Lerndoku_M346.docx", "budget.xlsx",
    "server.py", "style.css", "Netzwerkplan.vsdx", "screenshot_0412.png", "README.md", "test_neu.js", "Kopie von Kopie.docx", "catalog.json",
    "deploy.yaml", "app.tsx", "Tower.rbxl", "Rapport_KW42.docx", "dump.sql"];
  const GLYPHS = "{}<>/#;=+*01ABCDEFGHIKLMNOPRSTUVWXYZ.";
  const ACC = [46, 196, 179];
  let W, H, dpr, parts = [], labels = [], pins = [], t0 = 0, word = null, mouse = { x: -999, y: -999 }, raf = 0, visible = true;

  // Zielpunkte: das Wort ATLAS auf einer unsichtbaren Leinwand abtasten
  function targets() {
    const off = document.createElement("canvas");
    const maxW = Math.min(W * (W < 700 ? 0.9 : 0.74), 1180);
    let size = 300;
    const o = off.getContext("2d");
    o.font = `700 ${size}px "Schibsted Grotesk", "Segoe UI", sans-serif`;
    size = Math.floor(size * maxW / o.measureText("ATLAS").width);
    off.width = Math.ceil(maxW) + 20;
    off.height = Math.ceil(size * 0.9);
    o.font = `700 ${size}px "Schibsted Grotesk", "Segoe UI", sans-serif`;
    o.textBaseline = "alphabetic";
    o.fillText("ATLAS", 10, size * 0.78);
    const img = o.getImageData(0, 0, off.width, off.height).data;
    const gap = W < 700 ? 4 : 6, pts = [];
    for (let y = 0; y < off.height; y += gap) {
      for (let x = 0; x < off.width; x += gap) {
        if (img[(y * off.width + x) * 4 + 3] > 140) pts.push([x, y]);
      }
    }
    const ox = (W - off.width) / 2, oy = H * (W < 700 ? 0.3 : 0.26);
    word = { x: ox + 10, y: oy, w: off.width - 20, h: off.height };
    return pts.map(([x, y]) => [x + ox, y + oy]);
  }

  function setup() {
    dpr = Math.min(2, devicePixelRatio || 1);
    W = sec.clientWidth; H = sec.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const tg = targets();
    parts = tg.map(([tx, ty], i) => ({
      x: 0, y: 0, x0: Math.random() * W, y0: Math.random() * H, tx, ty, vx: 0, vy: 0,
      d: 0.15 + (tx - word.x) / word.w * 0.9 + Math.random() * 0.35,  // Buchstaben bauen sich von links nach rechts
      g: Math.random() < 0.16 ? GLYPHS[(Math.random() * GLYPHS.length) | 0] : null,
      s: 1.6 + Math.random() * 1.6, a: Math.random() < 0.12,
    }));
    parts.forEach((p) => { p.x = p.x0; p.y = p.y0; });
    labels = FILES.map((f) => ({ f, x: Math.random() * W * 0.9, y: 40 + Math.random() * (H - 80), v: (Math.random() - 0.5) * 14, r: (Math.random() - 0.5) * 0.3 }));
  }

  // Karten-Pins rund um das Wort, mit Zahlen aus der Demo
  function placePins() {
    const box = sec.querySelector(".intro-pins");
    if (!box) return;
    // Pins stehen wie Ortsmarken auf den Buchstaben, die Beschriftung darüber (abwechselnd hoch und tief)
    const P = [[0.08, "24", "Projekte"], [0.3, "58", "Office-Dateien"], [0.7, "9", "Dev-Server"], [0.91, "6", "Live-Seiten"]];
    const small = W < 700, lift = small ? [34, 34] : [24, 70];
    box.innerHTML = (small ? [P[0], P[3]] : P).map(([px, n, l], i) => {
      const x = Math.min(W - 70, Math.max(70, word.x + px * word.w)), y = word.y + word.h * 0.12;
      return `<li style="left:${x}px;top:${y - lift[i % 2]}px;--stem:${lift[i % 2] - 4}px;--d:${0.15 + i * 0.16}s"><b>${n}</b><span>${l}</span></li>`;
    }).join("");
  }

  const ease = (k) => 1 - Math.pow(1 - Math.min(1, Math.max(0, k)), 3);

  let last = 0, formed = false;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (!visible) { last = now; return; }
    if (!t0) { t0 = now; last = now; }
    const t = (now - t0) / 1000, dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (!formed && t > 2.6) { formed = true; placePins(); sec.classList.add("formed"); }
    const decay = Math.exp(-dt * 5);
    ctx.clearRect(0, 0, W, H);
    // Dateinamen treiben herum und verblassen, während sich das Wort bildet
    const la = Math.max(0, 1 - t / 1.8);
    if (la > 0) {
      ctx.font = "500 13px 'IBM Plex Mono', monospace";
      for (const L of labels) {
        L.x += L.v * 0.016;
        ctx.save(); ctx.translate(L.x, L.y); ctx.rotate(L.r);
        ctx.fillStyle = `rgba(179,181,187,${0.55 * la})`;
        ctx.fillText(L.f, 0, 0);
        ctx.restore();
      }
    }
    ctx.font = "600 9px 'IBM Plex Mono', monospace";
    for (const p of parts) {
      const k = ease((t - p.d) / 1.1);
      // Feder zum Ziel + Abstossung von der Maus
      const gx = p.tx + (p.x0 - p.tx) * (1 - k), gy = p.ty + (p.y0 - p.ty) * (1 - k);
      // Position hängt nur von der Zeit ab (gleich schnell bei jeder Bildrate); die Maus schiebt nur einen Versatz weg
      const dx = gx + p.vx - mouse.x, dy = gy + p.vy - mouse.y, dist = Math.hypot(dx, dy);
      if (dist < 90 && dist > 0.1 && k > 0.95) { const f = (90 - dist) * 0.3; p.vx += (dx / dist) * f * dt * 8; p.vy += (dy / dist) * f * dt * 8; }
      p.vx *= decay; p.vy *= decay;
      p.x = gx + p.vx; p.y = gy + p.vy;
      const al = 0.25 + 0.75 * k;
      if (p.g) {
        ctx.fillStyle = p.a ? `rgba(${ACC},${al})` : `rgba(236,235,231,${al * 0.9})`;
        ctx.fillText(p.g, p.x - 2.5, p.y + 3);
      } else {
        ctx.fillStyle = p.a ? `rgba(${ACC},${al})` : `rgba(236,235,231,${al})`;
        ctx.fillRect(p.x, p.y, p.s, p.s);
      }
    }
  }

  function start() {
    cancelAnimationFrame(raf);
    t0 = 0; formed = false;
    setup();
    sec.classList.remove("formed");
    if (still) {  // Weniger Bewegung: gleich das fertige Bild zeigen
      for (const p of parts) { p.x = p.tx; p.y = p.ty; p.d = -9; }
      labels = [];
      placePins();
      sec.classList.add("formed", "still");
      frame(performance.now() + 99999);
      cancelAnimationFrame(raf);
      return;
    }
    raf = requestAnimationFrame(frame);
  }

  sec.addEventListener("pointermove", (e) => { const r = cv.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
  sec.addEventListener("pointerleave", () => { mouse.x = mouse.y = -999; });
  new IntersectionObserver((es) => { visible = es[0].isIntersecting; }).observe(sec);
  let rt;
  addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { if (Math.abs(sec.clientWidth - W) > 40) start(); }, 250); });
  Promise.all([document.fonts?.load('700 100px "Schibsted Grotesk"'), document.fonts?.load("500 13px 'IBM Plex Mono'")]).catch(() => {}).then(start);
})();
