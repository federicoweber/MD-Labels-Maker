// Spotify integration: Authorization Code flow with PKCE (runs entirely in the
// browser, no backend or client secret) plus the few Web API calls the label
// maker needs. Adapted from the MD recorder's spotify module.
// https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow

import { fmtDuration } from './tracklist';

const AUTH_ENDPOINT = 'https://accounts.spotify.com/authorize';
const TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token';
const BASE = 'https://api.spotify.com/v1';

// Reading the user's playlists needs these; album search just needs a token.
const SCOPES = ['playlist-read-private', 'playlist-read-collaborative'].join(' ');

// Keys are namespaced so they can't clash with the recorder's on a shared origin.
const STORAGE = {
  verifier: 'mdl_sp_pkce_verifier',
  state: 'mdl_sp_pkce_state',
  tokens: 'mdl_sp_tokens',
};

interface StoredTokens {
  access_token: string;
  refresh_token: string;
  /** epoch ms when the access token expires */
  expires_at: number;
}

export function getClientId(): string {
  return import.meta.env.VITE_SPOTIFY_CLIENT_ID || '';
}

/** Whether a Spotify Client ID is baked into this build. */
export function isConfigured(): boolean {
  return !!getClientId();
}

function getRedirectUri(): string {
  return (
    import.meta.env.VITE_SPOTIFY_REDIRECT_URI ||
    `${window.location.origin}${import.meta.env.BASE_URL}`
  );
}

// ---------------------------------------------------------------------------
// PKCE helpers
// ---------------------------------------------------------------------------

function base64UrlEncode(bytes: ArrayBuffer): string {
  let str = '';
  for (const b of new Uint8Array(bytes)) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function randomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values, (v) => chars[v % chars.length]).join('');
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(plain));
}

// ---------------------------------------------------------------------------
// Login / callback / logout
// ---------------------------------------------------------------------------

export async function login(): Promise<void> {
  const clientId = getClientId();
  if (!clientId) throw new Error('Missing Spotify Client ID');

  const verifier = randomString(64);
  const challenge = base64UrlEncode(await sha256(verifier));
  const state = randomString(16);

  sessionStorage.setItem(STORAGE.verifier, verifier);
  sessionStorage.setItem(STORAGE.state, state);

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: getRedirectUri(),
    code_challenge_method: 'S256',
    code_challenge: challenge,
    state,
    scope: SCOPES,
  });
  window.location.assign(`${AUTH_ENDPOINT}?${params.toString()}`);
}

/**
 * If the current URL carries an OAuth `code`, exchange it for tokens.
 * Returns true if a sign-in was just completed. Safe to call on every load.
 */
export async function handleRedirectCallback(): Promise<boolean> {
  const url = new URL(window.location.href);
  const code = url.searchParams.get('code');
  const returnedState = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) {
    cleanUrl();
    throw new Error(`Spotify authorization failed: ${error}`);
  }
  if (!code) return false;

  const expectedState = sessionStorage.getItem(STORAGE.state);
  if (!returnedState || returnedState !== expectedState) {
    cleanUrl();
    throw new Error('OAuth state mismatch — please try signing in again.');
  }

  const verifier = sessionStorage.getItem(STORAGE.verifier);
  if (!verifier) {
    cleanUrl();
    throw new Error('Missing PKCE verifier — please try signing in again.');
  }

  const body = new URLSearchParams({
    client_id: getClientId(),
    grant_type: 'authorization_code',
    code,
    redirect_uri: getRedirectUri(),
    code_verifier: verifier,
  });
  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    cleanUrl();
    throw new Error(`Token exchange failed (${res.status}): ${await res.text()}`);
  }

  storeTokens(await res.json());
  sessionStorage.removeItem(STORAGE.verifier);
  sessionStorage.removeItem(STORAGE.state);
  cleanUrl();
  return true;
}

