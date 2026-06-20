import { useLayoutEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { LabelData } from '@/lib/types';
import { FRONT, PREVIEW_PX_PER_MM as S, frontCoverSize, type SizePreset } from '@/lib/dimensions';

interface Props {
  data: LabelData;
  size: SizePreset;
  update: (patch: Partial<LabelData>) => void;
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
export default function FrontPreview({ data, size, update }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

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
    update({ coverDataUrl: await readImageFile(file) });
  }

  return (
    <div
      className="relative select-none"
      style={{
        width: W,
        height: H,
        background: data.bgColor,
        clipPath: CLIP,
        boxShadow: 'inset 0 0 0 1.5px #000',
      }}
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
            className="relative flex size-full items-center justify-center"
            style={{ background: '#3f3d39' }}
          >
            {/* Crossing diagonals to signal an empty image slot */}
            <svg
              className="absolute inset-0 size-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden
            >
              <line x1="0" y1="0" x2="100" y2="100" stroke="#5b5852" strokeWidth="0.5" />
              <line x1="100" y1="0" x2="0" y2="100" stroke="#5b5852" strokeWidth="0.5" />
            </svg>
            <div
              className="relative border border-dashed px-2 py-1 text-center leading-tight"
              style={{ borderColor: '#9b958a', color: '#cfc9bd', fontSize: 2.6 * S }}
            >
              DROP<br />CLICK
            </div>
          </div>
        )}
      </div>

      {data.coverDataUrl && (
        <button
          type="button"
          onClick={() => update({ coverDataUrl: null })}
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
            fontFamily: data.fontFamily,
            fontSize: data.titleSize * S,
            fontWeight: 700,
            color: data.textColor,
            lineHeight: 1.15,
          }}
        />
        {data.showArtist && (
          <input
            className="label-field w-full bg-transparent p-0 outline-none"
            style={{
              fontFamily: data.fontFamily,
              fontSize: data.artistSize * S,
              color: data.textColor,
              lineHeight: 1.1,
            }}
            value={data.artist}
            placeholder="Artist"
            onChange={(e) => update({ artist: e.target.value })}
          />
        )}
      </div>

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
