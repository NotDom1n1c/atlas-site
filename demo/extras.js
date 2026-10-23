/* ATLAS - Zusatz-Ansichten: System, Grossansicht, Zeitachse, Mails, Discord, GitHub, Aktivität */
"use strict";

const GB = (b) => (b / 1073741824).toFixed(1);
const pctColor = (p) => (p >= 90 ? "#ff6b6b" : p >= 75 ? "#f2b84b" : "#4fd18b");
const rate = (b) => (b == null ? "–" : b < 1024 ? `${Math.round(b)} B/s` : b < 1048576 ? `${(b / 1024).toFixed(0)} KB/s` : `${(b / 1048576).toFixed(1)} MB/s`);
const bar = (pct, color) => `<div class="meter"><i style="width:${Math.min(100, pct).toFixed(1)}%;background:${color || pctColor(pct)}"></i></div>`;
const isoAgo = (iso) => ago(Date.parse(iso) / 1000);

// ------------------------------------------------------------ System (oben rechts, Startseite, eigene Seite)
const SYS = { last: null, hist: [], timer: null };
async function sysTick() {
  if (document.hidden) return;
  const r = parseRoute();
  const full = r.parts[0] === "system";
  try {
    const s = await api(`/api/system${full ? "?full=1" : ""}`);
    SYS.last = s;
    SYS.hist.push({ cpu: s.cpu, ram: s.ram.pct });
    if (SYS.hist.length > 90) SYS.hist.shift();
    drawSysPill(s);
    if ($("#homeSys")) $("#homeSys").innerHTML = sysPanel(s, false);
    if (full && $("#sysPage")) $("#sysPage").innerHTML = sysPage(s);
  } catch { /* Server kurz weg */ }
}
function drawSysPill(s) {
  const c = s.disks.find((d) => d.mount.startsWith("C")) || s.disks[0];
  const warn = (p) => (p >= 90 ? ` style="color:${pctColor(p)}"` : "");
  const seg = (label, value, style = "") => `<span class="sp-seg"><em>${label}</em><b${style}>${value}</b></span>`;
  $("#sysPill").innerHTML = icon("cpu", "i sp-ico") +
    seg("RAM", `${GB(s.ram.used)}/${GB(s.ram.total)} GB`, warn(s.ram.pct)) + `<i class="sp-div"></i>` +
    seg("CPU", `${Math.round(s.cpu)}%`, warn(s.cpu)) +
    (c ? `<i class="sp-div"></i>` + seg(`${esc(c.mount.replace("\\", ""))}`, `${GB(c.free)} GB frei`, warn(c.pct)) : "");
  const n = $("#navSys");
  if (n) n.textContent = `${Math.round(s.ram.pct)}%`;
}
function spark(key, color) {
  const pts = SYS.hist.map((h, i) => `${(i / 89) * 100},${30 - (h[key] / 100) * 30}`).join(" ");
  return `<svg class="spark" viewBox="0 0 100 30" preserveAspectRatio="none"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.4" vector-effect="non-scaling-stroke"/></svg>`;
}
function sysPanel(s) {
  const disks = s.disks.map((d) => `<div class="sys-row"><span>${icon("disk")}Laufwerk ${esc(d.mount.replace("\\", ""))}</span><b>${GB(d.used)} / ${GB(d.total)} GB</b></div>${bar(d.pct)}`).join("");
  return `<div class="panel-title">${icon("cpu")}System<a href="#/system">Details</a></div>
    <div class="sys-row"><span>${icon("layers")}Arbeitsspeicher</span><b>${GB(s.ram.used)} / ${GB(s.ram.total)} GB · ${Math.round(s.ram.pct)}%</b></div>${bar(s.ram.pct)}
    <div class="sys-row"><span>${icon("cpu")}Prozessor</span><b>${Math.round(s.cpu)}%</b></div>${bar(s.cpu, "#8b9cff")}
    ${disks}
    <div class="sys-row" style="margin-top:6px"><span>${icon("net")}Netzwerk</span><b>↓ ${rate(s.net?.down)} · ↑ ${rate(s.net?.up)}</b></div>
    ${s.battery ? `<div class="sys-row"><span>${icon("battery")}Akku</span><b>${Math.round(s.battery.pct)}%${s.battery.plugged ? " · lädt" : s.battery.left ? ` · noch ${Math.floor(s.battery.left / 3600)} h ${Math.floor((s.battery.left % 3600) / 60)} min` : ""}</b></div>${bar(s.battery.pct, s.battery.pct < 20 ? "#ff6b6b" : "#4fd18b")}` : ""}`;
}
function sysPage(s) {
  const up = s.boot ? Date.now() / 1000 - s.boot : 0;
  return `<div class="sys-grid">
    <div class="panel"><div class="panel-title">${icon("cpu")}Prozessor</div>
      <div class="big-num">${Math.round(s.cpu)}<small>%</small></div>${spark("cpu", "#8b9cff")}
      <dl class="kv" style="margin-top:12px"><dt>Modell</dt><dd>${esc(s.cpuName || "")}</dd><dt>Kerne</dt><dd>${s.cores} Kerne · ${s.threads} Threads</dd>${s.freq ? `<dt>Takt</dt><dd>${(s.freq / 1000).toFixed(2)} GHz</dd>` : ""}</dl>
      <div class="cores">${(s.perCore || []).map((c) => `<i title="${Math.round(c)}%"><b style="height:${c}%"></b></i>`).join("")}</div></div>
    <div class="panel"><div class="panel-title">${icon("layers")}Arbeitsspeicher</div>
      <div class="big-num">${GB(s.ram.used)}<small> / ${GB(s.ram.total)} GB</small></div>${spark("ram", pctColor(s.ram.pct))}
      ${bar(s.ram.pct)}<dl class="kv" style="margin-top:12px"><dt>Belegt</dt><dd>${Math.round(s.ram.pct)}%</dd><dt>Frei</dt><dd>${GB(s.ram.total - s.ram.used)} GB</dd><dt>Auslagerung</dt><dd>${GB(s.swap.used)} / ${GB(s.swap.total)} GB</dd></dl></div>
    <div class="panel"><div class="panel-title">${icon("disk")}Speicher</div>
      ${s.disks.map((d) => `<div class="sys-row"><span>${esc(d.mount)} (${esc(d.fs)})</span><b>${GB(d.free)} GB frei von ${GB(d.total)} GB</b></div>${bar(d.pct)}`).join("")}</div>
    <div class="panel"><div class="panel-title">${icon("net")}Netzwerk & Akku</div>
      <div class="sys-row"><span>Download</span><b>${rate(s.net?.down)}</b></div><div class="sys-row"><span>Upload</span><b>${rate(s.net?.up)}</b></div>
      ${s.battery ? `<div class="sys-row" style="margin-top:10px"><span>Akku</span><b>${Math.round(s.battery.pct)}%${s.battery.plugged ? " · am Strom" : ""}</b></div>${bar(s.battery.pct, "#4fd18b")}` : `<div class="sys-row"><span>Akku</span><b>kein Akku / Netzbetrieb</b></div>`}
      <dl class="kv" style="margin-top:12px"><dt>Läuft seit</dt><dd>${Math.floor(up / 86400)} T ${Math.floor((up % 86400) / 3600)} h ${Math.floor((up % 3600) / 60)} min</dd><dt>Gerät</dt><dd>${esc(s.host || "")}</dd><dt>System</dt><dd>${esc(s.os || "")}</dd></dl></div>
    <div class="panel" style="grid-column:1/-1"><div class="panel-title">${icon("list")}Programme mit dem meisten RAM<span style="margin-left:auto;font:500 12px var(--font);color:var(--muted);text-transform:none;letter-spacing:0">${s.procCount || ""} Prozesse</span></div>
      ${(s.procs || []).map((p) => `<div class="sys-row"><span>${esc(p.name.replace(/\.exe$/i, ""))}${p.count > 1 ? ` <em>×${p.count}</em>` : ""}</span><b>${GB(p.rss)} GB</b></div>${bar((p.rss / s.ram.total) * 100, "#8b9cff")}`).join("")}</div>
  </div>`;
}
const viewSystem = () => `<div class="page"><nav class="crumbs"><a href="#/">Übersicht</a></nav>
  <div class="page-head" style="--sc:#8b9cff"><div class="big-ico">${icon("cpu")}</div><div><h1 class="page-title">System</h1><div class="page-sub">Live-Auslastung dieses Laptops, alle 2 Sekunden aktualisiert.</div></div></div>
  <div id="sysPage">${SYS.last ? sysPage(SYS.last) : `<div class="loading">Lade…</div>`}</div></div>`;
