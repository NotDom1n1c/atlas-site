/* ATLAS - IT-Werkzeuge: Netzwerk, Server & Verbindungen, Arbeitsrapport, System-Inventar, Ablaufdaten im Monitor */
"use strict";

const IT = { out: {}, net: null, hosts: null, report: null, week: null, inv: null, scan: null, timer: null, invQ: "" };
const itGet = (n, q = "") => api(`/api/it/${n}${q ? "?" + q : ""}`);
const itPost = (n, b = {}) => api(`/api/it/${n}`, b);
const busy = (el, on, txt) => { if (!el) return; el.disabled = on; if (on) { el.dataset.txt = el.innerHTML; el.innerHTML = `${icon("refresh", "i spin")}${txt || "Läuft…"}`; } else if (el.dataset.txt) el.innerHTML = el.dataset.txt; };
const fmtD = (iso) => new Date(iso + "T00:00:00").toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit" });
const kv = (rows) => `<dl class="kv">${rows.filter(([, v]) => v !== undefined && v !== null && v !== "").map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("")}</dl>`;

// ------------------------------------------------------------ Darstellungs-Bausteine
// Port-Karte: Achse 0–65535 in drei Zonen mit Punkten + Liste pro Zone
const ZONES = [["System", 0, 1023], ["Registriert", 1024, 49151], ["Dynamisch", 49152, 65535]];
function portMap(list) {
  const zone = (p) => ZONES.findIndex(([, a, b]) => p >= a && p <= b);
  const pos = (p) => { const z = zone(p), [, a, b] = ZONES[z]; return z * 33.333 + ((p - a) / (b - a)) * 33.333; };
  return `<div class="pmap"><div class="pmap-axis">${ZONES.map(([n, a, b]) => `<div class="pmap-zone"><span>${n}</span><em>${a}–${b}</em></div>`).join("")}
      ${list.map((x) => `<i class="pmap-dot" style="left:${pos(x.port)}%" title="${x.port} ${esc(x.service || x.proc || "")}"></i>`).join("")}</div>
    <div class="pmap-cols">${ZONES.map(([n], z) => `<div class="pmap-col"><h5>${n}<b>${list.filter((x) => zone(x.port) === z).length}</b></h5>
      ${list.filter((x) => zone(x.port) === z).map((x) => `<div class="pmap-row" title="${esc(x.addr || "")}"><span class="led"></span><b>${x.port}</b><span>${esc(x.service || x.proc)}</span><em>${esc(x.proc || "")}</em></div>`).join("") || `<div class="pmap-none">nichts offen</div>`}</div>`).join("")}</div></div>`;
}
// Schalter statt Wort: zeigt «an/aus» wie ein kleiner Kippschalter
const toggle = (on, t = "aktiv", f = "aus") => `<span class="tgl ${on ? "on" : ""}"><i></i>${on ? t : f}</span>`;
// Countdown-Ring für Ablaufdaten (voll = 90 Tage oder mehr)
function ring(days, cls) {
  const pct = Math.max(0, Math.min(1, (days ?? 0) / 90)), C = 2 * Math.PI * 15;
  return `<span class="ring ${cls}"><svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="15" class="ring-bg"/><circle cx="18" cy="18" r="15" class="ring-fg" stroke-dasharray="${(pct * C).toFixed(1)} ${C.toFixed(1)}"/></svg><b>${days == null ? "–" : days < 0 ? "!" : days}</b></span>`;
}
// Messwert-Anzeige: grosse Ziffern, kleine Einheit, Trennstriche
const readout = (items) => `<div class="readout">${items.map(([v, l, cls = ""]) => `<div class="${cls}"><b>${v}</b><span>${l}</span></div>`).join("")}</div>`;

