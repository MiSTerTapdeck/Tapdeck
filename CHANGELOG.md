# Changes

## Unreleased

## 1.0.5 — 2026-10-15

- Excluded Zaparoo virtual core-launch targets from library update selections, preventing invalid-system errors during refresh. Empty indexable systems remain available for scanning new games.
- Made Tapdeck Helper the sole current installation package, disabled the old separate-helper installers, and replaced their installation instructions with migration/rollback guidance. Historical binaries and rollback support are retained.
- Removed the obsolete PC artwork-server script/command and temporary card-artwork diagnostics. Aligned app, package and native Android display versions at 1.0.5; EAS remote build-number settings are unchanged.
- Combined AmigaVision, IGDB ratings/local artwork/Neo Geo launching, and TATE metadata into one Tapdeck Helper on port 8184, with a backup-aware installer and rollback script. Existing credentials, caches and saved BIOS settings are retained. The updated helper and app must be used together.
- Preserved the device-tested Neo Geo AES/MVS launch format: separate configuration identities, ROM index 1 and absolute SD/USB ROM paths.
- Added automated GitHub validation for every push and pull request: dependency installation, type checking and tests.
- Added contributor, security, issue-reporting and third-party-notice documentation, plus monthly Dependabot update checks.
- Replaced the README gallery with current Tapdeck screenshots in numeric order.

## 1.0.4

- Added an aged trading-card frame around game-card snap artwork without changing artwork loading, card interaction or launch controls.

## 1.0.3

- Added an arcade-version picker for games with more than one installed MRA. Tapdeck groups the available Default, Alternative and MeatCores choices so the preferred version can be launched from the game card.
- Added optional TATE metadata support. With the MiSTer-side TATE bridge installed, vertically oriented arcade games are marked in game lists after a library refresh.
- Expanded the genre normalisation used by filters and cards, including SHMUP, Run and Gun, Maze, Driving and several Arcade Database labels.
- Discover now treats Brawler and Beat ’em Up as related gameplay families while retaining their separate names in lists, cards and genre filters.
- Improved the Android adaptive icon so the Tapdeck paper field fills the launcher icon.

## 1.0.2

- Added an optional local-artwork fallback. With the updated MiSTer helper installed, Tapdeck can use `boxart` and `snaps` folders beside games when no phone-cached artwork exists. It is off by default and can be disabled at any time in Settings → Artwork cache.
- Added manufacturer prefixes to console filters, including Atari Jaguar CD and SEGA Genesis 32X.
- Improved Discover ordering with rating bands, locally cached IGDB ratings, and artwork-backed featured choices across different systems where available.
- Improved global and playlist search so both use game title and developer.
- Fixed the dark Now Playing bar and restored visible separation between dark-mode game cards and the page background.
- Prevented an early End request from racing a MiSTer game launch. The Now Playing bar shows Starting and enables End after MiSTer has had time to switch cores.
- Fixed Full refresh + metadata reading Zaparoo's catalogue before a newly requested media scan had begun.
- Added a Date added to library sort. Tapdeck records when it first sees a game, so games introduced by a later sync can be found at the top.
- Refreshed the light-mode game-card stock with a subtle worn-paper edge treatment.

## 1.0.1

- Added a saved Light/Dark appearance setting in Settings → Appearance.
- Added high-contrast game titles, metadata and artwork frames for dark mode.
- Dark mode removes the paper texture and uses darker surfaces while keeping Tapdeck’s existing warm accent colour.
- Fixed box artwork disappearing when switching between dark and light themes.
- Refined game-list separators and added subtle borders to playlist cards in dark mode.
- Added an edit control and up/down arrows for ordering user playlists. Favourites and Last Played remain fixed at the top, and the chosen order is saved.
- Removed unused Android overlay and legacy external-storage permissions.
- Disabled Android backup of local app data.
- Removed the obsolete direct IGDB client and public credential configuration.
- Removed unused gamelist.xml writing code from the IGDB bridge and rebuilt its MiSTer installer binary. Ratings continue to use the bridge cache.
- Removed obsolete helper binaries and duplicate installer packages; added SHA-256 checksums for the retained installer binaries.
- Stopped tracking unused design images in Git while retaining them locally for future use.

## 1.0.0

Initial public Android release.
