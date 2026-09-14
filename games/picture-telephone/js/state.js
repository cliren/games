/**
 * Game state schema, compression, URL hash + localStorage I/O.
 * Schema version 1.
 *
 * Soft hash budget 8KB / hard 16KB → turn-file path (locked Decision).
 * Solo: playerCount === 1; turns = 3|4|5 (default 4). Multi: turns === playerCount.
 */

const SCHEMA_V = 1;
const STORAGE_KEY = "picture-telephone-draft";
/** Soft limit (chars) — quiet hint; still prefer Next / Copy */
const MAX_HASH_SOFT = 8192;
/** Hard limit (chars) — force turn file for multi-device; never block hotseat */
const MAX_HASH_HARD = 16384;

/** @typedef {{ w: number, p: number[] }} Polyline */
/** @typedef {{ t: "d", a: string, s: Polyline[] } | { t: "g", a: string, x: string }} ChainEntry */
/** @typedef {{
 *   v: number,
 *   playerCount: number,
 *   turns: number,
 *   players: string[],
 *   prompt: string,
 *   promptAuthor: string,
 *   chain: ChainEntry[],
 * }} GameState */

export function createEmptyState() {
  return {
    v: SCHEMA_V,
    playerCount: 3,
    turns: 3,
    players: [],
    prompt: "",
    promptAuthor: "",
    chain: [],
  };
}

/** Target chain length (solo uses turns; older hashes fall back to playerCount). */
export function turnTarget(state) {
  return state.turns != null ? state.turns : state.playerCount;
}

export function isSolo(state) {
  return state.playerCount === 1;
}

export function nextPhase(state) {
  if (state.chain.length >= turnTarget(state)) return "reveal";
  if (state.chain.length === 0) return "draw";
  return state.chain.length % 2 === 1 ? "describe" : "draw";
}

export function turnsRemaining(state) {
  return Math.max(0, turnTarget(state) - state.chain.length);
}

export function lastEntry(state) {
  return state.chain[state.chain.length - 1] || null;
}

/** Quantize stroke points to integers 0–1000 for compact encoding. */
export function quantizeStrokes(strokes) {
  return strokes.map((stroke) => ({
    w: Math.round(stroke.width * 10) / 10,
    p: stroke.points.map((n) => Math.round(Math.min(1000, Math.max(0, n)))),
  }));
}

export function dequantizeStrokes(polylines) {
  return polylines.map((pl) => ({
    width: pl.w,
    points: pl.p.slice(),
  }));
}

function toBase64Url(bytes) {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(str) {
  const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/** Lightweight LZ77-ish compressor for UTF-8 bytes. */
function compressClean(raw) {
  const out = [];
  let i = 0;
  while (i < raw.length) {
    let bestLen = 0;
    let bestDist = 0;
    const winStart = Math.max(0, i - 2047);
    for (let j = winStart; j < i; j++) {
      let len = 0;
      const maxLen = Math.min(66, raw.length - i);
      while (len < maxLen && raw[j + len] === raw[i + len]) len++;
      if (len > bestLen) {
        bestLen = len;
        bestDist = i - j;
      }
    }
    if (bestLen >= 3) {
      const L = Math.min(63, bestLen - 3);
      out.push(0xc0 | L);
      out.push((bestDist >> 8) & 0xff);
      out.push(bestDist & 0xff);
      i += L + 3;
    } else {
      const b = raw[i];
      if (b >= 0xc0) {
        out.push(0x00);
        out.push(b);
      } else {
        out.push(b);
      }
      i++;
    }
  }
  return new Uint8Array(out);
}

function decompressClean(data) {
  const out = [];
  let i = 0;
  while (i < data.length) {
    const b = data[i++];
    if (b === 0x00 && i < data.length) {
      out.push(data[i++]);
    } else if ((b & 0xc0) === 0xc0) {
      const len = (b & 0x3f) + 3;
      const dist = (data[i++] << 8) | data[i++];
      const start = out.length - dist;
      for (let k = 0; k < len; k++) out.push(out[start + k]);
    } else {
      out.push(b);
    }
  }
  return new Uint8Array(out);
}

export function serializeState(state) {
  const json = JSON.stringify(state);
  const compressed = compressClean(new TextEncoder().encode(json));
  return "pt1." + toBase64Url(compressed);
}

export function deserializeState(encoded) {
  if (!encoded) throw new Error("Empty state");
  let payload = encoded;
  if (payload.startsWith("#")) payload = payload.slice(1);
  if (payload.startsWith("pt1.")) {
    const bytes = fromBase64Url(payload.slice(4));
    const jsonBytes = decompressClean(bytes);
    const json = new TextDecoder().decode(jsonBytes);
    const state = JSON.parse(json);
    if (state.v !== SCHEMA_V) throw new Error("Unsupported game version");
    if (state.turns == null) state.turns = state.playerCount;
    return state;
  }
  const state = JSON.parse(payload);
  if (state.v !== SCHEMA_V) throw new Error("Unsupported game version");
  if (state.turns == null) state.turns = state.playerCount;
  return state;
}

export function encodeToHash(state) {
  const encoded = serializeState(state);
  const len = encoded.length;
  return {
    hash: encoded,
    softLong: len > MAX_HASH_SOFT,
    tooLong: len > MAX_HASH_HARD,
  };
}

export function readStateFromHash() {
  const hash = location.hash.replace(/^#/, "");
  if (!hash || hash === "home") return null;
  try {
    return deserializeState(hash);
  } catch {
    return null;
  }
}

export function writeHash(state) {
  const { hash, softLong, tooLong } = encodeToHash(state);
  if (!tooLong) {
    const url = location.pathname + location.search + "#" + hash;
    history.replaceState(null, "", url);
  }
  return {
    hash,
    softLong,
    tooLong,
    url: location.origin + location.pathname + location.search + "#" + hash,
  };
}

export function fullShareUrl(hash) {
  return location.origin + location.pathname + location.search + "#" + hash;
}

export function saveDraft(partial) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...partial, _ts: Date.now() }));
  } catch {
    /* ignore quota */
  }
}

export function loadDraft() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function downloadTurnFile(state, filename = "picture-telephone.pturn.json") {
  const blob = new Blob([JSON.stringify(state)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export async function importTurnFile(file) {
  const text = await file.text();
  return deserializeState(text.trim());
}

export { MAX_HASH_SOFT, MAX_HASH_HARD, SCHEMA_V, STORAGE_KEY };
