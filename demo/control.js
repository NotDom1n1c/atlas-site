/* ATLAS - Kontrollzentrum: Steuerung, Monitor, Roblox, Aufräumen, Bewerbungen, Notizen, Startseiten-Kacheln */
"use strict";

const CC = { servers: null, vms: null, apps: null, recycle: null, media: null, sites: null, ci: null, roblox: null,
  storage: null, apply: null, notes: null, feed: null, sorter: null, applyFilter: "alle", applyQ: "", noteSel: null };
S.cc = S.cc || {};
const cc = (name, q = "") => api(`/api/c/${name}${q ? "?" + q : ""}`);
const ccPost = (name, body) => api(`/api/c/${name}`, body);
const fmtDur = (s) => (s == null || !isFinite(s) || s <= 0 ? "" : `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`);
const dotState = (st) => ({ running: "on", starting: "warm", busy: "warn", stopped: "" }[st] || "");
const projOfPath = (path) => {
  if (!path) return null;
  const low = path.toLowerCase();
  return allProjects().find((p) => (p.res.paths || []).some((x) => low === x.toLowerCase() || low.startsWith(x.toLowerCase() + "\\") || x.toLowerCase().startsWith(low + "\\")));
};
const pageHead = (ic, title, sub, col, actions = "") => `<nav class="crumbs"><a href="#/">Übersicht</a></nav>
  <div class="page-head" style="--sc:${col}"><div class="big-ico">${icon(ic)}</div><div style="flex:1;min-width:0"><h1 class="page-title">${title}</h1><div class="page-sub">${sub}</div></div>
  <div class="head-actions">${actions}</div></div>`;

// ------------------------------------------------------------ Musik
function mediaHTML(m, big) {
  if (!m || m.none || m.error || !m.title) {
    return `<div class="mp ${big ? "big" : ""} idle"><div class="mp-cover">${icon("music")}</div><div class="mp-meta"><b>Nichts läuft gerade</b><small>Starte Musik in Spotify, YouTube & Co.</small></div></div>`;
  }
  const playing = m.status === "Playing";
  const pct = m.dur > 0 ? Math.min(100, (m.pos / m.dur) * 100) : 0;
  return `<div class="mp ${big ? "big" : ""}">
    <div class="mp-cover">${m.cover ? `<img src="${m.cover}" alt="">` : icon("music")}</div>
    <div class="mp-meta"><b title="${esc(m.title)}">${esc(m.title)}</b><small>${esc(m.artist || "")}${m.source ? ` · ${esc(m.source)}` : ""}</small>
      ${big && m.dur > 0 ? `<div class="mp-bar"><i style="width:${pct}%"></i></div><div class="mp-time"><span>${fmtDur(m.pos)}</span><span>${fmtDur(m.dur)}</span></div>` : ""}</div>
    <div class="mp-ctl"><button class="icon-btn" data-media="prev" title="Zurück">${icon("prev")}</button>
      <button class="icon-btn mp-play" data-media="toggle" title="${playing ? "Pause" : "Abspielen"}">${icon(playing ? "pause" : "play")}</button>
      <button class="icon-btn" data-media="next" title="Weiter">${icon("next")}</button></div></div>`;
}
async function mediaTick() {
  if (document.hidden) return;
  const r = parseRoute();
  if (!["control", undefined].includes(r.parts[0])) return;
  try {
    CC.media = await cc("media");
    $$(".mp-slot").forEach((el) => (el.innerHTML = mediaHTML(CC.media, el.dataset.big === "1")));
  } catch { /* egal */ }
}
setInterval(() => mediaTick(), 5000);  // ruft immer die aktuelle mediaTick (auto.js erweitert sie)

// ------------------------------------------------------------ Steuerung
const viewControl = () => `<div class="page">${pageHead("play", "Steuerung", "Dev-Server, virtuelle Maschinen, Windows-Aktionen und Musik, alles an einem Ort.", "#4fd18b",
  `<button class="btn" data-cc-refresh="control">${icon("refresh")}Aktualisieren</button>`)}
  <div class="cc-grid">
    <div class="panel cc-wide"><div class="panel-title">${icon("server")}Dev-Server<span class="act-sum" id="srvSum"></span></div><div id="srvList"><div class="loading" style="height:80px">Lade…</div></div></div>
    <div class="panel music-panel"><div class="panel-title">${icon("music")}Musik</div><div class="mp-slot" data-big="1">${mediaHTML(CC.media, true)}</div><div id="spotifyBox" class="sp-box"></div></div>
    <div class="panel"><div class="panel-title">${icon("cube")}VMs & WSL</div><div id="vmList"><div class="loading" style="height:80px">Lade…</div></div></div>
    <div class="panel"><div class="panel-title">${icon("spark")}Schnellaktionen</div><div id="quickList"></div></div>
    <div class="panel"><div class="panel-title">${icon("app")}Apps starten</div><div id="appList" class="app-grid"></div></div>
  </div></div>`;
