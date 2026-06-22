import { forwardRef } from 'react';
import type { LabelData } from '@/lib/types';
import { TRACKLIST, PREVIEW_PX_PER_MM, type SizePreset } from '@/lib/dimensions';

type Props = LabelData & { size: SizePreset };

const { padding, titleSize, artistSize } = TRACKLIST;

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
    innerCols: number,
    key: string,
  ) => {
    const left = x0 + padding;
    const right = x0 + colW - padding;
    const titleY = padding + titleSize * 0.9;
    const artistY = titleY + artistSize + 1;
    const hasHeader =
      tlShowAlbum || tlShowArtist || (showTracklistCover && !!cover) || discTotal > 1;
    const headerBottom = tlShowArtist ? artistY : tlShowAlbum ? titleY : padding + artistSize;
    const ruleY = hasHeader ? headerBottom + 2.5 : padding;
    const tracksTop = hasHeader ? ruleY + 4 : padding + trackSize * 0.9;
    const maxRows = Math.max(1, Math.floor((H - tracksTop - padding) / trackGap));
    const innerW = (right - left) / innerCols;
    const colX = Array.from({ length: innerCols }, (_, i) => left + i * innerW);
    const thumbSize = ruleY - padding;
    const tracks = tracksStr
      .split('\n')
      .map((t) => t.trim())
      .filter(Boolean);

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
            x={left}
            y={titleY}
            fill={textColor}
            fontFamily={titleFont}
            fontSize={titleSize}
            fontWeight={700}
            fillOpacity={titleOpacity}
            letterSpacing={titleSize * letterSpacing}
          >
            {alb || 'Album'}
          </text>
        )}
        {tlShowArtist && (
          <text
            x={left}
            y={artistY}
            fill={textColor}
            fontFamily={artistFont}
            fontSize={artistSize}
            fillOpacity={artistOpacity}
            letterSpacing={artistSize * letterSpacing}
          >
            {art || 'Artist'}
          </text>
        )}
        {hasHeader && (
          <line x1={left} y1={ruleY} x2={right} y2={ruleY} stroke={textColor} strokeWidth={0.3} opacity={0.6} />
        )}
        {tracks.map((track, i) => {
          const col = Math.floor(i / maxRows);
          const row = i % maxRows;
          if (col >= innerCols) return null;
          return (
            <text
              key={i}
              x={colX[col]}
              y={tracksTop + row * trackGap}
              fill={textColor}
              fontFamily={trackFont}
              fontSize={trackSize}
              fillOpacity={trackOpacity}
              letterSpacing={trackSize * letterSpacing}
            >
              {i + 1}. {track}
            </text>
          );
        })}
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
