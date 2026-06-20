import { useEffect, useRef, useState } from 'react';
import type { LabelData } from '@/lib/types';
import FrontLabel from '@/components/FrontLabel';
import SpineLabel from '@/components/SpineLabel';
import TracklistSheet from '@/components/TracklistSheet';
import FrontPreview from '@/components/FrontPreview';
import SpinePreview from '@/components/SpinePreview';
import TracklistPreview from '@/components/TracklistPreview';
import Controls, { type ExportTarget } from '@/components/Controls';
import { fetchFontList, loadFontForPreview } from '@/lib/fonts';
import { exportSvgToPng } from '@/lib/exportPng';
import { extractPalette, bestTextColor } from '@/lib/colors';
import { FRONT, SPINE, TRACKLIST } from '@/lib/dimensions';
import { useTheme } from '@/hooks/use-theme';

const DEFAULT_FONT = 'Roboto';

const INITIAL: LabelData = {
  coverDataUrl: null,
  album: '',
  artist: '',
  textColor: '#000000',
  bgColor: '#808080',
  fontFamily: DEFAULT_FONT,
  tracklist: '',
};

function slug(s: string): string {
  return s
    .trim()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

export default function App() {
  const { theme, toggle } = useTheme();
  const [data, setData] = useState<LabelData>(INITIAL);
  const [palette, setPalette] = useState<string[]>([]);
  const [families, setFamilies] = useState<string[]>([]);
  const [fontsLoading, setFontsLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);
  const [fontError, setFontError] = useState<string | null>(null);
  const [showTracklist, setShowTracklist] = useState(false);
  const [exporting, setExporting] = useState<ExportTarget | null>(null);

  const frontRef = useRef<SVGSVGElement>(null);
  const spineRef = useRef<SVGSVGElement>(null);
  const tracklistRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetchFontList().then((res) => {
      if (cancelled) return;
      setFamilies(res.families);
      setUsingFallback(res.usingFallback);
      setFontsLoading(false);
    });
    loadFontForPreview(DEFAULT_FONT).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  function update(patch: Partial<LabelData>) {
    setData((d) => ({ ...d, ...patch }));
    if ('coverDataUrl' in patch) onCoverChange(patch.coverDataUrl ?? null);
  }

  async function onCoverChange(dataUrl: string | null) {
    if (!dataUrl) {
      setPalette([]);
      return;
    }
    try {
      const colors = await extractPalette(dataUrl, 5);
      setPalette(colors);
      const bg = colors[0];
      if (bg) setData((d) => ({ ...d, bgColor: bg, textColor: bestTextColor(bg) }));
    } catch (err) {
      console.warn('Palette extraction failed:', err);
    }
  }

  async function onFontSelect(family: string) {
    update({ fontFamily: family });
    setFontError(null);
    try {
      await loadFontForPreview(family);
    } catch {
      setFontError(`Couldn't load "${family}". Check your connection.`);
    }
  }

  async function onExport(which: ExportTarget) {
    const ref = which === 'front' ? frontRef : which === 'spine' ? spineRef : tracklistRef;
    const svg = ref.current;
    if (!svg) return;
    setExporting(which);
    try {
      const base = [data.artist, data.album].map(slug).filter(Boolean).join('-') || 'minidisc';
      const dims = which === 'front' ? FRONT : which === 'spine' ? SPINE : TRACKLIST;
      await exportSvgToPng(svg, {
        fontFamily: data.fontFamily,
        widthMm: dims.width,
        heightMm: dims.height,
        filename: `${base}-${which}.png`,
      });
    } catch (err) {
      console.error(err);
      setFontError('Export failed — see console for details.');
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="flex h-svh overflow-hidden">
      <Controls
        data={data}
        update={update}
        onFontSelect={onFontSelect}
        families={families}
        fontsLoading={fontsLoading}
        usingFallback={usingFallback}
        fontError={fontError}
        palette={palette}
        showTracklist={showTracklist}
        onToggleTracklist={setShowTracklist}
        onExport={onExport}
        exporting={exporting}
        theme={theme}
        onToggleTheme={toggle}
      />

      <main className="checkerboard flex flex-1 flex-wrap content-start items-start gap-12 overflow-auto p-12">
        <Preview heading={`Front · ${FRONT.width}×${FRONT.height}mm`}>
          <FrontPreview data={data} update={update} />
        </Preview>
        <Preview heading={`Spine · ${SPINE.width}×${SPINE.height}mm`}>
          <SpinePreview data={data} />
        </Preview>
        {showTracklist && (
          <Preview heading={`Tracklist · ${TRACKLIST.width}×${TRACKLIST.height}mm`}>
            <TracklistPreview data={data} update={update} />
          </Preview>
        )}
      </main>

      {/* Hidden SVG twins — the precise, vector source used for PNG export. */}
      <div aria-hidden className="pointer-events-none fixed top-0 -left-[99999px] opacity-0">
        <FrontLabel ref={frontRef} {...data} />
        <SpineLabel ref={spineRef} {...data} />
        <TracklistSheet ref={tracklistRef} {...data} />
      </div>
    </div>
  );
}

function Preview({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {heading}
      </h2>
      {children}
    </section>
  );
}
