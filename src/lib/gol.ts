// Generative cover: Conway's Game of Life run from a random soup seeded by the
// artist + album combo — the same title always produces the same cover.
// Strictly two-tone: live cells in the label's text colour on its background.

/** xmur3 string hash — seeds the PRNG from the artist|album combo. */
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

/** One Game of Life generation on a toroidal (wrap-around) grid. */
function step(grid: Uint8Array, n: number): Uint8Array<ArrayBuffer> {
  const next = new Uint8Array(n * n);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      let alive = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          alive += grid[((y + dy + n) % n) * n + ((x + dx + n) % n)];
        }
      }
      const i = y * n + x;
      next[i] = alive === 3 || (alive === 2 && grid[i]) ? 1 : 0;
    }
  }
  return next;
}

const GRID = 48;
const GENERATIONS = 40;
const SOUP_DENSITY = 0.32;

/** Render the Game of Life cover as a PNG data URL (square, `size` px). */
export function generateGolCover(
  album: string,
  artist: string,
  bgColor: string,
  textColor: string,
  size = 600,
): string {
  const rand = mulberry32(xmur3(`${artist}|${album}`.toLowerCase())());
  let grid = new Uint8Array(GRID * GRID);
  for (let i = 0; i < grid.length; i++) grid[i] = rand() < SOUP_DENSITY ? 1 : 0;
  for (let g = 0; g < GENERATIONS; g++) grid = step(grid, GRID);

  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const cx = canvas.getContext('2d')!;
  cx.fillStyle = bgColor;
  cx.fillRect(0, 0, size, size);
  const cell = size / GRID;
  cx.fillStyle = textColor;
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      if (!grid[y * GRID + x]) continue;
      cx.fillRect(Math.round(x * cell), Math.round(y * cell), Math.ceil(cell), Math.ceil(cell));
    }
  }
  return canvas.toDataURL('image/png');
}
