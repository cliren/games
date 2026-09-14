/**
 * Most Likely Pass — hotseat pick loop + reveal + Wrapped.
 * Seat order is fixed; picks are votes, not pass targets.
 */
import { pickPrompt } from "./prompts.js";
import { initHowto } from "./howto.js";

const DRAFT_KEY = "most-likely-pass:draft:v1";
const MAX_PLAYERS = 8;
const MIN_PLAYERS = 3;

/** @typedef {{ v:1, names:string[], promptId:string, promptText:string, picks:{from:string,to:string}[], phase:string, turnIndex:number, revealIndex:number, shuffled?:boolean }} State */

/** @type {State} */
let state = freshState();

/** @type {string|null} */
let selectedPick = null;
let shuffleUsed = false;

const $ = (id) => document.getElementById(id);

const screens = {
  home: $("screen-home"),
  names: $("screen-names"),
  prompt: $("screen-prompt"),
  pass: $("screen-pass"),
  pick: $("screen-pick"),
  reveal: $("screen-reveal"),
  wrapped: $("screen-wrapped"),
};

function freshState() {
  return {
    v: 1,
    names: [],
    promptId: "",
    promptText: "",
    picks: [],
    phase: "home",
    turnIndex: 0,
    revealIndex: 0,
    shuffled: false,
  };
}

