---
name: verify
description: Build, run, and drive the MiniDisc label maker to verify changes at the UI surface.
---

# Verifying md_labels_maker

Vite + React SPA, no backend. All state lives in localStorage under the key `md-labels`
(`{ version: 1, discs: LabelData[] }`); saved discs are merged onto the INITIAL defaults in
`src/App.tsx`, so partial disc objects are fine when seeding.

## Launch

```bash
npm run dev   # https://127.0.0.1:5173/ — HTTPS (self-signed) for Spotify OAuth
```

The dev server serves HTTPS with a self-signed cert (@vitejs/plugin-basic-ssl),
so Playwright needs a context with `ignoreHTTPSErrors: true` (create one via
`page.context().browser().newContext(...)` in run_code_unsafe). For plain-HTTP
testing, `npm run dev -- --port 5199` still works but Spotify controls need the
.env client ID either way (they're hidden without one).

Drive with Playwright MCP tools (browser_navigate / run_code_unsafe / take_screenshot).

## Seeding a test label

Real covers come from iTunes/MusicBrainz (needs network + album/artist typed). For deterministic
visual tests, generate a canvas data URL and write it into localStorage, then reload:

```js
const c = document.createElement('canvas'); c.width = c.height = 600;
// ...draw obvious asymmetric bands (e.g. L/C/R) so cropping/panning is visible...
localStorage.setItem('md-labels', JSON.stringify({
  version: 1,
  discs: [{ coverDataUrl: c.toDataURL(), album: 'Test Album', artist: 'Test Artist' }],
}));
location.reload();
```

## Flows worth driving

- Front preview (interactive DOM) vs the hidden SVG twin (`div[aria-hidden] svg` at the bottom of
  the page) — the twin is what exports/prints, so check both stay in sync.
- "Print…" opens PrintView; screenshot the sheet to verify the packed SVG labels.
- Toggles in the left Front section (chamfer, double album, full-height cover, spine, tracklist).

## Gotchas

- Clicking anywhere on a cover slot opens a native file chooser. In Playwright these queue up as
  modal state and block everything — cancel with `browser_file_upload` (no `paths`). Avoid stray
  clicks on cover areas; when testing click-through intentionally, expect exactly one chooser.
- Playwright's relative screenshot paths land in the MCP server's cwd (`/Users/federico/fwd_projects`),
  not the repo. Use absolute paths.
- `npx eslint src/App.tsx` has 3 pre-existing `react-hooks/set-state-in-effect` errors (as of
  2026-07); don't attribute them to new changes.
