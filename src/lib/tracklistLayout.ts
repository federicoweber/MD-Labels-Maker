import { wrapText } from './text';
import { splitBoldArtist, splitTrack } from './tracklist';

interface ColumnCountOptions {
  tracklist: string;
  trackFont: string;
  trackSize: number;
  contentWidth: number;
  showDuration: boolean;
  maxOneColumnLines: number;
  forceTwoColumns: boolean;
}

/** Choose two columns when the rendered track lines cannot fit in one. */
export function tracklistColumnCount({
  tracklist,
  trackFont,
  trackSize,
  contentWidth,
  showDuration,
  maxOneColumnLines,
  forceTwoColumns,
}: ColumnCountOptions): 1 | 2 {
  if (forceTwoColumns) return 2;
  const tracks = tracklist.split('\n').map((track) => track.trim()).filter(Boolean);
  const numberWidth = `${tracks.length}.`.length * trackSize * 0.62;
  const durationChars = showDuration
    ? Math.max(0, ...tracks.map((track) => splitTrack(track).dur.length))
    : 0;
  const durationWidth = durationChars * trackSize * 0.62;
  const cellGap = trackSize * 0.6;
  const titleWidth = Math.max(
    trackSize * 2,
    contentWidth - numberWidth - cellGap - (durationWidth ? durationWidth + cellGap : 0),
  );
  const lineCount = tracks.reduce((total, track) => {
    const { title } = splitTrack(track);
    const { artist, title: plainTitle } = splitBoldArtist(title);
    const display = artist ? `${artist} ${plainTitle}` : title;
    return total + wrapText(display, trackFont, trackSize, titleWidth).length;
  }, 0);
  return lineCount > maxOneColumnLines ? 2 : 1;
}
