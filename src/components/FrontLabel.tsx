import { forwardRef } from 'react';
import type { LabelData } from '@/lib/types';
import { FRONT, PREVIEW_PX_PER_MM } from '@/lib/dimensions';

const { width: W, height: H, coverSize, bandHeight, chamfer, padding, titleSize, artistSize } = FRONT;
const bandTop = H - bandHeight;
const titleY = bandTop + padding + titleSize * 0.9;
const artistY = titleY + artistSize + 1.2;

// Outline with a chamfered top-left corner (like a real MiniDisc).
const OUTLINE = `M ${chamfer},0 H ${W} V ${H} H 0 V ${chamfer} Z`;

/**
 * MiniDisc front/top label — 34×52mm. A full-width square album cover sits at
 * the top; an 18mm coloured band below holds the title and artist. The whole
 * label is clipped to a chamfered-corner outline.
 */
const FrontLabel = forwardRef<SVGSVGElement, LabelData>(function FrontLabel(
  { coverDataUrl, album, artist, textColor, bgColor, fontFamily },
  ref,
) {
  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${W} ${H}`}
      width={W * PREVIEW_PX_PER_MM}
      height={H * PREVIEW_PX_PER_MM}
      style={{ display: 'block' }}
    >
      <defs>
        <clipPath id="front-clip">
          <path d={OUTLINE} />
        </clipPath>
      </defs>

      <g clipPath="url(#front-clip)">
        {/* Background band fills the whole label first (shows through chamfer-free areas) */}
        <rect x={0} y={0} width={W} height={H} fill={bgColor} />

        {/* Square album cover */}
        {coverDataUrl ? (
          <image
            href={coverDataUrl}
            x={0}
            y={0}
            width={W}
            height={coverSize}
            preserveAspectRatio="xMidYMid slice"
          />
        ) : (
          <>
            <rect x={0} y={0} width={W} height={coverSize} fill="#d8d8d8" />
            <text
              x={W / 2}
              y={coverSize / 2}
              fill="#8a8a8a"
              fontFamily="'Roboto Mono', monospace"
              fontSize={2.4}
              textAnchor="middle"
              dominantBaseline="middle"
            >
              drop cover
            </text>
          </>
        )}

        {/* Title + artist in the band */}
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
      </g>
    </svg>
  );
});

export default FrontLabel;