// ------------------------------------------------------------ Netzwerk
function viewNet() {
  const host0 = store.get("it.host", "1.1.1.1");
  return `<div class="page">${pageHead("net", "Netzwerk", "Verbindung, Ping, Traceroute, Ports, DNS und Subnetze an einem Ort. Dein Heimnetz scannst du unten.", "#4cc2ff",
    `<button class="btn" data-it="net-refresh">${icon("refresh")}Aktualisieren</button>`)}
  <div id="netInfo" class="net-cards"><div class="loading" style="height:90px">Lese Netzwerk…</div></div>
  <div class="cc-grid">
    <div class="panel"><div class="panel-title">${icon("pulse")}Ping</div>
      <form class="it-form" data-itform="ping"><input name="h" value="${esc(host0)}" placeholder="Host oder IP" aria-label="Host"><select name="n" aria-label="Anzahl">${[4, 8, 10].map((n) => `<option>${n}</option>`).join("")}</select><button class="btn btn-accent">${icon("play")}Ping</button></form>
      <div id="pingOut" class="it-out"></div></div>
    <div class="panel"><div class="panel-title">${icon("git")}Traceroute</div>
      <form class="it-form" data-itform="trace"><input name="h" value="${esc(host0)}" placeholder="Host oder IP" aria-label="Host"><button class="btn btn-accent">${icon("play")}Verfolgen</button></form>
      <div id="traceOut" class="it-out"></div></div>
    <div class="panel"><div class="panel-title">${icon("lock")}Port-Check</div>
      <form class="it-form" data-itform="ports"><input name="h" value="${esc(store.get("it.phost", "127.0.0.1"))}" placeholder="Host oder IP" aria-label="Host"><input name="p" value="web" placeholder="z.B. 22,80,443" aria-label="Ports" style="max-width:150px"><button class="btn btn-accent">${icon("play")}Prüfen</button></form>
      <div class="chips it-presets">${["web", "windows", "datenbank", "mail", "linux", "alle"].map((x) => `<button type="button" class="chip" data-ports="${x}">${x[0].toUpperCase() + x.slice(1)}</button>`).join("")}</div>
      <div id="portsOut" class="it-out"></div></div>
    <div class="panel"><div class="panel-title">${icon("globe")}DNS-Abfrage</div>
      <form class="it-form" data-itform="dns"><input name="n" value="${esc(store.get("it.dns", "example.com"))}" placeholder="Domain" aria-label="Domain"><select name="t" aria-label="Typ">${["A", "AAAA", "MX", "TXT", "NS", "CNAME", "SOA", "PTR"].map((t) => `<option>${t}</option>`).join("")}</select><button class="btn btn-accent">${icon("search")}Abfragen</button></form>
      <div id="dnsOut" class="it-out"></div></div>
    <div class="panel"><div class="panel-title">${icon("grid")}Subnetz-Rechner</div>
      <form class="it-form" data-itform="subnet"><input name="c" id="cidrIn" value="${esc(store.get("it.cidr", "192.168.1.0/24"))}" placeholder="192.168.1.0/24" aria-label="Netz mit Präfix"><select name="split" aria-label="Aufteilen in"><option value="">nicht aufteilen</option>${Array.from({ length: 9 }, (_, i) => 22 + i).map((n) => `<option value="${n}">in /${n} aufteilen</option>`).join("")}</select><button class="btn btn-accent">${icon("check")}Rechnen</button></form>
      <div id="subnetOut" class="it-out"></div></div>
    <div class="panel"><div class="panel-title">${icon("spark")}Wake-on-LAN</div>
      <form class="it-form" data-itform="wol"><input name="mac" placeholder="AA:BB:CC:DD:EE:FF" aria-label="MAC-Adresse"><button class="btn btn-accent">${icon("send")}Aufwecken</button></form>
      <div class="dc-note" style="margin-top:8px">Weckt einen PC im selben Netz, wenn «Wake on LAN» im BIOS/Netzwerkadapter aktiv ist.</div><div id="wolOut" class="it-out"></div></div>
    <div class="panel cc-wide"><div class="panel-title">${icon("net")}Mein Netz scannen<span class="act-sum" id="scanSum"></span></div>
      <div id="scanOut"><div class="dc-note">Zeigt alle Geräte in deinem Heimnetz (IP, Name, MAC). Läuft nur in Netzen, die du als «mein Netz» bestätigt hast, nie im Schul- oder Firmennetz.</div>
      <button class="btn btn-accent" data-it="scan" style="margin-top:10px">${icon("search")}Netz scannen</button></div></div>
  </div></div>`;
}
async function loadNet() {
  const n = IT.net = await itGet("net");
  const box = $("#netInfo");
  if (!box) return;
  const card = (a) => `<div class="net-card ${a.gateway ? "main" : ""}"><div class="net-top">${icon(a.wifi ? "net" : "server")}<b>${esc(a.alias)}</b><span class="sdot ${a.gateway ? "on" : ""}"></span></div>
    <small>${esc(a.desc || "")}</small>${kv([["IPv4", a.ipv4 ? `<code>${esc(a.ipv4)}/${a.prefix}</code>` : "–"], ["Gateway", a.gateway ? `<code>${esc(a.gateway)}</code>` : ""],
      ["DNS", (a.dns || []).map((d) => `<code>${esc(d)}</code>`).join(" ")], ["MAC", `<code>${esc(a.mac || "")}</code>`], ["Tempo", esc(a.speed || "")],
      ["WLAN", a.wifi ? `${esc(a.wifi.ssid || "")}${a.wifi.signal ? ` · ${a.wifi.signal}% Signal` : ""}` : ""]])}</div>`;
  const m0 = n.adapters.find((a) => a.gateway && a.ipv4);
  const chain = $("#netChain") || (box.insertAdjacentHTML("beforebegin", `<div id="netChain" class="net-chain"></div>`), $("#netChain"));
  chain.innerHTML = [["globe", "Internet", n.public || "offline"], ["net", m0?.wifi?.ssid ? `Router · ${esc(m0.wifi.ssid)}` : "Router", m0?.gateway || "–"], ["app", n.hostname, m0 ? `${m0.ipv4}/${m0.prefix}` : "–"]]
    .map(([ic, l, ip], i) => `${i ? `<div class="nc-link ${n.public || i === 2 ? "on" : ""}"><i></i></div>` : ""}<div class="nc-node"><span class="nc-ico">${icon(ic)}</span><b>${l}</b><code>${esc(ip)}</code></div>`).join("");
  box.innerHTML = `<div class="net-card pub"><div class="net-top">${icon("globe")}<b>Internet</b><span class="sdot ${n.public ? "on" : "bad"}"></span></div><small>so sieht dich das Internet</small>
    ${kv([["Öffentliche IP", n.public ? `<code>${esc(n.public)}</code>` : "offline?"], ["Gerätename", `<code>${esc(n.hostname)}</code>`]])}</div>` + n.adapters.map(card).join("");
  const main = n.adapters.find((a) => a.gateway && a.ipv4);
  if (main && !store.get("it.cidr")) { $("#cidrIn").value = subnetOf(main.ipv4, main.prefix); }
}
// Subnetz-Rechnung im Browser (32-Bit, ohne Bibliothek)
const ip2n = (ip) => ip.split(".").reduce((a, o) => ((a << 8) >>> 0) + (+o), 0) >>> 0;
const n2ip = (n) => [24, 16, 8, 0].map((s) => (n >>> s) & 255).join(".");
const maskOf = (p) => (p === 0 ? 0 : (0xffffffff << (32 - p)) >>> 0);
const subnetOf = (ip, p) => `${n2ip((ip2n(ip) & maskOf(p)) >>> 0)}/${p}`;
function subnet(cidr, split) {
  const m = cidr.trim().match(/^(\d{1,3}(?:\.\d{1,3}){3})\/(\d{1,2})$/);
  if (!m || m[1].split(".").some((o) => +o > 255) || +m[2] > 32) return `<div class="empty">Format: 192.168.1.0/24</div>`;
  const p = +m[2], mask = maskOf(p), net = (ip2n(m[1]) & mask) >>> 0, bc = (net | (~mask >>> 0)) >>> 0;
  const size = 2 ** (32 - p), usable = p >= 31 ? size : size - 2;
  const priv = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(m[1]);
  let html = kv([["Netz", `<code>${n2ip(net)}/${p}</code>${priv ? ` <span class="tag">privat</span>` : ""}`], ["Maske", `<code>${n2ip(mask)}</code>`], ["Wildcard", `<code>${n2ip(~mask >>> 0)}</code>`],
    ["Erster Host", `<code>${n2ip(p >= 31 ? net : net + 1)}</code>`], ["Letzter Host", `<code>${n2ip(p >= 31 ? bc : bc - 1)}</code>`], ["Broadcast", `<code>${n2ip(bc)}</code>`],
    ["Hosts", `<b>${fmtN(usable)}</b> nutzbar (${fmtN(size)} Adressen)`]]);
  if (split && +split > p) {
    const sp = +split, n = 2 ** (sp - p), step = 2 ** (32 - sp);
    html += `<div class="sub-list"><div class="dc-note">${fmtN(n)} Subnetze à ${fmtN(sp >= 31 ? step : step - 2)} Hosts${n > 64 ? " (erste 64)" : ""}</div>${Array.from({ length: Math.min(n, 64) }, (_, i) => {
      const s = (net + i * step) >>> 0;
      return `<div><code>${n2ip(s)}/${sp}</code><span>${n2ip(s + 1)} – ${n2ip(s + step - 2)}</span></div>`;
    }).join("")}</div>`;
  }
  return html;
}
function drawScan(r) {
  const out = $("#scanOut");
  if (!out) return;
  if (r.error) { out.innerHTML = `<div class="empty">${esc(r.error)}</div>`; return; }
  if (r.needConfirm) {
    out.innerHTML = `<div class="guard-box ${r.warn ? "warn" : ""}">${icon(r.warn ? "lock" : "net")}<div><b>Ist «${esc(r.ssid)}» dein eigenes Netz?</b>
      <div>${r.warn ? "Das sieht nach einem Schul-, Firmen- oder öffentlichen Netz aus. Dort ist Scannen meist verboten (Nutzungsregeln) und zeigt fremde Geräte. Bitte nur zuhause oder im eigenen Labor scannen." : "Gescannt wird nur, wenn das dein Netz ist (zuhause, eigenes Labor). ATLAS merkt sich die Bestätigung für dieses Netz."}</div>
      <label class="it-check"><input type="checkbox" id="scanOk"> Ja, das ist mein eigenes Netz und ich darf es scannen</label>
      <button class="btn btn-accent" data-it="scan-confirm" style="margin-top:8px">${icon("search")}Scannen</button></div></div>`;
    return;
  }
  $("#scanSum").textContent = `${r.hosts.length} Geräte in ${r.network} (${r.ssid || r.adapter}) · ${ago(r.time)}`;
  out.innerHTML = `<table class="table"><thead><tr><th>IP</th><th>Name</th><th>MAC</th><th class="num">Ping</th><th></th></tr></thead><tbody>${r.hosts.map((h) => `<tr>
    <td><code>${esc(h.ip)}</code> ${h.me ? `<span class="tag">dieser Laptop</span>` : ""}${h.gateway ? `<span class="tag">Router</span>` : ""}</td><td>${esc(h.name || "–")}</td>
    <td><code>${esc(h.mac || "–")}</code></td><td class="num">${h.ms == null ? "–" : h.ms + " ms"}</td>
    <td style="text-align:right">${h.me ? "" : `<button class="btn sm btn-ghost" data-host-add="${esc(h.ip)}" data-host-name="${esc(h.name || h.ip)}">${icon("plus")}Als Server</button>`}${h.mac && !h.me ? `<button class="btn sm btn-ghost" data-wol="${esc(h.mac)}" title="Wake-on-LAN">${icon("spark")}</button>` : ""}</td></tr>`).join("")}</tbody></table>
    <button class="btn sm btn-ghost" data-it="scan-forget" style="margin-top:8px">${icon("x")}Bestätigte Netze vergessen</button>`;
}
async function runItForm(f) {
  const d = Object.fromEntries(new FormData(f));
  const kind = f.dataset.itform, btn = f.querySelector("button");
  const out = { ping: "#pingOut", trace: "#traceOut", ports: "#portsOut", dns: "#dnsOut", subnet: "#subnetOut", wol: "#wolOut" }[kind];
  if (kind === "subnet") { store.set("it.cidr", d.c); $(out).innerHTML = IT.out[out] = subnet(d.c, d.split); return; }
  busy(btn, true, kind === "trace" ? "bis 60 s…" : "");
  try {
    if (kind === "ping") {
      store.set("it.host", d.h);
      const r = await itGet("ping", `h=${enc(d.h)}&n=${d.n}`);
      const mx = Math.max(...r.times, 1);
      $(out).innerHTML = `${readout([[r.avg ?? "–", "ms Schnitt"], [`${r.min ?? "–"}–${r.max ?? "–"}`, "ms min–max"], [`${r.lost}/${r.sent}`, "verloren", r.lost ? "bad" : "ok"], [esc(r.ip), "Adresse", "mono"]])}
        ${r.times.length ? `<div class="ping-bars">${r.times.map((t) => `<i style="height:${Math.max(8, (t / mx) * 100)}%" title="${t} ms"></i>`).join("")}</div>` : `<div class="empty">${esc(r.error)}</div>`}`;
    } else if (kind === "trace") {
      store.set("it.host", d.h);
      const r = await itGet("trace", `h=${enc(d.h)}`);
      const mx = Math.max(...r.hops.flatMap((h) => h.ms), 1);
      $(out).innerHTML = `<div class="hops">${r.hops.map((h) => `<div class="hop ${h.timeout ? "to" : ""}"><span class="hop-n">${h.n}</span><code>${esc(h.ip || "* * *")}</code>
        <span class="hop-bar"><i style="width:${h.ms.length ? (Math.max(...h.ms) / mx) * 100 : 0}%"></i></span><span class="hop-ms">${h.ms.length ? Math.round(h.ms.reduce((a, b) => a + b, 0) / h.ms.length) + " ms" : "keine Antwort"}</span></div>`).join("")}</div>`;
    } else if (kind === "ports") {
      store.set("it.phost", d.h);
      const r = await itGet("ports", `h=${enc(d.h)}&p=${enc(d.p)}`);
      $(out).innerHTML = `<div class="sockets">${r.ports.map((p) => `<div class="socket ${p.open ? "open" : ""}" title="${p.open ? `offen (${p.ms} ms)` : "zu oder gefiltert"}"><span class="led"></span><b>${p.port}</b><small>${esc(p.service || "–")}</small><em>${p.open ? `${p.ms} ms` : "zu"}</em></div>`).join("")}</div>
        <div class="dc-note" style="margin-top:6px">${r.ports.filter((p) => p.open).length} von ${r.ports.length} offen auf ${esc(r.host)}</div>`;
    } else if (kind === "dns") {
      store.set("it.dns", d.n);
      const r = await itGet("dns", `n=${enc(d.n)}&t=${d.t}`);
      $(out).innerHTML = r.records.length ? `<table class="table"><tbody>${r.records.map((x) => `<tr><td><span class="tag">${x.type}</span></td><td><code>${esc(x.value)}</code></td><td class="num">TTL ${x.ttl ?? "–"}</td></tr>`).join("")}</tbody></table>` : `<div class="empty">${esc(r.error)}</div>`;
    } else if (kind === "wol") {
      const r = await itPost("wol", { mac: d.mac });
      $(out).innerHTML = r.error ? `<div class="empty">${esc(r.error)}</div>` : `<div class="dc-note">${icon("check")} Magic Packet gesendet.</div>`;
    }
  } catch (e) { $(out).innerHTML = `<div class="empty">${esc(e.message)}</div>`; } finally { busy(btn, false); if ($(out)) IT.out[out] = $(out).innerHTML; }
}