function startSys() {
  clearInterval(SYS.timer);
  const fast = ["system", ""].includes(parseRoute().parts[0] || "");
  SYS.timer = setInterval(sysTick, fast ? 2000 : 4000);
  sysTick();
}

// ------------------------------------------------------------ Grossansicht (Bilder, alle Folien, PDF-Seiten)
const LB = { pages: [], i: 0 };
function lbOpen(pages, title, loading) {
  LB.pages = pages; LB.i = 0;
  $("#lbTitle").textContent = title || "";
  $("#lightbox").hidden = false;
  if (loading) $("#lbStage").innerHTML = `<div class="loading" style="color:#ccc">${esc(loading)}</div>`;
  lbDraw();
}
function lbDraw() {
  const n = LB.pages.length;
  $("#lbCount").textContent = n > 1 ? `${LB.i + 1} / ${n}` : "";
  $("#lbPrev").hidden = $("#lbNext").hidden = n < 2;
  if (n) $("#lbStage").innerHTML = `<img src="${LB.pages[LB.i]}" alt="">`;
  $("#lbStrip").innerHTML = n > 1 ? LB.pages.map((u, i) => `<img src="${u}" data-lb="${i}" class="${i === LB.i ? "on" : ""}" loading="lazy" alt="">`).join("") : "";
  $("#lbStrip img.on")?.scrollIntoView({ inline: "center", block: "nearest" });
}
const lbClose = () => { $("#lightbox").hidden = true; $("#lbStage").innerHTML = ""; };
const lbGo = (d) => { if (LB.pages.length) { LB.i = (LB.i + d + LB.pages.length) % LB.pages.length; lbDraw(); } };
async function lbSlides(pid, path, title) {
  lbOpen([], title, path.toLowerCase().endsWith(".pdf") ? "Seiten werden vorbereitet…" : "Folien werden mit PowerPoint vorbereitet… (beim ersten Mal ein paar Sekunden)");
  try {
    const r = await api(`/api/slides?p=${enc(pid)}&path=${enc(path)}`);
    if ($("#lightbox").hidden) return;
    if (!r.pages.length) throw new Error("Keine Seiten gefunden");
    LB.pages = r.pages; LB.i = 0; lbDraw();
  } catch (e) { $("#lbStage").innerHTML = `<div class="loading" style="color:#ccc">${esc(e.message)}</div>`; }
}
function openProjectImage(pid) {
  const p = S.prj[pid];
  if (!p) return;
  const src = p.scan.thumbSrc || (p.virtual ? p.res.files[0] : "");
  if (src && /\.(pptx|pdf)$/i.test(src)) return lbSlides(pid, src, p.name);
  if (p.scan.thumb) lbOpen([`thumbs/${pid}.jpg`], p.name);
}
document.addEventListener("click", (e) => {
  const t = e.target;
  if (t.closest("#lbClose") || t.id === "lightbox" || t.classList?.contains("lb-stage")) return lbClose();
  if (t.closest("#lbPrev")) return lbGo(-1);
  if (t.closest("#lbNext")) return lbGo(1);
  const strip = t.closest("[data-lb]");
  if (strip) { LB.i = +strip.dataset.lb; return lbDraw(); }
  const thumb = t.closest("#pThumb");
  if (thumb && !t.closest(".thumb-tools")) return openProjectImage(thumb.dataset.id);
  if (t.matches(".fbody img.preview")) return lbOpen([t.src], decodeURIComponent(t.src.split("path=")[1] || "").split("\\").pop());
  if (t.matches(".fbody img.office-render")) {
    const r = parseRoute();
    return lbSlides(r.parts[1], r.q.get("f") || S.trees[r.parts[1]]?.sel, (r.q.get("f") || "").split("\\").pop());
  }
});
document.addEventListener("keydown", (e) => {
  if ($("#lightbox").hidden) return;
  if (e.key === "Escape") { e.stopImmediatePropagation(); lbClose(); }
  if (e.key === "ArrowLeft") lbGo(-1);
  if (e.key === "ArrowRight") lbGo(1);
}, true);

