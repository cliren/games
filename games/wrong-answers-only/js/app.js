import { randomQuestion } from "./questions.js";
import { initHowto } from "./howto.js";
import { generateFunNames, defaultPlayerCount } from "../../shared/fun-names.js";

const DRAFT_KEY = "wrong-answers-only:draft:v1";
const MIN_NAMES = 2;
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
 *  phase: "home"|"names"|"write"|"vote"|"podium",
 *  curtainOpen: boolean,
 *  shuffledOnce: boolean,
 * }} WaoGame */

/** @type {WaoGame} */
let state = emptyState();
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
    curtainOpen: false,
    shuffledOnce: false,
  };
}

function saveDraft() {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
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
  try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
}

function showScreen(id) {
  $$(".screen").forEach((el) => el.classList.remove("active"));
  if (id !== "write-turn" && id !== "vote-turn") clearPrivateDom();
  const screen = document.getElementById("screen-" + id);
  if (screen) screen.classList.add("active");
  window.scrollTo({ top: 0, behavior: "auto" });
}

function clearPrivateDom() {
  const input = $("#write-input");
  if (input) input.value = "";
  const list = $("#vote-list");
  if (list) list.innerHTML = "";
  state.pendingVote = -1;
  ["write-curtain", "write-act", "vote-curtain", "vote-act"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.hidden = true;
  });
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
  return String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function isTooRight(text) {
  if (!state.correct) return false;
  return normAnswer(text) === normAnswer(state.correct);
}

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
  if (["question", "pass"].includes(state.phase)) {
    state.phase = state.passMode === "vote" ? "vote" : "write";
    state.curtainOpen = state.turnIndex > 0;
  }
  if (state.phase === "write" || state.phase === "vote") {
    // Privacy: land on curtain for that seat if not P1
    state.curtainOpen = state.turnIndex > 0;
    state.pendingVote = -1;
  }
  routeFromPhase();
}

function routeFromPhase() {
  switch (state.phase) {
    case "names":
      showNames(true);
      break;
    case "write":
      showWriteTurn();
      break;
    case "vote":
      showVoteTurn();
      break;
    case "podium":
      showPodium();
      break;
    default:
      showHome();
  }
}

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

function ensureQuestion() {
  if (!state.question) {
    const p = randomQuestion();
    state.promptId = p.id;
    state.question = p.q;
    state.correct = p.correct;
    state.shuffledOnce = false;
  }
}

function startRound() {
  ensureQuestion();
  state.turnIndex = 0;
  state.answers = [];
  state.votes = [];
  state.pendingVote = -1;
  state.phase = "write";
  state.curtainOpen = false; // P1 skips
  saveDraft();
  showWriteTurn();
}

function shuffleQuestionOnce() {
  if (state.shuffledOnce) return;
  const p = randomQuestion();
  state.promptId = p.id;
  state.question = p.q;
  state.correct = p.correct;
  state.shuffledOnce = true;
  saveDraft();
  $("#write-question").textContent = state.question;
  $("#btn-q-shuffle").hidden = true;
}

/* ---------- Write (curtain before typing; P1 skip) ---------- */
function showWriteTurn() {
  state.phase = "write";
  ensureQuestion();
  saveDraft();
  showScreen("write-turn");
  if (state.turnIndex === 0 || !state.curtainOpen) {
    if (state.turnIndex === 0) state.curtainOpen = false;
    if (state.curtainOpen) {
      showWriteCurtain();
    } else {
      revealWrite();
    }
  } else {
    showWriteCurtain();
  }
}

function showWriteCurtain() {
  state.curtainOpen = true;
  saveDraft();
  const name = currentName();
  $("#write-curtain").hidden = false;
  $("#write-act").hidden = true;
  $("#write-pass-title").innerHTML = `Pass to <strong>${escapeHtml(name)}</strong>`;
  $("#write-pass-sub").textContent = "Don't peek.";
  $("#btn-write-im").textContent = `I'm ${name}`;
  const input = $("#write-input");
  if (input) input.value = "";
}

function revealWrite() {
  state.curtainOpen = false;
  saveDraft();
  $("#write-curtain").hidden = true;
  $("#write-act").hidden = false;
  $("#write-question").textContent = state.question;
  $("#write-who").textContent = currentName();
  $("#write-progress").textContent = `${state.turnIndex + 1} / ${state.names.length}`;
  const canShuffle = state.turnIndex === 0 && !state.shuffledOnce && state.answers.length === 0;
  $("#btn-q-shuffle").hidden = !canShuffle;
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
  if (state.turnIndex + 1 >= state.names.length) {
    state.turnIndex = 0;
    state.votes = [];
    state.phase = "vote";
    state.curtainOpen = false; // first voter skips
    saveDraft();
    showVoteTurn();
  } else {
    state.turnIndex += 1;
    state.curtainOpen = true;
    state.phase = "write";
    saveDraft();
    showWriteCurtain();
  }
}

