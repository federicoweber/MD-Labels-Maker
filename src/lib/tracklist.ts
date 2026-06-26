// Fetch an album's tracklist from MusicBrainz (free, CORS-enabled, no key).

interface MbReleaseSearch {
  releases?: {
    id: string;
    score?: number;
    date?: string;
    'track-count'?: number;
    media?: { format?: string; 'track-count'?: number }[];
  }[];
}

export interface CoverResult {
  covers: string[];
  year: string;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Find front-cover options for an album via MusicBrainz + the Cover Art Archive,
 * returned as data URLs (so they can be embedded in the SVG export). Looks
 * across the top matching releases; deduped.
 */
export async function fetchCovers(artist: string, album: string, max = 6): Promise<CoverResult> {
  if (!artist.trim() || !album.trim()) return { covers: [], year: '' };
  const query = `release:"${album}" AND artist:"${artist}"`;
  const searchUrl = `https://musicbrainz.org/ws/2/release/?query=${encodeURIComponent(
    query,
  )}&fmt=json&limit=10`;
  const res = await fetch(searchUrl, { headers: { Accept: 'application/json' } });
  if (!res.ok) return { covers: [], year: '' };
  const search = (await res.json()) as MbReleaseSearch;
  const releases = search.releases ?? [];
  const year = releases.find((r) => r.date)?.date?.slice(0, 4) ?? '';

  const covers: string[] = [];
  for (const release of releases) {
    if (covers.length >= max) break;
    try {
      const imgRes = await fetch(`https://coverartarchive.org/release/${release.id}/front-500`);
      if (!imgRes.ok) continue;
      const blob = await imgRes.blob();
      if (blob.type.startsWith('image/')) covers.push(await blobToDataUrl(blob));
    } catch {
      /* try the next release */
    }
  }
  return { covers, year };
}
interface MbRelease {
  date?: string;
  media?: { tracks?: { title: string; length?: number }[] }[];
}

export interface TracklistResult {
  tracks: string[];
  year: string;
}

/** Format a track length (milliseconds) as "M:SS". */
export function fmtDuration(ms?: number): string {
  if (!ms || ms <= 0) return '';
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/** A track line stores "Title" or "Title\tM:SS" — split it back apart. */
export function splitTrack(line: string): { title: string; dur: string } {
  const i = line.indexOf('\t');
  return i >= 0 ? { title: line.slice(0, i), dur: line.slice(i + 1) } : { title: line, dur: '' };
}

/** Drop the duration from every line of a tracklist string. */
export function stripDurations(tracklist: string): string {
  return tracklist
    .split('\n')
    .map((l) => splitTrack(l).title)
    .join('\n');
}

const trackLine = (title: string, length?: number) => {
  const d = fmtDuration(length);
  return d ? `${title}\t${d}` : title;
};

/**
 * Look up the tracklist (and release year) for an album by artist + title.
 * Returns empty results if nothing suitable is found.
 */
export async function fetchTracklist(artist: string, album: string): Promise<TracklistResult> {
  if (!artist.trim() || !album.trim()) return { tracks: [], year: '' };

  const query = `release:"${album}" AND artist:"${artist}"`;
  const searchUrl = `https://musicbrainz.org/ws/2/release/?query=${encodeURIComponent(
    query,
  )}&fmt=json&limit=5`;
  const searchRes = await fetch(searchUrl, { headers: { Accept: 'application/json' } });
  if (!searchRes.ok) throw new Error(`MusicBrainz search ${searchRes.status}`);
  const search = (await searchRes.json()) as MbReleaseSearch;
  const release = search.releases?.[0];
  if (!release) return { tracks: [], year: '' };

  const lookupUrl = `https://musicbrainz.org/ws/2/release/${release.id}?inc=recordings&fmt=json`;
  const lookupRes = await fetch(lookupUrl, { headers: { Accept: 'application/json' } });
  if (!lookupRes.ok) throw new Error(`MusicBrainz lookup ${lookupRes.status}`);
  const data = (await lookupRes.json()) as MbRelease;

  const tracks: string[] = [];
  for (const medium of data.media ?? []) {
    for (const track of medium.tracks ?? []) {
      const title = track.title?.trim();
      if (!title || title.toLowerCase() === '[untitled]') continue;
      tracks.push(trackLine(title, track.length));
    }
  }
  return { tracks, year: data.date?.slice(0, 4) ?? '' };
}

export interface DiscsResult {
  /** One track-title array per physical disc (medium). */
  discs: string[][];
  year: string;
}

/** Look up an album's per-disc tracklists (for multi-disc albums). */
export async function fetchDiscs(artist: string, album: string): Promise<DiscsResult> {
  if (!artist.trim() || !album.trim()) return { discs: [], year: '' };

  const query = `release:"${album}" AND artist:"${artist}"`;
  const searchUrl = `https://musicbrainz.org/ws/2/release/?query=${encodeURIComponent(
    query,
  )}&fmt=json&limit=15`;
  const searchRes = await fetch(searchUrl, { headers: { Accept: 'application/json' } });
  if (!searchRes.ok) throw new Error(`MusicBrainz search ${searchRes.status}`);
  const search = (await searchRes.json()) as MbReleaseSearch;
  const releases = search.releases ?? [];
  // Prefer a CD release (so vinyl "one medium per side" doesn't inflate the disc
  // count), then the one with the most tracks (the complete album).
  const isCd = (r: (typeof releases)[number]) =>
    !!r.media?.length && r.media.every((m) => /cd/i.test(m.format ?? ''));
  const release = [...releases].sort((a, b) => {
    const cd = (isCd(b) ? 1 : 0) - (isCd(a) ? 1 : 0);
    return cd || (b['track-count'] ?? 0) - (a['track-count'] ?? 0);
  })[0];
  if (!release) return { discs: [], year: '' };

  const lookupUrl = `https://musicbrainz.org/ws/2/release/${release.id}?inc=recordings&fmt=json`;
  const lookupRes = await fetch(lookupUrl, { headers: { Accept: 'application/json' } });
  if (!lookupRes.ok) throw new Error(`MusicBrainz lookup ${lookupRes.status}`);
  const data = (await lookupRes.json()) as MbRelease;

  const discs = (data.media ?? [])
    .map((medium) =>
      (medium.tracks ?? [])
        .filter((t) => t.title?.trim() && t.title.trim().toLowerCase() !== '[untitled]')
        .map((t) => trackLine(t.title!.trim(), t.length)),
    )
    .filter((d) => d.length > 0);
  return { discs, year: data.date?.slice(0, 4) ?? '' };
}