// ------------------------------------------------------------ Aktivität (Heatmap auf der Startseite)
function activityPanel() {
  const act = S.data.activity || {};
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const start = new Date(today); start.setDate(start.getDate() - 52 * 7 - ((today.getDay() + 6) % 7));
  let cells = "", active = 0, total = 0, streak = 0, best = 0, run = 0;
  const max = Math.max(1, ...Object.values(act));
  for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
    const key = d.toLocaleDateString("sv-SE");
    const n = act[key] || 0;
    if (n) { active++; total += n; run++; best = Math.max(best, run); } else run = 0;
    const lvl = n ? Math.min(4, 1 + Math.floor((Math.log(n) / Math.log(max + 1)) * 4)) : 0;
    cells += `<i class="l${lvl}" title="${d.toLocaleDateString("de-CH")}: ${n} Dateien geändert"></i>`;
  }
  streak = run;
  const months = [];
  for (let m = new Date(start.getFullYear(), start.getMonth() + 1, 1); m <= today; m.setMonth(m.getMonth() + 1)) {
    const week = Math.floor((m - start) / 864e5 / 7);
    months.push(`<span style="grid-column:${week + 1}">${m.toLocaleDateString("de-CH", { month: "short" })}</span>`);
  }
  return `<div class="panel-title">${icon("pulse")}Aktivität im letzten Jahr<span class="act-sum">${active} aktive Tage · ${fmtN(total)} Datei-Änderungen · längste Serie ${best} Tage${streak ? ` · aktuelle Serie ${streak}` : ""}</span></div>
    <div class="heat-wrap"><div class="heat-months">${months.join("")}</div><div class="heat">${cells}</div></div>
    <div class="heat-legend">weniger <i class="l0"></i><i class="l1"></i><i class="l2"></i><i class="l3"></i><i class="l4"></i> mehr</div>`;
}

