import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { LabelData } from '@/lib/types';
import { FRONT, PREVIEW_PX_PER_MM as S, frontCoverSize, type SizePreset } from '@/lib/dimensions';

interface Props {
  data: LabelData;
  size: SizePreset;
  update: (patch: Partial<LabelData>) => void;
  onCover: (dataUrl: string | null) => void;
}

function readImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Editable front-label preview: drop/click the cover on it, and type a
 * multiline title + optional artist in place. The hidden SVG twin exports.
 */
export default function FrontPreview({ data, size, update, onCover }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
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

  async function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    onCover(await readImageFile(file));
  }

  return (
    <div
      className="relative select-none"
      style={{ width: W, height: H, background: data.bgColor, clipPath: CLIP }}
    >
      <div
        className="absolute top-0 left-0 cursor-pointer overflow-hidden"
        style={{ width: cover, height: cover, outline: dragOver ? '2px dashed #fff' : 'none', outlineOffset: -2 }}
        onClick={() => fileInput.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void handleFiles(e.dataTransfer.files);
        }}
      >
        {data.coverDataUrl ? (
          <img src={data.coverDataUrl} alt="" className="size-full object-cover" />
        ) : (
          <div
            className="relative flex size-full items-center justify-center opacity-65 transition-opacity hover:opacity-100"
            style={{ background: '#3f3d39', color: '#cfc9bd' }}
          >
            {/* Dashed crossing diagonals to signal an empty image slot */}
            <svg
              className="absolute inset-0 size-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden
            >
              <line
                x1="0"
                y1="0"
                x2="100"
                y2="100"
                stroke="#8a857c"
                strokeWidth="0.6"
                strokeDasharray="3 2"
              />
              <line
                x1="100"
                y1="0"
                x2="0"
                y2="100"
                stroke="#8a857c"
                strokeWidth="0.6"
                strokeDasharray="3 2"
              />
            </svg>
            <span className="relative tracking-wide" style={{ fontSize: 3 * S }}>
              {pageDragging ? 'DROP' : 'COVER'}
            </span>
          </div>
        )}
      </div>

      {data.coverDataUrl && (
        <button
          type="button"
          onClick={() => onCover(null)}
          className="absolute top-1 grid size-5 place-items-center rounded-sm bg-black/55 text-white"
          aria-label="Remove cover"
          style={{ left: CH }}
        >
          <X size={12} />
        </button>
      )}

      {/* Text area — below the cover (portrait) or to its right (landscape) */}
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
            fontFamily: data.artistFont,
            fontSize: data.yearSize * S,
            color: data.textColor,
            opacity: data.artistOpacity,
          }}
          value={data.year}
          placeholder="Year"
          onChange={(e) => update({ year: e.target.value })}
        />
      )}

      {/* Border tracing the chamfered outline (clipped to half-width = uniform edge) */}
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

      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => void handleFiles(e.target.files)}
      />
    </div>
  );
}

/** A transparent, auto-growing textarea that blends into the label. */
function AutoTextarea({
  value,
  placeholder,
  onChange,
  onFocus,
  style,
}: {
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
  onFocus?: () => void;
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
      onFocus={onFocus}
    />
  );
}
