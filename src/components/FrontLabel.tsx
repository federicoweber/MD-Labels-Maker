import { forwardRef } from 'react';
import { FRONT, PREVIEW_PX_PER_MM } from '../lib/dimensions';

export interface LabelData {
  coverDataUrl: string | null;
  album: string;
  artist: string;
  textColor: string;
  bgColor: string;
  fontFamily: string;
}

const { width: W, height: H, textBandHeight, padding, frameStroke, titleSize, artistSize } = FRONT;
const bandTop = H - textBandHeight;
const coverHeight = bandTop;
const titleY = bandTop + padding + titleSize * 0.8;
const artistY = titleY + artistSize + 1.5;

/**
 * MiniDisc front/top label: 68×79mm. Album cover fills the top region,
 * a coloured band at the bottom holds the album title and artist.
 * Renders pure SVG (mm viewBox) so it exports at true physical size.
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
      {/* Cover area */}
      {coverDataUrl ? (
        <image
          href={coverDataUrl}
          x={0}
          y={0}
          width={W}
          height={coverHeight}
          preserveAspectRatio="xMidYMid slice"
        />
      ) : (
        <>
          <rect x={0} y={0} width={W} height={coverHeight} fill="#e8e8e8" />
          <text
            x={W / 2}
            y={coverHeight / 2}
            fill="#9a9a9a"
            fontFamily="system-ui, sans-serif"
            fontSize={3.2}
            textAnchor="middle"
            dominantBaseline="middle"
          >
            Drop album cover
          </text>
        </>
      )}

      {/* Text band */}
      <rect x={0} y={bandTop} width={W} height={textBandHeight} fill={bgColor} />
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
      <text
        x={padding}
        y={artistY}
        fill={textColor}
        fontFamily={fontFamily}
        fontSize={artistSize}
      >
        {artist || 'Artist'}
      </text>

      {/* Frame */}
      <rect
        x={frameStroke / 2}
        y={frameStroke / 2}
        width={W - frameStroke}
        height={H - frameStroke}
        fill="none"
        stroke="#111"
        strokeWidth={frameStroke}
      />
    </svg>
  );
});

export default FrontLabel;
