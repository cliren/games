/**
 * Green Flash — reflex tap when the screen goes green.
 * Versus (2–4 split) · Hotseat (2–8 pass-the-phone).
 */
import { initHowto } from "./howto.js";
import { generateFunNames, shuffleFunNames } from "../../shared/fun-names.js";

const $ = (id) => document.getElementById(id);

/** @type {{ zoneColors: {id:string,label:string,fill:string,ink:string}[], versusBestOf:number, hotseatTrials:number, waitMinMs:number, waitMaxMs:number }} */
let DATA = {
  zoneColors: [
    { id: "p1", label: "P1", fill: "#F43F5E", ink: "#FEF2F2" },
    { id: "p2", label: "P2", fill: "#3B82F6", ink: "#EFF6FF" },
    { id: "p3", label: "P3", fill: "#F59E0B", ink: "#FFFBEB" },
    { id: "p4", label: "P4", fill: "#A855F7", ink: "#FAF5FF" },
  ],
  versusBestOf: 5,
  hotseatTrials: 3,
  waitMinMs: 800,
  waitMaxMs: 3000,
};

const MIN_HOTSEAT = 2;
const MAX_HOTSEAT = 8;
const STUN_MS = 900;

const screens = {
  home: $("screen-home"),
  mode: $("screen-mode"),
  versusCount: $("screen-versus-count"),
  names: $("screen-names"),
  rotate: $("screen-rotate"),
  versus: $("screen-versus"),
  pass: $("screen-pass"),
  hotseat: $("screen-hotseat"),
  round: $("screen-round"),
  results: $("screen-results"),
};

const appEl = $("app");

/** @typedef {'home'|'mode'|'versusCount'|'names'|'rotate'|'versus'|'pass'|'hotseat'|'round'|'results'} ScreenName */

/** Game state */
const state = {
  /** @type {'versus'|'hotseat'|null} */
  mode: null,
  versusCount: 0,
  /** @type {string[]} */
  names: [],
  /** @type {number[]} versus scores */
  scores: [],
  /** @type {boolean[]} stunned this round */
  stunned: [],
  round: 0,
  bestOf: 5,
  /** @type {'idle'|'wait'|'green'|'resolved'} */
  phase: "idle",
  flashAt: 0,
  waitTimer: 0,
  /** @type {number|null} */
  winnerIndex: null,
  winnerMs: 0,
  /** hotseat */
  playerIndex: 0,
  trialIndex: 0,
  trials: 3,
  /** @type {{ name:string, times:(number|null)[], best:number|null, falseStarts:number }[]} */
  hotseatResults: [],
  /** pending after round screen */
  afterRound: /** @type {null | (() => void)} */ (null),
};

let audioCtx = /** @type {AudioContext|null} */ (null);
let landscapeListenerOn = false;

/* ─── Audio / haptics ─────────────────────────────────────────── */

function ensureAudio() {
  try {
    if (!audioCtx) {
      const AC = window.AudioContext || /** @type {typeof AudioContext} */ (/** @type {unknown} */ (window).webkitAudioContext);
      if (AC) audioCtx = new AC();
    }
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
  } catch {
    /* ignore */
  }
}

function beep(freq, durMs, type = "sine", gain = 0.08) {
  try {
    ensureAudio();
    if (!audioCtx) return;
    const t0 = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = /** @type {OscillatorType} */ (type);
    osc.frequency.value = freq;
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + durMs / 1000);
    osc.connect(g);
    g.connect(audioCtx.destination);
    osc.start(t0);
    osc.stop(t0 + durMs / 1000 + 0.02);
  } catch {
    /* ignore */
  }
}

function buzzFalse() {
  beep(120, 180, "square", 0.1);
  try {
    if (navigator.vibrate) navigator.vibrate([40, 30, 40]);
  } catch {
    /* ignore */
  }
}

function blipFlash() {
  beep(880, 60, "sine", 0.07);
  try {
    if (navigator.vibrate) navigator.vibrate(12);
  } catch {
    /* ignore */
  }
}

