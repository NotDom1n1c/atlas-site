/* ATLAS - Automationen («Wenn … dann …»), Spotify-Verbindung, Cover-Anzeige */
"use strict";

const AU = { data: null, channels: null, servers: null, apps: null, spotify: null };

// ------------------------------------------------------------ Hilfen
const trigLabel = (t) => AU.data?.triggers[t.type]?.label || t.type;
const actLabel = (a) => AU.data?.actions[a.type]?.label || a.type;
function trigSummary(t) {
  const p = t.params || {};
  if (t.type === "schedule") return `Zeitplan: ${esc(p.time || "")} Uhr, ${esc((p.days || "").split(",").length === 7 ? "jeden Tag" : p.days)}`;
  const def = AU.data?.triggers[t.type];
  const extra = (def?.params || []).map((x) => p[x.key] !== undefined && p[x.key] !== "" ? `${x.label} ${esc(p[x.key])}` : "").filter(Boolean).join(", ");
  return esc(trigLabel(t)) + (extra ? ` <span class="au-p">(${extra})</span>` : "");
}
async function auLoadRefs() {
  const jobs = [];
  if (!AU.servers) jobs.push(cc("servers").then((r) => (AU.servers = r.servers.map((s) => s.name))).catch(() => (AU.servers = [])));
  if (!AU.apps) jobs.push(cc("apps").then((r) => (AU.apps = r.apps.map((a) => a.name))).catch(() => (AU.apps = [])));
  if (!AU.channels) jobs.push(api("/api/discord").then((d) => {
    AU.channels = (d.guilds || []).flatMap((g) => (g.channels || []).filter((c) => ["text", "news"].includes(c.type)).map((c) => ({ id: c.id, name: `${g.name} · #${c.name}` })));
  }).catch(() => (AU.channels = [])));
  await Promise.all(jobs);
}

// ------------------------------------------------------------ Seite
const viewAutomations = () => `<div class="page">${pageHead("spark", "Automationen", "Wenn etwas passiert, erledigt ATLAS es für dich: Meldungen, Discord-Nachrichten, Server, Aufräumen. Läuft im Hintergrund, solange eine Regel aktiv ist.", "#f2b84b",
  `<label class="au-switch" title="ATLAS beim Windows-Start unsichtbar im Hintergrund starten, damit Automationen immer laufen"><input type="checkbox" id="auStartup"><span></span>Mit Windows starten</label>
   <button class="btn btn-accent" data-au-new>${icon("plus")}Neue Regel</button>`)}
  <div id="auBody"><div class="loading">Lade…</div></div></div>`;
async function loadAutomations() {
  AU.data = await cc("automations");
  CC.auto = AU.data;
  const d = AU.data;
  const box = $("#auBody");
  if (!box) return;
  $("#auStartup").checked = d.startup;
  const on = d.rules.filter((r) => r.enabled).length;
  box.innerHTML = `<div class="au-status ${on ? "on" : ""}"><span class="sdot ${on ? "on" : ""}"></span>
      ${on ? `<b>${on} ${on === 1 ? "Regel aktiv" : "Regeln aktiv"}</b> · ATLAS prüft jede Minute${d.startup ? " und startet mit Windows" : ". Tipp: «Mit Windows starten» einschalten, sonst laufen die Regeln nur, solange ATLAS offen ist"}.`
        : "<b>Keine Regel aktiv.</b> Nimm eine Vorlage oder bau eine eigene Regel."}</div>
    <div class="panel-title" style="margin-top:22px">${icon("list")}Deine Regeln</div>
    ${d.rules.length ? `<div class="au-rules">${d.rules.map((r) => `<div class="au-rule ${r.enabled ? "" : "off"}">
        <label class="au-switch"><input type="checkbox" data-au-toggle="${esc(r.id)}" ${r.enabled ? "checked" : ""}><span></span></label>
        <div class="au-flow"><b>${esc(r.name)}</b>
          <div class="au-line"><span class="au-k">Wenn</span>${icon(d.triggers[r.trigger.type]?.icon || "spark")}${trigSummary(r.trigger)}</div>
          <div class="au-line"><span class="au-k">dann</span>${r.actions.map((a) => `<span class="au-act">${icon(d.actions[a.type]?.icon || "spark")}${esc(actLabel(a))}</span>`).join(`<span class="au-then">${icon("chev")}</span>`)}</div>
          <small>${r.lastRun ? `zuletzt ausgelöst ${ago(r.lastRun)}` : "noch nie ausgelöst"}</small></div>
        <div class="srv-act"><button class="btn sm" data-au-test="${esc(r.id)}" title="Aktionen jetzt einmal ausführen">${icon("play")}Test</button>
          <button class="icon-btn sm" data-au-edit="${esc(r.id)}" title="Bearbeiten">${icon("edit")}</button>
          <button class="icon-btn sm btn-danger" data-au-del="${esc(r.id)}" title="Löschen">${icon("trash")}</button></div></div>`).join("")}</div>`
      : `<div class="empty">Noch keine Regeln.</div>`}
    <div class="panel-title" style="margin-top:26px">${icon("spark")}Vorlagen<span class="act-sum">ein Klick, dann anpassen</span></div>
    <div class="au-templates">${d.templates.map((t, i) => `<button class="au-tpl" data-au-tpl="${i}">${icon(d.triggers[t.trigger.type]?.icon || "spark")}<b>${esc(t.name)}</b>
      <small>${esc(trigLabel(t.trigger))} → ${t.actions.map((a) => esc(actLabel(a))).join(", ")}</small></button>`).join("")}</div>
    <div class="panel" style="margin-top:26px"><div class="panel-title">${icon("clock")}Verlauf<span class="act-sum">${d.log.length} Einträge</span></div>
      ${d.log.length ? `<div class="rows">${d.log.map((l) => `<div class="au-log"><span class="sdot ${l.results.every((x) => x.ok) ? "on" : "bad"}"></span>
        <div class="meta"><b>${esc(l.rule || "")}${l.test ? ` <span class="tag">Test</span>` : ""}</b><small>${esc(l.event || "")} · ${l.results.map((x) => `${x.ok ? "" : "Fehler: "}${esc(x.msg)}`).join(" · ")}</small></div><span class="when">${ago(l.time)}</span></div>`).join("")}</div>`
        : `<div class="empty">Hier erscheint, was deine Regeln getan haben.</div>`}</div>`;
}

