// All physical dimensions are in millimetres, matching the MiniDisc label
// template (https://github.com/atriptych/Minidisc-Label-Template). SVGs use a
// `viewBox` in mm so previews and exports stay at true physical size.

/** Front / top label (the J-card front panel): album cover + text band. */
export const FRONT = {
  width: 68,
  height: 79,
  /** Height of the coloured text band at the bottom (cover fills the rest). */
  textBandHeight: 17,
  /** Inner padding for text within the band. */
  padding: 3,
  /** Thin frame stroke around the whole label, for the MD look. */
  frameStroke: 0.6,
  titleSize: 6,
  artistSize: 4,
} as const;

/** Spine label: a thin strip with "Artist - Title". */
export const SPINE = {
  width: 58.59,
  height: 3.79,
  padding: 1.5,
  textSize: 2.5,
} as const;

/** Target resolution for PNG export. 300 DPI is print quality. */
export const EXPORT_DPI = 300;

/** On-screen preview scale (px per mm) — labels are tiny, so zoom them up. */
export const PREVIEW_PX_PER_MM = 4;

const MM_PER_INCH = 25.4;

/** Convert millimetres to pixels at a given DPI. */
export function mmToPx(mm: number, dpi: number = EXPORT_DPI): number {
  return (mm / MM_PER_INCH) * dpi;
}
