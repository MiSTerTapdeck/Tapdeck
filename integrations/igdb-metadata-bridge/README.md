# Tapdeck IGDB metadata bridge

This optional MiSTer service lets Tapdeck use your own IGDB credentials without placing the secret in the Android APK. It listens only on your local network at port `8184`.

When Tapdeck asks it to fill a missing rating, the bridge:

1. looks up the title in IGDB;
2. accepts it only when title and platform match exactly;
3. accepts only an exact title-and-platform match; and
4. saves the resulting rating in Tapdeck's shared MiSTer cache.

It never edits `gamelist.xml` files. Tapdeck merges cached ratings into its library for every system, including arcade cores.

## Local boxart and snaps

The helper can also serve your own PNG, JPG and JPEG artwork to Tapdeck. This works without IGDB credentials, but is off by default: turn on **Settings → Artwork cache → Use artwork folders on MiSTer** when you want to use it.

Put images directly inside `boxart` and `snaps` in any system folder on the SD card or USB drive:

```text
games/Jaguar/
  Tempest 2000.j64
  boxart/Tempest 2000.png
  snaps/Tempest 2000.jpg
games/JaguarCD/
  boxart/Battlemorph.png
  snaps/Battlemorph.png
```

Jaguar and Jaguar CD check both system folders, even when all game files live in `Jaguar`. `Jaguar CD` with a space is also recognised. Other systems use their own game folder. Match the image filename to the ROM filename without its extension, or to the exact title displayed in Tapdeck. Matching ignores letter case; it does not use fuzzy title matching.

The lookup order is **existing phone cache → your local artwork → Libretro**. Boxart and snaps are checked independently. Existing cached images are not overwritten. To deliberately replace an existing cached image, use Tapdeck's artwork-cache clearing control for that system first.

When enabled, Tapdeck reads a saved index immediately and checks for a newer index in the background when opening the app, connecting or syncing. The helper lists only system directories and their artwork folders; it never walks the ROM collection recursively. Its index is reused for one minute. Images download only when needed and use the existing download concurrency limit. After adding images, wait a minute and use **Sync library from Zaparoo**, or reopen the app. No gamelist scrape is required for these images. Turning the setting off clears its in-memory index and stops further folder indexing and local-artwork requests; Tapdeck continues with its usual cache and Libretro artwork.

Supported roots are `/media/fat/games`, `/media/usb0/games` through `/media/usb7/games`, plus `/media/fat/_Arcade/boxart` and `/media/fat/_Arcade/snaps`. Images must be ordinary files up to 20 MB; symlinked artwork folders/files are not served. The read-only `/artwork` and `/artwork/file` endpoints expose indexed artwork, not arbitrary files. Like the other helper endpoints, these are available to devices on the local network.

If the helper is absent, older, offline or has no matching image, Tapdeck continues using its cache and Libretro. Install this updated helper once to enable local folders; no Android native dependency is added.

## Install

Copy the entire `package` folder to the MiSTer SD card, then run this through SSH:

```sh
sh /media/fat/Tapdeck-IGDB/install.sh
```

The installer copies the binary to `/media/fat/Scripts` and adds a small guarded entry to `/media/fat/linux/user-startup.sh`, so it returns after reboots.

## Credentials

Enter the IGDB Client ID and Client Secret in Tapdeck’s IGDB section after installation. The credentials are saved only on the MiSTer in `/media/fat/Tapdeck/igdb.json`; the helper never returns the secret to Tapdeck.

## Build

```sh
GOOS=linux GOARCH=arm GOARM=7 CGO_ENABLED=0 go build -buildvcs=false -o tapdeck-igdb-metadata-bridge .
```
