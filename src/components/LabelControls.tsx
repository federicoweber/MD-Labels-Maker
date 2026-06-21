import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import SizeSlider from './SizeSlider';
import ColorPicker from './ColorPicker';
import FontPicker from './FontPicker';

export interface TypoField {
  key: string;
  title: string;
  /** Section show/hide toggle (e.g. artist, year). */
  showSwitch?: { checked: boolean; onChange: (v: boolean) => void };
  /** Automatic: derive font + size from the album. */
  autoSwitch?: { checked: boolean; onChange: (v: boolean) => void };
  font?: { value: string; onChange: (family: string) => void };
  size?: { id: string; value: number; min: number; max: number; onChange: (v: number) => void };
  opacity?: { id: string; value: number; onChange: (v: number) => void };
}

interface Props {
  fields: TypoField[];
  families: string[];
  fontsLoading: boolean;
  palette: string[];
  bgColor: string;
  onBgColor: (hex: string) => void;
  textColor: string;
  onTextColor: (hex: string) => void;
  letterSpacing: number;
  onLetterSpacing: (v: number) => void;
  lineHeight: number;
  onLineHeight: (v: number) => void;
}

const GRAYS = ['#000000', '#3f3f3f', '#808080', '#bfbfbf', '#ffffff'];
const Rule = () => <div className="h-px w-full bg-border" />;
const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <span className="text-sm font-bold tracking-wide uppercase">{children}</span>
);

/** Contextual Background / Text / Typography controls shown under a label. */
export default function LabelControls({
  fields,
  families,
  fontsLoading,
  palette,
  bgColor,
  onBgColor,
  textColor,
  onTextColor,
  letterSpacing,
  onLetterSpacing,
  lineHeight,
  onLineHeight,
}: Props) {
  const swatches = [...GRAYS, ...palette];
  const opacityFields = fields.filter((f) => f.opacity);
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
          <ColorPicker value={bgColor} onChange={onBgColor} colors={swatches} />
        </TabsContent>

        <TabsContent value="text" className="space-y-3 pt-3">
          <ColorPicker value={textColor} onChange={onTextColor} colors={swatches} />
          {opacityFields.length > 0 && <Rule />}
          {opacityFields.map((f) => (
            <SizeSlider
              key={f.key}
              id={f.opacity!.id}
              label={`${f.title} opacity`}
              value={f.opacity!.value}
              min={0}
              max={1}
              step={0.05}
              format={(v) => `${Math.round(v * 100)}%`}
              onChange={f.opacity!.onChange}
            />
          ))}
        </TabsContent>

        <TabsContent value="type" className="space-y-3 pt-3">
          {fields.map((f, i) => {
            const collapsed = f.showSwitch && !f.showSwitch.checked;
            return (
              <div key={f.key} className="space-y-2.5">
                {i > 0 && <Rule />}
                <div className="flex items-center justify-between">
                  <SectionTitle>{f.title}</SectionTitle>
                  {f.showSwitch && (
                    <Switch checked={f.showSwitch.checked} onCheckedChange={f.showSwitch.onChange} />
                  )}
                </div>
                {!collapsed && (
                  <>
                    {f.autoSwitch && (
                      <div className="flex items-center justify-between">
                        <Label htmlFor={`${f.key}-auto`}>Automatic</Label>
                        <Switch
                          id={`${f.key}-auto`}
                          checked={f.autoSwitch.checked}
                          onCheckedChange={f.autoSwitch.onChange}
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
                    {f.size && (
                      <SizeSlider
                        id={f.size.id}
                        label="Size"
                        value={f.size.value}
                        min={f.size.min}
                        max={f.size.max}
                        onChange={f.size.onChange}
                      />
                    )}
                  </>
                )}
              </div>
            );
          })}

          <Rule />
          <SizeSlider
            id="tracking"
            label="Tracking"
            value={letterSpacing}
            min={0}
            max={0.4}
            step={0.01}
            format={(v) => `${v.toFixed(2)}em`}
            onChange={onLetterSpacing}
          />
          <SizeSlider
            id="linespace"
            label="Line space"
            value={lineHeight}
            min={1}
            max={2}
            step={0.05}
            format={(v) => v.toFixed(2)}
            onChange={onLineHeight}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