// ------------------------------------------------------------ Regel-Editor
function paramField(scope, i, p, val) {
  const name = `${scope}${i === null ? "" : "_" + i}_${p.key}`;
  const v = val ?? p.default ?? "";
  if (p.type === "days") {
    const sel = String(v).split(",");
    return `<div class="field"><label>${esc(p.label)}</label><div class="au-days">${["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((d) => `<label><input type="checkbox" name="${name}" value="${d}" ${sel.includes(d) ? "checked" : ""}><span>${d}</span></label>`).join("")}</div></div>`;
  }
  const opts = { channel: AU.channels?.map((c) => [c.id, c.name]), server: AU.servers?.map((s) => [s, s]), app: AU.apps?.map((a) => [a, a]) }[p.type];
  if (opts) {
    return `<div class="field"><label>${esc(p.label)}</label><select name="${name}">${opts.length ? opts.map(([k, l]) => `<option value="${esc(k)}" ${k === v ? "selected" : ""}>${esc(l)}</option>`).join("") : `<option value="">(keine verfügbar${p.type === "channel" ? ", Discord verbinden" : ""})</option>`}</select></div>`;
  }
  return `<div class="field"><label>${esc(p.label)}</label><input name="${name}" type="${p.type === "number" ? "number" : p.type === "time" ? "time" : "text"}" value="${esc(v)}"></div>`;
}
function editorHTML(rule) {
  const d = AU.data;
  const t = rule.trigger;
  const tdef = d.triggers[t.type];
  return `<h2>${rule.id ? "Regel bearbeiten" : "Neue Regel"}</h2>
  <form id="auForm" class="form">
    <div class="field full"><label>Name</label><input name="name" value="${esc(rule.name || "")}" placeholder="${esc(tdef.label)}"></div>
    <div class="au-block full"><div class="au-k big">Wenn</div>
      <div class="field"><label>Auslöser</label><select name="trigger" id="auTrig">${Object.entries(d.triggers).map(([k, x]) => `<option value="${k}" ${k === t.type ? "selected" : ""}>${esc(x.label)}</option>`).join("")}</select></div>
      ${tdef.params.map((p) => paramField("t", null, p, (t.params || {})[p.key])).join("")}
      ${tdef.vars ? `<small class="au-vars">Platzhalter für die Aktionen: ${esc(tdef.vars)}, {detail}, {trigger}</small>` : ""}</div>
    <div class="au-block full"><div class="au-k big">dann</div>
      ${rule.actions.map((a, i) => `<div class="au-action"><div class="au-action-head">${icon(d.actions[a.type]?.icon || "spark")}<select name="a_${i}_type" data-au-atype="${i}">${Object.entries(d.actions).map(([k, x]) => `<option value="${k}" ${k === a.type ? "selected" : ""}>${esc(x.label)}</option>`).join("")}</select>
        <button type="button" class="icon-btn sm" data-au-arm="${i}" title="Aktion entfernen">${icon("x")}</button></div>
        <div class="form">${d.actions[a.type].params.map((p) => paramField("a", i, p, (a.params || {})[p.key])).join("")}</div></div>`).join("")}
      <button type="button" class="btn sm" data-au-aadd>${icon("plus")}Aktion hinzufügen</button></div>
    <div class="modal-foot" style="grid-column:1/-1"><button type="button" class="btn btn-ghost" data-close>Abbrechen</button><button class="btn btn-accent">${icon("check")}Speichern</button></div>
  </form>`;
}
function readEditor(rule) {
  const f = $("#auForm");
  const fd = new FormData(f);
  const d = AU.data;
  const tType = fd.get("trigger");
  const tp = {};
  d.triggers[tType].params.forEach((p) => { tp[p.key] = p.type === "days" ? fd.getAll(`t_${p.key}`).join(",") : fd.get(`t_${p.key}`) ?? p.default; });
  const actions = rule.actions.map((a, i) => {
    const type = fd.get(`a_${i}_type`) || a.type;
    const params = {};
    d.actions[type].params.forEach((p) => { params[p.key] = fd.get(`a_${i}_${p.key}`) ?? p.default; });
    return { type, params };
  });
  return { ...rule, name: fd.get("name").trim(), trigger: { type: tType, params: tp }, actions };
}
async function openEditor(rule) {
  modal(`<h2>${rule.id ? "Regel bearbeiten" : "Neue Regel"}</h2><div class="loading" style="height:120px">Lade Discord-Kanäle, Server und Apps…</div>`);
  await auLoadRefs();
  if ($("#modal").hidden) return;
  let cur = JSON.parse(JSON.stringify(rule));
  const draw = () => {
    $("#modalBox").innerHTML = editorHTML(cur);
    $("#auForm").onsubmit = async (e) => {
      e.preventDefault();
      cur = readEditor(cur);
      const r = await ccPost("auto-save", { rule: cur });
      if (r.error) return toast(r.error, true);
      closeModal(); toast("Regel gespeichert"); loadAutomations();
    };
    $("#auTrig").onchange = () => { cur = readEditor(cur); cur.trigger = { type: $("#auTrig").value, params: {} }; draw(); };
    $$("[data-au-atype]").forEach((s) => (s.onchange = () => { cur = readEditor(cur); cur.actions[+s.dataset.auAtype] = { type: s.value, params: {} }; draw(); }));
    $$("[data-au-arm]").forEach((b) => (b.onclick = () => { cur = readEditor(cur); cur.actions.splice(+b.dataset.auArm, 1); draw(); }));
    $("[data-au-aadd]").onclick = () => { cur = readEditor(cur); cur.actions.push({ type: "notify", params: {} }); draw(); };
  };
  draw();
}

