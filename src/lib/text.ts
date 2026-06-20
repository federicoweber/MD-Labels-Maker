// Word-wrapping for SVG <text>, which has no automatic wrapping. Measures with
// a canvas using the same font so the export matches the on-screen preview.

let canvas: HTMLCanvasElement | null = null;
const MEASURE_SCALE = 10; // measure in px; ratios are scale-invariant

/**
 * Wrap `text` to `maxWidthMm` at the given font, honouring explicit newlines.
 * Returns at least one line.
 */
export function wrapText(
  text: string,
  fontFamily: string,
  fontSizeMm: number,
  maxWidthMm: number,
  weight = 400,
): string[] {
  if (!text) return [''];
  canvas ??= document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return text.split('\n');
  ctx.font = `${weight} ${fontSizeMm * MEASURE_SCALE}px '${fontFamily}', sans-serif`;
  const maxW = maxWidthMm * MEASURE_SCALE;

  const lines: string[] = [];
  for (const para of text.split('\n')) {
    if (para === '') {
      lines.push('');
      continue;
    }
    let line = '';
    for (const word of para.split(' ')) {
      const test = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(test).width > maxW) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    lines.push(line);
  }
  return lines;
}
