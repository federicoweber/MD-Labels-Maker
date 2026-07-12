// Share a label's text content as a compact URL: album/artist/tracklist are
// deflated (fflate) and base64url-encoded into the #s= fragment, which the app
// decodes into a read-only "digital insert" page (ShareView). `qrPath` renders
// the URL as QR modules for the printed label.

import { deflateSync, inflateSync, strToU8, strFromU8 } from 'fflate';
import qrcode from 'qrcode-generator';

export interface ShareData {
  album: string;
  artist: string;
  tracklist: string;
  /** "n/m" when part of a multi-disc set. */
  disc?: string;
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
  const payload = JSON.stringify([d.album, d.artist, d.tracklist, d.disc ?? '']);
  return toBase64Url(deflateSync(strToU8(payload), { level: 9 }));
}

export function decodeShare(encoded: string): ShareData {
  const payload = strFromU8(inflateSync(fromBase64Url(encoded)));
  const [album, artist, tracklist, disc] = JSON.parse(payload) as string[];
  return {
    album: album ?? '',
    artist: artist ?? '',
    tracklist: tracklist ?? '',
    disc: disc || undefined,
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

/** Render `text` as QR modules (auto version, error correction L). */
export function qrPath(text: string): QrModules {
  const qr = qrcode(0, 'L');
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
