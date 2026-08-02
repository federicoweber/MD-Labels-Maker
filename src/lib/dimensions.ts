// All physical dimensions are in millimetres. SVGs use a `viewBox` in mm so
// previews and exports stay at true physical size.

export interface SizePreset {
  width: number;
  height: number;
}

/** Front / top (face) label style constants; size comes from a preset. */
export const FRONT = {
  chamfer: 2, // diagonal cut at the top-left corner (leg length / base)
  padding: 2.5,
  titleSize: 4,
  artistSize: 2.8,
} as const;

/** Common MiniDisc face-label sizes (fits the 37×54mm case window). */
export const FRONT_PRESETS: SizePreset[] = [
  { width: 36.5, height: 53.5 },
  { width: 34, height: 52 },
  { width: 35, height: 50 },
];

export const SPINE = { padding: 1.5 } as const;

export const SPINE_PRESETS: SizePreset[] = [
  { width: 60, height: 3.5 },
  { width: 60, height: 3 },
  { width: 54, height: 3.5 },
];

/** Optional tracklist sheet for the MD jewel case. */
export const TRACKLIST = {
  padding: 2.5,
  titleSize: 4,
  artistSize: 2.8,
  trackSize: 2.4,
  trackGap: 3.4,
} as const;

export const TRACKLIST_PRESETS: SizePreset[] = [
  // 53.5mm tall matches the default front cover, so the print packer lays them
  // out in the same rows.
  { width: 73.5, height: 53.5 },
  { width: 70, height: 50 },
];

/** Target resolution for PNG export. 300 DPI is print quality. */
export const EXPORT_DPI = 300;

/** On-screen preview scale (px per mm) — labels are tiny, so zoom them up. */
export const PREVIEW_PX_PER_MM = 6;

const MM_PER_INCH = 25.4;

/** Convert millimetres to pixels at a given DPI. */
export function mmToPx(mm: number, dpi: number = EXPORT_DPI): number {
  return (mm / MM_PER_INCH) * dpi;
}

/** Front cover is a square sized to the label's shorter side. */
export function frontCoverSize(size: SizePreset): number {
  return Math.min(size.width, size.height);
}

/** Swap the physical front-label axes for the 90-degree layout. */
export function orientedFrontSize(size: SizePreset, verticalMode: boolean): SizePreset {
  return verticalMode ? { width: size.height, height: size.width } : size;
}

/** Swap the physical tracklist axes for its portrait/vertical mode. */
export function orientedTracklistSize(size: SizePreset, verticalMode: boolean): SizePreset {
  return verticalMode ? { width: size.height, height: size.width } : size;
}

/** Square artwork geometry for the standard front-cover layout. */
export function standardCoverGeometry(
  size: SizePreset,
  availableHeight: number,
  padding: number,
): { x: number; y: number; side: number; zoneSide: number } {
  const portrait = size.height >= size.width;
  const zoneSide = portrait
    ? Math.min(size.width, Math.max(1, availableHeight))
    : frontCoverSize(size);
  const inset = Math.min(Math.max(0, padding), Math.max(0, (zoneSide - 1) / 2));
  const side = zoneSide - inset * 2;
  return {
    x: portrait ? (size.width - side) / 2 : inset,
    y: inset,
    side,
    zoneSide,
  };
}

/** Square artwork geometry shared by free-layout preview and print output. */
export function freeLayoutCoverGeometry(
  size: SizePreset,
  scale: number,
  horizontalAlign: number,
  verticalAlign: number,
): { x: number; y: number; side: number } {
  const side = Math.max(size.width, size.height) * Math.min(1, Math.max(0.5, scale));
  return {
    x: (size.width - side) * horizontalAlign,
    y: (size.height - side) * verticalAlign,
    side,
  };
}
