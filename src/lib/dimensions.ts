// All physical dimensions are in millimetres. SVGs use a `viewBox` in mm so
// previews and exports stay at true physical size.

/**
 * Front / top label — 34×52mm portrait (matches Sony MiniDisc labels).
 * The square album cover (34×34) sits at the top; an 18mm text band below
 * holds the title + artist. The top-left corner is chamfered like a real MD.
 */
export const FRONT = {
  width: 34,
  height: 52,
  coverSize: 34, // full-width square cover
  bandHeight: 18, // 52 - 34
  chamfer: 3.5, // diagonal cut at the top-left corner (leg length)
  padding: 2.5,
  titleSize: 4,
  artistSize: 2.8,
} as const;

/** Spine label — 60×3mm strip with "Artist - Title". */
export const SPINE = {
  width: 60,
  height: 3,
  padding: 1.5,
  textSize: 2,
} as const;

/** Optional tracklist sheet for the MD jewel case — 70×50mm landscape. */
export const TRACKLIST = {
  width: 70,
  height: 50,
  padding: 4,
  titleSize: 4,
  artistSize: 2.8,
  trackSize: 2.4,
  trackGap: 3.4,
} as const;

/** Target resolution for PNG export. 300 DPI is print quality. */
export const EXPORT_DPI = 300;

/** On-screen preview scale (px per mm) — labels are tiny, so zoom them up. */
export const PREVIEW_PX_PER_MM = 6;

const MM_PER_INCH = 25.4;

/** Convert millimetres to pixels at a given DPI. */
export function mmToPx(mm: number, dpi: number = EXPORT_DPI): number {
  return (mm / MM_PER_INCH) * dpi;
}
