import { forwardRef, useId } from 'react';
import type { LabelData } from '@/lib/types';
import {
  FRONT,
  PREVIEW_PX_PER_MM,
  frontCoverSize,
  orientedFrontSize,
  standardCoverGeometry,
  type SizePreset,
} from '@/lib/dimensions';
import { frontTextBlockHeight, wrapText } from '@/lib/text';
import { splitBoldArtist, splitTrack } from '@/lib/tracklist';
import { qrPath, shareDataFor, shareUrl } from '@/lib/share';
import { QrGraphic } from '@/components/QrGraphic';

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
    fullHeight,
    fullHeightScale,
    verticalMode,
    coverPadding,
    fullHeightAlign,
    fullHeightTextY,
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
    trackFont,
    titleSize,
    artistSize,
    trackSize,
    titleOpacity,
    artistOpacity,
    trackOpacity,
    showArtist,
    frontTracklist,
    showQr,
    tracklist,
    showTrackDuration,
    year,
    showYear,
    yearSize,
    discNumber,
    discTotal,
    showChamfer,
    letterSpacing,
    lineHeight,
    titleArtistGap,
    size,
  } = props;
  const physicalW = size.width;
  const physicalH = size.height;
  const layoutSize = orientedFrontSize(size, verticalMode);
  const { width: W, height: H } = layoutSize;
  const cover = frontCoverSize(layoutSize);
  const portrait = H >= W;
  const { padding } = FRONT;
  const chamfer = showChamfer ? FRONT.chamfer : 0;
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
    const artistLines = wrapText(art || 'Artist', artistFont, as, maxW);
    const artistLH = as * lineHeight;
    const artistBase = bottom - padding * 0.7 - (artistLines.length - 1) * artistLH;
    const lastTitleBase = artistBase - as - titleArtistGap;
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
              fill={textColor}
              fillOpacity={artistOpacity}
              fontFamily={artistFont}
              fontSize={as}
              letterSpacing={as * letterSpacing}
            >
              {artistLines.map((line, i) => (
                <tspan key={i} x={padding} y={artistBase + i * artistLH}>
                  {line || ' '}
                </tspan>
              ))}
            </text>
          </>
        )}
      </g>
    );
  };

  // "Tracklist on cover": numbered tracks superimposed on the art, on a
  // translucent bgColor panel (same opacity as the text band). `buildTracks`
  // measures (wrapping and dropping tracks that don't fit `maxH`) so callers
  // can position the panel; `tracksBlock` renders it at `top`.
  const buildTracks = (w: number, maxH: number) => {
    if (!frontTracklist) return null;
    const gap = trackSize * lineHeight;
    const innerPad = padding * 0.6;
    const maxW = w - 2 * padding;
    const maxLines = Math.max(0, Math.floor((maxH - 2 * innerPad) / gap));
    const items = tracklist
      .split('\n')
      .map((t) => t.trim())
      .filter(Boolean);
    const rows: { lines: string[]; dur: string; num: string; boldArtist: string | null }[] = [];
    let used = 0;
    for (let i = 0; i < items.length; i++) {
      const { title, dur } = splitTrack(items[i]);
      const { artist: boldArtist, title: plainTitle } = splitBoldArtist(title);
      const display = boldArtist ? `${boldArtist} ${plainTitle}` : title;
      const num = `${i + 1}. `;
      const showDur = showTrackDuration && !!dur;
      const durW = showDur ? dur.length * trackSize * 0.62 + 1.5 : 0;
      const lines = wrapText(`${num}${display}`, trackFont, trackSize, maxW - durW);
      if (used + lines.length > maxLines) break;
      rows.push({ lines, dur: showDur ? dur : '', num, boldArtist });
      used += lines.length;
    }
    if (!used) return null;
    return { rows, gap, innerPad, height: used * gap + 2 * innerPad };
  };

  const tracksBlock = (
    x0: number,
    w: number,
    top: number,
    t: NonNullable<ReturnType<typeof buildTracks>>,
    key: string,
  ) => {
    const { rows, gap, innerPad, height } = t;
    let base = top + innerPad + trackSize * 0.85;
    return (
      <g key={key}>
        <rect x={x0} y={top} width={w} height={height} fill={bgColor} fillOpacity={textBgOpacity} />
        {rows.map((r, i) => {
          const y0 = base;
          base += r.lines.length * gap;
          return (
            <g key={i}>
              <text
                fill={textColor}
                fillOpacity={trackOpacity}
                fontFamily={trackFont}
                fontSize={trackSize}
                letterSpacing={trackSize * letterSpacing}
              >
                {r.lines.map((line, li) => {
                  const boldLead = `${r.num}${r.boldArtist ?? ''}`;
                  if (li === 0 && r.boldArtist && line.startsWith(boldLead)) {
                    return (
                      <tspan key={li} x={x0 + padding} y={y0}>
                        {r.num}
                        <tspan fontWeight={700}>{r.boldArtist}</tspan>
                        {line.slice(boldLead.length)}
                      </tspan>
                    );
                  }
                  return (
                    <tspan key={li} x={x0 + padding} y={y0 + li * gap}>
                      {line}
                    </tspan>
                  );
                })}
              </text>
              {r.dur && (
                <text
                  x={x0 + w - padding}
                  y={y0}
                  fill={textColor}
                  fillOpacity={trackOpacity * 0.7}
                  fontFamily={trackFont}
                  fontSize={trackSize}
                  textAnchor="end"
                >
                  {r.dur}
                </text>
              )}
            </g>
          );
        })}
      </g>
    );
  };

  // Full-height mode: the (square) cover fills the label's height and is
  // cropped horizontally; `fullHeightAlign` pans the crop (0 = left … 1 =
  // right). Text overlays the bottom on a band, like double mode but full size.
  const fullHeightBlock = () => {
    const side = Math.max(W, H) * fullHeightScale;
    const maxW = W - 2 * padding;
    const lines = wrapText(album || 'Album', titleFont, titleSize, maxW, 700);
    const lh = titleSize * lineHeight;
    const metaRow = (showYear && !!year) || discTotal > 1;
    let base = H - padding * 0.7;
    const metaBase = base;
    if (metaRow) base -= yearSize + 0.8;
    const bandArtistLines = showArtist ? wrapText(artist || 'Artist', artistFont, artistSize, maxW) : [];
    const bandArtistLH = artistSize * lineHeight;
    const artistBase = base - (bandArtistLines.length - 1) * bandArtistLH;
    if (showArtist) base = artistBase - artistSize - titleArtistGap;
    const lastTitleBase = base;
    const firstTitleBase = lastTitleBase - (lines.length - 1) * lh;
    const bandY = firstTitleBase - titleSize - padding * 0.4;
    // The text block (tracks panel + band) is positioned by `fullHeightTextY`:
    // 0 = top of the label, 1 = bottom (the geometry above assumes bottom).
    const bandH = doubleHideText ? 0 : H - bandY;
    const built = buildTracks(W, H - bandH);
    const blockH = bandH + (built?.height ?? 0);
    const textY = Math.max(0, Math.min(1, fullHeightTextY));
    const blockTop = textY * (H - blockH);
    const bandShift = blockTop + (built?.height ?? 0) - bandY;
    return (
      <>
        {coverDataUrl ? (
          <image
            href={coverDataUrl}
            x={(W - side) * fullHeightAlign}
            y={(H - side) / 2}
            width={side}
            height={side}
            preserveAspectRatio="xMidYMid slice"
          />
        ) : (
          <>
            <rect x={0} y={0} width={W} height={H} fill="#d8d8d8" />
            <text
              x={W / 2}
              y={H / 2}
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
        {built && tracksBlock(0, W, blockTop, built, 'ft')}
        {!doubleHideText && (
          <g transform={`translate(0 ${bandShift})`}>
            <rect x={0} y={bandY} width={W} height={H - bandY} fill={bgColor} fillOpacity={textBgOpacity} />
            <text
              fill={textColor}
              fillOpacity={titleOpacity}
              fontFamily={titleFont}
              fontSize={titleSize}
              fontWeight={700}
              letterSpacing={titleSize * letterSpacing}
            >
              {lines.map((line, i) => (
                <tspan key={i} x={padding} y={lastTitleBase - (lines.length - 1 - i) * lh}>
                  {line || ' '}
                </tspan>
              ))}
            </text>
            {showArtist && (
              <text
                fill={textColor}
                fillOpacity={artistOpacity}
                fontFamily={artistFont}
                fontSize={artistSize}
                letterSpacing={artistSize * letterSpacing}
              >
                {bandArtistLines.map((line, i) => (
                  <tspan key={i} x={padding} y={artistBase + i * bandArtistLH}>
                    {line || ' '}
                  </tspan>
                ))}
              </text>
            )}
            {showYear && year && (
              <text
                x={padding}
                y={metaBase}
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
                y={metaBase}
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
          </g>
        )}
        {qrAt(0, Math.max(0, blockTop - W), W)}
      </>
    );
  };

  // QR code linking to the digital tracklist page — superimposed over the
  // whole cover-art space in the label's own colours: bgColor backing (at the
  // text-background opacity, so the art shows through) with textColor modules.
  // Vector modules keep the print crisp. In full-height mode the square rides
  // on top of the text stack.
  const qr = showQr && !doubleAlbum ? qrPath(shareUrl(shareDataFor(props))) : null;
  const qrAt = (x: number, y: number, size: number) =>
    qr && (
      <QrGraphic
        qr={qr}
        x={x}
        y={y}
        size={size}
        pad={padding}
        bgColor={bgColor}
        textColor={textColor}
        bgOpacity={textBgOpacity}
      />
    );

  // Single-mode text geometry: bottom-anchored. The artist sits at the bottom
  // of the label (above the year/disc row when present) and the title stacks
  // up from it, separated by the adjustable title–artist gap. Both wrap with
  // no height cap — the text takes what it needs and the cover square (with
  // its QR / tracks overlays) shrinks to the remaining space.
  const hideText = doubleHideText;
  const textMaxWidth = (portrait ? W : W - cover) - 2 * padding;
  const titleLines = wrapText(album || 'Album', titleFont, titleSize, textMaxWidth, 700);
  const titleLH = titleSize * lineHeight;
  const singleMetaRow = (showYear && !!year) || discTotal > 1;
  const bottomAnchor = singleMetaRow ? H - padding - yearSize - 0.8 : H - padding * 0.7;
  const artistLines = showArtist ? wrapText(artist || 'Artist', artistFont, artistSize, textMaxWidth) : [];
  const artistLH = artistSize * lineHeight;
  const artistFirstBaseline = bottomAnchor - (artistLines.length - 1) * artistLH;
  const lastTitleBaseline = showArtist
    ? artistFirstBaseline - artistSize - titleArtistGap
    : bottomAnchor;
  const firstBaseline = lastTitleBaseline - (titleLines.length - 1) * titleLH;
  const textBlockH = hideText ? 0 : frontTextBlockHeight(props, textMaxWidth);
  const availableCoverH = portrait
    ? Math.max(6, bottomAnchor - textBlockH - padding * 0.6)
    : cover;
  const coverGeo = standardCoverGeometry(layoutSize, availableCoverH, coverPadding);
  const textX = (portrait ? 0 : cover) + padding;
  const singleTracks = doubleAlbum || fullHeight ? null : buildTracks(coverGeo.side, coverGeo.side);

  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${physicalW} ${physicalH}`}
      width={physicalW * PREVIEW_PX_PER_MM}
      height={physicalH * PREVIEW_PX_PER_MM}
      preserveAspectRatio="none"
      style={{ display: 'block' }}
    >
      <defs>
        <clipPath id={clipId}>
          <path d={OUTLINE} />
        </clipPath>
      </defs>

      <g transform={verticalMode ? `translate(${physicalW} 0) rotate(90)` : undefined}>
      <g clipPath={`url(#${clipId})`}>
        <rect x={0} y={0} width={W} height={H} fill={bgColor} />

        {doubleAlbum ? (
          <>
            {albumBlock(coverDataUrl, album, artist, 0, 'a1')}
            {albumBlock(coverDataUrl2, album2, artist2, half, 'a2')}
          </>
        ) : fullHeight ? (
          fullHeightBlock()
        ) : (
          <>
            {coverDataUrl ? (
              <image
                href={coverDataUrl}
                x={coverGeo.x}
                y={coverGeo.y}
                width={coverGeo.side}
                height={coverGeo.side}
                preserveAspectRatio="xMidYMid meet"
              />
            ) : (
              <>
                <rect
                  x={coverGeo.x}
                  y={coverGeo.y}
                  width={coverGeo.side}
                  height={coverGeo.side}
                  fill="#d8d8d8"
                />
                <text
                  x={coverGeo.x + coverGeo.side / 2}
                  y={coverGeo.y + coverGeo.side / 2}
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
            {singleTracks &&
              tracksBlock(
                coverGeo.x,
                coverGeo.side,
                coverGeo.y + coverGeo.side - singleTracks.height,
                singleTracks,
                'ft',
              )}

            {!hideText && (
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
            )}
            {!hideText && showArtist && (
              <text
                fill={textColor}
                fillOpacity={artistOpacity}
                fontFamily={artistFont}
                fontSize={artistSize}
                letterSpacing={artistSize * letterSpacing}
              >
                {artistLines.map((line, i) => (
                  <tspan key={i} x={textX} y={artistFirstBaseline + i * artistLH}>
                    {line || ' '}
                  </tspan>
                ))}
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
            {qrAt(coverGeo.x, coverGeo.y, coverGeo.side)}
          </>
        )}
      </g>
      </g>
    </svg>
  );
});

export default FrontLabel;