// ------------------------------------------------------------ Zeitachse
const TL = { all: false };
function viewTimeline() {
  const now = Date.now() / 1000;
  const begin = (p) => p.scan.start || p.scan.first;
  const list = allProjects().filter((p) => begin(p) && p.scan.last && (TL.all || p.scan.last > now - 365 * 86400));
  const minT = TL.all ? Math.max(Math.min(...list.map(begin)), now - 4 * 365 * 86400) : now - 365 * 86400;
  const span = now - minT || 1;
  const x = (t) => ((Math.max(t, minT) - minT) / span) * 100;
  const ticks = [];
  const d0 = new Date(minT * 1000);
  for (let m = new Date(d0.getFullYear(), d0.getMonth() + 1, 1); m.getTime() / 1000 < now; m.setMonth(m.getMonth() + 1)) {
    const yr = m.getMonth() === 0;
    if (TL.all && m.getMonth() % 3) continue;
    ticks.push(`<span class="${yr ? "yr" : ""}" style="left:${x(m.getTime() / 1000)}%">${yr ? m.getFullYear() : m.toLocaleDateString("de-CH", { month: "short" })}</span>`);
  }
  const groups = S.top.map((s) => {
    const ps = list.filter((p) => secChain(p.section)[0]?.id === s.id).sort((a, b) => begin(a) - begin(b));
    if (!ps.length) return "";
    return `<div class="tl-group" style="--sc:${secColor(s.id)}"><div class="tl-head">${icon(secIcon(s.id))}${esc(s.name)}</div>
      ${ps.map((p) => `<div class="tl-row" data-go="#/p/${enc(p.id)}"><span class="tl-name" title="${esc(p.name)}">${esc(p.name)}</span>
        <div class="tl-track"><i style="left:${x(begin(p))}%;width:${Math.max(0.6, x(p.scan.last) - x(begin(p)))}%" title="${fmtDate(begin(p))} – ${fmtDate(p.scan.last)}"></i></div></div>`).join("")}</div>`;
  }).join("");
  return `<div class="page"><nav class="crumbs"><a href="#/">Übersicht</a></nav>
    <div class="page-head" style="--sc:var(--accent)"><div class="big-ico">${icon("calendar")}</div><div><h1 class="page-title">Zeitachse</h1>
    <div class="page-sub">Wann woran gearbeitet wurde: jeder Balken geht vom Beginn bis zur letzten Änderung eines Projekts.</div></div>
    <div class="head-actions"><div class="chips"><button class="chip ${TL.all ? "" : "on"}" data-tl="0">Letzte 12 Monate</button><button class="chip ${TL.all ? "on" : ""}" data-tl="1">Alles</button></div></div></div>
    <div class="tl"><div class="tl-axis"><span class="tl-name">${list.length} Projekte</span><div class="tl-ticks">${ticks.join("")}<span class="now" style="left:100%">heute</span></div></div>${groups}</div></div>`;
}
document.addEventListener("click", (e) => { const t = e.target.closest("[data-tl]"); if (t) { TL.all = t.dataset.tl === "1"; render(true); } });

// ------------------------------------------------------------ E-Mails (Outlook)
const MAIL = { folder: "inbox", data: null, sel: null, q: "" };
const viewMail = () => `<div class="page wide"><nav class="crumbs"><a href="#/">Übersicht</a></nav>
  <div class="page-head" style="--sc:#7fb2ff"><div class="big-ico">${icon("mail")}</div><div><h1 class="page-title">E-Mails</h1>
  <div class="page-sub" id="mailSub">Direkt aus deinem Outlook (nur lesen, alles bleibt lokal).</div></div>
  <div class="head-actions"><button class="btn" data-mail-refresh>${icon("refresh")}Neu laden</button></div></div>
  <div class="toolbar"><div class="chips"><button class="chip ${MAIL.folder === "inbox" ? "on" : ""}" data-mail-folder="inbox">Posteingang</button><button class="chip ${MAIL.folder === "sent" ? "on" : ""}" data-mail-folder="sent">Gesendet</button></div>
  <input class="select" id="mailSearch" placeholder="In Betreff, Absender, Text suchen…" value="${esc(MAIL.q)}" style="width:300px;margin-left:auto"></div>
  <div class="mail"><div class="mail-list" id="mailList"><div class="loading">Outlook wird abgefragt…</div></div><div class="mail-read" id="mailRead"><div class="fempty"><div>${icon("mail")}<div>Mail links auswählen</div></div></div></div></div></div>`;
