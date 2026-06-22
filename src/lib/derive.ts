import type { LabelData } from './types';

// "Automatic" artist/year derive their font + size from the album via a type scale.
export const TYPE_SCALE = 1.25;

export function effFor(d: LabelData): LabelData {
  return {
    ...d,
    artistFont: d.artistAuto ? d.titleFont : d.artistFont,
    artistSize: d.artistAuto ? d.titleSize / TYPE_SCALE : d.artistSize,
    yearFont: d.yearAuto ? d.titleFont : d.yearFont,
    yearSize: d.yearAuto ? d.titleSize / (TYPE_SCALE * TYPE_SCALE) : d.yearSize,
  };
}

/**
 * Expand multi-disc entries into one LabelData per physical disc (with the
 * disc's own tracklist + n/n stamp). Single-disc entries pass through unchanged.
 * Used to materialise the labels for export + print.
 */
export function expandDiscs(discs: LabelData[]): LabelData[] {
  const out: LabelData[] = [];
  for (const d of discs) {
    if (d.multiDisc && d.discTotal > 1) {
      for (let i = 0; i < d.discTotal; i++) {
        out.push({ ...d, discNumber: i + 1, tracklist: d.discTracklists[i] ?? '' });
      }
    } else {
      out.push({ ...d, discNumber: 1, discTotal: 1 });
    }
  }
  return out;
}

/**
 * Tracklist + jewel-case spine data: mirror the front when synced (tracks use
 * the artist font), otherwise the tracklist's own colours/spacing.
 */
export function tlEffFor(d: LabelData): LabelData {
  const e = effFor(d);
  return d.tlSync
    ? { ...e, trackFont: e.artistFont }
    : {
        ...e,
        bgColor: d.tlBgColor,
        textColor: d.tlTextColor,
        letterSpacing: d.tlLetterSpacing,
        lineHeight: d.tlLineHeight,
      };
}
