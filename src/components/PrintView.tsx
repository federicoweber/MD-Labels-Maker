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
const MARGIN = 5; // mm — room for the external cutter guides
const GAP = 5; // mm — clear cutting space between every label
const GUIDE_LENGTH = 3; // mm
const GUIDE_OFFSET = 1; // mm away from the packed label grid

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
 * Pack labels into rows where every label in a row has the same height — so a
 * row is a single straight horizontal (guillotine) cut. Within a height, mix
 * widths to fill each row (first-fit-decreasing), so e.g. a 35×50 front packs
 * next to 70×50 tracklists. Tallest rows first.
 */
function buildRows(items: Item[], contentW: number): Row[] {
  const groups = new Map<number, Item[]>();
  for (const it of items) {
    const key = Math.round(it.h * 10) / 10;
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(it);
  }
  const rows: Row[] = [];
  for (const h of [...groups.keys()].sort((a, b) => b - a)) {
    const sorted = [...groups.get(h)!].sort((a, b) => b.w - a.w);
    const bins: { items: Item[]; w: number }[] = [];
    for (const it of sorted) {
      let bin = bins.find((b) => b.w + (b.items.length ? GAP : 0) + it.w <= contentW + 0.01);
      if (!bin) {
        bin = { items: [], w: 0 };
        bins.push(bin);
      }
      bin.items.push(it);
      bin.w += (bin.items.length > 1 ? GAP : 0) + it.w;
    }
    for (const bin of bins) rows.push({ items: bin.items, h });
  }
  return rows;
}

/** Pack whole rows onto pages without splitting a row across a page. */
function paginate(rows: Row[], contentH: number): Row[][] {
  const pages: Row[][] = [];
  let page: Row[] = [];
  let y = 0;
  for (const row of rows) {
    const nextY = y + (page.length ? GAP : 0) + row.h;
    if (page.length && nextY > contentH + 0.01) {
      pages.push(page);
      page = [];
      y = 0;
    }
    page.push(row);
    y += (page.length > 1 ? GAP : 0) + row.h;
  }
  if (page.length) pages.push(page);
  return pages;
}

function pageGeometry(rows: Row[]) {
  const xCuts = new Set<number>();
  const yCuts = new Set<number>();
  let gridW = 0;
  let y = 0;
  for (const row of rows) {
    yCuts.add(y);
    let x = 0;
    for (const item of row.items) {
      xCuts.add(x);
      xCuts.add(x + item.w);
      x += item.w + GAP;
    }
    gridW = Math.max(gridW, Math.max(0, x - GAP));
    y += row.h;
    yCuts.add(y);
    y += GAP;
  }
  return {
    gridW,
    gridH: Math.max(0, y - GAP),
    xCuts: [...xCuts].sort((a, b) => a - b),
    yCuts: [...yCuts].sort((a, b) => a - b),
  };
}

function TrimGuides({ rows, paperW, paperH }: { rows: Row[]; paperW: number; paperH: number }) {
  const { gridW, gridH, xCuts, yCuts } = pageGeometry(rows);
  const top = MARGIN;
  const left = MARGIN;
  const bottom = top + gridH;
  const right = left + gridW;
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0"
      viewBox={`0 0 ${paperW} ${paperH}`}
      preserveAspectRatio="none"
    >
      <g stroke="#000" strokeWidth={0.2}>
        {xCuts.map((x) => (
          <g key={`x-${x}`}>
            <line x1={left + x} y1={top - GUIDE_OFFSET - GUIDE_LENGTH} x2={left + x} y2={top - GUIDE_OFFSET} />
            <line x1={left + x} y1={bottom + GUIDE_OFFSET} x2={left + x} y2={bottom + GUIDE_OFFSET + GUIDE_LENGTH} />
          </g>
        ))}
        {yCuts.map((cutY) => (
          <g key={`y-${cutY}`}>
            <line x1={left - GUIDE_OFFSET - GUIDE_LENGTH} y1={top + cutY} x2={left - GUIDE_OFFSET} y2={top + cutY} />
            <line x1={right + GUIDE_OFFSET} y1={top + cutY} x2={right + GUIDE_OFFSET + GUIDE_LENGTH} y2={top + cutY} />
          </g>
        ))}
      </g>
    </svg>
  );
}

export default function PrintView({
  discs,
  frontSize,
  spineSize,
  tracklistSize,
  onClose,
}: Props) {
  const [paper, setPaper] = useState('US Letter');
  const [pw, ph] = PAPERS[paper];

  const items: Item[] = [];
  expandDiscs(discs).forEach((disc, i) => {
    const e = effFor(disc);
    const te = tlEffFor(disc);
    items.push({
      key: `${i}-front`,
      w: frontSize.width,
      h: frontSize.height,
      node: <FrontLabel {...e} size={frontSize} />,
    });
    if (disc.showSpine) {
      for (let c = 0; c < disc.spineCount; c++) {
        items.push({ key: `${i}-spine-${c}`, w: spineSize.width, h: spineSize.height, node: <SpineLabel {...e} size={spineSize} /> });
      }
    }
    if (disc.showTracklist) {
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
          <Button onClick={() => void document.fonts.ready.then(() => window.print())}>
            <Printer /> Print
          </Button>
        </div>
      </div>

      <div className="print-pages flex flex-col items-center gap-6 p-6">
        {pages.map((pg, pi) => (
          <div
            key={pi}
            className="print-page relative bg-white"
            style={{ width: `${pw}mm`, height: `${ph}mm` }}
          >
            <TrimGuides rows={pg} paperW={pw} paperH={ph} />
            <div
              className="absolute flex flex-col items-start"
              style={{ top: `${MARGIN}mm`, left: `${MARGIN}mm`, gap: `${GAP}mm` }}
            >
              {pg.map((row, ri) => (
                <div key={ri} className="flex items-start" style={{ gap: `${GAP}mm` }}>
                  {row.items.map((it) => (
                    <div
                      key={it.key}
                      className="print-cell shrink-0"
                      style={{ width: `${it.w}mm`, height: `${it.h}mm` }}
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