async function loadMail(fresh, force) {
  try {
    const d = await api(`/api/mail?folder=${MAIL.folder}&count=80${fresh ? "&fresh=1" : ""}${force ? "&force=1" : ""}`);
    MAIL.data = d;
    if (MAIL.folder === "inbox" && d.ok) { S.mailUnread = d.unread; }
    drawMailList();
  } catch (e) { $("#mailList") && ($("#mailList").innerHTML = `<div class="empty">${esc(e.message)}</div>`); }
}
function drawMailList() {
  const box = $("#mailList");
  if (!box || !MAIL.data) return;
  const d = MAIL.data;
  if (!d.ok && d.blocked) {
    box.innerHTML = `<div class="guard-box">${icon("lock")}<b>Outlook hat ATLAS blockiert</b>
      <p>${esc(d.error || "")}${d.minutes ? ` (noch ${d.minutes} Min.)` : ""}</p>
      <p>Outlook zeigt diese Warnung, wenn es den Virenschutz nicht für aktuell hält. Bei dir ist zusätzlich zu Windows Defender ein ausgeschaltetes <b>McAfee</b> registriert. Wenn du McAfee nicht brauchst, deinstallieren (Einstellungen → Apps); danach fragt Outlook nicht mehr.</p>
      <button class="btn sm" data-mail-force>${icon("refresh")}Trotzdem jetzt versuchen</button><small>Erscheint die Warnung, «Zugriff gewähren für 10 Minuten» ankreuzen und «Erteilen».</small></div>`;
    return;
  }
  if (!d.ok) { box.innerHTML = `<div class="empty">Outlook nicht erreichbar: ${esc(d.error || "")}</div>`; return; }
  $("#mailSub").textContent = `${d.account || ""} · ${d.folder}: ${fmtN(d.total)} Mails${MAIL.folder === "inbox" ? `, ${d.unread} ungelesen` : ""}`;
  const q = MAIL.q.toLowerCase();
  const items = (d.items || []).filter((m) => !q || `${m.subject} ${m.from} ${m.preview}`.toLowerCase().includes(q));
  box.innerHTML = items.length ? items.map((m) => `<div class="mail-item ${m.unread ? "unread" : ""} ${MAIL.sel === m.id ? "on" : ""}" data-mail="${esc(m.id)}">
      <div class="mi-top"><b>${esc(m.from || "–")}</b><span>${isoAgo(m.date)}</span></div>
      <div class="mi-sub">${m.important ? `<span class="imp">!</span>` : ""}${esc(m.subject || "(kein Betreff)")}${m.att ? ` ${icon("link", "i att")}` : ""}</div>
      <div class="mi-pre">${esc(m.preview || "")}</div></div>`).join("") : `<div class="empty">Keine Mails gefunden.</div>`;
}
async function openMail(id) {
  MAIL.sel = id;
  $$(".mail-item").forEach((el) => el.classList.toggle("on", el.dataset.mail === id));
  const box = $("#mailRead");
  box.innerHTML = `<div class="loading">Lade Mail…</div>`;
  const m = await api(`/api/mail/item?id=${enc(id)}`);
  if (!m.ok) { box.innerHTML = `<div class="empty">${esc(m.error || "Fehler")}</div>`; return; }
  const hay = `${m.subject} ${m.body}`.toLowerCase();
  const related = allProjects().filter((p) => p.name.length > 3 && hay.includes(p.name.toLowerCase())).slice(0, 6);
  box.innerHTML = `<div class="mr-head"><h2>${esc(m.subject || "(kein Betreff)")}</h2>
      <dl class="kv"><dt>Von</dt><dd>${esc(m.from)}</dd><dt>An</dt><dd>${esc(m.to)}</dd>${m.cc ? `<dt>CC</dt><dd>${esc(m.cc)}</dd>` : ""}<dt>Datum</dt><dd>${new Date(m.date).toLocaleString("de-CH")}</dd></dl>
      ${(m.attachments || []).length ? `<div class="tech" style="margin-top:8px">${[].concat(m.attachments).map((a) => `<span class="tag">${icon("file", "i att")} ${esc(a)}</span>`).join("")}</div>` : ""}
      ${related.length ? `<div class="tech" style="margin-top:8px">Projekte: ${related.map((p) => `<a class="tag" href="#/p/${enc(p.id)}" style="color:${secColor(p.section)}">${esc(p.name)}</a>`).join("")}</div>` : ""}
      <div style="margin-top:12px"><button class="btn btn-accent sm" data-mail-open="${esc(id)}">${icon("external")}In Outlook öffnen</button></div></div>
    <div class="mr-body">${esc(m.body || "").replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>')}</div>`;
  const it = MAIL.data?.items?.find((x) => x.id === id);
  if (it && it.unread) { it.unread = false; drawMailList(); }
}
async function homeMail() {
  const box = $("#homeMail");
  if (!box) return;
  box.innerHTML = `<div class="panel-title">${icon("mail")}Neueste E-Mails<a href="#/mail">Alle</a></div><div class="loading" style="height:60px">Outlook wird abgefragt…</div>`;
  try {
    const d = await api(`/api/mail?folder=inbox&count=80&bg=1`);
    if (!$("#homeMail")) return;
    if (!d.ok && (d.idle || d.blocked)) { box.innerHTML = `<div class="panel-title">${icon("mail")}E-Mails<a href="#/mail">Öffnen</a></div><div class="empty">${d.blocked ? "Outlook hat den Zugriff blockiert. Details unter E-Mails." : "Mails werden geladen, sobald du «E-Mails» öffnest."}</div>`; return; }
    MAIL.data = MAIL.folder === "inbox" ? d : MAIL.data;
    if (!d.ok) { box.innerHTML = `<div class="panel-title">${icon("mail")}E-Mails</div><div class="empty">Outlook nicht erreichbar.</div>`; return; }
    S.mailUnread = d.unread;
    box.innerHTML = `<div class="panel-title">${icon("mail")}Neueste E-Mails<span class="act-sum">${d.unread} ungelesen</span><a href="#/mail">Alle</a></div>
      <div class="rows">${(d.items || []).slice(0, 5).map((m) => `<div class="rowlink" data-go="#/mail?id=${enc(m.id)}"><span class="dot ${m.unread ? "on" : ""}"></span><div class="meta"><b>${esc(m.subject || "(kein Betreff)")}</b><small>${esc(m.from)}</small></div><span class="when">${isoAgo(m.date)}</span></div>`).join("")}</div>`;
  } catch { box.innerHTML = ""; }
}

