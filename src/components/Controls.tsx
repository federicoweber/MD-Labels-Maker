import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ControlsProps {
  onExport: () => void;
  exporting: boolean;
}

export default function Controls({ onExport, exporting }: ControlsProps) {
  return (
    <aside className="flex w-[300px] shrink-0 flex-col gap-6 overflow-y-auto bg-background p-5">
      <header>
        <h1 className="text-5xl leading-[1.05] font-bold uppercase">MiniDisc Labels Factory</h1>
      </header>

      <p className="text-xs text-muted-foreground">
        Drop an album cover onto a label, then type the title, subtitle and tracks straight onto it.
        Click any text to change its font, size, colour and opacity.
      </p>

      <Button onClick={onExport} disabled={exporting}>
        <Download /> {exporting ? 'Exporting…' : 'Download labels (.zip)'}
      </Button>
    </aside>
  );
}
