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
        Type the album and artist on the label — the cover, year and tracklist are fetched
        automatically. Use “Fetch cover” and the ◀ ▶ arrows to choose among the matches, or drop
        your own image. Click any text to restyle it.
      </p>

      <Button onClick={onExport} disabled={exporting}>
        <Download /> {exporting ? 'Exporting…' : 'Download labels (.zip)'}
      </Button>
    </aside>
  );
}
