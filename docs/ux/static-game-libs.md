# Static game libs for GH Pages (2D phone arcade)

**Context:** cliren/games hub — static GitHub Pages, vendored JS under `games/shared/vendor/`, **no runtime CDN**.  
**Date:** 2026-09-14. Sizes measured from `npm pack` artifacts (gzip -9 of published min/dist files), not invented.

---

## Deliverables (Games agent)

### 1) Top 3 stacks — 2D physics arcade on phones (drag-to-aim, runners, fling)

| Rank | Stack | Pinned packages | Approx. engine+physics (min+gzip) | Why |
|------|--------|-----------------|-----------------------------------|-----|
| **1** | **Canvas (or thin custom draw) + Matter.js** | `matter-js@0.20.0` | **~26 KB** (`build/matter.min.js`: 83 476 raw → **25 784 gz**) | Smallest workable physics. Touch via Matter `Mouse` / pointer events. Already vendored and used by `games/arrow-shot`. Ideal for fling / projectile / pullback. |
| **2** | **Kaplay + Matter.js** | `kaplay@3001.0.19` + `matter-js@0.20.0` | **~96 KB** (Kaplay `dist/kaplay.js` **69 540 gz** + Matter **25 784 gz**) | Tiny “game feel” API (sprites, scenes, input) without Phaser weight. Kaplay has area/collision helpers; Matter for real rigid-body aim/release. MIT both. Stable 3001 line; 4000 still alpha (2026). |
| **3** | **Phaser 4 arcade build** *(or full + Matter)* | `phaser@4.2.1` | Arcade: **`phaser-arcade-physics.min.js` ~320 KB gz** (1 266 396 raw → **319 663 gz**). Full: `phaser.min.js` **~352 KB gz**. Matter is **bundled** in full Phaser (not a separate download). | Batteries: scenes, loader, unified pointer/touch, Arcade *or* Matter (`this.matter.add.mouseSpring()` / pointerConstraint). Heavier than 1–2; best when you want one framework for many games. MIT. npm updated **2026-07-09**. |

**Honorable mentions (not top 3 for *physics* arcade):**

- **PixiJS 8 + Matter** — `pixi.js@8.20.1` `dist/pixi.min.js` **~231 KB gz** + Matter **~26 KB**. Best 2D renderer; you DIY game loop/scenes. MIT; npm **2026-08-26**.
- **Excalibur** — `excalibur@0.32.0` `build/dist/excalibur.min.js` **~147 KB gz**; built-in 2D collision/physics. BSD-2-Clause; last stable **2025-12-23**. Solid TS engine; smaller community than Phaser/Kaplay for quick arcade clones.
- **MelonJS** — `melonjs@20.4.0`; published `build/index.js` is unminified (**~532 KB gz** raw; **~260 KB gz** after local terser). Built-in SAT + official Matter/Planck adapters. MIT; very active (**2026-09-09**). Good engine, awkward to vendor without a minify step.

---

### 2) Top pick for first game: archery / arrow shot (drag pullback, projectile + targets)

**Recommendation: keep `matter-js@0.20.0` + canvas (current `games/arrow-shot` stack).**

