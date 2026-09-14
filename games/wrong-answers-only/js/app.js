import { randomQuestion } from "./questions.js";
import { initHowto } from "./howto.js";

const DRAFT_KEY = "wrong-answers-only:draft:v1";
const MIN_NAMES = 3;
const MAX_NAMES = 8;
const NAME_MAX = 16;
const ANSWER_MAX = 100;

/** @typedef {{
 *  v: 1,
 *  names: string[],
 *  promptId: string,
 *  question: string,
 *  correct?: string,
 *  turnIndex: number,
 *  answers: Array<{ from: string, text: string }>,
 *  votes: Array<{ from: string, forIndex: number }>,
 *  pendingVote: number,
 *  phase: "home"|"names"|"question"|"pass"|"write"|"vote"|"podium",
 *  passMode: "write"|"vote",
 *  shuffledOnce: boolean,
 * }} WaoGame */

/** @type {WaoGame} */
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
    question: "",
    correct: undefined,
    turnIndex: 0,
    answers: [],
    votes: [],
    pendingVote: -1,
    phase: "home",
    passMode: "write",
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
  if (id === "pass" || id === "home" || id === "names" || id === "question") {
    clearPrivateTurnDom();
  }
  const screen = document.getElementById("screen-" + id);
  if (screen) screen.classList.add("active");
  window.scrollTo({ top: 0, behavior: "auto" });
}

