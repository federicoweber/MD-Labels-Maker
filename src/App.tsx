import { useEffect, useRef, useState } from 'react';
import FrontLabel from './components/FrontLabel';
import type { LabelData } from './components/FrontLabel';
import SpineLabel from './components/SpineLabel';
import Controls from './components/Controls';
import { fetchFontList, loadFontForPreview } from './lib/fonts';
import { exportSvgToPng } from './lib/exportPng';
import { FRONT, SPINE } from './lib/dimensions';

const DEFAULT_FONT = 'Roboto';

const INITIAL: LabelData = {
  coverDataUrl: null,
  album: '',
  artist: '',
  textColor: '#ffffff',
  bgColor: '#ff00ff',
  fontFamily: DEFAULT_FONT,
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
  const [families, setFamilies] = useState<string[]>([]);
  const [fontsLoading, setFontsLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);
  const [fontError, setFontError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<'front' | 'spine' | null>(null);

  const frontRef = useRef<SVGSVGElement>(null);
  const spineRef = useRef<SVGSVGElement>(null);

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

  const update = (patch: Partial<LabelData>) => setData((d) => ({ ...d, ...patch }));

  async function onFontSelect(family: string) {
    update({ fontFamily: family });
    setFontError(null);
    try {
      await loadFontForPreview(family);
    } catch {
      setFontError(`Couldn't load "${family}". Check your connection.`);
    }
  }

  async function onExport(which: 'front' | 'spine') {
    const svg = which === 'front' ? frontRef.current : spineRef.current;
    if (!svg) return;
    setExporting(which);
    try {
      const base =
        [data.artist, data.album].map(slug).filter(Boolean).join('-') || 'minidisc';
      const dims = which === 'front' ? FRONT : SPINE;
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
    <div className="app">
      <Controls
        data={data}
        update={update}
        onFontSelect={onFontSelect}
        families={families}
        fontsLoading={fontsLoading}
        usingFallback={usingFallback}
        fontError={fontError}
        onExport={onExport}
        exporting={exporting}
      />

      <main className="stage">
        <section className="preview">
          <h2 className="preview__heading">Front</h2>
          <div className="preview__frame">
            <FrontLabel ref={frontRef} {...data} />
          </div>
        </section>

        <section className="preview">
          <h2 className="preview__heading">Spine</h2>
          <div className="preview__frame">
            <SpineLabel ref={spineRef} {...data} />
          </div>
        </section>
      </main>
    </div>
  );
}
