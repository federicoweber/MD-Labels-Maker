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
import SizeSlider from '@/components/SizeSlider';
import LabelControls, { type TypoField } from '@/components/LabelControls';
import Controls from '@/components/Controls';
import ConfirmModal from '@/components/ConfirmModal';
import PrintView from '@/components/PrintView';
import MdLogo from '@/components/MdLogo';
import { effFor, tlEffFor } from '@/lib/derive';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { fetchFontList, loadFontForPreview } from '@/lib/fonts';
import { fetchTracklist, fetchCovers } from '@/lib/tracklist';
import { loadDiscs, saveDiscs } from '@/lib/storage';
import { downloadLabelsZip, type ZipLabel } from '@/lib/exportPng';
import { extractPalette, bestTextColor } from '@/lib/colors';
import {
  FRONT,
  TRACKLIST,
  FRONT_PRESETS,
  SPINE_PRESETS,
  TRACKLIST_PRESETS,
} from '@/lib/dimensions';
const DEFAULT_FONT = 'Inconsolata';

const INITIAL: LabelData = {
  coverDataUrl: null,
  album: '',
  artist: '',
  doubleAlbum: false,
  coverDataUrl2: null,
  album2: '',
  artist2: '',
  tracklist2: '',
  doubleHideText: false,
  textBgOpacity: 1,
  textColor: '#ece8e0',
  bgColor: '#6e6a63',
  tlTextColor: '#ece8e0',
  tlBgColor: '#6e6a63',
  tlLetterSpacing: 0,
  tlLineHeight: 1.2,
  tlSync: true,
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
  showTracklist: false,
  tracklist: '',
};