function blipWin() {
  beep(660, 80, "triangle", 0.08);
  setTimeout(() => beep(990, 100, "triangle", 0.07), 70);
}

/* ─── Screens ─────────────────────────────────────────────────── */

/** @param {ScreenName} name */
function showScreen(name) {
  Object.entries(screens).forEach(([key, el]) => {
    if (!el) return;
    el.classList.toggle("active", key === name);
  });
  const arena = name === "versus" || name === "hotseat";
  appEl.classList.toggle("arena-mode", arena);
  document.body.classList.toggle("playing-arena", arena);
}

function clearWaitTimer() {
  if (state.waitTimer) {
    clearTimeout(state.waitTimer);
    state.waitTimer = 0;
  }
}

function randomWait() {
  const min = DATA.waitMinMs;
  const max = DATA.waitMaxMs;
  return min + Math.floor(Math.random() * (max - min + 1));
}

function needsLandscape(count) {
  return count >= 3;
}

function isLandscape() {
  if (window.matchMedia) {
    if (window.matchMedia("(orientation: landscape)").matches) return true;
    // fallback: wide enough
  }
  return window.innerWidth > window.innerHeight;
}

let _landscapeOnOk = /** @type {null | (() => void)} */ (null);

function _landscapeCheck() {
  if (isLandscape() && _landscapeOnOk) {
    const fn = _landscapeOnOk;
    _landscapeOnOk = null;
    stopLandscapeWatch();
    fn();
  }
}

function stopLandscapeWatch() {
  if (!landscapeListenerOn) return;
  landscapeListenerOn = false;
  window.removeEventListener("resize", _landscapeCheck);
  window.removeEventListener("orientationchange", _landscapeCheck);
}

function watchLandscape(onOk) {
  stopLandscapeWatch();
  _landscapeOnOk = onOk;
  landscapeListenerOn = true;
  window.addEventListener("resize", _landscapeCheck);
  window.addEventListener("orientationchange", _landscapeCheck);
  _landscapeCheck();
}

/* ─── Versus ──────────────────────────────────────────────────── */

function setupVersus(count) {
  state.mode = "versus";
  state.versusCount = count;
  state.bestOf = DATA.versusBestOf;
  state.scores = Array.from({ length: count }, () => 0);
  state.stunned = Array.from({ length: count }, () => false);
  state.round = 0;
  state.names = DATA.zoneColors.slice(0, count).map((z) => z.label);
  beginVersusRound();
}

function beginVersusRound() {
  clearWaitTimer();
  state.round += 1;
  state.phase = "wait";
  state.winnerIndex = null;
  state.winnerMs = 0;
  state.stunned = Array.from({ length: state.versusCount }, () => false);

  showScreen("versus");
  renderVersusHud();
  renderVersusZones();

  const arena = $("versus-arena");
  arena.classList.remove("is-green");
  arena.classList.add("is-wait");
  hideBanner("versus-banner");

  const delay = randomWait();
  state.waitTimer = window.setTimeout(() => {
    state.phase = "green";
    state.flashAt = performance.now();
    arena.classList.remove("is-wait");
    arena.classList.add("is-green");
    blipFlash();
  }, delay);
}

function renderVersusHud() {
  const hud = $("versus-hud");
  const need = Math.ceil(state.bestOf / 2);
  hud.innerHTML = "";
  const roundEl = document.createElement("span");
  roundEl.className = "hud-chip";
  roundEl.textContent = `R${state.round} · first to ${need}`;
  hud.appendChild(roundEl);

  for (let i = 0; i < state.versusCount; i++) {
    const z = DATA.zoneColors[i];
    const chip = document.createElement("span");
    chip.className = "hud-chip";
    chip.style.borderColor = z.fill;
    chip.innerHTML = `<span class="dot" style="background:${z.fill}"></span>${z.label} ${state.scores[i]}`;
    hud.appendChild(chip);
  }
}

