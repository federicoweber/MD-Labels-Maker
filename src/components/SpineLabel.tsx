import { forwardRef } from 'react';
import type { LabelData } from '@/lib/types';
import { PREVIEW_PX_PER_MM, type SizePreset } from '@/lib/dimensions';

type Props = LabelData & { size: SizePreset };

const caption = (album: string, artist: string, showArtist: boolean) =>
  showArtist && artist ? `${album || 'Album'} - ${artist}` : album || 'Album';

/** MiniDisc spine label — a thin strip with a centred caption (two in 2× mode). */
const SpineLabel = forwardRef<SVGSVGElement, Props>(function SpineLabel(
  { album, album2, artist, artist2, doubleAlbum, textColor, bgColor, titleFont, showArtist, letterSpacing, size },
  ref,
) {
  const { width: W, height: H } = size;
  const fontSize = H * 0.66 * (doubleAlbum ? 0.85 : 1);
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
      {doubleAlbum ? (
        <>
          <text
            x={W / 4}
            y={H / 2}
            fill={textColor}
            fontFamily={titleFont}
            fontSize={fontSize}
            fontWeight={700}
            letterSpacing={fontSize * letterSpacing}
            textAnchor="middle"
            dominantBaseline="central"
          >
            {caption(album, artist, true)}
          </text>
          <line x1={W / 2} y1={0} x2={W / 2} y2={H} stroke={textColor} strokeWidth={0.2} opacity={0.5} />
          <text
            x={(W * 3) / 4}
            y={H / 2}
            fill={textColor}
            fontFamily={titleFont}
            fontSize={fontSize}
            fontWeight={700}
            letterSpacing={fontSize * letterSpacing}
            textAnchor="middle"
            dominantBaseline="central"
          >
            {caption(album2, artist2, true)}
          </text>
        </>
      ) : (
        <text
          x={W / 2}
          y={H / 2}
          fill={textColor}
          fontFamily={titleFont}
          fontSize={fontSize}
          fontWeight={700}
          letterSpacing={fontSize * letterSpacing}
          textAnchor="middle"
          dominantBaseline="central"
        >
          {caption(album, artist, showArtist)}
        </text>
      )}
    </svg>
  );
});

export default SpineLabel;
