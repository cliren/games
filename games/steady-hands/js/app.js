import { initHowto } from "./howto.js";
import {
  generateFunNames,
  generateOneFunName,
  defaultPlayerCount,
} from "../../shared/fun-names.js";

const DRAFT_KEY = "steady-hands:draft:v1";
const MIN_NAMES = 2;
const MAX_NAMES = 8;
const NAME_MAX = 16;
const MEASURE_MS = 5000;
const CALIBRATE_MS = 400;
const MOTION_WAIT_MS = 700;

/** @typedef {{
 *  v: 1,
 *  names: string[],
 *  turnIndex: number,
 *  scores: Array<{ name: string, shake: number, mode: "motion"|"hold" }>,
 *  phase: "home"|"names"|"turn"|"results",
 *  curtainOpen: boolean,
 *  actStep: "ready"|"score",
 * }} SteadyGame */

/** @type {SteadyGame} */
let state = emptyState();
/** @type {ReturnType<typeof initHowto> | null} */
let howto = null;

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

function emptyState() {
  return {
    v: 1,
    names: [],
    turnIndex: 0,
    scores: [],
    phase: "home",
    curtainOpen: false,
    actStep: "ready",
  };
}

function saveDraft() {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (!d || d.v !== 1 || !Array.isArray(d.names)) return null;
    return d;
  } catch {
    return null;
  }
}

function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

function showScreen(id) {
  $$(".screen").forEach((el) => el.classList.remove("active"));
  if (id !== "turn") clearPrivateTurnDom();
  const screen = document.getElementById("screen-" + id);
  if (screen) screen.classList.add("active");
  window.scrollTo({ top: 0, behavior: "auto" });
}