function renderVersusZones() {
  const arena = $("versus-arena");
  arena.className = `arena players-${state.versusCount} is-wait`;
  arena.innerHTML = "";

  for (let i = 0; i < state.versusCount; i++) {
    const z = DATA.zoneColors[i];
    const zone = document.createElement("div");
    zone.className = "zone";
    zone.dataset.index = String(i);
    zone.style.setProperty("--zone-color", z.fill);
    zone.setAttribute("role", "button");
    zone.setAttribute("aria-label", `${z.label} zone`);
    zone.innerHTML = `<span class="zone-label">${z.label}</span><span class="zone-score">${state.scores[i]}</span>`;
    zone.addEventListener("pointerdown", (e) => onVersusPointer(e, i), { passive: false });
    arena.appendChild(zone);
  }
}

/**
 * @param {PointerEvent} e
 * @param {number} index
 */
function onVersusPointer(e, index) {
  e.preventDefault();
  e.stopPropagation();
  if (state.phase === "resolved" || state.phase === "idle") return;

  if (state.phase === "wait") {
    // False start
    falseStartVersus(index);
    return;
  }

  if (state.phase === "green") {
    if (state.stunned[index]) return;
    const ms = Math.max(0, Math.round(performance.now() - state.flashAt));
    resolveVersusRound(index, ms);
  }
}

function falseStartVersus(index) {
  buzzFalse();
  state.stunned[index] = true;
  state.scores[index] = Math.max(0, state.scores[index] - 1);
  const zones = $("versus-arena").querySelectorAll(".zone");
  const zone = zones[index];
  if (zone) {
    zone.classList.add("is-false", "is-stunned");
    const scoreEl = zone.querySelector(".zone-score");
    if (scoreEl) scoreEl.textContent = String(state.scores[index]);
    window.setTimeout(() => zone.classList.remove("is-false"), 320);
  }
  renderVersusHud();
  // stun expires mid-round so they can still try if others haven't won
  window.setTimeout(() => {
    if (state.phase === "wait" || state.phase === "green") {
      state.stunned[index] = false;
      const z = $("versus-arena").querySelectorAll(".zone")[index];
      if (z) z.classList.remove("is-stunned");
    }
  }, STUN_MS);
}

function resolveVersusRound(index, ms) {
  state.phase = "resolved";
  clearWaitTimer();
  state.winnerIndex = index;
  state.winnerMs = ms;
  state.scores[index] += 1;
  blipWin();

  const zones = $("versus-arena").querySelectorAll(".zone");
  zones.forEach((z, i) => {
    if (i === index) z.classList.add("is-winner");
  });
  const z = DATA.zoneColors[index];
  showBanner("versus-banner", `${z.label} · ${ms} ms`);

  const need = Math.ceil(state.bestOf / 2);
  const matchOver = state.scores[index] >= need || state.round >= state.bestOf;

  window.setTimeout(() => {
    if (matchOver) {
      // If best-of exhausted without clear leader, still podium
      showVersusResults();
    } else {
      showRoundSummaryVersus();
    }
  }, 900);
}

function showRoundSummaryVersus() {
  const z = DATA.zoneColors[state.winnerIndex ?? 0];
  $("round-title").textContent = `Round ${state.round}`;
  $("round-lede").textContent = "First legal tap";
  $("round-big").textContent = `${z.label} · ${state.winnerMs} ms`;
  $("round-sub").textContent = scoreLineVersus();
  const box = $("round-scores");
  box.innerHTML = "";
  state.scores.forEach((s, i) => {
    const span = document.createElement("span");
    span.textContent = `${DATA.zoneColors[i].label} ${s}`;
    span.style.borderColor = DATA.zoneColors[i].fill;
    box.appendChild(span);
  });
  state.afterRound = () => beginVersusRound();
  $("btn-round-next").textContent = "Next round";
  showScreen("round");
}

function scoreLineVersus() {
  const need = Math.ceil(state.bestOf / 2);
  return `First to ${need} · best of ${state.bestOf}`;
}

