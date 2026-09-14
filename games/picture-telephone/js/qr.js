/**
 * Minimal QR Code generator — Byte mode, ECC Level M, versions 1–20.
 * No external dependencies. Outputs SVG.
 */

/** Per version: [dataCodewords, [ [numBlocks, dataPerBlock, ecPerBlock], ...groups ]] */
const VERSIONS = {
  1:  [16,  [[1, 16, 10]]],
  2:  [28,  [[1, 28, 16]]],
  3:  [44,  [[1, 44, 26]]],
  4:  [64,  [[2, 32, 18]]],
  5:  [86,  [[2, 43, 24]]],
  6:  [108, [[4, 27, 16]]],
  7:  [124, [[4, 31, 18]]],
  8:  [154, [[2, 38, 22], [2, 39, 22]]],
  9:  [182, [[3, 36, 22], [2, 37, 22]]],
  10: [216, [[4, 43, 26], [1, 44, 26]]],
  11: [254, [[1, 50, 30], [4, 51, 30]]],
  12: [290, [[6, 36, 22], [2, 37, 22]]],
  13: [334, [[8, 37, 22], [1, 38, 22]]],
  14: [365, [[4, 40, 24], [5, 41, 24]]],
  15: [415, [[5, 41, 24], [5, 42, 24]]],
  16: [453, [[7, 45, 28], [3, 46, 28]]],
  17: [507, [[10, 46, 28], [1, 47, 28]]],
  18: [563, [[9, 43, 26], [4, 44, 26]]],
  19: [627, [[3, 44, 26], [11, 45, 26]]],
  20: [669, [[3, 41, 26], [13, 42, 26]]],
};

const ALIGNMENT = {
  1: [],
  2: [6, 18],
  3: [6, 22],
  4: [6, 26],
  5: [6, 30],
  6: [6, 34],
  7: [6, 22, 38],
  8: [6, 24, 42],
  9: [6, 26, 46],
  10: [6, 28, 50],
  11: [6, 30, 54],
  12: [6, 32, 58],
  13: [6, 34, 62],
  14: [6, 26, 46, 66],
  15: [6, 26, 48, 70],
  16: [6, 26, 50, 74],
  17: [6, 30, 54, 78],
  18: [6, 30, 56, 82],
  19: [6, 30, 58, 86],
  20: [6, 34, 62, 90],
};

// Galois field tables for GF(256)
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
(function initGF() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
})();

function gfMul(a, b) {
  if (!a || !b) return 0;
  return EXP[LOG[a] + LOG[b]];
}

function rsGenerator(ecLen) {
  let g = [1];
  for (let i = 0; i < ecLen; i++) {
    const next = new Array(g.length + 1).fill(0);
    for (let j = 0; j < g.length; j++) {
      next[j] ^= g[j];
      next[j + 1] ^= gfMul(g[j], EXP[i]);
    }
    g = next;
  }
  return g;
}

function rsEncode(data, ecLen) {
  const gen = rsGenerator(ecLen);
  const msg = data.concat(new Array(ecLen).fill(0));
  for (let i = 0; i < data.length; i++) {
    const coef = msg[i];
    if (!coef) continue;
    for (let j = 0; j < gen.length; j++) msg[i + j] ^= gfMul(gen[j], coef);
  }
  return msg.slice(data.length);
}

function moduleSize(v) {
  return 21 + (v - 1) * 4;
}

function chooseVersion(byteLen) {
  for (let v = 1; v <= 20; v++) {
    const [capacity] = VERSIONS[v];
    const lenBits = v <= 9 ? 8 : 16;
    const need = Math.ceil((4 + lenBits + byteLen * 8) / 8);
    if (need <= capacity) return v;
  }
  return null;
}

function encodeData(bytes, version) {
  const [capacity, groups] = VERSIONS[version];
  const lenBits = version <= 9 ? 8 : 16;
  const bits = [];
  const push = (val, n) => {
    for (let i = n - 1; i >= 0; i--) bits.push((val >> i) & 1);
  };
  push(0b0100, 4);
  push(bytes.length, lenBits);
  for (const b of bytes) push(b, 8);
  const capBits = capacity * 8;
  push(0, Math.min(4, capBits - bits.length));
  while (bits.length % 8) bits.push(0);
  const codewords = [];
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) b = (b << 1) | (bits[i + j] || 0);
    codewords.push(b);
  }
  const pads = [0xec, 0x11];
  let pi = 0;
  while (codewords.length < capacity) {
    codewords.push(pads[pi++ % 2]);
  }

  const blocks = [];
  let offset = 0;
  let ecPerBlock = 0;
  for (const [num, dataPer, ecPer] of groups) {
    ecPerBlock = ecPer;
    for (let i = 0; i < num; i++) {
      const data = codewords.slice(offset, offset + dataPer);
      offset += dataPer;
      blocks.push({ data, ec: rsEncode(data, ecPer) });
    }
  }

  const result = [];
  const maxData = Math.max(...blocks.map((b) => b.data.length));
  for (let i = 0; i < maxData; i++) {
    for (const b of blocks) if (i < b.data.length) result.push(b.data[i]);
  }
  for (let i = 0; i < ecPerBlock; i++) {
    for (const b of blocks) result.push(b.ec[i]);
  }
  return result;
}

