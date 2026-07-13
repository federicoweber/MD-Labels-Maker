// Generative cover: Swiss-poster style geometric patterns — halftone grids,
// concentric rings, nested polygons, stripes, waves, and recursive
// subdivisions. Strictly two-tone (the label's text colour on its background);
// "gradients" come from element size and spacing, never opacity. Seeded by the
// artist + album + tracklist combo, so the same disc always gets the same art.

/** xmur3 string hash — seeds the PRNG. */
function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

/** mulberry32 PRNG — small, fast, deterministic. */
function mulberry32(a: number): () => number {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Rand = () => number;
const pick = <T,>(rand: Rand, arr: T[]): T => arr[Math.floor(rand() * arr.length)];

type Ctx = CanvasRenderingContext2D;

/** Halftone grid: dots/squares/diamonds sized by a smooth field. */
function halftone(cx: Ctx, size: number, rand: Rand): void {
  const n = 12 + Math.floor(rand() * 14);
  const cell = size / n;
  const shape = pick(rand, ['circle', 'square', 'diamond'] as const);
  const gamma = pick(rand, [0.7, 1.2, 2, 3]);
  const invert = rand() < 0.5;
  const kind = pick(rand, ['radial', 'diagonal', 'wave'] as const);
  const fx = rand();
  const fy = rand();
  const freq = 1 + rand() * 3;
  const phase = rand() * Math.PI * 2;
  const field = (x: number, y: number): number => {
    const u = x / (n - 1);
    const v = y / (n - 1);
    let t: number;
    if (kind === 'radial') t = Math.hypot(u - fx, v - fy) / Math.SQRT2;
    else if (kind === 'diagonal') t = (u + v) / 2;
    else t = 0.5 + 0.5 * Math.sin(u * freq * Math.PI * 2 + v * freq * 2 + phase);
    t = Math.min(1, Math.max(0, t));
    return invert ? 1 - t : t;
  };
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const s = cell * (0.08 + 0.84 * Math.pow(field(x, y), gamma));
      const px = (x + 0.5) * cell;
      const py = (y + 0.5) * cell;
      if (shape === 'circle') {
        cx.beginPath();
        cx.arc(px, py, s / 2, 0, Math.PI * 2);
        cx.fill();
      } else if (shape === 'square') {
        cx.fillRect(px - s / 2, py - s / 2, s, s);
      } else {
        cx.save();
        cx.translate(px, py);
        cx.rotate(Math.PI / 4);
        cx.fillRect(-s / 2, -s / 2, s, s);
        cx.restore();
      }
    }
  }
}

/** Concentric rings with thickness swelling in or out. */
function rings(cx: Ctx, size: number, rand: Rand): void {
  const count = 12 + Math.floor(rand() * 12);
  const cxr = size * (0.35 + rand() * 0.3);
  const cyr = size * (0.35 + rand() * 0.3);
  // Bleeds past the canvas so the pattern reaches every edge (full-bleed).
  const maxR = size * (0.8 + rand() * 0.35);
  const swellOut = rand() < 0.5;
  for (let i = 1; i <= count; i++) {
    const t = i / count;
    const r = maxR * t;
    const w = ((size / count) * 0.55 * (swellOut ? t : 1 - t)) + size * 0.002;
    cx.lineWidth = w;
    cx.beginPath();
    cx.arc(cxr, cyr, r, 0, Math.PI * 2);
    cx.stroke();
  }
}

/** Nested polygons (triangle/square/hexagon), optionally twisting. */
function polygons(cx: Ctx, size: number, rand: Rand): void {
  const sides = pick(rand, [3, 4, 6]);
  const count = 10 + Math.floor(rand() * 10);
  const twist = pick(rand, [0, 0, Math.PI / (sides * count)]) * (rand() < 0.5 ? 1 : -1) * 4;
  const base = rand() * Math.PI;
  // Bleeds past the canvas so the pattern reaches every edge (full-bleed).
  const maxR = size * (0.75 + rand() * 0.25);
  cx.lineWidth = Math.max(1.5, (size / count) * 0.16);
  for (let i = count; i >= 1; i--) {
    const r = (maxR * i) / count;
    const rot = base + twist * i;
    cx.beginPath();
    for (let k = 0; k <= sides; k++) {
      const a = rot + (k / sides) * Math.PI * 2;
      const x = size / 2 + r * Math.cos(a);
      const y = size / 2 + r * Math.sin(a);
      if (k === 0) cx.moveTo(x, y);
      else cx.lineTo(x, y);
    }
    cx.stroke();
  }
}

