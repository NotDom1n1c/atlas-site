/* ATLAS - Darstellung: Akzentfarben, Banner, Grösse, Kontrast, GUI-Versionen, Kopfzeilen, Tastatur */
"use strict";

const ACCENTS = [
  ["violett", "Violett", "#9d8bff", "#d272ff"], ["ocean", "Ocean", "#4cc2ff", "#6d7bff"], ["aurora", "Aurora", "#3fe0a5", "#2cb5e0"],
  ["sunset", "Sunset", "#ff8f5e", "#ff4f9a"], ["gold", "Gold (alt)", "#f2b84b", "#f28b4b"],
];
const saveLook = () => { const { banner, ...rest } = LOOK; store.set("look", rest); };
function applyLook() {
  const el = document.documentElement;
  el.dataset.accent = LOOK.accent;
  el.dataset.contrast = LOOK.contrast;
  el.dataset.motion = LOOK.motion;
  document.body.style.zoom = LOOK.zoom === 1 ? "" : LOOK.zoom;
  el.style.setProperty("--zoom", LOOK.zoom);
}
applyLook();

// ------------------------------------------------------------ Kopfzeilen: Oberzeile + grosses Hintergrund-Symbol
const HEAD_GROUP = {
  all: "Bibliothek", fav: "Bibliothek", recent: "Bibliothek", unsorted: "Bibliothek", grep: "Suche",
  control: "Steuern", automations: "Steuern", system: "Steuern", storage: "Steuern",
  monitor: "Überwachen", roblox: "Überwachen", github: "Überwachen", timeline: "Überwachen",
  net: "IT-Werkzeuge", hosts: "IT-Werkzeuge", report: "IT-Werkzeuge", inventory: "IT-Werkzeuge",
  apply: "Kommunikation", mail: "Kommunikation", discord: "Kommunikation", notes: "Kommunikation",
};
function decorateHeads() {
  const head = $("#main .page-head");
  if (!head || head.dataset.deco) return;
  head.dataset.deco = "1";
  const [a, b] = parseRoute().parts;
  let eb = HEAD_GROUP[a] || "";
  if (a === "s" && S.sec[b]) {
    const chain = secChain(b).slice(0, -1).map((x) => esc(x.name));
    eb = chain.length ? `Bereich <em>${chain.join(" › ")}</em>` : "Hauptbereich";
  }
  const title = head.querySelector(".page-title");
  if (eb && title) title.insertAdjacentHTML("beforebegin", `<div class="eyebrow">${eb}</div>`);
  // echtes Programm-Symbol statt Linien-Symbol (PowerPoint, Excel, Word, Outlook, Discord, GitHub …)
  const app = a === "s" ? secApp(b) : APPICON[a];
  const big = head.querySelector(".big-ico");
  if (app && big) { big.classList.add("app"); big.innerHTML = appImg(app); }
  startFx(head);
  decodeTitle(title);
}
new MutationObserver(decorateHeads).observe($("#main"), { childList: true, subtree: true });

