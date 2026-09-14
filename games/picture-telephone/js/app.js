import { randomPrompt } from "./prompts.js";
import { DrawCanvas, paintStrokesOnCanvas } from "./canvas.js";
import { renderQR } from "./qr.js";
import { initHowto } from "./howto.js";
import { generateFunNames, generateOneFunName, defaultPlayerCount } from "../../shared/fun-names.js";
import {
  createEmptyState,
  nextPhase,
  turnsRemaining,
  turnTarget,
  isSolo,
  lastEntry,
  quantizeStrokes,
  dequantizeStrokes,
  deserializeState,
  writeHash,
  fullShareUrl,
  saveDraft,
  loadDraft,
  clearDraft,
  downloadTurnFile,
  importTurnFile,
} from "./state.js";

/** @type {import("./state.js").GameState} */
let state = createEmptyState();
/** @type {DrawCanvas | null} */
let drawCanvas = null;
/** @type {DrawCanvas | null} */
let previewCanvas = null;
let revealIndex = 0;
let pendingName = "";
let showAllReveal = false;
let showingResults = false;
/** @type {ReturnType<typeof initHowto> | null} */
let howto = null;
let qrRendered = false;
/** Solo turn picker value when playerCount === 1 */
let soloTurns = 4;
/** Editable multiplayer roster (fun names). Solo uses #player-name. */
let roster = [];

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

function showScreen(id) {
  $$(".screen").forEach((el) => el.classList.remove("active"));
  const screen = document.getElementById("screen-" + id);
  if (screen) screen.classList.add("active");
  window.scrollTo({ top: 0, behavior: "auto" });
}

function toast(msg, { success = false } = {}) {
  const el = $("#copy-toast");
  el.textContent = msg;
  el.classList.toggle("success", success);
  el.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove("show"), 1600);
}

function setProgress(done, total) {
  const active = document.querySelector(".screen.active");
  const el = (active && active.querySelector(".progress")) || $("#progress-bar");
  if (!el) return;
  el.innerHTML = "";
  for (let i = 0; i < total; i++) {
    const s = document.createElement("span");
    if (i < done) s.className = "done";
    else if (i === done) s.className = "now";
    el.appendChild(s);
  }
}

function destroyCanvases() {
  if (drawCanvas) {
    drawCanvas.destroy();
    drawCanvas = null;
  }
  if (previewCanvas) {
    previewCanvas.destroy();
    previewCanvas = null;
  }
}

function lastAuthorName() {
  const last = lastEntry(state);
  if (last && last.a) return last.a;
  return state.promptAuthor || pendingName || "";
}

function applyStateAndRoute(s) {
  state = s;
  if (state.turns == null) state.turns = state.playerCount;
  const phase = nextPhase(state);
  if (phase === "reveal") {
    clearDraft();
    startReveal();
    return;
  }
  pendingName = "";
  showJoinTurn();
}

/* ---------- Home ---------- */
function showHome() {
  destroyCanvases();
  history.replaceState(null, "", location.pathname + location.search);
  showScreen("home");
  const draft = loadDraft();
  const resume = $("#btn-resume");
  resume.hidden = !(draft && draft.state && draft.screen);
}

/* ---------- Setup ---------- */
function showSetup() {
  state = createEmptyState();
  soloTurns = 4;
  roster = [];
  showScreen("setup");
  $("#custom-prompt").value = "";
  $("#prompt-preview").textContent = randomPrompt();
  $("#player-name").value = "";
  selectCount(Math.max(2, defaultPlayerCount()));
}

function selectSoloTurns(n) {
  soloTurns = n;
  $$(".turns-picker button").forEach((b) => {
    b.classList.toggle("active", Number(b.dataset.turns) === n);
  });
  if (state.playerCount === 1) {
    state.turns = n;
    $("#count-hint").textContent = "Solo · " + n + " turns";
  }
}

