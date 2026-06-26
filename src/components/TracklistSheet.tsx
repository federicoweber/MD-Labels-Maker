import { forwardRef } from 'react';
import type { LabelData } from '@/lib/types';
import { TRACKLIST, PREVIEW_PX_PER_MM, type SizePreset } from '@/lib/dimensions';
import { wrapText } from '@/lib/text';

type Props = LabelData & { size: SizePreset };

const { padding } = TRACKLIST;

/**
 * Optional tracklist sheet for the MD jewel case. One album (two-column tracks)
 * or, in double-album mode, two albums split vertically (single column each).
 */
const TracklistSheet = forwardRef<SVGSVGElement, Props>(function TracklistSheet(props, ref) {
  const {
    coverDataUrl,
    coverDataUrl2,
    doubleAlbum,
    album,
    album2,
    artist,
    artist2,
    tracklist,
    tracklist2,
    textColor,
    bgColor,
    titleFont,
    artistFont,
    trackFont,
    tlShowAlbum,
    tlShowArtist,
    tlTitleSize: titleSize,
    tlArtistSize: artistSize,
    showTracklistCover,
    trackSize,
    titleOpacity,
    artistOpacity,
    trackOpacity,
    letterSpacing,
    lineHeight,
    discNumber,
    discTotal,
    size,
  } = props;
  const { width: W, height: H } = size;
  const trackGap = trackSize * lineHeight;

  const column = (
    x0: number,
    colW: number,
    alb: string,
    art: string,
    cover: string | null,
    tracksStr: string,
    maxCols: number,
    key: string,
  ) => {
    const left = x0 + padding;
    const right = x0 + colW - padding;
    const hasThumb = showTracklistCover && !!cover;
    const hasTextHeader = tlShowAlbum || tlShowArtist;
    const hasHeader = hasTextHeader || hasThumb || discTotal > 1;
    const tracks = tracksStr
      .split('\n')
      .map((t) => t.trim())
      .filter(Boolean);

    // Wrap the album / artist header to the column width (less any room taken by
    // a thumbnail or disc stamp on the right), then stack the lines top-down.
    const headerRightW = hasThumb ? titleSize + artistSize + 4 : discTotal > 1 ? artistSize * 2.5 : 0;
    const titleW = Math.max(8, right - left - headerRightW);
    const titleLineGap = titleSize * 1.05;
    const artistLineGap = artistSize * 1.2;
    const titleLines = tlShowAlbum ? wrapText(alb || 'Album', titleFont, titleSize, titleW, 700) : [];
    const artistLines = tlShowArtist ? wrapText(art || 'Artist', artistFont, artistSize, titleW) : [];
    const titleBase = titleLines.map((_, i) => padding + titleSize * 0.9 + i * titleLineGap);
    const lastTitle = titleBase[titleBase.length - 1] ?? padding;
    const artist0 = tlShowAlbum ? lastTitle + artistSize + 1 : padding + artistSize * 0.9;
    const artistBase = artistLines.map((_, i) => artist0 + i * artistLineGap);
    const lastArtist = artistBase[artistBase.length - 1] ?? artist0;
    const headerBottom = tlShowArtist ? lastArtist : tlShowAlbum ? lastTitle : padding + artistSize;
    const ruleY = hasHeader ? headerBottom + 2.5 : padding;
    const tracksTop = hasHeader ? ruleY + 4 : padding + trackSize * 0.9;
    const maxLines = Math.max(1, Math.floor((H - tracksTop - padding) / trackGap));
    const thumbSize = ruleY - padding;

    // Match the preview: stay one column until the list is long enough.
    const maxOneCol = hasThumb ? 11 : hasTextHeader ? 12 : 15;
    const innerCols = maxCols >= 2 && tracks.length > maxOneCol ? 2 : 1;
    const innerW = (right - left) / innerCols;
    const colX = Array.from({ length: innerCols }, (_, i) => left + i * innerW);
    const colTextW = innerCols > 1 ? innerW - 2 : innerW;

    // Wrap each track to its column width and flow tracks down columns by line.
    const placed: { x: number; y: number; lines: string[] }[] = [];
    let col = 0;
    let lineInCol = 0;
    for (let i = 0; i < tracks.length; i++) {
      const lines = wrapText(`${i + 1}. ${tracks[i]}`, trackFont, trackSize, colTextW);
      if (lineInCol > 0 && lineInCol + lines.length > maxLines && col < innerCols - 1) {
        col++;
        lineInCol = 0;
      }
      placed.push({ x: colX[col], y: tracksTop + lineInCol * trackGap, lines });
      lineInCol += lines.length;
    }

    return (
      <g key={key}>
        {showTracklistCover && cover && (
          <image
            href={cover}
            x={right - thumbSize}
            y={padding}
            width={thumbSize}
            height={thumbSize}
            preserveAspectRatio="xMidYMid slice"
          />
        )}
        {discTotal > 1 && (
          <text
            x={right}
            y={padding + artistSize * 0.9}
            fill={textColor}
            fontFamily={titleFont}
            fontSize={artistSize}
            fontWeight={700}
            fillOpacity={artistOpacity}
            textAnchor="end"
            letterSpacing={artistSize * letterSpacing}
          >
            {discNumber}/{discTotal}
          </text>
        )}
        {tlShowAlbum && (
          <text
            fill={textColor}
            fontFamily={titleFont}
            fontSize={titleSize}
            fontWeight={700}
            fillOpacity={titleOpacity}
            letterSpacing={titleSize * letterSpacing}
          >
            {titleLines.map((line, i) => (
              <tspan key={i} x={left} y={titleBase[i]}>
                {line}
              </tspan>
            ))}
          </text>
        )}
        {tlShowArtist && (
          <text
            fill={textColor}
            fontFamily={artistFont}
            fontSize={artistSize}
            fillOpacity={artistOpacity}
            letterSpacing={artistSize * letterSpacing}
          >
            {artistLines.map((line, i) => (
              <tspan key={i} x={left} y={artistBase[i]}>
                {line}
              </tspan>
            ))}
          </text>
        )}
        {hasHeader && (
          <line x1={left} y1={ruleY} x2={right} y2={ruleY} stroke={textColor} strokeWidth={0.3} opacity={0.6} />
        )}
        {placed.map((p, i) => (
          <text
            key={i}
            fill={textColor}
            fontFamily={trackFont}
            fontSize={trackSize}
            fillOpacity={trackOpacity}
            letterSpacing={trackSize * letterSpacing}
          >
            {p.lines.map((line, li) => (
              <tspan key={li} x={p.x} y={p.y + li * trackGap}>
                {line}
              </tspan>
            ))}
          </text>
        ))}
      </g>
    );
  };

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
      <rect x={0} y={0} width={W} height={H} fill={bgColor} />
      {doubleAlbum ? (
        <>
          {column(0, W / 2, album, artist, coverDataUrl, tracklist, 1, 'c1')}
          <line x1={W / 2} y1={0} x2={W / 2} y2={H} stroke={textColor} strokeWidth={0.2} opacity={0.4} />
          {column(W / 2, W / 2, album2, artist2, coverDataUrl2, tracklist2, 1, 'c2')}
        </>
      ) : (
        column(0, W, album, artist, coverDataUrl, tracklist, 2, 'c1')
      )}
    </svg>
  );
});

export default TracklistSheet;
