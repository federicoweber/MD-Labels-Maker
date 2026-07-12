import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, MoveHorizontal } from 'lucide-react';
import type { LabelData } from '@/lib/types';
import { TrackEditor } from '@/components/TracklistPreview';
import { FRONT, PREVIEW_PX_PER_MM as S, frontCoverSize, type SizePreset } from '@/lib/dimensions';

interface Props {
  data: LabelData;
  size: SizePreset;
  update: (patch: Partial<LabelData>) => void;
  onCover: (dataUrl: string | null) => void;
  onCover2: (dataUrl: string | null) => void;
}

function readImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Append an opacity (0–1) to a #rrggbb hex as an 8-digit hex. */
function withAlpha(hex: string, opacity: number): string {
  const a = Math.round(Math.max(0, Math.min(1, opacity)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${a}`;
}

/** Album/artist sit smaller when overlaid on covers in double mode. */
const DOUBLE_TEXT_SCALE = 0.72;

/**
 * Editable front-label preview. In single mode the cover sits on top with a
 * text band below; in double-album mode two stacked covers each carry their own
 * album/artist overlaid on the image. The hidden SVG twin exports.
 */
export default function FrontPreview({ data, size, update, onCover, onCover2 }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [pageDragging, setPageDragging] = useState(false);

  // Detect a file being dragged anywhere on the page to prompt "DROP".
  useEffect(() => {
    const hasFiles = (e: DragEvent) => e.dataTransfer?.types?.includes('Files');
    const on = (e: DragEvent) => {
      if (hasFiles(e)) setPageDragging(true);
    };
    const off = (e: DragEvent) => {
      if (!e.relatedTarget) setPageDragging(false);
    };
    const end = () => setPageDragging(false);
    window.addEventListener('dragover', on);
    window.addEventListener('dragenter', on);
    window.addEventListener('dragleave', off);
    window.addEventListener('drop', end);
    return () => {
      window.removeEventListener('dragover', on);
      window.removeEventListener('dragenter', on);
      window.removeEventListener('dragleave', off);
      window.removeEventListener('drop', end);
    };
  }, []);

  const W = size.width * S;
  const H = size.height * S;
  const cover = frontCoverSize(size) * S;
  const portrait = size.height >= size.width;
  const PAD = FRONT.padding * S;
  const chamfer = data.showChamfer ? FRONT.chamfer : 0;
  const CH = chamfer * S;
  const CLIP = `polygon(${CH}px 0, 100% 0, 100% 100%, 0 100%, 0 ${CH}px)`;

  return (
    <div
      className="relative select-none"
      style={{ width: W, height: H, background: data.bgColor, clipPath: CLIP }}
    >
      {data.doubleAlbum ? (
        <>
          <CoverSlot
            src={data.coverDataUrl}
            onCover={onCover}
            pageDragging={pageDragging}
            contain
            style={{ position: 'absolute', top: 0, left: 0, width: W, height: H / 2 }}
          >
            {!data.doubleHideText && (
              <OverlayText
                data={data}
                album={data.album}
                artist={data.artist}
                onAlbum={(v) => update({ album: v })}
                onArtist={(v) => update({ artist: v })}
                pad={PAD}
              />
            )}
          </CoverSlot>
          <CoverSlot
            src={data.coverDataUrl2}
            onCover={onCover2}
            pageDragging={pageDragging}
            contain
            style={{ position: 'absolute', top: H / 2, left: 0, width: W, height: H / 2 }}
          >
            {!data.doubleHideText && (
              <OverlayText
                data={data}
                album={data.album2}
                artist={data.artist2}
                onAlbum={(v) => update({ album2: v })}
                onArtist={(v) => update({ artist2: v })}
                pad={PAD}
              />
            )}
          </CoverSlot>
        </>
      ) : data.fullHeight ? (
        <CoverSlot
          src={data.coverDataUrl}
          onCover={onCover}
          pageDragging={pageDragging}
          quietHover
          imgStyle={{ objectPosition: `${data.fullHeightAlign * 100}% 50%` }}
          style={{ position: 'absolute', top: 0, left: 0, width: W, height: H }}
        >
          {data.coverDataUrl && H > W && (
            <AlignControls
              align={data.fullHeightAlign}
              maxShift={H - W}
              onChange={(v) => update({ fullHeightAlign: v })}
            />
          )}
          {(data.frontTracklist || !data.doubleHideText) && (
            <div
              className="absolute right-0 bottom-0 left-0 flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {data.frontTracklist && <TracksOverlay data={data} update={update} />}
              {!data.doubleHideText && (
                <div
                  className="flex flex-col justify-end"
                  style={{
                    padding: PAD,
                    gap: 0.2 * S,
                    background: withAlpha(data.bgColor, data.textBgOpacity),
                  }}
                >
                  <AutoTextarea
                    value={data.album}
                    placeholder="Album"
                    onChange={(v) => update({ album: v })}
                    style={{
                      fontFamily: data.titleFont,
                      fontSize: data.titleSize * S,
                      fontWeight: 700,
                      color: data.textColor,
                      opacity: data.titleOpacity,
                      lineHeight: data.lineHeight,
                      letterSpacing: `${data.letterSpacing}em`,
                    }}
                  />
                  {data.showArtist && (
                    <input
                      className="label-field w-full bg-transparent p-0 outline-none"
                      style={{
                        fontFamily: data.artistFont,
                        fontSize: data.artistSize * S,
                        color: data.textColor,
                        opacity: data.artistOpacity,
                        lineHeight: 1.1,
                        letterSpacing: `${data.letterSpacing}em`,
                      }}
                      value={data.artist}
                      placeholder="Artist"
                      onChange={(e) => update({ artist: e.target.value })}
                    />
                  )}
                  {(data.showYear || data.discTotal > 1) && (
                    <div className="flex items-baseline justify-between">
                      {data.showYear ? (
                        <input
                          className="label-field bg-transparent p-0 outline-none"
                          style={{
                            width: 70,
                            fontFamily: data.yearFont,
                            fontSize: data.yearSize * S,
                            color: data.textColor,
                            opacity: data.artistOpacity,
                          }}
                          value={data.year}
                          placeholder="Year"
                          onChange={(e) => update({ year: e.target.value })}
                        />
                      ) : (
                        <span />
                      )}
                      {data.discTotal > 1 && (
                        <span
                          style={{
                            fontFamily: data.yearFont,
                            fontSize: data.yearSize * S,
                            color: data.textColor,
                            opacity: data.artistOpacity,
                            lineHeight: 1,
                          }}
                        >
                          {data.discNumber}/{data.discTotal}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CoverSlot>
      ) : (
        <>
          <CoverSlot
            src={data.coverDataUrl}
            onCover={onCover}
            pageDragging={pageDragging}
            style={{ position: 'absolute', top: 0, left: 0, width: cover, height: cover }}
          />
          {data.frontTracklist && (
            <TracksOverlay
              data={data}
              update={update}
              style={{
                position: 'absolute',
                left: 0,
                top: cover,
                width: cover,
                transform: 'translateY(-100%)',
                maxHeight: cover,
              }}
            />
          )}

          <div
            className="absolute flex flex-col justify-start"
            style={{
              top: portrait ? cover : 0,
              left: portrait ? 0 : cover,
              width: portrait ? W : W - cover,
              padding: PAD,
              gap: 0.6 * S,
            }}
          >
            <AutoTextarea
              value={data.album}
              placeholder="Album"
              onChange={(v) => update({ album: v })}
              style={{
                fontFamily: data.titleFont,
                fontSize: data.titleSize * S,
                fontWeight: 700,
                color: data.textColor,
                opacity: data.titleOpacity,
                lineHeight: data.lineHeight,
                letterSpacing: `${data.letterSpacing}em`,
              }}
            />
            {data.showArtist && (
              <input
                className="label-field w-full bg-transparent p-0 outline-none"
                style={{
                  fontFamily: data.artistFont,
                  fontSize: data.artistSize * S,
                  color: data.textColor,
                  opacity: data.artistOpacity,
                  lineHeight: 1.1,
                  letterSpacing: `${data.letterSpacing}em`,
                }}
                value={data.artist}
                placeholder="Artist"
                onChange={(e) => update({ artist: e.target.value })}
              />
            )}
          </div>

          {data.showYear && (
            <input
              className="label-field absolute bg-transparent p-0 outline-none"
              style={{
                left: (portrait ? 0 : cover) + PAD,
                bottom: PAD * 0.6,
                width: 70,
                fontFamily: data.yearFont,
                fontSize: data.yearSize * S,
                color: data.textColor,
                opacity: data.artistOpacity,
              }}
              value={data.year}
              placeholder="Year"
              onChange={(e) => update({ year: e.target.value })}
            />
          )}
          {data.discTotal > 1 && (
            <span
              className="absolute"
              style={{
                right: PAD,
                bottom: PAD * 0.6,
                fontFamily: data.yearFont,
                fontSize: data.yearSize * S,
                color: data.textColor,
                opacity: data.artistOpacity,
                lineHeight: 1,
              }}
            >
              {data.discNumber}/{data.discTotal}
            </span>
          )}
        </>
      )}

      {/* Border tracing the chamfered outline */}
      <svg
        className="pointer-events-none absolute inset-0"
        style={{ width: W, height: H }}
        viewBox={`0 0 ${size.width} ${size.height}`}
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          d={`M ${chamfer},0 H ${size.width} V ${size.height} H 0 V ${chamfer} Z`}
          fill="none"
          stroke="#000"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/* Hidden input reused for the single-mode cover (slots have their own) */}
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f?.type.startsWith('image/')) void readImageFile(f).then(onCover);
        }}
      />
    </div>
  );
}

/**
 * Editable numbered tracks superimposed on the cover art, on a translucent
 * bgColor panel that shares the text band's opacity.
 */
function TracksOverlay({
  data,
  update,
  style,
}: {
  data: LabelData;
  update: (patch: Partial<LabelData>) => void;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        padding: `${FRONT.padding * 0.6 * S}px ${FRONT.padding * S}px`,
        background: withAlpha(data.bgColor, data.textBgOpacity),
        overflow: 'hidden',
        ...style,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <TrackEditor
        value={data.tracklist}
        onChange={(v) => update({ tracklist: v })}
        cols={1}
        style={{
          fontFamily: data.trackFont,
          fontSize: data.trackSize * S,
          color: data.textColor,
          opacity: data.trackOpacity,
          lineHeight: data.lineHeight,
          letterSpacing: `${data.letterSpacing}em`,
          minHeight: data.trackSize * S * data.lineHeight,
        }}
      />
    </div>
  );
}

/** A droppable / clickable cover area with a drop-target overlay. */
function CoverSlot({
  src,
  onCover,
  pageDragging,
  style,
  imgStyle,
  contain,
  quietHover,
  children,
}: {
  src: string | null;
  onCover: (dataUrl: string | null) => void;
  pageDragging: boolean;
  style: React.CSSProperties;
  imgStyle?: React.CSSProperties;
  contain?: boolean;
  /** Suppress the hover "COVER" veil once an image is set (full-height mode). */
  quietHover?: boolean;
  children?: React.ReactNode;
}) {
  const input = useRef<HTMLInputElement>(null);
  const pick = (files: FileList | null) => {
    const f = files?.[0];
    if (f?.type.startsWith('image/')) void readImageFile(f).then(onCover);
  };
  return (
    <div
      className="group cursor-pointer overflow-hidden"
      style={style}
      onClick={() => input.current?.click()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        pick(e.dataTransfer.files);
      }}
    >
      {src && (
        <img
          src={src}
          alt=""
          className={`size-full ${contain ? 'object-contain' : 'object-cover'}`}
          style={imgStyle}
        />
      )}
      <div
        className={`pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity ${
          src && !pageDragging
            ? quietHover
              ? 'opacity-0'
              : 'opacity-0 group-hover:opacity-100'
            : 'opacity-100'
        }`}
        style={{ background: src ? 'rgba(18,16,12,0.6)' : '#3f3d39', color: '#cfc9bd' }}
      >
        <svg
          className="absolute inset-0 size-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden
        >
          <line x1="0" y1="0" x2="100" y2="100" stroke="#8a857c" strokeWidth="0.6" strokeDasharray="3 2" />
          <line x1="100" y1="0" x2="0" y2="100" stroke="#8a857c" strokeWidth="0.6" strokeDasharray="3 2" />
        </svg>
        <span className="relative tracking-wide" style={{ fontSize: 3 * S }}>
          {pageDragging ? 'DROP' : 'COVER'}
        </span>
      </div>
      {children}
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => pick(e.target.files)}
      />
    </div>
  );
}

/**
 * Full-height mode: hover controls to fine-tune the cover's horizontal crop.
 * The whole cover becomes a drag surface (the image follows the pointer); the
 * hover pill's chevrons nudge it and its centre button recentres. Plain clicks
 * (no movement) still fall through to the CoverSlot's file picker.
 */
function AlignControls({
  align,
  maxShift,
  onChange,
}: {
  /** 0 = show the cover's left edge … 1 = its right edge. */
  align: number;
  /** How much wider the full-height cover is than the label, in px. */
  maxShift: number;
  onChange: (v: number) => void;
}) {
  const drag = useRef<{ x: number; align: number } | null>(null);
  const moved = useRef(false);
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  const set = (e: React.MouseEvent, v: number) => {
    e.stopPropagation();
    onChange(clamp(v));
  };
  return (
    <div
      className="absolute inset-0 cursor-ew-resize touch-none"
      onPointerDown={(e) => {
        // Capturing here would steal the pill buttons' clicks — let them be.
        if ((e.target as HTMLElement).closest('button')) return;
        drag.current = { x: e.clientX, align };
        moved.current = false;
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!drag.current) return;
        const dx = e.clientX - drag.current.x;
        if (Math.abs(dx) > 3) moved.current = true;
        if (moved.current) onChange(clamp(drag.current.align - dx / maxShift));
      }}
      onPointerUp={() => (drag.current = null)}
      onPointerCancel={() => (drag.current = null)}
      onClick={(e) => {
        // A drag shouldn't also open the cover picker.
        if (moved.current) {
          e.stopPropagation();
          moved.current = false;
        }
      }}
    >
      <div className="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-0.5 rounded-full bg-black/60 px-1.5 py-1 text-white opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          aria-label="Nudge cover left"
          onClick={(e) => set(e, align + 0.05)}
          className="grid size-5 place-items-center rounded-full hover:bg-white/20"
        >
          <ChevronLeft className="size-3.5" />
        </button>
        <button
          type="button"
          aria-label="Centre cover"
          onClick={(e) => set(e, 0.5)}
          className="grid size-5 place-items-center rounded-full hover:bg-white/20"
        >
          <MoveHorizontal className="size-3.5" />
        </button>
        <button
          type="button"
          aria-label="Nudge cover right"
          onClick={(e) => set(e, align - 0.05)}
          className="grid size-5 place-items-center rounded-full hover:bg-white/20"
        >
          <ChevronRight className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

/**
 * Album + artist overlaid over the bottom of a cover (double-album mode) on a
 * solid background band with adjustable opacity. Text sits smaller here.
 */
function OverlayText({
  data,
  album,
  artist,
  onAlbum,
  onArtist,
  pad,
}: {
  data: LabelData;
  album: string;
  artist: string;
  onAlbum: (v: string) => void;
  onArtist: (v: string) => void;
  pad: number;
}) {
  return (
    <div
      className="absolute right-0 bottom-0 left-0 flex flex-col justify-end"
      style={{
        padding: pad,
        gap: 0.2 * S,
        background: withAlpha(data.bgColor, data.textBgOpacity),
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <AutoTextarea
        value={album}
        placeholder="Album"
        onChange={onAlbum}
        style={{
          fontFamily: data.titleFont,
          fontSize: data.titleSize * DOUBLE_TEXT_SCALE * S,
          fontWeight: 700,
          color: data.textColor,
          opacity: data.titleOpacity,
          lineHeight: data.lineHeight,
          letterSpacing: `${data.letterSpacing}em`,
        }}
      />
      <input
        className="label-field w-full bg-transparent p-0 outline-none"
        style={{
          fontFamily: data.artistFont,
          fontSize: data.artistSize * DOUBLE_TEXT_SCALE * S,
          color: data.textColor,
          opacity: data.artistOpacity,
          lineHeight: 1.1,
          letterSpacing: `${data.letterSpacing}em`,
        }}
        value={artist}
        placeholder="Artist"
        onChange={(e) => onArtist(e.target.value)}
      />
    </div>
  );
}

/** A transparent, auto-growing textarea that blends into the label. */
function AutoTextarea({
  value,
  placeholder,
  onChange,
  style,
}: {
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
  style: React.CSSProperties;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value, style.fontSize, style.fontFamily]);

  return (
    <textarea
      ref={ref}
      rows={1}
      className="label-field w-full resize-none overflow-hidden bg-transparent p-0 outline-none"
      style={style}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
