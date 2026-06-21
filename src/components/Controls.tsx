import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import MdLogo from './MdLogo';

interface ControlsProps {
  showTracklist: boolean;
  onToggleTracklist: (on: boolean) => void;
  onExport: () => void;
  exporting: boolean;
}

export default function Controls({
  showTracklist,
  onToggleTracklist,
  onExport,
  exporting,
}: ControlsProps) {
  return (
    <aside className="flex w-[300px] shrink-0 flex-col gap-6 overflow-y-auto bg-background p-5">
      <header>
        <h1 className="text-5xl leading-[1.05] font-bold uppercase">MiniDisc Labels Factory</h1>
      </header>

      <p className="text-xs text-muted-foreground">
        Drop an album cover onto a label, then type the title, subtitle and tracks straight onto it.
        Click any text to change its font, size, colour and opacity.
      </p>

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