// ------------------------------------------------------------ Banner der Startseite
async function setBanner(file) {
  if (!file || !file.type.startsWith("image/")) return toast("Das ist kein Bild", true);
  const data = await new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(file); });
  toast("Banner wird gespeichert…");
  const r = await ccPost("banner", { data });
  if (r.error) return toast(r.error, true);
  LOOK.banner = r.banner;
  refreshBanner();
  toast("Banner gesetzt");
}
async function removeBanner() {
  await ccPost("banner", { remove: true });
  LOOK.banner = 0;
  refreshBanner();
}
function refreshBanner() {
  if (!parseRoute().parts.length) render(true);
  const prev = $("#bannerPrev");
  if (prev) {
    prev.classList.toggle("has", !!LOOK.banner);
    prev.style.backgroundImage = LOOK.banner ? `url('/api/c/banner?v=${LOOK.banner}')` : "";
    prev.style.backgroundPosition = `center ${LOOK.pos}%`;
    prev.innerHTML = LOOK.banner ? "" : "Bild hierher ziehen, einfügen (Ctrl+V) oder auswählen";
    $("#bannerDel").hidden = !LOOK.banner;
  }
}
const pickImage = () => new Promise((ok) => {
  const inp = Object.assign(document.createElement("input"), { type: "file", accept: "image/*" });
  inp.onchange = () => ok(inp.files[0]);
  inp.click();
});
// Bild auf den Hero ziehen oder auf der Startseite einfügen
document.addEventListener("dragover", (e) => { const h = e.target.closest?.("#hero, #bannerPrev"); if (h && e.dataTransfer.types.includes("Files")) { e.preventDefault(); h.classList.add("drag"); } });
document.addEventListener("dragleave", (e) => e.target.closest?.("#hero, #bannerPrev")?.classList.remove("drag"));
document.addEventListener("drop", (e) => {
  const h = e.target.closest?.("#hero, #bannerPrev");
  if (!h) return;
  e.preventDefault();
  h.classList.remove("drag");
  setBanner(e.dataTransfer.files[0]);
});
document.addEventListener("paste", (e) => {
  const inLook = !!$("#bannerPrev");
  const onHome = !parseRoute().parts.length && $("#modal").hidden;
  if (!inLook && !onHome) return;
  if (/^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName)) return;
  const f = [...(e.clipboardData?.files || [])].find((x) => x.type.startsWith("image/"));
  if (f) { e.preventDefault(); setBanner(f); }
});

