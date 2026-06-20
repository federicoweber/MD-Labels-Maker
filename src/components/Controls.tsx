import { useRef, useState } from 'react';
import type { LabelData } from './FrontLabel';
import FontPicker from './FontPicker';

interface ControlsProps {
  data: LabelData;
  update: (patch: Partial<LabelData>) => void;
  onFontSelect: (family: string) => void;
  families: string[];
  fontsLoading: boolean;
  usingFallback: boolean;
  fontError: string | null;
  onExport: (which: 'front' | 'spine') => void;
  exporting: 'front' | 'spine' | null;
}

function readImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function Controls({
  data,
  update,
  onFontSelect,
  families,
  fontsLoading,
  usingFallback,
  fontError,
  onExport,
  exporting,
}: ControlsProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  async function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    update({ coverDataUrl: await readImageFile(file) });
  }

  return (
    <div className="controls">
      <h1 className="controls__title">MiniDisc Label Maker</h1>

      <div
        className={`dropzone${dragOver ? ' dropzone--over' : ''}`}
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
          <img className="dropzone__preview" src={data.coverDataUrl} alt="Album cover" />
        ) : (
          <span className="dropzone__hint">Drop album cover here, or click to browse</span>
        )}
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => void handleFiles(e.target.files)}
        />
      </div>
      {data.coverDataUrl && (
        <button
          type="button"
          className="link-button"
          onClick={() => update({ coverDataUrl: null })}
        >
          Remove cover
        </button>
      )}

      <label className="field">
        <span className="field__label">Artist</span>
        <input
          type="text"
          value={data.artist}
          placeholder="Artist"
          onChange={(e) => update({ artist: e.target.value })}
        />
      </label>

      <label className="field">
        <span className="field__label">Album title</span>
        <input
          type="text"
          value={data.album}
          placeholder="Album"
          onChange={(e) => update({ album: e.target.value })}
        />
      </label>

      <div className="field-row">
        <ColorField
          label="Text color"
          value={data.textColor}
          onChange={(v) => update({ textColor: v })}
        />
        <ColorField
          label="Background"
          value={data.bgColor}
          onChange={(v) => update({ bgColor: v })}
        />
      </div>

      <label className="field">
        <span className="field__label">
          Font {usingFallback && <em className="field__note">(curated list — add an API key for all fonts)</em>}
        </span>
        <FontPicker
          value={data.fontFamily}
          families={families}
          onChange={onFontSelect}
          loading={fontsLoading}
        />
        {fontError && <span className="field__error">{fontError}</span>}
      </label>

      <div className="export">
        <button
          type="button"
          onClick={() => onExport('front')}
          disabled={exporting !== null}
        >
          {exporting === 'front' ? 'Exporting…' : 'Download front PNG'}
        </button>
        <button
          type="button"
          onClick={() => onExport('spine')}
          disabled={exporting !== null}
        >
          {exporting === 'spine' ? 'Exporting…' : 'Download spine PNG'}
        </button>
      </div>
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="field color-field">
      <span className="field__label">{label}</span>
      <span className="color-field__row">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <input
          type="text"
          className="color-field__hex"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </span>
    </label>
  );
}
