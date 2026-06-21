import { forwardRef } from 'react';
import type { LabelData } from '@/lib/types';
import { FRONT, PREVIEW_PX_PER_MM, frontCoverSize, type SizePreset } from '@/lib/dimensions';
import { wrapText } from '@/lib/text';

type Props = LabelData & { size: SizePreset };

/**
 * MiniDisc front/top (face) label. Square cover sits on top (portrait) or on
 * the left (landscape); the remaining area holds a wrapping, size-adjustable
 * title and an optional artist. Clipped to a chamfered top-left corner.
 */
const FrontLabel = forwardRef<SVGSVGElement, Props>(function FrontLabel(
  {
    coverDataUrl,
    album,
    artist,
    textColor,
    bgColor,
    titleFont,
    artistFont,
    titleSize,
    artistSize,
    titleOpacity,
    artistOpacity,
    showArtist,
    letterSpacing,
    lineHeight,
    size,
  },
  ref,
) {
  const { width: W, height: H } = size;
  const cover = frontCoverSize(size);
  const portrait = H >= W;
  const { chamfer, padding } = FRONT;

  const textX = (portrait ? 0 : cover) + padding;
  const textTop = (portrait ? cover : 0) + padding;
  const textMaxWidth = (portrait ? W : W - cover) - 2 * padding;

  const titleLines = wrapText(album || 'Title', titleFont, titleSize, textMaxWidth, 700);
  const titleLH = titleSize * lineHeight;
  const firstBaseline = textTop + titleSize * 0.85;
  const lastTitleBaseline = firstBaseline + (titleLines.length - 1) * titleLH;
  const artistBaseline = lastTitleBaseline + artistSize + 1.4;

  const OUTLINE = `M ${chamfer},0 H ${W} V ${H} H 0 V ${chamfer} Z`;

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
            width={cover}
            height={cover}
            preserveAspectRatio="xMidYMid slice"
          />
        ) : (
          <>
            <rect x={0} y={0} width={cover} height={cover} fill="#d8d8d8" />
            <text
              x={cover / 2}
              y={cover / 2}
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

        <text
          fill={textColor}
          fillOpacity={titleOpacity}
          fontFamily={titleFont}
          fontSize={titleSize}
          fontWeight={700}
          letterSpacing={titleSize * letterSpacing}
        >
          {titleLines.map((line, i) => (
            <tspan key={i} x={textX} y={firstBaseline + i * titleLH}>
              {line || ' '}
            </tspan>
          ))}
        </text>
        {showArtist && (
          <text
            x={textX}
            y={artistBaseline}
            fill={textColor}
            fillOpacity={artistOpacity}
            fontFamily={artistFont}
            fontSize={artistSize}
            letterSpacing={artistSize * letterSpacing}
          >
            {artist || 'Subtitle'}
          </text>
        )}
      </g>
    </svg>
  );
});

export default FrontLabel;
