import { useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X } from 'lucide-react';
import type { LabelData } from '@/lib/types';
import type { SizePreset } from '@/lib/dimensions';
import { effFor, tlEffFor } from '@/lib/derive';
import { Button } from '@/components/ui/button';
import FrontLabel from './FrontLabel';
import SpineLabel from './SpineLabel';
import TracklistSheet from './TracklistSheet';

interface Props {
  discs: LabelData[];
  frontSize: SizePreset;
  spineSize: SizePreset;
  caseSpineSize: SizePreset;
  tracklistSize: SizePreset;
  onClose: () => void;
}

/** Paper sizes in mm (portrait). */
const PAPERS: Record<string, [number, number]> = {
  'US Letter': [215.9, 279.4],
  A4: [210, 297],
  Legal: [215.9, 355.6],
  A3: [297, 420],
};
const MARGIN = 10; // mm
const GAP = 5; // mm — room to cut between labels

interface Item {
  key: string;
  w: number;
  h: number;
  node: ReactNode;
}

/** Greedy shelf-pack items (in order) into pages of the given content box. */
function packPages(items: Item[], contentW: number, contentH: number): Item[][] {
  const pages: Item[][] = [];
  let page: Item[] = [];
  let x = 0;
  let y = 0;
  let rowH = 0;
  for (const it of items) {
    if (x > 0 && x + it.w > contentW + 0.01) {
      x = 0;
      y += rowH + GAP;
      rowH = 0;
    }
    if (page.length && y + it.h > contentH + 0.01) {
      pages.push(page);
      page = [];
      x = 0;
      y = 0;
      rowH = 0;
    }
    page.push(it);
    x += it.w + GAP;
    rowH = Math.max(rowH, it.h);
  }
  if (page.length) pages.push(page);
  return pages;
}

export default function PrintView({
  discs,
  frontSize,
  spineSize,
  caseSpineSize,
  tracklistSize,
  onClose,
}: Props) {
  const [paper, setPaper] = useState('US Letter');
  const [pw, ph] = PAPERS[paper];

  const items: Item[] = [];
  discs.forEach((disc, i) => {
    const e = effFor(disc);
    const te = tlEffFor(disc);
    items.push({ key: `${i}-front`, w: frontSize.width, h: frontSize.height, node: <FrontLabel {...e} size={frontSize} /> });
    items.push({ key: `${i}-spine`, w: spineSize.width, h: spineSize.height, node: <SpineLabel {...e} size={spineSize} /> });
    if (disc.showTracklist) {
      items.push({ key: `${i}-case`, w: caseSpineSize.width, h: caseSpineSize.height, node: <SpineLabel {...te} size={caseSpineSize} /> });
      items.push({ key: `${i}-tl`, w: tracklistSize.width, h: tracklistSize.height, node: <TracklistSheet {...te} size={tracklistSize} /> });
    }
  });
  // Tallest first packs more tightly.
  const sorted = [...items].sort((a, b) => b.h - a.h);
  const pages = packPages(sorted, pw - 2 * MARGIN, ph - 2 * MARGIN);

  return createPortal(
    <div className="print-root fixed inset-0 z-50 overflow-auto bg-neutral-500">
      <style>{`@page { size: ${pw}mm ${ph}mm; margin: 0; }`}</style>

      <div className="print-no sticky top-0 z-10 flex items-center gap-3 border-b border-black/20 bg-background px-4 py-2.5">
        <span className="text-sm font-bold tracking-wide uppercase">Print</span>
        <label className="flex items-center gap-1.5 text-xs uppercase">
          Paper
          <select
            value={paper}
            onChange={(e) => setPaper(e.target.value)}
            className="cursor-pointer bg-transparent uppercase outline-none hover:text-foreground"
          >
            {Object.keys(PAPERS).map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <span className="text-xs text-muted-foreground">
          {pages.length} page{pages.length === 1 ? '' : 's'}
        </span>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" onClick={onClose}>
            <X /> Close
          </Button>
          <Button onClick={() => window.print()}>
            <Printer /> Print
          </Button>
        </div>
      </div>

      <div className="flex flex-col items-center gap-6 p-6">
        {pages.map((pg, pi) => (
          <div
            key={pi}
            className="print-page bg-white"
            style={{ width: `${pw}mm`, height: `${ph}mm`, padding: `${MARGIN}mm` }}
          >
            <div className="flex flex-wrap content-start items-start" style={{ gap: `${GAP}mm` }}>
              {pg.map((it) => (
                <div
                  key={it.key}
                  className="print-cell"
                  style={{ width: `${it.w}mm`, height: `${it.h}mm`, border: '1px solid #cfcfcf' }}
                >
                  {it.node}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>,
    document.body,
  );
}
