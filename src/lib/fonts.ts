// Google Fonts integration: list fetching (Developer API), on-demand loading
// for the live preview, and font-file inlining for PNG export.

/** Curated Google Fonts offered in the picker. */
export const CURATED_FONTS = [
  'Inter',
  'Space Mono',
  'Space Grotesk',
  'Fira Sans',
  'Roboto',
  'Roboto Mono',
  'Playfair Display',
  'Inconsolata',
];

/**
 * Bundled WipEout fonts (from NR74W/WipEout-Fonts), served from /public/fonts.
 * Available in the picker and embeddable for export like Google fonts.
 */
export const WIPEOUT_FONTS: { family: string; file: string }[] = [
  { family: 'F500 Angular', file: 'F500-Angular.ttf' },
  { family: 'FX300 Angular', file: 'FX300-Angular.ttf' },
  { family: 'F5000', file: 'F5000.ttf' },
  { family: 'Amalgama', file: 'Amalgama.ttf' },
];

const WIPEOUT_NAMES = WIPEOUT_FONTS.map((f) => f.family);
const WIPEOUT_SET = new Set(WIPEOUT_NAMES);
const WIPEOUT_FILE = new Map(WIPEOUT_FONTS.map((f) => [f.family, f.file]));

export function isLocalFont(family: string): boolean {
  return WIPEOUT_SET.has(family);
}

/** Register @font-face for every bundled WipEout font (call once at startup). */
export function injectLocalFontFaces(): void {
  if (document.getElementById('wipeout-fontfaces')) return;
  const css = WIPEOUT_FONTS.map(
    (f) =>
      `@font-face{font-family:'${f.family}';src:url('/fonts/${f.file}') format('truetype');font-display:swap;}`,
  ).join('\n');
  const style = document.createElement('style');
  style.id = 'wipeout-fontfaces';
  style.textContent = css;
  document.head.appendChild(style);
}

export interface FontListResult {
  families: string[];
  usingFallback: boolean;
}

/** The bundled WipEout fonts plus the curated Google Fonts. */
export async function fetchFontList(): Promise<FontListResult> {
  return { families: [...WIPEOUT_NAMES, ...CURATED_FONTS], usingFallback: false };
}

/** css2 family token, e.g. "Open+Sans". */
function familyToken(family: string): string {
  return family.replace(/ /g, '+');
}

const cssCache = new Map<string, string>();

/**
 * Fetch the css2 stylesheet text for a family at weights 400 & 700, falling
 * back to 400 only for fonts that lack a bold weight. Cached per family.
 */
async function fetchFontCss(family: string): Promise<string> {
  const cached = cssCache.get(family);
  if (cached) return cached;

  const token = familyToken(family);
  const urls = [
    `https://fonts.googleapis.com/css2?family=${token}:wght@400;700&display=swap`,
    `https://fonts.googleapis.com/css2?family=${token}&display=swap`,
  ];
  for (const url of urls) {
    const res = await fetch(url);
    if (res.ok) {
      const css = await res.text();
      cssCache.set(family, css);
      return css;
    }
  }
  throw new Error(`Could not load font CSS for "${family}"`);
}

const menuLoaded = new Set<string>();

/**
 * Load fonts for the picker menu so each name can render in its own typeface.
 * Subsets each family to just the characters used in the names (via the css2
 * `text` param) so the payload stays tiny even for dozens of families.
 */
export function loadMenuFonts(families: string[]): void {
  // Local WipEout fonts are already registered via @font-face.
  const fresh = families.filter((f) => !menuLoaded.has(f) && !WIPEOUT_SET.has(f));
  if (fresh.length === 0) return;
  fresh.forEach((f) => menuLoaded.add(f));

  const text = [...new Set(fresh.join('').split(''))].join('');
  const params = fresh.map((f) => `family=${familyToken(f)}`).join('&');
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?${params}&text=${encodeURIComponent(text)}&display=swap`;
  document.head.appendChild(link);
}

const loadedForPreview = new Set<string>();

/** Inject a font into the document and wait until it is ready to render. */
export async function loadFontForPreview(family: string): Promise<void> {
  if (WIPEOUT_SET.has(family)) {
    // Already registered via @font-face; just ensure it's loaded.
    await document.fonts.load(`16px "${family}"`).catch(() => {});
    await document.fonts.ready;
    return;
  }
  if (!loadedForPreview.has(family)) {
    const css = await fetchFontCss(family);
    const style = document.createElement('style');
    style.dataset.font = family;
    style.textContent = css;
    document.head.appendChild(style);
    loadedForPreview.add(family);
  }
  // Trigger and await actual font loading for both weights.
  await Promise.all([
    document.fonts.load(`400 16px "${family}"`).catch(() => {}),
    document.fonts.load(`700 16px "${family}"`).catch(() => {}),
  ]);
  await document.fonts.ready;
}

async function fetchAsDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

const WOFF2_URL = /url\((https:\/\/fonts\.gstatic\.com\/[^)]+?\.woff2)\)/g;

/**
 * Build @font-face CSS with the actual font files inlined as base64 data URIs.
 * Required for PNG export: browsers do NOT load external fonts referenced by an
 * SVG that is rasterised through an <img>, so the bytes must be embedded.
 */
export async function buildEmbeddedFontCss(family: string): Promise<string> {
  // Local WipEout fonts: inline the bundled TTF directly.
  const localFile = WIPEOUT_FILE.get(family);
  if (localFile) {
    const dataUrl = await fetchAsDataUrl(`/fonts/${localFile}`);
    return `@font-face{font-family:'${family}';src:url(${dataUrl}) format('truetype');font-weight:400 700;}`;
  }
  const css = await fetchFontCss(family);
  const fileUrls = [...new Set([...css.matchAll(WOFF2_URL)].map((m) => m[1]))];
  const dataUrls = await Promise.all(fileUrls.map(fetchAsDataUrl));
  let out = css;
  fileUrls.forEach((url, i) => {
    out = out.split(url).join(dataUrls[i]);
  });
  return out;
}
