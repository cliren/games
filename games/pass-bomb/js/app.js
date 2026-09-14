import { initHowto } from "./howto.js";
import { generateFunNames, defaultPlayerCount } from "../../shared/fun-names.js";

const DRAFT_KEY = "pass-bomb:draft:v1";
const RECENT_KEY = "pass-bomb:recent:v1";
const MIN_NAMES = 2;
const MAX_NAMES = 8;
const NAME_MAX = 16;
const FUSE_MIN_MS = 5000;
const FUSE_MAX_MS = 12000;

/** @typedef {{
 *  v: 1,
 *  names: string[],
 *  alive: boolean[],
 *  turnIndex: number,
 *  category: string,
 *  fuseMs: number,
 *  fuseRemaining: number,
 *  phase: "home"|"names"|"play"|"boom"|"results",
 *  curtainOpen: boolean,
 *  boomName: string,
 *  elimOrder: string[],
 * }} BombGame */

/** @type {BombGame} */
let state = emptyState();
/** @type {ReturnType<typeof initHowto> | null} */
let howto = null;
/** @type {string[]} */
let categories = [];
/** @type {number | null} */
let rafId = null;
let fuseStartedAt = 0;
let fusePausedRemaining = 0;
let ticking = false;

/** @type {AudioContext | null} */
let audioCtx = null;
let lastBeepAt = 0;

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

