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
const MARGIN = 5; // mm — small printable margin (keeps 6 fronts on one row)
const GAP = 0; // labels sit flush; one cut serves both neighbours

interface Item {
  key: string;
  w: number;
  h: number;
  node: ReactNode;
  /** Opaque label — give the cell a black backing so sub-pixel edges never
   * show the page white. (Front stays transparent for its chamfer corner.) */
  dark?: boolean;
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
      let bin = bins.find((b) => b.w + it.w <= contentW + 0.01);
      if (!bin) {
        bin = { items: [], w: 0 };
        bins.push(bin);
      }
      bin.items.push(it);
      bin.w += it.w + GAP;
    }
    for (const bin of bins) rows.push({ items: bin.items, h });
  }
  return rows;
}

/** Group consecutive same-height rows into blocks. */
function groupBlocks(rows: Row[]): Row[][] {
  const blocks: Row[][] = [];
  for (const row of rows) {
    const last = blocks[blocks.length - 1];
    if (last && last[0].h === row.h) last.push(row);
    else blocks.push([row]);
  }
  return blocks;
}

/**
 * Split a page's rows into table groups. A uniform-width block (all cells the
 * same width, e.g. spines, or fronts/tracklists alone) becomes one multi-row
 * table with clean collapsed borders. A mixed-width block (fronts packed with
 * tracklists) renders each row as its own table — table columns wouldn't align.
 */
function tablesFor(rows: Row[]): Row[][] {
  const tables: Row[][] = [];
  for (const block of groupBlocks(rows)) {
    const widths = new Set(block.flatMap((r) => r.items.map((it) => Math.round(it.w * 10) / 10)));
    if (widths.size <= 1) tables.push(block);
    else for (const row of block) tables.push([row]);
  }
  return tables;
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
    if (disc.showSpine) {
      for (let c = 0; c < disc.spineCount; c++) {
        items.push({ key: `${i}-spine-${c}`, w: spineSize.width, h: spineSize.height, dark: true, node: <SpineLabel {...e} size={spineSize} /> });
      }
    }
    if (disc.showTracklist) {
      items.push({ key: `${i}-tl`, w: tracklistSize.width, h: tracklistSize.height, dark: true, node: <TracklistSheet {...te} size={tracklistSize} /> });
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
              {tablesFor(pg).map((rows, ti) => (
                <table
                  key={ti}
                  className="print-table"
                  style={{ marginTop: ti ? '-1px' : undefined }}
                >
                  <tbody>
                    {rows.map((row, ri) => (
                      <tr key={ri}>
                        {row.items.map((it) => (
                          <td
                            key={it.key}
                            className="print-cell"
                            style={{
                              width: `${it.w}mm`,
                              height: `${it.h}mm`,
                              background: it.dark ? '#000' : undefined,
                            }}
                          >
                            {it.node}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>,
    document.body,
  );
}