function serversHTML(list) {
  return `<div class="srv-list">${list.map((s) => {
    const p = projOfPath(s.target);
    return `<div class="srv ${s.state}"><span class="sdot ${dotState(s.state)}"></span>
      <div class="srv-meta"><b>${esc(p ? p.name : s.name)}</b><small>${esc(s.name)} · :${s.port}${s.state === "busy" ? ` · Port belegt von ${esc(s.owner || "?")}` : ""}</small></div>
      <div class="srv-act">${s.state === "running" ? `<a class="btn sm" href="${esc(s.url)}" target="_blank" rel="noopener">${icon("external")}Öffnen</a><button class="btn sm btn-ghost" data-srv-stop="${esc(s.name)}">${icon("stop")}Stopp</button>`
        : s.state === "starting" ? `<span class="srv-wait">startet…</span>` : s.state === "busy" ? "" : `<button class="btn sm" data-srv-start="${esc(s.name)}">${icon("play")}Start</button>`}
        <button class="icon-btn sm" data-srv-log="${esc(s.name)}" title="Log">${icon("list")}</button>
        ${p ? `<a class="icon-btn sm" href="#/p/${enc(p.id)}" title="Projekt in ATLAS">${icon("eye")}</a>` : ""}</div></div>`;
  }).join("")}</div>`;
}
async function loadServers() {
  const r = await cc("servers");
  CC.servers = r.servers;
  S.cc.running = r.servers.filter((s) => s.state === "running").length;
  if ($("#srvList")) $("#srvList").innerHTML = serversHTML(r.servers);
  if ($("#srvSum")) $("#srvSum").textContent = `${S.cc.running} von ${r.servers.length} laufen`;
  drawProjectExtras();
}
async function loadVms() {
  const v = await cc("vms");
  CC.vms = v;
  const box = $("#vmList");
  if (!box) return;
  const vb = v.vbox.map((m) => `<div class="srv"><span class="sdot ${m.running ? "on" : ""}"></span><div class="srv-meta"><b>${esc(m.name)}</b><small>VirtualBox · ${esc(m.os || "")} · ${m.cpus} CPU · ${(m.ram / 1024).toFixed(0)} GB RAM</small></div>
    <div class="srv-act">${m.running ? `<button class="btn sm btn-ghost" data-vm="vbox|${esc(m.name)}|save" title="Zustand speichern und anhalten">${icon("pause")}Pause</button><button class="btn sm btn-ghost" data-vm="vbox|${esc(m.name)}|stop">${icon("stop")}Herunterfahren</button>`
      : `<button class="btn sm" data-vm="vbox|${esc(m.name)}|start">${icon("play")}Start</button>`}</div></div>`).join("");
  const wsl = v.wsl.map((d) => `<div class="srv"><span class="sdot ${d.state === "Running" ? "on" : ""}"></span><div class="srv-meta"><b>${esc(d.name)}${d.launchpad ? " · Cluster" : ""}</b><small>WSL ${esc(d.version)} · ${d.state === "Running" ? "läuft" : "gestoppt"}</small></div>
    <div class="srv-act">${d.launchpad ? `<button class="btn sm" data-vm="wsl|${esc(d.name)}|lp-start" title="Cluster starten">${icon("play")}Cluster starten</button><button class="btn sm btn-ghost" data-vm="wsl|${esc(d.name)}|lp-status">Status</button><button class="btn sm btn-ghost" data-vm="wsl|${esc(d.name)}|lp-stop" title="RAM an Windows zurückgeben">${icon("stop")}Stopp</button>` : ""}
      <button class="icon-btn sm" data-vm="wsl|${esc(d.name)}|terminal" title="Linux-Terminal">${icon("terminal")}</button>${d.state === "Running" && !d.launchpad ? `<button class="btn sm btn-ghost" data-vm="wsl|${esc(d.name)}|stop">${icon("stop")}</button>` : ""}</div></div>`).join("");
  box.innerHTML = (vb || wsl) ? vb + wsl : `<div class="empty">Keine VMs gefunden.</div>`;
}
async function loadQuick() {
  const box = $("#quickList");
  if (!box) return;
  const rb = CC.recycle;
  box.innerHTML = `<div class="quick">
    <button class="qbtn" data-quick="lock">${icon("lock")}<b>Sperren</b><small>Bildschirm sperren</small></button>
    <button class="qbtn" data-quick="sleep">${icon("moon")}<b>Energiesparen</b><small>Laptop schlafen legen</small></button>
    <button class="qbtn" data-quick="empty-recycle">${icon("trash")}<b>Papierkorb leeren</b><small id="rbInfo">${rb && rb.bytes != null ? `${fmtN(rb.items)} Dateien · ${fmtBytes(rb.bytes)}` : "wird gezählt…"}</small></button>
    <button class="qbtn" data-sorter="preview">${icon("layers")}<b>Downloads sortieren</b><small>mit deinem Sortierer, erst Vorschau</small></button>
  </div><div id="sorterOut"></div>`;
  if (!rb) { CC.recycle = await cc("recycle"); if ($("#rbInfo") && CC.recycle.bytes != null) $("#rbInfo").textContent = `${fmtN(CC.recycle.items)} Dateien · ${fmtBytes(CC.recycle.bytes)}`; }
}
async function loadApps() {
  const box = $("#appList");
  if (!box) return;
  CC.apps = CC.apps || (await cc("apps")).apps;
  box.innerHTML = CC.apps.map((a) => `<button class="app-tile" data-app="${esc(a.name)}">${icon(a.name === "Explorer" ? "folder" : "app")}<span>${esc(a.name.replace(" (classic)", ""))}</span></button>`).join("");
}

// ------------------------------------------------------------ Monitor (Live-Seiten + CI)
const viewMonitor = () => `<div class="page">${pageHead("pulse", "Monitor", "Sind deine Live-Seiten erreichbar, und sind die GitHub-Pipelines grün? Prüft alle 5 Minuten.", "#4fd18b",
  `<button class="btn" data-mon-fresh>${icon("refresh")}Jetzt prüfen</button>`)}
  <div class="panel"><div class="panel-title">${icon("globe")}Live-Seiten<span class="act-sum" id="siteSum"></span></div><div id="siteList"><div class="loading" style="height:80px">Prüfe…</div></div></div>
  <div class="panel"><div class="panel-title">${icon("git")}GitHub Actions<span class="act-sum" id="ciSum"></span></div><div id="ciList"><div class="loading" style="height:80px">Lade…</div></div></div></div>`;