// ------------------------------------------------------------ Darstellung (Einstellungen)
const seg = (name, cur, opts) => `<div class="seg-pick" role="radiogroup">${opts.map(([v, l, ic]) => `<button type="button" role="radio" aria-checked="${String(v) === String(cur)}" class="${String(v) === String(cur) ? "on" : ""}" data-look="${name}" data-v="${v}">${ic ? icon(ic) : ""}${l}</button>`).join("")}</div>`;
const sw = (name, on) => `<span class="switch"><input type="checkbox" data-look-sw="${name}" ${on ? "checked" : ""} aria-label="${name}"><span></span></span>`;
function lookHTML() {
  const theme = document.documentElement.dataset.theme;
  return `<div class="mhead"><span class="mh-ico">${icon("palette")}</span>
    <div><h2>Darstellung</h2><p>Farben, Startseiten-Banner, Grösse und Bedienung. Wird sofort übernommen.</p></div>
    <button type="button" class="icon-btn" data-close title="Schliessen (Esc)" aria-label="Schliessen">${icon("x")}</button></div>
  <div class="mbody">
    <fieldset class="fs"><legend>${icon("spark")}Farben</legend><div class="look-grid">
      <div class="look-row"><span class="lr-label">Thema</span>${seg("theme", theme, [["dark", "Dunkel", "moon"], ["light", "Hell", "sun"]])}</div>
      <div class="look-row"><span class="lr-label">Akzentfarbe<small>Knöpfe, Markierungen, Verläufe</small></span>
        <div class="swatches">${ACCENTS.map(([k, l, a, b]) => `<button type="button" class="swatch ${LOOK.accent === k ? "on" : ""}" data-look="accent" data-v="${k}" style="--a:${a};--b:${b}" aria-pressed="${LOOK.accent === k}"><i></i>${l}</button>`).join("")}</div></div>
    </div></fieldset>
    <fieldset class="fs" id="lookBanner"><legend>${icon("image")}Startseiten-Banner</legend>
      <div class="banner-prev ${LOOK.banner ? "has" : ""}" id="bannerPrev" style="${LOOK.banner ? `background-image:url('/api/c/banner?v=${LOOK.banner}');` : ""}background-position:center ${LOOK.pos}%">${LOOK.banner ? "" : "Bild hierher ziehen, einfügen (Ctrl+V) oder auswählen"}</div>
      <div class="banner-acts"><button type="button" class="btn sm btn-accent" data-look-act="pick">${icon("image")}Bild auswählen</button>
        <button type="button" class="btn sm btn-ghost btn-danger" id="bannerDel" data-look-act="del" ${LOOK.banner ? "" : "hidden"}>${icon("trash")}Entfernen</button></div>
      <div class="look-grid" style="margin-top:12px">
        <div class="look-row"><label for="lkDim">Abdunkeln<small>damit der Text lesbar bleibt</small></label><div class="range"><input id="lkDim" type="range" min="0" max="0.9" step="0.02" value="${LOOK.dim}" data-look-range="dim"><span>${Math.round(LOOK.dim * 100)}%</span></div></div>
        <div class="look-row"><label for="lkPos">Ausschnitt<small>oben ↔ unten</small></label><div class="range"><input id="lkPos" type="range" min="0" max="100" step="1" value="${LOOK.pos}" data-look-range="pos"><span>${LOOK.pos}%</span></div></div>
      </div></fieldset>
    <fieldset class="fs"><legend>${icon("eye")}Bedienung &amp; Lesbarkeit</legend><div class="look-grid">
      <div class="look-row"><span class="lr-label">Grösse<small>alles grösser oder kleiner</small></span>${seg("zoom", LOOK.zoom, [[0.9, "90 %"], [1, "100 %"], [1.1, "110 %"], [1.25, "125 %"]])}</div>
      <div class="look-row"><span class="lr-label">Mehr Kontrast<small>hellere Nebentexte, klarere Linien</small></span>${sw("contrast", LOOK.contrast === "hoch")}</div>
      <div class="look-row"><span class="lr-label">Weniger Bewegung<small>keine Animationen</small></span>${sw("motion", LOOK.motion === "aus")}</div>
      <div class="look-row"><span class="lr-label">Tastenkürzel<small>schneller durch alle Seiten</small></span><div><button type="button" class="btn sm" data-look-act="keys">${icon("keyboard")}Alle anzeigen</button></div></div>
    </div></fieldset>
    <fieldset class="fs"><legend>${icon("layers")}GUI-Versionen</legend>
      <div style="font-size:12.5px;color:var(--muted);margin:-2px 0 10px">Gesicherte Stände der Oberfläche. Zurückholen sichert vorher automatisch den aktuellen Stand.</div>
      <div class="ver-list" id="verList"><div class="dc-note">Lade…</div></div>
      <div class="banner-acts"><button type="button" class="btn sm" data-look-act="snap">${icon("check")}Aktuellen Stand sichern</button></div>
    </fieldset>
  </div>
  <div class="mfoot"><span class="hint"><kbd>,</kbd> öffnet die Darstellung · <kbd>?</kbd> Tastenkürzel</span><button type="button" class="btn btn-accent" data-close>${icon("check")}Fertig</button></div>`;
}
async function drawVersions() {
  const box = $("#verList");
  if (!box) return;
  const r = await cc("look");
  LOOK.banner = r.banner;
  box.innerHTML = r.versions.length ? r.versions.map((v) => `<div class="ver">${icon("layers")}<div><b>${esc(v.name)}</b><small>${esc(v.note || "")} · ${fmtDate(v.time)}</small></div>
    <button type="button" class="btn sm btn-ghost" data-look-restore="${esc(v.name)}">${icon("refresh")}Zurückholen</button></div>`).join("") : `<div class="dc-note">Noch keine Version gesichert.</div>`;
}
function openLook(focus) {
  modal(lookHTML());
  setTimeout(() => document.activeElement?.blur(), 40);
  drawVersions().catch(() => {});
  if (focus === "banner") setTimeout(() => $("#lookBanner")?.scrollIntoView({ block: "center" }), 40);
}
document.addEventListener("click", async (e) => {
  const t = e.target;
  const pick = t.closest("[data-look]");
  if (pick) {
    const k = pick.dataset.look, v = pick.dataset.v;
    if (k === "theme") setTheme(v);
    else { LOOK[k] = k === "zoom" ? +v : v; saveLook(); applyLook(); }
    $$(`[data-look="${k}"]`).forEach((b) => { const on = b.dataset.v === v; b.classList.toggle("on", on); b.setAttribute(b.classList.contains("swatch") ? "aria-pressed" : "aria-checked", on); });
    return;
  }
  const a = t.closest("[data-look-act]")?.dataset.lookAct;
  if (a === "pick") { const f = await pickImage(); if (f) setBanner(f); return; }
  if (a === "del") { if (confirm("Banner entfernen?")) removeBanner(); return; }
  if (a === "keys") { showKeys(); return; }
  if (a === "snap") {
    const label = prompt("Name für diese Version (optional):", "");
    if (label === null) return;
    const r = await ccPost("gui-snapshot", { label, note: label || "Gesichert aus ATLAS" });
    toast(r.error || `Gesichert als ${r.name}`, !!r.error);
    drawVersions();
    return;
  }
  const rs = t.closest("[data-look-restore]")?.dataset.lookRestore;
  if (rs) {
    if (!confirm(`Oberfläche auf «${rs}» zurücksetzen?\nDer aktuelle Stand wird vorher automatisch gesichert.`)) return;
    const r = await ccPost("gui-restore", { name: rs });
    if (r.error) return toast(r.error, true);
    toast(`Zurückgeholt, aktueller Stand liegt in ${r.backup}`);
    setTimeout(() => location.reload(), 900);
    return;
  }
  const fold = t.closest("[data-fold]");
  if (fold) toggleFold(fold.dataset.fold);
});
document.addEventListener("input", (e) => {
  const k = e.target.dataset?.lookRange;
  if (!k) return;
  LOOK[k] = +e.target.value;
  e.target.nextElementSibling.textContent = k === "dim" ? Math.round(LOOK[k] * 100) + "%" : LOOK[k] + "%";
  saveLook();
  const bg = $(".hero-bg");
  if (bg) { bg.style.setProperty("--dim", LOOK.dim); bg.style.backgroundPosition = `center ${LOOK.pos}%`; }
  const prev = $("#bannerPrev");
  if (prev) prev.style.backgroundPosition = `center ${LOOK.pos}%`;
});
document.addEventListener("change", (e) => {
  const k = e.target.dataset?.lookSw;
  if (!k) return;
  if (k === "contrast") LOOK.contrast = e.target.checked ? "hoch" : "normal";
  if (k === "motion") LOOK.motion = e.target.checked ? "aus" : "an";
  saveLook();
  applyLook();
});
function toggleFold(id) {
  const i = LOOK.fold.indexOf(id);
  if (i < 0) LOOK.fold.push(id); else LOOK.fold.splice(i, 1);
  saveLook();
  const g = $(`.nav-group[data-group="${id}"]`);
  g?.classList.toggle("folded", i < 0);
  g?.querySelector(".nav-label")?.setAttribute("aria-expanded", i >= 0);
}

