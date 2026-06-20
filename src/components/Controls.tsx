import { Download } from 'lucide-react';
import type { LabelData } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import FontPicker from './FontPicker';
import MdLogo from './MdLogo';

export type ExportTarget = 'front' | 'spine' | 'tracklist';

interface ControlsProps {
  data: LabelData;
  update: (patch: Partial<LabelData>) => void;
  onFontSelect: (family: string) => void;
  families: string[];
  fontsLoading: boolean;
  usingFallback: boolean;
  fontError: string | null;
  showTracklist: boolean;
  onToggleTracklist: (on: boolean) => void;
  onExport: (which: ExportTarget) => void;
  exporting: ExportTarget | null;
}

export default function Controls({
  data,
  update,
  onFontSelect,
  families,
  fontsLoading,
  usingFallback,
  fontError,
  showTracklist,
  onToggleTracklist,
  onExport,
  exporting,
}: ControlsProps) {
  return (
    <aside className="flex w-[300px] shrink-0 flex-col gap-5 overflow-y-auto border-r bg-card p-5">
      <header>
        <h1 className="text-3xl leading-[0.95] font-bold uppercase">MiniDisc Label Maker</h1>
      </header>

      <p className="text-xs text-muted-foreground">
        Drop a cover and type the title, artist, and tracks directly on the labels. Click a text
        field to size and colour it.
      </p>

      <Separator />

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
        <Label htmlFor="show-artist">Show artist</Label>
        <Switch
          id="show-artist"
          checked={data.showArtist}
          onCheckedChange={(v) => update({ showArtist: v })}
        />
      </div>

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

      <MdLogo className="mt-auto pt-2" />
    </aside>
  );
}