async function loadMonitor(fresh) {
  const [s, c] = await Promise.all([cc("sites", fresh ? "fresh=1" : ""), cc("ci", fresh ? "fresh=1" : "")]);
  CC.sites = s; CC.ci = c;
  S.cc.down = s.sites.filter((x) => !x.ok).length + (c.repos || []).reduce((a, r) => a + r.workflows.filter((w) => w.conclusion === "failure").length, 0);
  if ($("#siteList")) {
    $("#siteSum").textContent = `${s.sites.filter((x) => x.ok).length} von ${s.sites.length} online · geprüft ${ago(s.checked)}`;
    $("#siteList").innerHTML = `<div class="site-list">${s.sites.map((x) => `<div class="site ${x.ok ? "" : "down"}"><span class="sdot ${x.ok ? "on" : "bad"}"></span>
      <div class="srv-meta"><b><a href="#/p/${enc(x.id)}">${esc(x.name)}</a></b><small><a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.url.replace(/^https?:\/\//, ""))}</a></small></div>
      <div class="uptime" title="Letzte Prüfungen">${x.history.map((h) => `<i class="${h[1] ? "ok" : "bad"}" title="${new Date(h[0] * 1000).toLocaleString("de-CH")}${h[2] ? ` · ${h[2]} ms` : ""}"></i>`).join("")}</div>
      <span class="site-ms">${x.ok ? `${x.ms} ms` : esc(x.error || `Fehler ${x.code}`)}</span><span class="site-up">${x.uptime}%</span></div>`).join("")}</div>`;
  }
  if ($("#ciList")) {
    if (c.error) { $("#ciList").innerHTML = `<div class="empty">${esc(c.error)}</div>`; return; }
    const all = c.repos.flatMap((r) => r.workflows);
    $("#ciSum").textContent = `${all.filter((w) => w.conclusion === "success").length} grün · ${all.filter((w) => w.conclusion === "failure").length} rot · ${all.filter((w) => w.status !== "completed").length} laufen`;
    const badge = (w) => w.status !== "completed" ? `<span class="ci warm">läuft</span>` : `<span class="ci ${w.conclusion === "success" ? "ok" : w.conclusion === "failure" ? "bad" : ""}">${{ success: "grün", failure: "rot", cancelled: "abgebrochen", skipped: "übersprungen" }[w.conclusion] || esc(w.conclusion || "")}</span>`;
    $("#ciList").innerHTML = `<div class="ci-grid">${c.repos.map((r) => `<div class="ci-repo"><b>${esc(r.repo)}</b>${r.workflows.map((w) => `<a class="ci-row" href="${esc(w.url)}" target="_blank" rel="noopener">${badge(w)}<span>${esc(w.name)}</span><small>${isoAgo(w.date)}</small></a>`).join("")}</div>`).join("")}</div>`;
  }
}

// ------------------------------------------------------------ Roblox
const viewRoblox = () => `<div class="page">${pageHead("cube", "Roblox", "Live-Zahlen deiner veröffentlichten Spiele über die öffentliche Roblox-API (jede Minute neu).", "#ff7a8a",
  `<button class="btn" data-rbx-fresh>${icon("refresh")}Aktualisieren</button>`)}<div id="rbxBody"><div class="loading">Lade…</div></div></div>`;
function rbxChart(h) {
  if (!h || h.length < 2) return `<div class="dc-note">Der Verlauf füllt sich, solange ATLAS offen ist.</div>`;
  const max = Math.max(1, ...h.map((x) => x[1]));
  const t0 = h[0][0], t1 = h[h.length - 1][0] || t0 + 1;
  const pts = h.map((x) => `${((x[0] - t0) / (t1 - t0 || 1)) * 100},${40 - (x[1] / max) * 36}`).join(" ");
  return `<svg class="rbx-chart" viewBox="0 0 100 40" preserveAspectRatio="none"><polyline points="${pts}" fill="none" stroke="#ff7a8a" stroke-width="1.5" vector-effect="non-scaling-stroke"/></svg>
    <div class="rbx-axis"><span>${new Date(t0 * 1000).toLocaleString("de-CH", { dateStyle: "short", timeStyle: "short" })}</span><span>max. ${max} gleichzeitig</span><span>jetzt</span></div>`;
}
async function loadRoblox(fresh) {
  const r = await cc("roblox", fresh ? "fresh=1" : "");
  CC.roblox = r;
  const box = $("#rbxBody");
  if (!box) return;
  if (r.error) { box.innerHTML = `<div class="empty">${esc(r.error)}</div>`; return; }
  box.innerHTML = `<div class="dc-note" style="margin-bottom:14px">Ersteller: <b>${esc(r.creator)}</b> · ${r.games.length} öffentliche${r.games.length === 1 ? "s Spiel" : " Spiele"} · aktualisiert ${ago(r.checked)}</div>` +
    r.games.map((g) => `<div class="rbx-game panel">
      <img class="rbx-icon" src="${esc(g.icon || "")}" alt="">
      <div class="rbx-main"><div class="rbx-top"><h3>${esc(g.name)}</h3>${g.playing ? `<span class="ci ok">${g.playing} spielen gerade</span>` : `<span class="ci">niemand online</span>`}
        <a class="btn sm" href="${esc(g.url)}" target="_blank" rel="noopener">${icon("external")}Auf Roblox</a></div>
        <div class="rbx-kpis"><div><b>${fmtN(g.playing)}</b><span>online</span></div><div><b>${fmtN(g.visits)}</b><span>Besuche</span></div><div><b>${fmtN(g.favorites)}</b><span>Favoriten</span></div>
          <div><b>${g.rating == null ? "–" : g.rating + "%"}</b><span>${g.likes} Likes · ${g.dislikes} Dislikes</span></div><div><b>${g.maxPlayers}</b><span>max. pro Server</span></div></div>
        ${rbxChart(g.history)}
        <div class="dc-note">Erstellt ${fmtDate(Date.parse(g.created) / 1000)} · zuletzt aktualisiert ${isoAgo(g.updated)}${g.genre ? ` · ${esc(g.genre)}` : ""}</div></div></div>`).join("");
}

// ------------------------------------------------------------ Aufräumen
const viewStorage = () => `<div class="page">${pageHead("disk", "Aufräumen", "Wo dein Speicher hingeht: grösste Ordner, riesige Dateien und doppelte Downloads. Gelöscht wird nur, was du anklickst, und es landet im Papierkorb.", "#f2b84b",
  `<button class="btn btn-accent" data-st-run>${icon("search")}Jetzt analysieren</button>`)}<div id="stBody"><div class="loading">Lade…</div></div></div>`;
async function loadStorage() {
  const st = await cc("storage");
  CC.storage = st;
  const box = $("#stBody");
  if (!box) return;
  const disks = (SYS.last?.disks || []).map((d) => `<div class="sys-row"><span>${icon("disk")}Laufwerk ${esc(d.mount)}</span><b>${GB(d.free)} GB frei von ${GB(d.total)} GB</b></div>${bar(d.pct)}`).join("");
  const rb = CC.recycle || await cc("recycle");
  CC.recycle = rb;
  let html = `<div class="cc-grid"><div class="panel"><div class="panel-title">${icon("disk")}Laufwerke</div>${disks}
    ${rb.bytes ? `<div class="st-hint">${icon("trash")}<div><b>Papierkorb: ${fmtBytes(rb.bytes)}</b> in ${fmtN(rb.items)} Dateien. Leeren gibt diesen Platz sofort frei.</div><button class="btn sm" data-quick="empty-recycle">Leeren</button></div>` : ""}</div>`;
  if (st.running) html += `<div class="panel"><div class="panel-title">${icon("refresh")}Analyse läuft</div><div class="loading" style="height:80px">${esc(st.progress || "…")}</div></div>`;
  const r = st.result;
  if (!r) {
    html += `<div class="panel"><div class="empty">Noch keine Analyse. «Jetzt analysieren» rechnet einmal alle Ordner durch (1 bis 3 Minuten).</div></div></div>`;
    box.innerHTML = html;
    if (st.running) setTimeout(() => parseRoute().parts[0] === "storage" && loadStorage(), 3000);
    return;
  }
  const maxF = Math.max(...r.folders.map((f) => f.bytes), 1);
  html += `<div class="panel"><div class="panel-title">${icon("folder")}Grösste Ordner<span class="act-sum">Stand ${ago(r.done)}</span></div>
    ${r.folders.slice(0, 14).map((f) => `<div class="st-row" data-st-open="${esc(f.path)}"><span title="${esc(f.path)}">${esc(f.name)}</span><b>${fmtBytes(f.bytes)}</b></div>${bar((f.bytes / maxF) * 100, "#8b9cff")}`).join("")}</div>
    <div class="panel cc-wide"><div class="panel-title">${icon("file")}Riesige Dateien (über 250 MB)</div>
      ${r.big.length ? `<table class="table"><tbody>${r.big.map((b) => `<tr><td><div class="cell-name">${icon(fileIcon(b.path))}<div><b>${esc(b.path.split("\\").pop())}</b><small>${esc(b.path)}</small></div></div></td><td class="num">${fmtBytes(b.bytes)}</td><td class="num">${ago(b.mtime)}</td>
        <td class="num"><button class="icon-btn sm" data-st-open="${esc(b.path)}" title="Im Explorer zeigen">${icon("folder")}</button>${(() => { const pr = projOfPath(b.path); return pr ? `<a class="tag" href="#/p/${enc(pr.id)}" title="Gehört zu einem Projekt, darum hier nicht löschbar">${esc(pr.name)}</a>` : `<button class="icon-btn sm btn-danger" data-st-del="${esc(b.path)}" title="In den Papierkorb">${icon("trash")}</button>`; })()}</td></tr>`).join("")}</tbody></table>` : `<div class="empty">Keine.</div>`}</div>
    <div class="panel cc-wide"><div class="panel-title">${icon("copy")}Doppelte Dateien in Downloads<span class="act-sum">${r.dups.length} Gruppen · ${fmtBytes(r.dupBytes)} verschwendet</span></div>
      ${r.dups.length ? `<div class="toolbar"><button class="btn sm" data-st-all>${icon("check")}Alle Kopien auswählen</button><button class="btn sm btn-danger" data-st-delsel>${icon("trash")}Ausgewählte in den Papierkorb</button><span class="dc-note" id="stSel"></span></div>
      <div class="dup-list">${r.dups.map((d) => `<div class="dup"><div class="dup-keep">${icon("check")}<b>${esc(d.keep.split("\\").pop())}</b><small>bleibt · ${fmtBytes(d.size)} · ${esc(d.keep.replace(/^.*\\Downloads\\/, "Downloads\\"))}</small></div>
        ${d.copies.map((c) => `<label class="dup-copy"><input type="checkbox" data-st-copy="${esc(c)}" data-size="${d.size}"><span>${esc(c.replace(/^.*\\Downloads\\/, "Downloads\\"))}</span></label>`).join("")}</div>`).join("")}</div>` : `<div class="empty">Keine doppelten Dateien gefunden.</div>`}</div></div>`;
  box.innerHTML = html;
}

// ------------------------------------------------------------ Bewerbungen
const viewApply = () => `<div class="page wide">${pageHead("briefcase", "Bewerbungen", "Dein Bewerbungen_Tracker.xlsx als Zentrale: Pipeline, Antworten aus Outlook, Nachfass-Erinnerungen und Dossiers.", "#ffa66b",
  `<button class="btn" data-apply-excel>${icon("external")}In Excel öffnen</button><button class="btn" data-apply-refresh>${icon("refresh")}Neu laden</button>`)}<div id="apBody"><div class="loading">Lese Tracker und Outlook…</div></div></div>`;
async function loadApply(force) {
  if (!CC.apply || force) CC.apply = await cc("apply");
  const d = CC.apply;
  S.cc.applyAlerts = d.stats ? d.stats.due + d.stats.newReplies : 0;
  const box = $("#apBody");
  if (!box) return;
  if (d.error) { box.innerHTML = `<div class="empty">${esc(d.error)}</div>`; return; }
  const st = d.stats;
  const guard = d.mailBlocked ? `<div class="guard-box small">${icon("lock")}<span>Outlook hat den Mail-Zugriff blockiert: Antworten werden gerade nicht erkannt. Details unter <a href="#/mail">E-Mails</a>.</span></div>` : "";
  const weeks = Object.entries(st.weeks);
  const wmax = Math.max(1, ...weeks.map((w) => w[1]));
  const alerts = d.apps.filter((a) => a.newReply || a.due);
  const card = (a) => `<div class="ap-card ${a.newReply ? "new" : ""} ${a.due ? "due" : ""}" data-ap="${a.row}">
    <b>${esc(a.firm)}</b><small>${esc(a.role)}${a.place ? ` · ${esc(a.place)}` : ""}</small>
    <div class="ap-tags">${a.sent ? `<span>${a.days} T.</span>` : ""}${a.mails?.length ? `<span>${icon("mail", "i att")} ${a.mails.length}</span>` : ""}${a.newReply ? `<span class="hot">neue Antwort?</span>` : ""}${a.due ? `<span class="warn">nachfassen</span>` : ""}${a.dossier ? `<span>${icon("doc", "i att")}</span>` : ""}</div></div>`;
  const filt = (a) => (!CC.applyQ || `${a.firm} ${a.role} ${a.place}`.toLowerCase().includes(CC.applyQ.toLowerCase()));
  box.innerHTML = guard + `<div class="kpis ap-kpis">
      <div class="kpi"><b>${st.sent}</b><span>gesendet</span></div><div class="kpi"><b>${st.open}</b><span>warten auf Antwort</span></div>
      <div class="kpi"><b>${st.rate}%</b><span>Antwortquote</span></div><div class="kpi"><b>${st.avgReplyDays ?? "–"}</b><span>Tage bis Antwort (Ø)</span></div>
      <div class="kpi"><b>${st.interviews}</b><span>Gespräche / Zusagen</span></div><div class="kpi"><b>${st.prepared}</b><span>noch vorbereitet</span></div></div>
    <div class="dash" style="margin-top:18px"><div>
      ${alerts.length ? `<div class="panel ap-alerts"><div class="panel-title">${icon("spark")}Braucht deine Aufmerksamkeit<span class="act-sum">${alerts.length}</span></div>
        ${alerts.map((a) => `<div class="rowlink" data-ap="${a.row}"><span class="dot ${a.newReply ? "on" : ""}" style="${a.due && !a.newReply ? "background:#f2b84b" : ""}"></span><div class="meta"><b>${esc(a.firm)}</b><small>${a.newReply ? `Mail «${esc(a.mails[0].subject)}» ${isoAgo(a.mails[0].date)}, Status ist noch «${esc(a.status)}»` : `seit ${a.days} Tagen keine Antwort, nachfassen am ${fmtDate(Date.parse(a.followup) / 1000)}`}</small></div><span class="when">${a.newReply ? "Status anpassen" : "nachfassen"}</span></div>`).join("")}</div>` : ""}
    </div><div><div class="panel"><div class="panel-title">${icon("calendar")}Gesendet pro Woche</div>
      <div class="ap-weeks">${weeks.map(([w, n]) => `<div title="${w}: ${n}"><i style="height:${(n / wmax) * 100}%"></i><span>${w.split("-W")[1]}</span><b>${n}</b></div>`).join("")}</div></div></div></div>
    <div class="toolbar" style="margin-top:20px"><input class="select" id="apSearch" placeholder="Firma, Stelle oder Ort suchen…" value="${esc(CC.applyQ)}" style="width:280px"></div>
    <div class="ap-board">${d.stages.filter((s) => s.id !== "archiv").map((s) => {
      const list = d.apps.filter((a) => a.stage === s.id && filt(a));
      return `<div class="ap-col ${s.id}"><div class="ap-col-head">${esc(s.label)}<span>${list.length}</span></div>${list.map(card).join("") || `<div class="ap-empty">–</div>`}</div>`;
    }).join("")}</div>`;
}
function applyModal(row) {
  const d = CC.apply;
  const a = d.apps.find((x) => x.row === +row);
  if (!a) return;
  modal(`<h2>${esc(a.firm)}</h2>
    <dl class="kv"><dt>Stelle</dt><dd>${esc(a.role)}</dd><dt>Ort</dt><dd>${esc(a.place)}</dd><dt>Weg</dt><dd>${esc(a.way)}</dd>
      <dt>Gesendet</dt><dd>${a.sent ? `${fmtDate(Date.parse(a.sent) / 1000)} (vor ${a.days} Tagen)` : "noch nicht"}</dd>${a.followup ? `<dt>Nachfassen</dt><dd>${fmtDate(Date.parse(a.followup) / 1000)}${a.due ? " · fällig" : ""}</dd>` : ""}</dl>
    <form id="apForm" class="form" style="margin-top:16px">
      <div class="field"><label>Status</label><select name="status">${d.statuses.map((s) => `<option ${s === a.status ? "selected" : ""}>${esc(s)}</option>`).join("")}</select><small>Wird direkt in deinen Tracker geschrieben (mit Sicherung)</small></div>
      <div class="field"><label>Dossier</label>${a.dossier ? `<div style="display:flex;gap:6px"><button type="button" class="btn sm" data-ap-pdf="${esc(a.dossier)}">${icon("eye")}Ansehen</button><button type="button" class="btn sm btn-ghost" data-ap-open="${esc(a.dossier)}">${icon("external")}Öffnen</button></div>` : `<small>kein PDF gefunden</small>`}</div>
      <div class="field full"><label>Notiz</label><textarea name="note" rows="3">${esc(a.note)}</textarea></div>
      <div class="field full"><label>Mails zu ${esc(a.firm)}</label>${a.mails?.length ? `<div class="rows">${a.mails.map((m) => `<a class="rowlink" href="#/mail?id=${enc(m.id)}" data-close><span class="dot ${m.unread ? "on" : ""}"></span><div class="meta"><b>${esc(m.subject)}</b><small>${esc(m.from)}</small></div><span class="when">${isoAgo(m.date)}</span></a>`).join("")}</div>` : `<small>Keine passenden Mails im Posteingang gefunden.</small>`}</div>
      <div class="modal-foot" style="grid-column:1/-1"><button type="button" class="btn btn-ghost" data-close>Schliessen</button><button class="btn btn-accent">${icon("check")}Speichern</button></div></form>`);
  $("#apForm").onsubmit = async (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    const body = { row: a.row };
    if (f.status !== a.status) body.status = f.status;
    if (f.note !== a.note) body.note = f.note;
    if (!body.status && body.note === undefined) return closeModal();
    try {
      const r = await ccPost("apply-update", body);
      if (r.error) return toast(r.error, true);
      closeModal(); toast("Im Tracker gespeichert");
      await loadApply(true);
    } catch (err) { toast(err.message, true); }
  };
}

// ------------------------------------------------------------ Obsidian-Notizen
const viewNotes = () => `<div class="page wide">${pageHead("book", "Notizen", "Deine Obsidian-Notizen, durchsuchbar und mit Projekten verknüpft. Neue Projekt-Notizen legst du auf jeder Projektseite an.", "#a882ff")}
  <div class="toolbar"><input class="select" id="noteSearch" placeholder="Notizen durchsuchen…" style="width:300px"></div>
  <div class="mail notes-view"><div class="mail-list" id="noteList"><div class="loading">Lade…</div></div><div class="mail-read" id="noteRead"><div class="fempty"><div>${icon("book")}<div>Notiz links auswählen</div></div></div></div></div></div>`;
async function loadNotes(q = "") {
  const r = await cc("notes", q ? "q=" + enc(q) : "");
  const box = $("#noteList");
  if (!box) return;
  if (r.error) { box.innerHTML = `<div class="empty">${esc(r.error)}</div>`; return; }
  box.innerHTML = r.notes.length ? r.notes.map((n) => `<div class="mail-item ${CC.noteSel === n.rel ? "on" : ""}" data-note="${esc(n.rel)}"><div class="mi-top"><b>${esc(n.title)}</b><span>${ago(n.mtime)}</span></div>
    <div class="mi-pre">${esc(n.preview)}</div>${n.tags.length ? `<div class="tech" style="margin-top:5px">${n.tags.map((t) => `<span class="tag">#${esc(t)}</span>`).join("")}</div>` : ""}</div>`).join("") : `<div class="empty">Keine Notizen gefunden.</div>`;
}
async function openNote(rel) {
  CC.noteSel = rel;
  $$("[data-note]").forEach((el) => el.classList.toggle("on", el.dataset.note === rel));
  const n = await cc("note", "rel=" + enc(rel));
  const box = $("#noteRead");
  if (n.error) { box.innerHTML = `<div class="empty">${esc(n.error)}</div>`; return; }
  const body = n.text.replace(/^---\n[\s\S]*?\n---\n/, "").replace(/\[\[([^\]|]+)(\|([^\]]+))?\]\]/g, (m, a, _, b) => `**${b || a}**`);
  box.innerHTML = `<div class="mr-head"><h2>${esc(n.title)}</h2><button class="btn btn-accent sm" data-note-open="${esc(rel)}">${icon("external")}In Obsidian öffnen</button></div><div class="md" style="padding:20px 26px">${md(body, { p: "", base: "" })}</div>`;
}

