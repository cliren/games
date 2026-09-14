/**
 * Corner Claim — 2–4 split hold-to-paint.
 * pointer events · rAF · landscape gate for 3–4 · no CDN
 */

import { initHowto } from "./howto.js";

const ROUND_MS = 10_000;
const COUNTDOWN_MS = 3_000;
const FILL_PER_SEC = 10; // one finger × 10s ≈ 100%

/** @type {{ id: number, label: string, color: string, ink: string }[]} */
let ZONE_DEFS = [
  { id: 0, label: "P1", color: "#EF4444", ink: "#7F1D1D" },
  { id: 1, label: "P2", color: "#3B82F6", ink: "#1E3A8A" },
  { id: 2, label: "P3", color: "#EAB308", ink: "#713F12" },
  { id: 3, label: "P4", color: "#22C55E", ink: "#14532D" },
];

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const screens = {
  home: $("#screen-home"),
  count: $("#screen-count"),
  arena: $("#screen-arena"),
  results: $("#screen-results"),
};

const els = {
  arena: $("#arena"),
  arenaHud: $("#arena-hud"),
  arenaPhase: $("#arena-phase"),
  arenaTimer: $("#arena-timer"),
  resultsList: $("#results-list"),
  resultsWinner: $("#results-winner"),
  landscapeGate: $("#landscape-gate"),
  countGo: $("#btn-count-go"),
  countHint: $("#count-hint"),
};

/** @type {"home"|"count"|"arena"|"results"} */
let screen = "home";
let playerCount = 0;
/** @type {number[]} */
let fills = [];
/** @type {Map<number, number>} pointerId → zoneIndex */
const activePointers = new Map();
/** @type {"idle"|"countdown"|"paint"|"done"} */
let phase = "idle";
let rafId = 0;
let phaseStartedAt = 0;
let lastFrameAt = 0;
/** @type {HTMLElement[]} */
let zoneEls = [];

const howto = initHowto({
  overlay: $("#howto-overlay"),
  sheet: $("#howto-sheet"),
  gotItBtn: $("#btn-howto-gotit"),
  closeBtn: $("#btn-howto-close"),
  openBtn: $("#btn-howto"),
});

async function loadData() {
  try {
    const res = await fetch("./js/data.json");
    if (!res.ok) return;
    const data = await res.json();
    if (Array.isArray(data.zones) && data.zones.length >= 4) {
      ZONE_DEFS = data.zones;
    }
  } catch {
    /* bundled defaults */
  }
}

function showScreen(name) {
  screen = name;
  Object.entries(screens).forEach(([key, el]) => {
    el.classList.toggle("active", key === name);
  });
  document.body.classList.toggle("arena-playing", name === "arena");
  updateLandscapeGate();
}

function isLandscape() {
  if (window.matchMedia("(orientation: landscape)").matches) return true;
  return window.innerWidth > window.innerHeight;
}

function needsLandscape() {
  return playerCount >= 3 && (screen === "arena" || phase === "countdown" || phase === "paint");
}

function updateLandscapeGate() {
  const show = needsLandscape() && !isLandscape();
  els.landscapeGate.hidden = !show;
  if (show && (phase === "paint" || phase === "countdown")) {
    /* pause visuals by freezing lastFrame — still advance wall clock? Prefer pause paint while gated */
  }
}

function selectCount(n) {
  playerCount = n;
  $$(".count-btn").forEach((btn) => {
    const on = Number(btn.dataset.count) === n;
    btn.setAttribute("aria-pressed", on ? "true" : "false");
  });
  els.countGo.disabled = !n;
  els.countHint.textContent =
    n >= 3 ? "Rotate to landscape before you start." : "Split left / right.";
}

