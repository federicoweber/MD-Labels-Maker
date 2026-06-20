// Google Fonts integration: list fetching (Developer API), on-demand loading
// for the live preview, and font-file inlining for PNG export.

/** Curated fallback list, used when no API key is configured. */
export const CURATED_FONTS = [
  'Roboto',
  'Open Sans',
  'Montserrat',
  'Lato',
  'Poppins',
  'Oswald',
  'Raleway',
  'Inter',
  'Bebas Neue',
  'Playfair Display',
  'Merriweather',
  'Anton',
  'Archivo',
  'Space Grotesk',
  'DM Sans',
  'Work Sans',
  'Josefin Sans',
  'Abril Fatface',
  'Pacifico',
  'Permanent Marker',
];

const API_KEY = import.meta.env.VITE_GOOGLE_FONTS_API_KEY as string | undefined;

export interface FontListResult {
  families: string[];
  usingFallback: boolean;
}

/** Fetch the full Google Fonts list (popularity-sorted) or the curated fallback. */
export async function fetchFontList(): Promise<FontListResult> {
  if (!API_KEY) {
    return { families: CURATED_FONTS, usingFallback: true };
  }
  try {
    const res = await fetch(
      `https://www.googleapis.com/webfonts/v1/webfonts?sort=popularity&key=${API_KEY}`,
    );
    if (!res.ok) throw new Error(`Google Fonts API ${res.status}`);
    const data = (await res.json()) as { items: { family: string }[] };
    return { families: data.items.map((i) => i.family), usingFallback: false };
  } catch (err) {
    console.warn('Falling back to curated font list:', err);
    return { families: CURATED_FONTS, usingFallback: true };
  }
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
  const fresh = families.filter((f) => !menuLoaded.has(f));
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
  const css = await fetchFontCss(family);
  const fileUrls = [...new Set([...css.matchAll(WOFF2_URL)].map((m) => m[1]))];
  const dataUrls = await Promise.all(fileUrls.map(fetchAsDataUrl));
  let out = css;
  fileUrls.forEach((url, i) => {
    out = out.split(url).join(dataUrls[i]);
  });
  return out;
}
