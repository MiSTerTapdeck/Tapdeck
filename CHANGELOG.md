# Changes

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
