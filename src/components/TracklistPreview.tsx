import type { LabelData } from '@/lib/types';
import { TRACKLIST, PREVIEW_PX_PER_MM as S, type SizePreset } from '@/lib/dimensions';

interface Props {
  data: LabelData;
  size: SizePreset;
  update: (patch: Partial<LabelData>) => void;
}

/**
 * Editable tracklist-sheet preview (landscape). Header is derived from album
 * (+ artist when shown); tracks are typed directly, one per line. The hidden
 * SVG twin renders the final numbered, two-column layout for export.
 */
export default function TracklistPreview({ data, size, update }: Props) {
  const W = size.width * S;
  const H = size.height * S;
  const PAD = TRACKLIST.padding * S;

  // Numbered gutter aligned to each line (sequential over non-empty lines).
  let n = 0;
  const numbers = data.tracklist.split('\n').map((line) => (line.trim() ? `${++n}.` : ''));
  const gutterW = data.trackSize * S * 1.9;

  const titleY = TRACKLIST.padding + TRACKLIST.titleSize * 0.9;
  const artistY = titleY + TRACKLIST.artistSize + 1;
  const ruleY = (data.showArtist ? artistY : titleY) + 2.5;
  const thumb = (ruleY - TRACKLIST.padding) * S;
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
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div
            style={{
              fontFamily: data.titleFont,
              fontSize: TRACKLIST.titleSize * S,
              fontWeight: 700,
              opacity: data.titleOpacity,
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
                opacity: data.artistOpacity,
                lineHeight: 1.2,
                letterSpacing: `${data.letterSpacing}em`,
              }}
            >
              {data.artist || 'Artist'}
            </div>
          )}
        </div>
        {data.showTracklistCover && data.coverDataUrl && (
          <img
            src={data.coverDataUrl}
            alt=""
            className="shrink-0 object-cover"
            style={{ width: thumb, height: thumb }}
          />
        )}
      </div>
      <div className="my-1 w-full" style={{ height: 1, background: data.textColor, opacity: 0.6 }} />
      <div className="relative flex-1">
        <div
          aria-hidden
          className="pointer-events-none absolute top-0 left-0"
          style={{
            width: gutterW,
            fontFamily: data.trackFont,
            fontSize: data.trackSize * S,
            color: data.textColor,
            opacity: data.trackOpacity,
            lineHeight: data.lineHeight,
            letterSpacing: `${data.letterSpacing}em`,
          }}
        >
          {numbers.map((num, i) => (
            <div key={i}>{num || ' '}</div>
          ))}
        </div>
        <textarea
          className="label-field absolute inset-0 resize-none bg-transparent p-0 outline-none"
          style={{
            paddingLeft: gutterW,
            fontFamily: data.trackFont,
            fontSize: data.trackSize * S,
            color: data.textColor,
            opacity: data.trackOpacity,
            lineHeight: data.lineHeight,
            letterSpacing: `${data.letterSpacing}em`,
          }}
          value={data.tracklist}
          placeholder={'Track one\nTrack two'}
          onChange={(e) => update({ tracklist: e.target.value })}
        />
      </div>
    </div>
  );
}