// ------------------------------------------------------------ Server & Verbindungen
const KIND = { ssh: ["SSH", "terminal"], rdp: ["Remote Desktop", "window"], web: ["Web", "globe"], tcp: ["Dienst", "server"] };
const viewHosts = () => `<div class="page">${pageHead("server", "Server & Verbindungen", "SSH, Remote Desktop und Weboberflächen mit einem Klick, mit Live-Status. Passwörter bleiben in KeePassXC, ATLAS speichert keine.", "#b494ff",
  `<button class="btn btn-accent" data-host-edit="">${icon("plus")}Server hinzufügen</button>`)}<div id="hostList" class="host-grid"><div class="loading" style="height:120px">Prüfe Verbindungen…</div></div></div>`;
async function loadHosts() {
  IT.hosts = await itGet("hosts");
  const box = $("#hostList");
  if (!box) return;
  box.innerHTML = IT.hosts.hosts.map((h) => {
    const [kl, ki] = KIND[h.kind] || KIND.tcp;
    const acts = [h.kind === "ssh" ? `<button class="btn sm btn-accent" data-host-open="${h.id}" data-how="ssh">${icon("terminal")}SSH</button>` : "",
      h.kind === "rdp" ? `<button class="btn sm btn-accent" data-host-open="${h.id}" data-how="rdp">${icon("window")}Verbinden</button>` : "",
      h.kind === "web" ? `<button class="btn sm btn-accent" data-host-open="${h.id}" data-how="web">${icon("external")}Öffnen</button>` : ""].join("");
    return `<div class="host ${h.up ? "up" : "down"}"><div class="host-top"><span class="sdot ${h.up ? "on" : "bad"}"></span><b>${esc(h.name)}</b><span class="tag">${icon(ki)}${kl}</span></div>
      <div class="term"><span class="term-p">❯</span>${{ ssh: "ssh", rdp: "mstsc /v:", web: "open", tcp: "nc -z" }[h.kind] || ""} <b>${h.user ? esc(h.user) + "@" : ""}${esc(h.host)}</b><span class="term-port">${h.kind === "ssh" ? ` -p ${h.port}` : `:${h.port}`}</span><i class="term-cur"></i></div>
      <small>${h.up ? `erreichbar · ${h.ms} ms` : "nicht erreichbar"}${h.note ? " · " + esc(h.note) : ""}</small>
      <div class="host-acts">${acts}<button class="btn sm btn-ghost" data-copy-host="${esc(h.host)}" title="Adresse kopieren">${icon("copy")}</button>
        <button class="btn sm btn-ghost" data-host-edit="${h.id}" title="Bearbeiten">${icon("edit")}</button></div></div>`;
  }).join("") + `<button class="host add" data-host-edit="">${icon("plus")}<b>Server hinzufügen</b><small>z.B. deine VM LAB-SRV01, ein Raspberry Pi oder der Schul-Server</small></button>`;
}
function hostEditor(h = {}) {
  modal(`<div class="mhead" style="--mc:#b494ff"><span class="mh-ico">${icon("server")}</span><div><h2>${h.id ? "Server bearbeiten" : "Server hinzufügen"}</h2><p>Nur Adresse und Benutzer, nie Passwörter.</p></div>
    <button type="button" class="icon-btn" data-close aria-label="Schliessen">${icon("x")}</button></div>
  <form id="hostForm" class="form fx"><div class="mbody"><fieldset class="fs"><legend>${icon("server")}Verbindung</legend><div class="form">
    <div class="field"><label for="hfName">Name</label><input id="hfName" name="name" value="${esc(h.name || "")}" placeholder="LAB-SRV01" required></div>
    <div class="field"><label>Art</label><div class="status-pick">${Object.entries(KIND).map(([k, [l]]) => `<label style="--stc:#b494ff"><input type="radio" name="kind" value="${k}" ${(h.kind || "ssh") === k ? "checked" : ""}><span>${l}</span></label>`).join("")}</div></div>
    <div class="field"><label for="hfHost">Host oder IP</label><input id="hfHost" name="host" value="${esc(h.host || "")}" placeholder="192.168.56.10" required></div>
    <div class="field"><label for="hfPort">Port</label><input id="hfPort" name="port" type="number" value="${esc(h.port || "")}" placeholder="leer = Standard (22 / 3389 / 443)"></div>
    <div class="field"><label for="hfUser">Benutzer</label><input id="hfUser" name="user" value="${esc(h.user || "")}" placeholder="z.B. administrator"></div>
    <div class="field"><label for="hfNote">Notiz</label><input id="hfNote" name="note" value="${esc(h.note || "")}" placeholder="wofür?"></div>
  </div></fieldset></div>
  <div class="mfoot">${h.id ? `<button type="button" class="btn btn-ghost btn-danger left" data-host-del="${h.id}">${icon("trash")}Entfernen</button>` : ""}
    <button type="button" class="btn btn-ghost" data-close>Abbrechen</button><button class="btn btn-accent">${icon("check")}Speichern</button></div></form>`);
  $("#hostForm").onsubmit = async (e) => {
    e.preventDefault();
    const r = await itPost("host-save", { host: { ...Object.fromEntries(new FormData(e.target)), id: h.id } });
    if (r.error) return toast(r.error, true);
    closeModal(); toast("Gespeichert");
    if (parseRoute().parts[0] === "hosts") loadHosts(); else location.hash = "#/hosts";
  };
}

