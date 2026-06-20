import { Download, Moon, Sun } from 'lucide-react';
import type { LabelData } from '@/lib/types';
import { hexToRgb, rgbToHex } from '@/lib/colors';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import ColorControl from './ColorControl';
import FontPicker from './FontPicker';

export type ExportTarget = 'front' | 'spine' | 'tracklist';

interface ControlsProps {
  data: LabelData;
  update: (patch: Partial<LabelData>) => void;
  onFontSelect: (family: string) => void;
  families: string[];
  fontsLoading: boolean;
  usingFallback: boolean;
  fontError: string | null;
  palette: string[];
  showTracklist: boolean;
  onToggleTracklist: (on: boolean) => void;
  onExport: (which: ExportTarget) => void;
  exporting: ExportTarget | null;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export default function Controls({
  data,
  update,
  onFontSelect,
  families,
  fontsLoading,
  usingFallback,
  fontError,
  palette,
  showTracklist,
  onToggleTracklist,
  onExport,
  exporting,
  theme,
  onToggleTheme,
}: ControlsProps) {
  const textLevel = hexToRgb(data.textColor).r;

  return (
    <aside className="flex w-[300px] shrink-0 flex-col gap-5 overflow-y-auto border-r bg-card p-5">
      <header className="flex items-center justify-between">
        <h1 className="text-base font-semibold tracking-tight">MiniDisc Label Maker</h1>
        <Button variant="ghost" size="icon" onClick={onToggleTheme} aria-label="Toggle theme">
          {theme === 'dark' ? <Sun /> : <Moon />}
        </Button>
      </header>

      <p className="text-xs text-muted-foreground">
        Drop a cover and type the title, artist, and tracks directly on the labels.
      </p>

      <Separator />

      <div className="grid gap-2">
        <Label>Background</Label>
        <ColorControl
          value={data.bgColor}
          onChange={(hex) => update({ bgColor: hex })}
          coverDataUrl={data.coverDataUrl}
          palette={palette}
        />
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="text-shade">Text shade</Label>
          <span className="text-xs text-muted-foreground">
            {textLevel === 0 ? 'Black' : textLevel === 255 ? 'White' : `Gray ${textLevel}`}
          </span>
        </div>
        <input
          id="text-shade"
          type="range"
          min={0}
          max={255}
          value={textLevel}
          onChange={(e) =>
            update({ textColor: rgbToHex({ r: +e.target.value, g: +e.target.value, b: +e.target.value }) })
          }
          className="w-full accent-foreground"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <SizeSlider
          id="title-size"
          label="Title size"
          value={data.titleSize}
          min={2}
          max={10}
          onChange={(v) => update({ titleSize: v })}
        />
        <SizeSlider
          id="artist-size"
          label="Artist size"
          value={data.artistSize}
          min={1.5}
          max={7}
          onChange={(v) => update({ artistSize: v })}
        />
      </div>

      <div className="grid gap-2">
        <Label>Font</Label>
        <FontPicker
          value={data.fontFamily}
          families={families}
          onChange={onFontSelect}
          loading={fontsLoading}
        />
        {usingFallback && (
          <p className="text-xs text-muted-foreground">
            Curated list — add a Google Fonts API key for all fonts.
          </p>
        )}
        {fontError && <p className="text-xs text-destructive">{fontError}</p>}
      </div>

      <Separator />

      <div className="flex items-center justify-between">
        <Label htmlFor="tracklist-toggle">Tracklist sheet</Label>
        <Switch id="tracklist-toggle" checked={showTracklist} onCheckedChange={onToggleTracklist} />
      </div>

      <Separator />

      <div className="grid gap-2">
        <Button onClick={() => onExport('front')} disabled={exporting !== null}>
          <Download /> {exporting === 'front' ? 'Exporting…' : 'Front PNG'}
        </Button>
        <Button variant="outline" onClick={() => onExport('spine')} disabled={exporting !== null}>
          <Download /> {exporting === 'spine' ? 'Exporting…' : 'Spine PNG'}
        </Button>
        {showTracklist && (
          <Button
            variant="outline"
            onClick={() => onExport('tracklist')}
            disabled={exporting !== null}
          >
            <Download /> {exporting === 'tracklist' ? 'Exporting…' : 'Tracklist PNG'}
          </Button>
        )}
      </div>
    </aside>
  );
}

function SizeSlider({
  id,
  label,
  value,
  min,
  max,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
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
