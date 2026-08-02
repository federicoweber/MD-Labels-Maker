import { useLayoutEffect, useRef } from 'react';
import type { LabelData } from '@/lib/types';
import QrOverlay from '@/components/QrOverlay';
import {
  TRACKLIST,
  PREVIEW_PX_PER_MM as S,
  orientedTracklistSize,
  type SizePreset,
} from '@/lib/dimensions';
import { wrapText } from '@/lib/text';
import { qrPath, shareDataFor, shareUrl } from '@/lib/share';
import { splitTrack } from '@/lib/tracklist';

interface Props {
  data: LabelData;
  size: SizePreset;
  update: (patch: Partial<LabelData>) => void;
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Editable tracklist-sheet preview (landscape). One album, or split vertically
 * into two albums in double-album mode. Each album: optional header + a
 * numbered, editable track list (mirrors the SVG export).
 */
export default function TracklistPreview({ data, size, update }: Props) {
  const layoutSize = orientedTracklistSize(size, data.tlVerticalMode);
  const W = layoutSize.width * S;
  const H = layoutSize.height * S;
  return (
    <div
      className="relative flex"
      style={{
        width: W,
        height: H,
        background: data.bgColor,
        color: data.textColor,
        boxShadow: 'inset 0 0 0 1px #000',
      }}
    >
      {data.doubleAlbum ? (
        <>
          <TracklistColumn
            data={data}
            album={data.album}
            artist={data.artist}
            cover={data.coverDataUrl}
            tracklist={data.tracklist}
            onChange={(v) => update({ tracklist: v })}
            cols={1}
            colWmm={layoutSize.width / 2}
            heightMm={layoutSize.height}
            hasQr={false}
          />
          <div className="w-px self-stretch" style={{ background: data.textColor, opacity: 0.4 }} />
          <TracklistColumn
            data={data}
            album={data.album2}
            artist={data.artist2}
            cover={data.coverDataUrl2}
            tracklist={data.tracklist2}
            onChange={(v) => update({ tracklist2: v })}
            cols={1}
            colWmm={layoutSize.width / 2}
            heightMm={layoutSize.height}
            hasQr={false}
          />
        </>
      ) : (
        <TracklistColumn
          data={data}
          album={data.album}
          artist={data.artist}
          cover={data.coverDataUrl}
          tracklist={data.tracklist}
          onChange={(v) => update({ tracklist: v })}
          cols={data.tlDoubleColumns ? 2 : 1}
          colWmm={layoutSize.width}
          heightMm={layoutSize.height}
          hasQr={data.tlShowQr}
        />
      )}
      {data.tlShowQr && !data.doubleAlbum && (
        <QrOverlay
          data={data}
          moduleMm={0.3}
          padMm={1.2}
          className="absolute z-20"
          style={{ right: TRACKLIST.padding * S, bottom: TRACKLIST.padding * S }}
        />
      )}
    </div>
  );
}

function TracklistColumn({
  data,
  album,
  artist,
  cover,
  tracklist,
  onChange,
  cols,
  colWmm,
  heightMm,
  hasQr,
}: {
  data: LabelData;
  album: string;
  artist: string;
  cover: string | null;
  tracklist: string;
  onChange: (v: string) => void;
  cols: number;
  /** This column's width and the sheet height, in mm (the twin's geometry). */
  colWmm: number;
  heightMm: number;
  hasQr: boolean;
}) {
  const PAD = TRACKLIST.padding * S;
  const pad = TRACKLIST.padding;
  const hasThumb = data.showTracklistCover && !!cover;
  const hasTextHeader = data.tlShowAlbum || data.tlShowArtist;
  const hasHeader = hasTextHeader || hasThumb || data.discTotal > 1;

  // Mirror the twin's header/track geometry exactly (same wrapText measures),
  // so the editor's height — and therefore where CSS columns split the list —
  // matches where the print splits it.
  const headerRightW = hasThumb
    ? data.tlTitleSize + data.tlArtistSize + 4
    : data.discTotal > 1
      ? data.tlArtistSize * 2.5
      : 0;
  const titleW = Math.max(8, colWmm - 2 * pad - headerRightW);
  const titleLines = data.tlShowAlbum
    ? wrapText(album || 'Album', data.titleFont, data.tlTitleSize, titleW, 700)
    : [];
  const artistLines = data.tlShowArtist
    ? wrapText(artist || 'Artist', data.artistFont, data.tlArtistSize, titleW)
    : [];
  const lastTitle = titleLines.length
    ? pad + data.tlTitleSize * 0.9 + (titleLines.length - 1) * data.tlTitleSize * 1.05
    : pad;
  const artist0 = data.tlShowAlbum ? lastTitle + data.tlArtistSize + 1 : pad + data.tlArtistSize * 0.9;
  const lastArtist = artistLines.length
    ? artist0 + (artistLines.length - 1) * data.tlArtistSize * 1.2
    : artist0;
  const headerBottom = data.tlShowArtist ? lastArtist : data.tlShowAlbum ? lastTitle : pad + data.tlArtistSize;
  const headerRuleY = hasHeader ? headerBottom + 2.5 : pad;
  const thumbSize = hasThumb ? headerRuleY - pad : 0;
  const ruleY = headerRuleY + (hasThumb ? 2 : 0);
  const tracksTop = hasHeader ? ruleY + 4 : pad + data.trackSize * 0.9;
  const trackGap = data.trackSize * data.lineHeight;
  const qrSizeMm = hasQr ? qrPath(shareUrl(shareDataFor(data))).count * 0.3 + 2.4 : 0;
  const maxFull = Math.max(1, Math.floor((heightMm - tracksTop - pad) / trackGap));
  const qrTop = heightMm - pad - qrSizeMm;
  const maxShort = hasQr
    ? Math.max(1, Math.floor((qrTop - tracksTop - 0.2 * data.trackSize) / trackGap) + 1)
    : maxFull;
  const thumb = thumbSize * S;

  const trackCount = tracklist.split('\n').filter((t) => t.trim()).length;
  const durationChars = data.showTrackDuration
    ? Math.max(0, ...tracklist.split('\n').map((t) => splitTrack(t).dur.length))
    : 0;
  const useCols = cols >= 2 ? 2 : 1;
  return (
    <div className="relative flex min-w-0 flex-1 flex-col" style={{ padding: PAD }}>
      {hasQr && useCols > 1 && (
        // Masks the right column's lines below the twin's cut (they don't
        // print), covering the strip left of the QR too. Starts at the first
        // dropped line's box top so no partial line shows.
        <div
          className="pointer-events-none absolute right-0 bottom-0 z-10"
          style={{
            left: (pad + (colWmm - 2 * pad) / 2 - 1) * S,
            top: Math.min(qrTop, tracksTop + maxShort * trackGap - 0.85 * data.trackSize) * S,
            background: data.bgColor,
          }}
        />
      )}
      {hasHeader && (
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {data.tlShowAlbum && (
              <div
                style={{
                  fontFamily: data.titleFont,
                  fontSize: data.tlTitleSize * S,
                  fontWeight: 700,
                  opacity: data.titleOpacity,
                  lineHeight: 1.05,
                  letterSpacing: `${data.letterSpacing}em`,
                }}
              >
                {album || 'Album'}
              </div>
            )}
            {data.tlShowArtist && (
              <div
                style={{
                  fontFamily: data.artistFont,
                  fontSize: data.tlArtistSize * S,
                  opacity: data.artistOpacity,
                  lineHeight: 1.2,
                  letterSpacing: `${data.letterSpacing}em`,
                }}
              >
                {artist || 'Artist'}
              </div>
            )}
          </div>
          <div className="flex shrink-0 items-start gap-2">
            {data.discTotal > 1 && (
              <div
                style={{
                  fontFamily: data.titleFont,
                  fontSize: data.tlArtistSize * S,
                  fontWeight: 700,
                  opacity: data.artistOpacity,
                  lineHeight: 1,
                  letterSpacing: `${data.letterSpacing}em`,
                }}
              >
                {data.discNumber}/{data.discTotal}
              </div>
            )}
            {data.showTracklistCover && cover && (
              <img
                src={cover}
                alt=""
                className="object-cover"
                style={{ width: thumb, height: thumb }}
              />
            )}
          </div>
        </div>
      )}
      {hasHeader && (
        <div
          className="absolute"
          style={{
            top: ruleY * S,
            left: PAD,
            right: PAD,
            height: 1,
            background: data.textColor,
            opacity: 0.6,
          }}
        />
      )}

      <TrackEditor
        value={tracklist}
        onChange={onChange}
        cols={useCols}
        style={{
          fontFamily: data.trackFont,
          fontSize: data.trackSize * S,
          color: data.textColor,
          opacity: data.trackOpacity,
          lineHeight: data.lineHeight,
          letterSpacing: `${data.letterSpacing}em`,
          // The twin reserves 2mm at each inner column's right edge; a 4mm CSS
          // column gap yields the same per-column text width.
          columnGap: 4 * S,
          // Pinned to the twin's geometry: rows start at its tracksTop (the
          // first baseline lands ~0.9 × trackSize below the line-box top) with
          // the same line budget, so the column split and the stop above the
          // QR land on the same track as the print. The extra pixel absorbs
          // fractional line-height rounding at the boundary.
          position: 'absolute',
          left: PAD,
          right: PAD,
          top: (tracksTop - 0.9 * data.trackSize) * S,
          // End at the same physical inset used by the top/left/right edges;
          // overflow clipping still prevents a partial final row.
          height: (heightMm - pad - (tracksTop - 0.9 * data.trackSize)) * S,
          flex: 'none',
          '--track-num-width': `${(`${trackCount}.`.length * 0.62).toFixed(2)}em`,
          '--track-duration-width': durationChars ? `${durationChars * 0.62 + 0.6}em` : '0em',
        } as React.CSSProperties & Record<`--${string}`, string | number>}
      />
    </div>
  );
}

/** A line's text with <b>/<strong> segments serialised back to ** markers. */
function formattedText(el: Element): string {
  return [...el.childNodes]
    .map((n) => {
      const tag = (n as Element).tagName;
      return tag === 'B' || tag === 'STRONG' ? `**${n.textContent}**` : (n.textContent ?? '');
    })
    .join('');
}

function lineText(li: Element): string {
  const title = li.querySelector('.track-title');
  const duration = li.querySelector('.track-duration')?.textContent?.trim() ?? '';
  const text = title ? formattedText(title) : formattedText(li);
  return duration ? `${text}\t${duration}` : text;
}

/** "**Artist** Title" renders its artist prefix bold inside the editor. */
function lineHtml(l: string): string {
  const { title, dur } = splitTrack(l);
  const titleHtml = escapeHtml(title).replace(/^\*\*(.+?)\*\*\s?/, '<b>$1</b> ') || '<br>';
  return `<span class="track-title">${titleHtml}</span><span class="track-duration">${escapeHtml(dur)}</span>`;
}

/** ContentEditable numbered track list (one or two columns). */
export function TrackEditor({
  value,
  onChange,
  cols,
  style,
}: {
  value: string;
  onChange: (v: string) => void;
  cols: number;
  style: React.CSSProperties;
}) {
  const ref = useRef<HTMLOListElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || document.activeElement === el) return;
    const current = [...el.querySelectorAll('li')].map(lineText).join('\n');
    if (current !== value) {
      el.innerHTML = value
        ? value
            .split('\n')
            .map((l) => `<li>${lineHtml(l)}</li>`)
            .join('')
        : '';
    }
  }, [value]);

  return (
    <ol
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      onInput={(e) =>
        onChange([...e.currentTarget.querySelectorAll('li')].map(lineText).join('\n'))
      }
      className="track-ol label-field min-h-0 flex-1 overflow-hidden outline-none"
      style={{
        columns: cols,
        columnFill: 'auto',
        margin: 0,
        padding: 0,
        ...style,
      }}
    />
  );
}
