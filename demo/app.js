/* ATLAS - Oberfläche */
"use strict";

// ------------------------------------------------------------ Grundlagen
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const enc = encodeURIComponent;
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const icon = (n, cls = "i") => `<svg class="${cls}"><use href="#i-${n}"/></svg>`;
const nf = new Intl.NumberFormat("de-CH");
const fmtN = (n) => nf.format(n || 0);
const fmtBytes = (b) => !b ? "0 B" : b < 1024 ? b + " B" : b < 1048576 ? Math.round(b / 1024) + " KB" : b < 1073741824 ? (b / 1048576).toFixed(1) + " MB" : (b / 1073741824).toFixed(2) + " GB";
const fmtDate = (t) => t ? new Date(t * 1000).toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" }) : "–";
function ago(t) {
  if (!t) return "–";
  const s = Date.now() / 1000 - t;
  if (s < 60) return "gerade eben";
  if (s < 3600) return `vor ${Math.floor(s / 60)} Min.`;
  if (s < 86400) return `vor ${Math.floor(s / 3600)} Std.`;
  const d = Math.floor(s / 86400);
  if (d < 2) return "gestern";
  if (d < 31) return `vor ${d} Tagen`;
  const m = Math.floor(d / 30.4);
  if (m < 12) return m === 1 ? "vor 1 Monat" : `vor ${m} Monaten`;
  const y = Math.floor(d / 365);
  return y === 1 ? "vor 1 Jahr" : `vor ${y} Jahren`;
}
const store = {
  get(k, d) { try { const v = localStorage.getItem("atlas." + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem("atlas." + k, JSON.stringify(v)); } catch { /* egal */ } },
};
// Darstellung (Akzent, Banner, Grösse …), Einstellungen in look.js
const LOOK = { accent: "violett", dim: 0.5, pos: 50, zoom: 1, contrast: "normal", motion: "an", fold: [], ...store.get("look", {}), banner: 0 };
const heroBanner = () => `<div class="hero-bg" style="background-image:url('/api/c/banner?v=${LOOK.banner}');background-position:center ${LOOK.pos}%;--dim:${LOOK.dim}"></div>`;
// Echte Programm-Symbole (aus den installierten Programmen, siehe appicons.py) für Seiten und Bereiche
const APPICON = {
  // Bereiche
  plattform: "wsl", apps: "vscode", games: "steam", web: "operagx", tools: "powershell", schule: "onenote", karriere: "linkedin", freizeit: "spotify",
  praesentationen: "powerpoint", excel: "excel", dokumente: "word", officeweitere: "visio",
  "games/roblox": "robloxplayer", "games/scripts": "roblox", "games/browser": "operagx", "web/portfolio": "github", "tools/dumps": "notepadpp", "apps/lernen": "beook",
  "officeweitere/ms-project": "project", "officeweitere/visio": "visio", "officeweitere/packet-tracer": "packettracer", "officeweitere/draw-io": "drawio",
  // Seiten
  all: "explorer", fav: "star", recent: "recent", unsorted: "downloads", grep: "search",
  control: "controlpanel", automations: "taskschd", system: "taskmgr", storage: "cleanmgr",
  monitor: "resmon", roblox: "roblox", github: "github", timeline: "calendar",
  apply: "linkedin", mail: "outlook", discord: "discord", notes: "obsidian",
  net: "network", hosts: "rdp", report: "report", inventory: "msinfo",
};
const SVG_APPS = { github: "i-gh-mark", linkedin: "i-linkedin", spotify: "i-spotify" };  // ohne installiertes Programm: Logo selbst gezeichnet
const isApp = (k) => !!k && (Object.values(APPICON).includes(k) || ["nodejs", "virtualbox"].includes(k));
const appImg = (k, cls = "app-img") => SVG_APPS[k] ? `<svg class="${cls} svgapp ${k === "github" ? "gh" : ""}" viewBox="0 0 24 24"><use href="#${SVG_APPS[k]}"/></svg>`
  : `<img class="${cls}" src="icons/${k}.png" alt="" onerror="this.style.visibility='hidden'">`;
const secApp = (id) => secChain(id).reverse().map((s) => APPICON[s.id]).find(Boolean);  // genaustes Programm gewinnt (z.B. MS Project unter «Project, Visio & Co.»)
const secMark = (id) => secApp(id) ? appImg(secApp(id)) : icon(secIcon(id));
async function api(url, body) {
  const opt = body === undefined ? {} : { method: "POST", headers: { "Content-Type": "application/json", "X-Atlas": "1" }, body: JSON.stringify(body) };
  const r = await fetch(url, opt);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || r.statusText);
  return j;
}
function toast(msg, err) {
  const t = document.createElement("div");
  t.className = "toast" + (err ? " err" : "");
  t.innerHTML = icon(err ? "x" : "check") + `<span>${esc(msg)}</span>`;
  $("#toasts").append(t);
  setTimeout(() => t.remove(), 3200);
}

const STATUS = {
  live: { label: "Live", c: "#4fd18b" },
  aktiv: { label: "Aktiv", c: "#6aa8ff" },
  fertig: { label: "Fertig", c: "#b494ff" },
  entwurf: { label: "Entwurf", c: "#f2b84b" },
  pausiert: { label: "Pausiert", c: "#ff9a62" },
  archiv: { label: "Archiv", c: "#8a93a3" },
};
const STATUS_ORDER = ["live", "aktiv", "entwurf", "pausiert", "fertig", "archiv"];
const LANG_C = {
  JavaScript: "#f1d84b", TypeScript: "#3178c6", HTML: "#e9663f", CSS: "#a77bf3", Python: "#4b8bbe", Lua: "#2fc4c4",
  PowerShell: "#7a8cff", Batch: "#b5d335", "C#": "#3fb950", SQL: "#ff9f43", Shell: "#89e051", Docker: "#2496ed",
  YAML: "#e86f8a", Java: "#b07219", Go: "#00add8", Rust: "#dea584", PHP: "#777bb4", Vue: "#41b883", Svelte: "#ff3e00", C: "#8f9bb3", "C++": "#f34b7d",
};
const langColor = (l) => LANG_C[l] || "#8a93a3";
const statusPill = (s) => { const m = STATUS[s] || STATUS.archiv; return `<span class="status ${s}" style="--stc:${m.c}">${m.label}</span>`; };

// ------------------------------------------------------------ Zustand
const S = {
  data: null, sec: {}, prj: {}, top: [],
  view: store.get("view", "grid"), sort: store.get("sort", "recent"), filter: "",
  open: new Set(store.get("open", ["schule", "schule/module", "apps", "games"])),
  collapsed: new Set(store.get("collapsed", [])),
  trees: {}, rendered: "",
};

function index(data) {
  S.data = data;
  S.sec = {}; S.prj = {};
  for (const s of [...data.catalog.sections, ...(data.vsections || [])]) S.sec[s.id] = { ...s, children: [], projects: [] };
  S.top = [];
  for (const s of Object.values(S.sec)) {
    if (s.parent && S.sec[s.parent]) S.sec[s.parent].children.push(s);
    else S.top.push(s);
  }
  for (const p of [...data.catalog.projects, ...(data.virtual || [])]) {
    const q = { ...p, scan: data.scan[p.id] || {}, res: data.resolved[p.id] || { paths: [], files: [] } };
    S.prj[p.id] = q;
    (S.sec[p.section] || S.sec[S.top[S.top.length - 1].id]).projects.push(q);
  }
  // Summen rekursiv
  const agg = (s) => {
    const a = { count: 0, files: 0, loc: 0, bytes: 0, last: 0, status: {} };
    const add = (p) => {
      a.count++; a.files += p.scan.files || 0; a.loc += p.scan.loc || 0; a.bytes += p.scan.bytes || 0;
      a.last = Math.max(a.last, p.scan.last || 0); a.status[p.status] = (a.status[p.status] || 0) + 1;
    };
    s.projects.forEach(add);
    for (const c of s.children) {
      const b = agg(c);
      a.count += b.count; a.files += b.files; a.loc += b.loc; a.bytes += b.bytes; a.last = Math.max(a.last, b.last);
      for (const k in b.status) a.status[k] = (a.status[k] || 0) + b.status[k];
    }
    s.agg = a;
    return a;
  };
  S.top.forEach(agg);
}
const secColor = (id) => { let s = S.sec[id]; while (s) { if (s.color) return s.color; s = S.sec[s.parent]; } return "#9aa4b2"; };
const secIcon = (id) => { const s = S.sec[id]; return s?.icon || (s?.subtitle ? "book" : "folder"); };
const secChain = (id) => { const out = []; let s = S.sec[id]; while (s) { out.unshift(s); s = S.sec[s.parent]; } return out; };
const secLabel = (id) => secChain(id).map((s) => s.name).join(" › ");
const allProjects = () => Object.values(S.prj).filter((p) => !p.virtual);
const everything = () => Object.values(S.prj);
const countOf = (col) => Object.values(S.prj).filter((p) => p.virtual === col).length;
const COLL_NOUN = { praesentationen: ["Präsentation", "Präsentationen"], excel: ["Tabelle", "Tabellen"], dokumente: ["Dokument", "Dokumente"], officeweitere: ["Datei", "Dateien"] };
const noun = (secId, n) => { const w = COLL_NOUN[secChain(secId)[0]?.id] || ["Projekt", "Projekte"]; return w[n === 1 ? 0 : 1]; };

