/** All the user-controlled data that drives the labels. */
export interface LabelData {
  coverDataUrl: string | null;
  album: string;
  artist: string;
  /** Grayscale text colour (hex), auto-optimised for contrast. */
  textColor: string;
  /** Background / accent colour (hex), sampled from the cover or chosen. */
  bgColor: string;
  /** Fonts per text role. */
  titleFont: string;
  artistFont: string;
  trackFont: string;
  /** When true, the artist uses the same font as the title. */
  linkFonts: boolean;
  /** Title font size in mm (front label). */
  titleSize: number;
  /** Artist font size in mm (front label). */
  artistSize: number;
  /** Whether to show the artist line (off for mixtapes). */
  showArtist: boolean;
  /** Track font size in mm (tracklist sheet). */
  trackSize: number;
  /** Per-role text opacity (0–1). */
  titleOpacity: number;
  artistOpacity: number;
  trackOpacity: number;
  /** Label text tracking (letter-spacing) in em. */
  letterSpacing: number;
  /** Label text line-height multiplier. */
  lineHeight: number;
  /** Tracklist text, one track per line (for the optional jewel-case sheet). */
  tracklist: string;
}
