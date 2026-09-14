import { initHowto } from "./howto.js";

const HARDNESS_KEY = "arrow-shot:hardness:v1";
const MAX_PULL = 90;
const SETTLE_MS = 2200;

const HARDNESS = {
  easy: {
    id: "easy",
    label: "Easy",
    arrows: 6,
    gravity: 0.75,
    powerScale: 0.22,
    grabRadius: 180,
    forgiveLeft: 0.45,
  },
  normal: {
    id: "normal",
    label: "Normal",
    arrows: 5,
    gravity: 0.9,
    powerScale: 0.18,
    grabRadius: 170,
    forgiveLeft: 0.4,
  },
  hard: {
    id: "hard",
    label: "Hard",
    arrows: 4,
    gravity: 1.05,
    powerScale: 0.15,
    grabRadius: 130,
    forgiveLeft: 0.32,
  },
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

/** @type {ReturnType<typeof initHowto> | null} */
let howto = null;

/** @type {keyof typeof HARDNESS} */
let hardness = loadHardness();

/** @type {{
 *  arrowsLeft: number,
 *  hits: number,
 *  score: number,
 *  arrowsUsed: number,
 *  targetsHit: number,
 *  totalTargets: number,
 *  cleared: boolean,
 *  maxArrows: number,
 *  hardnessId: string,
 *  hardnessLabel: string,
 * }} */
let round = emptyRound();

let engine = null;
let render = null;
let runner = null;
let world = null;
/** Logical world size (physics + pointer space) */
let worldW = 360;
let worldH = 520;
let bow = { x: 72, y: 0 };
let arrowBody = null;
let targets = [];
let aiming = false;
let pull = { x: 0, y: 0 };
let inFlight = false;
let flightTimer = null;
let roundOver = false;
let feedbackTimer = null;
let resizeObs = null;
/** Bound once to #stage; handlers read live canvas/world state */
let stageInputBound = false;

function loadHardness() {
  try {
    const v = localStorage.getItem(HARDNESS_KEY);
    if (v && HARDNESS[v]) return /** @type {keyof typeof HARDNESS} */ (v);
  } catch {
    /* ignore */
  }
  return "normal";
}

function saveHardness(id) {
  try {
    localStorage.setItem(HARDNESS_KEY, id);
  } catch {
    /* ignore */
  }
}

function cfg() {
  return HARDNESS[hardness] || HARDNESS.normal;
}

function emptyRound() {
  const c = cfg();
  return {
    arrowsLeft: c.arrows,
    hits: 0,
    score: 0,
    arrowsUsed: 0,
    targetsHit: 0,
    totalTargets: 0,
    cleared: false,
    maxArrows: c.arrows,
    hardnessId: c.id,
    hardnessLabel: c.label,
  };
}

function showScreen(id) {
  $$(".screen").forEach((el) => el.classList.remove("active"));
  const screen = document.getElementById("screen-" + id);
  if (screen) screen.classList.add("active");
  document.body.classList.toggle("playing", id === "play");
  window.scrollTo({ top: 0, behavior: "auto" });
}

function updateHud() {
  $("#hud-arrows").textContent = String(round.arrowsLeft);
  $("#hud-hits").textContent = String(round.hits);
  $("#hud-score").textContent = String(round.score);
  const hardEl = $("#hud-hardness");
  if (hardEl) hardEl.textContent = round.hardnessLabel || cfg().label;
}

function showFeedback(text, kind) {
  const el = $("#feedback");
  el.hidden = false;
  el.className = "feedback " + kind;
  el.textContent = text;
  clearTimeout(feedbackTimer);
  feedbackTimer = setTimeout(() => {
    el.hidden = true;
  }, 700);
}

function getMatter() {
  const M = window.Matter;
  if (!M) throw new Error("Matter.js failed to load from vendor");
  return M;
}

function cssVar(name, fallback) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function stageSize() {
  const wrap = $(".stage-wrap");
  if (!wrap) return { w: 360, h: 520 };
  const rect = wrap.getBoundingClientRect();
  const w = Math.max(280, Math.floor(rect.width) || 360);
  const h = Math.max(280, Math.floor(rect.height) || 520);
  return { w, h };
}

function destroyPhysics() {
  const Matter = window.Matter;
  clearTimeout(flightTimer);
  flightTimer = null;
  aiming = false;
  inFlight = false;
  arrowBody = null;
  targets = [];
  document.body.classList.remove("is-aiming");

  if (resizeObs) {
    resizeObs.disconnect();
    resizeObs = null;
  }
  if (runner && Matter) {
    Matter.Runner.stop(runner);
    runner = null;
  }
  if (render && Matter) {
    Matter.Render.stop(render);
    Matter.Events.off(render, "afterRender", drawOverlay);
    render = null;
  }
  if (engine && Matter) {
    Matter.Events.off(engine, "collisionStart", onCollision);
    Matter.Events.off(engine, "beforeUpdate", steerArrow);
    Matter.World.clear(engine.world, false);
    Matter.Engine.clear(engine);
    engine = null;
    world = null;
  }
}

/** Target layouts by hardness — fractions of world size */
function targetLayouts(w, h, level) {
  if (level === "easy") {
    return [
      { x: w * 0.7, y: h * 0.3, r: 36, pts: 20, label: "20" },
      { x: w * 0.78, y: h * 0.52, r: 40, pts: 15, label: "15" },
      { x: w * 0.66, y: h * 0.72, r: 34, pts: 25, label: "25" },
    ];
  }
  if (level === "hard") {
    return [
      { x: w * 0.74, y: h * 0.22, r: 16, pts: 50, label: "50" },
      { x: w * 0.88, y: h * 0.34, r: 18, pts: 40, label: "40" },
      { x: w * 0.7, y: h * 0.48, r: 20, pts: 35, label: "35" },
      { x: w * 0.86, y: h * 0.6, r: 17, pts: 45, label: "45" },
      { x: w * 0.72, y: h * 0.74, r: 19, pts: 40, label: "40" },
      { x: w * 0.9, y: h * 0.78, r: 15, pts: 55, label: "55" },
    ];
  }
  // normal — mixed, current-ish
  return [
    { x: w * 0.72, y: h * 0.28, r: 28, pts: 30, label: "30" },
    { x: w * 0.82, y: h * 0.48, r: 34, pts: 20, label: "20" },
    { x: w * 0.68, y: h * 0.68, r: 24, pts: 40, label: "40" },
    { x: w * 0.88, y: h * 0.22, r: 18, pts: 50, label: "50" },
  ];
}

function buildTargets(Matter, w, h) {
  const layouts = targetLayouts(w, h, hardness);
  return layouts.map((t, i) => {
    const body = Matter.Bodies.circle(t.x, t.y, t.r, {
      isStatic: true,
      label: "target",
      restitution: 0.2,
      friction: 0.4,
      render: {
        fillStyle: i % 2 === 0 ? cssVar("--accent", "#FB7185") : cssVar("--ink", "#1C1917"),
        strokeStyle: cssVar("--ink", "#1C1917"),
        lineWidth: 2,
      },
    });
    body.plugin = { pts: t.pts, label: t.label, hit: false, radius: t.r };
    return body;
  });
}

function createArrow(Matter, x, y) {
  const shaft = Matter.Bodies.rectangle(x, y, 36, 5, {
    label: "arrow",
    density: 0.0035,
    frictionAir: 0.01,
    restitution: 0.05,
    render: {
      fillStyle: cssVar("--ink", "#1C1917"),
      strokeStyle: cssVar("--ink", "#1C1917"),
      lineWidth: 0,
    },
  });
  Matter.Body.setAngle(shaft, 0);
  return shaft;
}

function initPhysics() {
  const Matter = getMatter();
  destroyPhysics();

  const canvas = $("#stage");
  const { w, h } = stageSize();
  worldW = w;
  worldH = h;
  // Logical buffer size — keep in sync with Matter options (pixelRatio: 1)
  canvas.width = w;
  canvas.height = h;

  bow = { x: Math.max(56, w * 0.16), y: h * 0.62 };

  const c = cfg();
  engine = Matter.Engine.create({
    gravity: { x: 0, y: c.gravity },
  });
  world = engine.world;

  const wallOpts = {
    isStatic: true,
    render: { visible: false },
  };
  const ground = Matter.Bodies.rectangle(w / 2, h + 30, w + 80, 60, wallOpts);
  const ceiling = Matter.Bodies.rectangle(w / 2, -40, w + 80, 60, wallOpts);
  const left = Matter.Bodies.rectangle(-40, h / 2, 60, h + 80, wallOpts);
  const right = Matter.Bodies.rectangle(w + 40, h / 2, 60, h + 80, wallOpts);

  targets = buildTargets(Matter, w, h);
  round.totalTargets = targets.length;

  Matter.Composite.add(world, [ground, ceiling, left, right, ...targets]);

  render = Matter.Render.create({
    canvas,
    engine,
    options: {
      width: w,
      height: h,
      wireframes: false,
      background: cssVar("--surface", "#FFFFFF"),
      // Keep 1 so canvas buffer == logical world; avoids dpr pointer skew
      pixelRatio: 1,
    },
  });

  Matter.Events.on(render, "afterRender", drawOverlay);
  Matter.Events.on(engine, "collisionStart", onCollision);

  runner = Matter.Runner.create();
  Matter.Runner.run(runner, engine);
  Matter.Render.run(render);

  spawnNockedArrow();
  bindStageInput();

  if (typeof ResizeObserver !== "undefined") {
    resizeObs = new ResizeObserver(() => {
      if (!$("#screen-play").classList.contains("active") || inFlight || aiming) return;
      const next = stageSize();
      if (Math.abs(next.w - worldW) > 24 || Math.abs(next.h - worldH) > 24) {
        const keep = { ...round };
        initPhysics();
        round = keep;
        updateHud();
      }
    });
    resizeObs.observe($(".stage-wrap"));
  }
}

function spawnNockedArrow() {
  const Matter = getMatter();
  if (arrowBody) {
    Matter.Composite.remove(world, arrowBody);
    arrowBody = null;
  }
  if (round.arrowsLeft <= 0 || roundOver) return;
  arrowBody = createArrow(Matter, bow.x, bow.y);
  Matter.Body.setStatic(arrowBody, true);
  Matter.Composite.add(world, arrowBody);
}

function drawOverlay() {
  if (!render) return;
  const ctx = render.context;
  const w = worldW;
  const h = worldH;

  // Ground stripe
  ctx.fillStyle = cssVar("--accent-wash", "rgba(251,113,133,0.12)");
  ctx.fillRect(0, h * 0.88, w, h * 0.12);

  // Target rings + labels
  for (const t of targets) {
    if (!t.plugin || t.plugin.hit) continue;
    const { x, y } = t.position;
    const r = t.plugin.radius;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.55, 0, Math.PI * 2);
    ctx.strokeStyle = cssVar("--paper", "#FAF8F5");
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, r * 0.22, 0, Math.PI * 2);
    ctx.fillStyle = cssVar("--paper", "#FAF8F5");
    ctx.fill();
    ctx.font = "600 12px " + cssVar("--font", "system-ui");
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const ly = y + r + 12;
    ctx.fillStyle = cssVar("--paper", "#FAF8F5");
    ctx.strokeStyle = cssVar("--ink", "#1C1917");
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(x - 14, ly - 8, 28, 16, 4);
    } else {
      ctx.rect(x - 14, ly - 8, 28, 16);
    }
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = cssVar("--ink", "#1C1917");
    ctx.fillText(t.plugin.label, x, ly);
  }

  // Bow
  ctx.strokeStyle = cssVar("--ink", "#1C1917");
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(bow.x - 8, bow.y, 28, -Math.PI * 0.55, Math.PI * 0.55);
  ctx.stroke();

  const powerScale = cfg().powerScale;

  // Aim band + trajectory while pulling
  if (aiming && arrowBody) {
    const ax = bow.x + pull.x;
    const ay = bow.y + pull.y;
    ctx.strokeStyle = cssVar("--accent", "#FB7185");
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bow.x - 8, bow.y - 26);
    ctx.lineTo(ax, ay);
    ctx.lineTo(bow.x - 8, bow.y + 26);
    ctx.stroke();

    const power = Math.min(Math.hypot(pull.x, pull.y), MAX_PULL);
    if (power > 8) {
      // Match releaseShot impulse + approx air friction / gravity
      const vx0 = (-pull.x) * powerScale;
      const vy0 = (-pull.y) * powerScale;
      ctx.fillStyle = cssVar("--accent", "#FB7185");
      let px = bow.x;
      let py = bow.y;
      let pvx = vx0;
      let pvy = vy0;
      const g = (engine && engine.gravity.y) || cfg().gravity;
      // Matter applies gravity each tick ~ (gravity.y * 0.001 * delta * force); approximate dots
      const air = 0.99;
      for (let i = 0; i < 16; i++) {
        pvx *= air;
        pvy = pvy * air + g * 0.4;
        px += pvx * 2.4;
        py += pvy * 2.4;
        if (i % 2 === 0) {
          ctx.beginPath();
          ctx.arc(px, py, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  } else if (!inFlight && arrowBody) {
    ctx.strokeStyle = cssVar("--ink-soft", "#78716C");
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(bow.x - 8, bow.y - 26);
    ctx.lineTo(bow.x, bow.y);
    ctx.lineTo(bow.x - 8, bow.y + 26);
    ctx.stroke();
  }

  if (arrowBody) {
    const tip = arrowTip(arrowBody);
    ctx.fillStyle = cssVar("--accent", "#FB7185");
    ctx.beginPath();
    ctx.arc(tip.x, tip.y, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function arrowTip(body) {
  const a = body.angle;
  const len = 18;
  return {
    x: body.position.x + Math.cos(a) * len,
    y: body.position.y + Math.sin(a) * len,
  };
}

function onCollision(event) {
  if (!inFlight || !arrowBody || roundOver) return;
  const Matter = getMatter();
  for (const pair of event.pairs) {
    const a = pair.bodyA;
    const b = pair.bodyB;
    const other = a === arrowBody ? b : b === arrowBody ? a : null;
    if (!other || other.label !== "target") continue;
    if (!other.plugin || other.plugin.hit) continue;

    other.plugin.hit = true;
    Matter.Body.setStatic(other, true);
    Matter.Composite.remove(world, other);
    targets = targets.filter((t) => t !== other);

    const pts = other.plugin.pts || 10;
    round.hits += 1;
    round.targetsHit += 1;
    round.score += pts;
    updateHud();
    showFeedback(`Hit +${pts}`, "hit");

    Matter.Body.setVelocity(arrowBody, { x: 0, y: 0 });
    Matter.Body.setAngularVelocity(arrowBody, 0);
    Matter.Body.setStatic(arrowBody, true);

    clearTimeout(flightTimer);
    inFlight = false;

    if (targets.length === 0) {
      round.cleared = true;
      showFeedback("Cleared!", "clear");
      setTimeout(() => endRound(), 650);
    } else {
      setTimeout(() => afterShot(), 450);
    }
    return;
  }
}

/**
 * Map pointer to logical world coords (render.options / worldW×worldH),
 * never raw canvas.width when dpr ≠ 1.
 */
function pointerPos(e, canvas) {
  const rect = canvas.getBoundingClientRect();
  const src =
    e.touches && e.touches[0]
      ? e.touches[0]
      : e.changedTouches && e.changedTouches[0]
        ? e.changedTouches[0]
        : e;
  const logicalW =
    (render && render.options && render.options.width) || worldW || rect.width;
  const logicalH =
    (render && render.options && render.options.height) || worldH || rect.height;
  const scaleX = logicalW / (rect.width || 1);
  const scaleY = logicalH / (rect.height || 1);
  return {
    x: (src.clientX - rect.left) * scaleX,
    y: (src.clientY - rect.top) * scaleY,
  };
}

function canStartAim(p) {
  const c = cfg();
  const dx = p.x - bow.x;
  const dy = p.y - bow.y;
  if (Math.hypot(dx, dy) <= c.grabRadius) return true;
  // Finger-friendly: start drag anywhere on left portion of stage
  if (p.x <= worldW * c.forgiveLeft) return true;
  return false;
}

function bindStageInput() {
  const canvas = $("#stage");
  if (!canvas || stageInputBound) return;
  stageInputBound = true;

  const onDown = (e) => {
    const stage = $("#stage");
    if (!stage || !$("#screen-play").classList.contains("active")) return;
    if (inFlight || roundOver || round.arrowsLeft <= 0 || !arrowBody) return;
    e.preventDefault();
    const p = pointerPos(e, stage);
    if (!canStartAim(p)) return;
    aiming = true;
    document.body.classList.add("is-aiming");
    updatePull(p);
  };

  const onMove = (e) => {
    if (!aiming) return;
    const stage = $("#stage");
    if (!stage) return;
    e.preventDefault();
    updatePull(pointerPos(e, stage));
  };

  const onUp = (e) => {
    if (!aiming) return;
    e.preventDefault();
    aiming = false;
    document.body.classList.remove("is-aiming");
    releaseShot();
  };

  // Bind on stage-wrap too so absolute canvas / replaced sizing still gets events
  const wrap = $(".stage-wrap");
  const target = wrap || canvas;
  target.addEventListener("pointerdown", onDown, { passive: false });
  window.addEventListener("pointermove", onMove, { passive: false });
  window.addEventListener("pointerup", onUp, { passive: false });
  window.addEventListener("pointercancel", onUp, { passive: false });
}

function updatePull(p) {
  const Matter = getMatter();
  let dx = p.x - bow.x;
  let dy = p.y - bow.y;
  const len = Math.hypot(dx, dy) || 1;
  const clamped = Math.min(len, MAX_PULL);
  dx = (dx / len) * clamped;
  dy = (dy / len) * clamped;
  pull = { x: dx, y: dy };

  if (arrowBody) {
    Matter.Body.setPosition(arrowBody, { x: bow.x + dx, y: bow.y + dy });
    const angle = Math.atan2(-dy, -dx);
    Matter.Body.setAngle(arrowBody, angle);
  }
}

function releaseShot() {
  const Matter = getMatter();
  const power = Math.hypot(pull.x, pull.y);
  if (!arrowBody || power < 12) {
    if (arrowBody) {
      Matter.Body.setPosition(arrowBody, { x: bow.x, y: bow.y });
      Matter.Body.setAngle(arrowBody, 0);
    }
    pull = { x: 0, y: 0 };
    return;
  }

  const powerScale = cfg().powerScale;
  const vx = (-pull.x) * powerScale;
  const vy = (-pull.y) * powerScale;
  const angle = Math.atan2(vy, vx);

  Matter.Body.setStatic(arrowBody, false);
  Matter.Body.setAngle(arrowBody, angle);
  Matter.Body.setVelocity(arrowBody, { x: vx, y: vy });
  Matter.Body.setAngularVelocity(arrowBody, 0);

  Matter.Events.on(engine, "beforeUpdate", steerArrow);

  round.arrowsLeft -= 1;
  round.arrowsUsed += 1;
  pull = { x: 0, y: 0 };
  inFlight = true;
  updateHud();
  $("#play-hint").textContent = "Flying…";

  clearTimeout(flightTimer);
  flightTimer = setTimeout(() => {
    if (!inFlight) return;
    showFeedback("Miss", "miss");
    inFlight = false;
    afterShot();
  }, SETTLE_MS);
}

function steerArrow() {
  if (!arrowBody || !inFlight) return;
  const Matter = getMatter();
  const v = arrowBody.velocity;
  const speed = Math.hypot(v.x, v.y);
  if (speed > 0.4) {
    Matter.Body.setAngle(arrowBody, Math.atan2(v.y, v.x));
    Matter.Body.setAngularVelocity(arrowBody, 0);
  }
}

function afterShot() {
  const Matter = getMatter();
  if (engine) Matter.Events.off(engine, "beforeUpdate", steerArrow);
  if (arrowBody && world) {
    Matter.Composite.remove(world, arrowBody);
    arrowBody = null;
  }
  inFlight = false;

  if (round.cleared || targets.length === 0) {
    round.cleared = true;
    endRound();
    return;
  }
  if (round.arrowsLeft <= 0) {
    endRound();
    return;
  }
  $("#play-hint").textContent = "Drag back to aim · release to shoot";
  spawnNockedArrow();
}

function endRound() {
  if (roundOver) return;
  roundOver = true;
  clearTimeout(flightTimer);
  inFlight = false;
  aiming = false;
  document.body.classList.remove("is-aiming");
  setTimeout(() => showResults(), 400);
}

function showHome() {
  destroyPhysics();
  round = emptyRound();
  roundOver = false;
  showScreen("home");
  syncHardnessUI();
}

function startRound() {
  destroyPhysics();
  round = emptyRound();
  roundOver = false;
  showScreen("play");
  updateHud();
  $("#play-hint").textContent = "Drag back to aim · release to shoot";
  // Wait two frames so flex layout + stage-wrap have real bounds
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      initPhysics();
      updateHud();
    });
  });
}

function showResults() {
  destroyPhysics();
  showScreen("results");

  const maxA = round.maxArrows || cfg().arrows;
  $("#stat-hits").textContent = String(round.hits);
  $("#stat-score").textContent = String(round.score);
  $("#stat-arrows").textContent = `${round.arrowsUsed} / ${maxA}`;

  let sub = "Nice shooting";
  let note = "";
  const diff = round.hardnessLabel || cfg().label;
  if (round.cleared) {
    sub = "All targets cleared!";
    const bonus = Math.max(0, (maxA - round.arrowsUsed) * 15);
    if (bonus > 0) {
      round.score += bonus;
      $("#stat-score").textContent = String(round.score);
      note = `Clear bonus +${bonus} · ${diff}`;
    } else {
      note = `Perfect clear · ${diff}`;
    }
  } else if (round.hits === 0) {
    sub = "No hits this round";
    note = `Pull farther for more power · ${diff}`;
  } else if (round.hits >= Math.ceil((round.totalTargets || 4) * 0.6)) {
    sub = "Sharp aim";
    note = `${round.hits} hits · ${round.score} points · ${diff}`;
  } else {
    sub = "Round over";
    note = `${round.hits} hit${round.hits === 1 ? "" : "s"} · ${round.score} points · ${diff}`;
  }
  $("#results-sub").textContent = sub;
  $("#results-note").textContent = note;
}

function syncHardnessUI() {
  $$("#hardness-seg .seg-btn").forEach((btn) => {
    const id = btn.getAttribute("data-hardness");
    btn.setAttribute("aria-pressed", id === hardness ? "true" : "false");
  });
}

function setHardness(id) {
  if (!HARDNESS[id]) return;
  hardness = /** @type {keyof typeof HARDNESS} */ (id);
  saveHardness(id);
  syncHardnessUI();
}

function init() {
  howto = initHowto({
    overlay: $("#howto-overlay"),
    sheet: $("#howto-sheet"),
    gotItBtn: $("#btn-howto-gotit"),
    closeBtn: $("#btn-howto-close"),
    openBtn: $("#btn-howto"),
  });

  $("#btn-play").addEventListener("click", () => startRound());
  $("#btn-again").addEventListener("click", () => startRound());

  const seg = $("#hardness-seg");
  if (seg) {
    seg.addEventListener("click", (e) => {
      const btn = e.target.closest(".seg-btn");
      if (!btn) return;
      setHardness(btn.getAttribute("data-hardness"));
    });
  }

  syncHardnessUI();
  showHome();
  howto.maybeAutoShow();
}

init();
