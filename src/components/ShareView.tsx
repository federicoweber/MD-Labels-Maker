import { useEffect, useMemo } from 'react';
import MdLogo from '@/components/MdLogo';
import { decodeShare } from '@/lib/share';
import { loadFontForPreview } from '@/lib/fonts';
import { splitTrack } from '@/lib/tracklist';

// The app's default label palette/typography, for older QR codes that don't
// carry style fields.
const FALLBACK = {
  bgColor: '#6e6a63',
  textColor: '#ece8e0',
  font: 'Inconsolata',
};

/**
 * Read-only "digital insert" opened from a label's QR code (#s=…): the album
 * title, artist, and tracklist decoded from the URL fragment, rendered in the
 * label's own colours and typography.
 */
export default function ShareView({ encoded }: { encoded: string }) {
  const data = useMemo(() => {
    try {
      return decodeShare(encoded);
    } catch {
      return null;
    }
  }, [encoded]);

  const titleFont = data?.titleFont || FALLBACK.font;
  const artistFont = data?.artistFont || FALLBACK.font;
  const trackFont = data?.trackFont || FALLBACK.font;

  useEffect(() => {
    for (const family of new Set([titleFont, artistFont, trackFont])) {
      loadFontForPreview(family).catch(() => {});
    }
  }, [titleFont, artistFont, trackFont]);

  if (!data) {
    return (
      <div className="flex min-h-svh items-center justify-center p-8 text-center">
        <p className="text-muted-foreground">This link couldn't be decoded.</p>
      </div>
    );
  }

  const tracks = data.tracklist
    .split('\n')
    .map((t) => t.trim())
    .filter(Boolean);

  return (
    <div
      className="min-h-svh"
      style={{ background: data.bgColor || FALLBACK.bgColor, color: data.textColor || FALLBACK.textColor }}
    >
      <div className="mx-auto flex min-h-svh w-full max-w-md flex-col gap-6 p-8">
        <header className="border-b border-current/40 pb-4">
          {data.disc && (
            <p className="text-xs tracking-wide uppercase opacity-70">Disc {data.disc}</p>
          )}
          <h1 className="text-2xl font-bold" style={{ fontFamily: `'${titleFont}', sans-serif` }}>
            {data.album || 'Untitled'}
          </h1>
          {data.artist && (
            <p className="opacity-70" style={{ fontFamily: `'${artistFont}', sans-serif` }}>
              {data.artist}
            </p>
          )}
        </header>

        {tracks.length > 0 ? (
          <ol className="flex flex-col" style={{ fontFamily: `'${trackFont}', sans-serif` }}>
            {tracks.map((line, i) => {
              const { title, dur } = splitTrack(line);
              return (
                <li key={i} className="flex items-baseline gap-3 border-b border-current/20 py-1.5">
                  <span className="w-5 text-right text-xs opacity-60 tabular-nums">{i + 1}</span>
                  <span className="min-w-0 flex-1">{title}</span>
                  {dur && <span className="text-xs opacity-60 tabular-nums">{dur}</span>}
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="text-sm opacity-70">No tracklist on this label.</p>
        )}

        <footer className="mt-auto pt-6">
          <a href={import.meta.env.BASE_URL} title="MiniDisc Labels Factory">
            <MdLogo className="h-8" />
          </a>
        </footer>
      </div>
    </div>
  );
}
