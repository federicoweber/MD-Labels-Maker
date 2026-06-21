import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { LabelData } from '@/lib/types';
import FrontLabel from '@/components/FrontLabel';
import SpineLabel from '@/components/SpineLabel';
import TracklistSheet from '@/components/TracklistSheet';
import FrontPreview from '@/components/FrontPreview';
import SpinePreview from '@/components/SpinePreview';
import TracklistPreview from '@/components/TracklistPreview';
import SizeSelect from '@/components/SizeSelect';
import LabelControls, { type TypoField } from '@/components/LabelControls';
import Controls from '@/components/Controls';
import MdLogo from '@/components/MdLogo';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { fetchFontList, loadFontForPreview } from '@/lib/fonts';
import { fetchTracklist, fetchCovers } from '@/lib/tracklist';
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
  yearFont: DEFAULT_FONT,
  artistAuto: true,
  yearAuto: true,
  year: '',
  showYear: false,
  yearSize: 2.2,
  titleSize: FRONT.titleSize,
  artistSize: FRONT.artistSize,
  showArtist: true,
  trackSize: TRACKLIST.trackSize,
  showTracklistCover: false,
  tlShowAlbum: true,
  tlShowArtist: true,
  titleOpacity: 1,
  artistOpacity: 1,
  trackOpacity: 1,
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
  const [coverOptions, setCoverOptions] = useState<string[]>([]);
  const [coverIndex, setCoverIndex] = useState(0);
  const [coverLoading, setCoverLoading] = useState(false);
  const lastCoverKey = useRef('');
  const [frontSize, setFrontSize] = useState(FRONT_PRESETS[0]);
  const [spineSize, setSpineSize] = useState(SPINE_PRESETS[0]);
  const [tracklistSize, setTracklistSize] = useState(TRACKLIST_PRESETS[0]);
  const [families, setFamilies] = useState<string[]>([]);
  const [fontsLoading, setFontsLoading] = useState(true);
  const [showTracklist, setShowTracklist] = useState(false);
  const [tracklistLoading, setTracklistLoading] = useState(false);
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

  // Manual cover (drop / browse / remove): drops any auto-fetched options.
  function onCover(dataUrl: string | null) {
    setCoverOptions([]);
    setCoverIndex(0);
    if (dataUrl) lastCoverKey.current = `${data.artist}|${data.album}`.toLowerCase();
    update({ coverDataUrl: dataUrl });
  }

  function cycleCover(dir: number) {
    if (coverOptions.length < 2) return;
    const next = (coverIndex + dir + coverOptions.length) % coverOptions.length;
    setCoverIndex(next);
    update({ coverDataUrl: coverOptions[next] });
  }

  async function loadCovers() {
    const artist = data.artist.trim();
    const album = data.album.trim();
    if (!artist || !album) return;
    lastCoverKey.current = `${artist}|${album}`.toLowerCase();
    setCoverLoading(true);
    try {
      const { covers, year } = await fetchCovers(artist, album);
      if (covers.length) {
        setCoverOptions(covers);
        setCoverIndex(0);
        update(year && !data.year ? { coverDataUrl: covers[0], year } : { coverDataUrl: covers[0] });
      } else if (year && !data.year) {
        update({ year });
      }
    } catch (err) {
      console.warn('Cover fetch failed:', err);
    } finally {
      setCoverLoading(false);
    }
  }

  // Auto-fetch cover options once an album + artist are present (and no cover yet).
  useEffect(() => {
    if (data.coverDataUrl) return;
    const artist = data.artist.trim();
    const album = data.album.trim();
    if (!artist || !album) return;
    const key = `${artist}|${album}`.toLowerCase();
    if (key === lastCoverKey.current) return;
    const handle = window.setTimeout(() => void loadCovers(), 800);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.artist, data.album, data.coverDataUrl]);

  async function onFontSelect(field: 'title' | 'artist' | 'track' | 'year', family: string) {
    const key = (
      { title: 'titleFont', artist: 'artistFont', track: 'trackFont', year: 'yearFont' } as const
    )[field];
    update({ [key]: family });
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
      const fonts = [
        data.titleFont,
        data.artistAuto ? data.titleFont : data.artistFont,
        data.trackFont,
        data.yearAuto ? data.titleFont : data.yearFont,
      ];
      await downloadLabelsZip(labels, fonts, `${base}-minidisc-labels.zip`);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  }

  async function autoFillTracklist() {
    if (!data.album.trim() || !data.artist.trim()) return;
    setTracklistLoading(true);
    try {
      const { tracks, year } = await fetchTracklist(data.artist, data.album);
      const patch: Partial<LabelData> = {};
      if (tracks.length) patch.tracklist = tracks.join('\n');
      if (year) patch.year = year;
      if (Object.keys(patch).length) update(patch);
    } catch (err) {
      console.warn('Tracklist fetch failed:', err);
    } finally {
      setTracklistLoading(false);
    }
  }

  const frontFields: TypoField[] = [
    {
      key: 'title',
      title: 'Album',
      font: { value: data.titleFont, onChange: (f) => onFontSelect('title', f) },
      size: { id: 'title-size', value: data.titleSize, min: 2, max: 10, onChange: (v) => update({ titleSize: v }) },
      opacity: { id: 'title-opacity', value: data.titleOpacity, onChange: (v) => update({ titleOpacity: v }) },
    },
    {
      key: 'subtitle',
      title: 'Artist',
      showSwitch: { checked: data.showArtist, onChange: (v) => update({ showArtist: v }) },
      autoSwitch: data.showArtist
        ? { checked: data.artistAuto, onChange: (v) => update({ artistAuto: v }) }
        : undefined,
      font:
        data.showArtist && !data.artistAuto
          ? { value: data.artistFont, onChange: (f) => onFontSelect('artist', f) }
          : undefined,
      size:
        data.showArtist && !data.artistAuto
          ? { id: 'subtitle-size', value: data.artistSize, min: 1.5, max: 7, onChange: (v) => update({ artistSize: v }) }
          : undefined,
      opacity: data.showArtist
        ? { id: 'subtitle-opacity', value: data.artistOpacity, onChange: (v) => update({ artistOpacity: v }) }
        : undefined,
    },
    {
      key: 'year',
      title: 'Year',
      showSwitch: { checked: data.showYear, onChange: (v) => update({ showYear: v }) },
      autoSwitch: data.showYear
        ? { checked: data.yearAuto, onChange: (v) => update({ yearAuto: v }) }
        : undefined,
      font:
        data.showYear && !data.yearAuto
          ? { value: data.yearFont, onChange: (f) => onFontSelect('year', f) }
          : undefined,
      size:
        data.showYear && !data.yearAuto
          ? { id: 'year-size', value: data.yearSize, min: 1.2, max: 5, onChange: (v) => update({ yearSize: v }) }
          : undefined,
    },
  ];

  const trackFields: TypoField[] = [
    {
      key: 'track',
      title: 'Track',
      font: { value: data.trackFont, onChange: (f) => onFontSelect('track', f) },
      size: { id: 'track-size', value: data.trackSize, min: 1.5, max: 5, onChange: (v) => update({ trackSize: v }) },
      opacity: { id: 'track-opacity', value: data.trackOpacity, onChange: (v) => update({ trackOpacity: v }) },
    },
  ];

  // Effective rendering data: in "automatic" mode the artist/year derive their
  // font + size from the album via a type scale.
  const TYPE_SCALE = 1.25;
  const eff: LabelData = {
    ...data,
    artistFont: data.artistAuto ? data.titleFont : data.artistFont,
    artistSize: data.artistAuto ? data.titleSize / TYPE_SCALE : data.artistSize,
    yearFont: data.yearAuto ? data.titleFont : data.yearFont,
    yearSize: data.yearAuto ? data.titleSize / (TYPE_SCALE * TYPE_SCALE) : data.yearSize,
  };

  return (
    <div className="flex h-svh overflow-hidden">
      <Controls onExport={onExport} exporting={exporting} />

      <main className="flex flex-1 flex-wrap content-start items-start gap-36 overflow-auto bg-background p-12 pt-5">
        <section className="flex flex-col gap-2">
          <SizeSelect label="Front" value={frontSize} presets={FRONT_PRESETS} onChange={setFrontSize} />
          <FrontPreview data={eff} size={frontSize} update={update} onCover={onCover} />
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="w-fit"
              disabled={coverLoading}
              onClick={() => void loadCovers()}
            >
              {coverLoading ? 'Fetching…' : 'Fetch cover'}
            </Button>
            {coverOptions.length > 1 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <button
                  type="button"
                  aria-label="Previous cover"
                  onClick={() => cycleCover(-1)}
                  className="grid size-6 place-items-center border border-border hover:bg-accent"
                >
                  <ChevronLeft className="size-3.5" />
                </button>
                <span className="tabular-nums">
                  {coverIndex + 1}/{coverOptions.length}
                </span>
                <button
                  type="button"
                  aria-label="Next cover"
                  onClick={() => cycleCover(1)}
                  className="grid size-6 place-items-center border border-border hover:bg-accent"
                >
                  <ChevronRight className="size-3.5" />
                </button>
              </div>
            )}
          </div>
          <div className="flex w-full items-center justify-between">
            <Label htmlFor="show-tracklist" className="text-xs">
              Tracklist
            </Label>
            <Switch
              id="show-tracklist"
              checked={showTracklist}
              onCheckedChange={(v) => {
                setShowTracklist(v);
                if (v && !data.tracklist.trim()) void autoFillTracklist();
              }}
            />
          </div>
          <LabelControls
            fields={frontFields}
            families={families}
            fontsLoading={fontsLoading}
            data={data}
            update={update}
            palette={palette}
          />
        </section>

        <div className="flex flex-col gap-12">
          <section className="flex flex-col gap-2">
            <SizeSelect label="Spine" value={spineSize} presets={SPINE_PRESETS} onChange={setSpineSize} />
            <SpinePreview data={eff} size={spineSize} />
          </section>

          {showTracklist && (
            <section className="flex flex-col gap-2">
              <SizeSelect
                label="Tracklist"
                value={tracklistSize}
                presets={TRACKLIST_PRESETS}
                onChange={setTracklistSize}
              />
              <TracklistPreview data={eff} size={tracklistSize} update={update} />
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  className="w-fit"
                  disabled={tracklistLoading}
                  onClick={() => void autoFillTracklist()}
                >
                  {tracklistLoading ? 'Fetching…' : 'Auto-fill from MusicBrainz'}
                </Button>
                <div className="flex items-center justify-between">
                  <Label htmlFor="tl-album" className="text-xs">
                    Album
                  </Label>
                  <Switch
                    id="tl-album"
                    checked={data.tlShowAlbum}
                    onCheckedChange={(v) => update({ tlShowAlbum: v })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="tl-artist" className="text-xs">
                    Artist
                  </Label>
                  <Switch
                    id="tl-artist"
                    checked={data.tlShowArtist}
                    onCheckedChange={(v) => update({ tlShowArtist: v })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="tracklist-cover" className="text-xs">
                    Cover thumbnail
                  </Label>
                  <Switch
                    id="tracklist-cover"
                    checked={data.showTracklistCover}
                    onCheckedChange={(v) => update({ showTracklistCover: v })}
                  />
                </div>
              </div>
              <LabelControls
                fields={trackFields}
                families={families}
                fontsLoading={fontsLoading}
                data={data}
                update={update}
                palette={palette}
              />
            </section>
          )}
        </div>
      </main>

      <MdLogo className="fixed right-5 bottom-5 z-10" />

      {/* Hidden SVG twins — the precise, vector source used for PNG export. */}
      <div aria-hidden className="pointer-events-none fixed top-0 -left-[99999px] opacity-0">
        <FrontLabel ref={frontRef} {...eff} size={frontSize} />
        <SpineLabel ref={spineRef} {...eff} size={spineSize} />
        <TracklistSheet ref={tracklistRef} {...eff} size={tracklistSize} />
      </div>
    </div>
  );
}
