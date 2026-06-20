import { forwardRef } from 'react';
import type { LabelData } from '@/lib/types';
import { TRACKLIST, PREVIEW_PX_PER_MM, type SizePreset } from '@/lib/dimensions';

type Props = LabelData & { size: SizePreset };

const { padding, titleSize, artistSize } = TRACKLIST;

/**
 * Optional tracklist sheet for the MD jewel case. Artist/album header plus an
 * auto-numbered, two-column list of tracks.
 */
const TracklistSheet = forwardRef<SVGSVGElement, Props>(function TracklistSheet(
  {
    album,
    artist,
    tracklist,
    textColor,
    bgColor,
    fontFamily,
    showArtist,
    trackSize,
    letterSpacing,
    lineHeight,
    size,
  },
  ref,
) {
  const { width: W, height: H } = size;
  const trackGap = trackSize * lineHeight;
  const titleY = padding + titleSize * 0.9;
  const artistY = titleY + artistSize + 1;
  const ruleY = (showArtist ? artistY : titleY) + 2.5;
  const tracksTop = ruleY + 4;
  const colX = [padding, W / 2 + 1];
  const maxRows = Math.max(1, Math.floor((H - tracksTop - padding) / trackGap));

  const tracks = tracklist
    .split('\n')
    .map((t) => t.trim())
    .filter(Boolean);

  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${W} ${H}`}
      width={W * PREVIEW_PX_PER_MM}
      height={H * PREVIEW_PX_PER_MM}
      style={{ display: 'block' }}
    >
      <rect x={0} y={0} width={W} height={H} fill={bgColor} />

      <text
        x={padding}
        y={titleY}
        fill={textColor}
        fontFamily={fontFamily}
        fontSize={titleSize}
        fontWeight={700}
        letterSpacing={titleSize * letterSpacing}
      >
        {album || 'Album'}
      </text>
      {showArtist && (
        <text
          x={padding}
          y={artistY}
          fill={textColor}
          fontFamily={fontFamily}
          fontSize={artistSize}
          letterSpacing={artistSize * letterSpacing}
        >
          {artist || 'Artist'}
        </text>
      )}

      <line
        x1={padding}
        y1={ruleY}
        x2={W - padding}
        y2={ruleY}
        stroke={textColor}
        strokeWidth={0.3}
        opacity={0.6}
      />

      {tracks.map((track, i) => {
        const col = Math.floor(i / maxRows);
        const row = i % maxRows;
        if (col > 1) return null;
        return (
          <text
            key={i}
            x={colX[col]}
            y={tracksTop + row * trackGap}
            fill={textColor}
            fontFamily={fontFamily}
            fontSize={trackSize}
            letterSpacing={trackSize * letterSpacing}
          >
            {i + 1}. {track}
          </text>
        );
      })}
      {tracks.length === 0 && (
        <text
          x={padding}
          y={tracksTop}
          fill={textColor}
          fontFamily={fontFamily}
          fontSize={trackSize}
          opacity={0.5}
        >
          Tracklist…
        </text>
      )}
    </svg>
  );
});

export default TracklistSheet;