function emptyState() {
  return {
    v: 1,
    names: [],
    alive: [],
    turnIndex: 0,
    category: "",
    fuseMs: 8000,
    fuseRemaining: 8000,
    phase: "home",
    curtainOpen: false,
    boomName: "",
    elimOrder: [],
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
  const screen = document.getElementById("screen-" + id);
  if (screen) screen.classList.add("active");
  window.scrollTo({ top: 0, behavior: "auto" });
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function aliveCount() {
  return state.alive.filter(Boolean).length;
}

function aliveIndices() {
  const out = [];
  for (let i = 0; i < state.alive.length; i++) {
    if (state.alive[i]) out.push(i);
  }
  return out;
}

function currentName() {
  return state.names[state.turnIndex] || "";
}

function ensureAudio() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) audioCtx = new AC();
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function beep(freq, dur, gain = 0.08) {
  const ctx = ensureAudio();
  if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "square";
  osc.frequency.value = freq;
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function boomSound() {
  const ctx = ensureAudio();
  if (!ctx) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(180, t);
  osc.frequency.exponentialRampToValueAtTime(40, t + 0.45);
  g.gain.setValueAtTime(0.18, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.55);
}

function randomFuseMs() {
  return FUSE_MIN_MS + Math.floor(Math.random() * (FUSE_MAX_MS - FUSE_MIN_MS + 1));
}

function loadRecent() {
  try {
    const raw = sessionStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function pushRecent(cat) {
  try {
    const recent = loadRecent().filter((c) => c !== cat);
    recent.unshift(cat);
    sessionStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, 12)));
  } catch {
    /* ignore */
  }
}

function pickCategory() {
  if (!categories.length) return "Things that are fun";
  const recent = new Set(loadRecent());
  const pool = categories.filter((c) => !recent.has(c));
  const list = pool.length ? pool : categories;
  const cat = list[Math.floor(Math.random() * list.length)];
  pushRecent(cat);
  return cat;
}

async function loadCategories() {
  try {
    const res = await fetch("./js/data.json");
    const data = await res.json();
    if (data && Array.isArray(data.categories) && data.categories.length) {
      categories = data.categories;
    }
  } catch {
    categories = [
      "Pizza toppings",
      "Ice cream flavors",
      "Dog breeds",
      "Movie genres",
      "Things in a kitchen",
      "Cartoon characters",
      "Sports",
      "Fruit",
      "Board games",
      "Breakfast foods",
    ];
  }
}

/* ---------- Home ---------- */
function showHome() {
  stopFuse();
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
  if (!Array.isArray(state.alive) || state.alive.length !== state.names.length) {
    state.alive = state.names.map(() => true);
  }
  routeFromPhase();
}

function routeFromPhase() {
  switch (state.phase) {
    case "names":
      showNames(true);
      break;
    case "play":
      showPlay({ resume: true });
      break;
    case "boom":
      showBoom();
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
  stopFuse();
  if (!keepNames) {
    state = emptyState();
    state.phase = "names";
    state.names = generateFunNames(defaultPlayerCount());
  } else {
    state.phase = "names";
  }
  saveDraft();
  showScreen("names");
  $("#name-input").value = "";
  renderNameChips();
  updateStartEnabled();
}

function renderNameChips() {
  const wrap = $("#name-chips");
  wrap.innerHTML = "";
  state.names.forEach((name, i) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.setAttribute("aria-label", `Remove ${name}`);
    chip.innerHTML = `<span>${escapeHtml(name)}</span><span class="chip-x" aria-hidden="true">×</span>`;
    chip.addEventListener("click", () => {
      state.names.splice(i, 1);
      saveDraft();
      renderNameChips();
      updateStartEnabled();
    });
    wrap.appendChild(chip);
  });
  $("#names-count").textContent = `${state.names.length} / ${MAX_NAMES}`;
}

function updateStartEnabled() {
  $("#btn-names-start").disabled = state.names.length < MIN_NAMES;
}

function addName() {
  const input = $("#name-input");
  let name = (input.value || "").trim().slice(0, NAME_MAX);
  if (!name) return;
  const lower = name.toLowerCase();
  if (state.names.some((n) => n.toLowerCase() === lower)) {
    input.value = "";
    input.focus();
    return;
  }
  if (state.names.length >= MAX_NAMES) return;
  state.names.push(name);
  input.value = "";
  saveDraft();
  renderNameChips();
  updateStartEnabled();
  input.focus();
}

function shuffleNames() {
  const count = Math.max(state.names.length, defaultPlayerCount());
  state.names = generateFunNames(Math.min(count, MAX_NAMES));
  saveDraft();
  renderNameChips();
  updateStartEnabled();
}

function startMatch() {
  ensureAudio();
  state.alive = state.names.map(() => true);
  state.elimOrder = [];
  state.boomName = "";
  state.turnIndex = 0;
  beginLife({ firstOfMatch: true });
}

function beginLife({ firstOfMatch = false } = {}) {
  state.category = pickCategory();
  state.fuseMs = randomFuseMs();
  state.fuseRemaining = state.fuseMs;
  fusePausedRemaining = state.fuseMs;
  state.phase = "play";
  // First holder of a new life: no curtain if they're already holding
  // After boom Next: always curtain to next survivor (unless only one?)
  if (firstOfMatch) {
    state.curtainOpen = false;
  } else {
    state.curtainOpen = true;
  }
  saveDraft();
  showPlay();
}

/* ---------- Play ---------- */
function showPlay({ resume = false } = {}) {
  state.phase = "play";
  saveDraft();
  showScreen("play");

  if (state.turnIndex === 0 && !state.curtainOpen && !resume) {
    revealAct();
  } else if (state.curtainOpen) {
    showCurtainState();
  } else {
    revealAct();
  }
}

function clearPlayDom() {
  const curtain = $("#play-curtain");
  const act = $("#play-act");
  if (curtain) curtain.hidden = true;
  if (act) act.hidden = true;
}

function showCurtainState() {
  stopFuse();
  state.curtainOpen = true;
  saveDraft();
  const name = currentName();
  $("#play-curtain").hidden = false;
  $("#play-act").hidden = true;
  $("#pass-title").innerHTML = `Pass to <strong>${escapeHtml(name)}</strong>`;
  $("#pass-sub").textContent = "Don't peek.";
  $("#btn-im").textContent = `I'm ${name}`;
}

function revealAct() {
  state.curtainOpen = false;
  saveDraft();
  $("#play-curtain").hidden = true;
  $("#play-act").hidden = false;
  $("#play-who").textContent = currentName();
  $("#play-alive").textContent = `${aliveCount()} left`;
  $("#play-category").textContent = state.category;
  startFuse(state.fuseRemaining > 0 ? state.fuseRemaining : state.fuseMs);
}

function nextAliveIndex(from) {
  const n = state.names.length;
  if (!n) return 0;
  for (let step = 1; step <= n; step++) {
    const i = (from + step) % n;
    if (state.alive[i]) return i;
  }
  return from;
}

function onPass() {
  ensureAudio();
  // Snapshot remaining before pause
  if (ticking) {
    const elapsed = performance.now() - fuseStartedAt;
    fusePausedRemaining = Math.max(0, fusePausedRemaining - elapsed);
    state.fuseRemaining = fusePausedRemaining;
  }
  stopFuse(false);
  if (fusePausedRemaining <= 0) {
    onBoom();
    return;
  }
  state.turnIndex = nextAliveIndex(state.turnIndex);
  state.curtainOpen = true;
  saveDraft();
  showCurtainState();
}

function startFuse(remainingMs) {
  stopFuse(false);
  fusePausedRemaining = remainingMs;
  state.fuseRemaining = remainingMs;
  fuseStartedAt = performance.now();
  ticking = true;
  lastBeepAt = 0;
  ensureAudio();
  updateFuseUi(1);
  rafId = requestAnimationFrame(fuseTick);
}

function stopFuse(resetUi = true) {
  ticking = false;
  if (rafId != null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  if (resetUi) updateFuseUi(1);
}

function fuseTick(now) {
  if (!ticking) return;
  const elapsed = now - fuseStartedAt;
  const left = Math.max(0, fusePausedRemaining - elapsed);
  const ratio = state.fuseMs > 0 ? left / state.fuseMs : 0;
  updateFuseUi(ratio);

  // Escalating beeps: interval shrinks as fuse burns
  const progress = 1 - ratio;
  const interval = Math.max(90, 700 - progress * 620);
  if (now - lastBeepAt >= interval) {
    lastBeepAt = now;
    const freq = 420 + progress * 480;
    beep(freq, 0.05, 0.06 + progress * 0.06);
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try {
        navigator.vibrate(progress > 0.7 ? 30 : 12);
      } catch {
        /* ignore */
      }
    }
  }

  state.fuseRemaining = left;

  if (left <= 0) {
    ticking = false;
    onBoom();
    return;
  }
  rafId = requestAnimationFrame(fuseTick);
}

function updateFuseUi(ratio) {
  const fill = $("#fuse-fill");
  const spark = $("#fuse-spark");
  const wrap = fill && fill.closest(".fuse-wrap");
  if (fill) fill.style.transform = `scaleX(${Math.max(0, Math.min(1, ratio))})`;
  if (spark) spark.style.left = `${Math.max(0, Math.min(1, ratio)) * 100}%`;
  if (wrap) wrap.classList.toggle("urgent", ratio < 0.28);
}

function onBoom() {
  stopFuse(false);
  boomSound();
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    try {
      navigator.vibrate([40, 40, 80]);
    } catch {
      /* ignore */
    }
  }
  const victim = state.turnIndex;
  const name = state.names[victim] || "Someone";
  state.alive[victim] = false;
  state.boomName = name;
  state.elimOrder.push(name);
  state.fuseRemaining = 0;
  state.curtainOpen = false;
  clearPlayDom();

  if (aliveCount() <= 1) {
    state.phase = "results";
    saveDraft();
    showResults();
    return;
  }

  state.phase = "boom";
  // Next turn after boom goes to next still-alive after victim
  state.turnIndex = nextAliveIndex(victim);
  saveDraft();
  showBoom();
}