// ------------------------------------------------------------ Spotify verbinden (Steuerung)
async function spotifyBox() {
  const box = $("#spotifyBox");
  if (!box) return;
  const s = AU.spotify = await cc("spotify");
  if (s.connected) {
    box.innerHTML = `<div class="sp-ok">${icon("music")}<span>Spotify verbunden${s.user ? ` als <b>${esc(s.user)}</b>` : ""}${s.product ? ` · ${s.product === "premium" ? "Premium (steuerbar)" : "Free: nur anzeigen, Steuern braucht Premium"}` : ""}</span><button class="btn sm btn-ghost" data-sp-off>Trennen</button></div>`;
    return;
  }
  box.innerHTML = `<details class="sp-setup" ${s.configured ? "open" : ""}><summary>${icon("music")}<b>Spotify verbinden</b> <span>zeigt den Song auf jedem Gerät (auch Game-Bar-Widget und Handy)</span></summary>
    <ol class="dc-steps">
      <li><a href="https://developer.spotify.com/dashboard" target="_blank" rel="noopener">developer.spotify.com/dashboard</a> öffnen → <b>Create app</b> (Name z.B. «ATLAS»).</li>
      <li>Bei <b>Redirect URI</b> genau das eintragen: <code class="sp-uri">${esc(s.redirect)}</code> <button type="button" class="icon-btn sm" data-sp-copy title="Kopieren">${icon("copy")}</button></li>
      <li>Bei «Which API/SDKs» <b>Web API</b> ankreuzen → Speichern → <b>Client ID</b> kopieren.</li>
      <li>Hier einfügen und verbinden, dann bei Spotify «Zustimmen».</li></ol>
    <form id="spForm" style="display:flex;gap:8px;margin-top:10px"><input class="select" name="cid" placeholder="Client ID (32 Zeichen)" style="flex:1;height:34px" autocomplete="off"><button class="btn btn-accent sm">${icon("check")}Verbinden</button></form></details>`;
}

