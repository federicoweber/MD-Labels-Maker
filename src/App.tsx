import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, ChevronLeft, ChevronRight, Copy } from 'lucide-react';
import type { LabelData } from '@/lib/types';
import FrontLabel from '@/components/FrontLabel';
import SpineLabel from '@/components/SpineLabel';
import TracklistSheet from '@/components/TracklistSheet';
import FrontPreview from '@/components/FrontPreview';
import SpinePreview from '@/components/SpinePreview';
import TracklistPreview from '@/components/TracklistPreview';
import SizeSelect from '@/components/SizeSelect';
import SpotifyControl from '@/components/SpotifyControl';
import LabelControls, { type TypoField } from '@/components/LabelControls';
import Controls from '@/components/Controls';
import ConfirmModal from '@/components/ConfirmModal';
import PrintView from '@/components/PrintView';
import MdLogo from '@/components/MdLogo';
import { effFor, tlEffFor, expandDiscs } from '@/lib/derive';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { fetchFontList, loadFontForPreview } from '@/lib/fonts';
import {
  fetchTracklist,
  fetchCovers,
  fetchDiscs,
  stripDurations,
  type CoverOption,
} from '@/lib/tracklist';
import { loadDiscs, saveDiscs } from '@/lib/storage';
import { readImageFile } from '@/lib/utils';
import { decodeDiscs, setupUrl, shareDataFor, shareUrl } from '@/lib/share';
import { imageToDataUrl } from '@/lib/spotify';
import { generateArtCover, GEN_MODELS, type GenModel } from '@/lib/genart';
import { downloadLabelsZip, type ZipLabel } from '@/lib/exportPng';
import { extractPalette, bestTextColor } from '@/lib/colors';
import {
  FRONT,
  TRACKLIST,
  FRONT_PRESETS,
  SPINE_PRESETS,
  TRACKLIST_PRESETS,
  orientedFrontSize,
} from '@/lib/dimensions';
const DEFAULT_FONT = 'Inconsolata';

const INITIAL: LabelData = {
  coverDataUrl: null,
  coverSourceUrl: null,
  album: '',
  artist: '',
  multiDisc: false,
  discNumber: 1,
  discTotal: 1,
  discTracklists: [],
  doubleAlbum: false,
  coverDataUrl2: null,
  album2: '',
  artist2: '',
  tracklist2: '',
  doubleHideText: false,
  showChamfer: true,
  verticalMode: false,
  fullHeight: false,
  fullHeightScale: 1,
  coverPadding: 0,
  fullHeightAlign: 0.5,
  fullHeightTextY: 1,
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
  tlShowQr: false,
  tlShowAlbum: true,
  tlShowArtist: true,
  tlTitleSize: TRACKLIST.titleSize,
  tlArtistSize: TRACKLIST.artistSize,
  showTrackDuration: false,
  titleOpacity: 1,
  artistOpacity: 1,
  trackOpacity: 1,
  letterSpacing: 0,
  lineHeight: 1.2,
  titleArtistGap: 0.6,
  frontTracklist: false,
  showQr: false,
  showSpine: true,
  spineCount: 1,
  spineShowAlbum: true,
  spineShowArtist: true,
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

/**
 * Small underlined numeric field that can be cleared while typing (keeps a local
 * string), committing a clamped value when it's valid or on blur.
 */
function CountInput({
  id,
  value,
  min,
  max,
  onCommit,
}: {
  id: string;
  value: number;
  min: number;
  max: number;
  onCommit: (n: number) => void;
}) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      value={text}
      onChange={(e) => {
        const v = e.target.value.replace(/\D/g, '');
        setText(v);
        const n = parseInt(v, 10);
        if (!Number.isNaN(n) && n >= min && n <= max) onCommit(n);
      }}
      onBlur={() => {
        const n = parseInt(text, 10);
        const clamped = Number.isNaN(n) ? value : Math.max(min, Math.min(max, n));
        onCommit(clamped);
        setText(String(clamped));
      }}
      className="w-10 border-b border-foreground/40 bg-transparent pb-0.5 text-right text-xs tabular-nums outline-none focus:border-foreground"
    />
  );
}