function clearPrivateTurnDom() {
  const input = $("#write-input");
  if (input) input.value = "";
  const list = $("#vote-list");
  if (list) list.innerHTML = "";
  state.pendingVote = -1;
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

function normAnswer(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function isTooRight(text) {
  if (!state.correct) return false;
  return normAnswer(text) === normAnswer(state.correct);
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
    draft.phase !== "podium";
  resume.hidden = !resumable;
}

function resumeDraft() {
  const draft = loadDraft();
  if (!draft) return;
  state = { ...emptyState(), ...draft, v: 1 };
  // Privacy: never resume mid-write/vote with private UI — drop to pass for that turn
  if (state.phase === "write" || state.phase === "vote") {
    state.phase = "pass";
    state.pendingVote = -1;
    saveDraft();
  }
  routeFromPhase();
}

function routeFromPhase() {
  switch (state.phase) {
    case "names":
      showNames(true);
      break;
    case "question":
      showQuestion();
      break;
    case "pass":
      showPass();
      break;
    case "write":
      state.phase = "pass";
      state.passMode = "write";
      saveDraft();
      showPass();
      break;
    case "vote":
      state.phase = "pass";
      state.passMode = "vote";
      saveDraft();
      showPass();
      break;
    case "podium":
      showPodium();
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

/* ---------- Question ---------- */
function showQuestion() {
  state.phase = "question";
  if (!state.question) {
    const p = randomQuestion();
    state.promptId = p.id;
    state.question = p.q;
    state.correct = p.correct;
    state.shuffledOnce = false;
  }
  saveDraft();
  showScreen("question");
  $("#question-text").textContent = state.question;
  $("#btn-shuffle").hidden = state.shuffledOnce;
}

function shuffleQuestion() {
  if (state.shuffledOnce) return;
  const p = randomQuestion();
  state.promptId = p.id;
  state.question = p.q;
  state.correct = p.correct;
  state.shuffledOnce = true;
  saveDraft();
  $("#question-text").textContent = state.question;
  $("#btn-shuffle").hidden = true;
}

function startRoundFromQuestion() {
  state.turnIndex = 0;
  state.answers = [];
  state.votes = [];
  state.pendingVote = -1;
  state.passMode = "write";
  state.phase = "pass";
  saveDraft();
  showPass();
}

/* ---------- Pass curtain ---------- */
function showPass() {
  state.phase = "pass";
  state.pendingVote = -1;
  saveDraft();
  clearPrivateTurnDom();
  showScreen("pass");
  const name = currentName();
  $("#pass-title").innerHTML = `Pass to <strong>${escapeHtml(name)}</strong>`;
  $("#pass-sub").textContent = "Don't peek.";
  $("#btn-im").textContent = `I'm ${name}`;
}

function openAfterPass() {
  if (state.passMode === "vote") {
    showVote();
  } else {
    showWrite();
  }
}

/* ---------- Write ---------- */
function showWrite() {
  state.phase = "write";
  state.passMode = "write";
  saveDraft();
  showScreen("write");
  $("#write-question").textContent = state.question;
  $("#write-who").textContent = currentName();
  $("#write-progress").textContent = `${state.turnIndex + 1} / ${state.names.length}`;
  const input = $("#write-input");
  input.value = "";
  input.focus();
  updateWriteDone();
}

function updateWriteDone() {
  const v = ($("#write-input").value || "").trim();
  $("#btn-write-done").disabled = v.length < 1;
  const n = ($("#write-input").value || "").length;
  $("#write-count").textContent = `${n}/${ANSWER_MAX}`;
}

function commitWrite() {
  const text = ($("#write-input").value || "").trim().slice(0, ANSWER_MAX);
  if (!text) return;
  state.answers.push({ from: currentName(), text });
  clearPrivateTurnDom();
  if (state.turnIndex + 1 >= state.names.length) {
    // All wrote — start vote phase with curtain
    state.turnIndex = 0;
    state.votes = [];
    state.passMode = "vote";
    state.phase = "pass";
    saveDraft();
    showPass();
  } else {
    state.turnIndex += 1;
    state.passMode = "write";
    state.phase = "pass";
    saveDraft();
    showPass();
  }
}

/* ---------- Vote (always curtain) ---------- */
function showVote() {
  state.phase = "vote";
  state.passMode = "vote";
  state.pendingVote = -1;
  saveDraft();
  showScreen("vote");
  $("#vote-question").textContent = state.question;
  $("#vote-who").textContent = currentName();
  $("#vote-progress").textContent = `${state.turnIndex + 1} / ${state.names.length}`;
  const list = $("#vote-list");
  list.innerHTML = "";
  const me = currentName();
  // Shuffle display order but keep original indices for voting
  const order = state.answers.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  order.forEach((idx) => {
    const ans = state.answers[idx];
    if (ans.from === me) return; // cannot self-vote
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pick-row";
    btn.dataset.index = String(idx);
    // Hide author until after vote (podium)
    btn.textContent = ans.text;
    btn.addEventListener("click", () => {
      state.pendingVote = idx;
      $$("#vote-list .pick-row").forEach((el) =>
        el.classList.toggle("selected", el.dataset.index === String(idx))
      );
      $("#btn-vote-done").disabled = false;
    });
    list.appendChild(btn);
  });
  $("#btn-vote-done").disabled = true;
}

function commitVote() {
  if (state.pendingVote < 0) return;
  state.votes.push({ from: currentName(), forIndex: state.pendingVote });
  state.pendingVote = -1;
  clearPrivateTurnDom();
  if (state.turnIndex + 1 >= state.names.length) {
    state.phase = "podium";
    saveDraft();
    showPodium();
  } else {
    state.turnIndex += 1;
    state.passMode = "vote";
    state.phase = "pass";
    saveDraft();
    showPass();
  }
}

/* ---------- Podium ---------- */
function showPodium() {
  state.phase = "podium";
  clearDraft();
  showScreen("podium");
  $("#podium-question").textContent = state.question;

  const tallies = state.answers.map((ans, i) => {
    const tooRight = isTooRight(ans.text);
    let votes = state.votes.filter((v) => v.forIndex === i).length;
    if (tooRight) votes = 0; // forced 0 — cannot place 1st
    return { index: i, from: ans.from, text: ans.text, votes, tooRight };
  });

  tallies.sort((a, b) => {
    // Too-right sinks below anyone with real votes; among zeros keep relative
    if (a.tooRight !== b.tooRight) return a.tooRight ? 1 : -1;
    return b.votes - a.votes || a.from.localeCompare(b.from);
  });

  const topVotes = tallies.find((t) => !t.tooRight)?.votes ?? 0;
  const list = $("#podium-list");
  list.innerHTML = "";
  let lastVotes = null;
  let rank = 0;
  tallies.forEach((row, idx) => {
    if (row.votes !== lastVotes) {
      rank = idx + 1;
      lastVotes = row.votes;
    }
    const isFirst = !row.tooRight && row.votes === topVotes && topVotes > 0 && rank === 1;
    const li = document.createElement("li");
    li.className = "board-row" + (isFirst ? " board-main" : "");
    let tag = "";
    if (row.tooRight) {
      tag = '<span class="board-tag">Too right</span>';
    } else if (row.votes === 0) {
      tag = '<span class="board-tag soft">Nobody bought it</span>';
    }
    li.innerHTML = `
      <span class="board-rank">${rank}</span>
      <span class="board-name">${escapeHtml(row.text)}</span>
      <span class="board-count">${row.votes}</span>
      <span class="board-author">${escapeHtml(row.from)}</span>
      ${tag}
    `;
    list.appendChild(li);
  });
}

function anotherRound() {
  const names = [...state.names];
  state = emptyState();
  state.names = names;
  state.phase = "question";
  const p = randomQuestion();
  state.promptId = p.id;
  state.question = p.q;
  state.correct = p.correct;
  state.shuffledOnce = false;
  saveDraft();
  showQuestion();
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
    state.question = "";
    state.correct = undefined;
    state.shuffledOnce = false;
    showQuestion();
  });
  $("#btn-names-back").addEventListener("click", () => {
    clearDraft();
    showHome();
  });

  $("#btn-shuffle").addEventListener("click", shuffleQuestion);
  $("#btn-question-go").addEventListener("click", startRoundFromQuestion);

  $("#btn-im").addEventListener("click", openAfterPass);

  $("#btn-write-done").addEventListener("click", commitWrite);
  $("#write-input").addEventListener("input", updateWriteDone);

  $("#btn-vote-done").addEventListener("click", commitVote);

  $("#btn-another").addEventListener("click", anotherRound);
  $("#btn-new-game").addEventListener("click", newGame);

  showHome();
  howto.maybeAutoShow();
}

init();
