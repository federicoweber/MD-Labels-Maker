// Share a label's text content as a compact URL: album/artist/tracklist are
// deflated (fflate) and base64url-encoded into the #s= fragment, which the app
// decodes into a read-only "digital insert" page (ShareView). `qrPath` renders
// the URL as QR modules for the printed label.

import { deflateSync, inflateSync, strToU8, strFromU8 } from 'fflate';
import qrcode from 'qrcode-generator';
import type { LabelData } from './types';

export interface ShareData {
  album: string;
  artist: string;
  tracklist: string;
  /** "n/m" when part of a multi-disc set. */
  disc?: string;
  /** Label styling, so the viewer page matches the cover. */
  bgColor?: string;
  textColor?: string;
  titleFont?: string;
  artistFont?: string;
  trackFont?: string;
}

/** The share payload for a label (pass the derived/eff data). */
export function shareDataFor(d: LabelData): ShareData {
  return {
    album: d.album,
    artist: d.showArtist ? d.artist : '',
    tracklist: d.tracklist,
    disc: d.discTotal > 1 ? `${d.discNumber}/${d.discTotal}` : undefined,
    bgColor: d.bgColor,
    textColor: d.textColor,
    titleFont: d.titleFont,
    artistFont: d.artistFont,
    trackFont: d.trackFont,
  };
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): Uint8Array {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export function encodeShare(d: ShareData): string {
  const payload = JSON.stringify([
    d.album,
    d.artist,
    d.tracklist,
    d.disc ?? '',
    d.bgColor ?? '',
    d.textColor ?? '',
    d.titleFont ?? '',
    d.artistFont ?? '',
    d.trackFont ?? '',
  ]);
  return toBase64Url(deflateSync(strToU8(payload), { level: 9 }));
}

export function decodeShare(encoded: string): ShareData {
  const payload = strFromU8(inflateSync(fromBase64Url(encoded)));
  // Older QR codes carry only the first four fields.
  const [album, artist, tracklist, disc, bgColor, textColor, titleFont, artistFont, trackFont] =
    JSON.parse(payload) as string[];
  return {
    album: album ?? '',
    artist: artist ?? '',
    tracklist: tracklist ?? '',
    disc: disc || undefined,
    bgColor: bgColor || undefined,
    textColor: textColor || undefined,
    titleFont: titleFont || undefined,
    artistFont: artistFont || undefined,
    trackFont: trackFont || undefined,
  };
}

/** Absolute viewer URL (the deployed app's own origin + base). */
export function shareUrl(d: ShareData): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}#s=${encodeShare(d)}`;
}

export interface QrModules {
  /** Modules per side. */
  count: number;
  /** One SVG path covering every dark module on a unit grid. */
  path: string;
}

/** Render `text` as QR modules (auto version, error correction M — the size
 * headroom is spent on more forgiving scans of worn or inverted prints). */
export function qrPath(text: string): QrModules {
  const qr = qrcode(0, 'M');
  qr.addData(text, 'Byte');
  qr.make();
  const count = qr.getModuleCount();
  let path = '';
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (qr.isDark(r, c)) path += `M${c} ${r}h1v1h-1z`;
    }
  }
  return { count, path };
}