function placeFinder(mod, ox, oy) {
  const size = mod.length;
  for (let dy = -1; dy <= 7; dy++) {
    for (let dx = -1; dx <= 7; dx++) {
      const x = ox + dx, y = oy + dy;
      if (x < 0 || y < 0 || x >= size || y >= size) continue;
      const ring = Math.max(
        Math.abs(Math.min(Math.max(dx, 0), 6) - 3) > 2 && dx >= 0 && dx <= 6 && dy >= 0 && dy <= 6 ? 0 : 1,
        0
      );
      let on = false;
      if (dx >= 0 && dx <= 6 && dy >= 0 && dy <= 6) {
        on =
          dx === 0 || dx === 6 || dy === 0 || dy === 6 ||
          (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4);
      }
      // separators stay light (already null/0)
      if (dx === -1 || dx === 7 || dy === -1 || dy === 7) on = false;
      mod[y][x] = on ? 1 : 0;
    }
  }
}

function placeAlignments(mod, version) {
  const pos = ALIGNMENT[version];
  const size = mod.length;
  for (const cy of pos) {
    for (const cx of pos) {
      if ((cx < 9 && cy < 9) || (cx > size - 10 && cy < 9) || (cx < 9 && cy > size - 10))
        continue;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const ring = Math.max(Math.abs(dx), Math.abs(dy));
          mod[cy + dy][cx + dx] = ring === 0 || ring === 2 ? 1 : 0;
        }
      }
    }
  }
}

function buildReserved(size, version) {
  const r = Array.from({ length: size }, () => Array(size).fill(false));
  const mark = (x, y) => {
    if (x >= 0 && y >= 0 && x < size && y < size) r[y][x] = true;
  };
  for (let y = 0; y < 9; y++) for (let x = 0; x < 9; x++) mark(x, y);
  for (let y = 0; y < 9; y++) for (let x = size - 8; x < size; x++) mark(x, y);
  for (let y = size - 8; y < size; y++) for (let x = 0; x < 9; x++) mark(x, y);
  for (let i = 0; i < size; i++) {
    mark(6, i);
    mark(i, 6);
  }
  mark(8, size - 8);
  for (let i = 0; i < 9; i++) {
    mark(8, i);
    mark(i, 8);
  }
  for (let i = 0; i < 8; i++) {
    mark(size - 1 - i, 8);
    mark(8, size - 1 - i);
  }
  const pos = ALIGNMENT[version];
  for (const cy of pos) {
    for (const cx of pos) {
      if ((cx < 9 && cy < 9) || (cx > size - 10 && cy < 9) || (cx < 9 && cy > size - 10))
        continue;
      for (let dy = -2; dy <= 2; dy++)
        for (let dx = -2; dx <= 2; dx++) mark(cx + dx, cy + dy);
    }
  }
  if (version >= 7) {
    for (let i = 0; i < 6; i++)
      for (let j = 0; j < 3; j++) {
        mark(i, size - 11 + j);
        mark(size - 11 + j, i);
      }
  }
  return r;
}

function maskFn(id, row, col) {
  switch (id) {
    case 0: return (row + col) % 2 === 0;
    case 1: return row % 2 === 0;
    case 2: return col % 3 === 0;
    case 3: return (row + col) % 3 === 0;
    case 4: return (Math.floor(row / 2) + Math.floor(col / 3)) % 2 === 0;
    case 5: return ((row * col) % 2) + ((row * col) % 3) === 0;
    case 6: return (((row * col) % 2) + ((row * col) % 3)) % 2 === 0;
    case 7: return (((row + col) % 2) + ((row * col) % 3)) % 2 === 0;
  }
}

function formatBits(mask) {
  let data = (0b00 << 3) | mask; // ECC M
  let d = data << 10;
  for (let i = 14; i >= 10; i--) {
    if ((d >> i) & 1) d ^= 0x537 << (i - 10);
  }
  return ((data << 10) | d) ^ 0x5412;
}

function versionBits(version) {
  let d = version << 12;
  for (let i = 17; i >= 12; i--) {
    if ((d >> i) & 1) d ^= 0x1f25 << (i - 12);
  }
  return (version << 12) | d;
}