// ------------------------------------------------------------ Startseite: Kontrollzentrum-Kacheln + Discord-Feed
async function homeControl() {
  const box = $("#homeControl");
  if (!box) return;
  // Kachel: Farbe, Symbol, Name, Zahl + Wort, Zeile darunter, Zustand (on/ok/warn/bad)
  const tile = (go, ic, col, label, num, unit, sub, cls = "") => `<a class="cc-tile ${cls}" href="${go}" style="--tc:${col}">
    <div class="cct-head"><span class="cct-ico ${isApp(ic) ? "app" : ""}">${isApp(ic) ? appImg(ic) : icon(ic)}</span><span class="cct-label">${esc(label)}</span><span class="cct-state" title="${{ on: "läuft", ok: "alles gut", warn: "braucht Aufmerksamkeit", bad: "Problem" }[cls] || "aus"}"></span></div>
    <div class="cct-val">${num == null ? `<span class="cc-skel">…</span>` : `${num}<em>${unit}</em>`}</div><span class="cct-sub">${sub || "&nbsp;"}</span>${icon("chev", "i cct-go")}</a>`;
  const draw = () => {
    if (!$("#homeControl")) return;
    const sv = CC.servers, s = CC.sites, c = CC.ci, rb = CC.roblox, ap = CC.apply, vm = CC.vms, au = CC.auto;
    const red = c && !c.error ? c.repos.flatMap((r) => r.workflows).filter((w) => w.conclusion === "failure").length : 0;
    const vmOn = vm ? vm.vbox.filter((v) => v.running).length + vm.wsl.filter((w) => w.state === "Running").length : null;
    const g = rb && !rb.error ? rb.games[0] : null;
    const run = sv ? sv.filter((x) => x.state === "running").length : null;
    const on = au && au.rules ? au.rules.filter((r) => r.enabled).length : null;
    const last = au && au.rules ? Math.max(0, ...au.rules.map((r) => r.lastRun || 0)) : 0;
    $("#homeControl").innerHTML = `<div class="cc-music mp-slot" data-big="0">${mediaHTML(CC.media, false)}</div>` +
      tile("#/control", "nodejs", "#6aa8ff", "Dev-Server", run, "laufen", sv ? `${sv.length} bereit zum Starten` : "", run ? "on" : "") +
      tile("#/monitor", "operagx", "#3fd99a", "Live-Seiten", s ? `${s.sites.filter((x) => x.ok).length}/${s.sites.length}` : null, "online", c && !c.error ? (red ? `${red} Pipeline${red > 1 ? "s" : ""} rot` : "alle Pipelines grün") : "", s && s.sites.some((x) => !x.ok) || red ? "bad" : s ? "ok" : "") +
      tile("#/roblox", "roblox", "#ff7a59", g ? g.name : "Roblox", g ? g.playing : null, "spielen", g ? `${fmtN(g.visits)} Besuche · ${fmtN(g.favorites)} Favoriten` : "", g && g.playing ? "on" : "") +
      tile("#/apply", "linkedin", "#ffb547", "Bewerbungen", ap && ap.stats ? ap.stats.open : null, "offen", ap && ap.stats ? `${ap.stats.newReplies} neue Antworten · ${ap.stats.due} nachfassen` : "", ap && ap.stats && ap.stats.newReplies + ap.stats.due ? "warn" : "") +
      tile("#/control", "virtualbox", "#b494ff", "VMs & WSL", vm ? vmOn : null, vm ? (vmOn ? "laufen" : "alle aus") : "", vm ? `${vm.vbox.length} VirtualBox · ${vm.wsl.length} WSL` : "", vmOn ? "on" : "") +
      tile("#/automations", "taskschd", "#ff6bd5", "Automationen", on, "aktiv", au && au.rules ? (last ? `zuletzt ausgelöst ${ago(last)}` : `${au.rules.length} Regeln`) : "", on ? "on" : "");
  };
  draw();
  const jobs = [];
  if (!CC.servers) jobs.push(cc("servers").then((r) => (CC.servers = r.servers)));
  if (!CC.sites) jobs.push(cc("sites").then((r) => (CC.sites = r)));
  if (!CC.ci) jobs.push(cc("ci").then((r) => (CC.ci = r)));
  if (!CC.roblox) jobs.push(cc("roblox").then((r) => (CC.roblox = r)));
  if (!CC.vms) jobs.push(cc("vms").then((r) => (CC.vms = r)));
  if (!CC.apply) jobs.push(cc("apply", "mail=bg").then((r) => (CC.apply = r)));
  if (!CC.auto) jobs.push(cc("automations").then((r) => (CC.auto = r)));
  jobs.forEach((j) => j.then(draw).catch(() => {}));
  mediaTick();
}
async function homeDiscord() {
  const box = $("#homeDiscord");
  if (!box) return;
  try {
    const f = CC.feed || await cc("discord-feed");
    CC.feed = f;
    if (!f.configured || f.error || !f.items?.length) { box.remove(); return; }
    box.innerHTML = `<div class="panel-title">${icon("chat")}Discord: neueste Nachrichten<a href="#/discord">Öffnen</a></div>
      <div class="rows">${f.items.slice(0, 6).map((m) => `<div class="rowlink" data-go="#/discord"><span class="dc-mini">${m.avatar ? `<img src="${esc(m.avatar)}" alt="">` : esc(m.author.slice(0, 1))}</span><div class="meta"><b>${esc(m.author)} <span style="color:var(--muted);font-weight:400">in #${esc(m.channel)}</span></b><small>${esc(m.content)}</small></div><span class="when">${isoAgo(m.date)}</span></div>`).join("")}</div>`;
  } catch { box.remove(); }
}

