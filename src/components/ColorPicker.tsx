import { Pipette } from 'lucide-react';
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
            className={`notch-tr flex h-6 items-center px-2 text-[9px] transition-[width] duration-150 ${
              selected ? 'w-full' : 'w-[86%] hover:w-[95%]'
            }`}
            style={{ background: hex, color: bestTextColor(hex) }}
          >
            <span className="mr-1 w-2.5">{selected ? '▶' : ''}</span>
            {rgbLabel(hex)}
          </button>
        );
      })}

      {/* Freeform colour: a swatch with a picker icon that opens the OS picker. */}
      <label className="mt-1 flex cursor-pointer items-center gap-2">
        <span
          className="notch-tr relative inline-flex size-6 items-center justify-center"
          style={{ background: value, color: bestTextColor(value) }}
        >
          <Pipette className="size-3" />
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label="Custom colour"
          />
        </span>
        <span className="text-[9px] text-muted-foreground">{rgbLabel(value)}</span>
      </label>
    </div>
  );
}
