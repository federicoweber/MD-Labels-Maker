// Colour helpers: palette extraction from the album cover and contrast-based
// text colour selection.

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export function hexToRgb(hex: string): RGB {
  const m = hex.replace('#', '');
  const v =
    m.length === 3
      ? m
          .split('')
          .map((c) => c + c)
          .join('')
      : m;
  const n = parseInt(v, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgbToHex({ r, g, b }: RGB): string {
  const h = (x: number) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

/** WCAG relative luminance (0–1). */
export function relativeLuminance({ r, g, b }: RGB): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** Pick black or white — whichever has better contrast against the background. */
export function bestTextColor(bgHex: string): string {
  const lum = relativeLuminance(hexToRgb(bgHex));
  // Contrast vs white vs black; choose the higher.
  const contrastWhite = 1.05 / (lum + 0.05);
  const contrastBlack = (lum + 0.05) / 0.05;
  return contrastWhite >= contrastBlack ? '#ffffff' : '#000000';
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}

/** Draw an image into a small canvas and return its pixel data. */
async function getPixels(
  dataUrl: string,
  size = 64,
): Promise<{ data: Uint8ClampedArray; width: number; height: number }> {
  const img = await loadImage(dataUrl);
  const scale = Math.min(size / img.width, size / img.height, 1);
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('No 2D context');
  ctx.drawImage(img, 0, 0, w, h);
  return { data: ctx.getImageData(0, 0, w, h).data, width: w, height: h };
}

function dist(a: RGB, b: RGB): number {
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
}

/**
 * Extract a small palette of prominent, visually distinct colours from a cover.
 * Buckets pixels into a coarse colour cube, ranks by frequency, then keeps
 * colours that are far enough apart to feel distinct.
 */
export async function extractPalette(dataUrl: string, count = 5): Promise<string[]> {
  const { data } = await getPixels(dataUrl);
  const buckets = new Map<number, { sum: RGB; n: number }>();
  const step = 32; // 8 levels per channel

  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha < 125) continue; // skip transparent
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const key =
      (Math.floor(r / step) << 10) | (Math.floor(g / step) << 5) | Math.floor(b / step);
    const entry = buckets.get(key);
    if (entry) {
      entry.sum.r += r;
      entry.sum.g += g;
      entry.sum.b += b;
      entry.n++;
    } else {
      buckets.set(key, { sum: { r, g, b }, n: 1 });
    }
  }

  const ranked = [...buckets.values()]
    .map(({ sum, n }) => ({ rgb: { r: sum.r / n, g: sum.g / n, b: sum.b / n }, n }))
    .sort((a, b) => b.n - a.n);

  const chosen: RGB[] = [];
  for (const { rgb } of ranked) {
    if (chosen.every((c) => dist(c, rgb) > 48)) {
      chosen.push(rgb);
      if (chosen.length >= count) break;
    }
  }
  // Fall back to top buckets if not enough distinct colours were found.
  if (chosen.length < count) {
    for (const { rgb } of ranked) {
      if (chosen.length >= count) break;
      if (!chosen.includes(rgb)) chosen.push(rgb);
    }
  }
  return chosen.map(rgbToHex);
}