// ------------------------------------------------------------ Tastatur
const GO_KEYS = [["h", "#/", "Übersicht"], ["a", "#/all", "Alle Projekte"], ["f", "#/fav", "Favoriten"], ["r", "#/recent", "Zuletzt geändert"],
  ["s", "#/control", "Steuerung"], ["u", "#/automations", "Automationen"], ["y", "#/system", "System"], ["c", "#/storage", "Aufräumen"],
  ["m", "#/monitor", "Monitor"], ["o", "#/roblox", "Roblox"], ["i", "#/github", "GitHub"], ["t", "#/timeline", "Zeitachse"],
  ["w", "#/net", "Netzwerk"], ["k", "#/hosts", "Server"], ["p", "#/report", "Arbeitsrapport"], ["j", "#/inventory", "Inventar"],
  ["b", "#/apply", "Bewerbungen"], ["e", "#/mail", "E-Mails"], ["d", "#/discord", "Discord"], ["n", "#/notes", "Notizen"]];
function showKeys() {
  const k = (keys, label) => `<div><span>${label}</span><span>${keys.map((x) => `<kbd>${x}</kbd>`).join(" ")}</span></div>`;
  modal(`<div class="mhead"><span class="mh-ico">${icon("keyboard")}</span><div><h2>Tastenkürzel</h2><p>Funktionieren überall, ausser beim Tippen in ein Feld.</p></div>
    <button type="button" class="icon-btn" data-close aria-label="Schliessen">${icon("x")}</button></div>
  <div class="mbody"><div class="keys">
    <h4>Allgemein</h4>${k(["Ctrl", "K"], "Suchen")}${k(["/"], "Suchen")}${k(["N"], "Neues Projekt")}${k([","], "Darstellung")}${k(["T"], "Hell / Dunkel")}${k(["?"], "Diese Hilfe")}
    ${k(["Alt", "←"], "Zurück")}${k(["Esc"], "Dialog schliessen")}${k(["Tab"], "Zum nächsten Element")}${k(["Enter"], "Öffnen")}
    <h4>Springen: zuerst G, dann …</h4>${GO_KEYS.map(([key, , l]) => k(["G", key.toUpperCase()], l)).join("")}
  </div></div><div class="mfoot"><span class="hint">Tipp: In der Seitenleiste lassen sich Gruppen mit einem Klick auf den Titel einklappen.</span><button type="button" class="btn btn-accent" data-close>Alles klar</button></div>`);
}
let goMode = null;
function goHint(on) {
  $("#goHint")?.remove();
  if (on) document.body.insertAdjacentHTML("beforeend", `<div class="go-hint" id="goHint">${GO_KEYS.map(([key, , l]) => `<span><kbd>${key.toUpperCase()}</kbd>${l}</span>`).join("")}</div>`);
}
document.addEventListener("keydown", (e) => {
  const tag = document.activeElement?.tagName;
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(tag) || document.activeElement?.isContentEditable;
  if (e.ctrlKey && e.key === "Enter" && document.activeElement?.closest("#projForm")) { e.preventDefault(); $("#projForm").requestSubmit(); return; }
  if (typing || e.ctrlKey || e.metaKey || e.altKey || !$("#palette").hidden) return;
  // Fokussierte Einträge (Karten, Seitenleiste) mit Enter / Leertaste öffnen
  if ((e.key === "Enter" || e.key === " ") && document.activeElement?.matches("[data-go], [data-fold]")) { e.preventDefault(); document.activeElement.click(); return; }
  if (!$("#modal").hidden) return;
  if (goMode) {
    const hit = GO_KEYS.find(([k]) => k === e.key.toLowerCase());
    clearTimeout(goMode); goMode = null; goHint(false);
    if (hit) { e.preventDefault(); location.hash = hit[1]; }
    return;
  }
  if (e.key === "g") { goHint(true); goMode = setTimeout(() => { goMode = null; goHint(false); }, 2200); return; }
  if (e.key === "?") { e.preventDefault(); showKeys(); }
  else if (e.key === ",") { e.preventDefault(); openLook(); }
  else if (e.key === "n") { e.preventDefault(); editor(null, { section: currentSection() }); }
  else if (e.key === "t") setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
});
// Karten, Kacheln & Zeilen mit der Tab-Taste erreichbar machen
new MutationObserver(() => $$("#main [data-go]:not([tabindex])").forEach((el) => { el.tabIndex = 0; el.setAttribute("role", "link"); }))
  .observe($("#main"), { childList: true, subtree: true });