function buildArena() {
  const defs = ZONE_DEFS.slice(0, playerCount);
  fills = defs.map(() => 0);
  activePointers.clear();
  els.arena.innerHTML = "";
  els.arena.dataset.players = String(playerCount);
  zoneEls = defs.map((z, i) => {
    const zone = document.createElement("div");
    zone.className = "zone";
    zone.dataset.zone = String(i);
    zone.style.setProperty("--zone-color", z.color);
    zone.style.background = colorMix(z.color, 0.22);
    zone.innerHTML = `
      <div class="zone-fill" data-fill></div>
      <div class="zone-meta">
        <span class="zone-label">${escapeHtml(z.label)}</span>
        <span class="zone-pct" data-pct>0%</span>
      </div>
    `;
    zone.addEventListener("pointerdown", onZonePointerDown);
    zone.addEventListener("pointerup", onZonePointerUp);
    zone.addEventListener("pointercancel", onZonePointerUp);
    zone.addEventListener("lostpointercapture", onZonePointerUp);
    els.arena.appendChild(zone);
    return zone;
  });
  paintZoneUI();
}

function colorMix(hex, alpha) {
  /* soft base under the rising fill */
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function onZonePointerDown(e) {
  if (phase !== "paint" && phase !== "countdown") return;
  const zone = e.currentTarget;
  const idx = Number(zone.dataset.zone);
  if (Number.isNaN(idx)) return;
  e.preventDefault();
  try {
    zone.setPointerCapture(e.pointerId);
  } catch {
    /* ignore */
  }
  activePointers.set(e.pointerId, idx);
  if (phase === "paint") zone.classList.add("is-active");
  if (navigator.vibrate) {
    try {
      navigator.vibrate(8);
    } catch {
      /* ignore */
    }
  }
}

function onZonePointerUp(e) {
  const idx = activePointers.get(e.pointerId);
  activePointers.delete(e.pointerId);
  if (idx != null && zoneEls[idx]) {
    const still = [...activePointers.values()].includes(idx);
    if (!still) zoneEls[idx].classList.remove("is-active");
  }
}

function pressureForZone(i) {
  let n = 0;
  for (const z of activePointers.values()) {
    if (z === i) n += 1;
  }
  return n;
}

function paintZoneUI() {
  zoneEls.forEach((zone, i) => {
    const pct = Math.min(100, fills[i]);
    const fillEl = zone.querySelector("[data-fill]");
    const pctEl = zone.querySelector("[data-pct]");
    if (fillEl) fillEl.style.height = `${pct}%`;
    if (pctEl) pctEl.textContent = `${Math.floor(pct)}%`;
  });
}

function stopLoop() {
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = 0;
  }
}

function startRound() {
  stopLoop();
  buildArena();
  phase = "countdown";
  phaseStartedAt = performance.now();
  lastFrameAt = phaseStartedAt;
  els.arenaPhase.textContent = "Grab your corner";
  els.arenaTimer.textContent = "3";
  els.arenaTimer.classList.remove("is-go");
  els.arenaHud.hidden = false;
  showScreen("arena");
  updateLandscapeGate();
  rafId = requestAnimationFrame(tick);
}

function tick(now) {
  rafId = requestAnimationFrame(tick);

  const gated = needsLandscape() && !isLandscape();

  if (phase === "countdown") {
    if (gated) {
      phaseStartedAt += now - lastFrameAt;
      lastFrameAt = now;
      return;
    }
    const elapsed = now - phaseStartedAt;
    const left = Math.max(0, COUNTDOWN_MS - elapsed);
    const sec = Math.ceil(left / 1000);
    els.arenaPhase.textContent = "Grab your corner";
    els.arenaTimer.textContent = sec > 0 ? String(sec) : "GO";
    if (sec <= 0) {
      els.arenaTimer.classList.add("is-go");
    }
    if (elapsed >= COUNTDOWN_MS) {
      phase = "paint";
      phaseStartedAt = now;
      lastFrameAt = now;
      fills = fills.map(() => 0);
      els.arenaPhase.textContent = "Paint!";
      els.arenaTimer.textContent = "10";
      els.arenaTimer.classList.remove("is-go");
      zoneEls.forEach((z) => z.classList.remove("is-active"));
      for (const [pid, zi] of activePointers) {
        if (zoneEls[zi]) zoneEls[zi].classList.add("is-active");
      }
    }
    lastFrameAt = now;
    return;
  }

  if (phase === "paint") {
    if (gated) {
      phaseStartedAt += now - lastFrameAt;
      lastFrameAt = now;
      return;
    }
    const dt = Math.min(0.05, (now - lastFrameAt) / 1000);
    lastFrameAt = now;

    for (let i = 0; i < fills.length; i++) {
      const p = pressureForZone(i);
      if (p > 0) {
        fills[i] = Math.min(100, fills[i] + FILL_PER_SEC * p * dt);
      }
    }
    paintZoneUI();

    const elapsed = now - phaseStartedAt;
    const left = Math.max(0, ROUND_MS - elapsed);
    els.arenaPhase.textContent = "Paint!";
    els.arenaTimer.textContent = String(Math.ceil(left / 1000));

    if (elapsed >= ROUND_MS) {
      finishRound();
    }
  }
}