// ------------------------------------------------------------ Arbeitsrapport
const viewReport = () => `<div class="page">${pageHead("edit", "Arbeitsrapport", "Deine Woche automatisch aus Datei-Änderungen, Commits und Notizen. Ergänzen, dann als Word oder in Obsidian speichern.", "#ffb547",
  `<button class="btn" data-it="rep-copy">${icon("copy")}Text kopieren</button><button class="btn" data-it="rep-obsidian">${appImg("obsidian", "app-img btn-app")}In Obsidian</button><button class="btn btn-accent" data-it="rep-docx">${appImg("word", "app-img btn-app")}Als Word</button>`)}
  <div id="repBox"><div class="loading" style="height:160px">Sammle deine Woche…</div></div></div>`;
async function loadReport(w) {
  const r = IT.report = await itGet("report", w ? `w=${w}` : "");
  IT.week = r.week;
  const box = $("#repBox");
  if (!box) return;
  const maxH = Math.max(...r.days.map((d) => d.hours), 1);
  box.innerHTML = `<div class="rep-nav"><button class="icon-btn" data-week="${r.prev}" title="Woche davor" aria-label="Woche davor">${icon("left")}</button>
    <div><b>KW ${r.week.slice(-2)}</b><span>${fmtD(r.from)} – ${fmtD(r.to)}.${r.to.slice(0, 4)}</span></div>
    <button class="icon-btn" data-week="${r.next}" title="Nächste Woche" aria-label="Nächste Woche">${icon("chev")}</button>${r.isCurrent ? "" : `<button class="btn sm btn-ghost" data-week="">Diese Woche</button>`}
    ${readout([[r.hours.toFixed(1), "Std. geschätzt"], [r.projects, "Projekte"], [r.commits, "Commits"], [r.notes, "Notizen"]])}</div>
    <div class="rep-week">${r.days.map((d) => `<div class="rep-col" title="${d.label}: ${d.hours} h"><i style="height:${(d.hours / maxH) * 100}%"></i><span>${d.label.slice(0, 2)}</span></div>`).join("")}</div>
    <div class="rep-rail">${r.days.map((d) => {
      const empty = !d.projects.length && !d.commits.length && !d.note;
      if (empty) return `<div class="rep-day empty-day"><span class="rep-node"></span><b>${d.label}, ${fmtD(d.date)}</b><span>keine Aktivität</span></div>`;
      return `<div class="rep-day"><span class="rep-node on"></span><div class="rep-head"><b>${d.label}, ${fmtD(d.date)}</b><span class="tag">ca. ${d.hours.toFixed(2)} h</span></div>
        <textarea class="notes rep-note" data-rep-date="${d.date}" rows="2" placeholder="${esc(d.summary || "Was hast du gemacht?")}">${esc(d.note)}</textarea>
        ${d.summary && !d.note ? `<button class="btn sm btn-ghost" data-rep-take="${d.date}">${icon("check")}Vorschlag übernehmen</button>` : ""}
        <div class="rep-proj">${d.projects.slice(0, 8).map((p) => `<a class="rep-chip" href="#/p/${enc(p.id)}" title="${esc(p.examples.join(", "))}" style="--sc:${secColor(p.section)}">${esc(p.name)}<em>${p.files}</em></a>`).join("")}</div>
        ${d.commits.length ? `<div class="rep-commits">${d.commits.slice(0, 6).map((c) => `<div>${icon("git")}<b>${esc(c.repo)}</b>${esc(c.msg)}</div>`).join("")}</div>` : ""}
        ${d.notes.length ? `<div class="rep-proj">${d.notes.map((n) => `<span class="rep-chip">${icon("book")}${esc(n)}</span>`).join("")}</div>` : ""}</div>`;
    }).join("")}</div>
    <div class="dc-note" style="margin-top:10px">Stunden sind geschätzt: Änderungen mit weniger als 45 Minuten Abstand zählen als eine Sitzung. Deine Texte werden lokal gespeichert.</div>`;
}
function reportText(r) {
  const days = r.days.filter((d) => d.projects.length || d.commits.length || d.note);
  return `Arbeitsrapport KW ${r.week.slice(-2)} (${fmtD(r.from)} – ${fmtD(r.to)}.${r.to.slice(0, 4)}), ca. ${r.hours.toFixed(1)} h\n\n` +
    days.map((d) => `${d.label}, ${fmtD(d.date)} (ca. ${d.hours.toFixed(2)} h)\n${d.note || d.summary}`).join("\n\n");
}
let repT;

