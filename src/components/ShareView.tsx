import { useMemo } from 'react';
import MdLogo from '@/components/MdLogo';
import { decodeShare } from '@/lib/share';
import { splitTrack } from '@/lib/tracklist';

/**
 * Read-only "digital insert" opened from a label's QR code (#s=…): the album
 * title, artist, and tracklist decoded from the URL fragment.
 */
export default function ShareView({ encoded }: { encoded: string }) {
  const data = useMemo(() => {
    try {
      return decodeShare(encoded);
    } catch {
      return null;
    }
  }, [encoded]);

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
    <div className="mx-auto flex min-h-svh w-full max-w-md flex-col gap-6 p-8">
      <header className="border-b pb-4">
        {data.disc && (
          <p className="text-xs tracking-wide text-muted-foreground uppercase">Disc {data.disc}</p>
        )}
        <h1 className="text-2xl font-bold">{data.album || 'Untitled'}</h1>
        {data.artist && <p className="text-muted-foreground">{data.artist}</p>}
      </header>

      {tracks.length > 0 ? (
        <ol className="flex flex-col">
          {tracks.map((line, i) => {
            const { title, dur } = splitTrack(line);
            return (
              <li key={i} className="flex items-baseline gap-3 border-b border-border/50 py-1.5">
                <span className="w-5 text-right text-xs text-muted-foreground tabular-nums">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">{title}</span>
                {dur && <span className="text-xs text-muted-foreground tabular-nums">{dur}</span>}
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="text-sm text-muted-foreground">No tracklist on this label.</p>
      )}

      <footer className="mt-auto pt-6">
        <a href={import.meta.env.BASE_URL} title="MiniDisc Labels Factory">
          <MdLogo className="h-8" />
        </a>
      </footer>
    </div>
  );
}