function currentName() {
  return state.names[state.turnIndex] || "";
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatShake(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "0.0";
  return x.toFixed(1);
}

/* ---------- Home ---------- */
function showHome() {
  stopMeasure();
  state.phase = "home";
  showScreen("home");
  const draft = loadDraft();
  const resume = $("#btn-resume");
  const resumable =
    draft &&
    Array.isArray(draft.names) &&
    draft.names.length >= MIN_NAMES &&
    draft.phase &&
    draft.phase !== "home" &&
    draft.phase !== "results";
  resume.hidden = !resumable;
}

function resumeDraft() {
  const draft = loadDraft();
  if (!draft) return;
  state = { ...emptyState(), ...draft, v: 1 };
  if (state.phase === "turn" && state.actStep !== "score") {
    state.actStep = "ready";
    state.curtainOpen = state.turnIndex > 0;
  }
  routeFromPhase();
}

function routeFromPhase() {
  switch (state.phase) {
    case "names":
      showNames(true);
      break;
    case "turn":
      showTurn();
      break;
    case "results":
      showResults();
      break;
    default:
      showHome();
  }
}

/* ---------- Names ---------- */
function showNames(keepNames = false) {
  stopMeasure();
  if (!keepNames) {
    state = emptyState();
    state.phase = "names";
    state.names = generateFunNames(defaultPlayerCount());
  } else {
    state.phase = "names";
  }
  saveDraft();
  showScreen("names");
  renderNameChips();
  updateStartEnabled();
}

function renderNameChips() {
  const wrap = $("#name-chips");
  wrap.innerHTML = "";
  state.names.forEach((name, i) => {
    const chip = document.createElement("div");
    chip.className = "chip chip--edit";
    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = NAME_MAX;
    input.value = name;
    input.setAttribute("aria-label", `Player ${i + 1} name`);
    input.addEventListener("change", () => {
      let v = (input.value || "").trim().slice(0, NAME_MAX);
      if (!v) {
        input.value = state.names[i];
        return;
      }
      const lower = v.toLowerCase();
      if (state.names.some((n, j) => j !== i && n.toLowerCase() === lower)) {
        input.value = state.names[i];
        return;
      }
      state.names[i] = v;
      input.value = v;
      saveDraft();
    });
    const rm = document.createElement("button");
    rm.type = "button";
    rm.className = "chip-x";
    rm.setAttribute("aria-label", `Remove ${name}`);
    rm.textContent = "×";
    rm.addEventListener("click", () => {
      state.names.splice(i, 1);
      saveDraft();
      renderNameChips();
      updateStartEnabled();
    });
    chip.append(input, rm);
    wrap.appendChild(chip);
  });
  $("#names-count").textContent = `${state.names.length} / ${MAX_NAMES}`;
  $("#btn-add-name").disabled = state.names.length >= MAX_NAMES;
}

function updateStartEnabled() {
  $("#btn-names-start").disabled = state.names.length < MIN_NAMES;
}

function addName() {
  if (state.names.length >= MAX_NAMES) return;
  state.names.push(generateOneFunName(state.names));
  saveDraft();
  renderNameChips();
  updateStartEnabled();
}

function shuffleNames() {
  const count = Math.max(state.names.length, defaultPlayerCount());
  state.names = generateFunNames(Math.min(count, MAX_NAMES));
  saveDraft();
  renderNameChips();
  updateStartEnabled();
}

function startRound() {
  state.turnIndex = 0;
  state.scores = [];
  state.phase = "turn";
  state.actStep = "ready";
  state.curtainOpen = false;
  saveDraft();
  showTurn();
}

/* ---------- Turn ---------- */
function showTurn() {
  stopMeasure();
  state.phase = "turn";
  saveDraft();
  showScreen("turn");

  if (state.turnIndex === 0) {
    state.curtainOpen = false;
    revealAct();
  } else if (state.curtainOpen) {
    showCurtainState();
  } else {
    revealAct();
  }
}

function showCurtainState() {
  stopMeasure();
  state.curtainOpen = true;
  state.actStep = "ready";
  saveDraft();
  clearPrivateTurnDom();
  const name = currentName();
  $("#turn-curtain").hidden = false;
  $("#turn-act").hidden = true;
  $("#pass-title").innerHTML = `Pass to <strong>${escapeHtml(name)}</strong>`;
  $("#pass-sub").textContent = "Don't peek.";
  $("#btn-im").textContent = `I'm ${name}`;
}

function clearPrivateTurnDom() {
  stopMeasure();
  const curtain = $("#turn-curtain");
  const act = $("#turn-act");
  if (curtain) curtain.hidden = true;
  if (act) act.hidden = true;
  const score = $("#score-num");
  if (score) score.textContent = "";
  const live = $("#live-shake");
  if (live) live.textContent = "0.0";
  setActPanel("ready");
}

function setActPanel(which) {
  const ready = $("#act-ready");
  const measure = $("#act-measure");
  const score = $("#act-score");
  if (ready) ready.hidden = which !== "ready";
  if (measure) measure.hidden = which !== "measure";
  if (score) score.hidden = which !== "score";
}

function revealAct() {
  stopMeasure();
  state.curtainOpen = false;
  state.phase = "turn";
  saveDraft();
  $("#turn-curtain").hidden = true;
  $("#turn-act").hidden = false;
  $("#act-who").textContent = currentName();
  $("#act-progress").textContent = `${state.turnIndex + 1} / ${state.names.length}`;
  $("#ready-hint").textContent = "Allow motion if your phone asks.";

  const existing = state.scores[state.turnIndex];
  if (existing && state.actStep === "score") {
    showScorePanel(existing);
  } else {
    state.actStep = "ready";
    setActPanel("ready");
  }
}

function showScorePanel(entry) {
  state.actStep = "score";
  setActPanel("score");
  $("#score-num").textContent = formatShake(entry.shake);
  $("#score-hint").textContent =
    entry.mode === "hold" ? "Hold timer · lower is better" : "Lower is better";
  const last = state.turnIndex + 1 >= state.names.length;
  $("#btn-score-next").textContent = last ? "Results" : "Next";
}

function commitScoreAndAdvance() {
  if (state.turnIndex + 1 >= state.names.length) {
    state.phase = "results";
    state.curtainOpen = false;
    saveDraft();
    showResults();
  } else {
    state.turnIndex += 1;
    state.actStep = "ready";
    state.curtainOpen = true;
    state.phase = "turn";
    saveDraft();
    showCurtainState();
  }
}

/* ---------- Measure engine ---------- */
const measure = {
  running: false,
  mode: /** @type {"motion"|"hold"|null} */ (null),
  raf: 0,
  timer: 0,
  waitTimer: 0,
  startedAt: 0,
  samples: /** @type {number[]} */ ([]),
  grav: { x: 0, y: 0, z: 0, n: 0 },
  lastMag: 0,
  onMotion: /** @type {((e: DeviceMotionEvent) => void)|null} */ (null),
  holdId: /** @type {number|null} */ (null),
  holdOrigin: /** @type {{x:number,y:number}|null} */ (null),
  holdLast: /** @type {{x:number,y:number}|null} */ (null),
  jitter: /** @type {number[]} */ ([]),
};

function stopMeasure() {
  measure.running = false;
  measure.mode = null;
  if (measure.raf) cancelAnimationFrame(measure.raf);
  measure.raf = 0;
  if (measure.timer) clearTimeout(measure.timer);
  measure.timer = 0;
  if (measure.waitTimer) clearTimeout(measure.waitTimer);
  measure.waitTimer = 0;
  if (measure.onMotion) {
    window.removeEventListener("devicemotion", measure.onMotion);
    measure.onMotion = null;
  }
  measure.holdId = null;
  measure.holdOrigin = null;
  measure.holdLast = null;
  measure.jitter = [];
  document.body.classList.remove("is-measuring");
  const hold = $("#btn-hold");
  if (hold) {
    hold.classList.remove("is-held");
    hold.hidden = true;
  }
}

async function requestMotionPermission() {
  const DME = window.DeviceMotionEvent;
  if (!DME) return { ok: false, reason: "unsupported" };
  if (typeof DME.requestPermission === "function") {
    try {
      const res = await DME.requestPermission();
      return { ok: res === "granted", reason: String(res) };
    } catch {
      return { ok: false, reason: "denied" };
    }
  }
  return { ok: true, reason: "implicit" };
}

function prefersHoldFallback() {
  const DME = window.DeviceMotionEvent;
  if (DME && typeof DME.requestPermission === "function") return false;
  try {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    if (fine && !coarse) return true;
  } catch {
    /* ignore */
  }
  return !DME;
}

async function onStartMeasuring() {
  if (measure.running) return;
  if (prefersHoldFallback()) {
    beginHoldMode("Hold the button still for 5s.");
    return;
  }
  const perm = await requestMotionPermission();
  if (!perm.ok) {
    beginHoldMode("Motion blocked. Hold the button still for 5s.");
    return;
  }
  beginMotionMode();
}

function beginMotionMode() {
  stopMeasure();
  measure.running = true;
  measure.mode = "motion";
  measure.samples = [];
  measure.grav = { x: 0, y: 0, z: 0, n: 0 };
  measure.lastMag = 0;
  measure.startedAt = performance.now();
  document.body.classList.add("is-measuring");
  setActPanel("measure");
  $("#btn-hold").hidden = true;
  $("#measure-hint").textContent = "Don't move.";
  $("#measure-count").textContent = "5";
  $("#live-shake").textContent = "0.0";
  $("#live-shake").classList.remove("warn");
  setMeter(0, false);
  buzz(12);
  beep(660, 80);

  measure.onMotion = (e) => {
    if (!measure.running || measure.mode !== "motion") return;
    const t = performance.now() - measure.startedAt;
    const user = e.acceleration;
    const grav = e.accelerationIncludingGravity;
    let mag = null;
    if (user && user.x != null && user.y != null && user.z != null) {
      mag = Math.hypot(user.x, user.y, user.z);
    } else if (grav && grav.x != null && grav.y != null && grav.z != null) {
      if (t <= CALIBRATE_MS) {
        measure.grav.x += grav.x;
        measure.grav.y += grav.y;
        measure.grav.z += grav.z;
        measure.grav.n += 1;
        mag = 0;
      } else {
        const n = measure.grav.n || 1;
        mag = Math.hypot(
          grav.x - measure.grav.x / n,
          grav.y - measure.grav.y / n,
          grav.z - measure.grav.z / n
        );
      }
    }
    if (mag == null) return;
    measure.lastMag = mag;
    if (t > CALIBRATE_MS) measure.samples.push(mag);
  };
  window.addEventListener("devicemotion", measure.onMotion);

  measure.waitTimer = setTimeout(() => {
    if (!measure.running || measure.mode !== "motion") return;
    if (measure.samples.length === 0 && measure.grav.n === 0 && measure.lastMag === 0) {
      beginHoldMode("No motion signal. Hold the button still for 5s.");
    }
  }, MOTION_WAIT_MS);

  const tick = () => {
    if (!measure.running || measure.mode !== "motion") return;
    const elapsed = performance.now() - measure.startedAt;
    const left = Math.max(0, MEASURE_MS - elapsed);
    $("#measure-count").textContent = String(Math.max(1, Math.ceil(left / 1000)));
    const live = measure.lastMag * 10;
    $("#live-shake").textContent = formatShake(Math.min(99.9, live));
    const shaking = live > 8;
    $("#live-shake").classList.toggle("warn", shaking);
    setMeter(elapsed / MEASURE_MS, shaking);
    if (elapsed >= MEASURE_MS) {
      finishMotion();
      return;
    }
    measure.raf = requestAnimationFrame(tick);
  };
  measure.raf = requestAnimationFrame(tick);
}

function finishMotion() {
  const samples = measure.samples;
  const rms =
    samples.length === 0
      ? 0
      : Math.sqrt(samples.reduce((s, v) => s + v * v, 0) / samples.length);
  const shake = clampShake(rms * 10);
  stopMeasure();
  recordScore(shake, "motion");
}

function beginHoldMode(hint) {
  stopMeasure();
  measure.running = true;
  measure.mode = "hold";
  measure.jitter = [];
  measure.startedAt = 0;
  document.body.classList.add("is-measuring");
  setActPanel("measure");
  $("#measure-hint").textContent = hint;
  $("#measure-count").textContent = "5";
  $("#live-shake").textContent = "0.0";
  $("#live-shake").classList.remove("warn");
  setMeter(0, false);
  const hold = $("#btn-hold");
  hold.hidden = false;
  hold.classList.remove("is-held");
  hold.textContent = "Hold still";
}

function onHoldDown(e) {
  if (!measure.running || measure.mode !== "hold") return;
  if (e.button != null && e.button !== 0) return;
  e.preventDefault();
  const hold = $("#btn-hold");
  try {
    hold.setPointerCapture(e.pointerId);
  } catch {
    /* ignore */
  }
  measure.holdId = e.pointerId;
  measure.holdOrigin = { x: e.clientX, y: e.clientY };
  measure.holdLast = { x: e.clientX, y: e.clientY };
  measure.jitter = [];
  measure.startedAt = performance.now();
  hold.classList.add("is-held");
  hold.textContent = "Holding…";
  buzz(8);
  const tick = () => {
    if (!measure.running || measure.mode !== "hold" || measure.holdId == null) return;
    if (measure.holdLast && measure.holdOrigin) {
      measure.jitter.push(
        Math.hypot(
          measure.holdLast.x - measure.holdOrigin.x,
          measure.holdLast.y - measure.holdOrigin.y
        )
      );
    }
    const elapsed = performance.now() - measure.startedAt;
    const left = Math.max(0, MEASURE_MS - elapsed);
    $("#measure-count").textContent = String(Math.max(1, Math.ceil(left / 1000)));
    const last = measure.jitter[measure.jitter.length - 1] || 0;
    const live = Math.min(99.9, last * 0.4);
    $("#live-shake").textContent = formatShake(live);
    const shaking = live > 8;
    $("#live-shake").classList.toggle("warn", shaking);
    setMeter(elapsed / MEASURE_MS, shaking);
    if (elapsed >= MEASURE_MS) {
      finishHold();
      return;
    }
    measure.raf = requestAnimationFrame(tick);
  };
  if (measure.raf) cancelAnimationFrame(measure.raf);
  measure.raf = requestAnimationFrame(tick);
}

function onHoldMove(e) {
  if (measure.holdId == null || e.pointerId !== measure.holdId) return;
  measure.holdLast = { x: e.clientX, y: e.clientY };
}

function onHoldUp(e) {
  if (measure.holdId == null || e.pointerId !== measure.holdId) return;
  if (!measure.running || measure.mode !== "hold") return;
  const elapsed = performance.now() - measure.startedAt;
  if (elapsed >= MEASURE_MS - 40) {
    finishHold();
    return;
  }
  // Released early — reset the 5s hold, don't score
  if (measure.raf) cancelAnimationFrame(measure.raf);
  measure.raf = 0;
  measure.holdId = null;
  measure.holdOrigin = null;
  measure.holdLast = null;
  measure.jitter = [];
  measure.startedAt = 0;
  const hold = $("#btn-hold");
  hold.classList.remove("is-held");
  hold.textContent = "Hold still";
  $("#measure-count").textContent = "5";
  $("#live-shake").textContent = "0.0";
  $("#live-shake").classList.remove("warn");
  setMeter(0, false);
  $("#measure-hint").textContent = "Keep holding for the full 5s.";
}

function finishHold() {
  const samples = measure.jitter;
  const rms =
    samples.length === 0
      ? 0
      : Math.sqrt(samples.reduce((s, v) => s + v * v, 0) / samples.length);
  const shake = clampShake(rms * 0.35);
  stopMeasure();
  recordScore(shake, "hold");
}

function clampShake(n) {
  const x = Math.max(0, Math.min(99.9, n));
  return Math.round(x * 10) / 10;
}

function recordScore(shake, mode) {
  buzz(20);
  beep(880, 120);
  const entry = { name: currentName(), shake, mode };
  state.scores[state.turnIndex] = entry;
  state.actStep = "score";
  saveDraft();
  showScorePanel(entry);
}

function setMeter(frac, warn) {
  const fill = $("#meter-fill");
  if (!fill) return;
  fill.style.width = `${Math.max(0, Math.min(1, frac)) * 100}%`;
  fill.classList.toggle("warn", !!warn);
}

function buzz(ms) {
  try {
    if (navigator.vibrate) navigator.vibrate(ms);
  } catch {
    /* ignore */
  }
}

function beep(freq, ms) {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = freq;
    g.gain.value = 0.04;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + ms / 1000);
    o.stop(ctx.currentTime + ms / 1000);
    o.onended = () => {
      try {
        ctx.close();
      } catch {
        /* ignore */
      }
    };
  } catch {
    /* ignore */
  }
}