// ------------------------------------------------------------ Discord
const DC = { data: null, guild: null, channel: null };
const viewDiscord = () => `<div class="page"><nav class="crumbs"><a href="#/">Übersicht</a></nav>
  <div class="page-head" style="--sc:#7d87ff"><div class="big-ico">${icon("chat")}</div><div><h1 class="page-title">Discord</h1>
  <div class="page-sub">Deine Server über die offizielle Discord-Bot-API: Mitglieder, Kanäle und die letzten Nachrichten.</div></div>
  <div class="head-actions" id="dcActions"></div></div><div id="dcBody"><div class="loading">Lade…</div></div></div>`;
async function loadDiscord() {
  const d = await api("/api/discord");
  DC.data = d;
  const body = $("#dcBody");
  if (!body) return;
  if (!d.configured) {
    body.innerHTML = `<div class="dc-setup panel">
      <h3>Discord verbinden</h3>
      <p>ATLAS liest Discord über einen <b>Bot</b> (offizielle, kostenlose API). Der Bot sieht jeden Server, auf dem er Mitglied ist: Mitglieder, Online-Anzahl, Kanäle und die letzten Nachrichten. Dein persönliches Konto direkt auszulesen verbietet Discord (Self-Bots führen zur Sperre), deshalb der Weg über den Bot.</p>
      ${d.envAvailable ? `<div class="dc-opt"><b>Schnellster Weg:</b> den Bot aus deinem Projekt <i>Discord-Bot (Cracked Hub)</i> verwenden. Sein Token liegt in <code>discord-bot/.env</code>.<br><button class="btn btn-accent" data-dc-env style="margin-top:10px">${icon("check")}Token aus discord-bot/.env verwenden</button></div>` : ""}
      <div class="dc-opt"><b>${d.envAvailable ? "Oder eigenen" : "Bot-Token einfügen"}</b>${d.envAvailable ? " Bot-Token einfügen" : ""}:
        <ol class="dc-steps">
          <li><a href="https://discord.com/developers/applications" target="_blank" rel="noopener">discord.com/developers/applications</a> öffnen → <b>New Application</b> → Namen geben (z.B. «ATLAS»).</li>
          <li>Links <b>Bot</b> → <b>Reset Token</b> → Token kopieren (wird nur einmal angezeigt).</li>
          <li>Auf derselben Seite <b>Server Members Intent</b> und <b>Message Content Intent</b> einschalten → Speichern.</li>
          <li>Token hier einfügen und verbinden. Danach mit «Bot zu Server hinzufügen» auf deine Server einladen.</li>
        </ol>
        <form id="dcForm" style="display:flex;gap:8px;margin-top:10px"><input type="password" class="select" name="token" placeholder="Bot-Token" style="flex:1;height:36px" autocomplete="off"><button class="btn btn-accent">${icon("check")}Verbinden</button></form></div>
      <p class="dc-note">Der Token wird nur lokal in <code>C:\\Users\\alex\\.atlas\\discord.json</code> gespeichert und nie angezeigt.</p></div>`;
    $("#dcActions").innerHTML = "";
    return;
  }
  $("#dcActions").innerHTML = `${d.invite ? `<a class="btn" href="${esc(d.invite)}" target="_blank" rel="noopener">${icon("plus")}Bot zu Server hinzufügen</a>` : ""}<button class="btn btn-ghost" data-dc-logout>${icon("x")}Trennen</button>`;
  if (d.error) { body.innerHTML = `<div class="empty">Discord-Fehler: ${esc(d.error)}${d.status === 401 ? "<br>Der Token ist ungültig. Trennen und neu verbinden." : ""}</div>`; return; }
  const g = d.guilds || [];
  body.innerHTML = `<div class="dc-bot">${d.bot.avatar ? `<img src="${esc(d.bot.avatar)}" alt="">` : icon("chat")}<div><b>${esc(d.bot.name)}</b><small>ist auf ${g.length} ${g.length === 1 ? "Server" : "Servern"}</small></div></div>
    ${g.length ? `<div class="dc-guilds">${g.map((x) => `<div class="dc-guild ${DC.guild === x.id ? "on" : ""}" data-dc-guild="${esc(x.id)}">
      ${x.banner ? `<div class="dc-banner" style="background-image:url('${esc(x.banner)}')"></div>` : `<div class="dc-banner"></div>`}
      <div class="dc-gi">${x.icon ? `<img src="${esc(x.icon)}" alt="">` : `<span>${esc((x.name || "?").slice(0, 2))}</span>`}</div>
      <div class="dc-gb"><b>${esc(x.name)}</b>${x.error ? `<small>${esc(x.error)}</small>` : `<small><span class="dot on"></span>${fmtN(x.online)} online · ${fmtN(x.members)} Mitglieder</small>
        <div class="dc-stats"><span>${icon("hash")}${x.channels.filter((c) => c.type === "text").length}</span><span>${icon("volume")}${x.channels.filter((c) => c.type === "voice").length}</span><span>${x.roles} Rollen</span>${x.boost ? `<span>Boost Stufe ${x.boost}</span>` : ""}</div>`}</div></div>`).join("")}</div>
    <div id="dcDetail"></div>` : `<div class="empty">Der Bot ist noch auf keinem Server. Mit «Bot zu Server hinzufügen» einladen.</div>`}`;
  if (DC.guild) drawGuild();
}
function drawGuild() {
  const x = DC.data.guilds.find((g) => g.id === DC.guild);
  const box = $("#dcDetail");
  if (!x || !box || x.error) return;
  const cats = [];
  for (const c of x.channels) {
    let cat = cats.find((k) => k.name === (c.category || ""));
    if (!cat) cats.push((cat = { name: c.category || "", list: [] }));
    cat.list.push(c);
  }
  box.innerHTML = `<div class="dc-detail"><div class="dc-chans"><h4>${esc(x.name)}</h4>${x.description ? `<p class="dc-note">${esc(x.description)}</p>` : ""}
    ${cats.map((k) => `${k.name ? `<div class="dc-cat">${esc(k.name)}</div>` : ""}${k.list.map((c) => `<div class="dc-ch ${c.type} ${DC.channel === c.id ? "on" : ""}" ${["text", "news", "forum"].includes(c.type) ? `data-dc-channel="${esc(c.id)}"` : ""} title="${esc(c.topic || "")}">${icon(c.type === "voice" || c.type === "stage" ? "volume" : "hash")}${esc(c.name)}</div>`).join("")}`).join("")}</div>
    <div class="dc-right"><div class="dc-msgs" id="dcMsgs"><div class="fempty"><div>${icon("hash")}<div>Textkanal auswählen</div></div></div></div></div></div>`;
  if (DC.channel) loadMessages(DC.channel);
}
async function loadMessages(id) {
  DC.channel = id;
  $$(".dc-ch").forEach((el) => el.classList.toggle("on", el.dataset.dcChannel === id));
  const box = $("#dcMsgs");
  box.innerHTML = `<div class="loading">Lade Nachrichten…</div>`;
  const r = await api(`/api/discord/messages?channel=${enc(id)}`);
  if (r.error) { box.innerHTML = `<div class="empty">${esc(r.error)}${r.status === 403 ? "<br>Der Bot darf diesen Kanal nicht lesen." : ""}</div>`; return; }
  const noContent = r.messages.length && r.messages.every((m) => !m.content && !m.attachments.length && !m.embeds);
  box.innerHTML = (noContent ? `<div class="dc-note" style="padding:10px 14px">Inhalte leer: im Developer-Portal beim Bot «Message Content Intent» einschalten.</div>` : "") +
    (r.messages.length ? [...r.messages].reverse().map((m) => `<div class="dc-msg">${m.avatar ? `<img src="${esc(m.avatar)}" alt="">` : `<span class="dc-av">${esc(m.author.slice(0, 1))}</span>`}
      <div><div class="dc-mh"><b>${esc(m.author)}</b>${m.bot ? `<span class="tag">BOT</span>` : ""}<small>${new Date(m.date).toLocaleString("de-CH")}</small></div>
      <div class="dc-mt">${esc(m.content)}${m.attachments.map((a) => `<div class="tag">${icon("file", "i att")} ${esc(a)}</div>`).join("")}${m.embeds ? `<div class="dc-note">${m.embeds} Embed(s)</div>` : ""}</div></div></div>`).join("") : `<div class="empty">Keine Nachrichten.</div>`);
  box.scrollTop = box.scrollHeight;
}

