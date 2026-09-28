# Tapdeck

Tapdeck is a native Expo app for browsing a MiSTer library from a phone. It reads the library exposed by MiSTer Remote, keeps a local copy for quick startup, fetches artwork from the configured sources, and launches the selected game through MiSTer Remote.

## What is in the app

- Library, saved games, playlists, discovery, search, sorting, and system/category filters.
- MiSTer connection and library refresh settings.
- Local artwork cache, including bundled indexes for large Arcade, C64, and Spectrum collections.
- Per-system launch routing, USB mount fallback, C64 and Spectrum autoload handling, and the AmigaVision launch route.
- Android back handling and haptic press feedback.

## Development

Use Node.js 24 LTS.

```sh
npm ci
npm start
```

Run the checks before making a build:

```sh
npm run typecheck
npm test
```

The web preview is for layout checks only. Test MiSTer connection, launch, artwork refresh, and device gestures on an Android development build before publishing an APK.

## Project layout

- `src/Tapdeck.tsx` — app state, navigation, filters, and views.
- `src/components/` — reusable card, list, artwork, detail, paper, and icon components.
- `src/domain/` — library filtering, MiSTer data, launch routing, artwork cache, metadata, playlists, and discovery.
- `src/data/` — fallback content, arcade core mapping, and bundled artwork indexes.
- `tests/` — launch, artwork, metadata, library, playlist, and discovery regression checks.
- `scripts/` — repeatable maintenance utilities for sample content, artwork indexes, and the local preview.

## Maintenance scripts

```sh
npm run samples
npm run artwork-bridge
node scripts/update-bundled-artwork-indexes.mjs
node scripts/build-arcade-core-map.mjs
```

The first two are declared package scripts. The latter two update checked-in data used to make large collections responsive before a directory listing is fetched.

## Release checks

Before creating a development, preview, or production Android build:

1. Run the two checks above.
2. Open the app and refresh the library against a real MiSTer.
3. Verify a representative game from Arcade, console, computer, and AmigaVision libraries launches correctly.
4. Confirm saved games, playlists, artwork caching, and Android back navigation on a physical phone.