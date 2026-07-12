import type { QrModules } from '@/lib/share';

// The federicoweber.com favicon — a fast-forward ▶▶ mark — as clean vector
// triangles (the 16×16 icon is a pixelated rendering of exactly these), so it
// tints with the label colours and survives PNG export (external images don't
// rasterise in SVGs).
const LOGO_W = 15;
const LOGO_H = 14;
const LOGO_PATH = 'M0 0 L7 7 L0 14 Z M8 0 L15 7 L8 14 Z';

/** The ▶▶ mark as a standalone inline SVG (fills with currentColor). */
export function FwdMark({ className }: { className?: string }) {
  return (
    <svg viewBox={`0 0 ${LOGO_W} ${LOGO_H}`} className={className} aria-hidden>
      <path d={LOGO_PATH} fill="currentColor" />
    </svg>
  );
}

/**
 * A rendered QR: bgColor backing (at the given opacity), textColor modules,
 * and the ▶▶ logo centred on a solid patch. The logo patch covers ~9% of the
 * code, within error-correction level M's 15% recovery budget. Draws into the
 * surrounding SVG coordinate space (mm).
 */
export function QrGraphic({
  qr,
  x,
  y,
  size,
  pad,
  bgColor,
  textColor,
  bgOpacity,
}: {
  qr: QrModules;
  x: number;
  y: number;
  /** Side of the box, in mm. */
  size: number;
  /** Quiet zone inside the box, in mm. */
  pad: number;
  bgColor: string;
  textColor: string;
  bgOpacity: number;
}) {
  const logoW = size * 0.21;
  const logoH = logoW * (LOGO_H / LOGO_W);
  const scale = logoW / LOGO_W;
  // The knockout behind the logo traces its own silhouette: the same path
  // drawn with a thick round-joined stroke dilates it outward by half the
  // stroke width (~17% of the logo width) instead of clearing a square patch.
  const knockout = 5; // path units
  return (
    <g>
      <rect x={x} y={y} width={size} height={size} fill={bgColor} fillOpacity={bgOpacity} />
      <path
        d={qr.path}
        fill={textColor}
        transform={`translate(${x + pad} ${y + pad}) scale(${(size - 2 * pad) / qr.count})`}
      />
      <g transform={`translate(${x + (size - logoW) / 2} ${y + (size - logoH) / 2}) scale(${scale})`}>
        <path
          d={LOGO_PATH}
          fill={bgColor}
          stroke={bgColor}
          strokeWidth={knockout}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path d={LOGO_PATH} fill={textColor} />
      </g>
    </g>
  );
}