/** Copies the digital-tracklist link (what the QR encodes) to the clipboard. */
function CopyShareButton({ data }: { data: LabelData }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label="Copy the tracklist page link"
      title="Copy the tracklist page link"
      className="text-muted-foreground hover:text-foreground"
      onClick={() => {
        const url = shareUrl(shareDataFor(data));
        void navigator.clipboard.writeText(url).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        });
      }}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
    </button>
  );
}

/** A "Fetch cover" button with an upload button and an optional ◀ n/m ▶ picker. */
function CoverControl({
  label,
  loading,
  onFetch,
  onUpload,
  onGenerate,
  genModel,
  onGenModel,
  options,
  index,
  onCycle,
}: {
  label: string;
  loading: boolean;
  onFetch: () => void;
  onUpload: (dataUrl: string) => void;
  onGenerate: () => void;
  genModel: GenModel;
  onGenModel: (m: GenModel) => void;
  /** Only the count is shown; elements are opaque here. */
  options: unknown[];
  index: number;
  onCycle: (dir: number) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <Button variant="outline" className="w-fit" disabled={loading} onClick={onFetch}>
          {loading ? 'Fetching…' : label}
        </Button>
        <Button variant="outline" className="w-fit" onClick={() => fileInput.current?.click()}>
          Upload
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
      <div className="flex items-stretch gap-3">
        <div className="notch-tr-bordered inline-flex h-9 items-center">
          <select
            aria-label="Generator model"
            value={genModel}
            onChange={(e) => onGenModel(e.target.value as GenModel)}
            className="h-full cursor-pointer appearance-none bg-transparent pr-8 pl-4 text-sm font-medium outline-none"
          >
            {GEN_MODELS.map((m) => (
              <option key={m.id} value={m.id} className="text-foreground">
                {m.name}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 size-4" />
        </div>
        <Button
          variant="outline"
          className="w-fit"
          title="Generate a cover seeded by the artist, album and tracklist"
          onClick={onGenerate}
        >
          Generate
        </Button>
      </div>
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f?.type.startsWith('image/')) void readImageFile(f).then(onUpload);
          e.target.value = '';
        }}
      />
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
  const [coverOptions, setCoverOptions] = useState<CoverOption[]>([]);
  const [coverIndex, setCoverIndex] = useState(0);
  const [coverOptions2, setCoverOptions2] = useState<CoverOption[]>([]);
  const [coverIndex2, setCoverIndex2] = useState(0);
  const [coverLoading, setCoverLoading] = useState(false);
  const [coverLoading2, setCoverLoading2] = useState(false);
  const [tracklistLoading2, setTracklistLoading2] = useState(false);
  const [multiDiscLoading, setMultiDiscLoading] = useState(false);
  const lastCoverKey = useRef('');
  const lastCoverKey2 = useRef('');
  const autoColoredFor = useRef<string | null>(null);
  const [frontSize, setFrontSize] = useState(FRONT_PRESETS[0]);
  const [spineSize, setSpineSize] = useState(SPINE_PRESETS[0]);
  const [tracklistSize, setTracklistSize] = useState(TRACKLIST_PRESETS[0]);
  const [families, setFamilies] = useState<string[]>([]);
  const [fontsLoading, setFontsLoading] = useState(true);
  const [tracklistLoading, setTracklistLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [printOpen, setPrintOpen] = useState(false);
  const [genModel, setGenModel] = useState<GenModel>('auto');

  // A #d=… link (from "Export setup link") offers to restore that whole setup.
  const [pendingImport, setPendingImport] = useState<Partial<LabelData>[] | null>(() => {
    if (!window.location.hash.startsWith('#d=')) return null;
    try {
      return decodeDiscs(window.location.hash.slice(3));
    } catch (err) {
      console.warn('Setup link decode failed:', err);
      return null;
    }
  });
  useEffect(() => {
    if (window.location.hash.startsWith('#d=')) {
      window.history.replaceState({}, document.title, import.meta.env.BASE_URL);
    }
  }, []);

  function applyImport() {
    if (!pendingImport) return;
    const imported = pendingImport.map((d) => ({ ...INITIAL, ...d }));
    resetCoverUi(imported[0] ?? null);
    // Block the auto cover fetch — imported covers restore from their sources.
    lastCoverKey.current = `${imported[0]?.artist ?? ''}|${imported[0]?.album ?? ''}`.toLowerCase();
    setDiscs(imported);
    setActiveIndex(0);
    setPendingImport(null);
    // The link carries cover source URLs, not the images — re-fetch them.
    imported.forEach((d, i) => {
      const src = d.coverSourceUrl;
      if (d.coverDataUrl || !src || src === '-') return;
      imageToDataUrl(src)
        .then((dataUrl) =>
          setDiscs((ds) =>
            ds.map((x, j) => (j === i && x.coverSourceUrl === src ? { ...x, coverDataUrl: dataUrl } : x)),
          ),
        )
        .catch((err) => console.warn('Cover restore failed:', err));
    });
  }

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

  // Load every font the saved discs reference (Google fonts are injected as
  // runtime styles that don't survive a reload) and re-render as each lands,
  // so the SVG twins re-measure their text wrapping with the real metrics —
  // otherwise print/export wraps with fallback-font widths.
  const [, setFontsVersion] = useState(0);
  useEffect(() => {
    let cancelled = false;
    const fonts = new Set<string>();
    for (const d of discs) {
      fonts.add(d.titleFont);
      if (!d.artistAuto) fonts.add(d.artistFont);
      fonts.add(d.trackFont);
      if (!d.yearAuto) fonts.add(d.yearFont);
    }
    for (const f of fonts) {
      loadFontForPreview(f)
        .then(() => {
          if (!cancelled) setFontsVersion((v) => v + 1);
        })
        .catch(() => {});
    }
    return () => {
      cancelled = true;
    };
    // Startup only: later font changes already load via onFontSelect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Manual cover (drop / browse): drops any auto-fetched options. No public
  // source URL exists for a local file, so QR share links fall back to search.
  function onCover(dataUrl: string | null) {
    setCoverOptions([]);
    setCoverIndex(0);
    if (dataUrl) lastCoverKey.current = `${data.artist}|${data.album}`.toLowerCase();
    update({ coverDataUrl: dataUrl, coverSourceUrl: null });
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
    update({ coverDataUrl2: coverOptions2[next].dataUrl });
  }

  function cycleCover(dir: number) {
    if (coverOptions.length < 2) return;
    const next = (coverIndex + dir + coverOptions.length) % coverOptions.length;
    setCoverIndex(next);
    update({ coverDataUrl: coverOptions[next].dataUrl, coverSourceUrl: coverOptions[next].url });
  }

  // Generative cover seeded by artist + album + tracklist plus a fresh random
  // salt per press — press again for a new variation of the selected model.
  // Salt + model are stored in coverSourceUrl (gen:<salt>[:<model>]) so the QR
  // page regenerates the same one. The cover already uses the label's colours,
  // so skip the palette auto-recolour.
  function generateCover() {
    const salt = Math.random().toString(36).slice(2, 8);
    const dataUrl = generateArtCover(
      data.album,
      data.artist,
      data.tracklist,
      salt,
      data.bgColor,
      data.textColor,
      600,
      genModel,
    );
    setCoverOptions([]);
    setCoverIndex(0);
    lastCoverKey.current = `${data.artist}|${data.album}`.toLowerCase();
    autoColoredFor.current = [dataUrl, data.doubleAlbum ? data.coverDataUrl2 : null]
      .filter(Boolean)
      .join('|');
    update({
      coverDataUrl: dataUrl,
      coverSourceUrl: genModel === 'auto' ? `gen:${salt}` : `gen:${salt}:${genModel}`,
    });
  }

  function generateCover2() {
    const salt = Math.random().toString(36).slice(2, 8);
    const dataUrl = generateArtCover(
      data.album2,
      data.artist2,
      data.tracklist2,
      salt,
      data.bgColor,
      data.textColor,
      600,
      genModel,
    );
    setCoverOptions2([]);
    setCoverIndex2(0);
    lastCoverKey2.current = `${data.artist2}|${data.album2}`.toLowerCase();
    autoColoredFor.current = [data.coverDataUrl, dataUrl].filter(Boolean).join('|');
    update({ coverDataUrl2: dataUrl });
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
        update({
          coverDataUrl: covers[0].dataUrl,
          coverSourceUrl: covers[0].url,
          ...(year && !data.year ? { year } : {}),
        });
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
        patch.coverDataUrl2 = covers[0].dataUrl;
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
      const multi = outputs.length > 1;
      outputs.forEach((disc, i) => {
        const base = [disc.artist, disc.album].map(slug).filter(Boolean).join('-') || 'minidisc';
        const discTag = disc.discTotal > 1 ? `-disc${disc.discNumber}` : '';
        const prefix = multi ? `${String(i + 1).padStart(2, '0')}-${base}${discTag}/` : '';
        const get = (kind: string) => twinRefs.current[`${i}-${kind}`];
        const front = get('front');
        const spine = get('spine');
        const tracklist = get('tracklist');
        if (front)
          labels.push({
            svg: front,
            widthMm: frontSize.width,
            heightMm: frontSize.height,
            name: `${prefix}front.png`,
          });
        if (disc.showSpine && spine)
          for (let c = 0; c < disc.spineCount; c++)
            labels.push({
              svg: spine,
              widthMm: spineSize.width,
              heightMm: spineSize.height,
              name: `${prefix}spine${disc.spineCount > 1 ? `-${c + 1}` : ''}.png`,
            });
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

  async function autoFillTracklist(withDur = data.showTrackDuration) {
    if (!data.album.trim() || !data.artist.trim()) return;
    setTracklistLoading(true);
    try {
      const { tracks, year } = await fetchTracklist(data.artist, data.album);
      const patch: Partial<LabelData> = {};
      const joined = tracks.join('\n');
      if (tracks.length) patch.tracklist = withDur ? joined : stripDurations(joined);
      if (year) patch.year = year;
      if (Object.keys(patch).length) update(patch);
    } catch (err) {
      console.warn('Tracklist fetch failed:', err);
    } finally {
      setTracklistLoading(false);
    }
  }

  // Multi-disc: one sidebar entry holds N per-disc tracklists; the N label sets
  // are only materialised for print/export. Fetch fills the per-disc tracklists.
  async function loadMultiDisc(withDur = data.showTrackDuration) {
    if (!data.album.trim() || !data.artist.trim()) return;
    setMultiDiscLoading(true);
    try {
      const { discs: split, year } = await fetchDiscs(data.artist, data.album);
      const total = Math.max(2, split.length || 2);
      const discTracklists = Array.from({ length: total }, (_, i) => {
        const joined = split[i] ? split[i].join('\n') : i === 0 ? data.tracklist : '';
        return withDur ? joined : stripDurations(joined);
      });
      update({
        multiDisc: true,
        discTotal: total,
        discNumber: 1,
        discTracklists,
        showTracklist: true,
        ...(year && !data.year ? { year } : {}),
      });
    } catch (err) {
      console.warn('Multi-disc fetch failed:', err);
    } finally {
      setMultiDiscLoading(false);
    }
  }

  // Manually set the disc count (resizes per-disc tracklists, preserving them).
  function setDiscCount(n: number) {
    const total = Math.max(1, Math.min(20, Math.floor(n) || 1));
    setData((d) => {
      const lists = d.discTracklists.slice(0, total);
      while (lists.length < total) lists.push('');
      return { ...d, multiDisc: total > 1, discTotal: total, discTracklists: lists };
    });
  }

  function setSpineCount(n: number) {
    update({ spineCount: Math.max(1, Math.min(20, Math.floor(n) || 1)) });
  }

  function setDiscTracklist(i: number, value: string) {
    setData((d) => {
      const lists = d.discTracklists.slice();
      lists[i] = value;
      return { ...d, discTracklists: lists };
    });
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
    ...(data.frontTracklist
      ? [
          {
            key: 'front-tracks',
            title: 'Tracks',
            font: { value: data.trackFont, onChange: (f: string) => onFontSelect('track', f) },
            size: {
              id: 'front-track-size',
              value: data.trackSize,
              min: 1.2,
              max: 4,
              onChange: (v: number) => update({ trackSize: v }),
            },
            opacity: {
              id: 'front-track-opacity',
              value: data.trackOpacity,
              onChange: (v: number) => update({ trackOpacity: v }),
            },
          } satisfies TypoField,
        ]
      : []),
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
      key: 'tl-title',
      title: 'Album',
      size: { id: 'tl-title-size', value: data.tlTitleSize, min: 2, max: 8, onChange: (v) => update({ tlTitleSize: v }) },
    },
    {
      key: 'tl-artist',
      title: 'Artist',
      size: { id: 'tl-artist-size', value: data.tlArtistSize, min: 1.5, max: 6, onChange: (v) => update({ tlArtistSize: v }) },
    },
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
  // Materialised per-disc label data (multi-disc entries become N) for export + twins.
  const outputs = expandDiscs(discs);
  const layoutFrontSize = orientedFrontSize(frontSize, data.verticalMode);

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
        setupUrl={() => setupUrl(discs)}
        exporting={exporting}
      />

      <main className="flex flex-1 flex-col items-start gap-24 overflow-auto bg-background p-12 pt-5">
        <section className="relative flex w-full flex-wrap items-start gap-x-[clamp(6rem,8vw,9rem)] gap-y-8 pb-20">
          <div className="flex shrink-0 flex-col gap-2">
            <SizeSelect label="Cover" value={frontSize} presets={FRONT_PRESETS} onChange={setFrontSize} />
            <FrontPreview
              data={eff}
              size={layoutFrontSize}
              update={update}
              onCover={onCover}
              onCover2={onCover2}
            />
          </div>
          <aside className="flex w-80 flex-col gap-2">
          <Button variant="outline" className="w-fit" onClick={clearDisc}>
            Clear
          </Button>
          {data.doubleAlbum ? (
            <div className="flex flex-col gap-2">
              <CoverControl
                label="Fetch cover 1"
                loading={coverLoading}
                onFetch={() => void loadCovers()}
                onUpload={onCover}
                onGenerate={generateCover}
                genModel={genModel}
                onGenModel={setGenModel}
                options={coverOptions}
                index={coverIndex}
                onCycle={cycleCover}
              />
              <CoverControl
                label="Fetch cover 2"
                loading={coverLoading2}
                onFetch={() => void loadCovers2()}
                onUpload={onCover2}
                onGenerate={generateCover2}
                genModel={genModel}
                onGenModel={setGenModel}
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
              onUpload={onCover}
              onGenerate={generateCover}
              genModel={genModel}
              onGenModel={setGenModel}
              options={coverOptions}
              index={coverIndex}
              onCycle={cycleCover}
            />
          )}
          <SpotifyControl
            onApply={(patch) => {
              // Imported data replaces any fetched cover options, and the new
              // artist/album shouldn't re-trigger the auto cover fetch.
              setCoverOptions([]);
              setCoverIndex(0);
              const album = patch.album ?? data.album;
              const artist = patch.artist ?? data.artist;
              lastCoverKey.current = `${artist}|${album}`.toLowerCase();
              const tracklist =
                patch.tracklist && !data.showTrackDuration
                  ? stripDurations(patch.tracklist)
                  : patch.tracklist;
              update({ ...patch, ...(tracklist !== undefined ? { tracklist } : {}) });
            }}
          />
          <div className="flex w-full items-center justify-between">
            <Label htmlFor="multi-disc" className="text-xs">
              Multi-disc album
            </Label>
            <Switch
              id="multi-disc"
              checked={data.multiDisc}
              onCheckedChange={(v) => {
                if (v) void loadMultiDisc();
                else update({ multiDisc: false, discTotal: 1 });
              }}
            />
          </div>
          {data.multiDisc && (
            <div className="flex w-full items-center justify-between">
              <Label htmlFor="disc-count" className="text-xs">
                Discs
              </Label>
              <CountInput id="disc-count" value={data.discTotal} min={1} max={20} onCommit={setDiscCount} />
            </div>
          )}
          {multiDiscLoading && (
            <span className="text-xs text-muted-foreground">Fetching discs…</span>
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
          <div className="flex w-full items-center justify-between">
            <Label htmlFor="show-chamfer" className="text-xs">
              Chamfered corner
            </Label>
            <Switch
              id="show-chamfer"
              checked={data.showChamfer}
              onCheckedChange={(v) => update({ showChamfer: v })}
            />
          </div>
          <div className="flex w-full items-center justify-between">
            <Label htmlFor="vertical-mode" className="text-xs">
              Vertical mode
            </Label>
            <Switch
              id="vertical-mode"
              checked={data.verticalMode}
              onCheckedChange={(v) => update({ verticalMode: v })}
            />
          </div>
          {!data.doubleAlbum && (
            <div className="flex w-full items-center justify-between">
              <Label htmlFor="full-height" className="text-xs">
                Free layout
              </Label>
              <Switch
                id="full-height"
                checked={data.fullHeight}
                onCheckedChange={(v) => update({ fullHeight: v })}
              />
            </div>
          )}
          {!data.doubleAlbum && (
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Label htmlFor="show-qr" className="text-xs">
                  QR tracklist
                </Label>
                {data.showQr && <CopyShareButton data={eff} />}
              </div>
              <Switch
                id="show-qr"
                checked={data.showQr}
                onCheckedChange={(v) => update({ showQr: v })}
              />
            </div>
          )}
          {!data.doubleAlbum && (
            <div className="flex w-full items-center justify-between">
              <Label htmlFor="front-tracklist" className="text-xs">
                Tracklist on cover
              </Label>
              <Switch
                id="front-tracklist"
                checked={data.frontTracklist}
                onCheckedChange={(v) => {
                  update({ frontTracklist: v });
                  if (v && !data.tracklist.trim()) void autoFillTracklist();
                }}
              />
            </div>
          )}
          <div className="flex w-full items-center justify-between">
            <Label htmlFor="hide-front-text" className="text-xs">
              Hide cover text
            </Label>
            <Switch
              id="hide-front-text"
              checked={data.doubleHideText}
              onCheckedChange={(v) => update({ doubleHideText: v })}
            />
          </div>
          <div className="flex w-full items-center justify-between">
            <Label htmlFor="show-spine" className="text-xs">
              Spine
            </Label>
            <Switch
              id="show-spine"
              checked={data.showSpine}
              onCheckedChange={(v) => update({ showSpine: v })}
            />
          </div>
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
          </aside>
          <aside className="w-80 shrink-0">
          <LabelControls
            fields={frontFields}
            families={families}
            fontsLoading={fontsLoading}
            palette={palette}
            bgColor={data.bgColor}
            onBgColor={(h) => update({ bgColor: h })}
            bgOpacity={
              data.frontTracklist ||
              data.showQr ||
              ((data.doubleAlbum || data.fullHeight) && !data.doubleHideText)
                ? { value: data.textBgOpacity, onChange: (v) => update({ textBgOpacity: v }) }
                : undefined
            }
            imageScale={
              data.fullHeight
                ? {
                    value: Math.min(1, Math.max(0.5, data.fullHeightScale)),
                    onChange: (v) => update({ fullHeightScale: v }),
                  }
                : undefined
            }
            coverPadding={
              !data.doubleAlbum && !data.fullHeight
                ? { value: data.coverPadding, onChange: (v) => update({ coverPadding: v }) }
                : undefined
            }
            textColor={data.textColor}
            onTextColor={(h) => update({ textColor: h })}
            letterSpacing={data.letterSpacing}
            onLetterSpacing={(v) => update({ letterSpacing: v })}
            lineHeight={data.lineHeight}
            onLineHeight={(v) => update({ lineHeight: v })}
            titleGap={{ value: data.titleArtistGap, onChange: (v) => update({ titleArtistGap: v }) }}
          />
          </aside>
          <h2
            aria-hidden
            className="pointer-events-none absolute right-0 bottom-0 text-5xl leading-[1.05] font-bold uppercase"
            style={{
              color: 'color-mix(in srgb, var(--background) 85%, black 15%)',
              fontFamily: 'var(--font-display)',
            }}
          >
            Cover
          </h2>
        </section>

        <>
          {data.showSpine && (
            <section className="relative flex w-full flex-wrap items-start gap-8 border-t border-border pt-24 pb-20">
              <div className="flex shrink-0 flex-col gap-2">
                <SizeSelect label="Spine" value={spineSize} presets={SPINE_PRESETS} onChange={setSpineSize} />
                <SpinePreview data={eff} size={spineSize} />
              </div>
              <aside className="flex w-80 flex-col gap-2">
              <div className="flex w-80 items-center justify-between">
                <Label htmlFor="spine-count" className="text-xs">
                  Copies
                </Label>
                <CountInput id="spine-count" value={data.spineCount} min={1} max={20} onCommit={setSpineCount} />
              </div>
              <div className="flex w-80 items-center justify-between">
                <Label htmlFor="spine-album" className="text-xs">
                  Album
                </Label>
                <Switch
                  id="spine-album"
                  checked={data.spineShowAlbum}
                  onCheckedChange={(v) => update({ spineShowAlbum: v })}
                />
              </div>
              <div className="flex w-80 items-center justify-between">
                <Label htmlFor="spine-artist" className="text-xs">
                  Artist
                </Label>
                <Switch
                  id="spine-artist"
                  checked={data.spineShowArtist}
                  onCheckedChange={(v) => update({ spineShowArtist: v })}
                />
              </div>
              </aside>
              <h2
                aria-hidden
                className="pointer-events-none absolute right-0 bottom-0 text-5xl leading-[1.05] font-bold uppercase"
                style={{
                  color: 'color-mix(in srgb, var(--background) 85%, black 15%)',
                  fontFamily: 'var(--font-display)',
                }}
              >
                Spine
              </h2>
            </section>
          )}

          {data.showTracklist && (
            <section className="relative flex w-full flex-wrap items-start gap-8 border-t border-border pt-24 pb-20">
              <div className="flex shrink-0 flex-col gap-2">
                <SizeSelect
                  label="Tracklist"
                  value={tracklistSize}
                  presets={TRACKLIST_PRESETS}
                  onChange={setTracklistSize}
                />
                {data.multiDisc ? (
                  <div className="flex flex-col gap-3">
                    {Array.from({ length: data.discTotal }, (_, i) => (
                      <TracklistPreview
                        key={i}
                        data={{ ...tlEff, discNumber: i + 1, tracklist: data.discTracklists[i] ?? '' }}
                        size={tracklistSize}
                        update={(patch) =>
                          'tracklist' in patch ? setDiscTracklist(i, patch.tracklist ?? '') : update(patch)
                        }
                      />
                    ))}
                  </div>
                ) : (
                  <TracklistPreview data={tlEff} size={tracklistSize} update={update} />
                )}
              </div>
              <aside className="flex w-80 flex-col gap-2">
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
                  <Label htmlFor="tl-duration" className="text-xs">
                    Durations
                  </Label>
                  <Switch
                    id="tl-duration"
                    checked={data.showTrackDuration}
                    onCheckedChange={(v) => {
                      if (!v) {
                        update({
                          showTrackDuration: false,
                          tracklist: stripDurations(data.tracklist),
                          tracklist2: stripDurations(data.tracklist2),
                          discTracklists: data.discTracklists.map(stripDurations),
                        });
                        return;
                      }
                      update({ showTrackDuration: true });
                      const hasDur =
                        data.tracklist.includes('\t') || data.discTracklists.some((t) => t.includes('\t'));
                      if (!hasDur) void (data.multiDisc ? loadMultiDisc(true) : autoFillTracklist(true));
                    }}
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
                  <Label htmlFor="tl-qr" className="text-xs">
                    QR tracklist
                  </Label>
                  <Switch
                    id="tl-qr"
                    checked={data.tlShowQr}
                    onCheckedChange={(v) => update({ tlShowQr: v })}
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
              </aside>
              <h2
                aria-hidden
                className="pointer-events-none absolute right-0 bottom-0 text-5xl leading-[1.05] font-bold uppercase"
                style={{
                  color: 'color-mix(in srgb, var(--background) 85%, black 15%)',
                  fontFamily: 'var(--font-display)',
                }}
              >
                Tracklist
              </h2>
            </section>
          )}
        </>
      </main>

      <MdLogo className="fixed right-5 bottom-5 z-10" />

      {/* Hidden SVG twins for every disc — the precise vector source for export. */}
      <div aria-hidden className="pointer-events-none fixed top-0 -left-[99999px] opacity-0">
        {outputs.map((disc, i) => {
          const e = effFor(disc);
          const te = tlEffFor(disc);
          return (
            <div key={i}>
              <FrontLabel
                ref={(el) => void (twinRefs.current[`${i}-front`] = el)}
                {...e}
                size={frontSize}
              />
              <SpineLabel ref={(el) => void (twinRefs.current[`${i}-spine`] = el)} {...e} size={spineSize} />
              <TracklistSheet ref={(el) => void (twinRefs.current[`${i}-tracklist`] = el)} {...te} size={tracklistSize} />
            </div>
          );
        })}
      </div>

      <ConfirmModal
        open={pendingImport !== null}
        title="Load this setup?"
        message={`This link contains ${pendingImport?.length ?? 0} label(s). Loading it replaces your current ${discs.length} label(s).`}
        confirmLabel="Load"
        cancelLabel="Don't load"
        onConfirm={applyImport}
        onCancel={() => setPendingImport(null)}
      />

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
          tracklistSize={tracklistSize}
          onClose={() => setPrintOpen(false)}
        />
      )}
    </div>
  );
}
