import { Label } from '@/components/ui/label';

interface SizeSliderProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}

/** Labelled mm size slider. */
export default function SizeSlider({ id, label, value, min, max, onChange }: SizeSliderProps) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>{label}</Label>
        <span className="text-xs text-muted-foreground">{value.toFixed(1)}mm</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={0.1}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
        className="w-full accent-foreground"
      />
    </div>
  );
}
