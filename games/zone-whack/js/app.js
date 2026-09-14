import { initHowto } from "./howto.js";

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

/** @type {{
 *  roundMs: number,
 *  moleMinLifeMs: number,
 *  moleMaxLifeMs: number,
 *  spawnMinMs: number,
 *  spawnMaxMs: number,
 *  maxMolesPerZone: number,
 *  zones: Array<{ id: number, label: string, color: string, ink: string }>
 * }} */
let DATA = {
  roundMs: 25000,
  moleMinLifeMs: 900,
  moleMaxLifeMs: 1400,
  spawnMinMs: 450,
  spawnMaxMs: 850,
  maxMolesPerZone: 1,
  zones: [
    { id: 0, label: "P1", color: "#F97066", ink: "#7F1D1D" },
    { id: 1, label: "P2", color: "#2DD4BF", ink: "#115E59" },
    { id: 2, label: "P3", color: "#FBBF24", ink: "#78350F" },
    { id: 3, label: "P4", color: "#60A5FA", ink: "#1E3A8A" },
  ],
};

const state = {
  playerCount: 0,
  scores: /** @type {number[]} */ ([]),
  phase: "home",
};

/** @type {ReturnType<typeof initHowto> | null} */
let howto = null;

/** @type {AudioContext | null} */
let audioCtx = null;

let rafId = 0;
let roundStart = 0;
let lastFrameAt = 0;
let nextSpawnAt = 0;
let playing = false;
/** @type {Array<{ zone: number, el: HTMLElement, expires: number, hit: boolean }>} */
let moles = [];
/** @type {HTMLElement[]} */
let zoneEls = [];

async function loadData() {
  try {
    const res = await fetch("./js/data.json");
    if (res.ok) {
      const json = await res.json();
      DATA = { ...DATA, ...json };
    }
  } catch {
    /* bundled defaults */
  }
}

function showScreen(id) {
  $$(".screen").forEach((el) => el.classList.remove("active"));
  const screen = document.getElementById("screen-" + id);
  if (screen) screen.classList.add("active");
  const isPlay = id === "play";
  document.body.classList.toggle("playing", isPlay);
  state.phase = id;
  updateRotateGate();
  if (!isPlay) window.scrollTo({ top: 0, behavior: "auto" });
}

function needsLandscape() {
  return state.playerCount >= 3;
}

function isLandscape() {
  return window.matchMedia("(orientation: landscape)").matches
    || window.innerWidth > window.innerHeight;
}

function updateRotateGate() {
  const gate = $("#rotate-gate");
  if (!gate) return;
  const show =
    needsLandscape()
    && !isLandscape()
    && (state.phase === "play" || state.phase === "count");
  gate.hidden = !show;
  if (show && playing) {
    /* tick() freezes roundStart / spawn / mole expiry while gated (Corner Claim pattern) */
  }
}

function ensureAudio() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      audioCtx = null;
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
}

function beep(freq, dur, type = "sine", gain = 0.08) {
  if (!audioCtx) return;
  try {
    const t0 = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(g);
    g.connect(audioCtx.destination);
    osc.start(t0);
    osc.stop(t0 + dur);
  } catch {
    /* ignore */
  }
}

