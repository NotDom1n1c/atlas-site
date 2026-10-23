/* ATLAS · Demo-Backend im Browser: beantwortet alle /api-Anfragen der echten Oberfläche mit Beispieldaten.
   Wird von make_demo.py in atlas-site/demo kopiert. Schreibende Aktionen sind in der Demo gesperrt. */
"use strict";
(() => {
  // ?shot=1: für Screenshots ohne laufende Animationen (Titel-Effekt würde sonst mitten im Entschlüsseln fotografiert)
  if (/[?&]shot=1/.test(location.search)) try { localStorage.setItem("atlas.look", JSON.stringify({ motion: "aus" })); } catch { /* egal */ }
  const realFetch = window.fetch.bind(window);
  const DB = realFetch("demo-data.json").then((r) => r.json());
  // erst antworten, wenn alle Skripte der Oberfläche geladen sind (der echte Server ist nie so schnell)
  const READY = new Promise((ok) => (document.readyState === "loading" ? addEventListener("DOMContentLoaded", ok) : ok()));
  const now = () => Date.now() / 1000;
  const NO = "In der Demo nicht verfügbar. Mit ATLAS auf deinem Laptop funktioniert das.";
  const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });
  const rnd = (a, b) => a + Math.random() * (b - a);
  const iso = (minAgo) => new Date(Date.now() - minAgo * 60000).toISOString();

  // ---------------------------------------------------------- lebendige Systemwerte
  let cpu = 9, ram = 18.4, net = 40;
  function system(full) {
    cpu = Math.max(2, Math.min(64, cpu + rnd(-6, 6)));
    ram = Math.max(16.5, Math.min(21, ram + rnd(-0.25, 0.25)));
    net = Math.max(2, net + rnd(-25, 25));
    const total = 33930000000, used = ram * 1073741824;
    const s = { cpu: Math.round(cpu), ram: { total, used, pct: Math.round((used / total) * 1000) / 10 }, swap: { total: 34359738368, used: 2.4e8, pct: 0.7 },
      net: { up: net * 400, down: net * 3100 }, disks: [{ mount: "C:\\", fs: "NTFS", total: 1021821579264, used: 703255000576, free: 318566578688, pct: 68.8 }],
      battery: { pct: 84, plugged: false, left: 15400 } };
    if (!full) return s;
    return { ...s, cpuName: "Intel Core Ultra 7 155H", cores: 16, threads: 22, freq: 2000, boot: now() - 26 * 3600, os: "Windows 11 (Build 10.0.26200)",
      host: "ALEX-LAPTOP", perCore: Array.from({ length: 22 }, () => Math.round(Math.max(0, cpu + rnd(-12, 18)))), procCount: 287,
      procs: [["Code.exe", 2.1e9, 14], ["brave.exe", 1.8e9, 22], ["pythonw.exe", 3.1e8, 2], ["explorer.exe", 2.6e8, 1], ["node.exe", 2.2e8, 3], ["Obsidian.exe", 1.9e8, 6], ["Discord.exe", 1.7e8, 7], ["Spotify.exe", 1.5e8, 5]]
        .map(([name, rss, count]) => ({ name, rss, count })) };
  }

  // ---------------------------------------------------------- Musik
  const media = { title: "Nachtfahrt", artist: "Demo-Playlist", album: "ATLAS Sessions", status: "Playing", pos: 41, dur: 214, source: "Spotify", cover: "cover.jpg" };
  let mediaT = Date.now();
  const mediaNow = () => {
    if (media.status === "Playing") media.pos = (media.pos + (Date.now() - mediaT) / 1000) % media.dur;
    mediaT = Date.now();
    return { ...media };
  };

  // ---------------------------------------------------------- erfundene Inhalte (Mails, Discord, Bewerbungen, Notizen)
  const MAILS = [
    ["GitHub", "[alex/harbor] Run succeeded: ci", "Alle Jobs im Workflow e2e wurden erfolgreich abgeschlossen.", 18, false],
    ["Berufsschule", "Stundenplan Woche 44", "Anbei der Stundenplan für die kommende Woche. Modul 346 findet im Zimmer 2.14 statt.", 95, true],
    ["Praxisbetrieb", "Rückmeldung zum Wochenrapport", "Danke für den Rapport, sauber dokumentiert. Bitte nächste Woche auch die Ticketnummern ergänzen.", 260, false],
    ["Roblox", "Your experience reached 18,000 visits", "Congratulations! Tower Tycoon just reached a new milestone.", 600, false],
    ["Microsoft 365", "Neue Anmeldung bei deinem Konto", "Wir haben eine Anmeldung von Windows · Edge festgestellt.", 1400, false],
    ["Kollege aus der Klasse", "Gruppenarbeit SLA", "Kannst du die Folien zur Verfügbarkeit bis Freitag übernehmen?", 2900, true],
  ];
  const mailItems = MAILS.map(([from, subject, preview, ago, unread], i) => ({ att: i === 1 ? 1 : 0, id: "demo" + i, subject, important: i === 5, unread, from, date: iso(ago), preview }));
  const DISCORD_MSGS = [["Max", "Hat jemand das neue Update von Tower Tycoon getestet?", 12], ["ATLAS", "🟢 Alle 10 Live-Seiten sind online.", 30],
    ["Lena", "Die neue Etage ist richtig gut geworden", 44], ["Alex", "Morgen kommt noch ein Balancing-Patch.", 70], ["ATLAS", "Pipeline tasklane · ci ist wieder grün.", 140]];
  const guild = { id: "g1", name: "ATLAS Demo", icon: null, banner: null, description: "Beispielserver", members: 24, online: 7, boost: 0, boosts: 0, roles: 6, emojis: 3, owner: "o",
    channels: [["c1", "willkommen", "Allgemein"], ["c2", "updates", "Allgemein"], ["c3", "tower-tycoon", "Spiele"], ["c4", "atlas-meldungen", "Bots"]]
      .map(([id, name, category], pos) => ({ id, name, type: "text", category, pos, catpos: 0, topic: null })) };
  const APPLY_FIRMS = [["Beispiel Informatik AG", "Praktikum Plattformentwicklung", "Basel", "offen", "gesendet", 12],
    ["Muster Systems GmbH", "Praktikum System Engineering", "Zürich", "Antwort", "antwort", 6], ["Alpen Cloud AG", "Praktikum DevOps", "Bern", "Gespräch", "gespraech", 3],
    ["Rhein Data AG", "Praktikum IT-Betrieb", "Olten", "Vorbereitet", "vorbereitet", 0]];
  const apply = { apps: APPLY_FIRMS.map(([firm, role, place, status, stage, days], i) => ({ row: i + 2, firm, role, place, way: "E-Mail", sent: days ? iso(days * 1440).slice(0, 10) : "",
      status, stage, followup: "", note: "", days, due: i === 0, tokens: [], dossier: "",
      mails: i === 1 || i === 2 ? [{ id: "demo" + (i + 10), subject: i === 1 ? "Ihre Bewerbung: Einladung zum Kennenlernen" : "Terminbestätigung Gespräch", from: firm, date: iso(days * 600), unread: i === 1, preview: "Vielen Dank für Ihre Bewerbung…" }] : [],
      newReply: i === 1 })),
    statuses: ["Vorbereitet", "Gesendet", "Antwort", "Gespräch", "Absage", "Zusage"], stages: ["vorbereitet", "gesendet", "antwort", "gespraech", "absage", "zusage"],
    file: "Bewerbungen_Tracker.xlsx", modified: now() - 7200, mailOk: true, mailBlocked: false,
    stats: { total: 4, sent: 3, open: 2, replied: 2, rate: 67, interviews: 1, rejections: 0, due: 1, newReplies: 1, prepared: 1, avgReplyDays: 4.2, weeks: { "2026-W41": 1, "2026-W42": 2, "2026-W43": 1 } } };
  const NOTES = [["Ideen für ATLAS", "Netzwerk-Scan nur im eigenen Netz. Arbeitsrapport als Word. Eigenes Logo.", 1], ["Modul 346 · Cloud", "IaaS, PaaS, SaaS. Abgrenzung und Beispiele für die Gruppenarbeit.", 30],
    ["HARBOR Notizen", "k3s-Cluster, Argo CD Sync, Portal auf Port 4300.", 52], ["Lernjournal KW 43", "Diese Woche: Subnetting geübt, Traceroute verstanden.", 3]]
    .map(([title, text, h], i) => ({ path: "", rel: `Demo/${title}.md`, title, mtime: now() - h * 3600, size: text.length, tags: ["demo"], links: [], preview: text, uri: "#", text }));

  // ---------------------------------------------------------- Dateien im Explorer
  const readme = (p) => `# ${p.name}\n\n${p.desc || ""}\n\n## Technik\n\n${(p.tech || []).map((t) => `- ${t}`).join("\n") || "- (keine Angaben)"}\n\n> Das ist die ATLAS-Demo mit Beispieldaten. In der echten App siehst du hier die richtigen Dateien deines Projekts.\n`;
  const files = (p) => [{ name: "README.md", text: readme(p) }, { name: "start.ps1", text: `# ${p.name} lokal starten\n$ErrorActionPreference = "Stop"\nWrite-Host "Starte ${p.name}…"\nnpx http-server . -p 8080 -c-1\n` }];

  // ---------------------------------------------------------- Netzwerk-Simulation
  const simPing = (h, n) => { const base = /^(127\.|localhost)/.test(h) ? 0 : /^192\.168\./.test(h) ? 2 : rnd(5, 28); const times = Array.from({ length: n }, () => Math.round(base + rnd(0, 6)));
    return { host: h, ip: /^\d/.test(h) ? h : "185.199.108.153", sent: n, times, lost: 0, avg: Math.round(times.reduce((a, b) => a + b, 0) / n), min: Math.min(...times), max: Math.max(...times), error: null }; };
  const simTrace = (h) => ({ host: h, hops: ["192.168.1.1", "10.12.0.1", "62.2.24.1", "213.144.129.9", null, "104.16.132.229"].map((ip, i) => ({ n: i + 1, ms: ip ? [1, 2, 3].map(() => Math.round(2 + i * 3 + rnd(0, 4))) : [], ip, timeout: !ip })) });
  const SERV = { 22: "SSH", 80: "HTTP", 443: "HTTPS", 3306: "MySQL/MariaDB", 3389: "RDP", 445: "SMB", 135: "RPC", 5985: "WinRM", 8080: "HTTP-Alt", 8443: "HTTPS-Alt", 25: "SMTP", 587: "Submission", 993: "IMAPS", 6443: "Kubernetes API", 5432: "PostgreSQL", 1433: "MS SQL", 6379: "Redis", 27017: "MongoDB", 139: "NetBIOS" };
  const SETS = { web: [80, 443, 8080, 8443], windows: [135, 139, 445, 3389, 5985], datenbank: [1433, 3306, 5432, 6379, 27017], mail: [25, 587, 993], linux: [22, 80, 443, 6443] };
  const simPorts = (h, p) => { const list = SETS[p] || (p === "alle" ? Object.keys(SERV).map(Number) : (p.match(/\d+/g) || []).map(Number));
    const open = /^127\./.test(h) ? [3306, 4321, 135, 445] : [80, 443, 22];
    return { host: h, ports: list.map((port) => ({ port, open: open.includes(port), ms: open.includes(port) ? Math.round(rnd(1, 20)) : null, service: SERV[port] || "" })) }; };
  const simDns = (n, t) => { const rec = { A: ["185.199.108.153", "185.199.109.153"], AAAA: ["2606:50c0:8000::153"], MX: ["10 mail.example.ch"], TXT: ["v=spf1 include:_spf.example.ch ~all"], NS: ["ns1.example.ch", "ns2.example.ch"], CNAME: ["alex-dev.example"], SOA: ["ns1.example.ch"], PTR: ["host.example.ch"] }[t] || [];
    return { name: n, type: t, records: rec.map((value) => ({ name: n, type: t, ttl: 3600, value })), error: rec.length ? null : "Kein Eintrag gefunden" }; };
  const LAN = [["192.168.1.1", "router.local", "router"], ["192.168.1.20", "raspberrypi", ""], ["192.168.1.34", "drucker-wz", ""], ["192.168.1.42", "ALEX-LAPTOP", "me"], ["192.168.1.102", "handy", ""], ["192.168.1.120", "nas", ""]];
  let lanOk = false;
  const hosts = { hosts: [
    { id: "h1", name: "LAB-SRV01", host: "192.168.56.10", port: 3389, kind: "rdp", user: "administrator", note: "Windows Server 2022 in VirtualBox", ms: 1, up: true },
    { id: "h2", name: "raspberrypi", host: "192.168.1.20", port: 22, kind: "ssh", user: "pi", note: "Pi-hole + Backups", ms: 3, up: true },
    { id: "h3", name: "MariaDB (lokal)", host: "127.0.0.1", port: 3306, kind: "tcp", note: "HeidiSQL / Kommandozeile", ms: 0, up: true },
    { id: "h4", name: "NAS", host: "192.168.1.120", port: 443, kind: "web", note: "Weboberfläche", ms: null, up: false }] };

  // ---------------------------------------------------------- Router
  async function route(url, opt) {
    const db = await DB;
    await READY;
    const u = new URL(url, location.href), q = (k, d = "") => u.searchParams.get(k) ?? d, p = u.pathname.replace(/^.*\/api\//, "/api/");
    const post = (opt?.method || "GET").toUpperCase() === "POST";
    const body = post && opt.body ? JSON.parse(opt.body) : {};
    const proj = (id) => db.data.catalog.projects.find((x) => x.id === id) || db.data.virtual.find((x) => x.id === id);
    if (post) {
      if (p === "/api/meta") { const x = proj(body.id); if (x && "fav" in body) x.fav = body.fav; return json({ ok: true }); }
      if (p === "/api/rescan") return json({ ok: true });
      if (p === "/api/c/media") { if (body.action === "toggle") media.status = media.status === "Playing" ? "Paused" : "Playing"; else media.pos = 0; return json(mediaNow()); }
      if (p === "/api/it/scan") { if (!lanOk && !body.confirm) return json({ needConfirm: true, ssid: "Zuhause", gateway: "192.168.1.1", warn: false }); lanOk = true;
        return json({ network: "192.168.1.0/24", adapter: "WLAN", ssid: "Zuhause", time: now(), hosts: LAN.map(([ip, name, tag]) => ({ ip, name, mac: "AC:DE:48:" + ip.split(".")[3].padStart(2, "0") + ":4F:11", ms: tag === "me" ? 0 : Math.round(rnd(1, 9)), me: tag === "me", gateway: tag === "router" })) }); }
      if (p === "/api/it/scan-forget") { lanOk = false; return json({ ok: true }); }
      if (p === "/api/it/report-note") return json({ ok: true });
      if (p === "/api/it/wol") return json({ ok: true });
      return json({ error: NO }, 400);
    }
    switch (p) {
      case "/api/ping": return json({ app: "atlas", scanning: false, phase: "", scannedAt: db.data.scannedAt });
      case "/api/data": return json(db.data);
      case "/api/system": return json(system(q("full") === "1"));
      case "/api/github": return json(db.github);
      case "/api/slides": return json({ pages: [] });
      case "/api/search": {
        const t = q("q").toLowerCase();
        const res = db.data.catalog.projects.flatMap((x) => files(x).map((f) => ({ p: x.id, path: `${db.data.resolved[x.id].paths[0]}\\${f.name}`, size: f.text.length, mtime: db.data.scan[x.id]?.last || 0 })))
          .filter((r) => r.path.toLowerCase().includes(t)).slice(0, 40);
        return json({ results: res, total: res.length });
      }
      case "/api/grep": return json({ results: [], files: 0 });
      case "/api/ls": {
        const x = proj(q("p")); if (!x) return json({ error: "nicht gefunden" }, 404);
        const root = db.data.resolved[x.id]?.paths[0] || "C:\\Users\\demo";
        if (!q("path")) return json({ root: true, items: [{ name: x.name, path: root, dir: true, exists: true, full: root }] });
        return json({ items: files(x).map((f) => ({ name: f.name, path: `${root}\\${f.name}`, dir: false, size: f.text.length, mtime: db.data.scan[x.id]?.last || now(), cloud: false, skip: false })) });
      }
      case "/api/file": {
        const x = proj(q("p")), name = q("path").split("\\").pop(), f = x && files(x).find((y) => y.name === name);
        if (!f) return json({ error: "nicht gefunden" }, 404);
        return json({ path: q("path"), size: f.text.length, mtime: now(), ext: name.slice(name.lastIndexOf(".")), cloud: false, kind: "text", content: f.text, truncated: false, lang: name.endsWith(".md") ? "Markdown" : "PowerShell" });
      }
      case "/api/mail": return json({ ok: true, items: mailItems, unread: mailItems.filter((m) => m.unread).length, folder: q("folder", "inbox"), total: mailItems.length });
      case "/api/mail/item": { const m = mailItems.find((x) => x.id === q("id")) || mailItems[0]; return json({ ok: true, ...m, to: "alex@example.ch", cc: "", body: `${m.preview}\n\nFreundliche Grüsse\n${m.from}`, attachments: m.att ? ["Stundenplan.pdf"] : [] }); }
      case "/api/discord": return json({ configured: true, bot: { id: "b", name: "ATLAS", avatar: null }, invite: "#", envAvailable: false, guilds: [guild] });
      case "/api/discord/messages": return json({ messages: DISCORD_MSGS.map(([author, content, ago], i) => ({ id: "m" + i, author, avatar: null, bot: author === "ATLAS", content, date: iso(ago), attachments: [], embeds: 0 })) });
    }
    if (p.startsWith("/api/c/")) {
      const n = p.slice(7);
      const simple = { servers: db.servers, vms: db.vms, apps: db.apps, sites: db.sites, ci: db.ci, roblox: db.roblox, automations: db.automations, look: db.look,
        recycle: { items: 12, bytes: 342000000 }, spotify: { configured: false, connected: false, product: null, user: null, redirect: "" }, "mail-guard": { blocked: false, minutes: 0, trusted: true },
        apply, "project-notes": { notes: [] }, pages: { pages: [] }, "server-log": { log: "Starting up http-server, serving .\nAvailable on:\n  http://127.0.0.1:8080\nHit CTRL-C to stop the server\n" } };
      if (n in simple) return json(simple[n]);
      if (n === "media") return json(mediaNow());
      if (n === "notes") { const t = q("q").toLowerCase(); return json({ vault: "Obsidian Vault", notes: NOTES.filter((x) => !t || (x.title + x.text).toLowerCase().includes(t)).map(({ text, ...r }) => r) }); }
      if (n === "note") { const x = NOTES.find((y) => y.rel === q("rel")) || NOTES[0]; return json({ rel: x.rel, title: x.title, text: `# ${x.title}\n\n${x.text}\n`, uri: "#", base: "" }); }
      if (n === "discord-feed") return json({ configured: true, items: DISCORD_MSGS.map(([author, content, ago]) => ({ guild: "ATLAS Demo", channel: "updates", channelId: "c2", author, avatar: null, content, date: iso(ago) })) });
      if (n === "storage") return json({ running: false, progress: "", result: { done: now() - 86400, dupBytes: 1.4e9,
        folders: [["AppData", 9.1e10], ["Projekte", 3.2e10], ["VirtualBox VMs", 3.4e10], ["Downloads", 1.2e10], ["Videos", 6.5e9]].map(([name, bytes]) => ({ path: "C:\\Users\\demo\\" + name, name, bytes, files: Math.round(bytes / 2e5) })),
        big: [["Windows_Server_2022.iso", 5.3e9], ["LAB-SRV01.vdi", 2.9e10], ["Projektvideo_roh.mp4", 2.1e9]].map(([n2, b]) => ({ path: "C:\\Users\\demo\\Downloads\\" + n2, name: n2, bytes: b, mtime: now() - 4e6 })),
        dups: [] } });
      return json({ error: "unbekannt" }, 404);
    }
    if (p.startsWith("/api/it/")) {
      const n = p.slice(8);
      if (n === "net") return json(db.net);
      if (n === "hosts") return json(hosts);
      if (n === "expiry") return json(db.expiry);
      if (n === "inventory") return json(db.inventory);
      if (n === "report") return json(db.report);
      if (n === "ping") return json(simPing(q("h"), +q("n", "4")));
      if (n === "trace") { await new Promise((r) => setTimeout(r, 1400)); return json(simTrace(q("h"))); }
      if (n === "ports") return json(simPorts(q("h"), q("p", "web")));
      if (n === "dns") return json(simDns(q("n"), q("t", "A")));
    }
    return json({ error: "In der Demo nicht vorhanden" }, 404);
  }

  window.fetch = (input, opt) => {
    const url = typeof input === "string" ? input : input.url;
    if (/\/api\/|^api\//.test(url) && !/demo-data\.json/.test(url)) return route(url, opt);
    return realFetch(input, opt);
  };
})();
