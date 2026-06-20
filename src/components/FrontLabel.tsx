import { forwardRef } from 'react';
import type { LabelData } from '@/lib/types';
import { FRONT, PREVIEW_PX_PER_MM } from '@/lib/dimensions';
import { wrapText } from '@/lib/text';

const { width: W, height: H, coverSize, chamfer, padding } = FRONT;
const bandTop = H - FRONT.bandHeight;

// Outline with a chamfered top-left corner (like a real MiniDisc).
const OUTLINE = `M ${chamfer},0 H ${W} V ${H} H 0 V ${chamfer} Z`;

/**
 * MiniDisc front/top label — 34×52mm. Square cover on top, coloured text band
 * below with a wrapping, size-adjustable title and a size-adjustable artist.
 * Clipped to a chamfered-corner outline.
 */
const FrontLabel = forwardRef<SVGSVGElement, LabelData>(function FrontLabel(
  { coverDataUrl, album, artist, textColor, bgColor, fontFamily, titleSize, artistSize },
  ref,
) {
  const titleLines = wrapText(album || 'Album', fontFamily, titleSize, W - 2 * padding, 700);
  const titleLH = titleSize * 1.15;
  const firstBaseline = bandTop + padding + titleSize * 0.85;
  const lastTitleBaseline = firstBaseline + (titleLines.length - 1) * titleLH;
  const artistBaseline = lastTitleBaseline + artistSize + 1.4;

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
        <rect x={0} y={0} width={W} height={H} fill={bgColor} />

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

        <text fill={textColor} fontFamily={fontFamily} fontSize={titleSize} fontWeight={700}>
          {titleLines.map((line, i) => (
            <tspan key={i} x={padding} y={firstBaseline + i * titleLH}>
              {line || ' '}
            </tspan>
          ))}
        </text>
        <text
          x={padding}
          y={artistBaseline}
          fill={textColor}
          fontFamily={fontFamily}
          fontSize={artistSize}
        >
          {artist || 'Artist'}
        </text>
      </g>
    </svg>
  );
});

export default FrontLabel;
