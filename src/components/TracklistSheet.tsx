import { forwardRef } from 'react';
import type { LabelData } from '@/lib/types';
import { TRACKLIST, PREVIEW_PX_PER_MM } from '@/lib/dimensions';

const { width: W, height: H, padding, titleSize, artistSize, trackSize, trackGap } = TRACKLIST;

const titleY = padding + titleSize * 0.9;
const artistY = titleY + artistSize + 1;
const ruleY = artistY + 2.5;
const tracksTop = ruleY + 4;

// Two columns spanning the landscape width.
const colX = [padding, W / 2 + 1];
const maxRows = Math.floor((H - tracksTop - padding) / trackGap);

/**
 * Optional tracklist sheet for the MD jewel case — 70×50mm landscape. Artist /
 * album header plus an auto-numbered, two-column list of tracks.
 */
const TracklistSheet = forwardRef<SVGSVGElement, LabelData>(function TracklistSheet(
  { album, artist, tracklist, textColor, bgColor, fontFamily },
  ref,
) {
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
      >
        {album || 'Album'}
      </text>
      <text x={padding} y={artistY} fill={textColor} fontFamily={fontFamily} fontSize={artistSize}>
        {artist || 'Artist'}
      </text>

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
        if (col > 1) return null; // overflow beyond two columns is clipped
        return (
          <text
            key={i}
            x={colX[col]}
            y={tracksTop + row * trackGap}
            fill={textColor}
            fontFamily={fontFamily}
            fontSize={trackSize}
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