// ------------------------------------------------------------ Projektseite: Dev-Server + Obsidian
async function drawProjectExtras() {
  const r = parseRoute();
  const box = $("#pExtra");
  if (r.parts[0] !== "p" || !box) return;
  const p = S.prj[r.parts[1]];
  if (!p || p.virtual) return;
  if (!CC.servers) { CC.servers = (await cc("servers")).servers; }
  const mine = (CC.servers || []).filter((s) => projOfPath(s.target)?.id === p.id);
  let html = mine.length ? `<div class="side-block"><h4>${icon("server")}Dev-Server</h4>${serversHTML(mine)}</div>` : "";
  html += `<div class="side-block" id="pNotes"><h4>${icon("book")}Obsidian</h4><div class="dc-note">Suche Notizen…</div></div>`;
  if (!$("#pExtra")) return;
  $("#pExtra").innerHTML = html;
  const n = await cc("project-notes", `name=${enc(p.name)}&id=${enc(p.id)}`);
  const nb = $("#pNotes");
  if (!nb) return;
  nb.innerHTML = `<h4>${icon("book")}Obsidian</h4>${(n.notes || []).map((x) => `<a class="linkrow" href="#" data-note-open="${esc(x.rel)}">${icon("book")}<span>${esc(x.title)}</span><small>${ago(x.mtime)}</small></a>`).join("")}
    <button class="btn sm" data-note-new="${esc(p.id)}" style="margin-top:8px">${icon("plus")}${(n.notes || []).length ? "Projekt-Notiz öffnen" : "Projekt-Notiz anlegen"}</button>`;
}