function finishRound() {
  phase = "done";
  stopLoop();
  activePointers.clear();
  zoneEls.forEach((z) => z.classList.remove("is-active"));
  paintZoneUI();
  renderResults();
  showScreen("results");
}

function renderResults() {
  const ranked = fills
    .map((pct, i) => ({
      i,
      pct,
      label: ZONE_DEFS[i].label,
      color: ZONE_DEFS[i].color,
    }))
    .sort((a, b) => b.pct - a.pct);

  const top = ranked[0];
  const tie =
    ranked.length > 1 && Math.floor(ranked[0].pct) === Math.floor(ranked[1].pct);

  if (tie) {
    const tied = ranked.filter((r) => Math.floor(r.pct) === Math.floor(top.pct));
    els.resultsWinner.textContent = `Tie — ${tied.map((t) => t.label).join(" & ")}`;
  } else {
    els.resultsWinner.textContent = `${top.label} wins · ${Math.floor(top.pct)}%`;
  }

  els.resultsList.innerHTML = ranked
    .map((r, place) => {
      const isWin = !tie && place === 0;
      const isTiedWin = tie && Math.floor(r.pct) === Math.floor(top.pct);
      const main = isWin || isTiedWin;
      const tag = main ? `<div class="board-tag">Winner</div>` : "";
      return `
        <li class="board-row${main ? " board-main" : ""}">
          <span class="board-rank">${place + 1}</span>
          <span class="board-swatch" style="background:${r.color}" aria-hidden="true"></span>
          <div class="board-info">
            <span class="board-name">${escapeHtml(r.label)}</span>
            ${tag}
          </div>
          <span class="board-count">${Math.floor(r.pct)}%</span>
        </li>
      `;
    })
    .join("");
}

function wire() {
  $("#btn-play").addEventListener("click", () => {
    selectCount(0);
    els.countGo.disabled = true;
    $$(".count-btn").forEach((b) => b.setAttribute("aria-pressed", "false"));
    els.countHint.textContent = "3–4 work best in landscape.";
    showScreen("count");
  });

  $$(".count-btn").forEach((btn) => {
    btn.addEventListener("click", () => selectCount(Number(btn.dataset.count)));
  });

  els.countGo.addEventListener("click", () => {
    if (!playerCount) return;
    startRound();
  });

  $("#btn-count-back").addEventListener("click", () => showScreen("home"));

  $("#btn-again").addEventListener("click", () => {
    if (!playerCount) {
      showScreen("count");
      return;
    }
    startRound();
  });

  $("#btn-change-count").addEventListener("click", () => {
    stopLoop();
    phase = "idle";
    showScreen("count");
  });

  window.addEventListener("orientationchange", updateLandscapeGate);
  window.addEventListener("resize", updateLandscapeGate);

  // Prevent scroll/zoom gestures on arena
  document.addEventListener(
    "gesturestart",
    (e) => {
      if (screen === "arena") e.preventDefault();
    },
    { passive: false }
  );
}

async function main() {
  await loadData();
  wire();
  showScreen("home");
  howto.maybeAutoShow();
}

main();