/* ---------- Vote (curtain as state; tap-commit; P1 skip) ---------- */
function showVoteTurn() {
  state.phase = "vote";
  saveDraft();
  showScreen("vote-turn");
  if (state.turnIndex === 0) {
    state.curtainOpen = false;
    revealVote();
  } else if (state.curtainOpen) {
    showVoteCurtain();
  } else {
    revealVote();
  }
}

function showVoteCurtain() {
  state.curtainOpen = true;
  state.pendingVote = -1;
  saveDraft();
  const list = $("#vote-list");
  if (list) list.innerHTML = "";
  const name = currentName();
  $("#vote-curtain").hidden = false;
  $("#vote-act").hidden = true;
  $("#vote-pass-title").innerHTML = `Pass to <strong>${escapeHtml(name)}</strong>`;
  $("#vote-pass-sub").textContent = "Don't peek.";
  $("#btn-vote-im").textContent = `I'm ${name}`;
}

function revealVote() {
  state.curtainOpen = false;
  state.pendingVote = -1;
  saveDraft();
  $("#vote-curtain").hidden = true;
  $("#vote-act").hidden = false;
  $("#vote-question").textContent = state.question;
  $("#vote-who").textContent = currentName();
  $("#vote-progress").textContent = `${state.turnIndex + 1} / ${state.names.length}`;
  const list = $("#vote-list");
  list.innerHTML = "";
  const me = currentName();
  const order = state.answers.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  order.forEach((idx) => {
    const ans = state.answers[idx];
    if (ans.from === me) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pick-row";
    btn.dataset.index = String(idx);
    btn.textContent = ans.text;
    btn.addEventListener("click", () => {
      state.pendingVote = idx;
      $$("#vote-list .pick-row").forEach((el) =>
        el.classList.toggle("selected", el.dataset.index === String(idx))
      );
      // Tap-commit
      commitVote();
    });
    list.appendChild(btn);
  });
  $("#btn-vote-done").hidden = true;
  $("#btn-vote-done").disabled = true;
}

function commitVote() {
  if (state.pendingVote < 0) return;
  state.votes.push({ from: currentName(), forIndex: state.pendingVote });
  state.pendingVote = -1;
  const list = $("#vote-list");
  if (list) list.innerHTML = "";
  if (state.turnIndex + 1 >= state.names.length) {
    state.phase = "podium";
    saveDraft();
    showPodium();
  } else {
    state.turnIndex += 1;
    state.curtainOpen = true;
    state.phase = "vote";
    saveDraft();
    showVoteCurtain();
  }
}

function showPodium() {
  state.phase = "podium";
  clearDraft();
  showScreen("podium");
  $("#podium-question").textContent = state.question;

  const tallies = state.answers.map((ans, i) => {
    const tooRight = isTooRight(ans.text);
    let votes = state.votes.filter((v) => v.forIndex === i).length;
    if (tooRight) votes = 0;
    return { index: i, from: ans.from, text: ans.text, votes, tooRight };
  });

  tallies.sort((a, b) => {
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
    li.className = "board-row" + (isFirst ? " board-main" : "") + (row.tooRight ? " too-right" : "");
    let tag = "";
    if (row.tooRight) {
      tag = '<span class="board-tag too-right-tag">Too right</span>';
    } else if (isFirst) {
      tag = '<span class="board-tag winner">Winner</span>';
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
  const p = randomQuestion();
  state.promptId = p.id;
  state.question = p.q;
  state.correct = p.correct;
  state.shuffledOnce = false;
  startRound();
}

function newGame() {
  clearDraft();
  state = emptyState();
  showNames(false);
}

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
    if (e.key === "Enter") { e.preventDefault(); addName(); }
  });
  $("#btn-names-start").addEventListener("click", () => {
    if (state.names.length < MIN_NAMES) return;
    state.promptId = "";
    state.question = "";
    state.correct = undefined;
    state.shuffledOnce = false;
    startRound();
  });
  $("#btn-names-shuffle").addEventListener("click", shuffleNames);
  $("#btn-names-back").addEventListener("click", () => {
    clearDraft();
    showHome();
  });

  $("#btn-write-im").addEventListener("click", revealWrite);
  $("#btn-q-shuffle").addEventListener("click", shuffleQuestionOnce);
  $("#btn-write-done").addEventListener("click", commitWrite);
  $("#write-input").addEventListener("input", updateWriteDone);
  $("#write-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!$("#btn-write-done").disabled) commitWrite();
    }
  });

  $("#btn-vote-im").addEventListener("click", revealVote);
  $("#btn-vote-done").addEventListener("click", commitVote);

  $("#btn-another").addEventListener("click", anotherRound);
  $("#btn-new-game").addEventListener("click", newGame);

  showHome();
  howto.maybeAutoShow();
}

init();
