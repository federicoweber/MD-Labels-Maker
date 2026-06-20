import { useEffect, useRef, useState } from 'react';
import type { LabelData } from '@/lib/types';
import FrontLabel from '@/components/FrontLabel';
import SpineLabel from '@/components/SpineLabel';
import TracklistSheet from '@/components/TracklistSheet';
import FrontPreview from '@/components/FrontPreview';
import SpinePreview from '@/components/SpinePreview';
import TracklistPreview from '@/components/TracklistPreview';
import SizeSelect from '@/components/SizeSelect';
import LabelControls from '@/components/LabelControls';
import Controls, { type ExportTarget } from '@/components/Controls';
import { fetchFontList, loadFontForPreview } from '@/lib/fonts';
import { exportSvgToPng } from '@/lib/exportPng';
import { extractPalette, bestTextColor } from '@/lib/colors';
import {
  FRONT,
  TRACKLIST,
  FRONT_PRESETS,
  SPINE_PRESETS,
  TRACKLIST_PRESETS,
} from '@/lib/dimensions';
import { useTheme } from '@/hooks/use-theme';

const DEFAULT_FONT = 'Roboto Mono';

const INITIAL: LabelData = {
  coverDataUrl: null,
  album: '',
  artist: '',
  textColor: '#ece8e0',
  bgColor: '#6e6a63',
  fontFamily: DEFAULT_FONT,
  titleSize: FRONT.titleSize,
  artistSize: FRONT.artistSize,
  showArtist: true,
  trackSize: TRACKLIST.trackSize,
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
  const [frontSize, setFrontSize] = useState(FRONT_PRESETS[0]);
  const [spineSize, setSpineSize] = useState(SPINE_PRESETS[0]);
  const [tracklistSize, setTracklistSize] = useState(TRACKLIST_PRESETS[0]);
  const [families, setFamilies] = useState<string[]>([]);
  const [fontsLoading, setFontsLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);
  const [fontError, setFontError] = useState<string | null>(null);
  const [showTracklist, setShowTracklist] = useState(false);
  const [focusedField, setFocusedField] = useState<'title' | 'artist' | 'track' | null>(null);
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
      const dims = which === 'front' ? frontSize : which === 'spine' ? spineSize : tracklistSize;
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
        showTracklist={showTracklist}
        onToggleTracklist={setShowTracklist}
        onExport={onExport}
        exporting={exporting}
        theme={theme}
        onToggleTheme={toggle}
      />

      <main className="flex flex-1 flex-wrap content-start items-start gap-12 overflow-auto bg-background p-12">
        <section className="flex flex-col gap-2">
          <SizeSelect label="Front" value={frontSize} presets={FRONT_PRESETS} onChange={setFrontSize} />
          <FrontPreview data={data} size={frontSize} update={update} onFocusField={setFocusedField} />
          {(focusedField === 'title' || focusedField === 'artist') && (
            <LabelControls
              sizeId={`${focusedField}-size`}
              sizeLabel={focusedField === 'artist' ? 'Artist size' : 'Title size'}
              sizeValue={focusedField === 'artist' ? data.artistSize : data.titleSize}
              sizeMin={focusedField === 'artist' ? 1.5 : 2}
              sizeMax={focusedField === 'artist' ? 7 : 10}
              onSize={(v) => update(focusedField === 'artist' ? { artistSize: v } : { titleSize: v })}
              data={data}
              update={update}
              palette={palette}
            />
          )}
        </section>

        <section className="flex flex-col gap-2">
          <SizeSelect label="Spine" value={spineSize} presets={SPINE_PRESETS} onChange={setSpineSize} />
          <SpinePreview data={data} size={spineSize} />
        </section>

        {showTracklist && (
          <section className="flex flex-col gap-2">
            <SizeSelect
              label="Tracklist"
              value={tracklistSize}
              presets={TRACKLIST_PRESETS}
              onChange={setTracklistSize}
            />
            <TracklistPreview
              data={data}
              size={tracklistSize}
              update={update}
              onFocusField={() => setFocusedField('track')}
            />
            {focusedField === 'track' && (
              <LabelControls
                sizeId="track-size"
                sizeLabel="Track size"
                sizeValue={data.trackSize}
                sizeMin={1.5}
                sizeMax={5}
                onSize={(v) => update({ trackSize: v })}
                data={data}
                update={update}
                palette={palette}
              />
            )}
          </section>
        )}
      </main>

      {/* Hidden SVG twins — the precise, vector source used for PNG export. */}
      <div aria-hidden className="pointer-events-none fixed top-0 -left-[99999px] opacity-0">
        <FrontLabel ref={frontRef} {...data} size={frontSize} />
        <SpineLabel ref={spineRef} {...data} size={spineSize} />
        <TracklistSheet ref={tracklistRef} {...data} size={tracklistSize} />
      </div>
    </div>
  );
}