/* ---------- Results ---------- */
function showResults() {
  stopMeasure();
  state.phase = "results";
  saveDraft();
  showScreen("results");
  const list = $("#results-list");
  list.innerHTML = "";
  const ranked = [...state.scores].sort((a, b) => a.shake - b.shake);
  const best = ranked.length ? ranked[0].shake : 0;
  const winners = ranked.filter((r) => r.shake === best);
  const tied = winners.length > 1;
  const sub = $("#results-sub");
  if (sub) {
    if (!ranked.length) sub.textContent = "Least shake wins";
    else if (tied) sub.textContent = `Tie · ${winners.map((w) => w.name).join(" & ")}`;
    else sub.textContent = `${winners[0].name} · steadiest`;
  }
  ranked.forEach((row, i) => {
    const isBest = row.shake === best;
    const li = document.createElement("li");
    li.className = "board-row" + (isBest ? " board-main" : "");
    const tag = isBest
      ? `<span class="board-tag">${tied ? "Tie" : "Steadiest"}</span>`
      : row.mode === "hold"
        ? '<span class="board-tag soft">Hold timer</span>'
        : "";
    li.innerHTML = `
      <span class="board-rank">${i + 1}</span>
      <span class="board-name">${escapeHtml(row.name)}</span>
      <span class="board-count">${formatShake(row.shake)}</span>
      ${tag}
    `;
    list.appendChild(li);
  });
}