function selectCount(n) {
  state.playerCount = n;
  $$(".count-picker:not(.turns-picker) button").forEach((b) => {
    b.classList.toggle("active", Number(b.dataset.n) === n);
  });
  const soloWrap = $("#solo-turns-wrap");
  const soloName = $("#solo-name-wrap");
  const rosterWrap = $("#roster-wrap");
  if (n === 1) {
    soloWrap.hidden = false;
    if (soloName) soloName.hidden = false;
    if (rosterWrap) rosterWrap.hidden = true;
    state.turns = soloTurns;
    selectSoloTurns(soloTurns);
    $("#count-hint").textContent = "Solo · " + soloTurns + " turns";
    // Solo: leave blank or keep typed name — no silly roster force
  } else {
    soloWrap.hidden = true;
    if (soloName) soloName.hidden = true;
    if (rosterWrap) rosterWrap.hidden = false;
    state.turns = n;
    $("#count-hint").textContent = n + " players · " + n + " turns";
    // Keep edits when resizing up/down where possible
    if (roster.length === n) {
      renderRoster();
    } else if (roster.length > n) {
      roster = roster.slice(0, n);
      renderRoster();
    } else {
      const extra = generateFunNames(n - roster.length, roster);
      roster = roster.concat(extra);
      renderRoster();
    }
  }
}

function renderRoster() {
  const list = $("#roster-list");
  if (!list) return;
  list.innerHTML = "";
  roster.forEach((name, i) => {
    const row = document.createElement("div");
    row.className = "roster-seat";
    const num = document.createElement("span");
    num.className = "seat-n";
    num.textContent = String(i + 1);
    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = 24;
    input.value = name;
    input.setAttribute("aria-label", `Player ${i + 1}`);
    input.autocomplete = "nickname";
    input.addEventListener("change", () => {
      let v = (input.value || "").trim().slice(0, 24);
      if (!v) {
        input.value = roster[i];
        return;
      }
      const lower = v.toLowerCase();
      if (roster.some((n, j) => j !== i && n.toLowerCase() === lower)) {
        input.value = roster[i];
        return;
      }
      roster[i] = v;
      input.value = v;
    });
    row.append(num, input);
    list.appendChild(row);
  });
}

function shuffleRosterNames() {
  if (state.playerCount === 1) return;
  const n = Math.max(2, Math.min(8, state.playerCount | 0));
  roster = generateFunNames(n);
  renderRoster();
}

function readRosterFromDom() {
  const inputs = $$("#roster-list input");
  if (!inputs.length) return roster.slice();
  return inputs.map((el) => (el.value || "").trim().slice(0, 24)).filter(Boolean);
}

/* ---------- Draw ---------- */
function showDraw(promptText, authorHint) {
  destroyCanvases();
  showScreen("draw");
  const total = turnTarget(state);
  setProgress(state.chain.length, total);
  $("#draw-prompt").textContent = promptText;
  $("#draw-who").textContent = authorHint
    ? "Drawing as " + authorHint
    : "Your turn to draw";
  const label = $("#draw-progress-label");
  if (label) {
    label.textContent = `Turn ${state.chain.length + 1} of ${total}`;
  }
  const canvas = $("#draw-canvas");
  drawCanvas = new DrawCanvas(canvas);
  drawCanvas.mount();
  drawCanvas.onChange = () => {
    saveDraft({
      screen: "draw",
      state,
      strokes: drawCanvas.getStrokes(),
      name: pendingName || state.promptAuthor,
    });
  };
  const draft = loadDraft();
  if (
    draft &&
    draft.screen === "draw" &&
    draft.strokes &&
    draft.state &&
    JSON.stringify(draft.state.chain) === JSON.stringify(state.chain)
  ) {
    drawCanvas.setStrokes(draft.strokes);
  }
  $$(".pen-btn").forEach((b) => {
    b.classList.toggle("active", Number(b.dataset.w) === 4);
  });
  drawCanvas.setPenWidth(4);
}

function submitDrawing() {
  if (!drawCanvas || !drawCanvas.hasInk()) {
    toast("Draw something first");
    return;
  }
  const name =
    pendingName ||
    state.promptAuthor ||
    $("#player-name")?.value?.trim() ||
    "Artist";
  const strokes = quantizeStrokes(drawCanvas.getStrokes());
  state.chain.push({ t: "d", a: name, s: strokes });
  if (!state.players.includes(name)) state.players.push(name);
  clearDraft();
  goToPass();
}

