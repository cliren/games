/**
 * Touch-friendly drawing canvas with stroke vectors, undo, clear, pen sizes.
 * Coordinates stored in normalized 0–1000 space. Canvas surface always #FFFFFF.
 * DPR capped at 2. Ink paints at 0ms (immediate).
 */

const CANVAS_BG = "#FFFFFF";
const INK = "#1C1917";

export class DrawCanvas {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {{ readOnly?: boolean }} opts
   */
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.readOnly = !!opts.readOnly;
    /** @type {{ width: number, points: number[] }[]} */
    this.strokes = [];
    this._current = null;
    this.penWidth = 4;
    this._dpr = 1;
    this._cssW = 0;
    this._cssH = 0;
    this._bound = false;
    this.onChange = null;

    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);
    this._onResize = () => this.resize();
  }

  mount() {
    this.resize();
    if (!this.readOnly && !this._bound) {
      this.canvas.addEventListener("pointerdown", this._onPointerDown);
      this.canvas.addEventListener("pointermove", this._onPointerMove);
      this.canvas.addEventListener("pointerup", this._onPointerUp);
      this.canvas.addEventListener("pointercancel", this._onPointerUp);
      this._bound = true;
    }
    window.addEventListener("resize", this._onResize);
    this.redraw();
  }

  destroy() {
    if (this._bound) {
      this.canvas.removeEventListener("pointerdown", this._onPointerDown);
      this.canvas.removeEventListener("pointermove", this._onPointerMove);
      this.canvas.removeEventListener("pointerup", this._onPointerUp);
      this.canvas.removeEventListener("pointercancel", this._onPointerUp);
      this._bound = false;
    }
    window.removeEventListener("resize", this._onResize);
  }

  resize() {
    const parent = this.canvas.parentElement;
    const w = Math.min(parent ? parent.clientWidth : 360, 520);
    const h = Math.round(w * 0.75);
    this._dpr = Math.min(window.devicePixelRatio || 1, 2);
    this._cssW = w;
    this._cssH = h;
    this.canvas.style.width = w + "px";
    this.canvas.style.height = h + "px";
    this.canvas.width = Math.round(w * this._dpr);
    this.canvas.height = Math.round(h * this._dpr);
    this.ctx.setTransform(this._dpr, 0, 0, this._dpr, 0, 0);
    this.redraw();
  }

  setPenWidth(w) {
    this.penWidth = w;
  }

  setStrokes(strokes) {
    this.strokes = (strokes || []).map((s) => ({
      width: s.width,
      points: s.points.slice(),
    }));
    this.redraw();
  }

  getStrokes() {
    return this.strokes.map((s) => ({
      width: s.width,
      points: s.points.slice(),
    }));
  }

  undo() {
    if (!this.strokes.length) return;
    this.strokes.pop();
    this.redraw();
    this._emit();
  }

  clear() {
    this.strokes = [];
    this.redraw();
    this._emit();
  }

  hasInk() {
    return this.strokes.some((s) => s.points.length >= 4);
  }

  _norm(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 1000;
    const y = ((clientY - rect.top) / rect.height) * 1000;
    return [
      Math.min(1000, Math.max(0, x)),
      Math.min(1000, Math.max(0, y)),
    ];
  }

  _onPointerDown(e) {
    if (this.readOnly) return;
    e.preventDefault();
    this.canvas.setPointerCapture(e.pointerId);
    const [x, y] = this._norm(e.clientX, e.clientY);
    this._current = { width: this.penWidth, points: [x, y] };
    this.strokes.push(this._current);
  }

  _onPointerMove(e) {
    if (!this._current) return;
    e.preventDefault();
    const [x, y] = this._norm(e.clientX, e.clientY);
    const pts = this._current.points;
    const lx = pts[pts.length - 2];
    const ly = pts[pts.length - 1];
    // Soft simplify: skip near-duplicate points
    if ((x - lx) * (x - lx) + (y - ly) * (y - ly) < 2.5) return;
    pts.push(x, y);
    this._drawStrokeSegment(this._current, pts.length - 4);
  }

  _onPointerUp() {
    if (!this._current) return;
    if (this._current.points.length < 4) {
      const x = this._current.points[0];
      const y = this._current.points[1];
      this._current.points.push(x + 0.5, y + 0.5);
      this.redraw();
    }
    this._current = null;
    this._emit();
  }

  _emit() {
    if (this.onChange) this.onChange();
  }

  _toCss(nx, ny) {
    return [(nx / 1000) * this._cssW, (ny / 1000) * this._cssH];
  }

  _penCss(normWidth) {
    return normWidth * (this._cssW / 360);
  }

  redraw() {
    const ctx = this.ctx;
    const w = this._cssW;
    const h = this._cssH;
    if (!w || !h) return;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = CANVAS_BG;
    ctx.fillRect(0, 0, w, h);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = INK;
    for (const stroke of this.strokes) {
      this._paintStroke(stroke);
    }
  }

  _paintStroke(stroke) {
    const pts = stroke.points;
    if (pts.length < 2) return;
    const ctx = this.ctx;
    ctx.lineWidth = this._penCss(stroke.width);
    ctx.beginPath();
    const [x0, y0] = this._toCss(pts[0], pts[1]);
    ctx.moveTo(x0, y0);
    for (let i = 2; i < pts.length; i += 2) {
      const [x, y] = this._toCss(pts[i], pts[i + 1]);
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  _drawStrokeSegment(stroke, fromIdx) {
    const pts = stroke.points;
    if (fromIdx < 0 || fromIdx + 3 >= pts.length) {
      this.redraw();
      return;
    }
    const ctx = this.ctx;
    ctx.strokeStyle = INK;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = this._penCss(stroke.width);
    ctx.beginPath();
    const [x0, y0] = this._toCss(pts[fromIdx], pts[fromIdx + 1]);
    const [x1, y1] = this._toCss(pts[fromIdx + 2], pts[fromIdx + 3]);
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }
}

export function paintStrokesOnCanvas(canvas, strokes) {
  const dc = new DrawCanvas(canvas, { readOnly: true });
  dc.mount();
  dc.setStrokes(strokes || []);
  return dc;
}
