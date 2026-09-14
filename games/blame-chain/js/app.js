import { randomPrompt } from "./prompts.js";
import { initHowto } from "./howto.js";
import { generateFunNames, defaultPlayerCount } from "../../shared/fun-names.js";

const DRAFT_KEY = "blame-chain:draft:v1";
const MIN_NAMES = 3;
const MAX_NAMES = 8;
const NAME_MAX = 16;
const ALIBI_MAX = 80;

/** @typedef {{
 *  v: 1,
 *  names: string[],
 *  promptId: string,
 *  promptText: string,
 *  turnIndex: number,
 *  pendingBlamed: string,
 *  entries: Array<{ from: string, blamed: string, alibi: string }>,
 *  phase: "home"|"names"|"turn"|"reveal"|"board",
 *  curtainOpen: boolean,
 *  revealIndex: number,
 *  shuffledOnce: boolean,
 * }} BlameGame */

/** @type {BlameGame} */
let state = emptyState();
/** @type {ReturnType<typeof initHowto> | null} */
let howto = null;

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

function emptyState() {
  return {
    v: 1,
    names: [],
    promptId: "",
    promptText: "",
    turnIndex: 0,
    pendingBlamed: "",
    entries: [],
    phase: "home",
    curtainOpen: false,
    revealIndex: 0,
    shuffledOnce: false,
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

function clearPrivateTurnDom() {
  const list = $("#blame-list");
  if (list) list.innerHTML = "";
  const alibi = $("#alibi-input");
  if (alibi) alibi.value = "";
  const hint = $("#blame-hint");
  if (hint) hint.textContent = "Tap who did it";
  const curtain = $("#turn-curtain");
  const act = $("#turn-act");
  if (curtain) curtain.hidden = true;
  if (act) act.hidden = true;
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

/* ---------- Home ---------- */
function showHome() {
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
    draft.phase !== "board";
  resume.hidden = !resumable;
}

function resumeDraft() {
  const draft = loadDraft();
  if (!draft) return;
  state = { ...emptyState(), ...draft, v: 1 };
  // Migrate old phases
  if (["prompt", "pass", "blame", "alibi"].includes(state.phase)) {
    state.pendingBlamed = "";
    state.phase = "turn";
    state.curtainOpen = state.turnIndex > 0;
    saveDraft();
  }
  routeFromPhase();
}

function routeFromPhase() {
  switch (state.phase) {
    case "names":
      showNames(true);
      break;
    case "turn":
      showTurn({ resume: true });
      break;
    case "reveal":
      showReveal();
      break;
    case "board":
      showBoard();
      break;
    default:
      showHome();
  }
}

/* ---------- Names ---------- */
function showNames(keepNames = false) {
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

function ensurePrompt() {
  if (!state.promptText) {
    const p = randomPrompt();
    state.promptId = p.id;
    state.promptText = p.text;
    state.shuffledOnce = false;
  }
}

function startRound() {
  ensurePrompt();
  state.turnIndex = 0;
  state.entries = [];
  state.pendingBlamed = "";
  state.revealIndex = 0;
  state.phase = "turn";
  state.curtainOpen = false; // player 1 skips curtain
  saveDraft();
  showTurn();
}

function shufflePromptOnce() {
  if (state.shuffledOnce) return;
  const p = randomPrompt();
  state.promptId = p.id;
  state.promptText = p.text;
  state.shuffledOnce = true;
  saveDraft();
  $("#blame-prompt").textContent = state.promptText;
  $("#btn-turn-shuffle").hidden = true;
}

/* ---------- Turn (curtain state + blame+alibi) ---------- */
function showTurn({ resume = false } = {}) {
  state.phase = "turn";
  ensurePrompt();
  saveDraft();
  showScreen("turn");

  // Player 1 always skips curtain; others need curtain until I'm {name}
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
  state.curtainOpen = true;
  state.pendingBlamed = "";
  saveDraft();
  clearActFields();
  const name = currentName();
  $("#turn-curtain").hidden = false;
  $("#turn-act").hidden = true;
  $("#pass-title").innerHTML = `Pass to <strong>${escapeHtml(name)}</strong>`;
  $("#pass-sub").textContent = "Don't peek.";
  $("#btn-im").textContent = `I'm ${name}`;
}

function clearActFields() {
  const list = $("#blame-list");
  if (list) list.innerHTML = "";
  const alibi = $("#alibi-input");
  if (alibi) alibi.value = "";
  state.pendingBlamed = "";
}

function revealAct() {
  state.curtainOpen = false;
  state.phase = "turn";
  saveDraft();
  $("#turn-curtain").hidden = true;
  $("#turn-act").hidden = false;

  $("#blame-prompt").textContent = state.promptText;
  $("#blame-who").textContent = currentName();
  $("#blame-progress").textContent = `${state.turnIndex + 1} / ${state.names.length}`;

  // Shuffle prompt only on first player's first look
  const canShuffle = state.turnIndex === 0 && !state.shuffledOnce && state.entries.length === 0;
  $("#btn-turn-shuffle").hidden = !canShuffle;

  const list = $("#blame-list");
  list.innerHTML = "";
  const me = currentName();
  state.names.forEach((name) => {
    if (name === me) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pick-row" + (state.pendingBlamed === name ? " selected" : "");
    btn.textContent = name;
    btn.addEventListener("click", () => {
      state.pendingBlamed = name;
      $$("#blame-list .pick-row").forEach((el) =>
        el.classList.toggle("selected", el.textContent === name)
      );
      updateTurnDone();
      $("#blame-hint").textContent = `Blaming ${name}`;
    });
    list.appendChild(btn);
  });

  const alibi = $("#alibi-input");
  if (!alibi.dataset.wired) {
    alibi.dataset.wired = "1";
    alibi.addEventListener("input", updateTurnDone);
  }
  if (!state.pendingBlamed) alibi.value = "";
  updateTurnDone();
  $("#blame-hint").textContent = state.pendingBlamed
    ? `Blaming ${state.pendingBlamed}`
    : "Tap who did it";
}

function updateTurnDone() {
  const alibi = ($("#alibi-input").value || "").trim();
  const n = ($("#alibi-input").value || "").length;
  $("#alibi-count").textContent = `${n}/${ALIBI_MAX}`;
  $("#btn-turn-done").disabled = !(state.pendingBlamed && alibi.length >= 1);
}

function commitTurn() {
  const alibi = ($("#alibi-input").value || "").trim().slice(0, ALIBI_MAX);
  if (!alibi || !state.pendingBlamed) return;
  state.entries.push({
    from: currentName(),
    blamed: state.pendingBlamed,
    alibi,
  });
  state.pendingBlamed = "";
  clearActFields();

  if (state.turnIndex + 1 >= state.names.length) {
    state.phase = "reveal";
    state.revealIndex = 0;
    state.curtainOpen = false;
    saveDraft();
    showReveal();
  } else {
    state.turnIndex += 1;
    state.curtainOpen = true;
    state.phase = "turn";
    saveDraft();
    showCurtainState();
  }
}

/* ---------- Reveal ---------- */
function showReveal() {
  state.phase = "reveal";
  saveDraft();
  showScreen("reveal");
  renderRevealStep();
}

function renderRevealStep() {
  const i = state.revealIndex;
  const total = state.entries.length;
  $("#reveal-counter").textContent = `${i + 1} / ${total}`;
  const entry = state.entries[i];
  const body = $("#reveal-body");
  body.innerHTML = "";
  if (!entry) return;

  const card = document.createElement("div");
  card.className = "reveal-step";
  card.innerHTML = `
    <p class="reveal-arrow">${escapeHtml(entry.from)} → <strong>${escapeHtml(entry.blamed)}</strong></p>
    <p class="reveal-alibi">"${escapeHtml(entry.alibi)}"</p>
  `;
  body.appendChild(card);

  const atEnd = i >= total - 1;
  $("#btn-reveal-next").textContent = "Next";
  $("#btn-reveal-prev").disabled = i === 0;
  $("#btn-show-all").hidden = !(atEnd && total > 1);
}

function revealNext() {
  if (state.revealIndex >= state.entries.length - 1) {
    showBoard();
    return;
  }
  state.revealIndex += 1;
  saveDraft();
  renderRevealStep();
}

function revealPrev() {
  if (state.revealIndex <= 0) return;
  state.revealIndex -= 1;
  saveDraft();
  renderRevealStep();
}

function showAllAccusations() {
  const body = $("#reveal-body");
  body.innerHTML = "";
  state.entries.forEach((entry) => {
    const row = document.createElement("div");
    row.className = "reveal-step reveal-compact";
    row.innerHTML = `
      <p class="reveal-arrow">${escapeHtml(entry.from)} → <strong>${escapeHtml(entry.blamed)}</strong></p>
      <p class="reveal-alibi">"${escapeHtml(entry.alibi)}"</p>
    `;
    body.appendChild(row);
  });
  $("#reveal-counter").textContent = `All · ${state.entries.length}`;
  $("#btn-reveal-next").textContent = "Next";
  $("#btn-show-all").hidden = true;
}

/* ---------- Board ---------- */
function showBoard() {
  state.phase = "board";
  clearDraft();
  showScreen("board");
  const counts = {};
  state.names.forEach((n) => {
    counts[n] = 0;
  });
  state.entries.forEach((e) => {
    if (counts[e.blamed] != null) counts[e.blamed] += 1;
  });
  const ranked = state.names
    .map((name) => ({ name, count: counts[name] || 0 }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  const topCount = ranked[0] ? ranked[0].count : 0;
  const mains = ranked.filter((r) => r.count === topCount && topCount > 0).map((r) => r.name);
  const sub = $("#board-sub");
  if (sub) {
    sub.textContent = mains.length
      ? "Main suspect: " + mains.join(", ") + " · " + topCount + (topCount === 1 ? " blame" : " blames")
      : "No blames this round";
  }
  const list = $("#board-list");
  list.innerHTML = "";
  let lastCount = null;
  let rank = 0;
  ranked.forEach((row, idx) => {
    if (row.count !== lastCount) {
      rank = idx + 1;
      lastCount = row.count;
    }
    const isMain = row.count === topCount && topCount > 0;
    const li = document.createElement("li");
    li.className = "board-row" + (isMain ? " board-main" : "");
    const label =
      isMain
        ? '<span class="board-tag">Main suspect</span>'
        : row.count === 0
          ? '<span class="board-tag soft">Somehow innocent</span>'
          : "";
    li.innerHTML = `
      <span class="board-rank">${rank}</span>
      <span class="board-name">${escapeHtml(row.name)}</span>
      <span class="board-count">${row.count}</span>
      ${label}
    `;
    list.appendChild(li);
  });
}

function anotherRound() {
  const names = [...state.names];
  state = emptyState();
  state.names = names;
  const p = randomPrompt();
  state.promptId = p.id;
  state.promptText = p.text;
  state.shuffledOnce = false;
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
  $("#name-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addName();
    }
  });
  $("#btn-names-start").addEventListener("click", () => {
    if (state.names.length < MIN_NAMES) return;
    state.promptId = "";
    state.promptText = "";
    state.shuffledOnce = false;
    startRound();
  });
  $("#btn-names-shuffle").addEventListener("click", shuffleNames);
  $("#btn-names-back").addEventListener("click", () => {
    clearDraft();
    showHome();
  });

  $("#btn-im").addEventListener("click", () => {
    state.pendingBlamed = "";
    revealAct();
  });
  $("#btn-turn-done").addEventListener("click", commitTurn);
  $("#btn-turn-shuffle").addEventListener("click", shufflePromptOnce);

  $("#btn-reveal-next").addEventListener("click", revealNext);
  $("#btn-reveal-prev").addEventListener("click", revealPrev);
  $("#btn-show-all").addEventListener("click", showAllAccusations);

  $("#btn-another").addEventListener("click", anotherRound);
  $("#btn-new-game").addEventListener("click", newGame);

  showHome();
  howto.maybeAutoShow();
}

init();
