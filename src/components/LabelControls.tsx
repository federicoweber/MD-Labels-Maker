import type { LabelData } from '@/lib/types';
import { Label } from '@/components/ui/label';
import SizeSlider from './SizeSlider';
import ColorControl from './ColorControl';

interface Props {
  sizeId: string;
  sizeLabel: string;
  sizeValue: number;
  sizeMin: number;
  sizeMax: number;
  onSize: (v: number) => void;
  data: LabelData;
  update: (patch: Partial<LabelData>) => void;
  palette: string[];
}

/** Contextual size + colour controls shown under a label while editing it. */
export default function LabelControls({
  sizeId,
  sizeLabel,
  sizeValue,
  sizeMin,
  sizeMax,
  onSize,
  data,
  update,
  palette,
}: Props) {
  return (
    <div className="notch-tr flex w-56 flex-col gap-3 border bg-card p-3">
      <SizeSlider
        id={sizeId}
        label={sizeLabel}
        value={sizeValue}
        min={sizeMin}
        max={sizeMax}
        onChange={onSize}
      />
      <div className="grid gap-1">
        <Label>Background</Label>
        <ColorControl
          kind="bg"
          value={data.bgColor}
          onChange={(h) => update({ bgColor: h })}
          coverDataUrl={data.coverDataUrl}
          palette={palette}
        />
      </div>
      <div className="grid gap-1">
        <Label>Text</Label>
        <ColorControl
          kind="text"
          value={data.textColor}
          onChange={(h) => update({ textColor: h })}
          coverDataUrl={data.coverDataUrl}
          palette={palette}
        />
      </div>
    </div>
  );
}
