import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronsUpDown } from 'lucide-react';
import type { LabelData } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  coverImageUrl,
  getAllPlaylists,
  getAlbumTracks,
  getPlaylistTracks,
  handleRedirectCallback,
  imageToDataUrl,
  isConfigured,
  isLoggedIn,
  login,
  logout,
  playlistTotal,
  searchAlbums,
  thumbUrl,
  trackLines,
  type SpotifyAlbum,
  type SpotifyPlaylist,
} from '@/lib/spotify';

interface Props {
  /** Receives the label fields imported from Spotify. */
  onApply: (patch: Partial<LabelData>) => void;
}

/**
 * "Connect Spotify" plus two pickers once signed in: the user's playlists
 * (imports title + cover + tracklist) and an album search (imports everything:
 * cover, album, artist, year, tracklist). Hidden when no Client ID is baked in.
 */
export default function SpotifyControl({ onApply }: Props) {
  const [connected, setConnected] = useState(isLoggedIn());
  const [importing, setImporting] = useState(false);

  // Complete a sign-in if we just came back from Spotify's consent page.
  useEffect(() => {
    handleRedirectCallback()
      .then((signedIn) => signedIn && setConnected(isLoggedIn()))
      .catch((err) => console.warn('Spotify sign-in failed:', err));
  }, []);

  if (!isConfigured()) return null;

  if (!connected) {
    return (
      <Button variant="outline" className="w-fit" onClick={() => void login()}>
        Connect Spotify
      </Button>
    );
  }

  const importPlaylist = async (p: SpotifyPlaylist) => {
    setImporting(true);
    try {
      const coverUrl = coverImageUrl(p.images);
      const [tracks, cover] = await Promise.all([
        getPlaylistTracks(p.id),
        coverUrl ? imageToDataUrl(coverUrl).catch(() => null) : null,
      ]);
      onApply({
        album: p.name,
        tracklist: trackLines(tracks),
        ...(cover ? { coverDataUrl: cover } : {}),
      });
    } catch (err) {
      console.warn('Playlist import failed:', err);
    } finally {
      setImporting(false);
    }
  };

  const importAlbum = async (a: SpotifyAlbum) => {
    setImporting(true);
    try {
      const coverUrl = coverImageUrl(a.images);
      const [tracks, cover] = await Promise.all([
        getAlbumTracks(a.id),
        coverUrl ? imageToDataUrl(coverUrl).catch(() => null) : null,
      ]);
      onApply({
        album: a.name,
        artist: a.artists.map((x) => x.name).join(', '),
        year: a.release_date?.slice(0, 4) ?? '',
        tracklist: trackLines(tracks),
        ...(cover ? { coverDataUrl: cover } : {}),
      });
    } catch (err) {
      console.warn('Album import failed:', err);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <PlaylistPicker disabled={importing} onPick={(p) => void importPlaylist(p)} />
      <AlbumPicker disabled={importing} onPick={(a) => void importAlbum(a)} />
      {importing ? (
        <span className="text-xs text-muted-foreground">Importing…</span>
      ) : (
        <button
          type="button"
          className="text-xs text-muted-foreground underline-offset-2 hover:underline"
          onClick={() => {
            logout();
            setConnected(false);
          }}
        >
          Disconnect
        </button>
      )}
    </div>
  );
}

function Thumb({ src }: { src: string | null }) {
  return src ? (
    <img src={src} alt="" className="size-7 shrink-0 object-cover" />
  ) : (
    <div className="size-7 shrink-0 bg-muted" />
  );
}

/** The user's playlists, loaded on first open, filtered client-side. */
function PlaylistPicker({
  disabled,
  onPick,
}: {
  disabled: boolean;
  onPick: (p: SpotifyPlaylist) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!open || playlists) return;
    getAllPlaylists()
      .then(setPlaylists)
      .catch((err) => {
        console.warn('Loading playlists failed:', err);
        setError(true);
      });
  }, [open, playlists]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = playlists ?? [];
    return q ? all.filter((p) => p.name.toLowerCase().includes(q)) : all;
  }, [query, playlists]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-fit" disabled={disabled}>
          Spotify playlist
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search your playlists…" value={query} onValueChange={setQuery} />
          <CommandList>
            <CommandEmpty>
              {error ? 'Loading playlists failed.' : playlists ? 'No playlists found.' : 'Loading…'}
            </CommandEmpty>
            {results.map((p) => (
              <CommandItem
                key={p.id}
                value={p.id}
                onSelect={() => {
                  setOpen(false);
                  onPick(p);
                }}
              >
                <Thumb src={thumbUrl(p.images)} />
                <span className="truncate">{p.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">{playlistTotal(p)}</span>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/** Debounced album search over Spotify's catalog. */
function AlbumPicker({
  disabled,
  onPick,
}: {
  disabled: boolean;
  onPick: (a: SpotifyAlbum) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SpotifyAlbum[]>([]);
  const [searching, setSearching] = useState(false);
  const seq = useRef(0);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (!q) return;
    const id = ++seq.current;
    const handle = window.setTimeout(() => {
      setSearching(true);
      searchAlbums(q)
        .then((albums) => {
          if (seq.current === id) setResults(albums);
        })
        .catch((err) => console.warn('Album search failed:', err))
        .finally(() => {
          if (seq.current === id) setSearching(false);
        });
    }, 400);
    return () => window.clearTimeout(handle);
  }, [query, open]);

  // Stale results from an emptied query aren't shown (and none are fetched).
  const shown = query.trim() ? results : [];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-fit" disabled={disabled}>
          Spotify album
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search albums…" value={query} onValueChange={setQuery} />
          <CommandList>
            <CommandEmpty>
              {searching ? 'Searching…' : query.trim() ? 'No albums found.' : 'Type to search Spotify.'}
            </CommandEmpty>
            {shown.map((a) => (
              <CommandItem
                key={a.id}
                value={a.id}
                onSelect={() => {
                  setOpen(false);
                  onPick(a);
                }}
              >
                <Thumb src={thumbUrl(a.images)} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{a.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {a.artists.map((x) => x.name).join(', ')}
                    {a.release_date ? ` · ${a.release_date.slice(0, 4)}` : ''}
                  </span>
                </span>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
