import { Download } from 'lucide-react';
import type { LabelData } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import MdLogo from './MdLogo';

interface ControlsProps {
  data: LabelData;
  update: (patch: Partial<LabelData>) => void;
  showTracklist: boolean;
  onToggleTracklist: (on: boolean) => void;
  onExport: () => void;
  exporting: boolean;
}

export default function Controls({
  data,
  update,
  showTracklist,
  onToggleTracklist,
  onExport,
  exporting,
}: ControlsProps) {
  return (
    <aside className="flex w-[300px] shrink-0 flex-col gap-6 overflow-y-auto bg-background p-5">
      <header>
        <h1 className="text-5xl leading-[0.82] font-bold uppercase">MiniDisc Label Maker</h1>
      </header>

      <p className="text-xs text-muted-foreground">
        Drop a cover and type the title, artist, and tracks directly on the labels. Click a text
        field to size, colour and font it.
      </p>

      <div className="flex items-center justify-between">
        <Label htmlFor="show-artist">Show artist</Label>
        <Switch
          id="show-artist"
          checked={data.showArtist}
          onCheckedChange={(v) => update({ showArtist: v })}
        />
      </div>

      {data.showArtist && (
        <div className="flex items-center justify-between">
          <Label htmlFor="link-fonts">Same title/artist font</Label>
          <Switch
            id="link-fonts"
            checked={data.linkFonts}
            onCheckedChange={(v) =>
              update(v ? { linkFonts: true, artistFont: data.titleFont } : { linkFonts: false })
            }
          />
        </div>
      )}

      <div className="flex items-center justify-between">
        <Label htmlFor="tracklist-toggle">Tracklist sheet</Label>
        <Switch id="tracklist-toggle" checked={showTracklist} onCheckedChange={onToggleTracklist} />
      </div>

      <Button onClick={onExport} disabled={exporting}>
        <Download /> {exporting ? 'Exporting…' : 'Download labels (.zip)'}
      </Button>

      <MdLogo className="mt-auto pt-2" />
    </aside>
  );
}
