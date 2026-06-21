import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { LabelData } from '@/lib/types';
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
  const CH = FRONT.chamfer * S;
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
      ) : (
        <>
          <CoverSlot
            src={data.coverDataUrl}
            onCover={onCover}
            pageDragging={pageDragging}
            style={{ position: 'absolute', top: 0, left: 0, width: cover, height: cover }}
          />

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
          d={`M ${FRONT.chamfer},0 H ${size.width} V ${size.height} H 0 V ${FRONT.chamfer} Z`}
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

/** A droppable / clickable cover area with a drop-target overlay. */
function CoverSlot({
  src,
  onCover,
  pageDragging,
  style,
  contain,
  children,
}: {
  src: string | null;
  onCover: (dataUrl: string | null) => void;
  pageDragging: boolean;
  style: React.CSSProperties;
  contain?: boolean;
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
        <img src={src} alt="" className={`size-full ${contain ? 'object-contain' : 'object-cover'}`} />
      )}
      <div
        className={`absolute inset-0 flex items-center justify-center transition-opacity ${
          src && !pageDragging ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'
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

/** Album + artist overlaid on a cover (double-album mode), with a legibility scrim. */
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
        gap: 0.3 * S,
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