function haptic(ms = 12) {
  try {
    if (navigator.vibrate) navigator.vibrate(ms);
  } catch {
    /* ignore */
  }
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function pickZones() {
  return DATA.zones.slice(0, state.playerCount);
}

function renderPreview() {
  const arena = $("#preview-arena");
  if (!arena) return;
  const zones = pickZones();
  if (!zones.length) {
    arena.hidden = true;
    arena.innerHTML = "";
    return;
  }
  arena.hidden = false;
  arena.dataset.n = String(zones.length);
  arena.innerHTML = zones
    .map(
      (z) =>
        `<div class="preview-zone" style="background:${z.color};color:${z.ink}">${z.label}</div>`
    )
    .join("");
}

function buildArena() {
  const arena = $("#arena");
  if (!arena) return;
  const zones = pickZones();
  arena.dataset.n = String(zones.length);
  arena.innerHTML = "";
  zoneEls = [];
  moles = [];

  zones.forEach((z, i) => {
    const zone = document.createElement("div");
    zone.className = "zone";
    zone.dataset.zone = String(i);
    zone.style.background = z.color;
    zone.style.color = z.ink;
    zone.innerHTML =
      `<span class="zone-label">${z.label}</span>` +
      `<span class="zone-score" data-score="${i}">0</span>`;
    zone.addEventListener("pointerdown", onZonePointer, { passive: false });
    arena.appendChild(zone);
    zoneEls.push(zone);
  });
}

function updateScoreHud() {
  state.scores.forEach((s, i) => {
    const el = zoneEls[i]?.querySelector("[data-score]");
    if (el) el.textContent = String(s);
  });
}

/**
 * @param {PointerEvent} e
 */
function onZonePointer(e) {
  if (!playing) return;
  e.preventDefault();
  e.stopPropagation();

  const zoneEl = /** @type {HTMLElement} */ (e.currentTarget);
  const zoneIndex = Number(zoneEl.dataset.zone);
  if (Number.isNaN(zoneIndex)) return;

  const rect = zoneEl.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  /* Only moles that belong to THIS zone can score — ignore other zones entirely */
  const hit = moles.find((m) => {
    if (m.hit || m.zone !== zoneIndex) return false;
    const mr = m.el.getBoundingClientRect();
    const cx = mr.left + mr.width / 2 - rect.left;
    const cy = mr.top + mr.height / 2 - rect.top;
    const r = Math.max(mr.width, 56) * 0.55;
    const dx = x - cx;
    const dy = y - cy;
    return dx * dx + dy * dy <= r * r;
  });

  if (hit) {
    hit.hit = true;
    hit.el.classList.add("hit");
    state.scores[zoneIndex] = (state.scores[zoneIndex] || 0) + 1;
    updateScoreHud();
    beep(660 + zoneIndex * 40, 0.07, "square", 0.06);
    haptic(10);
    setTimeout(() => removeMole(hit), 100);
  }
}

function removeMole(m) {
  const idx = moles.indexOf(m);
  if (idx >= 0) moles.splice(idx, 1);
  if (m.el && m.el.parentNode) m.el.parentNode.removeChild(m.el);
}

function spawnMole() {
  const n = state.playerCount;
  if (!n || !playing) return;

  const candidates = [];
  for (let i = 0; i < n; i++) {
    const count = moles.filter((m) => m.zone === i && !m.hit).length;
    if (count < DATA.maxMolesPerZone) candidates.push(i);
  }
  if (!candidates.length) return;

  const zone = candidates[Math.floor(Math.random() * candidates.length)];
  const zoneEl = zoneEls[zone];
  if (!zoneEl) return;

  const rect = zoneEl.getBoundingClientRect();
  const pad = 40;
  const w = Math.max(rect.width - pad * 2, 20);
  const h = Math.max(rect.height - pad * 2, 20);
  const x = pad + Math.random() * w;
  const y = pad + Math.random() * h;

  const el = document.createElement("button");
  el.type = "button";
  el.className = "mole";
  el.setAttribute("aria-label", `Mole ${DATA.zones[zone].label}`);
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.style.color = darken(DATA.zones[zone].color, 0.25);
  el.innerHTML = `<span class="mole-inner"></span>`;
  /* Mole taps bubble to zone via pointer — disable default button focus steal */
  el.tabIndex = -1;
  el.addEventListener("pointerdown", (e) => {
    /* Let zone handler process; stop button default */
    e.preventDefault();
  });

  zoneEl.appendChild(el);
  requestAnimationFrame(() => el.classList.add("show"));

  const life = rand(DATA.moleMinLifeMs, DATA.moleMaxLifeMs);
  const entry = {
    zone,
    el,
    expires: performance.now() + life,
    hit: false,
  };
  moles.push(entry);
}

function darken(hex, amount) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  r = Math.max(0, Math.round(r * (1 - amount)));
  g = Math.max(0, Math.round(g * (1 - amount)));
  b = Math.max(0, Math.round(b * (1 - amount)));
  return `rgb(${r},${g},${b})`;
}

function clearMoles() {
  moles.slice().forEach(removeMole);
  moles = [];
}

function stopRound() {
  playing = false;
  if (rafId) cancelAnimationFrame(rafId);
  rafId = 0;
  clearMoles();
}

function tick(now) {
  if (!playing) return;

  const gated = needsLandscape() && !isLandscape();
  if (gated) {
    /* Freeze round clock + spawn/mole timers while landscape gate covers play */
    const dt = now - lastFrameAt;
    roundStart += dt;
    nextSpawnAt += dt;
    for (const m of moles) {
      m.expires += dt;
    }
    lastFrameAt = now;
    rafId = requestAnimationFrame(tick);
    return;
  }

  const elapsed = now - roundStart;
  const left = Math.max(0, DATA.roundMs - elapsed);
  const secs = Math.ceil(left / 1000);
  const timer = $("#play-timer");
  if (timer) timer.textContent = String(secs);

  /* Expire moles */
  for (const m of moles.slice()) {
    if (!m.hit && now >= m.expires) removeMole(m);
  }

  if (now >= nextSpawnAt) {
    spawnMole();
    nextSpawnAt = now + rand(DATA.spawnMinMs, DATA.spawnMaxMs);
  }

  if (left <= 0) {
    endRound();
    return;
  }

  lastFrameAt = now;
  rafId = requestAnimationFrame(tick);
}

function endRound() {
  stopRound();
  beep(220, 0.2, "triangle", 0.07);
  showResults();
}