/* ---------- Describe ---------- */
function showDescribe() {
  destroyCanvases();
  showScreen("describe");
  const total = turnTarget(state);
  setProgress(state.chain.length, total);
  const last = lastEntry(state);
  $("#describe-who").textContent = pendingName
    ? "Describing as " + pendingName
    : "What is this?";
  const label = $("#describe-progress-label");
  if (label) {
    label.textContent = `Turn ${state.chain.length + 1} of ${total}`;
  }
  const canvas = $("#describe-canvas");
  previewCanvas = paintStrokesOnCanvas(
    canvas,
    last && last.t === "d" ? dequantizeStrokes(last.s) : []
  );
  $("#describe-input").value = "";
  $("#describe-input").focus();
  saveDraft({ screen: "describe", state, name: pendingName });
}

function submitDescription() {
  const text = $("#describe-input").value.trim();
  if (!text) {
    toast("Write a description");
    return;
  }
  const name = pendingName || lastAuthorName() || "Guesser";
  state.chain.push({ t: "g", a: name, x: text });
  if (!state.players.includes(name)) state.players.push(name);
  clearDraft();
  goToPass();
}

/* ---------- Hotseat handoff (privacy curtain) ---------- */
function goToPass() {
  const phase = nextPhase(state);
  if (phase === "reveal") {
    clearDraft();
    writeHash(state);
    startReveal();
    return;
  }
  // Always stay in-app: Done → privacy curtain → Pass to {name} / I’m {name}
  showCurtain();
}

function updateCurtainCta() {
  const btn = $("#btn-curtain-ready");
  const title = $("#curtain-title");
  const hint = $("#curtain-hint");
  if (!btn) return;
  if (hint) hint.textContent = "Don’t peek.";
  if (isSolo(state)) {
    if (title) title.textContent = "Look away, then Ready";
    btn.textContent = "Ready";
    return;
  }
  const name = $("#curtain-name")?.value?.trim();
  if (title) title.textContent = name ? "Pass to " + name : "Pass the phone";
  btn.textContent = name ? "I’m " + name : "I’m next";
}

function showCurtain() {
  destroyCanvases();
  showScreen("curtain");
  qrRendered = false;

  const remaining = turnsRemaining(state);
  const phase = nextPhase(state);
  const turnNum = state.chain.length + 1;
  const total = turnTarget(state);
  const solo = isSolo(state);

  $("#curtain-progress").textContent =
    remaining === 0
      ? "Ready to reveal"
      : `Turn ${turnNum} of ${total} · next: ${phase === "draw" ? "draw" : "describe"}`;

  const { hash, softLong, tooLong, url } = writeHash(state);
  const shareUrl = tooLong ? null : url || fullShareUrl(hash);

  const softHint = $("#pass-soft-hint");
  const warn = $("#pass-toolong");
  const trouble = $("#trouble-disclosure");
  const disclosure = $("#qr-disclosure");
  const copyBtn = $("#btn-copy-link");
  const linkBlock = $("#pass-link-block");
  const nameWrap = $("#curtain-name-wrap");

  if (solo) {
    nameWrap.hidden = true;
    $("#curtain-name").value = state.promptAuthor || lastAuthorName() || "";
  } else {
    nameWrap.hidden = false;
    // Prefill next roster seat so primary path is one tap (I’m {name})
    const nextIdx = state.chain.length;
    const nextName =
      (state.players && state.players[nextIdx]) ||
      (roster && roster[nextIdx]) ||
      "";
    $("#curtain-name").value = nextName;
    $("#curtain-name").placeholder = nextName || "Your name";
  }

  // Fallback tools buried — never primary. Hotseat never requires download.
  trouble.open = false;
  if (tooLong) {
    softHint.hidden = true;
    warn.hidden = false;
    copyBtn.hidden = true;
    linkBlock.hidden = true;
    trouble.hidden = false;
    // Only auto-open fallback when link is unusable for another phone
    trouble.open = true;
    disclosure.hidden = true;
    $("#qr-container").innerHTML = "";
    $("#share-url").value = "";
  } else {
    warn.hidden = true;
    softHint.hidden = !softLong;
    copyBtn.hidden = false;
    linkBlock.hidden = true;
    trouble.hidden = false;
    disclosure.hidden = false;
    disclosure.open = false;
    $("#share-url").value = shareUrl || "";
    $("#qr-container").innerHTML = "";
  }

  updateCurtainCta();
  // Prefill → primary path is one tap on I’m {name}
  $("#btn-curtain-ready").focus();
}

