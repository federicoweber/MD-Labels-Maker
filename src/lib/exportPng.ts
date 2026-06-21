import JSZip from 'jszip';
import { mmToPx } from './dimensions';
import { buildEmbeddedFontCss } from './fonts';

const SVGNS = 'http://www.w3.org/2000/svg';

interface RenderOptions {
  fonts: string[];
  widthMm: number;
  heightMm: number;
}

/**
 * Rasterise an SVG label element to a print-resolution PNG blob.
 *
 * The cover image is already a data URI, and the chosen web font is embedded as
 * base64 @font-face CSS — both are required because a browser will not load any
 * external resource referenced by an SVG that is drawn onto a canvas.
 */
export async function renderSvgToPngBlob(
  svg: SVGSVGElement,
  { fonts, widthMm, heightMm }: RenderOptions,
): Promise<Blob> {
  const widthPx = Math.round(mmToPx(widthMm));
  const heightPx = Math.round(mmToPx(heightMm));

  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', SVGNS);
  clone.setAttribute('width', String(widthPx));
  clone.setAttribute('height', String(heightPx));

  // Inline every font used so they render inside the detached SVG.
  const uniqueFonts = [...new Set(fonts)];
  const fontCss = (await Promise.all(uniqueFonts.map(buildEmbeddedFontCss))).join('\n');
  const styleEl = document.createElementNS(SVGNS, 'style');
  styleEl.textContent = fontCss;
  clone.insertBefore(styleEl, clone.firstChild);

  const svgString = new XMLSerializer().serializeToString(clone);
  const svgUrl = URL.createObjectURL(
    new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' }),
  );

  try {
    const img = await loadImage(svgUrl);
    const canvas = document.createElement('canvas');
    canvas.width = widthPx;
    canvas.height = heightPx;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas 2D context');
    ctx.drawImage(img, 0, 0, widthPx, heightPx);
    return await canvasToBlob(canvas);
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

export interface ZipLabel {
  svg: SVGSVGElement;
  widthMm: number;
  heightMm: number;
  /** File name inside the zip, e.g. "front.png". */
  name: string;
}

/** Render every label to a PNG and download them together as a single zip. */
export async function downloadLabelsZip(
  labels: ZipLabel[],
  fonts: string[],
  zipName: string,
): Promise<void> {
  const zip = new JSZip();
  for (const label of labels) {
    const blob = await renderSvgToPngBlob(label.svg, {
      fonts,
      widthMm: label.widthMm,
      heightMm: label.heightMm,
    });
    zip.file(label.name, blob);
  }
  const out = await zip.generateAsync({ type: 'blob' });
  downloadBlob(out, zipName);
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to rasterise SVG'));
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas export failed'));
    }, 'image/png');
  });
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