// ------------------------------------------------------------ System-Inventar
const viewInventory = () => `<div class="page">${pageHead("cpu", "System-Inventar", "Hardware, Netzwerk, Sicherheit, offene Ports und Software dieses Laptops. Als Systemdoku in Word, z.B. für die Projektwoche.", "#6aa8ff",
  `<button class="btn" data-it="inv-fresh">${icon("refresh")}Neu erfassen</button><button class="btn btn-accent" data-it="inv-docx">${appImg("word", "app-img btn-app")}Systemdoku (Word)</button>`)}
  <div id="invBox"><div class="loading" style="height:160px">Erfasse das System (ca. 10 Sekunden)…</div></div></div>`;
async function loadInventory(fresh) {
  const v = IT.inv = await itGet("inventory", fresh ? "fresh=1" : "");
  const box = $("#invBox");
  if (!box) return;
  const yes = toggle;
  box.innerHTML = `<div class="dc-note" style="margin:-6px 0 14px">Erfasst ${ago(v.captured)} · ${new Date(v.captured * 1000).toLocaleString("de-CH")}</div>
  <div class="cc-grid">
    <div class="panel"><div class="panel-title">${icon("app")}Übersicht</div>${kv([["Gerät", `<b>${esc(v.host)}</b>`], ["Modell", esc(`${v.maker} ${v.model}`)], ["System", esc(`${v.os} (${v.arch})`)],
      ["Version", esc(`${v.version} · Build ${v.build}`)], ["Installiert", esc(v.installed)], ["Letzter Start", esc(v.boot)], ["BIOS", esc(v.bios)], ["Arbeitsgruppe", esc(v.domain)], ["Benutzer", esc(v.user)]])}</div>
    <div class="panel"><div class="panel-title">${icon("cpu")}Hardware</div>${kv([["Prozessor", esc(v.cpu)], ["Kerne", `${v.cores} Kerne · ${v.threads} Threads`], ["RAM", `${v.ram} GB`], ...(v.gpus || []).map((g) => ["Grafik", esc(g)])])}
      ${(v.disks || []).map((d) => `<div class="sys-row" style="margin-top:10px"><span>${esc(d.drive)} ${esc(d.label || "")} · ${esc(d.fs)}</span><span>${d.free} von ${d.size} GB frei</span></div><div class="meter"><i style="width:${100 - (d.free / d.size) * 100}%;background:var(--accent)"></i></div>`).join("")}</div>
    <div class="panel"><div class="panel-title">${icon("lock")}Sicherheit</div>${kv([...(v.firewall || []).map((f) => [`Firewall ${esc(f.name)}`, yes(f.on)]),
      ...(v.defender ? [["Virenschutz", yes(v.defender.av)], ["Echtzeitschutz", yes(v.defender.rt)], ["Signaturen", esc(v.defender.sig || "–")]] : []),
      ["Lokale Konten", (v.users || []).map((u) => `<span class="tag" style="opacity:${u.on ? 1 : .5}">${esc(u.name)}</span>`).join(" ")]])}</div>
    <div class="panel"><div class="panel-title">${icon("cube")}Virtualisierung</div>${(v.wsl || []).length + (v.vms || []).length ? kv([...(v.wsl || []).map((w) => [`WSL ${w.version}`, `${esc(w.name)} · ${esc(w.state)}`]), ...(v.vms || []).map((m) => ["VirtualBox", `${esc(m.name)} · ${m.running ? "läuft" : "aus"}`])]) : `<div class="empty">Keine VMs gefunden</div>`}</div>
    <div class="panel cc-wide"><div class="panel-title">${icon("net")}Netzwerk</div><table class="table"><thead><tr><th>Adapter</th><th>IPv4</th><th>Gateway</th><th>DNS</th><th>MAC</th></tr></thead><tbody>
      ${(v.network || []).map((a) => `<tr><td><b>${esc(a.alias)}</b><small style="display:block;color:var(--muted)">${esc(a.desc || "")}</small></td><td><code>${esc(a.ipv4 || "–")}/${a.prefix || ""}</code></td><td><code>${esc(a.gateway || "–")}</code></td><td>${(a.dns || []).map((d) => `<code>${esc(d)}</code>`).join(" ")}</td><td><code>${esc(a.mac || "")}</code></td></tr>`).join("")}</tbody></table></div>
    <div class="panel cc-wide"><div class="panel-title">${icon("server")}Offene Ports<span class="act-sum">${(v.listening || []).length} lauschende Dienste</span></div>
      ${portMap(v.listening || [])}</div>
    <div class="panel cc-wide"><div class="panel-title">${icon("layers")}Software<span class="act-sum">${(v.software || []).length} Programme · ${v.services} Dienste laufen</span></div>
      <input class="select" id="invQ" placeholder="Programm suchen…" value="${esc(IT.invQ)}" style="width:100%;margin-bottom:10px" aria-label="Programm suchen">
      <div id="invSw" class="sw-list"></div></div>
  </div>`;
  drawSoftware();
}
function drawSoftware() {
  const q = IT.invQ.toLowerCase();
  const list = (IT.inv?.software || []).filter((s) => !q || `${s.name} ${s.publisher}`.toLowerCase().includes(q));
  if ($("#invSw")) $("#invSw").innerHTML = list.map((s) => `<div><b>${esc(s.name)}</b><span>${esc(s.version || "")}</span><small>${esc(s.publisher || "")}</small></div>`).join("") || `<div class="empty">Nichts gefunden</div>`;
}

