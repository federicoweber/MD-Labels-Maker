import { forwardRef, useId } from 'react';
import type { LabelData } from '@/lib/types';
import { FRONT, PREVIEW_PX_PER_MM, frontCoverSize, type SizePreset } from '@/lib/dimensions';
import { wrapText } from '@/lib/text';

type Props = LabelData & { size: SizePreset };

/**
 * MiniDisc front/top (face) label. Single mode: square cover + title/artist
 * band. Double-album mode: two stacked covers, each with its album/artist
 * overlaid on the image. Clipped to a chamfered top-left corner.
 */
const FrontLabel = forwardRef<SVGSVGElement, Props>(function FrontLabel(props, ref) {
  const {
    coverDataUrl,
    coverDataUrl2,
    doubleAlbum,
    doubleHideText,
    textBgOpacity,
    album,
    album2,
    artist,
    artist2,
    textColor,
    bgColor,
    titleFont,
    artistFont,
    yearFont,
    titleSize,
    artistSize,
    titleOpacity,
    artistOpacity,
    showArtist,
    year,
    showYear,
    yearSize,
    discNumber,
    discTotal,
    letterSpacing,
    lineHeight,
    size,
  } = props;
  const { width: W, height: H } = size;
  const cover = frontCoverSize(size);
  const portrait = H >= W;
  const { chamfer, padding } = FRONT;
  const OUTLINE = `M ${chamfer},0 H ${W} V ${H} H 0 V ${chamfer} Z`;
  // Unique per instance — duplicate clipPath ids across the many SVGs on a
  // print sheet make url(#…) resolve ambiguously and drop the chamfer in print.
  const clipId = `front-clip-${useId().replace(/:/g, '')}`;

  // One stacked album: cover scaled to fit (never cropped), with album/artist
  // overlaid over its bottom on a solid (adjustable-opacity) band. Text optional.
  const half = H / 2;
  const DOUBLE_TEXT_SCALE = 0.72;
  const albumBlock = (coverUrl: string | null, alb: string, art: string, top: number, key: string) => {
    const bottom = top + half;
    const ts = titleSize * DOUBLE_TEXT_SCALE;
    const as = artistSize * DOUBLE_TEXT_SCALE;
    const maxW = W - 2 * padding;
    const lines = wrapText(alb || 'Album', titleFont, ts, maxW, 700);
    const lh = ts * lineHeight;
    const artistBase = bottom - padding * 0.7;
    const lastTitleBase = artistBase - as - 0.6;
    const firstTitleBase = lastTitleBase - (lines.length - 1) * lh;
    const bandY = firstTitleBase - ts - padding * 0.4;
    return (
      <g key={key}>
        {coverUrl ? (
          <image href={coverUrl} x={0} y={top} width={W} height={half} preserveAspectRatio="xMidYMid meet" />
        ) : (
          <rect x={0} y={top} width={W} height={half} fill="#3f3d39" />
        )}
        {!doubleHideText && (
          <>
            <rect x={0} y={bandY} width={W} height={bottom - bandY} fill={bgColor} fillOpacity={textBgOpacity} />
            <text
              fill={textColor}
              fillOpacity={titleOpacity}
              fontFamily={titleFont}
              fontSize={ts}
              fontWeight={700}
              letterSpacing={ts * letterSpacing}
            >
              {lines.map((line, i) => (
                <tspan key={i} x={padding} y={lastTitleBase - (lines.length - 1 - i) * lh}>
                  {line || ' '}
                </tspan>
              ))}
            </text>
            <text
              x={padding}
              y={artistBase}
              fill={textColor}
              fillOpacity={artistOpacity}
              fontFamily={artistFont}
              fontSize={as}
              letterSpacing={as * letterSpacing}
            >
              {art || 'Artist'}
            </text>
          </>
        )}
      </g>
    );
  };

  // Single-mode text geometry.
  const textX = (portrait ? 0 : cover) + padding;
  const textTop = (portrait ? cover : 0) + padding;
  const textMaxWidth = (portrait ? W : W - cover) - 2 * padding;
  const titleLines = wrapText(album || 'Album', titleFont, titleSize, textMaxWidth, 700);
  const titleLH = titleSize * lineHeight;
  const firstBaseline = textTop + titleSize * 0.85;
  const lastTitleBaseline = firstBaseline + (titleLines.length - 1) * titleLH;
  const artistBaseline = lastTitleBaseline + artistSize + 1.4;

  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${W} ${H}`}
      width={W * PREVIEW_PX_PER_MM}
      height={H * PREVIEW_PX_PER_MM}
      preserveAspectRatio="none"
      style={{ display: 'block' }}
    >
      <defs>
        <clipPath id={clipId}>
          <path d={OUTLINE} />
        </clipPath>
      </defs>

      <g clipPath={`url(#${clipId})`}>
        <rect x={0} y={0} width={W} height={H} fill={bgColor} />

        {doubleAlbum ? (
          <>
            {albumBlock(coverDataUrl, album, artist, 0, 'a1')}
            {albumBlock(coverDataUrl2, album2, artist2, half, 'a2')}
          </>
        ) : (
          <>
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
                {artist || 'Artist'}
              </text>
            )}
            {showYear && year && (
              <text
                x={textX}
                y={H - padding}
                fill={textColor}
                fillOpacity={artistOpacity}
                fontFamily={yearFont}
                fontSize={yearSize}
                letterSpacing={yearSize * letterSpacing}
              >
                {year}
              </text>
            )}
            {discTotal > 1 && (
              <text
                x={W - padding}
                y={H - padding}
                fill={textColor}
                fillOpacity={artistOpacity}
                fontFamily={yearFont}
                fontSize={yearSize}
                textAnchor="end"
                letterSpacing={yearSize * letterSpacing}
              >
                {discNumber}/{discTotal}
              </text>
            )}
          </>
        )}
      </g>
    </svg>
  );
});

export default FrontLabel;