function showBoom() {
  stopFuse();
  state.phase = "boom";
  showScreen("boom");
  $("#boom-who").innerHTML = `<strong>${escapeHtml(state.boomName)}</strong> is out`;
  $("#boom-alive").textContent = `${aliveCount()} still in`;
}

function continueAfterBoom() {
  beginLife({ firstOfMatch: false });
}

/* ---------- Results ---------- */
function showResults() {
  stopFuse();
  state.phase = "results";
  clearDraft();
  showScreen("results");

  const survivors = [];
  state.names.forEach((n, i) => {
    if (state.alive[i]) survivors.push(n);
  });
  const winner = survivors[0] || state.names[0] || "—";

  $("#results-sub").textContent = survivors.length ? "Survivors" : "Everyone boomed";

  const list = $("#results-list");
  list.innerHTML = "";

  // Winner / survivors first
  survivors.forEach((name, i) => {
    const li = document.createElement("li");
    li.className = "board-row winner";
    li.innerHTML = `<span class="board-name">${escapeHtml(name)}</span><span class="board-label">${i === 0 && survivors.length === 1 ? "Last standing" : "Survivor"}</span>`;
    list.appendChild(li);
  });

  // Elimination order (last out closest to win)
  const elim = [...state.elimOrder].reverse();
  elim.forEach((name, i) => {
    const li = document.createElement("li");
    li.className = "board-row out";
    const label = i === 0 ? "Last out" : "Out";
    li.innerHTML = `<span class="board-name">${escapeHtml(name)}</span><span class="board-label">${label}</span>`;
    list.appendChild(li);
  });

  if (!survivors.length && !elim.length) {
    const li = document.createElement("li");
    li.className = "board-row";
    li.innerHTML = `<span class="board-name">${escapeHtml(winner)}</span><span class="board-label">Winner</span>`;
    list.appendChild(li);
  }
}