function showVersusResults() {
  const ranked = state.scores
    .map((score, i) => ({ i, score, name: DATA.zoneColors[i].label, color: DATA.zoneColors[i].fill }))
    .sort((a, b) => b.score - a.score || a.i - b.i);

  $("results-sub").textContent = `Best of ${state.bestOf}`;
  const list = $("podium-list");
  list.innerHTML = "";
  ranked.forEach((row, rank) => {
    const li = document.createElement("li");
    li.className = "podium-row" + (rank === 0 ? " gold" : "");
    li.innerHTML = `
      <span class="podium-rank">${rank + 1}</span>
      <span class="podium-name">${escapeHtml(row.name)}</span>
      <span class="podium-stat">${row.score}</span>
      ${rank === 0 ? '<span class="podium-tag">Winner</span>' : ""}
    `;
    list.appendChild(li);
  });
  showScreen("results");
}

/* ─── Hotseat ─────────────────────────────────────────────────── */

function setupHotseat(names) {
  state.mode = "hotseat";
  state.names = names.slice();
  state.trials = DATA.hotseatTrials;
  state.playerIndex = 0;
  state.trialIndex = 0;
  state.hotseatResults = names.map((name) => ({
    name,
    times: [],
    best: null,
    falseStarts: 0,
  }));
  showHotseatPass();
}

function showHotseatPass() {
  clearWaitTimer();
  const name = state.names[state.playerIndex];
  const trial = state.trialIndex + 1;
  $("pass-title").innerHTML = `Pass to <strong>${escapeHtml(name)}</strong>`;
  $("pass-sub").textContent = "Don’t peek.";
  $("pass-meta").textContent = `Trial ${trial} / ${state.trials}`;
  $("btn-im").textContent = `I’m ${name}`;
  showScreen("pass");
}

function beginHotseatTrial() {
  clearWaitTimer();
  state.phase = "wait";
  const name = state.names[state.playerIndex];
  $("hotseat-who").textContent = name;
  $("hotseat-progress").textContent = `Trial ${state.trialIndex + 1} / ${state.trials}`;
  const pad = $("hotseat-pad");
  pad.className = "hotseat-pad is-wait";
  $("hotseat-prompt").textContent = "Wait…";
  $("hotseat-ms").hidden = true;
  hideBanner("hotseat-banner");
  showScreen("hotseat");

  const delay = randomWait();
  state.waitTimer = window.setTimeout(() => {
    state.phase = "green";
    state.flashAt = performance.now();
    pad.classList.remove("is-wait");
    pad.classList.add("is-green");
    $("hotseat-prompt").textContent = "TAP!";
    blipFlash();
  }, delay);
}

/**
 * @param {PointerEvent} e
 */
function onHotseatPointer(e) {
  e.preventDefault();
  if (state.phase === "resolved" || state.phase === "idle") return;

  if (state.phase === "wait") {
    // False start — hurts: trial discarded as null (worst)
    state.phase = "resolved";
    clearWaitTimer();
    buzzFalse();
    const pad = $("hotseat-pad");
    pad.classList.remove("is-wait");
    pad.classList.add("is-false");
    $("hotseat-prompt").textContent = "False start!";
    const rec = state.hotseatResults[state.playerIndex];
    rec.falseStarts += 1;
    rec.times.push(null);
    showBanner("hotseat-banner", "Too early — that trial’s toast");
    window.setTimeout(() => advanceHotseatAfterTrial(), 900);
    return;
  }

  if (state.phase === "green") {
    state.phase = "resolved";
    clearWaitTimer();
    const ms = Math.max(0, Math.round(performance.now() - state.flashAt));
    const rec = state.hotseatResults[state.playerIndex];
    rec.times.push(ms);
    if (rec.best === null || ms < rec.best) rec.best = ms;
    blipWin();
    const pad = $("hotseat-pad");
    pad.classList.remove("is-green");
    pad.classList.add("is-done");
    $("hotseat-prompt").textContent = "Nice";
    const msEl = $("hotseat-ms");
    msEl.hidden = false;
    msEl.textContent = `${ms} ms`;
    window.setTimeout(() => advanceHotseatAfterTrial(), 900);
  }
}

