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