function anotherRound() {
  const names = [...state.names];
  state = emptyState();
  state.names = names;
  state.alive = names.map(() => true);
  state.elimOrder = [];
  state.turnIndex = 0;
  beginLife({ firstOfMatch: true });
}

function newGame() {
  clearDraft();
  state = emptyState();
  showNames(false);
}

/* ---------- Wire ---------- */
function bind() {
  $("#btn-start").addEventListener("click", () => showNames(false));
  $("#btn-resume").addEventListener("click", resumeDraft);
  $("#btn-add-name").addEventListener("click", addName);
  $("#name-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addName();
    }
  });
  $("#btn-names-start").addEventListener("click", () => {
    if (state.names.length < MIN_NAMES) return;
    startMatch();
  });
  $("#btn-names-shuffle").addEventListener("click", shuffleNames);
  $("#btn-names-back").addEventListener("click", () => {
    clearDraft();
    showHome();
  });
  $("#btn-im").addEventListener("click", () => {
    ensureAudio();
    revealAct();
  });
  $("#btn-pass").addEventListener("click", onPass);
  $("#btn-boom-next").addEventListener("click", continueAfterBoom);
  $("#btn-another").addEventListener("click", anotherRound);
  $("#btn-new-game").addEventListener("click", newGame);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && ticking) {
      const elapsed = performance.now() - fuseStartedAt;
      fusePausedRemaining = Math.max(0, fusePausedRemaining - elapsed);
      state.fuseRemaining = fusePausedRemaining;
      stopFuse(false);
      saveDraft();
    } else if (!document.hidden && state.phase === "play" && !state.curtainOpen && $("#play-act") && !$("#play-act").hidden) {
      if (state.fuseRemaining > 0) startFuse(state.fuseRemaining);
    }
  });
}

async function main() {
  await loadCategories();
  howto = initHowto({
    overlay: $("#howto-overlay"),
    sheet: $("#howto-sheet"),
    gotItBtn: $("#btn-howto-gotit"),
    closeBtn: $("#btn-howto-close"),
    openBtn: $("#btn-howto"),
  });
  bind();
  showHome();
  howto.maybeAutoShow();
}

main();