function slug(s: string): string {
  return s
    .trim()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

/** A "Fetch cover" button with an optional ◀ n/m ▶ picker for the matches. */
function CoverControl({
  label,
  loading,
  onFetch,
  options,
  index,
  onCycle,
}: {
  label: string;
  loading: boolean;
  onFetch: () => void;
  options: string[];
  index: number;
  onCycle: (dir: number) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <Button variant="outline" className="w-fit" disabled={loading} onClick={onFetch}>
        {loading ? 'Fetching…' : label}
      </Button>
      {options.length > 1 && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <button
            type="button"
            aria-label="Previous cover"
            onClick={() => onCycle(-1)}
            className="grid size-6 place-items-center border border-border hover:bg-accent"
          >
            <ChevronLeft className="size-3.5" />
          </button>
          <span className="tabular-nums">
            {index + 1}/{options.length}
          </span>
          <button
            type="button"
            aria-label="Next cover"
            onClick={() => onCycle(1)}
            className="grid size-6 place-items-center border border-border hover:bg-accent"
          >
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [discs, setDiscs] = useState<LabelData[]>(() => loadDiscs(INITIAL));
  const [activeIndex, setActiveIndex] = useState(0);
  const active = Math.min(activeIndex, discs.length - 1);
  const data = discs[active] ?? INITIAL;
  const setData = (updater: LabelData | ((d: LabelData) => LabelData)) =>
    setDiscs((ds) =>
      ds.map((d, i) =>
        i === active ? (typeof updater === 'function' ? updater(d) : updater) : d,
      ),
    );

  const [palette, setPalette] = useState<string[]>([]);
  const [coverOptions, setCoverOptions] = useState<string[]>([]);
  const [coverIndex, setCoverIndex] = useState(0);
  const [coverOptions2, setCoverOptions2] = useState<string[]>([]);
  const [coverIndex2, setCoverIndex2] = useState(0);
  const [coverLoading, setCoverLoading] = useState(false);
  const [coverLoading2, setCoverLoading2] = useState(false);
  const [tracklistLoading2, setTracklistLoading2] = useState(false);
  const lastCoverKey = useRef('');
  const lastCoverKey2 = useRef('');
  const autoColoredFor = useRef<string | null>(null);
  const [frontSize, setFrontSize] = useState(FRONT_PRESETS[0]);
  const [spineSize, setSpineSize] = useState(SPINE_PRESETS[0]);
  const [caseSpineSize, setCaseSpineSize] = useState(SPINE_PRESETS[0]);
  const [tracklistSize, setTracklistSize] = useState(TRACKLIST_PRESETS[0]);
  const [families, setFamilies] = useState<string[]>([]);
  const [fontsLoading, setFontsLoading] = useState(true);
  const [tracklistLoading, setTracklistLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [printOpen, setPrintOpen] = useState(false);

  // Per-disc hidden SVG twins for export, keyed `${index}-${kind}`.
  const twinRefs = useRef<Record<string, SVGSVGElement | null>>({});

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
  }

  // Persist all discs to local storage.
  useEffect(() => {
    saveDiscs(discs);
  }, [discs]);

  const coverSig = (d: LabelData) =>
    [d.coverDataUrl, d.doubleAlbum ? d.coverDataUrl2 : null].filter(Boolean).join('|');

  // Reset the cover-fetch UI when the active disc changes; seed autoColoredFor
  // with the target disc's cover so its saved colours aren't re-derived.
  function resetCoverUi(d: LabelData | null) {
    setCoverOptions([]);
    setCoverIndex(0);
    setCoverOptions2([]);
    setCoverIndex2(0);
    lastCoverKey.current = '';
    lastCoverKey2.current = '';
    autoColoredFor.current = d ? coverSig(d) : '';
  }

  function selectDisc(i: number) {
    resetCoverUi(discs[i] ?? null);
    setActiveIndex(i);
  }

  function addDisc() {
    resetCoverUi(null);
    setDiscs((ds) => [...ds, INITIAL]);
    setActiveIndex(discs.length);
  }

  function deleteDisc(i: number) {
    setDeleteIndex(null);
    const remaining = discs.filter((_, idx) => idx !== i);
    const next = remaining.length ? remaining : [INITIAL];
    let na = activeIndex;
    if (i < activeIndex) na -= 1;
    else if (i === activeIndex) na = Math.min(activeIndex, next.length - 1);
    na = Math.max(0, Math.min(na, next.length - 1));
    resetCoverUi(next[na] ?? null);
    setDiscs(next);
    setActiveIndex(na);
  }

  // Reset the current disc to a blank state.
  function clearDisc() {
    resetCoverUi(null);
    setData(INITIAL);
  }

  // Recompute the palette + auto bg/text whenever a cover changes (sampling both
  // covers in double-album mode).
  useEffect(() => {
    let cancelled = false;
    const urls = [data.coverDataUrl, data.doubleAlbum ? data.coverDataUrl2 : null].filter(
      Boolean,
    ) as string[];
    // Only auto-apply colours when the cover genuinely changes — never on the
    // initial mount (which would clobber colours restored from local storage).
    // Signature-based so React StrictMode's double-mount doesn't trip it.
    const sig = urls.join('|');
    const changed = autoColoredFor.current !== null && sig !== autoColoredFor.current;
    autoColoredFor.current = sig;
    if (!urls.length) {
      setPalette([]);
      return;
    }
    (async () => {
      try {
        const palettes = await Promise.all(urls.map((u) => extractPalette(u, 5)));
        if (cancelled) return;
        // Interleave both covers' swatches so each contributes to the picker.
        const merged: string[] = [];
        const maxLen = Math.max(...palettes.map((p) => p.length));
        for (let i = 0; i < maxLen; i++)
          for (const p of palettes) if (p[i] && !merged.includes(p[i])) merged.push(p[i]);
        setPalette(merged);
        const bg = palettes[0][0];
        if (bg && changed) {
          const text = bestTextColor(bg);
          setData((d) => ({ ...d, bgColor: bg, textColor: text, tlBgColor: bg, tlTextColor: text }));
        }
      } catch (err) {
        console.warn('Palette extraction failed:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [data.coverDataUrl, data.coverDataUrl2, data.doubleAlbum]);

  // Manual cover (drop / browse): drops any auto-fetched options.
  function onCover(dataUrl: string | null) {
    setCoverOptions([]);
    setCoverIndex(0);
    if (dataUrl) lastCoverKey.current = `${data.artist}|${data.album}`.toLowerCase();
    update({ coverDataUrl: dataUrl });
  }

  function onCover2(dataUrl: string | null) {
    setCoverOptions2([]);
    setCoverIndex2(0);
    if (dataUrl) lastCoverKey2.current = `${data.artist2}|${data.album2}`.toLowerCase();
    update({ coverDataUrl2: dataUrl });
  }

  function cycleCover2(dir: number) {
    if (coverOptions2.length < 2) return;
    const next = (coverIndex2 + dir + coverOptions2.length) % coverOptions2.length;
    setCoverIndex2(next);
    update({ coverDataUrl2: coverOptions2[next] });
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

  // Second album: fetch its cover (and tracklist) from album2 + artist2.
  async function loadCovers2() {
    const artist = data.artist2.trim();
    const album = data.album2.trim();
    if (!artist || !album) return;
    lastCoverKey2.current = `${artist}|${album}`.toLowerCase();
    setCoverLoading2(true);
    try {
      const [{ covers }, tl] = await Promise.all([
        fetchCovers(artist, album),
        fetchTracklist(artist, album),
      ]);
      const patch: Partial<LabelData> = {};
      if (covers.length) {
        setCoverOptions2(covers);
        setCoverIndex2(0);
        patch.coverDataUrl2 = covers[0];
      }
      if (tl.tracks.length && !data.tracklist2.trim()) patch.tracklist2 = tl.tracks.join('\n');
      if (Object.keys(patch).length) update(patch);
    } catch (err) {
      console.warn('Album 2 fetch failed:', err);
    } finally {
      setCoverLoading2(false);
    }
  }

  async function autoFillTracklist2() {
    if (!data.album2.trim() || !data.artist2.trim()) return;
    setTracklistLoading2(true);
    try {
      const { tracks } = await fetchTracklist(data.artist2, data.album2);
      if (tracks.length) update({ tracklist2: tracks.join('\n') });
    } catch (err) {
      console.warn('Tracklist 2 fetch failed:', err);
    } finally {
      setTracklistLoading2(false);
    }
  }

  useEffect(() => {
    if (!data.doubleAlbum || data.coverDataUrl2) return;
    const artist = data.artist2.trim();
    const album = data.album2.trim();
    if (!artist || !album) return;
    const key = `${artist}|${album}`.toLowerCase();
    if (key === lastCoverKey2.current) return;
    const handle = window.setTimeout(() => void loadCovers2(), 800);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.album2, data.artist2, data.coverDataUrl2, data.doubleAlbum]);

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
      const labels: ZipLabel[] = [];
      const fonts = new Set<string>();
      const multi = discs.length > 1;
      discs.forEach((disc, i) => {
        const base = [disc.artist, disc.album].map(slug).filter(Boolean).join('-') || 'minidisc';
        const prefix = multi ? `${String(i + 1).padStart(2, '0')}-${base}/` : '';
        const get = (kind: string) => twinRefs.current[`${i}-${kind}`];
        const front = get('front');
        const spine = get('spine');
        const caseSpine = get('case-spine');
        const tracklist = get('tracklist');
        if (front)
          labels.push({ svg: front, widthMm: frontSize.width, heightMm: frontSize.height, name: `${prefix}front.png` });
        if (spine)
          labels.push({ svg: spine, widthMm: spineSize.width, heightMm: spineSize.height, name: `${prefix}spine.png` });
        if (disc.showTracklist && caseSpine)
          labels.push({ svg: caseSpine, widthMm: caseSpineSize.width, heightMm: caseSpineSize.height, name: `${prefix}spine-jewel-case.png` });
        if (disc.showTracklist && tracklist)
          labels.push({ svg: tracklist, widthMm: tracklistSize.width, heightMm: tracklistSize.height, name: `${prefix}tracklist.png` });
        fonts.add(disc.titleFont);
        fonts.add(disc.artistAuto ? disc.titleFont : disc.artistFont);
        fonts.add(disc.trackFont);
        fonts.add(disc.yearAuto ? disc.titleFont : disc.yearFont);
      });
      const zipBase = multi
        ? 'minidisc'
        : [data.artist, data.album].map(slug).filter(Boolean).join('-') || 'minidisc';
      await downloadLabelsZip(labels, [...fonts], `${zipBase}-minidisc-labels.zip`);
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

  const eff = effFor(data);
  const tlEff = tlEffFor(data);

  return (
    <div className="flex h-svh overflow-hidden">
      <Controls
        discs={discs}
        activeIndex={active}
        onSelect={selectDisc}
        onAdd={addDisc}
        onRequestDelete={setDeleteIndex}
        onExport={onExport}
        onPrint={() => setPrintOpen(true)}
        exporting={exporting}
      />

      <main className="flex flex-1 flex-wrap content-start items-start gap-36 overflow-auto bg-background p-12 pt-5">
        <section className="flex flex-col gap-2">
          <SizeSelect label="Front" value={frontSize} presets={FRONT_PRESETS} onChange={setFrontSize} />
          <FrontPreview
            data={eff}
            size={frontSize}
            update={update}
            onCover={onCover}
            onCover2={onCover2}
          />
          <Button variant="outline" className="w-fit" onClick={clearDisc}>
            Clear
          </Button>
          {data.doubleAlbum ? (
            <div className="flex flex-col gap-2">
              <CoverControl
                label="Fetch cover 1"
                loading={coverLoading}
                onFetch={() => void loadCovers()}
                options={coverOptions}
                index={coverIndex}
                onCycle={cycleCover}
              />
              <CoverControl
                label="Fetch cover 2"
                loading={coverLoading2}
                onFetch={() => void loadCovers2()}
                options={coverOptions2}
                index={coverIndex2}
                onCycle={cycleCover2}
              />
            </div>
          ) : (
            <CoverControl
              label="Fetch cover"
              loading={coverLoading}
              onFetch={() => void loadCovers()}
              options={coverOptions}
              index={coverIndex}
              onCycle={cycleCover}
            />
          )}
          <div className="flex w-full items-center justify-between">
            <Label htmlFor="double-album" className="text-xs">
              Double album
            </Label>
            <Switch
              id="double-album"
              checked={data.doubleAlbum}
              onCheckedChange={(v) => update({ doubleAlbum: v })}
            />
          </div>
          {data.doubleAlbum && (
            <>
              <div className="flex w-full items-center justify-between">
                <Label htmlFor="hide-front-text" className="text-xs">
                  Hide front text
                </Label>
                <Switch
                  id="hide-front-text"
                  checked={data.doubleHideText}
                  onCheckedChange={(v) => update({ doubleHideText: v })}
                />
              </div>
              {!data.doubleHideText && (
                <div className="w-full">
                  <SizeSlider
                    id="text-bg-opacity"
                    label="Text background"
                    value={data.textBgOpacity}
                    min={0}
                    max={1}
                    step={0.05}
                    format={(v) => `${Math.round(v * 100)}%`}
                    onChange={(v) => update({ textBgOpacity: v })}
                  />
                </div>
              )}
            </>
          )}
          <div className="flex w-full items-center justify-between">
            <Label htmlFor="show-tracklist" className="text-xs">
              Tracklist
            </Label>
            <Switch
              id="show-tracklist"
              checked={data.showTracklist}
              onCheckedChange={(v) => {
                update({ showTracklist: v });
                if (v && !data.tracklist.trim()) void autoFillTracklist();
              }}
            />
          </div>
          <LabelControls
            fields={frontFields}
            families={families}
            fontsLoading={fontsLoading}
            palette={palette}
            bgColor={data.bgColor}
            onBgColor={(h) => update({ bgColor: h })}
            textColor={data.textColor}
            onTextColor={(h) => update({ textColor: h })}
            letterSpacing={data.letterSpacing}
            onLetterSpacing={(v) => update({ letterSpacing: v })}
            lineHeight={data.lineHeight}
            onLineHeight={(v) => update({ lineHeight: v })}
          />
        </section>

        <div className="flex flex-col gap-12">
          <section className="flex flex-col gap-2">
            <SizeSelect label="Spine" value={spineSize} presets={SPINE_PRESETS} onChange={setSpineSize} />
            <SpinePreview data={eff} size={spineSize} />
            {data.showTracklist && (
              <>
                <SizeSelect
                  label="Jewel case spine"
                  value={caseSpineSize}
                  presets={SPINE_PRESETS}
                  onChange={setCaseSpineSize}
                />
                <SpinePreview data={tlEff} size={caseSpineSize} />
              </>
            )}
          </section>

          {data.showTracklist && (
            <section className="flex flex-col gap-2">
              <SizeSelect
                label="Tracklist"
                value={tracklistSize}
                presets={TRACKLIST_PRESETS}
                onChange={setTracklistSize}
              />
              <TracklistPreview data={tlEff} size={tracklistSize} update={update} />
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    className="w-fit"
                    disabled={tracklistLoading}
                    onClick={() => void autoFillTracklist()}
                  >
                    {tracklistLoading
                      ? 'Fetching…'
                      : data.doubleAlbum
                        ? 'Auto-fill album 1'
                        : 'Auto-fill from MusicBrainz'}
                  </Button>
                  {data.doubleAlbum && (
                    <Button
                      variant="outline"
                      className="w-fit"
                      disabled={tracklistLoading2}
                      onClick={() => void autoFillTracklist2()}
                    >
                      {tracklistLoading2 ? 'Fetching…' : 'Auto-fill album 2'}
                    </Button>
                  )}
                </div>
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
                <div className="flex items-center justify-between">
                  <Label htmlFor="tl-sync" className="text-xs">
                    Same as front
                  </Label>
                  <Switch
                    id="tl-sync"
                    checked={data.tlSync}
                    onCheckedChange={(v) => update({ tlSync: v })}
                  />
                </div>
              </div>
              {!data.tlSync && (
                <LabelControls
                  fields={trackFields}
                  families={families}
                  fontsLoading={fontsLoading}
                  palette={palette}
                  bgColor={data.tlBgColor}
                  onBgColor={(h) => update({ tlBgColor: h })}
                  textColor={data.tlTextColor}
                  onTextColor={(h) => update({ tlTextColor: h })}
                  letterSpacing={data.tlLetterSpacing}
                  onLetterSpacing={(v) => update({ tlLetterSpacing: v })}
                  lineHeight={data.tlLineHeight}
                  onLineHeight={(v) => update({ tlLineHeight: v })}
                />
              )}
            </section>
          )}
        </div>
      </main>

      <MdLogo className="fixed right-5 bottom-5 z-10" />

      {/* Hidden SVG twins for every disc — the precise vector source for export. */}
      <div aria-hidden className="pointer-events-none fixed top-0 -left-[99999px] opacity-0">
        {discs.map((disc, i) => {
          const e = effFor(disc);
          const te = tlEffFor(disc);
          return (
            <div key={i}>
              <FrontLabel ref={(el) => void (twinRefs.current[`${i}-front`] = el)} {...e} size={frontSize} />
              <SpineLabel ref={(el) => void (twinRefs.current[`${i}-spine`] = el)} {...e} size={spineSize} />
              <SpineLabel ref={(el) => void (twinRefs.current[`${i}-case-spine`] = el)} {...te} size={caseSpineSize} />
              <TracklistSheet ref={(el) => void (twinRefs.current[`${i}-tracklist`] = el)} {...te} size={tracklistSize} />
            </div>
          );
        })}
      </div>

      <ConfirmModal
        open={deleteIndex !== null}
        title="Delete this label?"
        message={
          deleteIndex !== null
            ? `“${discs[deleteIndex]?.album || 'Untitled'}${
                discs[deleteIndex]?.artist ? ` — ${discs[deleteIndex]?.artist}` : ''
              }” will be removed.`
            : ''
        }
        onConfirm={() => deleteIndex !== null && deleteDisc(deleteIndex)}
        onCancel={() => setDeleteIndex(null)}
      />

      {printOpen && (
        <PrintView
          discs={discs}
          frontSize={frontSize}
          spineSize={spineSize}
          caseSpineSize={caseSpineSize}
          tracklistSize={tracklistSize}
          onClose={() => setPrintOpen(false)}
        />
      )}
    </div>
  );
}