| | |
|--|--|
| **Packages** | `matter-js@0.20.0` only (already at `games/shared/vendor/matter.min.js`) |
| **License** | MIT |
| **Size** | **~26 KB gzip** |
| **Why** | Drag-to-aim / release impulse is a few lines of pointer math + `Body.setVelocity` / `Body.applyForce`. Targets = circles/rects + collision events. No engine tax. Phone: Matter’s `Mouse` already maps touch → pointer; hub CSS already uses `touch-action: none` on the stage. |
| **When to upgrade** | If you need atlases, scenes, particles, audio helpers → add **Kaplay@3001.0.19** beside Matter (stack #2), still under ~100 KB gz combined. Reach for Phaser only if several games share scenes/UI/physics conventions. |

Do **not** pull Rapier/Cannon/Three for this game.

---

### 3) Bundle size + license (pinned) — comparison table

Sizes = gzip of the named file from the pinned npm tarball (measured 2026-09-14). Physics called out when separate.

#### Engines / frameworks

| Package | Version | License | Dist artifact | min+gzip | Physics | Phone / static | Maint. (as of Sep 2026) |
|---------|---------|---------|---------------|----------|---------|----------------|-------------------------|
| **phaser** | **4.2.1** | MIT | `dist/phaser.min.js` | **~352 KB** | Arcade + Matter **in bundle**; arcade-only build **~320 KB** gz | Official desktop+mobile; unified Input Manager (touch/mouse) | Active — npm **2026-07-09** ([npm](https://www.npmjs.com/package/phaser), [phaser.io](https://phaser.io)) |
| **pixi.js** | **8.20.1** | MIT | `dist/pixi.min.js` | **~231 KB** | Separate | Strong WebGL/WebGPU 2D; touch via events | Active — **2026-08-26** |
| **kaplay** | **3001.0.19** | MIT | `dist/kaplay.js` *(no separate .min in package)* | **~70 KB** | Built-in area/comp; pair Matter for rigid body | Touch-friendly; designed for short web games | Stable 3001 **2025-06**; 4000 alphas through **2026-05** ([GitHub releases](https://github.com/kaplayjs/kaplay/releases)) |
| **excalibur** | **0.32.0** | BSD-2-Clause | `build/dist/excalibur.min.js` | **~147 KB** | Built-in | Canvas/WebGL 2D; TS-first | Stable **2025-12-23**; pushes into **2026** |
| **melonjs** | **20.4.0** | MIT | `build/index.js` (unminified) | **~532 KB** as shipped; **~260 KB** after terser | Built-in SAT; Matter/Planck adapters | Explicit mobile + touch; WebGPU/WebGL/Canvas | Very active — **2026-09-09**; advertises ~250 KB minzip ([melonjs.org](http://www.melonjs.org/), [npm](https://www.npmjs.com/package/melonjs)) |
| **three** | **0.186.0** | MIT | `build/three.module.js` (unmin) | **~131 KB** module alone; full 3D stack grows fast | Separate | Overkill for 2D arcade | Active — **2026-09-08** |
| **playcanvas** | **2.22.2** | MIT (runtime) | `build/playcanvas.min.js` | **~632 KB** | Built-in 3D-oriented | 3D / editor-centric | Active — **2026-09-11** |

#### Physics

| Package | Version | License | Dist artifact | min+gzip | Notes |
|---------|---------|---------|---------------|----------|-------|
| **matter-js** | **0.20.0** | MIT | `build/matter.min.js` | **~26 KB** | 2D rigid body. Last npm **2024-06** (mature/stable). Touch in `Mouse`. **Vendored in hub.** |
| **planck-js** | **1.3.0** | MIT | `dist/planck.min.js` | **~55 KB** | Box2D port; more “correct”, heavier API. npm **2025-02**. |
| **cannon-es** | **0.20.0** | MIT | `dist/cannon-es.js` | **~75 KB** | **3D only.** Last release **2022-08** — stale for new 2D work. |
| **@dimforge/rapier2d** | **0.20.0** | Apache-2.0 | `rapier_wasm2d_bg.wasm` + JS glue | WASM **~554 KB gz** alone | Fast; needs async WASM init + correct MIME on Pages. Overkill for short arcade. Compat embed is larger. Updated **2026-08-08**. |

**Sources:** npm registry metadata; local `npm pack` + `gzip -9`; Phaser size also documented on [npm README](https://www.npmjs.com/package/phaser) (~345 KB gz full / arcade build table); Phaser Matter pointer drag: [docs.phaser.io Matter](https://docs.phaser.io/phaser/concepts/physics/matter).

---

### 4) How to vendor (no CDN)

Target layout: `games/shared/vendor/<name>/` or flat files (hub today: `games/shared/vendor/matter.min.js`).

```bash
# From repo root (or a scratch dir). Pin exact versions.
mkdir -p games/shared/vendor

# --- Matter (already done for arrow-shot) ---
npm pack matter-js@0.20.0
tar -xzf matter-js-0.20.0.tgz
cp package/build/matter.min.js games/shared/vendor/matter.min.js
# optional: keep LICENSE
cp package/LICENSE games/shared/vendor/matter.LICENSE.txt
rm -rf package matter-js-0.20.0.tgz

# --- Kaplay ---
npm pack kaplay@3001.0.19
tar -xzf kaplay-3001.0.19.tgz
mkdir -p games/shared/vendor/kaplay
cp package/dist/kaplay.js games/shared/vendor/kaplay/kaplay.js
cp package/LICENSE games/shared/vendor/kaplay/LICENSE
rm -rf package kaplay-3001.0.19.tgz

# --- Phaser (prefer arcade-only if you don't need Matter-in-Phaser) ---
npm pack phaser@4.2.1
tar -xzf phaser-4.2.1.tgz
mkdir -p games/shared/vendor/phaser
cp package/dist/phaser-arcade-physics.min.js games/shared/vendor/phaser/
# or: cp package/dist/phaser.min.js  # full + Matter
cp package/license.txt games/shared/vendor/phaser/ 2>/dev/null || true
rm -rf package phaser-4.2.1.tgz

# --- Pixi ---
npm pack pixi.js@8.20.1
tar -xzf pixi.js-8.20.1.tgz
mkdir -p games/shared/vendor/pixi
cp package/dist/pixi.min.js games/shared/vendor/pixi/
rm -rf package pixi.js-8.20.1.tgz
```

**HTML (static Pages):**

```html
<script src="../../shared/vendor/matter.min.js"></script>
<!-- or module: -->
<script type="module" src="./js/app.js"></script>
```

Rules: commit the copied artifacts; never `https://cdn…` at runtime; bump by re-`npm pack`ing the same pinned version string and re-copying; keep LICENSE next to the file.

---

### 5) What to avoid (and why)

| Avoid | Why |
|-------|-----|
| **PlayCanvas / Three.js as default for 2D arcade** | 3D-centric; PlayCanvas min alone **~632 KB gz**; Three grows with addons. Wrong fit for short phone flings. |
| **Cannon-es** | 3D API; **no release since 2022**. |
| **Rapier (wasm) for first games** | ~**0.5+ MB** gz WASM + async init + Pages MIME/`COOP` footguns; power you won’t use for archery/runners. |
| **Runtime CDNs** (jsDelivr, unpkg, Skypack) | Breaks offline / flaky China / CSP / “ship the repo” goal. Vendor instead. |
| **Full Phaser for every microgame** | ~350 KB gz when canvas+Matter (~26 KB) or Kaplay+Matter (~96 KB) suffice. Use Phaser when shared scenes/tooling pay for it. |
| **MelonJS without minify** | Published bundle is fat unminified JS; fine after esbuild/terser, awkward as a drop-in vendor copy. |
| **Kaplay 4000 alpha** for production hub games | Prefer **3001.0.19** until 4000 stabilizes. |

---

## Ranked shortlist (2D phone + desktop, GH Pages)

1. **Matter.js 0.20.0** (± canvas) — default physics for fling/aim  
2. **Kaplay 3001.0.19 + Matter** — small “real game” stack  
3. **Phaser 4.2.1** (arcade build first) — when you want one full framework  
4. Pixi 8 + Matter — rendering-heavy 2D  
5. Excalibur 0.32 — TS-native mid-size  
6. MelonJS 20 — feature-rich; minify before vendor  

## One recommended stack (hub default)

**Rendering:** HTML canvas (or Kaplay if you want sprites/scenes).  
**Physics:** **`matter-js@0.20.0`** → `games/shared/vendor/matter.min.js`.  

**Why:** Evidence-smallest rigid-body option that already matches `arrow-shot` (drag pullback → impulse → target hits), MIT, single file, works offline on GH Pages, touch-capable. Scale up to Kaplay or Phaser only when content needs justify the extra ~70–320 KB.

## Start here (one paragraph)

Pin `matter-js@0.20.0`, run `npm pack matter-js@0.20.0`, extract, copy `package/build/matter.min.js` into `games/shared/vendor/matter.min.js` (already present), commit it with its MIT license notice, and load it with a relative `<script src="../../shared/vendor/matter.min.js">` before your module—no CDN. Implement aim with pointerdown/move/up on the canvas (`touch-action: none`), apply release velocity with `Matter.Body.setVelocity`, and detect hits via `Matter.Events.on(engine, 'collisionStart', …)`. When a later game needs sprites/scenes without Phaser’s weight, `npm pack kaplay@3001.0.19` and vendor `dist/kaplay.js` the same way beside Matter.

---

## Evidence footnotes

- Phaser advertised sizes: [npmjs.com/package/phaser](https://www.npmjs.com/package/phaser) (full min **345 KB** gz; arcade table). Measured arcade min **319 663** bytes gz.  
- Phaser Matter drag: [docs.phaser.io — Matter Physics](https://docs.phaser.io/phaser/concepts/physics/matter).  
- MelonJS footprint claim / MIT / mobile: [npmjs.com/package/melonjs](https://www.npmjs.com/package/melonjs) README (~250 KB minzip; touch/mouse).  
- Rapier packages / compat WASM: [npmjs.com/package/@dimforge/rapier2d](https://www.npmjs.com/package/@dimforge/rapier2d), [rapier.rs JS guide](https://rapier.rs/docs/user_guides/javascript/getting_started_js/).  
- Kaplay releases: [github.com/kaplayjs/kaplay/releases](https://github.com/kaplayjs/kaplay/releases).  
- Excalibur license/repo: [github.com/excaliburjs/Excalibur](https://github.com/excaliburjs/Excalibur) (BSD-2-Clause).  
- All byte counts: `npm pack <pkg>@<ver>` then `gzip -c -9 <file> | wc -c` on this box, 2026-09-14.
