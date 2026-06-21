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
import Controls from '@/components/Controls';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { fetchFontList, loadFontForPreview } from '@/lib/fonts';
import { downloadLabelsZip, type ZipLabel } from '@/lib/exportPng';
import { extractPalette, bestTextColor } from '@/lib/colors';
import {
  FRONT,
  TRACKLIST,
  FRONT_PRESETS,
  SPINE_PRESETS,
  TRACKLIST_PRESETS,
} from '@/lib/dimensions';
const DEFAULT_FONT = 'Roboto Mono';

const INITIAL: LabelData = {
  coverDataUrl: null,
  album: '',
  artist: '',
  textColor: '#ece8e0',
  bgColor: '#6e6a63',
  titleFont: DEFAULT_FONT,
  artistFont: DEFAULT_FONT,
  trackFont: DEFAULT_FONT,
  linkFonts: true,
  titleSize: FRONT.titleSize,
  artistSize: FRONT.artistSize,
  showArtist: true,
  trackSize: TRACKLIST.trackSize,
  letterSpacing: 0,
  lineHeight: 1.2,
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
  const [data, setData] = useState<LabelData>(INITIAL);
  const [palette, setPalette] = useState<string[]>([]);
  const [frontSize, setFrontSize] = useState(FRONT_PRESETS[0]);
  const [spineSize, setSpineSize] = useState(SPINE_PRESETS[0]);
  const [tracklistSize, setTracklistSize] = useState(TRACKLIST_PRESETS[0]);
  const [families, setFamilies] = useState<string[]>([]);
  const [fontsLoading, setFontsLoading] = useState(true);
  const [showTracklist, setShowTracklist] = useState(false);
  const [focusedField, setFocusedField] = useState<'title' | 'artist' | 'track' | null>(null);
  const [exporting, setExporting] = useState(false);

  const frontRef = useRef<SVGSVGElement>(null);
  const spineRef = useRef<SVGSVGElement>(null);
  const tracklistRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetchFontList().then((res) => {
      if (cancelled) return;
      setFamilies(res.families);
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

  async function onFontSelect(field: 'title' | 'artist' | 'track', family: string) {
    if (field === 'track') update({ trackFont: family });
    else if (data.linkFonts) update({ titleFont: family, artistFont: family });
    else update(field === 'title' ? { titleFont: family } : { artistFont: family });
    try {
      await loadFontForPreview(family);
    } catch (err) {
      console.warn(`Couldn't load font "${family}":`, err);
    }
  }

  async function onExport() {
    setExporting(true);
    try {
      const base = [data.artist, data.album].map(slug).filter(Boolean).join('-') || 'minidisc';
      const labels: ZipLabel[] = [];
      if (frontRef.current)
        labels.push({
          svg: frontRef.current,
          widthMm: frontSize.width,
          heightMm: frontSize.height,
          name: 'front.png',
        });
      if (spineRef.current)
        labels.push({
          svg: spineRef.current,
          widthMm: spineSize.width,
          heightMm: spineSize.height,
          name: 'spine.png',
        });
      if (showTracklist && tracklistRef.current)
        labels.push({
          svg: tracklistRef.current,
          widthMm: tracklistSize.width,
          heightMm: tracklistSize.height,
          name: 'tracklist.png',
        });
      await downloadLabelsZip(
        labels,
        [data.titleFont, data.artistFont, data.trackFont],
        `${base}-minidisc-labels.zip`,
      );
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex h-svh overflow-hidden">
      <Controls
        showTracklist={showTracklist}
        onToggleTracklist={setShowTracklist}
        onExport={onExport}
        exporting={exporting}
      />

      <main className="flex flex-1 flex-wrap content-start items-start gap-12 overflow-auto bg-background p-12">
        <section className="flex flex-col gap-2">
          <SizeSelect label="Front" value={frontSize} presets={FRONT_PRESETS} onChange={setFrontSize} />
          <FrontPreview data={data} size={frontSize} update={update} onFocusField={setFocusedField} />
          <div className="flex w-full items-center justify-between">
            <Label htmlFor="show-subtitle" className="text-xs">
              Show subtitle
            </Label>
            <Switch
              id="show-subtitle"
              checked={data.showArtist}
              onCheckedChange={(v) => update({ showArtist: v })}
            />
          </div>
          {(focusedField === 'title' || focusedField === 'artist') && (
            <LabelControls
              sizeId={`${focusedField}-size`}
              sizeLabel={focusedField === 'artist' ? 'Subtitle size' : 'Title size'}
              sizeValue={focusedField === 'artist' ? data.artistSize : data.titleSize}
              sizeMin={focusedField === 'artist' ? 1.5 : 2}
              sizeMax={focusedField === 'artist' ? 7 : 10}
              onSize={(v) => update(focusedField === 'artist' ? { artistSize: v } : { titleSize: v })}
              fontValue={focusedField === 'artist' ? data.artistFont : data.titleFont}
              onFontChange={(f) => onFontSelect(focusedField === 'artist' ? 'artist' : 'title', f)}
              showFont={!(focusedField === 'artist' && data.linkFonts)}
              showLinkFonts={data.showArtist}
              families={families}
              fontsLoading={fontsLoading}
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
                fontValue={data.trackFont}
                onFontChange={(f) => onFontSelect('track', f)}
                families={families}
                fontsLoading={fontsLoading}
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
