import { useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { LabelData } from '@/lib/types';
import { FRONT, PREVIEW_PX_PER_MM as S } from '@/lib/dimensions';

const W = FRONT.width * S;
const H = FRONT.height * S;
const COVER = FRONT.coverSize * S;
const PAD = FRONT.padding * S;
const CH = FRONT.chamfer * S;
const CLIP = `polygon(${CH}px 0, 100% 0, 100% 100%, 0 100%, 0 ${CH}px)`;

interface Props {
  data: LabelData;
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
 * Editable front-label preview (34×52mm scaled): drop/click the cover directly
 * on it, and type the title / artist in place. The hidden SVG twin is what
 * actually exports.
 */
export default function FrontPreview({ data, update }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  async function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    update({ coverDataUrl: await readImageFile(file) });
  }

  return (
    <div
      className="relative shadow-xl select-none"
      style={{ width: W, height: H, background: data.bgColor, clipPath: CLIP }}
    >
      {/* Cover area — drop target + click to browse */}
      <div
        className="absolute top-0 left-0 cursor-pointer overflow-hidden"
        style={{ width: W, height: COVER, outline: dragOver ? '2px dashed #fff' : 'none', outlineOffset: -2 }}
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
            className="flex size-full items-center justify-center text-center"
            style={{ background: '#d8d8d8', color: '#8a8a8a', fontSize: 2.4 * S }}
          >
            drop / click cover
          </div>
        )}
      </div>

      {data.coverDataUrl && (
        <button
          type="button"
          onClick={() => update({ coverDataUrl: null })}
          className="absolute right-1 top-1 grid size-5 place-items-center rounded-sm bg-black/55 text-white"
          aria-label="Remove cover"
          style={{ left: CH }}
        >
          <X size={12} />
        </button>
      )}

      {/* Text band — inline editable */}
      <div
        className="absolute left-0 flex flex-col justify-start"
        style={{ top: COVER, width: W, height: H - COVER, padding: PAD, gap: 1 * S }}
      >
        <input
          className="label-field w-full bg-transparent p-0 outline-none"
          style={{
            fontFamily: data.fontFamily,
            fontSize: FRONT.titleSize * S,
            fontWeight: 700,
            color: data.textColor,
            lineHeight: 1.05,
          }}
          value={data.album}
          placeholder="Album"
          onChange={(e) => update({ album: e.target.value })}
        />
        <input
          className="label-field w-full bg-transparent p-0 outline-none"
          style={{
            fontFamily: data.fontFamily,
            fontSize: FRONT.artistSize * S,
            color: data.textColor,
            lineHeight: 1.1,
          }}
          value={data.artist}
          placeholder="Artist"
          onChange={(e) => update({ artist: e.target.value })}
        />
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
