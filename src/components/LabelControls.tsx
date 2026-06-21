import type { LabelData } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import SizeSlider from './SizeSlider';
import ColorPicker from './ColorPicker';
import FontPicker from './FontPicker';

export interface TypoField {
  key: string;
  title: string;
  linkSwitch?: { checked: boolean; onChange: (v: boolean) => void };
  font?: { value: string; onChange: (family: string) => void };
  size: { id: string; value: number; min: number; max: number; onChange: (v: number) => void };
  opacity: { id: string; value: number; onChange: (v: number) => void };
}

interface Props {
  fields: TypoField[];
  families: string[];
  fontsLoading: boolean;
  data: LabelData;
  update: (patch: Partial<LabelData>) => void;
  palette: string[];
}

const GRAYS = ['#000000', '#3f3f3f', '#808080', '#bfbfbf', '#ffffff'];

/** Contextual Background / Text / Typography controls shown under a label. */
export default function LabelControls({ fields, families, fontsLoading, data, update, palette }: Props) {
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
            Typography
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bg" className="pt-3">
          <ColorPicker value={data.bgColor} onChange={(h) => update({ bgColor: h })} colors={swatches} />
        </TabsContent>

        <TabsContent value="text" className="pt-3">
          <ColorPicker value={data.textColor} onChange={(h) => update({ textColor: h })} colors={swatches} />
        </TabsContent>

        <TabsContent value="type" className="space-y-3 pt-3">
          {fields.map((f, i) => (
            <div key={f.key} className="space-y-2.5">
              {i > 0 && <div className="h-px w-full bg-border" />}
              <div className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                {f.title}
              </div>
              {f.linkSwitch && (
                <div className="flex items-center justify-between">
                  <Label htmlFor={`${f.key}-link`}>Same font as title</Label>
                  <Switch
                    id={`${f.key}-link`}
                    checked={f.linkSwitch.checked}
                    onCheckedChange={f.linkSwitch.onChange}
                  />
                </div>
              )}
              {f.font && (
                <div className="grid gap-1.5">
                  <Label>Font</Label>
                  <FontPicker
                    value={f.font.value}
                    families={families}
                    onChange={f.font.onChange}
                    loading={fontsLoading}
                  />
                </div>
              )}
              <SizeSlider
                id={f.size.id}
                label="Size"
                value={f.size.value}
                min={f.size.min}
                max={f.size.max}
                onChange={f.size.onChange}
              />
              <SizeSlider
                id={f.opacity.id}
                label="Opacity"
                value={f.opacity.value}
                min={0}
                max={1}
                step={0.05}
                format={(v) => `${Math.round(v * 100)}%`}
                onChange={f.opacity.onChange}
              />
            </div>
          ))}

          <div className="h-px w-full bg-border" />
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