function advanceHotseatAfterTrial() {
  state.trialIndex += 1;
  if (state.trialIndex < state.trials) {
    // same player, next trial — brief round screen optional; go straight via pass? same person keep going
    showHotseatTrialSummary(false);
  } else {
    // next player or done
    state.trialIndex = 0;
    state.playerIndex += 1;
    if (state.playerIndex >= state.names.length) {
      showHotseatResults();
    } else {
      showHotseatTrialSummary(true);
    }
  }
}

function showHotseatTrialSummary(passNext) {
  const rec = state.hotseatResults[passNext ? state.playerIndex - 1 : state.playerIndex];
  const last = rec.times[rec.times.length - 1];
  $("round-title").textContent = rec.name;
  $("round-lede").textContent = passNext ? "Hand off next" : `Trial ${rec.times.length} / ${state.trials}`;
  $("round-big").textContent = last === null ? "False start" : `${last} ms`;
  $("round-sub").textContent =
    rec.best === null ? "No clean time yet" : `Best so far · ${rec.best} ms`;
  const box = $("round-scores");
  box.innerHTML = "";
  rec.times.forEach((t, i) => {
    const span = document.createElement("span");
    span.textContent = t === null ? `T${i + 1} ✕` : `T${i + 1} ${t}`;
    box.appendChild(span);
  });
  if (passNext) {
    $("btn-round-next").textContent = "Pass phone";
    state.afterRound = () => showHotseatPass();
  } else {
    $("btn-round-next").textContent = "Next trial";
    state.afterRound = () => beginHotseatTrial();
  }
  showScreen("round");
}

function showHotseatResults() {
  const ranked = state.hotseatResults
    .map((r, i) => ({ ...r, i }))
    .sort((a, b) => {
      if (a.best === null && b.best === null) return a.i - b.i;
      if (a.best === null) return 1;
      if (b.best === null) return -1;
      return a.best - b.best || a.i - b.i;
    });

  $("results-sub").textContent = `Best of ${state.trials} trials · lowest ms`;
  const list = $("podium-list");
  list.innerHTML = "";
  ranked.forEach((row, rank) => {
    const li = document.createElement("li");
    li.className = "podium-row" + (rank === 0 && row.best !== null ? " gold" : "");
    const stat = row.best === null ? "—" : `${row.best} ms`;
    li.innerHTML = `
      <span class="podium-rank">${rank + 1}</span>
      <span class="podium-name">${escapeHtml(row.name)}</span>
      <span class="podium-stat">${stat}</span>
      ${rank === 0 && row.best !== null ? '<span class="podium-tag">Fastest</span>' : ""}
    `;
    list.appendChild(li);
  });
  showScreen("results");
}

/* ─── Names UI ────────────────────────────────────────────────── */

function renderNameChips() {
  const wrap = $("name-chips");
  wrap.innerHTML = "";
  state.names.forEach((name, i) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.innerHTML = `${escapeHtml(name)} <span class="chip-x" aria-hidden="true">×</span>`;
    chip.setAttribute("aria-label", `Remove ${name}`);
    chip.addEventListener("click", () => {
      state.names.splice(i, 1);
      renderNameChips();
    });
    wrap.appendChild(chip);
  });
  $("names-count").textContent = `${state.names.length} / ${MAX_HOTSEAT}`;
  $("btn-names-start").disabled = state.names.length < MIN_HOTSEAT;
}

function addName(raw) {
  const name = String(raw || "").trim().slice(0, 16);
  if (!name) return;
  if (state.names.length >= MAX_HOTSEAT) return;
  const key = name.toLowerCase();
  if (state.names.some((n) => n.toLowerCase() === key)) return;
  state.names.push(name);
  renderNameChips();
}

/* ─── Helpers ─────────────────────────────────────────────────── */

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function showBanner(id, text) {
  const el = $(id);
  if (!el) return;
  el.textContent = text;
  el.hidden = false;
}

function hideBanner(id) {
  const el = $(id);
  if (!el) return;
  el.hidden = true;
  el.textContent = "";
}

function resetToHome() {
  clearWaitTimer();
  stopLandscapeWatch();
  _landscapeOnOk = null;
  state.mode = null;
  state.versusCount = 0;
  state.names = [];
  state.scores = [];
  state.phase = "idle";
  state.afterRound = null;
  showScreen("home");
}

