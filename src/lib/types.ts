/** All the user-controlled data that drives the labels. */
export interface LabelData {
  coverDataUrl: string | null;
  album: string;
  artist: string;
  /** Double-album mode: a second album shares the front, spine and tracklist. */
  doubleAlbum: boolean;
  coverDataUrl2: string | null;
  album2: string;
  artist2: string;
  tracklist2: string;
  /** Hide the album/artist overlaid on the front covers (identify via the spine). */
  doubleHideText: boolean;
  /** Opacity (0–1) of the background behind overlaid front text. */
  textBgOpacity: number;
  /** Front/spine text colour (hex), auto-optimised for contrast. */
  textColor: string;
  /** Front/spine background colour (hex), sampled from the cover or chosen. */
  bgColor: string;
  /** Tracklist sheet colours + spacing (independent from the front/spine). */
  tlTextColor: string;
  tlBgColor: string;
  tlLetterSpacing: number;
  tlLineHeight: number;
  /** Keep the tracklist's colours + typography in sync with the front. */
  tlSync: boolean;
  /** Fonts per text role. */
  titleFont: string;
  artistFont: string;
  trackFont: string;
  yearFont: string;
  /** Automatic = derive font + size from the album (title) via a type scale. */
  artistAuto: boolean;
  yearAuto: boolean;
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
  /** Whether the optional jewel-case tracklist sheet is shown. */
  showTracklist: boolean;
  /** Tracklist text, one track per line (for the optional jewel-case sheet). */
  tracklist: string;
  /** Show a miniature cover next to the tracklist header. */
  showTracklistCover: boolean;
  /** Show album / artist in the tracklist header. */
  tlShowAlbum: boolean;
  tlShowArtist: boolean;
  /** Album year, shown bottom-left of the front label when enabled. */
  year: string;
  showYear: boolean;
  yearSize: number;
}