function placeFormat(mod, mask) {
  const bits = formatBits(mask);
  const size = mod.length;
  const tl = [
    [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8], [7, 8], [8, 8],
    [8, 7], [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
  ];
  for (let i = 0; i < 15; i++) mod[tl[i][1]][tl[i][0]] = (bits >> (14 - i)) & 1;
  for (let i = 0; i < 8; i++) mod[8][size - 1 - i] = (bits >> (14 - i)) & 1;
  for (let i = 0; i < 7; i++) mod[size - 7 + i][8] = (bits >> (6 - i)) & 1;
  mod[size - 8][8] = 1;
}

function placeVersion(mod, version) {
  if (version < 7) return;
  const bits = versionBits(version);
  const size = mod.length;
  for (let i = 0; i < 18; i++) {
    const bit = (bits >> i) & 1;
    const a = Math.floor(i / 3);
    const b = i % 3;
    mod[a][size - 11 + b] = bit;
    mod[size - 11 + b][a] = bit;
  }
}

function scoreMask(mod) {
  const size = mod.length;
  let score = 0;
  for (let y = 0; y < size; y++) {
    let run = 1;
    for (let x = 1; x < size; x++) {
      if (mod[y][x] === mod[y][x - 1]) run++;
      else {
        if (run >= 5) score += 3 + (run - 5);
        run = 1;
      }
    }
    if (run >= 5) score += 3 + (run - 5);
  }
  for (let x = 0; x < size; x++) {
    let run = 1;
    for (let y = 1; y < size; y++) {
      if (mod[y][x] === mod[y - 1][x]) run++;
      else {
        if (run >= 5) score += 3 + (run - 5);
        run = 1;
      }
    }
    if (run >= 5) score += 3 + (run - 5);
  }
  for (let y = 0; y < size - 1; y++)
    for (let x = 0; x < size - 1; x++) {
      const v = mod[y][x];
      if (v === mod[y][x + 1] && v === mod[y + 1][x] && v === mod[y + 1][x + 1])
        score += 3;
    }
  let dark = 0;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) if (mod[y][x]) dark++;
  score += Math.floor(Math.abs((dark * 100) / (size * size) - 50) / 5) * 10;
  return score;
}

function buildMatrix(data, version, mask) {
  const size = moduleSize(version);
  const mod = Array.from({ length: size }, () => Array(size).fill(null));
  placeFinder(mod, 0, 0);
  placeFinder(mod, size - 7, 0);
  placeFinder(mod, 0, size - 7);
  for (let i = 8; i < size - 8; i++) {
    mod[6][i] = i % 2 === 0 ? 1 : 0;
    mod[i][6] = i % 2 === 0 ? 1 : 0;
  }
  placeAlignments(mod, version);
  const reserved = buildReserved(size, version);

  let bitIdx = 0;
  const totalBits = data.length * 8;
  let upward = true;
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col = 5;
    for (let i = 0; i < size; i++) {
      const row = upward ? size - 1 - i : i;
      for (let c = 0; c < 2; c++) {
        const x = col - c;
        if (reserved[row][x]) continue;
        let bit = 0;
        if (bitIdx < totalBits) {
          bit = (data[bitIdx >> 3] >> (7 - (bitIdx & 7))) & 1;
          bitIdx++;
        }
        if (maskFn(mask, row, x)) bit ^= 1;
        mod[row][x] = bit;
      }
    }
    upward = !upward;
  }
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) if (mod[y][x] === null) mod[y][x] = 0;

  placeFormat(mod, mask);
  placeVersion(mod, version);
  return mod;
}

export function encodeQR(text) {
  const bytes = Array.from(new TextEncoder().encode(text));
  const version = chooseVersion(bytes.length);
  if (!version) return null;
  const data = encodeData(bytes, version);
  let best = null;
  let bestScore = Infinity;
  for (let mask = 0; mask < 8; mask++) {
    const mod = buildMatrix(data, version, mask);
    const s = scoreMask(mod);
    if (s < bestScore) {
      bestScore = s;
      best = mod;
    }
  }
  return best;
}

export function qrToSvg(matrix, { cell = 4, dark = "#1C1917", light = "#FFFFFF" } = {}) {
  if (!matrix) return "";
  const n = matrix.length;
  const q = 2;
  const size = (n + q * 2) * cell;
  let rects = `<rect width="${size}" height="${size}" fill="${light}"/>`;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (matrix[y][x]) {
        rects += `<rect x="${(x + q) * cell}" y="${(y + q) * cell}" width="${cell}" height="${cell}" fill="${dark}"/>`;
      }
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="100%" height="100%" shape-rendering="crispEdges">${rects}</svg>`;
}

export function renderQR(container, text) {
  const matrix = encodeQR(text);
  if (!matrix) {
    container.innerHTML =
      '<p class="qr-fallback">Link too long for QR — use Copy link or download the turn file.</p>';
    return false;
  }
  container.innerHTML = qrToSvg(matrix);
  return true;
}
