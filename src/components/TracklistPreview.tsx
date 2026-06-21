import type { LabelData } from '@/lib/types';
import { TRACKLIST, PREVIEW_PX_PER_MM as S, type SizePreset } from '@/lib/dimensions';

interface Props {
  data: LabelData;
  size: SizePreset;
  update: (patch: Partial<LabelData>) => void;
  onFocusField: () => void;
}

/**
 * Editable tracklist-sheet preview (landscape). Header is derived from album
 * (+ artist when shown); tracks are typed directly, one per line. The hidden
 * SVG twin renders the final numbered, two-column layout for export.
 */
export default function TracklistPreview({ data, size, update, onFocusField }: Props) {
  const W = size.width * S;
  const H = size.height * S;
  const PAD = TRACKLIST.padding * S;
  return (
    <div
      className="flex flex-col"
      style={{
        width: W,
        height: H,
        background: data.bgColor,
        padding: PAD,
        color: data.textColor,
        boxShadow: 'inset 0 0 0 1px #000',
      }}
    >
      <div
        style={{
          fontFamily: data.titleFont,
          fontSize: TRACKLIST.titleSize * S,
          fontWeight: 700,
          lineHeight: 1.05,
          letterSpacing: `${data.letterSpacing}em`,
        }}
      >
        {data.album || 'Album'}
      </div>
      {data.showArtist && (
        <div
          style={{
            fontFamily: data.artistFont,
            fontSize: TRACKLIST.artistSize * S,
            lineHeight: 1.2,
            letterSpacing: `${data.letterSpacing}em`,
          }}
        >
          {data.artist || 'Artist'}
        </div>
      )}
      <div className="my-1 w-full" style={{ height: 1, background: data.textColor, opacity: 0.6 }} />
      <textarea
        className="label-field w-full flex-1 resize-none bg-transparent p-0 outline-none"
        style={{
          fontFamily: data.trackFont,
          fontSize: data.trackSize * S,
          color: data.textColor,
          lineHeight: data.lineHeight,
          letterSpacing: `${data.letterSpacing}em`,
        }}
        value={data.tracklist}
        placeholder={'One track per line\nTrack one\nTrack two'}
        onChange={(e) => update({ tracklist: e.target.value })}
        onFocus={onFocusField}
      />
    </div>
  );
}