function ensureQR() {
  if (qrRendered) return;
  const shareUrl = $("#share-url")?.value;
  if (!shareUrl) {
    $("#qr-container").innerHTML =
      '<p class="qr-fallback">Stay on this phone, or download the turn file.</p>';
    return;
  }
  renderQR($("#qr-container"), shareUrl);
  qrRendered = true;
}

async function copyShareLink() {
  const input = $("#share-url");
  const linkBlock = $("#pass-link-block");
  if (linkBlock) linkBlock.hidden = false;
  if (!input || !input.value) {
    toast("Use the turn file instead");
    return;
  }
  try {
    await navigator.clipboard.writeText(input.value);
    toast("Link copied", { success: true });
  } catch {
    input.select();
    document.execCommand("copy");
    toast("Link copied", { success: true });
  }
}

function beginCurtainReady() {
  if (isSolo(state)) {
    pendingName = state.promptAuthor || lastAuthorName() || "Player";
  } else {
    const typed = $("#curtain-name")?.value?.trim();
    if (!typed) {
      toast("Enter your name");
      $("#curtain-name")?.focus();
      return;
    }
    pendingName = typed;
  }
  startPendingTurn();
}

function startPendingTurn() {
  const phase = nextPhase(state);
  if (phase === "reveal") {
    startReveal();
    return;
  }
  if (phase === "draw") {
    const last = lastEntry(state);
    const promptText =
      last && last.t === "g" ? last.x : state.prompt;
    showDraw(promptText, pendingName);
  } else {
    showDescribe();
  }
}

/* ---------- Join / name gate (multi-device link path) ---------- */
function showJoinTurn() {
  const phase = nextPhase(state);
  if (phase === "reveal") {
    startReveal();
    return;
  }
  // Solo / same-phone resume: skip name gate if we already know the author
  if (isSolo(state) && (state.promptAuthor || lastAuthorName())) {
    pendingName = state.promptAuthor || lastAuthorName();
    startPendingTurn();
    return;
  }
  showScreen("join");
  $("#join-role").textContent =
    phase === "draw" ? "Draw what you read" : "Describe what you see";
  $("#join-name").value = "";
  $("#join-progress").textContent = `Turn ${state.chain.length + 1} of ${turnTarget(state)}`;
}

function beginJoinedTurn() {
  const name = $("#join-name").value.trim();
  if (!name) {
    toast("Enter your name");
    return;
  }
  pendingName = name;
  startPendingTurn();
}