function anotherRound() {
  const names = [...state.names];
  state = emptyState();
  state.names = names;
  startRound();
}

function newGame() {
  clearDraft();
  state = emptyState();
  showNames(false);
}

/* ---------- Wire ---------- */
function init() {
  howto = initHowto({
    overlay: $("#howto-overlay"),
    sheet: $("#howto-sheet"),
    gotItBtn: $("#btn-howto-gotit"),
    closeBtn: $("#btn-howto-close"),
    openBtn: $("#btn-howto"),
  });

  $("#btn-start").addEventListener("click", () => showNames(false));
  $("#btn-resume").addEventListener("click", resumeDraft);

  $("#btn-add-name").addEventListener("click", addName);
  $("#btn-names-start").addEventListener("click", () => {
    if (state.names.length < MIN_NAMES) return;
    startRound();
  });
  $("#btn-names-shuffle").addEventListener("click", shuffleNames);
  $("#btn-names-back").addEventListener("click", () => {
    clearDraft();
    showHome();
  });

  $("#btn-im").addEventListener("click", () => {
    revealAct();
  });
  $("#btn-start-measure").addEventListener("click", () => {
    onStartMeasuring();
  });
  $("#btn-score-next").addEventListener("click", commitScoreAndAdvance);

  const hold = $("#btn-hold");
  hold.addEventListener("pointerdown", onHoldDown);
  hold.addEventListener("pointermove", onHoldMove);
  hold.addEventListener("pointerup", onHoldUp);
  hold.addEventListener("pointercancel", onHoldUp);
  hold.addEventListener("contextmenu", (e) => e.preventDefault());

  $("#btn-another").addEventListener("click", anotherRound);
  $("#btn-new-game").addEventListener("click", newGame);

  showHome();
  howto.maybeAutoShow();
}

init();
