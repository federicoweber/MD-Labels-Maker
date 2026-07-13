import { useEffect, useMemo, useState } from 'react';
import MdMark from '@/components/MdMark';
import { FwdMark } from '@/components/QrGraphic';
import { decodeShare } from '@/lib/share';
import { loadFontForPreview } from '@/lib/fonts';
import { fetchCovers, splitBoldArtist, splitTrack } from '@/lib/tracklist';
import { generateGolCover } from '@/lib/gol';

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

  // The cover image itself won't fit a scannable QR, but its source URL does:
  // newer links carry the exact cover the label used. Older links (or uploaded
  // covers, which have no public URL) fall back to a Cover Art Archive search.
  const [fetchedCover, setFetchedCover] = useState<string | null>(null);
  const album = data?.album ?? '';
  const artist = data?.artist ?? '';
  const coverUrl = data?.coverUrl;
  // '-' marks "no cover on purpose" (playlists) — don't search either. 'gol'
  // is the deterministic Game of Life cover, regenerated here from the same
  // title + artist seed and the label's colours.
  const suppressCover = coverUrl === '-';
  const isGenerated = coverUrl === 'gol';
  useEffect(() => {
    if (suppressCover || isGenerated || coverUrl || !album || !artist) return;
    let cancelled = false;
    fetchCovers(artist, album, 1)
      .then(({ covers }) => {
        if (!cancelled && covers[0]) setFetchedCover(covers[0].dataUrl);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [suppressCover, isGenerated, coverUrl, album, artist]);
  const generatedCover = useMemo(
    () =>
      isGenerated && data
        ? generateGolCover(
            album,
            artist,
            data.bgColor || FALLBACK.bgColor,
            data.textColor || FALLBACK.textColor,
          )
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isGenerated, album, artist, data?.bgColor, data?.textColor],
  );
  const cover = suppressCover ? null : isGenerated ? generatedCover : (coverUrl ?? fetchedCover);

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
        {cover && <img src={cover} alt="" className="w-full" />}
        <header className="border-b border-current/40 pb-4">
          {data.disc && (
            <p className="text-xs tracking-wide uppercase opacity-70">Disc {data.disc}</p>
          )}
          <h1
            className="text-2xl font-bold whitespace-pre-line"
            style={{ fontFamily: `'${titleFont}', sans-serif` }}
          >
            {data.album || 'Untitled'}
          </h1>
          {data.artist && (
            <p
              className="whitespace-pre-line opacity-70"
              style={{ fontFamily: `'${artistFont}', sans-serif` }}
            >
              {data.artist}
            </p>
          )}
        </header>

        {tracks.length > 0 ? (
          <ol className="flex flex-col" style={{ fontFamily: `'${trackFont}', sans-serif` }}>
            {tracks.map((line, i) => {
              const { title, dur } = splitTrack(line);
              const { artist: trackArtist, title: trackTitle } = splitBoldArtist(title);
              return (
                <li key={i} className="flex items-baseline gap-3 border-b border-current/20 py-1.5">
                  <span className="w-5 text-right text-xs opacity-60 tabular-nums">{i + 1}</span>
                  <span className="min-w-0 flex-1">
                    {trackArtist ? (
                      <>
                        <strong>{trackArtist}</strong> {trackTitle}
                      </>
                    ) : (
                      title
                    )}
                  </span>
                  {dur && <span className="text-xs opacity-60 tabular-nums">{dur}</span>}
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="text-sm opacity-70">No tracklist on this label.</p>
        )}

        <footer className="mt-auto flex items-center gap-5 pt-6">
          <a
            href={import.meta.env.BASE_URL}
            title="MiniDisc Labels Factory"
            className="opacity-80 hover:opacity-100"
          >
            <MdMark className="h-8 w-auto" />
          </a>
          <a href="https://federicoweber.com/" title="federicoweber.com" className="opacity-70 hover:opacity-100">
            <FwdMark className="h-4 w-auto" />
          </a>
          <a
            href={import.meta.env.BASE_URL}
            title="MiniDisc Labels Factory"
            className="text-xs underline underline-offset-2 opacity-80 hover:opacity-100"
          >
            Made with MiniDisc Labels Factory
          </a>
        </footer>
      </div>
    </div>
  );
}