function playAgain() {
  if (state.mode === "versus") {
    const count = state.versusCount;
    if (needsLandscape(count) && !isLandscape()) {
      showScreen("rotate");
      watchLandscape(() => setupVersus(count));
      return;
    }
    setupVersus(count);
  } else if (state.mode === "hotseat") {
    setupHotseat(state.names);
  } else {
    resetToHome();
  }
}

/* ─── Wire UI ─────────────────────────────────────────────────── */

function wire() {
  const howto = initHowto({
    overlay: $("howto-overlay"),
    sheet: $("howto-sheet"),
    gotItBtn: $("btn-howto-gotit"),
    closeBtn: $("btn-howto-close"),
    openBtn: $("btn-howto"),
  });
  howto.maybeAutoShow();

  $("btn-play").addEventListener("click", () => {
    ensureAudio();
    showScreen("mode");
  });

  $("btn-mode-back").addEventListener("click", () => showScreen("home"));
  $("btn-mode-versus").addEventListener("click", () => {
    ensureAudio();
    state.versusCount = 0;
    document.querySelectorAll(".count-btn").forEach((b) => b.classList.remove("selected"));
    $("btn-versus-start").disabled = true;
    showScreen("versusCount");
  });
  $("btn-mode-hotseat").addEventListener("click", () => {
    ensureAudio();
    state.names = generateFunNames(4);
    renderNameChips();
    showScreen("names");
  });

  $("btn-versus-back").addEventListener("click", () => showScreen("mode"));
  document.querySelectorAll(".count-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const n = Number(btn.getAttribute("data-count"));
      state.versusCount = n;
      document.querySelectorAll(".count-btn").forEach((b) => b.classList.toggle("selected", b === btn));
      $("btn-versus-start").disabled = false;
      $("versus-count-hint").textContent =
        n >= 3 ? "3–4 need landscape" : "Split left / right";
    });
  });

  $("btn-versus-start").addEventListener("click", () => {
    ensureAudio();
    const n = state.versusCount;
    if (!n) return;
    if (needsLandscape(n) && !isLandscape()) {
      showScreen("rotate");
      watchLandscape(() => setupVersus(n));
      return;
    }
    setupVersus(n);
  });

  $("btn-rotate-back").addEventListener("click", () => {
    stopLandscapeWatch();
    _landscapeOnOk = null;
    showScreen("versusCount");
  });

  $("btn-names-back").addEventListener("click", () => showScreen("mode"));
  $("btn-add-name").addEventListener("click", () => {
    addName(/** @type {HTMLInputElement} */ ($("name-input")).value);
    /** @type {HTMLInputElement} */ ($("name-input")).value = "";
    $("name-input").focus();
  });
  $("name-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      $("btn-add-name").click();
    }
  });
  $("btn-names-shuffle").addEventListener("click", () => {
    const n = Math.max(state.names.length, MIN_HOTSEAT) || 4;
    state.names = shuffleFunNames(Math.min(MAX_HOTSEAT, n));
    renderNameChips();
  });
  $("btn-names-start").addEventListener("click", () => {
    ensureAudio();
    if (state.names.length < MIN_HOTSEAT) return;
    setupHotseat(state.names);
  });

  $("btn-im").addEventListener("click", () => {
    ensureAudio();
    beginHotseatTrial();
  });

  $("hotseat-pad").addEventListener(
    "pointerdown",
    (e) => onHotseatPointer(/** @type {PointerEvent} */ (e)),
    { passive: false }
  );

  $("btn-round-next").addEventListener("click", () => {
    const fn = state.afterRound;
    state.afterRound = null;
    if (fn) fn();
  });

  $("btn-again").addEventListener("click", () => {
    ensureAudio();
    playAgain();
  });
  $("btn-new-game").addEventListener("click", () => resetToHome());

  showScreen("home");
}

async function boot() {
  try {
    const res = await fetch("./js/data.json");
    if (res.ok) {
      const json = await res.json();
      DATA = { ...DATA, ...json };
    }
  } catch {
    /* bundled defaults */
  }
  wire();
}

boot();
