import { Label } from '@/components/ui/label';

interface SizeSliderProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
}

/** Labelled numeric slider with a formatted value readout. */
export default function SizeSlider({
  id,
  label,
  value,
  min,
  max,
  step = 0.1,
  format = (v) => `${v.toFixed(1)}mm`,
  onChange,
}: SizeSliderProps) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>{label}</Label>
        <span className="text-xs text-muted-foreground">{format(value)}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
        className="w-full accent-foreground"
      />
    </div>
  );
}
