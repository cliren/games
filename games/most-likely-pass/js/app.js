/**
 * Most Likely Pass — curtain-as-state, tap-commit, auto Wrapped, fun names.
 */
import { pickPrompt } from "./prompts.js";
import { initHowto } from "./howto.js";
import { generateFunNames, generateOneFunName, defaultPlayerCount } from "../../shared/fun-names.js";

const DRAFT_KEY = "most-likely-pass:draft:v1";
const MAX_PLAYERS = 8;
const MIN_PLAYERS = 2;

/** @typedef {{ v:1, names:string[], promptId:string, promptText:string, picks:{from:string,to:string}[], phase:string, turnIndex:number, revealIndex:number, curtainOpen:boolean, shuffled?:boolean }} State */

/** @type {State} */
let state = freshState();
/** @type {string|null} */
let selectedPick = null;
let shuffleUsed = false;

const $ = (id) => document.getElementById(id);

const screens = {
  home: $("screen-home"),
  names: $("screen-names"),
  turn: $("screen-turn"),
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
    curtainOpen: false,
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
  if (name !== "turn") {
    const list = $("pick-list");
    if (list) list.innerHTML = "";
    selectedPick = null;
    const curtain = $("turn-curtain");
    const act = $("turn-act");
    if (curtain) curtain.hidden = true;
    if (act) act.hidden = true;
  }
}

function currentPlayer() {
  return state.names[state.turnIndex] || "";
}

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

function renderNames() {
  showScreen("names");
  state.phase = "names";
  const chips = $("name-chips");
  chips.innerHTML = "";
  state.names.forEach((name, i) => {
    const chip = document.createElement("div");
    chip.className = "chip chip--edit";
    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = 16;
    input.value = name;
    input.setAttribute("aria-label", `Player ${i + 1} name`);
    input.addEventListener("change", () => {
      let v = (input.value || "").trim().slice(0, 16);
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
    });
    const rm = document.createElement("button");
    rm.type = "button";
    rm.className = "chip-remove";
    rm.setAttribute("aria-label", `Remove ${name}`);
    rm.textContent = "×";
    rm.addEventListener("click", () => {
      if (state.names.length <= MIN_PLAYERS) return;
      state.names.splice(i, 1);
      renderNames();
    });
    chip.append(input, rm);
    chips.appendChild(chip);
  });

  const n = state.names.length;
  const hint = $("names-hint");
  const go = $("btn-names-go");
  if (n < MIN_PLAYERS) {
    hint.textContent = "Add at least 2 names · or Shuffle";
    hint.classList.add("warn");
    go.disabled = true;
  } else if (n >= MAX_PLAYERS) {
    hint.textContent = `${n} players · max ${MAX_PLAYERS}`;
    hint.classList.remove("warn");
    go.disabled = false;
  } else {
    hint.textContent = `${n} players · Shuffle for new fun names`;
    hint.classList.remove("warn");
    go.disabled = false;
  }
  $("btn-add-name").disabled = n >= MAX_PLAYERS;
}

function addName() {
  if (state.names.length >= MAX_PLAYERS) return;
  state.names.push(generateOneFunName(state.names));
  renderNames();
}

function shuffleNames() {
  const count = Math.max(state.names.length, defaultPlayerCount());
  state.names = generateFunNames(Math.min(count, MAX_PLAYERS));
  renderNames();
}

function startRound(keepPrompt = false) {
  if (!keepPrompt || !state.promptText) {
    const p = pickPrompt();
    state.promptId = p.id;
    state.promptText = p.text;
    state.shuffled = false;
    shuffleUsed = false;
  }
  state.picks = [];
  state.turnIndex = 0;
  state.revealIndex = 0;
  state.curtainOpen = false;
  state.phase = "turn";
  selectedPick = null;
  saveDraft();
  showTurn();
}

function showTurn() {
  state.phase = "turn";
  showScreen("turn");
  if (state.turnIndex === 0) {
    state.curtainOpen = false;
    revealPick();
  } else if (state.curtainOpen) {
    showCurtainState();
  } else {
    revealPick();
  }
  saveDraft();
}

function showCurtainState() {
  state.curtainOpen = true;
  selectedPick = null;
  const list = $("pick-list");
  if (list) list.innerHTML = "";
  $("turn-curtain").hidden = false;
  $("turn-act").hidden = true;
  const name = currentPlayer();
  $("pass-title").textContent = `Pass to ${name}`;
  $("btn-pass-ready").textContent = `I’m ${name}`;
  saveDraft();
}

