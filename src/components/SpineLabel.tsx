import { forwardRef } from 'react';
import type { LabelData } from './FrontLabel';
import { SPINE, PREVIEW_PX_PER_MM } from '../lib/dimensions';

const { width: W, height: H, textSize } = SPINE;

/**
 * MiniDisc spine label: 58.59×3.79mm. A coloured strip with the
 * "Artist - Title" caption, centred.
 */
const SpineLabel = forwardRef<SVGSVGElement, LabelData>(function SpineLabel(
  { album, artist, textColor, bgColor, fontFamily },
  ref,
) {
  const caption = [artist || 'Artist', album || 'Title'].join(' - ');
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
        x={W / 2}
        y={H / 2}
        fill={textColor}
        fontFamily={fontFamily}
        fontSize={textSize}
        fontWeight={700}
        textAnchor="middle"
        dominantBaseline="central"
      >
        {caption}
      </text>
    </svg>
  );
});

export default SpineLabel;
