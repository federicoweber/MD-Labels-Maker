import { ChevronDown } from 'lucide-react';
import type { SizePreset } from '@/lib/dimensions';

interface Props {
  label: string;
  value: SizePreset;
  presets: SizePreset[];
  onChange: (size: SizePreset) => void;
}

const fmt = (s: SizePreset) => `${s.width} × ${s.height} mm`;

/** Notched size picker used in each label's main control panel. */
export default function SizeSelect({ label, value, presets, onChange }: Props) {
  const index = presets.findIndex((p) => p.width === value.width && p.height === value.height);
  return (
    <div className="notch-tr-bordered relative inline-flex h-9 w-full items-center">
      <select
        aria-label={label}
        value={index < 0 ? 0 : index}
        onChange={(e) => onChange(presets[+e.target.value])}
        className="h-full w-full cursor-pointer appearance-none bg-transparent pr-9 pl-4 text-sm font-medium uppercase outline-none"
      >
        {presets.map((p, i) => (
          <option key={i} value={i} className="text-foreground">
            {label} · {fmt(p)}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 size-4" />
    </div>
  );
}
