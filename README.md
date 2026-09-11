# Tapdeck — section 01

A native React Native / Expo app for iPhone and Android. The first section implements the Collector’s Binder library and the full-screen game card. The browser version is a local design preview of the same React Native components, not a replacement for the native app.

## Try it

The local preview prepared in this workspace is at http://localhost:8082 while its server is running. Tap a game card, expand the story, save a game, then close it and use the bookmark above the collection to show saved games. Search accepts titles, systems, genres, developers and years. The adjacent control changes the sort order.

For native development, use Node.js 24 LTS and run these commands in this directory:

```sh
npm ci
npm start
```

Open the project in an Expo Go version supporting SDK 57 on an iPhone or Android device on the same network. Expo’s terminal displays the QR code. A development build is the alternative if the installed Expo Go version does not support this SDK. Windows can run the development server for both phones; a local iOS simulator requires macOS/Xcode. No account, signing credentials or App Store deployment has been configured for this first section.

To reproduce the local browser preview:

```sh
npx expo export --platform web --output-dir dist
node scripts/preview.mjs dist
```

Then open http://localhost:8082. This server binds only to the local computer.

## Working in this section

- An eight-game sample library: seven real artwork-pack covers and an Amiga example with an intentional missing-art treatment.
- Console, computer and arcade filters; compact searchable system and genre selectors; card and thumbnail-list views; search; collection/title/year sorting; empty states.
- Full-screen card opening/closing, MiSTer box-plus-screenshot artwork with a thin CRT bezel and native composite-CRT treatment where available, metadata, expandable description and fixed actions.
- Save for later, with persistence across restarts and a saved-only filter.
- Warm paper, serif headings, consistent borders, deterministic edge wear, clean cards for recent releases.
- Native press feedback and haptics, reduced-motion handling, safe areas and Android back handling.

## Explicit boundaries

The game list is bundled sample data, not a scan of your MiSTer. No game is reported as installed or played. The launch control is disabled and explains why. Playlists and discovery are visibly marked as later sections. “Save for later” will provide a starting point for playlist work, but is not yet a playlist editor.

No physical iPhone, Android phone, emulator or MiSTer was connected during this build. Native JavaScript bundle checks passed for both platforms; these are not signed IPA/APK binaries. Native device testing, accessibility screen-reader testing and MiSTer integration remain separate next checks.

## Validation

```sh
npm run typecheck
npm test
# With the local production preview running on port 8082:
npm run test:ui
# Native/web JavaScript bundle validation, without Hermes bytecode:
npx expo export --platform all --no-bytecode
```

Checked on 10 September 2026: TypeScript passes; five domain tests pass; four browser interaction tests pass. Browser tests cover search/category intersections, empty states, single-result card dimensions, story expansion, saving/removing/reloading, disabled launch, sorting, connection information, keyboard dismissal, loaded artwork, no runtime errors and screenshots at 390×844, 360×740 and 1280×1000.

## Artwork and design

The approved reference is the four-view Collector’s Binder mockup in the parent outputs directory. The interface is recreated with native components, not a screenshot placed behind invisible buttons.

Original covers, metadata and the optional box-plus-screenshot collage are from [chipster6502’s MiSTer Artwork Pack](https://github.com/chipster6502/MiSTer_artwork_pack), sourced there from the ScreenScraper community. `npm run samples` refreshes the bundled fixtures: `box2d` becomes the library cover and `mixrbv2` becomes the complete artwork on the full-screen card.

The pack documents these as alternative artwork styles: a MiSTer normally has one selected style installed, not a separate clean cover and screenshot for every title. `mixrbv2` is itself a TV-frame collage that includes gameplay and branding, so this prototype deliberately calls it a “play scene” instead of claiming it is a raw screenshot. A production paired-artwork mode will need to fetch/cache the selected variants alongside each other, or obtain clean screenshots from a separately licensed source. The pack’s published Arcade catalogue is broader than the installed games on any given MiSTer, so pack presence must never be interpreted as installation or core support.

General Amiga computer artwork is not listed in the pack’s current published-systems table. The Amiga example therefore has an explicit fallback. The 2026 year for Super Turrican Collection is copied from pack metadata; its synopsis describes earlier editions. This illustrates why release metadata may need correction rather than invention.

Card wear is a separate non-destructive overlay and currently applies to releases at least 20 years old. Unknown years remain neutral. Play history has no effect on wear. Portrait and landscape artwork use `contain`; remaining space becomes a dark archival mount.

Typography: Bodoni Moda and DM Sans, bundled locally via Expo Google Fonts (SIL Open Font License). Paper texture: generated for this project with the built-in image-generation tool; see `docs/paper-texture-prompt.md`. Edge details and icons are code-native SVG rendered with react-native-svg.

On iPhone and Android, the full-card `mixrbv2` image is rendered through a small Expo GL shader with barrel curvature and a mild screen vignette. A project-generated transparent VHS overlay adds `CH 03`, tracking tears and static; `assets/vhs-overlay.png` remains the user-supplied reference, while `assets/vhs-overlay-ch03.png` is the active overlay. The browser preview uses the same visual treatment without GPU-level animation. No physical device has yet been used to tune the native effect.

## Structure

- `src/Tapdeck.tsx`: library, sample connection sheet and saved-game state.
- `src/components/GameCard.tsx`: the reusable trading card.
- `src/components/Detail.tsx`: full-screen card and actions.
- `src/components/Paper.tsx`: paper and wear layers.
- `src/theme.ts`, `src/styles.ts`: visual constants and layout.
- `src/data/`: bundled sample records and artwork provenance.
- `src/domain/library.ts`: search, sorting, condition and storage parsing.
- `tests/`: domain and browser interaction tests.

Next review: the look and feel of the library and full-screen card on an actual phone. Once approved, build playlist creation and editing while retaining these card components.