/** Parallel bars with a thickness gradient, at a seeded angle. */
function stripes(cx: Ctx, size: number, rand: Rand): void {
  const count = 12 + Math.floor(rand() * 16);
  const angle = pick(rand, [0, Math.PI / 2, Math.PI / 4, -Math.PI / 4]);
  const wave = rand() < 0.35;
  cx.save();
  cx.translate(size / 2, size / 2);
  cx.rotate(angle);
  const span = size * 1.6;
  const pitch = span / count;
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    const g = wave ? 0.5 + 0.5 * Math.sin(t * Math.PI * 2 + 1) : t;
    const w = pitch * (0.12 + 0.75 * g);
    cx.fillRect(-span / 2, -span / 2 + i * pitch + (pitch - w) / 2, span, w);
  }
  cx.restore();
}

/** Spirograph rosette: a hypotrochoid traced until it closes. */
function spirograph(cx: Ctx, size: number, rand: Rand): void {
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
  const R = 40 + Math.floor(rand() * 60);
  // Pick a rolling-circle radius that yields a dense rosette (many turns).
  let r = 10 + Math.floor(rand() * (R - 15));
  for (let tries = 0; tries < 20 && r / gcd(R, r) < 6; tries++) {
    r = 10 + Math.floor(rand() * (R - 15));
  }
  const d = r * (0.4 + rand() * 1.1);
  const turns = r / gcd(R, r);
  const steps = Math.min(20000, turns * 240);
  const k = (R - r) / r;
  const scale = (size * (0.5 + rand() * 0.22)) / (R - r + d);
  cx.lineWidth = Math.max(1.2, size * 0.0035);
  cx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * turns * Math.PI * 2;
    const x = size / 2 + scale * ((R - r) * Math.cos(t) + d * Math.cos(k * t));
    const y = size / 2 + scale * ((R - r) * Math.sin(t) - d * Math.sin(k * t));
    if (i === 0) cx.moveTo(x, y);
    else cx.lineTo(x, y);
  }
  cx.stroke();
}

/** Conway's Game of Life: a seeded soup run for a few dozen generations. */
function gameOfLife(cx: Ctx, size: number, rand: Rand): void {
  const n = 48;
  const generations = 30 + Math.floor(rand() * 20);
  let grid = new Uint8Array(n * n);
  for (let i = 0; i < grid.length; i++) grid[i] = rand() < 0.32 ? 1 : 0;
  const stepGol = (g: Uint8Array): Uint8Array<ArrayBuffer> => {
    const next = new Uint8Array(n * n);
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        let alive = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            alive += g[((y + dy + n) % n) * n + ((x + dx + n) % n)];
          }
        }
        const i = y * n + x;
        next[i] = alive === 3 || (alive === 2 && g[i]) ? 1 : 0;
      }
    }
    return next;
  };
  for (let g = 0; g < generations; g++) grid = stepGol(grid);
  const cell = size / n;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (!grid[y * n + x]) continue;
      cx.fillRect(Math.round(x * cell), Math.round(y * cell), Math.ceil(cell), Math.ceil(cell));
    }
  }
}

/** The selectable generator models. 'auto' picks one from the seed. */
export const GEN_MODELS = [
  { id: 'auto', name: 'Auto' },
  { id: 'halftone', name: 'Halftone' },
  { id: 'rings', name: 'Rings' },
  { id: 'polygons', name: 'Polygons' },
  { id: 'stripes', name: 'Stripes' },
  { id: 'spirograph', name: 'Spirograph' },
  { id: 'gol', name: 'Game of Life' },
] as const;

export type GenModel = (typeof GEN_MODELS)[number]['id'];

const FAMILY_BY_ID: Record<Exclude<GenModel, 'auto'>, (cx: Ctx, size: number, rand: Rand) => void> = {
  halftone,
  rings,
  polygons,
  stripes,
  spirograph,
  gol: gameOfLife,
};

// 'auto' draws from the seeded families (Game of Life only comes up when
// picked explicitly, to keep the auto pool cohesive).
const AUTO_POOL: Exclude<GenModel, 'auto'>[] = [
  'halftone',
  'rings',
  'polygons',
  'stripes',
  'spirograph',
];

/** Render the generative cover as a PNG data URL (square, `size` px).
 * `salt` varies per Generate press (and travels in the QR link) so the same
 * disc can roll new variations while staying reproducible. */
export function generateArtCover(
  album: string,
  artist: string,
  tracklist: string,
  salt: string,
  bgColor: string,
  textColor: string,
  size = 600,
  model: GenModel = 'auto',
): string {
  const rand = mulberry32(xmur3(`${artist}|${album}|${tracklist}`.toLowerCase() + `|${salt}`)());
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const cx = canvas.getContext('2d')!;
  cx.fillStyle = bgColor;
  cx.fillRect(0, 0, size, size);
  cx.fillStyle = textColor;
  cx.strokeStyle = textColor;
  // Unknown ids (e.g. links to a since-removed model) fall back to the pool.
  const id =
    model !== 'auto' && model in FAMILY_BY_ID
      ? model
      : AUTO_POOL[Math.floor(rand() * AUTO_POOL.length)];
  FAMILY_BY_ID[id](cx, size, rand);
  return canvas.toDataURL('image/png');
}
