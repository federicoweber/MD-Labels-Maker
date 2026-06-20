# MiniDisc Label Maker

A single-page app for designing and exporting printable **MiniDisc labels** — front/face label, spine, and an optional jewel-case tracklist sheet. Drop an album cover, type the title/artist/tracks directly on the labels, and export print-ready PNGs at true physical size (300 DPI).

## Features

- **Direct editing** — drop/click the cover on the preview; type the title (multiline), artist, and tracks in place.
- **Auto colours** — the dominant colour of the cover becomes the background, with a contrasting grayscale text shade. A WipEout *team-select* style picker lets you choose from sampled cover swatches, eyedrop any pixel, or pick a custom colour.
- **Per-label sizes** — a dropdown on each label with common MiniDisc sizes (face 34×52 / 36.5×53.5 / 50×35 mm, spine 60×3 / 54×3.5 mm, jewel-case tracklist 70×50 / 74×54 mm).
- **Typography** — searchable Google Fonts (each previewed in its own face) plus bundled WipEout display fonts; adjustable title/artist sizes; optional artist (for mixtapes).
- **Export** — per-label PNGs at 300 DPI with the cover and chosen font embedded.
- **WipEout-inspired UI** — F500 Angular type, warm-gray theme, light/dark, angular panels.

## Development

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build
```

### Google Fonts (optional)

For the full searchable Google Fonts list, add a free [Web Fonts Developer API](https://developers.google.com/fonts/docs/developer_api) key: copy `.env.example` to `.env.local` and set `VITE_GOOGLE_FONTS_API_KEY`. Without a key the app uses a small curated list. The bundled WipEout fonts work with no key.

## Credits & attribution

- **UI design inspiration:** the [WipEout 3 React site](https://wipeout3.app/) and its source — [devhowyalike/wipeout3-react](https://github.com/devhowyalike/wipeout3-react).
- **Functional inspiration:** [jkap/minidisc-label-maker](https://github.com/jkap/minidisc-label-maker) ([md-label.jkap.io](https://md-label.jkap.io/)).
- **WipEout fonts** (F500 Angular, FX300 Angular, F5000, Amalgama): [NR74W/WipEout-Fonts](https://github.com/NR74W/WipEout-Fonts).
- **Label dimensions / template:** [atriptych/Minidisc-Label-Template](https://github.com/atriptych/Minidisc-Label-Template), the [minidisc.org labels table](https://www.minidisc.org/part_Labels.html), and [planetedisque](https://www.planetedisque.com/en/music-cassette-minidisc/1318-42-minidisc-labels-50-x-35-mm-6096445052081.html).

Fonts and brands are property of their respective owners; used here for a personal labelling tool.

## Tech

React + TypeScript + Vite, Tailwind CSS v4, shadcn/ui. Labels render as SVG (mm `viewBox`) for exact-size, vector-quality PNG export.
