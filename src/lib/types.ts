/** All the user-controlled data that drives the labels. */
export interface LabelData {
  coverDataUrl: string | null;
  album: string;
  artist: string;
  /** Grayscale text colour (hex), auto-optimised for contrast. */
  textColor: string;
  /** Background / accent colour (hex), sampled from the cover or chosen. */
  bgColor: string;
  fontFamily: string;
  /** Title font size in mm (front label). */
  titleSize: number;
  /** Artist font size in mm (front label). */
  artistSize: number;
  /** Whether to show the artist line (off for mixtapes). */
  showArtist: boolean;
  /** Track font size in mm (tracklist sheet). */
  trackSize: number;
  /** Label text tracking (letter-spacing) in em. */
  letterSpacing: number;
  /** Label text line-height multiplier. */
  lineHeight: number;
  /** Tracklist text, one track per line (for the optional jewel-case sheet). */
  tracklist: string;
}