// ------------------------------------------------------------ Monitor: Zertifikate & Ablaufdaten
async function loadExpiry(fresh) {
  let box = $("#expBox");
  if (!box) {
    const host = $("#ciList")?.closest(".panel");
    if (!host) return;
    host.insertAdjacentHTML("afterend", `<div class="panel" id="expPanel"><div class="panel-title">${icon("lock")}Zertifikate & Ablaufdaten<span class="act-sum" id="expSum"></span></div><div id="expBox"><div class="loading" style="height:60px">Prüfe Zertifikate…</div></div></div>`);
    box = $("#expBox");
  }
  const e = await itGet("expiry", fresh ? "fresh=1" : "");
  const col = (d) => (d == null ? "" : d < 0 ? "bad" : d <= 14 ? "bad" : d <= 30 ? "warn" : "on");
  const bar = (d) => ring(d, col(d));
  $("#expSum").textContent = `geprüft ${ago(e.checked)}`;
  box.innerHTML = `<div class="exp-list">${e.certs.map((c) => `<div class="exp"><span class="sdot ${c.ok ? col(c.days) : "bad"}"></span><div class="srv-meta"><b>${esc(c.host)}</b><small>${c.ok ? `TLS-Zertifikat · ${esc(c.issuer)}` : esc(c.error)}</small></div>
      ${c.ok ? `<span class="exp-days">noch ${c.days} Tage</span>` + bar(c.days) : ""}${e.domains.includes(c.host) ? `<button class="icon-btn sm" data-exp-undomain="${esc(c.host)}" title="Entfernen">${icon("x")}</button>` : ""}</div>`).join("")}
    ${e.items.map((it) => `<div class="exp"><span class="sdot ${col(it.days)}"></span><div class="srv-meta"><b>${esc(it.name)}</b><small>${new Date(it.date).toLocaleDateString("de-CH")}${it.note ? " · " + esc(it.note) : ""}</small></div>
      <span class="exp-days">${it.days < 0 ? "abgelaufen" : "noch " + it.days + " Tage"}</span>${bar(it.days)}<button class="icon-btn sm" data-exp-del="${it.id}" title="Entfernen">${icon("x")}</button></div>`).join("")}</div>
    <form class="it-form" data-expform style="margin-top:12px"><input name="name" placeholder="Was läuft ab? (Lizenz, Token, Domain …)" required aria-label="Name"><input name="date" type="date" required aria-label="Datum" style="max-width:160px"><input name="note" placeholder="Notiz" aria-label="Notiz" style="max-width:180px"><button class="btn">${icon("plus")}Hinzufügen</button></form>
    <form class="it-form" data-domform style="margin-top:8px"><input name="domain" placeholder="Weitere Domain fürs Zertifikat, z.B. example.com" aria-label="Domain"><button class="btn btn-ghost">${icon("lock")}Zertifikat überwachen</button></form>
    <div class="dc-note" style="margin-top:8px">Tipp: Unter Automationen gibt es die Vorlage «Zertifikat/Lizenz läuft ab → Meldung».</div>`;
}

