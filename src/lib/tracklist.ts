// Fetch an album's tracklist from MusicBrainz (free, CORS-enabled, no key).

interface MbReleaseSearch {
  releases?: { id: string; score?: number; date?: string }[];
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
  media?: { tracks?: { title: string }[] }[];
}

export interface TracklistResult {
  tracks: string[];
  year: string;
}

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
      tracks.push(title);
    }
  }
  return { tracks, year: data.date?.slice(0, 4) ?? '' };
}
