/** All the user-controlled data that drives the labels. */
export interface LabelData {
  coverDataUrl: string | null;
  /** Public source URL of the cover when it came from a fetch/import (encoded
   * into the QR share link so the scanned page shows the same artwork).
   * Sentinels: '-' = "no cover on the share page, don't search either"
   * (playlist imports); 'gen' = deterministic geometric cover, which the
   * share page regenerates from the artist + album + tracklist. */
  coverSourceUrl: string | null;
  album: string;
  artist: string;
  /** Multi-disc album: prints one label set per disc with an "n/n" stamp. */
  multiDisc: boolean;
  /** Which disc this is (render-time; 1 on the stored entry). */
  discNumber: number;
  discTotal: number;
  /** One tracklist per disc (multi-disc albums). */
  discTracklists: string[];
  /** Double-album mode: a second album shares the front, spine and tracklist. */
  doubleAlbum: boolean;
  coverDataUrl2: string | null;
  album2: string;
  artist2: string;
  tracklist2: string;
  /** Hide the album/artist overlaid on the front covers (identify via the spine). */
  doubleHideText: boolean;
  /** Cut (chamfer) the front label's top-left corner. */
  showChamfer: boolean;
  /** Rotate the front-label layout by 90 degrees. */
  verticalMode: boolean;
  /** Single-album mode: scale the cover to the label's full height (cropped horizontally). */
  fullHeight: boolean;
  /** Cover zoom in free-layout mode (1 = fill, values above 1 zoom in). */
  fullHeightScale: number;
  /** Uniform padding around the square cover in standard mode, in mm. */
  coverPadding: number;
  /** Horizontal crop alignment of the full-height cover (0 = left edge, 0.5 = centre, 1 = right edge). */
  fullHeightAlign: number;
  /** Vertical crop alignment of the free-layout cover (0 = top, 0.5 = centre, 1 = bottom). */
  fullHeightVerticalAlign: number;
  /** Vertical position of the text band on the full-height cover (0 = top, 1 = bottom). */
  fullHeightTextY: number;
  /** Independent vertical fine adjustments for free-layout text blocks, in mm. */
  fullHeightTitleOffset: number;
  fullHeightArtistOffset: number;
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
  /** Gap between the title block and the artist line beneath it, in mm. */
  titleArtistGap: number;
  /** Whether the spine label is included, and how many copies to print. */
  showSpine: boolean;
  spineCount: number;
  /** Show album / artist in the spine caption. */
  spineShowAlbum: boolean;
  spineShowArtist: boolean;
  /** Show the tracklist on the cover (front) label, below the title/artist. */
  frontTracklist: boolean;
  /** Print a QR code on the cover linking to a digital tracklist page. */
  showQr: boolean;
  /** Whether the optional jewel-case tracklist sheet is shown. */
  showTracklist: boolean;
  /** Rotate the tracklist sheet to portrait orientation for longer lists. */
  tlVerticalMode: boolean;
  /** Lay tracks out in two explicit columns rather than one. */
  tlDoubleColumns: boolean;
  /** Tracklist text, one track per line (for the optional jewel-case sheet). */
  tracklist: string;
  /** Show a miniature cover next to the tracklist header. */
  showTracklistCover: boolean;
  /** Show the QR code (digital tracklist link) on the tracklist sheet. */
  tlShowQr: boolean;
  /** Show album / artist in the tracklist header, and their sizes in mm. */
  tlShowAlbum: boolean;
  tlShowArtist: boolean;
  tlTitleSize: number;
  tlArtistSize: number;
  /** Tracklist header opacity, independent from the cover header. */
  tlTitleOpacity: number;
  tlArtistOpacity: number;
  /** Show each track's duration (right-aligned) on the tracklist sheet. */
  showTrackDuration: boolean;
  /** Album year, shown bottom-left of the front label when enabled. */
  year: string;
  showYear: boolean;
  yearSize: number;
}
