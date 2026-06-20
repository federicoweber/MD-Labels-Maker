import { forwardRef } from 'react';
import type { LabelData } from '@/lib/types';
import { PREVIEW_PX_PER_MM, type SizePreset } from '@/lib/dimensions';

type Props = LabelData & { size: SizePreset };

/** MiniDisc spine label — a thin strip with a centred caption. */
const SpineLabel = forwardRef<SVGSVGElement, Props>(function SpineLabel(
  { album, artist, textColor, bgColor, fontFamily, showArtist, letterSpacing, size },
  ref,
) {
  const { width: W, height: H } = size;
  const caption =
    showArtist && artist ? `${album || 'Title'} - ${artist}` : album || 'Title';
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
        fontSize={H * 0.66}
        fontWeight={700}
        letterSpacing={H * 0.66 * letterSpacing}
        textAnchor="middle"
        dominantBaseline="central"
      >
        {caption}
      </text>
    </svg>
  );
});

export default SpineLabel;