// ------------------------------------------------------------ Vorschaubilder (Höhenlinien)
function hash(str) { let h = 2166136261; for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed) { let a = seed; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function topo(seed, color, w = 400, h = 205, rings = 10) {
  const r = rng(hash(seed));
  const hills = [[w * (0.2 + r() * 0.6), h * (0.25 + r() * 0.5), 0.9 + r() * 0.5], [w * r(), h * r(), 0.45 + r() * 0.3]];
  const ph = Array.from({ length: 6 }, () => r() * Math.PI * 2);
  let paths = "";
  for (const [hi, [cx, cy, sc]] of hills.entries()) {
    const n = hi ? Math.round(rings * 0.5) : rings;
    for (let k = 1; k <= n; k++) {
      const rad = k * w * 0.052 * sc;
      let d = "";
      for (let i = 0; i <= 64; i++) {
        const a = (i / 64) * Math.PI * 2;
        const f = 1 + 0.2 * Math.sin(3 * a + ph[0] + k * 0.35) + 0.12 * Math.sin(5 * a + ph[1] - k * 0.2) + 0.07 * Math.sin(2 * a + ph[2 + hi]);
        d += (i ? "L" : "M") + (cx + Math.cos(a) * rad * f * 1.3).toFixed(1) + " " + (cy + Math.sin(a) * rad * f).toFixed(1);
      }
      const op = (0.16 + (k / n) * 0.34) * (hi ? 0.7 : 1);
      paths += `<path d="${d}Z" stroke="${color}" stroke-opacity="${op.toFixed(2)}"/>`;
    }
  }
  return `<svg class="topo" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice"><rect width="${w}" height="${h}" fill="${color}" fill-opacity=".07"/><g fill="none" stroke-width="1.1">${paths}</g></svg>`;
}
function thumbHTML(p, withIcon = true) {
  const col = secColor(p.section);
  const img = p.scan.thumb ? `<img src="thumbs/${p.id}.jpg" loading="lazy" alt="" onerror="this.remove()" style="position:absolute;inset:0">` : "";
  const ico = withIcon && !p.scan.thumb ? `<span class="topo-ico">${icon(secIcon(p.section))}</span>` : "";
  return topo(p.id, col) + img + ico;
}
function langbar(langs, total) {
  const e = Object.entries(langs || {}).filter(([, n]) => n > 0);
  const sum = total || e.reduce((a, [, n]) => a + n, 0);
  if (!sum) return "";
  return `<div class="langbar" title="${esc(e.map(([l, n]) => `${l} ${Math.round((n / sum) * 100)}%`).join(" · "))}">${e.map(([l, n]) => `<i style="width:${(n / sum) * 100}%;background:${langColor(l)}"></i>`).join("")}</div>`;
}

// ------------------------------------------------------------ Seitenleiste
function sideHTML(route) {
  const cur = route.parts;
  const activeSec = cur[0] === "s" ? cur[1] : cur[0] === "p" && S.prj[cur[1]] ? S.prj[cur[1]].section : null;
  const favs = allProjects().filter((p) => p.fav).length;
  const uns = S.data.unsorted.length;
  const nav = (go, ic, label, extra, on) => `<div class="nav-item ${on ? "active" : ""}" data-go="${go}" tabindex="0" role="link" ${on ? 'aria-current="page"' : ""}>${APPICON[go.slice(2)] ? appImg(APPICON[go.slice(2)], "app-img nav-app") : icon(ic)}<span class="name">${label}</span>${extra || ""}</div>`;
  const grp = (id, label, n) => `</div><div class="nav-group ${LOOK.fold.includes(id) ? "folded" : ""}" data-group="${id}"><div class="nav-label" data-fold="${id}" tabindex="0" role="button" aria-expanded="${!LOOK.fold.includes(id)}">${label}<span class="fold-n">${n}</span>${icon("chev")}</div>`;
  let h = `<div class="nav-group">
    ${nav("#/", "home", "Übersicht", "", cur.length === 0)}
    ${nav("#/all", "list", "Alle Projekte", `<span class="count">${allProjects().length}</span>`, cur[0] === "all")}
    ${nav("#/fav", "star", "Favoriten", favs ? `<span class="count">${favs}</span>` : "", cur[0] === "fav")}
    ${nav("#/recent", "clock", "Zuletzt geändert", "", cur[0] === "recent")}
    ${nav("#/unsorted", "inbox", "Unsortiert", uns ? `<span class="badge">${uns}</span>` : "", cur[0] === "unsorted")}
  ${grp("steuern", "Steuern", 4)}
    ${nav("#/control", "play", "Steuerung", S.cc?.running ? `<span class="count">${S.cc.running} an</span>` : "", cur[0] === "control")}
    ${nav("#/automations", "spark", "Automationen", "", cur[0] === "automations")}
    ${nav("#/system", "cpu", "System", `<span class="count" id="navSys"></span>`, cur[0] === "system")}
    ${nav("#/storage", "disk", "Aufräumen", "", cur[0] === "storage")}
  ${grp("ueberwachen", "Überwachen", 4)}
    ${nav("#/monitor", "pulse", "Monitor", S.cc?.down ? `<span class="badge">${S.cc.down}</span>` : "", cur[0] === "monitor")}
    ${nav("#/roblox", "cube", "Roblox", "", cur[0] === "roblox")}
    ${nav("#/github", "github", "GitHub", "", cur[0] === "github")}
    ${nav("#/timeline", "calendar", "Zeitachse", "", cur[0] === "timeline")}
  ${grp("it", "IT-Werkzeuge", 4)}
    ${nav("#/net", "net", "Netzwerk", "", cur[0] === "net")}
    ${nav("#/hosts", "server", "Server", "", cur[0] === "hosts")}
    ${nav("#/report", "edit", "Arbeitsrapport", "", cur[0] === "report")}
    ${nav("#/inventory", "cpu", "Inventar", "", cur[0] === "inventory")}
  ${grp("kommunikation", "Kommunikation", 4)}
    ${nav("#/apply", "briefcase", "Bewerbungen", S.cc?.applyAlerts ? `<span class="badge">${S.cc.applyAlerts}</span>` : "", cur[0] === "apply")}
    ${nav("#/mail", "mail", "E-Mails", S.mailUnread ? `<span class="count">${S.mailUnread}</span>` : "", cur[0] === "mail")}
    ${nav("#/discord", "chat", "Discord", "", cur[0] === "discord")}
    ${nav("#/notes", "book", "Notizen", "", cur[0] === "notes")}
  ${grp("bereiche", "Bereiche", S.top.length)}`;
  const node = (s, depth) => {
    const kids = s.children;
    const isOpen = S.open.has(s.id);
    const leaf = !kids.length;
    const mark = depth === 0 ? `<span class="sec-ico">${secMark(s.id)}</span>` : `<span class="sec-dot"></span>`;
    const done = s.done ? icon("check", "i done-mark") : "";
    let out = `<div class="nav-item ${s.id === activeSec ? "active" : ""}" data-go="#/s/${enc(s.id)}" tabindex="0" role="link" style="--sc:${secColor(s.id)}" title="${esc(s.subtitle || s.desc || s.name)}">
      <span class="tw ${isOpen ? "open" : ""} ${leaf ? "leaf" : ""}" data-toggle="${esc(s.id)}">${icon("chev")}</span>${mark}<span class="name">${esc(s.name)}</span>${done}<span class="count">${s.agg.count}</span></div>`;
    if (!leaf && isOpen) out += `<div class="tree-children" style="--sc:${secColor(s.id)}">${kids.map((k) => node(k, depth + 1)).join("")}</div>`;
    return out;
  };
  h += S.top.map((s) => node(s, 0)).join("") + "</div>";
  return h;
}

// ------------------------------------------------------------ Karten & Listen
function sortProjects(list) {
  const by = {
    recent: (a, b) => (b.scan.last || 0) - (a.scan.last || 0),
    name: (a, b) => a.name.localeCompare(b.name, "de"),
    size: (a, b) => (b.scan.bytes || 0) - (a.scan.bytes || 0),
    loc: (a, b) => (b.scan.loc || 0) - (a.scan.loc || 0),
    status: (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) || a.name.localeCompare(b.name, "de"),
  }[S.sort] || (() => 0);
  return list.filter((p) => !S.filter || p.status === S.filter).sort(by);
}
function card(p) {
  const s = p.scan;
  const col = secColor(p.section);
  const quick = [
    `<button class="icon-btn" data-act="fav" data-id="${esc(p.id)}" title="${p.fav ? "Favorit entfernen" : "Als Favorit"}">${icon("star")}</button>`,
    `<button class="icon-btn" data-act="explorer" data-id="${esc(p.id)}" title="Im Explorer öffnen">${icon("folder")}</button>`,
    `<button class="icon-btn" data-act="vscode" data-id="${esc(p.id)}" title="In VS Code öffnen">${icon("code")}</button>`,
  ];
  if (p.live) quick.push(`<button class="icon-btn" data-act="live" data-id="${esc(p.id)}" title="Live-Seite">${icon("globe")}</button>`);
  return `<article class="card" style="--sc:${col}" data-go="#/p/${enc(p.id)}">
    <div class="thumb">${thumbHTML(p)}<div class="status-wrap" style="position:absolute;top:10px;left:10px">${statusPill(p.status)}</div><div class="card-quick">${quick.join("")}</div></div>
    <div class="card-body">
      <div class="card-title">${esc(p.name)}${p.fav ? icon("star", "i star") : ""}</div>
      <div class="card-kind">${esc(p.kind || "")}</div>
      ${p.desc ? `<div class="card-desc">${esc(p.desc)}</div>` : ""}
      ${langbar(s.langs)}
      ${(p.tech || []).length ? `<div class="tech">${p.tech.slice(0, 4).map((t) => `<span class="tag">${esc(t)}</span>`).join("")}${p.tech.length > 4 ? `<span class="tag">+${p.tech.length - 4}</span>` : ""}</div>` : ""}
      <div class="card-foot"><span title="Dateien">${icon("file")}${fmtN(s.files)}</span>${s.loc ? `<span title="Codezeilen">${icon("code")}${fmtN(s.loc)}</span>` : ""}<span class="when" title="${fmtDate(s.last)}">${ago(s.last)}</span></div>
    </div></article>`;
}
function table(list, showSection = true) {
  const th = (k, l, cls = "") => `<th class="${cls}" data-sort="${k}">${l}${S.sort === k ? " ↓" : ""}</th>`;
  return `<table class="table"><thead><tr>${th("name", "Projekt")}${th("status", "Status")}${showSection ? "<th>Bereich</th>" : ""}<th>Technik</th>${th("size", "Dateien", "num")}${th("loc", "Code", "num")}${th("size", "Grösse", "num")}${th("recent", "Geändert", "num")}</tr></thead><tbody>
  ${list.map((p) => `<tr class="row" data-go="#/p/${enc(p.id)}" style="--sc:${secColor(p.section)}">
    <td><div class="cell-name"><div class="mini-thumb">${thumbHTML(p, false)}</div><div><b>${esc(p.name)}</b>${p.fav ? " " + icon("star", "i star") : ""}<small>${esc(p.kind || "")}</small></div></div></td>
    <td>${statusPill(p.status)}</td>
    ${showSection ? `<td style="color:var(--muted);font-size:12.5px">${esc(secChain(p.section).slice(-2).map((s) => s.name).join(" › "))}</td>` : ""}
    <td><div class="tech">${(p.tech || []).slice(0, 3).map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div></td>
    <td class="num">${fmtN(p.scan.files)}</td><td class="num">${p.scan.loc ? fmtN(p.scan.loc) : "–"}</td><td class="num">${fmtBytes(p.scan.bytes)}</td><td class="num" title="${fmtDate(p.scan.last)}">${ago(p.scan.last)}</td>
  </tr>`).join("")}</tbody></table>`;
}
const projectsHTML = (list, showSection) => !list.length ? "" : S.view === "list" ? table(list, showSection) : `<div class="cards">${list.map(card).join("")}</div>`;

function toolbar(list) {
  const counts = {};
  list.forEach((p) => (counts[p.status] = (counts[p.status] || 0) + 1));
  const chips = [`<button class="chip ${!S.filter ? "on" : ""}" data-filter="">Alle <span class="n">${list.length}</span></button>`]
    .concat(STATUS_ORDER.filter((k) => counts[k]).map((k) => `<button class="chip ${S.filter === k ? "on" : ""}" data-filter="${k}"><span style="width:7px;height:7px;border-radius:50%;background:${STATUS[k].c}"></span>${STATUS[k].label} <span class="n">${counts[k]}</span></button>`));
  return `<div class="toolbar"><div class="chips">${chips.join("")}</div>
    <select class="select" id="sortSel" title="Sortierung">
      ${[["recent", "Zuletzt geändert"], ["name", "Name"], ["status", "Status"], ["loc", "Meiste Codezeilen"], ["size", "Grösste"]].map(([k, l]) => `<option value="${k}" ${S.sort === k ? "selected" : ""}>${l}</option>`).join("")}
    </select>
    <div class="seg"><button data-view="grid" class="${S.view === "grid" ? "on" : ""}" title="Karten">${icon("grid")}</button><button data-view="list" class="${S.view === "list" ? "on" : ""}" title="Liste">${icon("list")}</button></div></div>`;
}

// ------------------------------------------------------------ Ansichten
function crumbs(id, extra) {
  const parts = [`<a href="#/">Übersicht</a>`].concat(secChain(id).map((s) => `<a href="#/s/${enc(s.id)}">${esc(s.name)}</a>`));
  if (extra) parts.push(`<span>${esc(extra)}</span>`);
  return `<nav class="crumbs">${parts.join(icon("chev"))}</nav>`;
}

function viewHome() {
  const all = allProjects();
  const tot = all.reduce((a, p) => ({ files: a.files + (p.scan.files || 0), loc: a.loc + (p.scan.loc || 0), bytes: a.bytes + (p.scan.bytes || 0) }), { files: 0, loc: 0, bytes: 0 });
  const live = all.filter((p) => p.live);
  const langs = {};
  all.forEach((p) => Object.entries(p.scan.langs || {}).forEach(([l, n]) => (langs[l] = (langs[l] || 0) + n)));
  const le = Object.entries(langs).sort((a, b) => b[1] - a[1]);
  const lsum = le.reduce((a, [, n]) => a + n, 0) || 1;
  const recent = [...all].sort((a, b) => (b.scan.last || 0) - (a.scan.last || 0)).slice(0, 9);
  const favs = all.filter((p) => p.fav);
  const hour = new Date().getHours();
  const greet = hour < 11 ? "Guten Morgen" : hour < 18 ? "Hallo" : "Guten Abend";
  const tiles = S.top.map((s) => {
    const st = s.agg.status;
    const tot2 = Object.values(st).reduce((a, b) => a + b, 0) || 1;
    const subs = s.children.length ? s.children.map((c) => esc(c.name)).join(" · ") : s.projects.slice(0, 4).map((p) => esc(p.name)).join(" · ");
    return `<div class="stile" data-go="#/s/${enc(s.id)}" style="--sc:${secColor(s.id)}">
      <div class="top-row"><span class="sec-ico">${secMark(s.id)}</span><h3>${esc(s.name)}</h3><span class="cnt">${s.agg.count}</span></div>
      <div class="subs">${subs}</div>
      <div class="statbar">${STATUS_ORDER.filter((k) => st[k]).map((k) => `<i title="${STATUS[k].label}: ${st[k]}" style="width:${(st[k] / tot2) * 100}%;background:${STATUS[k].c}"></i>`).join("")}</div>
    </div>`;
  }).join("");
  const row = (p) => `<div class="rowlink" data-go="#/p/${enc(p.id)}" style="--sc:${secColor(p.section)}"><div class="mini-thumb">${thumbHTML(p, false)}</div><div class="meta"><b>${esc(p.name)}</b><small>${esc(secLabel(p.section))}</small></div><span class="when">${ago(p.scan.last)}</span></div>`;
  return `<div class="page">
    <section class="hero ${LOOK.banner ? "has-banner" : ""}" id="hero">${LOOK.banner ? heroBanner() : topo("atlas-hero", "currentColor", 1200, 260, 14).replace('fill-opacity=".07"', 'fill-opacity="0"').replace('class="topo"', 'class="hero-topo"')}
      <div class="hero-edit"><button class="btn sm" data-act="banner" title="Eigenes Bannerbild (auch per Drag & Drop oder Ctrl+V)">${icon("image")}${LOOK.banner ? "Banner ändern" : "Banner-Bild"}</button></div>
      <div class="hero-date">${new Date().toLocaleDateString("de-CH", { weekday: "long", day: "numeric", month: "long" })}</div>
      <h1>${greet}, <span>Alex</span>.</h1>
      <p>Alle deine Projekte an einem Ort: von der Kubernetes-Plattform bis zum losen Python-Skript. Sortiert nach Bereichen, durchsuchbar bis in den Code.</p>
      <div class="kpis">
        <div class="kpi"><b>${all.length}</b><span>Projekte</span></div>
        <div class="kpi" data-go="#/s/dokumente" style="cursor:pointer">${appImg("word", "app-img kpi-app")}<b>${countOf("docs")}</b><span>Dokumente</span></div>
        <div class="kpi" data-go="#/s/praesentationen" style="cursor:pointer">${appImg("powerpoint", "app-img kpi-app")}<b>${countOf("pptx")}</b><span>Präsentationen</span></div>
        <div class="kpi" data-go="#/s/excel" style="cursor:pointer">${appImg("excel", "app-img kpi-app")}<b>${countOf("xlsx")}</b><span>Excel-Tabellen</span></div>
        <div class="kpi"><b>${fmtN(tot.loc)}</b><span>Codezeilen</span></div>
        <div class="kpi"><b>${live.length}</b><span>live im Netz</span></div>
      </div>
    </section>
    <div class="home-label"><span class="live-dot"></span>Live</div>
    <div class="cc-strip" id="homeControl"></div>
    ${S.data.unsorted.length ? `<div class="panel" style="margin-bottom:22px;display:flex;align-items:center;gap:12px;border-color:color-mix(in srgb,var(--accent) 45%,transparent)">${icon("inbox")}<div style="flex:1"><b>${S.data.unsorted.length} neue Ordner/Dateien gefunden</b><div style="color:var(--muted);font-size:12.5px">Sie gehören noch zu keinem Projekt.</div></div><a class="btn" href="#/unsorted">Zuordnen</a></div>` : ""}
    <div class="home-label">${icon("grid")}Bereiche</div>
    <div class="section-tiles">${tiles}</div>
    <div class="panel" id="homeActivity" style="margin-top:26px"></div>
    <div class="dash" style="margin-top:22px">
      <div>
        <div class="panel"><div class="panel-title">${icon("clock")}Zuletzt bearbeitet<a href="#/recent">Alle</a></div><div class="rows">${recent.map(row).join("")}</div></div>
        <div class="panel" id="homeMail"></div>
        <div class="panel" id="homeDiscord"></div>
        <div class="panel" id="homeGit"></div>
        <div class="panel"><div class="panel-title">${icon("star")}Favoriten<a href="#/fav">Alle</a></div>${favs.length ? `<div class="rows">${favs.map(row).join("")}</div>` : `<div class="empty">Markiere Projekte mit dem Stern, dann erscheinen sie hier.</div>`}</div>
      </div>
      <div>
        <div class="panel" id="homeSys"></div>
        <div class="panel"><div class="panel-title">${icon("code")}Sprachen</div>
          <div class="bigbar">${le.map(([l, n]) => `<i title="${l}" style="width:${(n / lsum) * 100}%;background:${langColor(l)}"></i>`).join("")}</div>
          <div class="legend">${le.slice(0, 12).map(([l, n]) => `<span><i style="background:${langColor(l)}"></i>${l} <em>${Math.max(1, Math.round((n / lsum) * 100))}%</em></span>`).join("")}</div>
        </div>
        <div class="panel"><div class="panel-title">${icon("globe")}Live im Netz</div>
          <div class="rows">${live.map((p) => `<a class="linkrow" href="${esc(p.live)}" target="_blank" rel="noopener">${icon("external")}<span>${esc(p.name)}</span><small>${esc(p.live.replace(/^https?:\/\//, ""))}</small></a>`).join("")}</div>
        </div>
        <div class="panel"><div class="panel-title">${icon("pulse")}Status</div>${statusSummary(all)}</div>
      </div>
    </div></div>`;
}
function statusSummary(list) {
  const c = {};
  list.forEach((p) => (c[p.status] = (c[p.status] || 0) + 1));
  return `<div class="bigbar">${STATUS_ORDER.filter((k) => c[k]).map((k) => `<i style="width:${(c[k] / list.length) * 100}%;background:${STATUS[k].c}"></i>`).join("")}</div>
    <div class="legend">${STATUS_ORDER.filter((k) => c[k]).map((k) => `<span><i style="background:${STATUS[k].c}"></i>${STATUS[k].label} <em>${c[k]}</em></span>`).join("")}</div>`;
}

function viewSection(id) {
  const s = S.sec[id];
  if (!s) return notFound();
  const col = secColor(id);
  const flat = [];
  const collect = (x) => { flat.push(...x.projects); x.children.forEach(collect); };
  collect(s);
  const group = (g, depth) => {
    const projs = sortProjects(g.projects);
    const kids = g.children.map((c) => group(c, depth + 1)).join("");
    if (!projs.length && !kids) return "";
    const coll = S.collapsed.has(g.id);
    return `<section class="group ${coll ? "collapsed" : ""}" style="--sc:${secColor(g.id)}">
      <div class="group-head"><span class="tw ${coll ? "" : "open"}" data-collapse="${esc(g.id)}">${icon("chev")}</span>
        <a class="group-title" href="#/s/${enc(g.id)}">${esc(g.name)}</a>${g.subtitle ? `<span class="group-sub">${esc(g.subtitle)}</span>` : ""}${g.done ? `<span class="done-pill">${icon("check")}abgeschlossen</span>` : ""}
        <span class="count">${g.agg.count} ${noun(g.id, g.agg.count)}</span></div>
      ${projectsHTML(projs, false)}${kids}</section>`;
  };
  const own = sortProjects(s.projects);
  return `<div class="page" style="--sc:${col}">
    ${crumbs(s.parent || "", "")}
    <div class="page-head"><div class="big-ico">${icon(secIcon(id))}</div>
      <div><h1 class="page-title">${esc(s.name)}</h1>${s.subtitle || s.desc ? `<div class="page-sub">${esc(s.subtitle || s.desc)}${s.subtitle && s.desc ? " · " + esc(s.desc) : ""}</div>` : ""}
        <div class="stats-line"><span><b>${s.agg.count}</b> ${noun(id, s.agg.count)}</span>${s.children.length ? `<span><b>${s.children.length}</b> Unterbereiche</span>` : ""}<span><b>${fmtN(s.agg.files)}</b> Dateien</span>${s.agg.loc ? `<span><b>${fmtN(s.agg.loc)}</b> Codezeilen</span>` : ""}<span><b>${fmtBytes(s.agg.bytes)}</b></span><span>zuletzt <b>${ago(s.agg.last)}</b></span>${s.done ? `<span class="done-pill">${icon("check")}abgeschlossen</span>` : ""}</div>
      </div>
      <div class="head-actions">${COLL_NOUN[secChain(id)[0]?.id] ? `<span class="done-pill" style="color:var(--muted);background:var(--panel2)">${icon("refresh")}automatisch gefunden</span></div>` : `
        <button class="btn btn-ghost" data-act="new-section" data-id="${esc(id)}">${icon("plus")}Unterbereich</button>
        <button class="btn btn-ghost" data-act="edit-section" data-id="${esc(id)}">${icon("edit")}Bereich</button>
        <button class="btn" data-act="new" data-id="${esc(id)}">${icon("plus")}Projekt</button>
      </div>`}</div>
    ${toolbar(flat)}
    ${own.length ? projectsHTML(own, false) : ""}
    ${s.children.map((c) => group(c, 1)).join("")}
    ${!flat.length ? `<div class="empty">Noch keine Projekte in diesem Bereich.</div>` : ""}
  </div>`;
}

function viewList(kind) {
  let list = allProjects(), title = "Alle Projekte", ic = "layers", col = "var(--accent)", sub = "Jedes Projekt, flach aufgelistet: Web-Apps, Spiele, Schule und lose Skripte.";
  if (kind === "fav") { list = list.filter((p) => p.fav); title = "Favoriten"; ic = "star"; col = "#ffb547"; sub = "Projekte, die du mit dem Stern markiert hast."; }
  if (kind === "recent") { title = "Zuletzt geändert"; ic = "clock"; col = "#4cc2ff"; sub = "Sortiert nach der neusten Datei im Projekt."; }
  const sortBak = S.sort;
  if (kind === "recent") S.sort = "recent";
  const sorted = sortProjects(list);
  S.sort = sortBak;
  return `<div class="page"><nav class="crumbs"><a href="#/">Übersicht</a></nav>
    <div class="page-head" style="--sc:${col}"><div class="big-ico">${icon(ic)}</div><div><h1 class="page-title">${title}</h1><div class="page-sub">${sub}</div>
      <div class="stats-line"><span><b>${list.length}</b> Projekte</span><span><b>${fmtN(list.reduce((a, p) => a + (p.scan.loc || 0), 0))}</b> Codezeilen</span><span><b>${list.filter((p) => p.live).length}</b> live</span></div></div></div>
    ${toolbar(list)}${sorted.length ? projectsHTML(sorted, true) : `<div class="empty">Hier ist noch nichts.</div>`}</div>`;
}

function viewUnsorted() {
  const u = S.data.unsorted;
  return `<div class="page"><nav class="crumbs"><a href="#/">Übersicht</a></nav>
    <div class="page-head" style="--sc:#ff9a62"><div class="big-ico">${icon("inbox")}</div><div><h1 class="page-title">Unsortiert</h1>
    <div class="page-sub">Neue Ordner und Dateien in deinen Projekt-Orten, die noch keinem Projekt gehören. Ordne sie zu oder blende sie aus.</div>
    <div class="stats-line">Überwachte Orte: ${S.data.catalog.discover.map((d) => `<span style="font-family:var(--mono);font-size:11.5px">${esc(d.replace(/\{(\w+)\}/, (m, k) => S.data.catalog.vars[k] || m))}</span>`).join("")}</div></div></div>
    ${u.length ? u.map((x) => `<div class="unsorted-row">${icon(x.dir ? "folder" : "file")}<div class="meta"><b>${esc(x.name)}</b><small>${esc(x.path)}</small></div>
      <span style="font-size:12px;color:var(--muted);white-space:nowrap">${fmtN(x.files)} Dateien · ${fmtBytes(x.bytes)} · ${ago(x.last)}</span>
      <button class="btn sm btn-ghost" data-act="ignore" data-path="${esc(x.path)}">Ausblenden</button>
      <button class="btn sm btn-accent" data-act="assign" data-path="${esc(x.path)}" data-dir="${x.dir ? 1 : 0}">Zuordnen</button></div>`).join("")
      : `<div class="empty">${icon("check")} Alles ist einem Projekt zugeordnet.</div>`}</div>`;
}

const notFound = () => `<div class="page"><div class="empty">Nicht gefunden. <a href="#/" style="color:var(--accent)">Zur Übersicht</a></div></div>`;

// ------------------------------------------------------------ Projektseite
function viewProject(id, tab) {
  const p = S.prj[id];
  if (!p) return notFound();
  const s = p.scan;
  const col = secColor(p.section);
  const main = p.virtual ? p.res.files[0] : "";
  const acts = p.virtual ? [
    `<button class="btn btn-accent" data-act="default" data-id="${esc(id)}" data-path="${esc(main)}">${icon("external")}Öffnen</button>`,
    `<button class="btn" data-act="explorer" data-id="${esc(id)}" data-path="${esc(main)}">${icon("folder")}Im Explorer zeigen</button>`,
  ] : [
    `<button class="btn" data-act="explorer" data-id="${esc(id)}">${icon("folder")}Ordner öffnen</button>`,
    `<button class="btn" data-act="vscode" data-id="${esc(id)}">${icon("code")}In VS Code</button>`,
  ];
  if (p.serve) acts.push(`<button class="btn" data-act="serve" data-id="${esc(id)}">${icon("play")}Lokal starten</button>`);
  if (p.run) acts.push(`<button class="btn" data-act="run" data-id="${esc(id)}" title="${esc(p.run)}">${icon("terminal")}${esc(p.run)}</button>`);
  if (p.live) acts.push(`<a class="btn" href="${esc(p.live)}" target="_blank" rel="noopener">${icon("globe")}Live-Seite</a>`);
  if (p.repo) acts.push(`<a class="btn" href="https://github.com/${esc(p.repo)}" target="_blank" rel="noopener">${icon("github")}GitHub</a>`);
  if (!p.virtual) {
    acts.push(`<button class="btn btn-ghost" data-act="terminal" data-id="${esc(id)}" title="PowerShell im Ordner">${icon("terminal")}</button>`);
    acts.push(`<button class="btn btn-ghost" data-act="edit" data-id="${esc(id)}">${icon("edit")}Bearbeiten</button>`);
  }
  const chips = [...(p.tags || []).map((t) => `<span class="tag" style="border-color:color-mix(in srgb,${col} 45%,transparent);color:${col}">${esc(t)}</span>`), ...(p.tech || []).map((t) => `<span class="tag">${esc(t)}</span>`)];
  return `<div class="page" style="--sc:${col}" data-project="${esc(id)}">
    ${crumbs(p.section)}
    <div class="p-hero">
      <div class="p-thumb" id="pThumb" data-id="${esc(id)}">${thumbHTML(p)}
        <div class="thumb-tools">
          <button class="btn sm" data-act="thumb-pick" data-id="${esc(id)}" title="Eigenes Bild wählen, einfügen (Ctrl+V) oder hierher ziehen">${icon("image")}Bild ändern</button>
          ${p.thumb ? `<button class="btn sm" data-act="thumb-reset" data-id="${esc(id)}" title="Wieder automatisch wählen">${icon("refresh")}Automatisch</button>` : ""}
        </div>
        <div class="thumb-drop">${icon("image")}Bild loslassen</div>
      </div>
      <div class="p-info">
        <div class="p-title-row"><h1 class="p-title">${esc(p.name)}</h1>${statusPill(p.status)}
          <button class="icon-btn ${p.fav ? "on" : ""}" data-act="fav" data-id="${esc(id)}" title="Favorit">${icon("star")}</button></div>
        <div class="p-kind">${esc(p.kind || "")}${p.kind ? " · " : ""}${esc(secLabel(p.section))}</div>
        ${p.desc ? `<p class="p-desc">${esc(p.desc)}</p>` : ""}
        ${chips.length ? `<div class="tech">${chips.join("")}</div>` : ""}
        <div class="p-actions">${acts.join("")}</div>
      </div>
    </div>
    <div class="p-stats">
      <div class="p-stat"><b>${fmtN(s.files)}</b><span>Dateien</span></div>
      <div class="p-stat"><b>${s.loc ? fmtN(s.loc) : "–"}</b><span>Codezeilen</span></div>
      <div class="p-stat"><b>${fmtBytes(s.bytes)}</b><span>Grösse</span></div>
      <div class="p-stat"><b title="${fmtDate(s.last)}">${ago(s.last)}</b><span>zuletzt geändert</span></div>
      <div class="p-stat"><b>${fmtDate(s.first)}</b><span>älteste Datei</span></div>
    </div>
    <div class="tabs">
      <button class="tab ${tab !== "files" ? "on" : ""}" data-go="#/p/${enc(id)}">${icon("eye")}Übersicht</button>
      <button class="tab ${tab === "files" ? "on" : ""}" data-go="#/p/${enc(id)}/files">${icon("folder")}Dateien <span class="n">${fmtN(s.files)}</span></button>
    </div>
    <div id="ptab">${tab === "files" ? explorerShell() : overviewShell(p)}</div>
  </div>`;
}

function overviewShell(p) {
  const s = p.scan;
  const locs = [...p.res.paths.map((x) => [x, true]), ...p.res.files.map((x) => [x, false])];
  const missing = new Set(s.missing || []);
  const links = [];
  if (p.live) links.push([p.live, "Live-Seite", "globe"]);
  if (p.repo) links.push([`https://github.com/${p.repo}`, "GitHub-Repo", "github"]);
  (p.links || []).forEach((l) => links.push([l.url, l.label, "link"]));
  if (p.serve) links.push([`/serve/${enc(p.id)}/${p.serve}`, "Lokale Vorschau", "play"]);
  const langs = Object.entries(s.langs || {});
  const lsum = langs.reduce((a, [, n]) => a + n, 0);
  const kinds = Object.entries(s.kinds || {});
  const g = s.git;
  return `<div class="p-grid">
    <div id="readme"><div class="loading" style="height:120px">Lade…</div></div>
    <div>
      <div id="pExtra"></div>
      <div class="side-block"><h4>${icon("pin")}${p.virtual ? (locs.length > 1 ? `${locs.length} Versionen (neuste zuerst)` : "Speicherort") : "Speicherorte"}</h4>
        ${locs.length ? locs.map(([x, dir]) => `<div class="loc ${missing.has(x) ? "missing" : ""}">${icon(dir ? "folder" : "file")}<span class="path">${esc(x)}</span>
          <button class="icon-btn sm" data-act="explorer" data-id="${esc(p.id)}" data-path="${esc(x)}" title="Im Explorer zeigen">${icon("external")}</button>
          <button class="icon-btn sm" data-act="copy" data-path="${esc(x)}" title="Pfad kopieren">${icon("copy")}</button></div>`).join("") : `<div style="color:var(--muted);font-size:12.5px">Nur online (keine lokalen Dateien).</div>`}
      </div>
      ${links.length ? `<div class="side-block"><h4>${icon("link")}Links</h4>${links.map(([u, l, ic]) => `<a class="linkrow" href="${esc(u)}" target="_blank" rel="noopener">${icon(ic)}<span>${esc(l)}</span><small>${esc(u.replace(/^https?:\/\//, ""))}</small></a>`).join("")}</div>` : ""}
      ${g ? `<div class="side-block"><h4>${icon("git")}Git</h4><dl class="kv"><dt>Branch</dt><dd>${esc(g.branch || "–")}</dd>${g.lastCommit ? `<dt>Letzter Commit</dt><dd>${ago(g.lastCommit)}<br><span style="color:var(--muted)">${esc(g.lastMessage || "")}</span></dd>` : ""}${g.remote ? `<dt>Remote</dt><dd style="font-family:var(--mono);font-size:11.5px">${esc(g.remote.replace(/^https:\/\/github.com\//, ""))}</dd>` : ""}</dl></div>` : ""}
      ${langs.length || kinds.length ? `<div class="side-block"><h4>${icon("code")}Inhalt</h4>
        ${langs.length ? `${langbar(s.langs)}<div class="legend" style="margin-bottom:${kinds.length ? 12 : 0}px">${langs.map(([l, n]) => `<span><i style="background:${langColor(l)}"></i>${l} <em>${fmtN(n)}</em></span>`).join("")}</div>` : ""}
        ${kinds.length ? `<dl class="kv">${kinds.map(([k, n]) => `<dt>${esc(k)}</dt><dd>${fmtN(n)} ${n === 1 ? "Datei" : "Dateien"}</dd>`).join("")}</dl>` : ""}
      </div>` : ""}
      <div class="side-block"><h4>${icon("clock")}Zeitraum</h4><dl class="kv"><dt>Älteste Datei</dt><dd>${fmtDate(s.first)}</dd><dt>Zuletzt geändert</dt><dd>${fmtDate(s.last)} (${ago(s.last)})</dd>${s.newest ? `<dt>Neuste Datei</dt><dd><a href="#/p/${enc(p.id)}/files?f=${enc(s.newest)}" style="color:var(--accent)">${esc(s.newest.split("\\").pop())}</a></dd>` : ""}</dl></div>
      <div class="side-block"><h4>${icon("edit")}Notizen</h4><textarea class="notes" id="notes" placeholder="Ideen, To-dos, was noch fehlt…">${esc(p.notes || "")}</textarea><div class="note-state" id="noteState"></div></div>
    </div></div>`;
}

async function fillOverview(p) {
  const box = $("#readme");
  if (!box) return;
  if (p.virtual && p.res.files[0]) {
    try {
      const f = await api(`/api/file?p=${enc(p.id)}&path=${enc(p.res.files[0])}`);
      const title = f.kind === "sheet" ? "Tabelle (Ausschnitt)" : "Inhalt der Präsentation";
      box.innerHTML = `<div class="panel"><div class="panel-title">${icon(f.kind === "sheet" ? "table" : "slides")}${title}<a href="#/p/${enc(p.id)}/files?f=${enc(p.res.files[0])}">Als Datei ansehen</a></div>${officeHTML(f)}</div>`;
      return;
    } catch { /* weiter */ }
  }
  if (p.scan.readme) {
    try {
      const f = await api(`/api/file?p=${enc(p.id)}&path=${enc(p.scan.readme)}`);
      const base = p.scan.readme.split("\\").slice(0, -1).join("\\");
      box.innerHTML = `<div class="panel" style="padding:24px 30px"><div class="md">${p.scan.readme.toLowerCase().endsWith(".md") ? md(f.content, { p: p.id, base }) : `<pre style="white-space:pre-wrap;font:13px/1.6 var(--mono)">${esc(f.content)}</pre>`}</div></div>`;
      return;
    } catch { /* weiter zur Inhaltsliste */ }
  }
  try {
    const r = await api(`/api/ls?p=${enc(p.id)}`);
    let items = r.items;
    if (items.length === 1 && items[0].dir && items[0].exists) items = (await api(`/api/ls?p=${enc(p.id)}&path=${enc(items[0].path)}`)).items;
    box.innerHTML = `<div class="panel"><div class="panel-title">${icon("folder")}Inhalt<a href="#/p/${enc(p.id)}/files">Alle Dateien</a></div>
      ${items.length ? `<div class="rows">${items.slice(0, 40).map((it) => `<div class="rowlink" data-go="#/p/${enc(p.id)}/files?f=${enc(it.path)}">${icon(it.dir ? "folder" : fileIcon(it.name))}<div class="meta"><b>${esc(it.name)}</b></div><span class="when">${it.dir ? "" : fmtBytes(it.size)} ${it.mtime ? "· " + ago(it.mtime) : ""}</span></div>`).join("")}</div>` : `<div class="empty">Keine lokalen Dateien. ${p.repo || p.links ? "Dieses Projekt liegt nur auf GitHub." : ""}</div>`}
      ${p.repo && !items.length ? "" : ""}</div>`;
  } catch (e) {
    box.innerHTML = `<div class="empty">${esc(e.message)}</div>`;
  }
}

// ------------------------------------------------------------ Datei-Explorer
const EXT_ICON = { image: ["png", "jpg", "jpeg", "gif", "webp", "svg", "ico", "bmp"], doc: ["pdf", "docx", "doc", "txt", "md"], slides: ["pptx", "ppt"], video: ["mp4", "mov", "webm", "mp3", "wav"], db: ["db", "sql", "sqbpro", "sqlite"] };
const CODE_EXT = new Set(["js", "mjs", "cjs", "ts", "tsx", "jsx", "py", "pyw", "lua", "luau", "ps1", "psm1", "bat", "cmd", "cs", "html", "htm", "css", "json", "sh", "yml", "yaml", "java", "c", "cpp", "go", "rs", "php", "xml", "rbxlx"]);
function fileIcon(name) {
  const e = name.split(".").pop().toLowerCase();
  for (const [ic, list] of Object.entries(EXT_ICON)) if (list.includes(e)) return ic;
  return CODE_EXT.has(e) ? "file-code" : "file";
}
const explorerShell = () => `<div class="explorer"><div class="ftree" id="ftree"><div class="loading" style="height:80px">Lade…</div></div><div class="fview" id="fview"><div class="fempty"><div>${icon("file-code")}<div>Datei links auswählen</div></div></div></div></div>`;

function treeState(pid) {
  if (!S.trees[pid]) S.trees[pid] = { open: new Set(), cache: {}, sel: null };
  return S.trees[pid];
}
async function ls(pid, path) {
  const T = treeState(pid);
  const key = path || "";
  if (!T.cache[key]) T.cache[key] = (await api(`/api/ls?p=${enc(pid)}${path ? `&path=${enc(path)}` : ""}`)).items;
  return T.cache[key];
}
function treeHTML(pid, items, root = false) {
  const T = treeState(pid);
  return items.map((it) => {
    if (it.dir) {
      const open = T.open.has(it.path);
      const kids = open && T.cache[it.path] ? `<div class="fkids">${treeHTML(pid, T.cache[it.path])}</div>` : "";
      const dim = it.skip || it.exists === false;
      return `<div class="fnode ${dim ? "dim" : ""}" data-dir="${esc(it.path)}" title="${esc(root ? it.path : it.name)}"><span class="tw ${open ? "open" : ""}">${icon("chev")}</span>${icon("folder")}<span class="fname">${esc(it.name)}</span>${it.skip ? `<span class="fsize">ausgeblendet</span>` : ""}</div>${kids}`;
    }
    return `<div class="fnode ${T.sel === it.path ? "on" : ""} ${it.exists === false ? "dim" : ""}" data-file="${esc(it.path)}" title="${esc(it.name)}"><span class="tw leaf"></span>${icon(fileIcon(it.name))}<span class="fname">${esc(it.name)}</span>${it.cloud ? icon("cloud", "i cloud") : ""}<span class="fsize">${it.size != null ? fmtBytes(it.size) : ""}</span></div>`;
  }).join("");
}
async function renderTree(pid) {
  const el = $("#ftree");
  if (!el) return;
  const root = await ls(pid);
  const st = el.scrollTop;
  el.innerHTML = root.length ? treeHTML(pid, root, true) : `<div class="fempty" style="height:auto;padding:20px">Keine lokalen Dateien.</div>`;
  el.scrollTop = st;
}
async function openExplorer(pid, file, line) {
  const T = treeState(pid);
  const root = await ls(pid);
  if (!T.init) {
    T.init = true;
    if (root.length === 1 && root[0].dir && root[0].exists) { T.open.add(root[0].path); await ls(pid, root[0].path); }
  }
  if (file) {
    // Alle Ordner bis zur Datei aufklappen
    const lower = file.toLowerCase();
    const base = root.filter((x) => x.dir).map((x) => x.path).find((x) => lower === x.toLowerCase() || lower.startsWith(x.toLowerCase() + "\\"));
    if (base) {
      T.open.add(base);
      await ls(pid, base);
      const rest = file.slice(base.length + 1).split("\\").filter(Boolean);
      let cur = base;
      for (let i = 0; i < rest.length - 1; i++) { cur += "\\" + rest[i]; T.open.add(cur); await ls(pid, cur); }
      if (!rest.length) file = null;
      else {
        const target = (T.cache[cur] || []).find((x) => x.path.toLowerCase() === lower);
        if (target && target.dir) { T.open.add(target.path); await ls(pid, target.path); file = null; }
      }
    }
  }
  T.sel = file || T.sel;
  await renderTree(pid);
  if (T.sel) {
    await preview(pid, T.sel, line);
    const on = $(".fnode.on"), tree = $("#ftree");
    if (on && tree) {
      const top = on.offsetTop - tree.offsetTop;
      if (top < tree.scrollTop || top > tree.scrollTop + tree.clientHeight - 30) tree.scrollTop = top - tree.clientHeight / 3;
    }
  }
}

function officeHTML(f) {
  if (f.kind === "sheet") {
    const rows = (f.rows || []).filter((r) => r.some((c) => c !== ""));
    if (!rows.length) return `<div class="office"><i>Leere Tabelle.</i></div>`;
    const n = Math.max(...rows.map((r) => r.reduce((m, c, i) => (c !== "" ? i + 1 : m), 0)));
    const colName = (i) => String.fromCharCode(65 + i);
    return `<div class="sheet-wrap">${f.sheets?.length ? `<div class="sheet-tabs">${f.sheets.map((s, i) => `<span class="${i ? "" : "on"}">${esc(s)}</span>`).join("")}</div>` : ""}
      <table class="sheet"><thead><tr><th></th>${Array.from({ length: n }, (_, i) => `<th>${colName(i)}</th>`).join("")}</tr></thead>
      <tbody>${rows.map((r, ri) => `<tr><th>${ri + 1}</th>${Array.from({ length: n }, (_, i) => `<td>${esc(r[i] ?? "")}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
  }
  const html = esc(f.content || "").replace(/^## (.*)$/gm, "<h3>$1</h3>");
  return `<div class="office">${html || "<i>Kein Text gefunden.</i>"}</div>`;
}

async function preview(pid, path, line) {
  const box = $("#fview");
  if (!box) return;
  const name = path.split("\\").pop();
  box.innerHTML = `<div class="fhead">${icon(fileIcon(name))}<span class="fn">${esc(name)}</span></div><div class="fbody center"><div class="loading" style="height:auto">Lade…</div></div>`;
  let f;
  try { f = await api(`/api/file?p=${enc(pid)}&path=${enc(path)}`); }
  catch (e) { box.innerHTML = `<div class="fempty">${esc(e.message)}</div>`; return; }
  const raw = `/api/raw?p=${enc(pid)}&path=${enc(path)}`;
  const isMd = f.ext === ".md";
  const mode = store.get("mdmode", "render");
  const head = `<div class="fhead">${icon(fileIcon(name))}<div style="min-width:0"><div class="fn">${esc(name)}</div><small>${fmtBytes(f.size)} · ${fmtDate(f.mtime)}${f.cloud ? " · nur in OneDrive" : ""}${f.truncated ? " · gekürzt" : ""}</small></div>
    <div class="acts">${isMd ? `<div class="mode-switch"><button data-mdmode="render" class="${mode === "render" ? "on" : ""}">Ansicht</button><button data-mdmode="code" class="${mode === "code" ? "on" : ""}">Code</button></div>` : ""}
      ${["image", "pdf", "office", "sheet", "text"].includes(f.kind) && f.ext !== ".svg" ? `<button class="btn sm" data-act="thumb-set" data-id="${esc(pid)}" data-path="${esc(path)}" title="Dieses Bild / diese Datei als Vorschaubild des Projekts verwenden">${icon("image")}Als Titelbild</button>` : ""}
      <button class="icon-btn sm" data-act="default" data-id="${esc(pid)}" data-path="${esc(path)}" title="Mit Standard-App öffnen">${icon("external")}</button>
      <button class="icon-btn sm" data-act="vscode" data-id="${esc(pid)}" data-path="${esc(path)}" title="In VS Code öffnen">${icon("code")}</button>
      <button class="icon-btn sm" data-act="explorer" data-id="${esc(pid)}" data-path="${esc(path)}" title="Im Explorer zeigen">${icon("folder")}</button>
      <button class="icon-btn sm" data-act="copy" data-path="${esc(path)}" title="Pfad kopieren">${icon("copy")}</button></div></div>`;
  let body;
  if (f.kind === "text" && isMd && mode === "render") {
    body = `<div class="fbody"><div class="md">${md(f.content, { p: pid, base: path.split("\\").slice(0, -1).join("\\") })}</div></div>`;
  } else if (f.kind === "text") {
    const ext = f.ext.replace(".", "") || name.toLowerCase();
    const n = f.content.split("\n").length;
    const code = f.content.length > 350000 ? esc(f.content) : hl(f.content, ext);
    body = `<div class="fbody"><div class="code"><div class="gutter">${Array.from({ length: n }, (_, i) => i + 1).join("\n")}</div><pre>${code}</pre></div></div>`;
  } else if (f.kind === "office" || f.kind === "sheet") {
    body = `<div class="fbody">${f.render ? `<img class="office-render" src="${f.render}" alt="">` : ""}${officeHTML(f)}</div>`;
  } else if (f.kind === "image") {
    body = `<div class="fbody center"><img class="preview" src="${raw}" alt=""></div>`;
  } else if (f.kind === "pdf") {
    body = `<div class="fbody"><iframe src="${raw}"></iframe></div>`;
  } else if (f.kind === "media") {
    body = `<div class="fbody center"><video src="${raw}" controls></video></div>`;
  } else {
    body = `<div class="fbody"><div class="fempty"><div>${icon("file")}<div style="margin-bottom:12px">Keine Vorschau für diesen Dateityp.</div><button class="btn" data-act="default" data-id="${esc(pid)}" data-path="${esc(path)}">${icon("external")}Mit Standard-App öffnen</button></div></div></div>`;
  }
  box.innerHTML = head + body;
  if (line && f.kind === "text") {
    const pre = $(".code pre", box);
    const lh = parseFloat(getComputedStyle(pre).lineHeight);
    const top = 12 + (line - 1) * lh;
    const mark = document.createElement("div");
    mark.className = "ln-hl";
    mark.style.top = top + "px";
    $(".code", box).style.position = "relative";
    $(".code", box).append(mark);
    $(".fbody", box).scrollTop = Math.max(0, top - 140);
  }
}

// ------------------------------------------------------------ Syntax-Hervorhebung
const KW = {
  js: "async await break case catch class const continue debugger default delete do else export extends finally for from function if import in instanceof let new of return static super switch this throw try typeof var void while with yield true false null undefined interface type enum implements private public protected readonly",
  py: "and as assert async await break class continue def del elif else except False finally for from global if import in is lambda None nonlocal not or pass raise return True try while with yield self",
  lua: "and break do else elseif end false for function goto if in local nil not or repeat return then true until while self",
  ps: "begin break catch class continue do else elseif end exit filter finally for foreach function if in param process return switch throw trap try until while",
  cs: "abstract as base bool break byte case catch char class const continue decimal default delegate do double else enum event false finally float for foreach if in int interface internal is lock long namespace new null object out override params private protected public readonly ref return sealed short static string struct switch this throw true try typeof uint ulong using var virtual void while async await get set",
  sql: "select from where insert into values update set delete create table alter drop primary key foreign references not null unique default check constraint index join left right inner outer on group by order having as and or in is like between distinct count sum avg min max limit view database use int integer varchar char text date datetime decimal auto_increment begin commit rollback case when then else end exists union all add column grant",
  bat: "echo set if else goto call exit for in do not exist errorlevel pause start cd setlocal endlocal defined off on",
  sh: "if then else elif fi for while do done case esac function return in export local echo",
};
const STR = String.raw`"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'`;
const BT = "`(?:\\\\.|[^`\\\\])*`";
const LANG_CFG = {};
const def = (exts, cfg) => exts.split(" ").forEach((e) => (LANG_CFG[e] = cfg));
const C_LIKE = { block: String.raw`\/\*[\s\S]*?\*\/`, line: String.raw`\/\/[^\n]*` };
def("js mjs cjs jsx ts tsx", { ...C_LIKE, str: STR + "|" + BT, kw: KW.js });
def("java c cpp h go rs php", { ...C_LIKE, str: STR, kw: KW.js });
def("cs", { ...C_LIKE, str: STR, kw: KW.cs });
def("py pyw", { line: "#[^\\n]*", str: String.raw`"""[\s\S]*?"""|'''[\s\S]*?'''|` + STR, kw: KW.py });
def("lua luau", { block: String.raw`--\[\[[\s\S]*?\]\]`, line: "--[^\\n]*", str: STR + String.raw`|\[\[[\s\S]*?\]\]`, kw: KW.lua });
def("ps1 psm1", { block: "<#[\\s\\S]*?#>", line: "#[^\\n]*", str: STR, vars: String.raw`\$[\w:]+`, kw: KW.ps, ci: true });
def("bat cmd", { line: String.raw`(?:^|\n)\s*(?:rem\b|::)[^\n]*`, str: String.raw`"[^"\n]*"`, vars: String.raw`%[\w~:]+%?|![\w]+!`, kw: KW.bat, ci: true });
def("sql", { block: String.raw`\/\*[\s\S]*?\*\/`, line: "--[^\\n]*", str: STR, kw: KW.sql, ci: true });
def("css scss", { block: String.raw`\/\*[\s\S]*?\*\/`, str: STR, extra: [["attr", String.raw`[\w-]+(?=\s*:[^;{]*[;}])`], ["num", String.raw`#[\da-fA-F]{3,8}\b`]] });
def("sh yml yaml toml ini cfg conf dockerfile gitignore env", { line: "#[^\\n]*", str: STR, kw: KW.sh });
def("json webmanifest", { str: STR, extra: [["attr", String.raw`"(?:\\.|[^"\\])*"(?=\s*:)`]], kw: "true false null", keyFirst: true });

function hl(code, ext) {
  ext = (ext || "").toLowerCase();
  if (["html", "htm", "xml", "svg", "rbxlx", "drawio", "csproj", "slnx", "sqbpro", "vue", "svelte"].includes(ext)) return hlMarkup(code);
  const cfg = LANG_CFG[ext] || (ext.startsWith("dockerfile") ? LANG_CFG.dockerfile : null);
  if (!cfg) return esc(code);
  return hlWith(code, cfg);
}
function hlWith(code, cfg) {
  const parts = [];
  if (cfg.block) parts.push(["com", cfg.block]);
  if (cfg.line) parts.push(["com", cfg.line]);
  if (cfg.keyFirst && cfg.extra) parts.push(...cfg.extra);
  parts.push(["str", cfg.str || STR]);
  if (cfg.vars) parts.push(["var", cfg.vars]);
  if (cfg.extra && !cfg.keyFirst) parts.push(...cfg.extra);
  parts.push(["num", String.raw`\b(?:0x[\da-fA-F]+|\d[\d_]*(?:\.\d+)?(?:e[+-]?\d+)?)\b`]);
  if (cfg.kw) parts.push(["kw", `\\b(?:${cfg.kw.split(" ").join("|")})\\b`]);
  parts.push(["fn", String.raw`[A-Za-z_$][\w$-]*(?=\s*\()`]);
  const re = new RegExp(parts.map((p) => `(${p[1]})`).join("|"), cfg.ci ? "gi" : "g");
  let out = "", last = 0, m;
  while ((m = re.exec(code))) {
    if (!m[0]) { re.lastIndex++; continue; }
    let gi = 1;
    while (m[gi] === undefined) gi++;
    out += esc(code.slice(last, m.index)) + `<span class="t-${parts[gi - 1][0]}">${esc(m[0])}</span>`;
    last = re.lastIndex;
  }
  return out + esc(code.slice(last));
}
function hlTag(tag) {
  return esc(tag).replace(/^(&lt;\/?)([\w:.-]+)/, '$1<span class="t-tag">$2</span>')
    .replace(/([\w:.@-]+)(=)(&quot;.*?&quot;|&#39;.*?&#39;)/g, '<span class="t-attr">$1</span>$2<span class="t-str">$3</span>');
}
function hlMarkup(code) {
  const re = /(<!--[\s\S]*?-->)|(<script\b[^>]*>)([\s\S]*?)(<\/script>)|(<style\b[^>]*>)([\s\S]*?)(<\/style>)|(<[^>]+>)/gi;
  let out = "", last = 0, m;
  while ((m = re.exec(code))) {
    out += esc(code.slice(last, m.index));
    if (m[1]) out += `<span class="t-com">${esc(m[1])}</span>`;
    else if (m[2]) out += hlTag(m[2]) + hlWith(m[3], LANG_CFG.js) + hlTag(m[4]);
    else if (m[5]) out += hlTag(m[5]) + hlWith(m[6], LANG_CFG.css) + hlTag(m[7]);
    else out += hlTag(m[8]);
    last = re.lastIndex;
  }
  return out + esc(code.slice(last));
}

// ------------------------------------------------------------ Markdown
function joinPath(base, rel) {
  const parts = base.split("\\");
  for (const seg of decodeURI(rel.split("#")[0].split("?")[0]).replace(/\//g, "\\").split("\\")) {
    if (seg === "..") parts.pop();
    else if (seg && seg !== ".") parts.push(seg);
  }
  return parts.join("\\");
}
function md(src, ctx) {
  const ext = (u) => /^(https?:|mailto:|data:|#)/.test(u);
  const inline = (s) => {
    const codes = [];
    s = s.replace(/`([^`]+)`/g, (m, c) => { codes.push(c); return `\u0000${codes.length - 1}\u0000`; });
    s = esc(s);
    s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;[^&]*&quot;)?\)/g, (m, alt, u) => {
      const url = ext(u) ? u : `/api/raw?p=${enc(ctx.p)}&path=${enc(joinPath(ctx.base, u))}`;
      return `<img src="${url}" alt="${alt}" loading="lazy">`;
    });
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, t, u) => {
      if (ext(u)) return u.startsWith("#") ? t : `<a href="${u}" target="_blank" rel="noopener">${t}</a>`;
      return `<a href="#/p/${enc(ctx.p)}/files?f=${enc(joinPath(ctx.base, u))}">${t}</a>`;
    });
    s = s.replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>');
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/__([^_]+)__/g, "<strong>$1</strong>");
    s = s.replace(/(^|[^\w*])\*([^*\n]+)\*(?!\w)/g, "$1<em>$2</em>").replace(/(^|[^\w])_([^_\n]+)_(?!\w)/g, "$1<em>$2</em>");
    return s.replace(/\u0000(\d+)\u0000/g, (m, i) => `<code>${esc(codes[i])}</code>`);
  };
  const L = src.replace(/\r/g, "").split("\n");
  const out = [];
  let i = 0;
  const isBlock = (l) => /^(```|~~~|#{1,6}\s|>|\s*[-*+]\s|\s*\d+[.)]\s|\s*(-{3,}|\*{3,}|_{3,})\s*$|<)/.test(l);
  while (i < L.length) {
    const l = L[i];
    if (/^(```|~~~)/.test(l)) {
      const lang = l.slice(3).trim().toLowerCase();
      const buf = [];
      i++;
      while (i < L.length && !/^(```|~~~)/.test(L[i])) buf.push(L[i++]);
      i++;
      const map = { javascript: "js", python: "py", powershell: "ps1", bash: "sh", shell: "sh", lua: "lua", html: "html", json: "json", yaml: "yml", csharp: "cs", sql: "sql" };
      out.push(`<pre><code>${hl(buf.join("\n"), map[lang] || lang)}</code></pre>`);
    } else if (/^#{1,6}\s/.test(l)) {
      const n = l.match(/^#+/)[0].length;
      out.push(`<h${n}>${inline(l.slice(n).trim().replace(/#+$/, ""))}</h${n}>`);
      i++;
    } else if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(l)) {
      out.push("<hr>"); i++;
    } else if (/^\s*>/.test(l)) {
      const buf = [];
      while (i < L.length && /^\s*>/.test(L[i])) buf.push(L[i++].replace(/^\s*>\s?/, ""));
      out.push(`<blockquote>${md(buf.join("\n"), ctx)}</blockquote>`);
    } else if (/^\s*([-*+]|\d+[.)])\s/.test(l)) {
      const stack = [];
      let html = "";
      while (i < L.length && (/^\s*([-*+]|\d+[.)])\s/.test(L[i]) || (/^\s{2,}\S/.test(L[i]) && stack.length))) {
        const m = L[i].match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/);
        if (!m) { html = html.replace(/<\/li>$/, " " + inline(L[i].trim()) + "</li>"); i++; continue; }
        const ind = m[1].length, tag = /\d/.test(m[2]) ? "ol" : "ul";
        while (stack.length && ind < stack[stack.length - 1].ind) { html += `</${stack.pop().tag}>`; }
        if (!stack.length || ind > stack[stack.length - 1].ind) { stack.push({ ind, tag }); html = html.replace(/<\/li>$/, ""); html += `<${tag}>`; }
        let txt = inline(m[3]);
        txt = txt.replace(/^\[([ xX])\]\s/, (mm, c) => `<input type="checkbox" disabled ${c.trim() ? "checked" : ""}> `);
        html += `<li>${txt}</li>`;
        i++;
      }
      while (stack.length) html += `</${stack.pop().tag}>`;
      out.push(html);
    } else if (l.includes("|") && i + 1 < L.length && /^\s*\|?\s*:?-{2,}/.test(L[i + 1])) {
      const row = (r) => r.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
      const head = row(l);
      i += 2;
      const rows = [];
      while (i < L.length && L[i].includes("|") && L[i].trim()) rows.push(row(L[i++]));
      out.push(`<table><thead><tr>${head.map((h) => `<th>${inline(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`);
    } else if (!l.trim()) {
      i++;
    } else {
      const buf = [l];
      i++;
      while (i < L.length && L[i].trim() && !isBlock(L[i])) buf.push(L[i++]);
      out.push(`<p>${buf.map(inline).join("<br>")}</p>`);
    }
  }
  return out.join("\n");
}

// ------------------------------------------------------------ Code-Suche
function viewGrep(q) {
  return `<div class="page"><nav class="crumbs"><a href="#/">Übersicht</a></nav>
    <div class="page-head" style="--sc:#4cc2ff"><div class="big-ico">${icon("search")}</div><div style="flex:1"><h1 class="page-title">Im Code suchen</h1>
    <div class="page-sub">Durchsucht den Inhalt aller Code- und Textdateien in allen Projekten.</div></div></div>
    <form id="grepForm" style="display:flex;gap:8px;margin-bottom:20px"><input id="grepInput" class="notes" style="min-height:0;height:40px;resize:none;font:14px var(--mono)" value="${esc(q)}" placeholder="z.B. localStorage, Invoke-WebRequest, RemoteEvent…" autofocus><button class="btn btn-accent" style="height:40px">${icon("search")}Suchen</button></form>
    <div id="grepOut">${q ? `<div class="loading" style="height:120px">Suche…</div>` : ""}</div></div>`;
}
async function runGrep(q) {
  const out = $("#grepOut");
  if (!out || q.length < 3) { if (out && q) out.innerHTML = `<div class="empty">Mindestens 3 Zeichen.</div>`; return; }
  try {
    const r = await api(`/api/grep?q=${enc(q)}`);
    if (!$("#grepOut")) return;
    const mark = (t) => esc(t).replace(new RegExp(esc(q).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), (m) => `<mark>${m}</mark>`);
    out.innerHTML = r.results.length ? `<div style="color:var(--muted);font-size:12.5px;margin-bottom:12px">${r.files} Dateien gefunden${r.results.length >= 150 ? " (erste 150)" : ""}</div>` +
      r.results.map((x) => {
        const p = S.prj[x.p];
        const fname = x.path.split("\\").pop();
        return `<div class="grep-file" style="--sc:${secColor(p?.section)}"><div class="gh" data-go="#/p/${enc(x.p)}/files?f=${enc(x.path)}">${icon(fileIcon(fname))}<b>${esc(fname)}</b><small>${esc(p?.name || x.p)} · ${esc(x.path)}</small></div>
          ${x.hits.map((h) => `<div class="grep-line" data-go="#/p/${enc(x.p)}/files?f=${enc(x.path)}&l=${h.line}"><span class="ln">${h.line}</span><span>${mark(h.text)}</span></div>`).join("")}</div>`;
      }).join("") : `<div class="empty">Nichts gefunden für «${esc(q)}».</div>`;
  } catch (e) { out.innerHTML = `<div class="empty">${esc(e.message)}</div>`; }
}

// ------------------------------------------------------------ Router
function parseRoute() {
  const h = location.hash.slice(1) || "/";
  const [path, qs] = h.split("?");
  return { parts: path.split("/").filter(Boolean).map(decodeURIComponent), q: new URLSearchParams(qs || "") };
}
function render(keepScroll) {
  if (!S.data) return;
  const r = parseRoute();
  const [a, b, c] = r.parts;
  const activeSec = a === "s" ? b : a === "p" && S.prj[b] ? S.prj[b].section : null;
  if (activeSec && S.lastActive !== activeSec) {
    S.lastActive = activeSec;
    secChain(activeSec).forEach((x) => { if (x.id !== activeSec || a === "s") S.open.add(x.id); });
  }
  $("#side").innerHTML = sideHTML(r);
  const key = a === "p" ? `p:${b}:${c === "files" ? "files" : "ov"}` : r.parts.join("/") + "?" + (a === "grep" ? r.q.get("q") : "");
  const main = $("#main");
  // Im Datei-Explorer nur die Vorschau wechseln
  if (key === S.rendered && a === "p" && c === "files") {
    openExplorer(b, r.q.get("f"), +r.q.get("l") || 0);
    return;
  }
  const scroll = keepScroll && key === S.rendered ? main.scrollTop : 0;
  let html;
  if (!a) html = viewHome();
  else if (a === "s") html = viewSection(b);
  else if (a === "p") html = viewProject(b, c);
  else if (a === "all" || a === "fav" || a === "recent") html = viewList(a);
  else if (a === "unsorted") html = viewUnsorted();
  else if (a === "grep") html = viewGrep(r.q.get("q") || "");
  else if (EXTRA_VIEWS[a]) html = EXTRA_VIEWS[a](r);
  else html = notFound();
  main.innerHTML = html;
  main.scrollTop = scroll;
  S.rendered = key;
  const p = S.prj[b];
  document.title = a === "p" && p ? `${p.name} · ATLAS` : a === "s" && S.sec[b] ? `${S.sec[b].name} · ATLAS` : "ATLAS";
  if (a === "p" && p) {
    if (c === "files") openExplorer(b, r.q.get("f"), +r.q.get("l") || 0);
    else fillOverview(p);
  }
  if (a === "grep" && r.q.get("q")) runGrep(r.q.get("q"));
  afterRender(a, b, r);
}

// ------------------------------------------------------------ Aktionen
async function act(el) {
  const a = el.dataset.act, id = el.dataset.id, path = el.dataset.path;
  const p = S.prj[id];
  try {
    if (a === "fav") {
      p.fav = !p.fav;
      await api("/api/meta", { id, fav: p.fav });
      render(true);
    } else if (["explorer", "vscode", "default", "terminal", "run"].includes(a)) {
      await api("/api/open", { p: id, path: path || "", how: a });
      toast({ explorer: "Explorer geöffnet", vscode: "VS Code startet…", default: "Wird geöffnet…", terminal: "PowerShell geöffnet", run: `Startet: ${p?.run}` }[a]);
    } else if (a === "serve") {
      window.open(`/serve/${enc(id)}/${p.serve}`, "_blank");
    } else if (a === "live") {
      window.open(p.live, "_blank");
    } else if (a === "copy") {
      await navigator.clipboard.writeText(path);
      toast("Pfad kopiert");
    } else if (a === "thumb-set") {
      toast("Titelbild wird gesetzt…");
      await api("/api/thumb/set", { id, path });
      await reload();
      toast("Titelbild gesetzt");
    } else if (a === "thumb-reset") {
      await api("/api/thumb/set", { id, path: null });
      await reload();
      toast("Bild wird wieder automatisch gewählt");
    } else if (a === "thumb-pick") {
      const inp = document.createElement("input");
      inp.type = "file";
      inp.accept = "image/*";
      inp.onchange = () => inp.files[0] && uploadThumb(id, inp.files[0]);
      inp.click();
    } else if (a === "edit") editor(p);
    else if (a === "new") editor(null, { section: id || currentSection() });
    else if (a === "new-section") sectionEditor(null, id);
    else if (a === "edit-section") sectionEditor(S.sec[id]);
    else if (a === "banner") openLook("banner");
    else if (a === "ignore") {
      await api("/api/ignore", { path });
      S.data.unsorted = S.data.unsorted.filter((u) => u.path !== path);
      render(true);
      toast("Ausgeblendet");
    } else if (a === "assign") {
      const name = path.split("\\").pop().replace(/\.[^.]+$/, "");
      editor(null, el.dataset.dir === "1" ? { name, paths: [path] } : { name, files: [path] });
    }
  } catch (e) { toast(e.message, true); }
}
async function uploadThumb(id, file) {
  if (!file || !file.type.startsWith("image/")) return toast("Das ist kein Bild", true);
  const data = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
  try {
    toast("Bild wird hochgeladen…");
    await api("/api/thumb/upload", { id, data });
    await reload();
    toast("Neues Titelbild gespeichert");
  } catch (e) { toast(e.message, true); }
}
// Bild einfügen (Ctrl+V) oder auf das Vorschaubild ziehen
document.addEventListener("paste", (e) => {
  const r = parseRoute();
  if (r.parts[0] !== "p" || /^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName)) return;
  const item = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith("image/"));
  if (item) { e.preventDefault(); uploadThumb(r.parts[1], item.getAsFile()); }
});
document.addEventListener("dragover", (e) => {
  const t = e.target.closest?.("#pThumb");
  if (t && [...e.dataTransfer.items].some((i) => i.kind === "file")) { e.preventDefault(); t.classList.add("drag"); }
});
document.addEventListener("dragleave", (e) => e.target.closest?.("#pThumb")?.classList.remove("drag"));
document.addEventListener("drop", (e) => {
  const t = e.target.closest?.("#pThumb");
  if (!t) return;
  e.preventDefault();
  t.classList.remove("drag");
  uploadThumb(t.dataset.id, e.dataTransfer.files[0]);
});

function currentSection() {
  const r = parseRoute();
  if (r.parts[0] === "s") return r.parts[1];
  if (r.parts[0] === "p" && S.prj[r.parts[1]]) return S.prj[r.parts[1]].section;
  return S.top[0].id;
}

// ------------------------------------------------------------ Formulare
function sectionOptions(sel) {
  const out = [];
  const walk = (s, d) => { out.push(`<option value="${esc(s.id)}" ${s.id === sel ? "selected" : ""}>${"\u00a0\u00a0\u00a0".repeat(d)}${esc(s.name)}${s.subtitle ? " – " + esc(s.subtitle) : ""}</option>`); s.children.forEach((c) => walk(c, d + 1)); };
  S.top.forEach((s) => walk(s, 0));
  return out.join("");
}
function modal(html) {
  $("#modalBox").innerHTML = html;
  $("#modal").hidden = false;
  setTimeout(() => $("#modalBox input, #modalBox textarea")?.focus(), 30);
}
const closeModal = () => { $("#modal").hidden = true; };
function editor(p, preset = {}) {
  const v = p ? { ...p } : { status: "aktiv", ...preset };
  const vars = S.data.catalog.vars;
  const short = (x) => { for (const [k, val] of Object.entries(vars)) if (x.toLowerCase().startsWith(val.toLowerCase())) return `{${k}}` + x.slice(val.length); return x; };
  const raw = p ? S.data.catalog.projects.find((x) => x.id === p.id) : null;
  const paths = (raw?.paths || (v.paths || []).map(short)).join("\n");
  const files = (raw?.files || (v.files || []).map(short)).join("\n");
  modal(`<div class="mhead" style="--mc:${secColor(v.section || currentSection())}"><span class="mh-ico">${icon(p ? "edit" : "plus")}</span>
    <div><h2>${p ? esc(p.name) + " bearbeiten" : "Neues Projekt"}</h2><p>${p ? esc(secLabel(p.section)) : "Name und Bereich reichen. Ordner kannst du auch später ergänzen."}</p></div>
    <button type="button" class="icon-btn" data-close title="Schliessen (Esc)" aria-label="Schliessen">${icon("x")}</button></div>
  <form id="projForm" class="form fx"><div class="mbody">
    <fieldset class="fs"><legend>${icon("spark")}Grundlagen</legend><div class="form">
      <div class="field"><label for="pfName">Name</label><input id="pfName" name="name" value="${esc(v.name || "")}" required placeholder="z.B. Tasklane"></div>
      <div class="field"><label for="pfKind">Art</label><input id="pfKind" name="kind" value="${esc(v.kind || "")}" placeholder="Web-App, Präsentation, Skript …"></div>
      <div class="field full"><label for="pfSec">Bereich</label><select id="pfSec" name="section">${sectionOptions(v.section || currentSection())}</select></div>
      <div class="field full"><label>Status</label><div class="status-pick" role="radiogroup" aria-label="Status">${STATUS_ORDER.map((k) => `<label style="--stc:${STATUS[k].c}"><input type="radio" name="status" value="${k}" ${v.status === k ? "checked" : ""}><span>${STATUS[k].label}</span></label>`).join("")}</div></div>
      <div class="field full"><label for="pfDesc">Beschreibung</label><textarea id="pfDesc" name="desc" rows="2" placeholder="Ein, zwei Sätze: was ist es, wofür?">${esc(v.desc || "")}</textarea></div>
      <div class="field"><label for="pfTech">Technik</label><input id="pfTech" name="tech" value="${esc((v.tech || []).join(", "))}" placeholder="JavaScript, Python, …"><small>Mit Komma trennen</small></div>
      <div class="field"><label for="pfTags">Tags</label><input id="pfTags" name="tags" value="${esc((v.tags || []).join(", "))}" placeholder="Portfolio, Schule, …"></div>
    </div></fieldset>
    <fieldset class="fs"><legend>${icon("folder")}Wo liegt es?</legend><div class="form">
      <div class="field full"><label for="pfPaths">Ordner</label><textarea id="pfPaths" class="mono" name="paths" rows="3" placeholder="C:\\Pfad\\zum\\Ordner">${esc(paths)}</textarea><small>Ein Pfad pro Zeile. Kürzel: ${Object.keys(vars).map((k) => `{${k}}`).join(", ")}</small></div>
      <div class="field full"><label for="pfFiles">Einzelne Dateien</label><textarea id="pfFiles" class="mono" name="files" rows="2" placeholder="Für lose Skripte / Code-Dumps">${esc(files)}</textarea></div>
    </div></fieldset>
    <fieldset class="fs"><legend>${icon("link")}Verknüpfungen &amp; Start</legend><div class="form">
      <div class="field"><label for="pfLive">Live-URL</label><input id="pfLive" name="live" value="${esc(v.live || "")}" placeholder="https://…"></div>
      <div class="field"><label for="pfRepo">GitHub-Repo</label><input id="pfRepo" name="repo" value="${esc(v.repo || "")}" placeholder="alex/name"></div>
      <div class="field"><label for="pfServe">Startseite (lokal)</label><input id="pfServe" name="serve" value="${esc(v.serve || "")}" placeholder="index.html"><small>Öffnet die Seite über ATLAS</small></div>
      <div class="field"><label for="pfRun">Start-Befehl</label><input id="pfRun" name="run" value="${esc(v.run || "")}" placeholder="npm run dev"><small>Läuft in PowerShell im ersten Ordner</small></div>
    </div></fieldset></div>
    <div class="mfoot">
      ${p ? `<button type="button" class="btn btn-ghost btn-danger left" id="delProj">${icon("trash")}Aus ATLAS entfernen</button>` : `<span class="hint"><kbd>Ctrl</kbd> + <kbd>Enter</kbd> speichert</span>`}
      <button type="button" class="btn btn-ghost" data-close>Abbrechen</button>
      <button class="btn btn-accent">${icon("check")}${p ? "Speichern" : "Projekt anlegen"}</button>
    </div>
  </form>`);
  $("#pfSec").onchange = (e) => $(".mhead").style.setProperty("--mc", secColor(e.target.value));
  $("#projForm").onsubmit = async (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    const list = (s) => s.split(",").map((x) => x.trim()).filter(Boolean);
    const lines = (s) => s.split("\n").map((x) => x.trim().replace(/^"|"$/g, "")).filter(Boolean);
    const proj = { ...(raw || {}), name: f.name.trim(), kind: f.kind.trim(), section: f.section, status: f.status || "aktiv", desc: f.desc.trim(), tech: list(f.tech), tags: list(f.tags), paths: lines(f.paths), files: lines(f.files), live: f.live.trim(), repo: f.repo.trim(), serve: f.serve.trim(), run: f.run.trim() };
    if (!p) delete proj.id;
    try {
      const r = await api("/api/project", { project: proj, oldId: p?.id });
      closeModal();
      if (p && p.id !== r.id) delete S.trees[p.id];
      await reload();
      location.hash = `#/p/${enc(r.id)}`;
      toast("Gespeichert, wird neu gescannt…");
    } catch (err) { toast(err.message, true); }
  };
  const del = $("#delProj");
  if (del) del.onclick = async () => {
    if (!confirm(`«${p.name}» aus ATLAS entfernen?\nDie Dateien selbst bleiben erhalten.`)) return;
    await api("/api/project/delete", { id: p.id });
    closeModal();
    await reload();
    location.hash = `#/s/${enc(p.section)}`;
    toast("Entfernt (Dateien unverändert)");
  };
}
function sectionEditor(sec, parent) {
  modal(`<div class="mhead" style="--mc:${secColor(sec?.id || parent || "")}"><span class="mh-ico">${icon(sec ? "edit" : "layers")}</span>
    <div><h2>${sec ? "Bereich bearbeiten" : "Neuer Unterbereich"}</h2><p>${sec ? esc(secLabel(sec.id)) : "Ein Bereich bündelt Projekte, z.B. ein Schulmodul."}</p></div>
    <button type="button" class="icon-btn" data-close title="Schliessen (Esc)" aria-label="Schliessen">${icon("x")}</button></div>
  <form id="secForm" class="form" style="padding-top:18px">
    <div class="field full"><label>Name</label><input name="name" value="${esc(sec?.name || "")}" required></div>
    ${!sec ? `<div class="field full"><label>Gehört zu</label><select name="parent"><option value="">(Hauptbereich)</option>${sectionOptions(parent)}</select></div>` : ""}
    <div class="field full"><label>Untertitel</label><input name="subtitle" value="${esc(sec?.subtitle || "")}"></div>
    <div class="field full"><label>Beschreibung</label><textarea name="desc" rows="2">${esc(sec?.desc || "")}</textarea></div>
    <div class="modal-foot" style="grid-column:1/-1"><button type="button" class="btn btn-ghost" data-close>Abbrechen</button><button class="btn btn-accent">${icon("check")}Speichern</button></div>
  </form>`);
  $("#secForm").onsubmit = async (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    try {
      const r = await api("/api/section", { section: { ...f }, oldId: sec?.id });
      closeModal();
      await reload();
      location.hash = `#/s/${enc(r.id)}`;
    } catch (err) { toast(err.message, true); }
  };
}

// ------------------------------------------------------------ Suchpalette
const P = { items: [], sel: 0, timer: null, q: "" };
function openPalette() {
  $("#palette").hidden = false;
  const inp = $("#paletteInput");
  inp.value = "";
  paletteSearch("");
  inp.focus();
}
const closePalette = () => { $("#palette").hidden = true; };
function markQ(text, terms) {
  let s = esc(text);
  for (const t of terms) if (t) s = s.replace(new RegExp(esc(t).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), (m) => `<mark>${m}</mark>`);
  return s;
}
function paletteSearch(q, fromFetch) {
  P.q = q;
  if (!fromFetch && P.filesFor !== q) P.files = [];
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  const items = [];
  if (!terms.length) {
    const recent = allProjects().sort((a, b) => (b.scan.last || 0) - (a.scan.last || 0)).slice(0, 7);
    recent.forEach((p) => items.push({ group: "Zuletzt geändert", go: `#/p/${enc(p.id)}`, p }));
    S.top.forEach((s) => items.push({ group: "Bereiche", go: `#/s/${enc(s.id)}`, s }));
  } else {
    const secs = Object.values(S.sec).filter((s) => terms.every((t) => (s.name + " " + (s.subtitle || "")).toLowerCase().includes(t))).slice(0, 6);
    const scored = everything().map((p) => {
      const name = p.name.toLowerCase();
      const hay = [p.kind, p.desc, ...(p.tech || []), ...(p.tags || []), secLabel(p.section), p.notes].join(" ").toLowerCase();
      let sc = 0;
      for (const t of terms) {
        if (name.startsWith(t)) sc += 100;
        else if (name.includes(t)) sc += 60;
        else if (hay.includes(t)) sc += 20;
        else return null;
      }
      return [sc, p];
    }).filter(Boolean).sort((a, b) => b[0] - a[0] || !!a[1].virtual - !!b[1].virtual).slice(0, 12);
    scored.forEach(([, p]) => items.push({ group: "Projekte", go: `#/p/${enc(p.id)}`, p }));
    secs.forEach((s) => items.push({ group: "Bereiche", go: `#/s/${enc(s.id)}`, s }));
    (P.files || []).forEach((f) => items.push({ group: "Dateien", go: `#/p/${enc(f.p)}/files?f=${enc(f.path)}`, f }));
    if (q.trim().length >= 3) items.push({ group: "Code", go: `#/grep?q=${enc(q.trim())}`, grep: q.trim() });
  }
  const keep = fromFetch ? P.sel : 0;
  P.items = items;
  P.sel = Math.min(keep, Math.max(0, items.length - 1));
  drawPalette(terms);
  if (fromFetch) return;
  clearTimeout(P.timer);
  if (q.trim().length >= 2) {
    P.timer = setTimeout(async () => {
      try {
        const r = await api(`/api/search?q=${enc(q.trim())}`);
        if (P.q !== q) return;
        P.files = r.results.slice(0, 12);
        P.filesFor = q;
        paletteSearch(q, true);
      } catch { /* egal */ }
    }, 160);
  }
}
function drawPalette(terms) {
  let html = "", g = "";
  P.items.forEach((it, i) => {
    if (it.group !== g) { g = it.group; html += `<div class="pr-label">${g}</div>`; }
    let inner;
    if (it.p) inner = `<div class="mini-thumb" style="--sc:${secColor(it.p.section)}">${thumbHTML(it.p, false)}</div><div class="meta"><b>${markQ(it.p.name, terms)}</b><small>${esc(it.p.kind || "")} · ${esc(secLabel(it.p.section))}</small></div>${statusPill(it.p.status)}`;
    else if (it.s) inner = `<span class="sec-ico" style="--sc:${secColor(it.s.id)}">${icon(secIcon(it.s.id))}</span><div class="meta"><b>${markQ(it.s.name, terms)}</b><small>${esc(it.s.subtitle || secLabel(it.s.id))}</small></div><span class="right">${it.s.agg.count} Projekte</span>`;
    else if (it.f) { const n = it.f.path.split("\\").pop(); inner = `${icon(fileIcon(n))}<div class="meta"><b>${markQ(n, terms)}</b><small>${esc(S.prj[it.f.p]?.name || "")} · ${esc(it.f.path)}</small></div><span class="right">${fmtBytes(it.f.size)}</span>`; }
    else inner = `${icon("code")}<div class="meta"><b>Im Code nach «${esc(it.grep)}» suchen</b><small>Durchsucht den Inhalt aller Dateien</small></div><kbd>Enter</kbd>`;
    html += `<div class="pr ${i === P.sel ? "on" : ""}" data-pi="${i}">${inner}</div>`;
  });
  $("#paletteResults").innerHTML = html || `<div class="pr-empty">Nichts gefunden.</div>`;
  $(".pr.on")?.scrollIntoView({ block: "nearest" });
}
function choose(i) {
  const it = P.items[i];
  if (!it) return;
  closePalette();
  location.hash = it.go;
}

// ------------------------------------------------------------ Daten & Scan
async function reload() {
  const d = await api("/api/data");
  index(d);
  updatePill();
  render(true);
  if (d.scanning) poll();
}
let pollT;
function poll() {
  clearTimeout(pollT);
  pollT = setTimeout(async () => {
    try {
      const ping = await api("/api/ping");
      // neue Daten (z.B. fertig gerenderte Folienbilder) während des Scans laufend übernehmen
      if (ping.scannedAt !== S.data.scannedAt || !ping.scanning) {
        const d = await api("/api/data");
        index(d);
        const r = parseRoute();
        const busyUI = !$("#modal").hidden || !$("#palette").hidden;
        if (busyUI || (r.parts[0] === "p" && r.parts[2] === "files")) $("#side").innerHTML = sideHTML(r);
        else render(true);
      }
      updatePill(ping.scanning, ping.phase);
      if (ping.scanning) poll();
    } catch { poll(); }
  }, 3000);
}
function updatePill(busy, phase) {
  const scanning = busy ?? S.data?.scanning;
  phase = phase ?? S.data?.phase;
  const b = $("#scanBtn");
  b.classList.toggle("busy", !!scanning);
  b.innerHTML = icon("refresh") + `<span>${scanning ? (phase || "Scanne") + "…" : "Gescannt " + ago(S.data?.scannedAt)}</span>`;
}

// ------------------------------------------------------------ Events
function setTheme(t) {
  document.documentElement.dataset.theme = t;
  store.set("theme", t);
  $("#themeBtn").innerHTML = icon(t === "dark" ? "sun" : "moon");
}
document.addEventListener("click", (e) => {
  const t = e.target;
  const closeEl = t.closest("[data-close]");
  if (closeEl) { closeModal(); return; }
  if (t.id === "modal") { closeModal(); return; }
  if (t.id === "palette") { closePalette(); return; }
  const pr = t.closest("[data-pi]");
  if (pr) { choose(+pr.dataset.pi); return; }
  const actEl = t.closest("[data-act]");
  if (actEl) { e.preventDefault(); e.stopPropagation(); act(actEl); return; }
  const tog = t.closest("[data-toggle]");
  if (tog) {
    e.stopPropagation();
    const id = tog.dataset.toggle;
    const isOpen = tog.classList.contains("open");
    if (isOpen) S.open.delete(id); else S.open.add(id);
    store.set("open", [...S.open]);
    const r = parseRoute();
    $("#side").innerHTML = sideHTML(r);
    return;
  }
  const col = t.closest("[data-collapse]");
  if (col) {
    const id = col.dataset.collapse;
    if (S.collapsed.has(id)) S.collapsed.delete(id); else S.collapsed.add(id);
    store.set("collapsed", [...S.collapsed]);
    col.closest(".group").classList.toggle("collapsed");
    col.classList.toggle("open");
    return;
  }
  const flt = t.closest("[data-filter]");
  if (flt) { S.filter = flt.dataset.filter; render(true); return; }
  const vw = t.closest("[data-view]");
  if (vw) { S.view = vw.dataset.view; store.set("view", S.view); render(true); return; }
  const srt = t.closest("[data-sort]");
  if (srt) { S.sort = srt.dataset.sort; store.set("sort", S.sort); render(true); return; }
  const mdm = t.closest("[data-mdmode]");
  if (mdm) { store.set("mdmode", mdm.dataset.mdmode); const r = parseRoute(); const T = treeState(r.parts[1]); preview(r.parts[1], T.sel); return; }
  const dir = t.closest("[data-dir]");
  if (dir) {
    const r = parseRoute();
    const pid = r.parts[1];
    const T = treeState(pid);
    const path = dir.dataset.dir;
    if (T.open.has(path)) T.open.delete(path);
    else { T.open.add(path); ls(pid, path).then(() => renderTree(pid)).catch((err) => toast(err.message, true)); }
    renderTree(pid);
    return;
  }
  const file = t.closest("[data-file]");
  if (file) {
    const r = parseRoute();
    location.hash = `#/p/${enc(r.parts[1])}/files?f=${enc(file.dataset.file)}`;
    return;
  }
  const go = t.closest("[data-go]");
  if (go && !t.closest("a[href]")) { location.hash = go.dataset.go; }
});
document.addEventListener("change", (e) => {
  if (e.target.id === "sortSel") { S.sort = e.target.value; store.set("sort", S.sort); render(true); }
});
let noteT;
document.addEventListener("input", (e) => {
  if (e.target.id === "notes") {
    const id = parseRoute().parts[1];
    $("#noteState").textContent = "…";
    clearTimeout(noteT);
    noteT = setTimeout(async () => {
      try {
        await api("/api/meta", { id, notes: e.target.value });
        S.prj[id].notes = e.target.value;
        const raw = S.data.catalog.projects.find((x) => x.id === id);
        if (raw) raw.notes = e.target.value;
        $("#noteState") && ($("#noteState").textContent = "Gespeichert");
      } catch (err) { toast(err.message, true); }
    }, 600);
  }
  if (e.target.id === "paletteInput") paletteSearch(e.target.value);
});
document.addEventListener("submit", (e) => {
  if (e.target.id === "grepForm") {
    e.preventDefault();
    const q = $("#grepInput").value.trim();
    location.hash = `#/grep?q=${enc(q)}`;
  }
});
document.addEventListener("keydown", (e) => {
  const pal = !$("#palette").hidden;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); pal ? closePalette() : openPalette(); return; }
  if (e.key === "Escape") { if (pal) closePalette(); else if (!$("#modal").hidden) closeModal(); return; }
  if (pal) {
    if (e.key === "ArrowDown") { e.preventDefault(); P.sel = Math.min(P.sel + 1, P.items.length - 1); drawPalette(P.q.toLowerCase().split(/\s+/)); }
    if (e.key === "ArrowUp") { e.preventDefault(); P.sel = Math.max(P.sel - 1, 0); drawPalette(P.q.toLowerCase().split(/\s+/)); }
    if (e.key === "Enter") { e.preventDefault(); choose(P.sel); }
    return;
  }
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName);
  if (!typing && e.key === "/" ) { e.preventDefault(); openPalette(); }
  if (!typing && e.altKey && e.key === "ArrowLeft") history.back();
});
$("#openSearch").onclick = openPalette;
$("#themeBtn").onclick = () => setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
$("#newBtn").onclick = () => editor(null, { section: currentSection() });
$("#scanBtn").onclick = async () => { try { await api("/api/rescan", {}); updatePill(true); poll(); } catch (e) { toast(e.message, true); } };
window.addEventListener("hashchange", () => render());
setInterval(async () => {
  updatePill();
  try {
    const ping = await api("/api/ping");
    if (S.data && ping.scanning && !S.data.scanning) { S.data.scanning = true; updatePill(true, ping.phase); poll(); }
    else if (S.data && !ping.scanning && ping.scannedAt !== S.data.scannedAt) poll();
  } catch { /* Server weg */ }
}, 30000);

setTheme(store.get("theme", "dark"));
reload().catch((e) => { $("#main").innerHTML = `<div class="page"><div class="empty">ATLAS-Server nicht erreichbar: ${esc(e.message)}</div></div>`; });
