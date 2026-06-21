import { Download, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { LabelData } from '@/lib/types';

interface ControlsProps {
  discs: LabelData[];
  activeIndex: number;
  onSelect: (i: number) => void;
  onAdd: () => void;
  onRequestDelete: (i: number) => void;
  onExport: () => void;
  exporting: boolean;
}

const labelOf = (d: LabelData) =>
  `${d.album || 'Untitled'}${d.artist ? ` — ${d.artist}` : ''}`;

export default function Controls({
  discs,
  activeIndex,
  onSelect,
  onAdd,
  onRequestDelete,
  onExport,
  exporting,
}: ControlsProps) {
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

      <div className="flex flex-col gap-1.5">
        <Button variant="outline" className="w-full justify-center" onClick={onAdd}>
          <Plus /> New label
        </Button>
        {discs.map((d, i) => (
          <div key={i} className="flex items-stretch gap-1">
            <button
              type="button"
              onClick={() => onSelect(i)}
              className={`notch-tr flex-1 truncate px-2.5 py-1.5 text-left text-xs font-medium tracking-wide uppercase transition-colors ${
                i === activeIndex
                  ? 'bg-[#b9b3a9] text-[#1a1813]'
                  : 'bg-[#b9b3a9]/30 text-foreground/70 hover:bg-[#b9b3a9]/50'
              }`}
              title={labelOf(d)}
            >
              {labelOf(d)}
            </button>
            <button
              type="button"
              onClick={() => onRequestDelete(i)}
              aria-label="Delete label"
              className="grid w-7 shrink-0 place-items-center bg-[#b9b3a9]/30 text-foreground/60 transition-colors hover:bg-destructive hover:text-white"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}
      </div>

      <Button onClick={onExport} disabled={exporting}>
        <Download /> {exporting ? 'Exporting…' : 'Download labels (.zip)'}
      </Button>
    </aside>
  );
}
