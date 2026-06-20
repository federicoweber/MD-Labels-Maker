import { bestTextColor, hexToRgb } from '@/lib/colors';

interface ColorPickerProps {
  value: string;
  onChange: (hex: string) => void;
  /** Swatch colours shown as WipEout team-select style bars. */
  colors: string[];
  emptyHint?: string;
}

const rgbLabel = (hex: string) => {
  const { r, g, b } = hexToRgb(hex);
  return `${r}R ${g}G ${b}B`;
};

/** Inline colour picker: team-select swatch bars + a freeform colour input. */
export default function ColorPicker({ value, onChange, colors, emptyHint }: ColorPickerProps) {
  return (
    <div className="flex flex-col gap-1">
      {colors.length === 0 && emptyHint && (
        <p className="text-xs text-muted-foreground">{emptyHint}</p>
      )}
      {colors.map((hex) => {
        const selected = value.toLowerCase() === hex.toLowerCase();
        return (
          <button
            key={hex}
            type="button"
            onClick={() => onChange(hex)}
            className="flex h-6 items-center px-2 text-[9px] transition-transform hover:translate-x-0.5"
            style={{ background: hex, color: bestTextColor(hex) }}
          >
            <span className="mr-1 w-2.5">{selected ? '▶' : ''}</span>
            {rgbLabel(hex)}
          </button>
        );
      })}
      <div className="mt-1 flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="size-6 cursor-pointer rounded-sm border border-input bg-transparent p-0.5"
          aria-label="Custom colour"
        />
        <span className="font-mono text-[9px] text-muted-foreground">{rgbLabel(value)}</span>
      </div>
    </div>
  );
}
