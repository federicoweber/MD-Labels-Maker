import { useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X } from 'lucide-react';
import type { LabelData } from '@/lib/types';
import type { SizePreset } from '@/lib/dimensions';
import { effFor, tlEffFor, expandDiscs } from '@/lib/derive';
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
const MARGIN = 5; // mm — small printable margin (keeps 6 fronts on one row)
const GAP = 0; // labels sit flush; one cut serves both neighbours

interface Item {
  key: string;
  w: number;
  h: number;
  node: ReactNode;
}

interface Row {
  items: Item[];
  h: number;
}

/**
 * Lay labels into rows where every label in a row has the same height, so each
 * row can be cut with a single straight horizontal cut. Tallest rows first.
 */
function buildRows(items: Item[], contentW: number): Row[] {
  const groups = new Map<number, Item[]>();
  for (const it of items) {
    const key = Math.round(it.h * 10) / 10;
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(it);
  }
  const rows: Row[] = [];
  for (const h of [...groups.keys()].sort((a, b) => b - a)) {
    let row: Item[] = [];
    let w = 0;
    for (const it of groups.get(h)!) {
      if (row.length && w + it.w > contentW + 0.01) {
        rows.push({ items: row, h });
        row = [];
        w = 0;
      }
      row.push(it);
      w += it.w + GAP;
    }
    if (row.length) rows.push({ items: row, h });
  }
  return rows;
}

/** Pack whole rows onto pages without splitting a row across a page. */
function paginate(rows: Row[], contentH: number): Row[][] {
  const pages: Row[][] = [];
  let page: Row[] = [];
  let y = 0;
  for (const row of rows) {
    if (page.length && y + row.h > contentH + 0.01) {
      pages.push(page);
      page = [];
      y = 0;
    }
    page.push(row);
    y += row.h + GAP;
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
  expandDiscs(discs).forEach((disc, i) => {
    const e = effFor(disc);
    const te = tlEffFor(disc);
    items.push({ key: `${i}-front`, w: frontSize.width, h: frontSize.height, node: <FrontLabel {...e} size={frontSize} /> });
    items.push({ key: `${i}-spine`, w: spineSize.width, h: spineSize.height, node: <SpineLabel {...e} size={spineSize} /> });
    if (disc.showTracklist) {
      items.push({ key: `${i}-case`, w: caseSpineSize.width, h: caseSpineSize.height, node: <SpineLabel {...te} size={caseSpineSize} /> });
      items.push({ key: `${i}-tl`, w: tracklistSize.width, h: tracklistSize.height, node: <TracklistSheet {...te} size={tracklistSize} /> });
    }
  });
  const rows = buildRows(items, pw - 2 * MARGIN);
  const pages = paginate(rows, ph - 2 * MARGIN);

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

      <div className="print-pages flex flex-col items-center gap-6 p-6">
        {pages.map((pg, pi) => (
          <div
            key={pi}
            className="print-page bg-white"
            style={{ width: `${pw}mm`, height: `${ph}mm`, padding: `${MARGIN}mm` }}
          >
            <div className="flex flex-col items-start">
              {pg.map((row, ri) => (
                <div key={ri} className="flex items-start" style={{ marginTop: ri ? '-1px' : 0 }}>
                  {row.items.map((it, ci) => (
                    <div
                      key={it.key}
                      className="print-cell"
                      style={{
                        width: `${it.w}mm`,
                        height: `${it.h}mm`,
                        boxSizing: 'content-box',
                        border: '1px solid #cfcfcf',
                        marginLeft: ci ? '-1px' : 0,
                      }}
                    >
                      {it.node}
                    </div>
                  ))}
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