function cleanUrl(): void {
  // Drop the OAuth query params, staying on the app's base path (the app may
  // be deployed under a sub-path, so '/' would be wrong).
  window.history.replaceState({}, document.title, import.meta.env.BASE_URL);
}

export function logout(): void {
  localStorage.removeItem(STORAGE.tokens);
}

export function isLoggedIn(): boolean {
  return getStoredTokens() !== null;
}

// ---------------------------------------------------------------------------
// Token storage + refresh
// ---------------------------------------------------------------------------

function storeTokens(data: { access_token: string; refresh_token?: string; expires_in: number }): void {
  const prev = getStoredTokens();
  const tokens: StoredTokens = {
    access_token: data.access_token,
    // Spotify only returns a new refresh token sometimes; keep the old one if absent.
    refresh_token: data.refresh_token || prev?.refresh_token || '',
    expires_at: Date.now() + data.expires_in * 1000,
  };
  localStorage.setItem(STORAGE.tokens, JSON.stringify(tokens));
}

function getStoredTokens(): StoredTokens | null {
  const raw = localStorage.getItem(STORAGE.tokens);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredTokens;
  } catch {
    return null;
  }
}

let refreshInFlight: Promise<string> | null = null;

/** Returns a valid access token, refreshing it first if it's near expiry. */
async function getAccessToken(): Promise<string> {
  const tokens = getStoredTokens();
  if (!tokens) throw new Error('Not signed in');

  // Refresh ~30s before expiry to avoid mid-request 401s.
  if (Date.now() < tokens.expires_at - 30_000) return tokens.access_token;

  refreshInFlight ??= doRefresh(tokens.refresh_token);
  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

async function doRefresh(refreshToken: string): Promise<string> {
  if (!refreshToken) {
    logout();
    throw new Error('Session expired — please sign in again.');
  }
  const body = new URLSearchParams({
    client_id: getClientId(),
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });
  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    logout();
    throw new Error('Session expired — please sign in again.');
  }
  const data = await res.json();
  storeTokens(data);
  return data.access_token as string;
}

// ---------------------------------------------------------------------------
// Web API types (only the fields this app reads)
// ---------------------------------------------------------------------------

export interface SpotifyImage {
  url: string;
  height: number | null;
  width: number | null;
}

interface Paging<T> {
  items: T[];
  next: string | null;
  total: number;
}

export interface SpotifyTrack {
  name: string;
  duration_ms: number;
  uri?: string;
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  images: SpotifyImage[] | null;
  owner?: { display_name: string | null };
  // Newer Spotify API exposes the track-collection ref under `items`; older
  // responses use `tracks`. Both are { total }.
  tracks?: { total: number };
  items?: { total: number };
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  release_date?: string;
  total_tracks?: number;
  images: SpotifyImage[] | null;
  artists: { name: string }[];
}

/** An entry in a playlist; the track is under `item` (newer) or `track` (older). */
interface PlaylistTrackItem {
  item?: (SpotifyTrack & { uri?: string }) | null;
  track?: (SpotifyTrack & { uri?: string }) | null;
}

// ---------------------------------------------------------------------------
// Web API requests
// ---------------------------------------------------------------------------

interface RequestOptions {
  query?: Record<string, string | number | undefined>;
  /** Set true to skip a single 401-driven refresh+retry (internal use). */
  _retried?: boolean;
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const token = await getAccessToken();
  const url = new URL(path.startsWith('http') ? path : `${BASE}${path}`);
  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }
  const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });

  // Rate limited — respect Retry-After then try once more.
  if (res.status === 429) {
    const retryAfter = Number(res.headers.get('Retry-After') ?? '1');
    await new Promise((r) => setTimeout(r, (retryAfter + 0.25) * 1000));
    return request<T>(path, opts);
  }
  // Token rejected — force a refresh and retry once.
  if (res.status === 401 && !opts._retried) {
    return request<T>(path, { ...opts, _retried: true });
  }
  if (res.status === 401) {
    logout();
    throw new Error('Session expired — please sign in again.');
  }
  if (!res.ok) throw new Error(`Spotify API ${res.status}: ${res.statusText}`);
  return (await res.json()) as T;
}