function showResults() {
  const zones = pickZones();
  const ranked = zones
    .map((z, i) => ({ ...z, score: state.scores[i] || 0, index: i }))
    .sort((a, b) => b.score - a.score || a.index - b.index);

  const top = ranked[0]?.score ?? 0;
  const list = $("#results-list");
  if (list) {
    const tied = ranked.filter((r) => r.score === top && top > 0).length > 1;
    list.innerHTML = ranked
      .map((r) => {
        const isWin = r.score === top && top > 0;
        const tag = isWin
          ? `<span class="board-tag">${tied ? "Tie" : "Winner"}</span>`
          : "";
        return (
          `<li class="board-row${isWin ? " winner" : ""}">` +
          `<span class="board-swatch" style="background:${r.color}"></span>` +
          `<span class="board-name">${r.label}</span>` +
          tag +
          `<span class="board-score">${r.score}</span>` +
          `</li>`
        );
      })
      .join("");
  }

  const sub = $("#results-sub");
  if (sub) {
    if (top === 0) sub.textContent = "Nobody hit a mole";
    else {
      const winners = ranked.filter((r) => r.score === top);
      sub.textContent =
        winners.length > 1
          ? `Tie at ${top}`
          : `${winners[0].label} wins with ${top}`;
    }
  }

  showScreen("results");
}

function startCountdown() {
  ensureAudio();
  buildArena();
  state.scores = Array.from({ length: state.playerCount }, () => 0);
  updateScoreHud();
  showScreen("play");
  updateRotateGate();

  const overlay = $("#countdown-overlay");
  const num = $("#countdown-num");
  if (overlay) overlay.hidden = false;

  const steps = ["3", "2", "1", "Go!"];
  let i = 0;
  const run = () => {
    const label = steps[i];
    if (num) num.textContent = label;
    beep(label === "Go!" ? 880 : 440, 0.08, "sine", 0.07);
    i += 1;
    if (i >= steps.length) {
      setTimeout(() => {
        if (overlay) overlay.hidden = true;
        beginPlay();
      }, 350);
      return;
    }
    setTimeout(run, 700);
  };
  run();
}

function beginPlay() {
  if (needsLandscape() && !isLandscape()) {
    updateRotateGate();
    /* Keep watching until landscape — resume without resetting the round */
    const wait = () => {
      if (!isLandscape()) return;
      window.removeEventListener("orientationchange", wait);
      window.removeEventListener("resize", wait);
      updateRotateGate();
      actuallyStart();
    };
    window.addEventListener("orientationchange", wait);
    window.addEventListener("resize", wait);
    return;
  }
  actuallyStart();
}

function actuallyStart() {
  playing = true;
  roundStart = performance.now();
  lastFrameAt = roundStart;
  nextSpawnAt = roundStart + 200;
  const timer = $("#play-timer");
  if (timer) timer.textContent = String(Math.ceil(DATA.roundMs / 1000));
  rafId = requestAnimationFrame(tick);
}

function selectCount(n) {
  state.playerCount = n;
  $$(".count-btn").forEach((btn) => {
    const v = Number(btn.getAttribute("data-count"));
    btn.setAttribute("aria-pressed", v === n ? "true" : "false");
  });
  const go = $("#btn-count-go");
  if (go) go.disabled = !n;
  const hint = $("#count-hint");
  if (hint) {
    hint.textContent =
      n >= 3 ? "Rotate to landscape before Go" : "Split left / right";
  }
  renderPreview();
  updateRotateGate();
}

function bind() {
  $("#btn-play")?.addEventListener("click", () => {
    ensureAudio();
    selectCount(0);
    const go = $("#btn-count-go");
    if (go) go.disabled = true;
    $$(".count-btn").forEach((b) => b.setAttribute("aria-pressed", "false"));
    showScreen("count");
  });

  $$(".count-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectCount(Number(btn.getAttribute("data-count")));
    });
  });

  $("#btn-count-go")?.addEventListener("click", () => {
    if (!state.playerCount) return;
    if (needsLandscape() && !isLandscape()) {
      updateRotateGate();
      return;
    }
    startCountdown();
  });

  $("#btn-count-back")?.addEventListener("click", () => showScreen("home"));

  $("#btn-again")?.addEventListener("click", () => {
    if (needsLandscape() && !isLandscape()) {
      showScreen("count");
      renderPreview();
      updateRotateGate();
      return;
    }
    startCountdown();
  });

  $("#btn-new")?.addEventListener("click", () => {
    stopRound();
    showScreen("count");
  });

  window.addEventListener("orientationchange", () => {
    setTimeout(updateRotateGate, 100);
  });
  window.addEventListener("resize", updateRotateGate);

  /* Prevent scroll/zoom during play */
  document.addEventListener(
    "touchmove",
    (e) => {
      if (document.body.classList.contains("playing")) e.preventDefault();
    },
    { passive: false }
  );
}

async function main() {
  await loadData();
  howto = initHowto({
    overlay: /** @type {HTMLElement} */ ($("#howto-overlay")),
    sheet: /** @type {HTMLElement} */ ($("#howto-sheet")),
    gotItBtn: /** @type {HTMLElement} */ ($("#btn-howto-gotit")),
    closeBtn: /** @type {HTMLElement} */ ($("#btn-howto-close")),
    openBtn: /** @type {HTMLElement} */ ($("#btn-howto")),
  });
  bind();
  showScreen("home");
  howto.maybeAutoShow();
}

main();
