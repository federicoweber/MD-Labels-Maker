import { ChevronDown } from 'lucide-react';
import type { SizePreset } from '@/lib/dimensions';

interface Props {
  label: string;
  value: SizePreset;
  presets: SizePreset[];
  onChange: (size: SizePreset) => void;
}

const fmt = (s: SizePreset) => `${s.width} × ${s.height} mm`;

/** Heading-styled size picker shown on each label. */
export default function SizeSelect({ label, value, presets, onChange }: Props) {
  const index = presets.findIndex((p) => p.width === value.width && p.height === value.height);
  return (
    <div className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
      <span>{label}</span>
      <span aria-hidden>·</span>
      <div className="relative inline-flex items-center">
        <select
          value={index < 0 ? 0 : index}
          onChange={(e) => onChange(presets[+e.target.value])}
          className="cursor-pointer appearance-none bg-transparent pr-4 uppercase outline-none hover:text-foreground focus-visible:text-foreground"
        >
          {presets.map((p, i) => (
            <option key={i} value={i} className="text-foreground">
              {fmt(p)}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-0 size-3" />
      </div>
    </div>
  );
}
