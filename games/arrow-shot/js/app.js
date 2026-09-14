import { initHowto } from "./howto.js";

const MAX_ARROWS = 5;
const MAX_PULL = 90;
const POWER_SCALE = 0.18;
const SETTLE_MS = 2200;

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

/** @type {ReturnType<typeof initHowto> | null} */
let howto = null;

/** @type {{
 *  arrowsLeft: number,
 *  hits: number,
 *  score: number,
 *  arrowsUsed: number,
 *  targetsHit: number,
 *  totalTargets: number,
 *  cleared: boolean,
 * }} */
let round = emptyRound();

let engine = null;
let render = null;
let runner = null;
let world = null;
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

function emptyRound() {
  return {
    arrowsLeft: MAX_ARROWS,
    hits: 0,
    score: 0,
    arrowsUsed: 0,
    targetsHit: 0,
    totalTargets: 0,
    cleared: false,
  };
}

function showScreen(id) {
  $$(".screen").forEach((el) => el.classList.remove("active"));
  const screen = document.getElementById("screen-" + id);
  if (screen) screen.classList.add("active");
  window.scrollTo({ top: 0, behavior: "auto" });
}

function updateHud() {
  $("#hud-arrows").textContent = String(round.arrowsLeft);
  $("#hud-hits").textContent = String(round.hits);
  $("#hud-score").textContent = String(round.score);
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
  const w = Math.max(280, Math.floor(wrap.clientWidth || 360));
  const h = Math.max(360, Math.floor(Math.min(window.innerHeight * 0.62, wrap.clientHeight || 520)));
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
    if (render.canvas && render.canvas.parentNode) {
      /* keep canvas element; Matter created its own — we use our #stage */
    }
    render = null;
  }
  if (engine && Matter) {
    Matter.World.clear(engine.world, false);
    Matter.Engine.clear(engine);
    engine = null;
    world = null;
  }
}

