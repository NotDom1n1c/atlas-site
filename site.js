/* ATLAS · Website: Menü, skalierte Live-Demo, Inhaltsverzeichnis */
"use strict";

// Menü auf schmalen Bildschirmen
const header = document.querySelector(".top");
document.querySelector(".burger")?.addEventListener("click", (e) => {
  const open = header.classList.toggle("open");
  e.currentTarget.setAttribute("aria-expanded", open);
});

// Kopfzeile: Lineal zeigt den Scroll-Fortschritt, die Blatt-Anzeige den aktuellen Abschnitt
const fill = document.querySelector("#rulerFill");
const sheetNow = document.querySelector("#sheetNow");
const sheets = [...document.querySelectorAll("[data-sheet], .chapter h2, .prose h2, .release h2")];
let lastSheet = sheetNow?.textContent;
function onScroll() {
  const max = document.documentElement.scrollHeight - innerHeight;
  if (fill) fill.style.width = `${max > 0 ? (scrollY / max) * 100 : 0}%`;
  header?.classList.toggle("scrolled", scrollY > 40);
  if (!sheetNow || !sheets.length) return;
  let cur = null;
  for (const el of sheets) if (el.getBoundingClientRect().top < innerHeight * 0.4) cur = el;
  const name = cur ? (cur.dataset.sheet || cur.textContent.trim()) : sheetNow.dataset.base || lastSheet;
  sheetNow.dataset.base ||= lastSheet;
  const label = name && name.length > 22 ? name.slice(0, 21) + "…" : name;
  if (label && label !== sheetNow.textContent) {
    sheetNow.textContent = label;
    sheetNow.classList.remove("flip"); void sheetNow.offsetWidth; sheetNow.classList.add("flip");
  }
}
addEventListener("scroll", onScroll, { passive: true });
onScroll();

// Live-Demo: die App ist für 1440 px gebaut, das iframe wird auf die Breite des Rahmens verkleinert
function fitStages() {
  document.querySelectorAll(".stage").forEach((stage) => {
    const f = stage.querySelector("iframe");
    if (f) f.style.transform = `scale(${stage.clientWidth / 1440})`;
  });
}
addEventListener("resize", fitStages);
fitStages();

// Startseite: Legende und Markierungen auf der Live-App verbinden
const marks = document.querySelector("#marks");
if (marks) {
  const frame = document.querySelector("#mapStage iframe");
  const items = [...document.querySelectorAll("[data-area]")];
  const show = (area) => items.forEach((el) => el.classList.toggle("on", el.dataset.area === area));
  items.forEach((el) => {
    el.addEventListener("mouseenter", () => show(el.dataset.area));
    el.addEventListener("mouseleave", () => show(null));
  });
  // Markierungen nur zeigen, solange die App auf der Übersicht und ganz oben ist
  setInterval(() => {
    try {
      const w = frame.contentWindow, main = w.document.querySelector("#main");
      const home = (w.location.hash || "#/") === "#/" && (!main || main.scrollTop < 20) && w.document.querySelector("#modal")?.hidden !== false;
      marks.classList.toggle("off", !home);
    } catch { /* noch nicht geladen */ }
  }, 400);
}

// Inhaltsverzeichnis markiert den sichtbaren Abschnitt
const tocLinks = [...document.querySelectorAll(".toc a")];
if (tocLinks.length) {
  const obs = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (en.isIntersecting) tocLinks.forEach((a) => a.classList.toggle("on", a.getAttribute("href") === "#" + en.target.id));
  }), { rootMargin: "-30% 0px -60% 0px" });
  tocLinks.forEach((a) => { const t = document.querySelector(a.getAttribute("href")); if (t) obs.observe(t); });
}

// Vollbild-Demo: Seiten der App direkt anspringen
const demo = document.querySelector("#demoFrame");
if (demo) {
  const buttons = [...document.querySelectorAll(".routes button")];
  const go = (route) => {
    demo.contentWindow.location.hash = route;
    buttons.forEach((b) => b.classList.toggle("on", b.dataset.route === route));
    history.replaceState(null, "", "#" + route.slice(1));
  };
  buttons.forEach((b) => b.addEventListener("click", () => go(b.dataset.route)));
  const start = location.hash ? "#" + location.hash.slice(1) : "#/";
  demo.src = "demo/" + start;
  buttons.forEach((b) => b.classList.toggle("on", b.dataset.route === start));
}