// ------------------------------------------------------------ GitHub
const viewGithub = () => `<div class="page"><nav class="crumbs"><a href="#/">Übersicht</a></nav>
  <div class="page-head" style="--sc:#3fb950"><div class="big-ico">${icon("github")}</div><div><h1 class="page-title">GitHub</h1>
  <div class="page-sub" id="ghSub">Deine Repositories und die letzten Commits.</div></div></div><div id="ghBody"><div class="loading">Lade…</div></div></div>`;
async function loadGithub() {
  const g = await api("/api/github");
  const body = $("#ghBody");
  if (!body) return;
  if (g.error) { body.innerHTML = `<div class="empty">${esc(g.error)}</div>`; return; }
  $("#ghSub").innerHTML = `<a href="https://github.com/${esc(g.login)}" target="_blank" rel="noopener" style="color:var(--accent)">github.com/${esc(g.login)}</a> · ${g.repos.length} Repositories · ${g.repos.reduce((a, r) => a + r.stars, 0)} Sterne`;
  const proj = (full) => allProjects().find((p) => p.repo && p.repo.toLowerCase() === full.toLowerCase());
  body.innerHTML = `<div class="dash"><div><div class="gh-repos">${g.repos.map((r) => {
    const p = proj(r.full);
    return `<div class="gh-repo"><div class="gh-top"><a href="${esc(r.url)}" target="_blank" rel="noopener"><b>${esc(r.name)}</b></a>${r.private ? `<span class="tag">privat</span>` : ""}${r.pages ? `<span class="tag">Pages</span>` : ""}</div>
      <p>${esc(r.desc || "")}</p><div class="gh-meta">${r.lang ? `<span><i style="background:${langColor(r.lang)}"></i>${esc(r.lang)}</span>` : ""}<span>★ ${r.stars}</span>${r.issues ? `<span>${r.issues} offen</span>` : ""}<span>Push ${isoAgo(r.pushed)}</span>
      ${p ? `<a href="#/p/${enc(p.id)}" class="gh-atlas">${icon("eye")}in ATLAS</a>` : ""}</div></div>`;
  }).join("")}</div></div>
  <div><div class="panel"><div class="panel-title">${icon("git")}Letzte Commits</div>${commitRows(g.activity, 30)}</div></div></div>`;
}
const commitRows = (list, n) => list.length ? `<div class="rows">${list.slice(0, n).map((c) => `<a class="rowlink" href="${esc(c.url || "#")}" target="_blank" rel="noopener">${icon("git")}<div class="meta"><b>${esc(c.msg)}</b><small>${esc(c.repo.split("/").pop())}</small></div><span class="when">${isoAgo(c.date)}</span></a>`).join("")}</div>` : `<div class="empty">Keine Commits gefunden.</div>`;
async function homeGit() {
  const box = $("#homeGit");
  if (!box) return;
  try {
    const g = await api("/api/github");
    if (!$("#homeGit") || g.error) { box.remove(); return; }
    box.innerHTML = `<div class="panel-title">${icon("github")}GitHub: letzte Commits<a href="#/github">Alle</a></div>${commitRows(g.activity, 6)}`;
  } catch { box.remove(); }
}