function buildTargets(Matter, w, h) {
  const layouts = [
    { x: w * 0.72, y: h * 0.28, r: 28, pts: 30, label: "30" },
    { x: w * 0.82, y: h * 0.48, r: 34, pts: 20, label: "20" },
    { x: w * 0.68, y: h * 0.68, r: 24, pts: 40, label: "40" },
    { x: w * 0.88, y: h * 0.22, r: 18, pts: 50, label: "50" },
  ];

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
    density: 0.004,
    frictionAir: 0.012,
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
  canvas.width = w;
  canvas.height = h;

  bow = { x: Math.max(56, w * 0.16), y: h * 0.62 };

  engine = Matter.Engine.create({
    gravity: { x: 0, y: 1.05 },
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
      pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
    },
  });

  // Custom after-render for bow, pull band, rings, labels
  Matter.Events.on(render, "afterRender", drawOverlay);

  Matter.Events.on(engine, "collisionStart", onCollision);

  runner = Matter.Runner.create();
  Matter.Runner.run(runner, engine);
  Matter.Render.run(render);

  spawnNockedArrow();
  bindStageInput(canvas);

  if (typeof ResizeObserver !== "undefined") {
    resizeObs = new ResizeObserver(() => {
      if (!$("#screen-play").classList.contains("active") || inFlight || aiming) return;
      // soft resize: rebuild only if size changed a lot
      const next = stageSize();
      if (Math.abs(next.w - canvas.width) > 24 || Math.abs(next.h - canvas.height) > 24) {
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
  const canvas = render.canvas;
  const w = canvas.width;
  const h = canvas.height;

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

  // Aim band + ghost arrow while pulling
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

    // Trajectory dots
    const power = Math.min(Math.hypot(pull.x, pull.y), MAX_PULL);
    if (power > 8) {
      const vx = (-pull.x) * POWER_SCALE;
      const vy = (-pull.y) * POWER_SCALE;
      ctx.fillStyle = cssVar("--accent", "#FB7185");
      let px = bow.x;
      let py = bow.y;
      let pvx = vx;
      let pvy = vy;
      const g = (engine && engine.gravity.y) || 1;
      for (let i = 0; i < 14; i++) {
        pvx *= 0.998;
        pvy += g * 0.35;
        px += pvx * 2.2;
        py += pvy * 2.2;
        if (i % 2 === 0) {
          ctx.beginPath();
          ctx.arc(px, py, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  } else if (!inFlight && arrowBody) {
    // idle string
    ctx.strokeStyle = cssVar("--ink-soft", "#78716C");
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(bow.x - 8, bow.y - 26);
    ctx.lineTo(bow.x, bow.y);
    ctx.lineTo(bow.x - 8, bow.y + 26);
    ctx.stroke();
  }

  // Arrow tip marker when in flight / nocked
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

    // Stop arrow on hit for clarity
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

function pointerPos(e, canvas) {
  const rect = canvas.getBoundingClientRect();
  const src = e.touches && e.touches[0] ? e.touches[0] : e.changedTouches && e.changedTouches[0] ? e.changedTouches[0] : e;
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (src.clientX - rect.left) * scaleX,
    y: (src.clientY - rect.top) * scaleY,
  };
}

function bindStageInput(canvas) {
  // Replace listeners by cloning node? Better: mark and use once-bound flag
  if (canvas.dataset.bound === "1") return;
  canvas.dataset.bound = "1";

  const onDown = (e) => {
    if (!$("#screen-play").classList.contains("active")) return;
    if (inFlight || roundOver || round.arrowsLeft <= 0 || !arrowBody) return;
    e.preventDefault();
    const p = pointerPos(e, canvas);
    // start aim if near bow / arrow
    const dx = p.x - bow.x;
    const dy = p.y - bow.y;
    if (Math.hypot(dx, dy) > 120) return;
    aiming = true;
    document.body.classList.add("is-aiming");
    updatePull(p);
  };

  const onMove = (e) => {
    if (!aiming) return;
    e.preventDefault();
    updatePull(pointerPos(e, canvas));
  };

  const onUp = (e) => {
    if (!aiming) return;
    e.preventDefault();
    aiming = false;
    document.body.classList.remove("is-aiming");
    releaseShot();
  };

  canvas.addEventListener("pointerdown", onDown, { passive: false });
  window.addEventListener("pointermove", onMove, { passive: false });
  window.addEventListener("pointerup", onUp, { passive: false });
  window.addEventListener("pointercancel", onUp, { passive: false });
}

function updatePull(p) {
  const Matter = getMatter();
  let dx = p.x - bow.x;
  let dy = p.y - bow.y;
  // Prefer pulling back (left-ish)
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
    // reset nock
    if (arrowBody) {
      Matter.Body.setPosition(arrowBody, { x: bow.x, y: bow.y });
      Matter.Body.setAngle(arrowBody, 0);
    }
    pull = { x: 0, y: 0 };
    return;
  }

  const vx = (-pull.x) * POWER_SCALE;
  const vy = (-pull.y) * POWER_SCALE;
  const angle = Math.atan2(vy, vx);

  Matter.Body.setStatic(arrowBody, false);
  Matter.Body.setAngle(arrowBody, angle);
  Matter.Body.setVelocity(arrowBody, { x: vx, y: vy });
  Matter.Body.setAngularVelocity(arrowBody, 0);

  // Keep arrow pointed along velocity
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
    // Miss — no new hit this flight
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
  Matter.Events.off(engine, "beforeUpdate", steerArrow);
  if (arrowBody) {
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
}

function startRound() {
  destroyPhysics();
  round = emptyRound();
  roundOver = false;
  showScreen("play");
  updateHud();
  $("#play-hint").textContent = "Drag back to aim · release to shoot";
  // layout after display
  requestAnimationFrame(() => {
    initPhysics();
    updateHud();
  });
}

function showResults() {
  destroyPhysics();
  showScreen("results");

  $("#stat-hits").textContent = String(round.hits);
  $("#stat-score").textContent = String(round.score);
  $("#stat-arrows").textContent = `${round.arrowsUsed} / ${MAX_ARROWS}`;

  let sub = "Nice shooting";
  let note = "";
  if (round.cleared) {
    sub = "All targets cleared!";
    const bonus = Math.max(0, (MAX_ARROWS - round.arrowsUsed) * 15);
    if (bonus > 0) {
      round.score += bonus;
      $("#stat-score").textContent = String(round.score);
      note = `Clear bonus +${bonus}`;
    } else {
      note = "Perfect clear";
    }
  } else if (round.hits === 0) {
    sub = "No hits this round";
    note = "Pull farther for more power · aim above the mark";
  } else if (round.hits >= 3) {
    sub = "Sharp aim";
    note = `${round.hits} hits · ${round.score} points`;
  } else {
    sub = "Round over";
    note = `${round.hits} hit${round.hits === 1 ? "" : "s"} · ${round.score} points`;
  }
  $("#results-sub").textContent = sub;
  $("#results-note").textContent = note;
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

  showHome();
  howto.maybeAutoShow();
}

init();