$("#lookBtn").onclick = () => openLook();
cc("look").then((r) => { if (r.banner !== LOOK.banner) { LOOK.banner = r.banner; if (!parseRoute().parts.length) render(true); } }).catch(() => {});

// ------------------------------------------------------------ Info-Boxen: dt/dd-Paare zu Zellen («Datenblatt») gruppieren
function cellKv() {
  for (const dl of $$("dl.kv:not([data-cells])")) {
    dl.dataset.cells = "1";
    const kids = [...dl.children];
    let first = true;
    for (let i = 0; i < kids.length; i++) {
      if (kids[i].tagName !== "DT") continue;
      const cell = document.createElement("div");
      cell.className = "kvc";
      const dd = kids[i + 1]?.tagName === "DD" ? kids[i + 1] : null;
      dl.insertBefore(cell, kids[i]);
      cell.append(kids[i]);
      if (dd) cell.append(dd);
      // lange Werte oder mehrere Chips bekommen die ganze Breite, der erste Wert ist der «Hauptwert»
      const txt = dd?.textContent || "";
      if (txt.length > 38 || (dd && dd.querySelectorAll(".tag, code").length > 2)) cell.classList.add("wide");
      if (first && dl.closest(".panel") && !dd?.querySelector(".ok-t, .bad-t, .tag")) cell.classList.add("lead");
      first = false;
    }
  }
}
new MutationObserver(cellKv).observe($("#main"), { childList: true, subtree: true });
