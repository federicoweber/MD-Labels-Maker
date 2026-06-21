import { useLayoutEffect, useRef } from 'react';
import type { LabelData } from '@/lib/types';
import { TRACKLIST, PREVIEW_PX_PER_MM as S, type SizePreset } from '@/lib/dimensions';

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
  const W = size.width * S;
  const H = size.height * S;
  return (
    <div
      className="flex"
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
          cols={2}
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
}: {
  data: LabelData;
  album: string;
  artist: string;
  cover: string | null;
  tracklist: string;
  onChange: (v: string) => void;
  cols: number;
}) {
  const PAD = TRACKLIST.padding * S;
  const titleY = TRACKLIST.padding + TRACKLIST.titleSize * 0.9;
  const artistY = titleY + TRACKLIST.artistSize + 1;
  const ruleY = (data.tlShowArtist ? artistY : titleY) + 2.5;
  const thumb = (ruleY - TRACKLIST.padding) * S;
  const hasHeader = data.tlShowAlbum || data.tlShowArtist || (data.showTracklistCover && !!cover);

  return (
    <div className="flex min-w-0 flex-1 flex-col" style={{ padding: PAD }}>
      {hasHeader && (
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {data.tlShowAlbum && (
              <div
                style={{
                  fontFamily: data.titleFont,
                  fontSize: TRACKLIST.titleSize * S,
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
                  fontSize: TRACKLIST.artistSize * S,
                  opacity: data.artistOpacity,
                  lineHeight: 1.2,
                  letterSpacing: `${data.letterSpacing}em`,
                }}
              >
                {artist || 'Artist'}
              </div>
            )}
          </div>
          {data.showTracklistCover && cover && (
            <img
              src={cover}
              alt=""
              className="shrink-0 object-cover"
              style={{ width: thumb, height: thumb }}
            />
          )}
        </div>
      )}
      {hasHeader && (
        <div className="my-1 w-full" style={{ height: 1, background: data.textColor, opacity: 0.6 }} />
      )}

      <TrackEditor
        value={tracklist}
        onChange={onChange}
        cols={cols}
        style={{
          fontFamily: data.trackFont,
          fontSize: data.trackSize * S,
          color: data.textColor,
          opacity: data.trackOpacity,
          lineHeight: data.lineHeight,
          letterSpacing: `${data.letterSpacing}em`,
          columnGap: 1.2 * S,
        }}
      />
    </div>
  );
}

/** ContentEditable numbered track list (one or two columns). */
function TrackEditor({
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
    const current = [...el.querySelectorAll('li')].map((li) => li.textContent ?? '').join('\n');
    if (current !== value) {
      el.innerHTML = value
        ? value
            .split('\n')
            .map((l) => `<li>${escapeHtml(l) || '<br>'}</li>`)
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
        onChange(
          [...e.currentTarget.querySelectorAll('li')].map((li) => li.textContent ?? '').join('\n'),
        )
      }
      className="track-ol label-field min-h-0 flex-1 overflow-hidden outline-none"
      style={{
        columns: cols,
        columnFill: 'auto',
        listStyleType: 'decimal',
        listStylePosition: 'inside',
        margin: 0,
        padding: 0,
        ...style,
      }}
    />
  );
}