// ------------------------------------------------------------ Discord: Nachricht / Ankündigung senden
function discordComposer() {
  const box = $("#dcMsgs");
  if (!box || !DC.channel || $("#dcCompose")) return;
  box.insertAdjacentHTML("afterend", `<form id="dcCompose" class="dc-compose">
    <div class="mode-switch"><button type="button" class="on" data-dc-mode="msg">Nachricht</button><button type="button" data-dc-mode="embed">Ankündigung</button></div>
    <input name="title" class="select" placeholder="Titel der Ankündigung" hidden>
    <textarea name="content" class="notes" rows="2" placeholder="Nachricht an #kanal… (Enter = senden, Shift+Enter = neue Zeile)"></textarea>
    <div class="dc-compose-foot"><input type="color" name="color" value="#f2b84b" hidden title="Farbe"><span class="dc-note">Wird als dein ATLAS-Bot gesendet. @everyone wird nicht ausgelöst.</span><button class="btn btn-accent sm">${icon("send")}Senden</button></div></form>`);
}

// ------------------------------------------------------------ Verdrahtung
Object.assign(EXTRA_VIEWS, { control: viewControl, monitor: viewMonitor, roblox: viewRoblox, storage: viewStorage, apply: viewApply, notes: viewNotes });
const _afterRenderBase = afterRender;
afterRender = function (a, b, r) {  // eslint-disable-line no-func-assign
  _afterRenderBase(a, b, r);
  const err = (e) => toast(e.message, true);
  if (!a) { homeControl(); homeDiscord(); }
  if (a === "control") { loadServers().catch(err); loadVms().catch(err); loadQuick().catch(err); loadApps().catch(err); mediaTick(); }
  if (a === "monitor") loadMonitor().catch(err);
  if (a === "roblox") loadRoblox().catch(err);
  if (a === "storage") loadStorage().catch(err);
  if (a === "apply") loadApply().catch(err);
  if (a === "notes") loadNotes().catch(err);
  if (a === "p") drawProjectExtras().catch(() => {});
};
// Discord-Kanal geöffnet → Eingabefeld darunter
new MutationObserver(() => discordComposer()).observe(document.body, { childList: true, subtree: true });
// Server-Liste regelmässig auffrischen, solange die Steuerung offen ist
setInterval(() => { if (parseRoute().parts[0] === "control" && !document.hidden) loadServers().catch(() => {}); }, 5000);
setInterval(() => { if (parseRoute().parts[0] === "roblox" && !document.hidden) loadRoblox().catch(() => {}); }, 60000);