// ------------------------------------------------------------ Cover: oben in der Leiste + grosse Anzeige
function nowChip(m) {
  let chip = $("#nowChip");
  if (!chip) {
    $("#sysPill")?.insertAdjacentHTML("beforebegin", `<a class="now-chip" id="nowChip" href="#/control" hidden></a>`);
    chip = $("#nowChip");
  }
  if (!chip) return;
  const playing = m && m.title && m.status === "Playing";
  chip.hidden = !playing;
  if (playing) {
    chip.title = `${m.title} · ${m.artist || ""}`;
    chip.innerHTML = `<span class="now-disc">${m.cover ? `<img src="${m.cover}" alt="">` : icon("music")}</span><span class="now-txt"><b>${esc(m.title)}</b><small>${esc(m.artist || "")}</small></span>`;
  }
}
// mediaTick aus control.js überall laufen lassen (für die Leiste) und Cover-Hintergrund setzen
mediaTick = async function () {  // eslint-disable-line no-func-assign
  if (document.hidden) return;
  try {
    CC.media = await cc("media");
    nowChip(CC.media);
    $$(".mp-slot").forEach((el) => {
      el.innerHTML = mediaHTML(CC.media, el.dataset.big === "1");
      const c = CC.media?.cover && CC.media.title ? CC.media.cover : "";
      el.closest(".cc-music, .panel")?.style.setProperty("--cover", c ? `url("${c}")` : "none");
      el.closest(".cc-music, .panel")?.classList.toggle("has-cover", !!c);
    });
  } catch { /* egal */ }
};
setTimeout(() => mediaTick(), 1500);

// ------------------------------------------------------------ Verdrahtung
EXTRA_VIEWS.automations = viewAutomations;
const _arAuto = afterRender;
afterRender = function (a, b, r) {  // eslint-disable-line no-func-assign
  _arAuto(a, b, r);
  if (a === "automations") loadAutomations().catch((e) => toast(e.message, true));
  if (a === "control") setTimeout(() => spotifyBox().catch(() => {}), 50);
};
document.addEventListener("click", async (e) => {
  const t = e.target;
  const q = (s) => t.closest(s);
  let el;
  try {
    if (q("[data-au-new]")) return openEditor({ name: "", enabled: true, trigger: { type: "site_down", params: {} }, actions: [{ type: "notify", params: {} }] });
    if ((el = q("[data-au-tpl]"))) { const tp = AU.data.templates[+el.dataset.auTpl]; return openEditor({ ...JSON.parse(JSON.stringify(tp)), enabled: true }); }
    if ((el = q("[data-au-edit]"))) return openEditor(AU.data.rules.find((r) => r.id === el.dataset.auEdit));
    if ((el = q("[data-au-del]"))) { if (!confirm("Regel löschen?")) return; await ccPost("auto-delete", { id: el.dataset.auDel }); return loadAutomations(); }
    if ((el = q("[data-au-test]"))) {
      el.disabled = true;
      const r = await ccPost("auto-test", { id: el.dataset.auTest });
      el.disabled = false;
      if (r.error) return toast(r.error, true);
      const bad = r.results.filter((x) => !x.ok);
      toast(bad.length ? `Fehler: ${bad[0].msg}` : `Test ok: ${r.results.map((x) => x.msg).join(", ")}`, !!bad.length);
      return loadAutomations();
    }
    if (q("[data-sp-off]")) { await ccPost("spotify-disconnect", {}); return spotifyBox(); }
    if (q("[data-sp-copy]")) { await navigator.clipboard.writeText(AU.spotify.redirect); return toast("Kopiert"); }
  } catch (x) { toast(x.message, true); }
});
document.addEventListener("change", async (e) => {
  const t = e.target;
  if (t.matches("[data-au-toggle]")) { await ccPost("auto-toggle", { id: t.dataset.auToggle, on: t.checked }); toast(t.checked ? "Regel aktiv (ab jetzt, Bisheriges zählt nicht)" : "Regel pausiert"); return loadAutomations(); }
  if (t.id === "auStartup") {
    const r = await ccPost("auto-startup", { on: t.checked });
    if (r.error) { t.checked = !t.checked; return toast(r.error, true); }
    toast(t.checked ? "ATLAS startet ab jetzt mit Windows im Hintergrund" : "Autostart aus");
    return loadAutomations();
  }
});
document.addEventListener("submit", async (e) => {
  if (e.target.id !== "spForm") return;
  e.preventDefault();
  const r = await ccPost("spotify-client", { client_id: e.target.cid.value });
  if (r.error) return toast(r.error, true);
  window.open(r.auth, "spotify", "width=520,height=760");
  toast("Bei Spotify anmelden und zustimmen…");
  const iv = setInterval(async () => {  // warten, bis die Anmeldung durch ist
    const s = await cc("spotify");
    if (s.connected) { clearInterval(iv); toast("Spotify verbunden"); spotifyBox(); mediaTick(); }
  }, 2500);
  setTimeout(() => clearInterval(iv), 180000);
});
