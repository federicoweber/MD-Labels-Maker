import type { LabelData } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SizeSlider from './SizeSlider';
import ColorPicker from './ColorPicker';

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

const GRAYS = ['#000000', '#3f3f3f', '#808080', '#bfbfbf', '#ffffff'];

/** Contextual Background / Text / Typography controls shown under a label. */
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
  const swatches = [...GRAYS, ...palette];
  return (
    <div className="w-80">
      <Tabs defaultValue="bg">
        <TabsList className="w-full">
          <TabsTrigger value="bg" className="flex-1">
            Background
          </TabsTrigger>
          <TabsTrigger value="text" className="flex-1">
            Text
          </TabsTrigger>
          <TabsTrigger value="type" className="flex-1">
            Type
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bg" className="pt-3">
          <ColorPicker
            value={data.bgColor}
            onChange={(h) => update({ bgColor: h })}
            colors={swatches}
          />
        </TabsContent>

        <TabsContent value="text" className="pt-3">
          <ColorPicker
            value={data.textColor}
            onChange={(h) => update({ textColor: h })}
            colors={swatches}
          />
        </TabsContent>

        <TabsContent value="type" className="space-y-3 pt-3">
          <SizeSlider
            id={sizeId}
            label={sizeLabel}
            value={sizeValue}
            min={sizeMin}
            max={sizeMax}
            onChange={onSize}
          />
          <SizeSlider
            id="tracking"
            label="Tracking"
            value={data.letterSpacing}
            min={0}
            max={0.4}
            step={0.01}
            format={(v) => `${v.toFixed(2)}em`}
            onChange={(v) => update({ letterSpacing: v })}
          />
          <SizeSlider
            id="linespace"
            label="Line space"
            value={data.lineHeight}
            min={1}
            max={2}
            step={0.05}
            format={(v) => v.toFixed(2)}
            onChange={(v) => update({ lineHeight: v })}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