function saveDraft() {
  try {
    if (state.phase === "home" || state.phase === "names") {
      localStorage.removeItem(DRAFT_KEY);
      return;
    }
    localStorage.setItem(DRAFT_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.v !== 1 || !Array.isArray(data.names)) return null;
    return data;
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

function showScreen(name) {
  Object.entries(screens).forEach(([key, el]) => {
    if (!el) return;
    el.classList.toggle("active", key === name);
  });
  // Unmount private pick UI when leaving pick (curtain privacy)
  if (name !== "pick") {
    $("pick-list").innerHTML = "";
    selectedPick = null;
  }
}

function currentPlayer() {
  return state.names[state.turnIndex] || "";
}

/* —— Home —— */
function renderHome() {
  showScreen("home");
  const draft = loadDraft();
  const resume = $("btn-resume");
  const resumable =
    draft &&
    Array.isArray(draft.names) &&
    draft.names.length >= MIN_PLAYERS &&
    draft.phase &&
    draft.phase !== "home" &&
    draft.phase !== "names" &&
    draft.phase !== "wrapped";
  resume.hidden = !resumable;
  state.phase = "home";
}

/* —— Names —— */
function renderNames() {
  showScreen("names");
  state.phase = "names";
  const chips = $("name-chips");
  chips.innerHTML = "";
  state.names.forEach((name, i) => {
    const chip = document.createElement("div");
    chip.className = "chip";
    const label = document.createElement("span");
    label.textContent = name;
    const rm = document.createElement("button");
    rm.type = "button";
    rm.className = "chip-remove";
    rm.setAttribute("aria-label", `Remove ${name}`);
    rm.textContent = "×";
    rm.addEventListener("click", () => {
      state.names.splice(i, 1);
      renderNames();
    });
    chip.append(label, rm);
    chips.appendChild(chip);
  });

  const n = state.names.length;
  const hint = $("names-hint");
  const go = $("btn-names-go");
  if (n < MIN_PLAYERS) {
    hint.textContent = "Add at least 3 names";
    hint.classList.add("warn");
    go.disabled = true;
  } else if (n >= MAX_PLAYERS) {
    hint.textContent = `${n} players · max ${MAX_PLAYERS}`;
    hint.classList.remove("warn");
    go.disabled = false;
  } else {
    hint.textContent = `${n} players`;
    hint.classList.remove("warn");
    go.disabled = false;
  }
  $("btn-add-name").disabled = n >= MAX_PLAYERS;
  $("name-input").disabled = n >= MAX_PLAYERS;
}

function addName() {
  const input = $("name-input");
  const raw = (input.value || "").trim().replace(/\s+/g, " ");
  if (!raw) return;
  if (raw.length > 16) return;
  const key = raw.toLowerCase();
  if (state.names.some((n) => n.toLowerCase() === key)) {
    input.value = "";
    input.focus();
    return;
  }
  if (state.names.length >= MAX_PLAYERS) return;
  state.names.push(raw);
  input.value = "";
  renderNames();
  input.focus();
}

/* —— Prompt —— */
function startPrompt(keepNames) {
  const names = keepNames ? state.names.slice() : state.names.slice();
  const p = pickPrompt();
  state = {
    v: 1,
    names,
    promptId: p.id,
    promptText: p.text,
    picks: [],
    phase: "prompt",
    turnIndex: 0,
    revealIndex: 0,
    shuffled: false,
  };
  shuffleUsed = false;
  selectedPick = null;
  renderPrompt();
  saveDraft();
}

function renderPrompt() {
  showScreen("prompt");
  state.phase = "prompt";
  $("prompt-text").textContent = state.promptText;
  $("btn-prompt-shuffle").hidden = !!state.shuffled || shuffleUsed;
  saveDraft();
}

/* —— Pass (curtain) —— */
function goPass() {
  state.phase = "pass";
  selectedPick = null;
  showScreen("pass");
  const name = currentPlayer();
  $("pass-title").textContent = `Pass to ${name}`;
  $("btn-pass-ready").textContent = `I’m ${name}`;
  saveDraft();
}

/* —— Pick —— */
function renderPick() {
  state.phase = "pick";
  selectedPick = null;
  showScreen("pick");
  const me = currentPlayer();
  $("pick-who").textContent = me;
  $("pick-progress").textContent = `${state.turnIndex + 1} / ${state.names.length}`;
  $("pick-prompt").textContent = state.promptText;
  $("pick-empty").textContent = "Who fits?";

  const list = $("pick-list");
  list.innerHTML = "";
  state.names.forEach((name) => {
    if (name === me) return; // no self-pick
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "name-row";
    btn.setAttribute("role", "option");
    btn.setAttribute("aria-selected", "false");
    btn.textContent = name;
    btn.addEventListener("click", () => {
      selectedPick = name;
      list.querySelectorAll(".name-row").forEach((el) => {
        const on = el.textContent === name;
        el.classList.toggle("selected", on);
        el.setAttribute("aria-selected", on ? "true" : "false");
      });
      $("btn-pick-done").disabled = false;
    });
    list.appendChild(btn);
  });
  $("btn-pick-done").disabled = true;
  saveDraft();
}

function commitPick() {
  if (!selectedPick) return;
  const from = currentPlayer();
  if (selectedPick === from) return;
  state.picks.push({ from, to: selectedPick });
  selectedPick = null;
  $("pick-list").innerHTML = ""; // unmount before curtain

  if (state.turnIndex + 1 >= state.names.length) {
    state.turnIndex = 0;
    state.revealIndex = 0;
    state.phase = "reveal";
    renderReveal();
  } else {
    state.turnIndex += 1;
    goPass();
  }
  saveDraft();
}

/* —— Reveal —— */
function renderReveal() {
  showScreen("reveal");
  state.phase = "reveal";
  const total = state.picks.length;
  const i = state.revealIndex;
  $("reveal-counter").textContent = `${i + 1} / ${total}`;
  $("reveal-all").hidden = true;
  $("btn-show-all").hidden = true;

  const pick = state.picks[i];
  if (pick) {
    $("reveal-from").textContent = pick.from;
    $("reveal-to").textContent = pick.to;
  }

  $("btn-reveal-prev").disabled = i === 0;
  const next = $("btn-reveal-next");
  if (i >= total - 1) {
    next.textContent = "Wrapped";
    $("btn-show-all").hidden = total <= 1;
  } else {
    next.textContent = "Next";
  }
  saveDraft();
}

function showAllPicks() {
  const ul = $("reveal-all");
  ul.innerHTML = "";
  state.picks.forEach((p) => {
    const li = document.createElement("li");
    const from = document.createElement("span");
    from.className = "from";
    from.textContent = p.from;
    const to = document.createElement("span");
    to.className = "to";
    to.textContent = `→ ${p.to}`;
    li.append(from, to);
    ul.appendChild(li);
  });
  ul.hidden = false;
  $("btn-show-all").hidden = true;
}

/* —— Wrapped —— */
function computeWrapped() {
  /** @type {Record<string, number>} */
  const counts = {};
  state.names.forEach((n) => {
    counts[n] = 0;
  });
  state.picks.forEach((p) => {
    if (counts[p.to] != null) counts[p.to] += 1;
  });

  const entries = state.names.map((n) => ({ name: n, n: counts[n] }));
  const max = Math.max(...entries.map((e) => e.n));
  const min = Math.min(...entries.map((e) => e.n));
  const magnets = entries.filter((e) => e.n === max).map((e) => e.name);
  const radars = entries.filter((e) => e.n === min).map((e) => e.name);

  /** @type {string[]} */
  const mutuals = [];
  const seen = new Set();
  for (const p of state.picks) {
    const key = [p.from, p.to].sort().join("\0");
    if (seen.has(key)) continue;
    const reverse = state.picks.find((q) => q.from === p.to && q.to === p.from);
    if (reverse) {
      seen.add(key);
      mutuals.push(`${p.from} ↔ ${p.to}`);
    }
  }

  return { counts, magnets, radars, mutuals, max };
}

function renderWrapped() {
  showScreen("wrapped");
  state.phase = "wrapped";
  $("wrapped-prompt").textContent = state.promptText;

  const { counts, magnets, radars, mutuals, max } = computeWrapped();
  $("stat-magnet").textContent = magnets.join(", ");
  $("stat-radar").textContent = radars.join(", ");
  $("stat-mutuals").textContent =
    mutuals.length ? mutuals.join(" · ") : "None this round";

  const tally = $("tally-list");
  tally.innerHTML = "";
  const sorted = state.names
    .slice()
    .sort((a, b) => counts[b] - counts[a] || a.localeCompare(b));
  sorted.forEach((name) => {
    const li = document.createElement("li");
    const label = document.createElement("span");
    label.textContent = name;
    const count = document.createElement("span");
    count.className = "caption";
    count.textContent = String(counts[name]);
    const bar = document.createElement("div");
    bar.className = "tally-bar";
    const fill = document.createElement("i");
    fill.style.width = max > 0 ? `${(counts[name] / max) * 100}%` : "0%";
    bar.appendChild(fill);
    li.append(label, count, bar);
    tally.appendChild(li);
  });

  clearDraft();
}

/* —— Resume —— */
function resumeFromDraft(draft) {
  state = {
    v: 1,
    names: draft.names.slice(),
    promptId: draft.promptId || "",
    promptText: draft.promptText || "",
    picks: Array.isArray(draft.picks) ? draft.picks.slice() : [],
    phase: draft.phase,
    turnIndex: draft.turnIndex | 0,
    revealIndex: draft.revealIndex | 0,
    shuffled: !!draft.shuffled,
  };
  shuffleUsed = !!state.shuffled;
  selectedPick = null;

  // Never resume onto a private pick screen — land on curtain for that seat
  if (state.phase === "pick") {
    goPass();
    return;
  }
  switch (state.phase) {
    case "prompt":
      renderPrompt();
      break;
    case "pass":
      goPass();
      break;
    case "reveal":
      renderReveal();
      break;
    case "wrapped":
      renderWrapped();
      break;
    default:
      renderHome();
  }
}

/* —— Wire —— */
function init() {
  const howto = initHowto({
    overlay: $("howto-overlay"),
    sheet: $("howto-sheet"),
    gotItBtn: $("btn-howto-gotit"),
    closeBtn: $("btn-howto-close"),
    openBtn: $("btn-howto"),
  });

  $("btn-start").addEventListener("click", () => {
    state = freshState();
    clearDraft();
    renderNames();
  });

  $("btn-resume").addEventListener("click", () => {
    const draft = loadDraft();
    if (draft) resumeFromDraft(draft);
  });

  $("btn-add-name").addEventListener("click", addName);
  $("name-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addName();
    }
  });

  $("btn-names-back").addEventListener("click", () => {
    renderHome();
  });

  $("btn-names-go").addEventListener("click", () => {
    if (state.names.length < MIN_PLAYERS) return;
    startPrompt(true);
  });

  $("btn-prompt-go").addEventListener("click", () => {
    state.turnIndex = 0;
    state.picks = [];
    goPass();
  });

  $("btn-prompt-shuffle").addEventListener("click", () => {
    if (state.shuffled || shuffleUsed) return;
    const p = pickPrompt();
    state.promptId = p.id;
    state.promptText = p.text;
    state.shuffled = true;
    shuffleUsed = true;
    renderPrompt();
  });

  $("btn-pass-ready").addEventListener("click", () => {
    renderPick();
  });

  $("btn-pick-done").addEventListener("click", () => {
    commitPick();
  });

  $("btn-reveal-prev").addEventListener("click", () => {
    if (state.revealIndex > 0) {
      state.revealIndex -= 1;
      renderReveal();
    }
  });

  $("btn-reveal-next").addEventListener("click", () => {
    if (state.revealIndex >= state.picks.length - 1) {
      renderWrapped();
      return;
    }
    state.revealIndex += 1;
    renderReveal();
  });

  $("btn-show-all").addEventListener("click", showAllPicks);

  $("btn-another").addEventListener("click", () => {
    const names = state.names.slice();
    state = freshState();
    state.names = names;
    startPrompt(true);
  });

  $("btn-new-game").addEventListener("click", () => {
    state = freshState();
    clearDraft();
    renderNames();
  });

  renderHome();
  howto.maybeAutoShow();
}

init();