document.addEventListener("click", async (e) => {
  const t = e.target;
  const q = (sel) => t.closest(sel);
  const err = (x) => toast(x.message, true);
  let el;
  try {
    if ((el = q("[data-media]"))) { CC.media = await ccPost("media", { action: el.dataset.media }); return mediaTick(); }
    if ((el = q("[data-srv-start]"))) { el.closest(".srv-act").innerHTML = `<span class="srv-wait">startet…</span>`; const r = await ccPost("server-start", { name: el.dataset.srvStart }); if (r.error) toast(r.error, true); else toast("Server startet…"); setTimeout(() => loadServers().then(() => render(true)), 1500); return loadServers(); }
    if ((el = q("[data-srv-stop]"))) { el.closest(".srv-act").innerHTML = `<span class="srv-wait">stoppt…</span>`; const r = await ccPost("server-stop", { name: el.dataset.srvStop }); r.error ? toast(r.error, true) : toast("Gestoppt"); return loadServers(); }
    if ((el = q("[data-srv-log]"))) { const r = await cc("server-log", "name=" + enc(el.dataset.srvLog)); return modal(`<h2>Log: ${esc(el.dataset.srvLog)}</h2><pre class="log">${esc(r.log || "(leer, Server wurde noch nicht über ATLAS gestartet)")}</pre><div class="modal-foot"><button class="btn" data-close>Schliessen</button></div>`); }
    if ((el = q("[data-vm]"))) {
      const [kind, name, action] = el.dataset.vm.split("|");
      if (action === "stop" && !confirm(`${name} herunterfahren?`)) return;
      const r = await ccPost("vm", { kind, name, action });
      r.error ? toast(r.error, true) : toast(action.startsWith("lp-") || action === "terminal" ? "Fenster wird geöffnet…" : "Erledigt");
      return setTimeout(() => loadVms().catch(() => {}), 2500);
    }
    if ((el = q("[data-app]"))) { const r = await ccPost("app", { name: el.dataset.app }); return r.error ? toast(r.error, true) : toast(`${el.dataset.app} startet…`); }
    if ((el = q("[data-quick]"))) {
      const a = el.dataset.quick;
      if (a === "empty-recycle" && !confirm(`Papierkorb endgültig leeren?${CC.recycle?.bytes ? ` (${fmtBytes(CC.recycle.bytes)})` : ""}\nDas kann nicht rückgängig gemacht werden.`)) return;
      if (a === "sleep" && !confirm("Laptop jetzt schlafen legen?")) return;
      const r = await ccPost("quick", { action: a });
      if (r.error) return toast(r.error, true);
      if (a === "empty-recycle") { toast("Papierkorb geleert"); CC.recycle = null; if (parseRoute().parts[0] === "storage") loadStorage(); else loadQuick(); }
      return;
    }
    if ((el = q("[data-sorter]"))) {
      const mode = el.dataset.sorter;
      $("#sorterOut").innerHTML = `<div class="loading" style="height:60px">${mode === "preview" ? "Vorschau läuft…" : "Wird ausgeführt…"}</div>`;
      const r = await ccPost("sorter", { mode, undo: CC.sorter?.undo });
      if (r.error) { $("#sorterOut").innerHTML = ""; return toast(r.error, true); }
      CC.sorter = mode === "run" ? r : CC.sorter;
      $("#sorterOut").innerHTML = `<pre class="log">${esc(r.output.trim().split("\n").slice(-40).join("\n"))}</pre>
        <div class="toolbar">${mode === "preview" ? (r.moves ? `<b>${r.moves} Dateien würden verschoben.</b><button class="btn btn-accent sm" data-sorter="run">${icon("check")}Jetzt sortieren</button>` : "<b>Nichts zu sortieren.</b>") : mode === "run" && r.undo ? `<b>Sortiert.</b><button class="btn sm" data-sorter="undo">${icon("refresh")}Rückgängig machen</button>` : "<b>Erledigt.</b>"}</div>`;
      return;
    }
    if (q("[data-cc-refresh]")) { CC.recycle = null; CC.apps = null; return render(true); }
    if (q("[data-mon-fresh]")) { $("#siteList").innerHTML = `<div class="loading" style="height:60px">Prüfe…</div>`; return loadMonitor(true); }
    if (q("[data-rbx-fresh]")) return loadRoblox(true);
    if (q("[data-st-run]")) { await ccPost("storage", {}); toast("Analyse gestartet"); return loadStorage(); }
    if ((el = q("[data-st-open]"))) return openInExplorer(el.dataset.stOpen);
    if ((el = q("[data-st-del]"))) {
      if (!confirm(`In den Papierkorb verschieben?\n${el.dataset.stDel}`)) return;
      const r = await ccPost("recycle-files", { paths: [el.dataset.stDel] });
      toast(r.ok ? "In den Papierkorb verschoben" : "Konnte nicht verschoben werden", !r.ok);
      return loadStorage();
    }
    if (q("[data-st-all]")) { $$("[data-st-copy]").forEach((c) => (c.checked = true)); return updateSel(); }
    if (q("[data-st-delsel]")) {
      const paths = $$("[data-st-copy]:checked").map((c) => c.dataset.stCopy);
      if (!paths.length) return toast("Nichts ausgewählt", true);
      if (!confirm(`${paths.length} Kopien in den Papierkorb verschieben?\n(Die Originale bleiben, alles ist im Papierkorb wiederherstellbar.)`)) return;
      toast("Wird verschoben…");
      const r = await ccPost("recycle-files", { paths });
      toast(`${r.ok} verschoben${r.failed.length ? `, ${r.failed.length} nicht möglich` : ""}`, !!r.failed.length);
      return loadStorage();
    }
    if ((el = q("[data-ap]")) && !q(".modal")) return applyModal(el.dataset.ap);
    if ((el = q("[data-ap-pdf]"))) { closeModal(); return lbSlidesFile(el.dataset.apPdf); }
    if ((el = q("[data-ap-open]"))) return openInExplorer(el.dataset.apOpen, "default");
    if (q("[data-apply-refresh]")) { $("#apBody").innerHTML = `<div class="loading">Lese Tracker und Outlook…</div>`; return loadApply(true); }
    if (q("[data-apply-excel]")) return openInExplorer(CC.apply?.file, "default");
    if ((el = q("[data-note]"))) return openNote(el.dataset.note);
    if ((el = q("[data-note-open]"))) { e.preventDefault(); await ccPost("note-open", { rel: el.dataset.noteOpen }); return toast("Obsidian öffnet…"); }
    if ((el = q("[data-note-new]"))) { const p = S.prj[el.dataset.noteNew]; await ccPost("note-new", { id: p.id, paths: p.res.paths }); toast("Notiz in Obsidian geöffnet"); return setTimeout(drawProjectExtras, 1500); }
    if ((el = q("[data-dc-mode]"))) {
      $$("[data-dc-mode]").forEach((b) => b.classList.toggle("on", b === el));
      const f = $("#dcCompose"); const emb = el.dataset.dcMode === "embed";
      f.title.hidden = f.color.hidden = !emb; f.content.placeholder = emb ? "Text der Ankündigung…" : "Nachricht an #kanal… (Enter = senden, Shift+Enter = neue Zeile)";
      return;
    }
  } catch (x) { err(x); }
});
async function openInExplorer(path, how = "explorer") {
  const r = await ccPost("open-path", { path, how });
  r.error ? toast(r.error, true) : toast("Wird geöffnet…");
}
async function lbSlidesFile(path) {
  lbOpen([], path.split("\\").pop(), "Seiten werden vorbereitet…");
  try {
    const r = await api(`/api/c/pages?path=${enc(path)}`);
    if (!r.pages?.length) throw new Error(r.error || "Keine Seiten");
    LB.pages = r.pages; LB.i = 0; lbDraw();
  } catch (e) { $("#lbStage").innerHTML = `<div class="loading" style="color:#ccc">${esc(e.message)}</div>`; }
}
function updateSel() {
  const c = $$("[data-st-copy]:checked");
  if ($("#stSel")) $("#stSel").textContent = c.length ? `${c.length} ausgewählt · ${fmtBytes(c.reduce((a, x) => a + +x.dataset.size, 0))}` : "";
}
document.addEventListener("change", (e) => { if (e.target.matches("[data-st-copy]")) updateSel(); });
document.addEventListener("input", (e) => {
  if (e.target.id === "apSearch") { CC.applyQ = e.target.value; const pos = e.target.selectionStart; loadApply().then(() => { const i = $("#apSearch"); i.focus(); i.setSelectionRange(pos, pos); }); }
  if (e.target.id === "noteSearch") { clearTimeout(CC.nt); CC.nt = setTimeout(() => loadNotes(e.target.value), 200); }
});
document.addEventListener("keydown", (e) => {
  if (e.target.closest?.("#dcCompose") && e.target.name === "content" && e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.target.form.requestSubmit(); }
});
document.addEventListener("submit", async (e) => {
  if (e.target.id !== "dcCompose") return;
  e.preventDefault();
  const f = e.target;
  const emb = $("[data-dc-mode].on")?.dataset.dcMode === "embed";
  const body = { channel: DC.channel, content: emb ? "" : f.content.value.trim() };
  if (emb) body.embed = { title: f.title.value.trim(), description: f.content.value.trim(), color: f.color.value };
  if (!body.content && !(emb && (body.embed.title || body.embed.description))) return;
  try {
    const r = await ccPost("discord-send", body);
    if (r.error) return toast(r.error, true);
    f.content.value = ""; f.title.value = "";
    toast("Gesendet");
    loadMessages(DC.channel);
  } catch (err) { toast(err.message, true); }
});
// Dialog schliessen, wenn man die Seite wechselt
window.addEventListener("hashchange", () => { $("#modal").hidden = true; });