/* ---------- Prompt validation (simple token overlap) ---------- */
function normalizePrompt(s) {
  return String(s || "")
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizePrompt(s) {
  return normalizePrompt(s).split(" ").filter(Boolean);
}

function jaccardTokens(a, b) {
  const A = new Set(tokenizePrompt(a));
  const B = new Set(tokenizePrompt(b));
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  return inter / (A.size + B.size - inter);
}

/** @returns {"nailed"|"close"|"sideways"} */
function scorePromptMatch(original, finalText) {
  const nO = normalizePrompt(original);
  const nF = normalizePrompt(finalText);
  if (!nO || !nF) return "sideways";
  if (nF === nO || nF.includes(nO) || nO.includes(nF)) return "nailed";
  const j = jaccardTokens(nO, nF);
  if (j >= 0.5) return "close";
  const origTokens = tokenizePrompt(nO);
  const finalSet = new Set(tokenizePrompt(nF));
  const shared = origTokens.filter((t) => finalSet.has(t)).length;
  if (origTokens.length && shared / origTokens.length >= 0.5) return "close";
  return "sideways";
}

/**
 * Ended-with: last text in chain; if chain ends on draw, previous description + final drawing note.
 * @returns {{ text: string, finalDrawing: boolean }}
 */
function getEndedWith() {
  const chain = state.chain || [];
  if (!chain.length) return { text: "", finalDrawing: false };
  const last = chain[chain.length - 1];
  if (last.t === "g") {
    return { text: last.x || "", finalDrawing: false };
  }
  // ends on drawing — use previous description
  for (let i = chain.length - 2; i >= 0; i--) {
    if (chain[i].t === "g") {
      return { text: chain[i].x || "", finalDrawing: true };
    }
  }
  // no description in chain (prompt → draw only)
  return { text: "", finalDrawing: true };
}

function verdictLabel(score) {
  if (score === "nailed") return "Nailed it";
  if (score === "close") return "Close";
  return "Went sideways";
}

/* ---------- Reveal ---------- */
function startReveal() {
  destroyCanvases();
  revealIndex = 0;
  showAllReveal = false;
  showingResults = false;
  showScreen("reveal");
  const title = document.querySelector("#screen-reveal .title");
  if (title) title.textContent = "The chain";
  $("#btn-show-all").hidden = false;
  $("#reveal-end-actions").hidden = true;
  renderRevealStep();
}

function revealSteps() {
  const steps = [
    {
      tag: "Original prompt",
      who: state.promptAuthor,
      kind: "text",
      text: state.prompt,
      caption: "Here’s how it started",
    },
  ];
  for (let i = 0; i < state.chain.length; i++) {
    const entry = state.chain[i];
    const isLast = i === state.chain.length - 1;
    if (entry.t === "d") {
      steps.push({
        tag: "Drawing",
        who: entry.a,
        kind: "draw",
        strokes: dequantizeStrokes(entry.s),
        caption: isLast ? "And this is where it landed" : "Then it became…",
      });
    } else {
      steps.push({
        tag: "Description",
        who: entry.a,
        kind: "text",
        text: entry.x,
        caption: isLast ? "And this is where it landed" : "Then it became…",
      });
    }
  }
  return steps;
}

function renderResultsPanel(includeChain = false) {
  const root = $("#reveal-body");
  const title = document.querySelector("#screen-reveal .title");
  if (title) title.textContent = "Results";
  const started = state.prompt || "";
  const ended = getEndedWith();
  // Validate against last text (or empty → sideways)
  const compareText = ended.text || "";
  const score = scorePromptMatch(started, compareText);
  const verdict = verdictLabel(score);

  let html = "";
  if (includeChain) {
    const steps = revealSteps();
    steps.forEach((step, i) => {
      html += `<div class="reveal-step" style="margin-bottom:20px">
        <div class="tag">${i + 1}/${steps.length} · ${step.tag}</div>
        <p class="who">by ${escapeHtml(step.who || "Someone")}</p>`;
      if (step.kind === "text") {
        html += `<p class="reveal-text">${escapeHtml(step.text)}</p>`;
      } else {
        html += `<div class="canvas-wrap preview-wrap"><canvas id="reveal-canvas-${i}"></canvas></div>`;
      }
      html += `</div>`;
    });
  }

  html += `<div class="results-panel">
    <p class="results-heading">Results</p>
    <div class="results-block">
      <p class="results-label">Started with</p>
      <p class="results-started">${escapeHtml(started)}</p>
    </div>
    <div class="results-block">
      <p class="results-label">Ended with</p>
      <p class="results-ended">${
        compareText
          ? escapeHtml(compareText)
          : "<em>No description</em>"
      }${
        ended.finalDrawing
          ? '<span class="results-ended-note">+ final drawing</span>'
          : ""
      }</p>
    </div>
    <div class="results-block">
      <p class="results-label">Validation</p>
      <span class="results-verdict ${score}">${escapeHtml(verdict)}</span>
    </div>
  </div>`;

  root.innerHTML = html;
  if (includeChain) {
    const steps = revealSteps();
    steps.forEach((step, i) => {
      if (step.kind === "draw") {
        paintStrokesOnCanvas($("#reveal-canvas-" + i), step.strokes);
      }
    });
  }

  // Results: Back returns to last chain beat (or stays usable after Show all)
  $("#btn-reveal-prev").disabled = false;
  $("#btn-reveal-next").hidden = true;
  $("#btn-reveal-next").textContent = "Next";
  $("#reveal-end-actions").hidden = false;
  $("#btn-show-all").hidden = true;
  const steps = revealSteps();
  $("#reveal-counter").textContent = includeChain
    ? `All · ${steps.length}`
    : `Results`;
  setProgress(steps.length, steps.length);
}

function renderRevealStep() {
  const steps = revealSteps();
  const root = $("#reveal-body");
  destroyCanvases();

  if (showAllReveal) {
    showingResults = true;
    renderResultsPanel(true);
    return;
  }

  if (showingResults) {
    renderResultsPanel(false);
    return;
  }

  const title = document.querySelector("#screen-reveal .title");
  if (title) title.textContent = "The chain";

  const step = steps[revealIndex];
  root.style.opacity = "0";
  requestAnimationFrame(() => {
    let html = `
      <div class="reveal-step">
        <div class="tag">${step.tag}</div>
        <p class="who">by ${escapeHtml(step.who || "Someone")}</p>
    `;
    if (step.kind === "text") {
      html += `<p class="reveal-text">${escapeHtml(step.text)}</p>`;
    } else {
      html += `<div class="canvas-wrap preview-wrap"><canvas id="reveal-canvas"></canvas></div>`;
    }
    if (step.caption) {
      html += `<p class="reveal-caption">${escapeHtml(step.caption)}</p>`;
    }
    html += `</div>`;
    root.innerHTML = html;

    if (step.kind === "draw") {
      previewCanvas = paintStrokesOnCanvas($("#reveal-canvas"), step.strokes);
    }

    root.style.opacity = "1";
  });

  setProgress(revealIndex, steps.length);
  $("#btn-reveal-prev").disabled = revealIndex === 0;
  const last = revealIndex >= steps.length - 1;
  // On last beat: Next advances to Results
  $("#btn-reveal-next").hidden = false;
  $("#btn-reveal-next").textContent = last ? "Results" : "Next";
  $("#reveal-end-actions").hidden = true;
  $("#btn-show-all").hidden = last;
  $("#reveal-counter").textContent = `${revealIndex + 1} / ${steps.length}`;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ---------- Join via paste / file ---------- */
function joinFromPaste() {
  const raw = $("#paste-link").value.trim();
  if (!raw) {
    toast("Paste a link or hash first");
    return;
  }
  try {
    let payload = raw;
    if (payload.includes("#")) payload = payload.split("#").pop();
    const s = deserializeState(payload);
    pendingName = "";
    applyStateAndRoute(s);
  } catch (e) {
    toast("Couldn't read that link");
    console.warn(e);
  }
}

async function joinFromFile(file) {
  if (!file) return;
  try {
    const s = await importTurnFile(file);
    pendingName = "";
    applyStateAndRoute(s);
  } catch (e) {
    toast("Couldn't read that file");
    console.warn(e);
  }
}

/* ---------- Wire UI ---------- */
function init() {
  howto = initHowto({
    overlay: $("#howto-overlay"),
    sheet: $("#howto-sheet"),
    gotItBtn: $("#btn-howto-gotit"),
    closeBtn: $("#btn-howto-close"),
    openBtn: $("#btn-howto"),
  });

  // Home
  $("#btn-start").addEventListener("click", showSetup);
  $("#btn-join-paste").addEventListener("click", () => {
    showScreen("join-link");
    $("#paste-link").value = "";
  });
  $("#btn-resume").addEventListener("click", () => {
    const draft = loadDraft();
    if (!draft || !draft.state) return;
    state = draft.state;
    if (state.turns == null) state.turns = state.playerCount;
    pendingName = draft.name || "";
    if (draft.screen === "draw") {
      const last = lastEntry(state);
      const promptText =
        state.chain.length === 0
          ? state.prompt
          : last && last.t === "g"
            ? last.x
            : state.prompt;
      showDraw(promptText, pendingName);
    } else if (draft.screen === "describe") {
      showDescribe();
    } else {
      showHome();
    }
  });

  // Setup
  $$(".count-picker:not(.turns-picker) button").forEach((b) =>
    b.addEventListener("click", () => selectCount(Number(b.dataset.n)))
  );
  $$(".turns-picker button").forEach((b) =>
    b.addEventListener("click", () => selectSoloTurns(Number(b.dataset.turns)))
  );
  $("#btn-random-prompt").addEventListener("click", () => {
    $("#prompt-preview").textContent = randomPrompt();
    $("#custom-prompt").value = "";
  });
  $("#btn-setup-back").addEventListener("click", showHome);
  const shuffleBtn = $("#btn-shuffle-names");
  if (shuffleBtn) shuffleBtn.addEventListener("click", shuffleRosterNames);
  $("#btn-setup-go").addEventListener("click", () => {
    const custom = $("#custom-prompt").value.trim();
    const prompt = custom || $("#prompt-preview").textContent.trim();
    if (!prompt) {
      toast("Need a prompt");
      return;
    }
    let name;
    if (state.playerCount === 1) {
      name = $("#player-name").value.trim();
      if (!name) {
        toast("Enter your name");
        return;
      }
      state.players = [name];
      state.turns = soloTurns;
    } else {
      roster = readRosterFromDom();
      if (roster.length < 2) {
        toast("Need at least 2 names");
        return;
      }
      // Dedupe case-insensitively
      const seen = new Set();
      const clean = [];
      for (const n of roster) {
        const key = n.toLowerCase();
        if (!n || seen.has(key)) continue;
        seen.add(key);
        clean.push(n);
      }
      if (clean.length < 2) {
        toast("Need at least 2 unique names");
        return;
      }
      roster = clean.slice(0, 8);
      state.playerCount = roster.length;
      state.turns = roster.length;
      state.players = roster.slice();
      name = roster[0];
    }
    state.prompt = prompt;
    state.promptAuthor = name;
    pendingName = name;
    showDraw(prompt, name);
  });

  // Draw toolbar
  $$(".pen-btn").forEach((b) =>
    b.addEventListener("click", () => {
      $$(".pen-btn").forEach((x) => x.classList.remove("active"));
      b.classList.add("active");
      if (drawCanvas) drawCanvas.setPenWidth(Number(b.dataset.w));
    })
  );
  $("#btn-undo").addEventListener("click", () => drawCanvas && drawCanvas.undo());
  $("#btn-clear").addEventListener("click", () => drawCanvas && drawCanvas.clear());
  $("#btn-draw-submit").addEventListener("click", submitDrawing);

  // Describe
  $("#btn-describe-submit").addEventListener("click", submitDescription);

  // Curtain handoff (hotseat-first). Copy/download only under Advanced details.
  $("#btn-curtain-ready").addEventListener("click", beginCurtainReady);
  $("#curtain-name").addEventListener("input", updateCurtainCta);
  $("#curtain-name").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      beginCurtainReady();
    }
  });
  $("#btn-copy-link").addEventListener("click", copyShareLink);
  $("#btn-download-turn").addEventListener("click", () => {
    downloadTurnFile(state, `picture-telephone-turn${state.chain.length}.pturn.json`);
    toast("Turn file downloaded");
  });
  $("#btn-pass-home").addEventListener("click", showHome);
  $("#qr-disclosure").addEventListener("toggle", () => {
    if ($("#qr-disclosure").open) ensureQR();
  });

  // Join name
  $("#btn-join-go").addEventListener("click", beginJoinedTurn);
  $("#btn-join-back").addEventListener("click", showHome);

  // Join link screen
  $("#btn-paste-go").addEventListener("click", joinFromPaste);
  $("#btn-paste-back").addEventListener("click", showHome);
  $("#import-file").addEventListener("change", (e) => {
    const f = e.target.files && e.target.files[0];
    joinFromFile(f);
  });

  // Reveal
  $("#btn-reveal-prev").addEventListener("click", () => {
    if (showingResults) {
      showingResults = false;
      showAllReveal = false;
      revealIndex = Math.max(0, revealSteps().length - 1);
      renderRevealStep();
      return;
    }
    if (revealIndex > 0) {
      revealIndex--;
      renderRevealStep();
    }
  });
  $("#btn-reveal-next").addEventListener("click", () => {
    const steps = revealSteps();
    if (showingResults) return;
    if (revealIndex < steps.length - 1) {
      revealIndex++;
      renderRevealStep();
      return;
    }
    // Last beat → Results
    showingResults = true;
    renderRevealStep();
  });
  $("#btn-show-all").addEventListener("click", () => {
    showAllReveal = true;
    showingResults = true;
    renderRevealStep();
  });
  $("#btn-play-again").addEventListener("click", () => {
    clearDraft();
    showHome();
  });

  // Boot from hash?
  const fromHash = (() => {
    const hash = location.hash.replace(/^#/, "");
    if (!hash || hash === "home") return null;
    try {
      return deserializeState(hash);
    } catch {
      return null;
    }
  })();

  if (fromHash) {
    applyStateAndRoute(fromHash);
  } else {
    showHome();
    howto.maybeAutoShow();
  }
}

init();