function revealPick() {
  state.curtainOpen = false;
  selectedPick = null;
  const curtain = $("turn-curtain");
  const act = $("turn-act");
  if (curtain) {
    curtain.hidden = true;
    curtain.setAttribute("hidden", "");
  }
  if (act) {
    act.hidden = false;
    act.removeAttribute("hidden");
  }

  const me = currentPlayer();
  $("pick-who").textContent = me;
  $("pick-progress").textContent = `${state.turnIndex + 1} / ${state.names.length}`;
  $("pick-prompt").textContent = state.promptText;
  $("pick-empty").textContent = "Who fits? Tap to pick.";

  const canShuffle = state.turnIndex === 0 && !state.shuffled && !shuffleUsed && state.picks.length === 0;
  $("btn-turn-shuffle").hidden = !canShuffle;

  const list = $("pick-list");
  list.innerHTML = "";
  state.names.forEach((name) => {
    if (name === me) return;
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
      // Tap-commit
      commitPick();
    });
    list.appendChild(btn);
  });
  $("btn-pick-done").hidden = true;
  $("btn-pick-done").disabled = true;
  // Phone: pick UI was below fold after curtain — bring act into view
  requestAnimationFrame(() => {
    const act = $("turn-act");
    if (act && !act.hidden) {
      act.scrollIntoView({ block: "start", behavior: "smooth" });
    }
  });
  saveDraft();
}

function commitPick() {
  if (!selectedPick) return;
  const from = currentPlayer();
  if (selectedPick === from) return;
  state.picks.push({ from, to: selectedPick });
  selectedPick = null;
  $("pick-list").innerHTML = "";

  if (state.turnIndex + 1 >= state.names.length) {
    state.revealIndex = 0;
    state.phase = "reveal";
    state.curtainOpen = false;
    renderReveal();
  } else {
    state.turnIndex += 1;
    state.curtainOpen = true;
    state.phase = "turn";
    showCurtainState();
  }
  saveDraft();
}

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
  $("btn-reveal-next").textContent = "Next";
  if (i >= total - 1) {
    $("btn-show-all").hidden = total <= 1;
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

  return { counts, magnets, radars, mutuals, max, min };
}

function renderWrapped() {
  showScreen("wrapped");
  state.phase = "wrapped";
  $("wrapped-prompt").textContent = state.promptText;

  const { counts, magnets, radars, mutuals, max, min } = computeWrapped();
  // Fail-soft when no picks (max === 0) or empty magnet list
  if (!magnets.length || max === 0) {
    $("stat-magnet").textContent = "Nobody this round";
  } else if (magnets.length > 1) {
    $("stat-magnet").textContent =
      "Tie · " + magnets.join(", ") + " · " + max + " each";
  } else {
    $("stat-magnet").textContent =
      magnets[0] + " · " + max + " pick" + (max === 1 ? "" : "s");
  }
  if (!radars.length || max === 0) {
    $("stat-radar").textContent = "Nobody this round";
  } else if (radars.length > 1) {
    $("stat-radar").textContent =
      "Tie · " + radars.join(", ") + " · " + min + " each";
  } else {
    $("stat-radar").textContent =
      radars[0] + " · " + min + " pick" + (min === 1 ? "" : "s");
  }
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
    curtainOpen: !!draft.curtainOpen,
    shuffled: !!draft.shuffled,
  };
  shuffleUsed = !!state.shuffled;
  selectedPick = null;

  if (["prompt", "pass", "pick"].includes(state.phase)) {
    state.phase = "turn";
    state.curtainOpen = state.turnIndex > 0;
  }
  if (state.phase === "turn") {
    showTurn();
    return;
  }
  switch (state.phase) {
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
    state.names = generateFunNames(defaultPlayerCount());
    renderNames();
  });

  $("btn-resume").addEventListener("click", () => {
    const draft = loadDraft();
    if (draft) resumeFromDraft(draft);
  });

  $("btn-add-name").addEventListener("click", addName);

  $("btn-names-back").addEventListener("click", () => renderHome());
  $("btn-names-shuffle").addEventListener("click", shuffleNames);
  $("btn-names-go").addEventListener("click", () => {
    if (state.names.length < MIN_PLAYERS) return;
    startRound(false);
  });

  $("btn-pass-ready").addEventListener("click", () => revealPick());

  $("btn-turn-shuffle").addEventListener("click", () => {
    if (state.shuffled || shuffleUsed) return;
    const p = pickPrompt();
    state.promptId = p.id;
    state.promptText = p.text;
    state.shuffled = true;
    shuffleUsed = true;
    $("pick-prompt").textContent = state.promptText;
    $("btn-turn-shuffle").hidden = true;
    saveDraft();
  });

  $("btn-pick-done").addEventListener("click", commitPick);

  $("btn-reveal-prev").addEventListener("click", () => {
    if (state.revealIndex > 0) {
      state.revealIndex -= 1;
      renderReveal();
    }
  });

  $("btn-reveal-next").addEventListener("click", () => {
    // Last Next → auto Wrapped (no separate See Wrapped)
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
    startRound(false);
  });

  $("btn-new-game").addEventListener("click", () => {
    state = freshState();
    clearDraft();
    state.names = generateFunNames(defaultPlayerCount());
    renderNames();
  });

  renderHome();
  howto.maybeAutoShow();
}

init();