// ------------------------------------------------------------ Verdrahtung
const EXTRA_VIEWS = { system: viewSystem, timeline: viewTimeline, mail: viewMail, discord: viewDiscord, github: viewGithub };
function afterRender(a, b, r) {
  startSys();
  if (!a) {
    if ($("#homeActivity")) $("#homeActivity").innerHTML = activityPanel();
    if (SYS.last && $("#homeSys")) $("#homeSys").innerHTML = sysPanel(SYS.last);
    homeMail();
    homeGit();
  }
  if (a === "mail") {
    if (MAIL.data && MAIL.data.ok) drawMailList();
    loadMail().then(() => { const id = r.q.get("id"); if (id) openMail(id); });
  }
  if (a === "discord") loadDiscord().catch((e) => toast(e.message, true));
  if (a === "github") loadGithub().catch((e) => toast(e.message, true));
}
document.addEventListener("click", async (e) => {
  const t = e.target;
  const f = t.closest("[data-mail-folder]");
  if (f) { MAIL.folder = f.dataset.mailFolder; MAIL.data = null; MAIL.sel = null; render(); return; }
  if (t.closest("[data-mail-force]")) { $("#mailList").innerHTML = `<div class="loading">Outlook wird abgefragt…</div>`; return loadMail(true, true); }
  if (t.closest("[data-mail-refresh]")) { $("#mailList").innerHTML = `<div class="loading">Outlook wird abgefragt…</div>`; return loadMail(true); }
  const m = t.closest("[data-mail]");
  if (m) return openMail(m.dataset.mail);
  const o = t.closest("[data-mail-open]");
  if (o) { const r = await api("/api/mail/open", { id: o.dataset.mailOpen }); return r.ok ? toast("In Outlook geöffnet") : toast(r.error || "Fehler", true); }
  const g = t.closest("[data-dc-guild]");
  if (g) { DC.guild = DC.guild === g.dataset.dcGuild ? null : g.dataset.dcGuild; DC.channel = null; $$(".dc-guild").forEach((el) => el.classList.toggle("on", el.dataset.dcGuild === DC.guild)); if (DC.guild) drawGuild(); else $("#dcDetail").innerHTML = ""; return; }
  const c = t.closest("[data-dc-channel]");
  if (c) return loadMessages(c.dataset.dcChannel);
  if (t.closest("[data-dc-env]")) { try { await api("/api/discord/token", { fromEnv: true }); toast("Discord verbunden"); loadDiscord(); } catch (err) { toast(err.message, true); } return; }
  if (t.closest("[data-dc-logout]")) { if (!confirm("Discord-Verbindung trennen? (Der Token wird aus ATLAS gelöscht.)")) return; await api("/api/discord/token", { token: "" }); DC.guild = null; loadDiscord(); }
});
document.addEventListener("submit", async (e) => {
  if (e.target.id !== "dcForm") return;
  e.preventDefault();
  const tok = e.target.token.value.trim();
  if (!tok) return;
  try { await api("/api/discord/token", { token: tok }); toast("Discord verbunden"); loadDiscord(); } catch (err) { toast(err.message, true); }
});
document.addEventListener("input", (e) => { if (e.target.id === "mailSearch") { MAIL.q = e.target.value; drawMailList(); } });
document.addEventListener("visibilitychange", () => { if (!document.hidden) sysTick(); });