/** Every playlist the user owns or follows (handles pagination). */
export async function getAllPlaylists(): Promise<SpotifyPlaylist[]> {
  const all: SpotifyPlaylist[] = [];
  let page = await request<Paging<SpotifyPlaylist>>('/me/playlists', {
    query: { limit: 50, offset: 0 },
  });
  // The API occasionally returns null entries for unavailable playlists.
  all.push(...page.items.filter(Boolean));
  while (page.next) {
    page = await request<Paging<SpotifyPlaylist>>(page.next);
    all.push(...page.items.filter(Boolean));
  }
  return all;
}

/** Number of tracks in a playlist, across both API shapes. */
export function playlistTotal(p: SpotifyPlaylist): number {
  return p.items?.total ?? p.tracks?.total ?? 0;
}

/**
 * Every track of a playlist, in order. Skips removed entries and podcast
 * episodes. Uses the `/items` endpoint: the older `/tracks` endpoint now
 * returns 403 for newer apps.
 */
export async function getPlaylistTracks(playlistId: string): Promise<SpotifyTrack[]> {
  const tracks: SpotifyTrack[] = [];
  const collect = (items: PlaylistTrackItem[]): void => {
    for (const entry of items) {
      const t = entry?.item ?? entry?.track;
      if (t && (!t.uri || t.uri.startsWith('spotify:track:'))) tracks.push(t);
    }
  };
  let page = await request<Paging<PlaylistTrackItem>>(`/playlists/${playlistId}/items`, {
    query: { limit: 100, offset: 0, additional_types: 'track' },
  });
  collect(page.items);
  while (page.next) {
    page = await request<Paging<PlaylistTrackItem>>(page.next);
    collect(page.items);
  }
  return tracks;
}

/** Search Spotify's catalog for albums. */
export async function searchAlbums(q: string): Promise<SpotifyAlbum[]> {
  if (!q.trim()) return [];
  const data = await request<{ albums: Paging<SpotifyAlbum> }>('/search', {
    query: { q, type: 'album', limit: 12 },
  });
  return (data.albums?.items ?? []).filter(Boolean);
}

/** Every track of an album, in order (handles pagination). */
export async function getAlbumTracks(albumId: string): Promise<SpotifyTrack[]> {
  const tracks: SpotifyTrack[] = [];
  let page = await request<Paging<SpotifyTrack>>(`/albums/${albumId}/tracks`, {
    query: { limit: 50, offset: 0 },
  });
  tracks.push(...page.items);
  while (page.next) {
    page = await request<Paging<SpotifyTrack>>(page.next);
    tracks.push(...page.items);
  }
  return tracks;
}

/** "Title" or "Title\tM:SS" lines, matching the app's tracklist format. */
export function trackLines(tracks: SpotifyTrack[]): string {
  return tracks
    .map((t) => {
      const d = fmtDuration(t.duration_ms);
      return d ? `${t.name}\t${d}` : t.name;
    })
    .join('\n');
}

/** Smallest image that's still ≥300px (or the largest available) — for covers. */
export function coverImageUrl(images: SpotifyImage[] | null): string | null {
  if (!images?.length) return null;
  const sorted = [...images].sort((a, b) => (b.width ?? 0) - (a.width ?? 0));
  const smallEnough = sorted.filter((i) => (i.width ?? 0) >= 300);
  return (smallEnough[smallEnough.length - 1] ?? sorted[0]).url;
}

/** Tiny thumbnail for picker rows. */
export function thumbUrl(images: SpotifyImage[] | null): string | null {
  if (!images?.length) return null;
  return images[images.length - 1].url;
}

/** Fetch an image and inline it as a data URL (needed for the SVG/PNG export). */
export async function imageToDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Image fetch ${res.status}`);
  const blob = await res.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