// ------------------------------------------------------------ Ereignisse
document.addEventListener("submit", async (e) => {
  const f = e.target;
  if (f.dataset.itform !== undefined && f.dataset.itform) { e.preventDefault(); runItForm(f); return; }
  if (f.hasAttribute("data-expform")) { e.preventDefault(); const r = await itPost("expiry-save", Object.fromEntries(new FormData(f))); r.error ? toast(r.error, true) : loadExpiry(); return; }
  if (f.hasAttribute("data-domform")) { e.preventDefault(); try { await itPost("expiry-save", Object.fromEntries(new FormData(f))); toast("Wird geprüft…"); loadExpiry(true); } catch (err) { toast(err.message, true); } }
});
document.addEventListener("click", async (e) => {
  const t = e.target;
  const pre = t.closest("[data-ports]");
  if (pre) { const f = pre.closest(".panel").querySelector("form"); f.p.value = pre.dataset.ports; runItForm(f); return; }
  const a = t.closest("[data-it]")?.dataset.it;
  const btn = t.closest("[data-it]");
  try {
    if (a === "net-refresh") return loadNet();
    if (a === "scan" || a === "scan-confirm") {
      if (a === "scan-confirm" && !$("#scanOk")?.checked) return toast("Bitte zuerst bestätigen, dass es dein eigenes Netz ist", true);
      busy(btn, true, "Scanne (ca. 15 s)…");
      IT.scan = await itPost("scan", { confirm: a === "scan-confirm" });
      return drawScan(IT.scan);
    }
    if (a === "scan-forget") { await itPost("scan-forget"); toast("Bestätigte Netze vergessen"); IT.scan = null; return render(true); }
    if (a === "rep-docx" || a === "rep-obsidian") {
      busy(btn, true, "Speichere…");
      const r = await itPost(a === "rep-docx" ? "report-docx" : "report-obsidian", { w: IT.week });
      busy(btn, false);
      if (r.path) { toast("Word-Datei gespeichert, wird geöffnet"); itPost("open-export", { path: r.path }); }
      if (r.rel) { toast("In Obsidian gespeichert: " + r.rel); location.href = r.uri; }
      return;
    }
    if (a === "rep-copy") { await navigator.clipboard.writeText(reportText(IT.report)); return toast("Rapport kopiert"); }
    if (a === "inv-fresh") { $("#invBox").innerHTML = `<div class="loading" style="height:160px">Erfasse das System…</div>`; return loadInventory(true); }
    if (a === "inv-docx") { busy(btn, true, "Erstelle…"); const r = await itPost("inventory-docx"); busy(btn, false); toast("Systemdoku gespeichert, wird geöffnet"); return itPost("open-export", { path: r.path }); }
  } catch (err) { busy(btn, false); toast(err.message, true); return; }
  const wk = t.closest("[data-week]");
  if (wk) { $("#repBox").innerHTML = `<div class="loading" style="height:160px">Lade…</div>`; return loadReport(wk.dataset.week); }
  const take = t.closest("[data-rep-take]");
  if (take) { const ta = $(`[data-rep-date="${take.dataset.repTake}"]`); ta.value = ta.placeholder; ta.dispatchEvent(new Event("input", { bubbles: true })); take.remove(); return; }
  const he = t.closest("[data-host-edit]");
  if (he) { const h = IT.hosts?.hosts.find((x) => x.id === he.dataset.hostEdit); return hostEditor(h || {}); }
  const ha = t.closest("[data-host-add]");
  if (ha) return hostEditor({ name: ha.dataset.hostName, host: ha.dataset.hostAdd, kind: "ssh" });
  const hd = t.closest("[data-host-del]");
  if (hd) { if (!confirm("Server aus der Liste entfernen?")) return; await itPost("host-delete", { id: hd.dataset.hostDel }); closeModal(); return loadHosts(); }
  const ho = t.closest("[data-host-open]");
  if (ho) { const r = await itPost("host-open", { id: ho.dataset.hostOpen, how: ho.dataset.how }); return r.error ? toast(r.error, true) : toast("Wird geöffnet…"); }
  const ch = t.closest("[data-copy-host]");
  if (ch) { await navigator.clipboard.writeText(ch.dataset.copyHost); return toast("Kopiert"); }
  const wl = t.closest("[data-wol]");
  if (wl) { const r = await itPost("wol", { mac: wl.dataset.wol }); return toast(r.error || "Magic Packet gesendet", !!r.error); }
  const ed = t.closest("[data-exp-del]");
  if (ed) { await itPost("expiry-save", { delete: ed.dataset.expDel }); return loadExpiry(); }
  const ud = t.closest("[data-exp-undomain]");
  if (ud) { await itPost("expiry-save", { removeDomain: ud.dataset.expUndomain }); return loadExpiry(true); }
});
document.addEventListener("input", (e) => {
  if (e.target.id === "invQ") { IT.invQ = e.target.value; drawSoftware(); return; }
  const d = e.target.dataset?.repDate;
  if (!d) return;
  clearTimeout(repT);
  repT = setTimeout(async () => {
    await itPost("report-note", { date: d, text: e.target.value });
    const day = IT.report?.days.find((x) => x.date === d);
    if (day) day.note = e.target.value;
  }, 600);
});

// ------------------------------------------------------------ Verdrahtung
Object.assign(EXTRA_VIEWS, { net: viewNet, hosts: viewHosts, report: viewReport, inventory: viewInventory });
const _afterRenderIT = afterRender;
afterRender = function (a, b, r) {  // eslint-disable-line no-func-assign
  _afterRenderIT(a, b, r);
  const err = (e) => toast(e.message, true);
  clearInterval(IT.timer);
  if (a === "net") { loadNet().catch(err); if (IT.scan) drawScan(IT.scan); for (const [sel, html] of Object.entries(IT.out)) if ($(sel)) $(sel).innerHTML = html; }
  if (a === "hosts") { loadHosts().catch(err); IT.timer = setInterval(() => document.hidden || loadHosts().catch(() => {}), 30000); }
  if (a === "report") loadReport(r.q.get("w") || IT.week).catch(err);
  if (a === "inventory") loadInventory().catch(err);
  if (a === "monitor") setTimeout(() => loadExpiry().catch(err), 50);
};
