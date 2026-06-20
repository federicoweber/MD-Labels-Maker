import type { LabelData } from '@/lib/types';
import { TRACKLIST, PREVIEW_PX_PER_MM as S } from '@/lib/dimensions';

const W = TRACKLIST.width * S;
const H = TRACKLIST.height * S;
const PAD = TRACKLIST.padding * S;

interface Props {
  data: LabelData;
  update: (patch: Partial<LabelData>) => void;
}

/**
 * Editable tracklist-sheet preview (70×50mm scaled, landscape). Header is
 * derived from artist/album; tracks are typed directly (one per line). The
 * hidden SVG twin renders the final numbered, two-column layout for export.
 */
export default function TracklistPreview({ data, update }: Props) {
  return (
    <div
      className="flex flex-col shadow-xl"
      style={{ width: W, height: H, background: data.bgColor, padding: PAD, color: data.textColor }}
    >
      <div style={{ fontFamily: data.fontFamily, fontSize: TRACKLIST.titleSize * S, fontWeight: 700, lineHeight: 1.05 }}>
        {data.album || 'Album'}
      </div>
      <div style={{ fontFamily: data.fontFamily, fontSize: TRACKLIST.artistSize * S, lineHeight: 1.2 }}>
        {data.artist || 'Artist'}
      </div>
      <div className="my-1 w-full" style={{ height: 1, background: data.textColor, opacity: 0.6 }} />
      <textarea
        className="label-field w-full flex-1 resize-none bg-transparent p-0 outline-none"
        style={{
          fontFamily: data.fontFamily,
          fontSize: TRACKLIST.trackSize * S,
          color: data.textColor,
          lineHeight: 1.45,
        }}
        value={data.tracklist}
        placeholder={'One track per line\nTrack one\nTrack two'}
        onChange={(e) => update({ tracklist: e.target.value })}
      />
    </div>
  );
}
