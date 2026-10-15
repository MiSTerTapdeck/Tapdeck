# Storage safety

Tapdeck never mounts, unmounts, disables, formats, partitions or otherwise changes MiSTer storage.

MiSTer can assign an external drive a different `/media/usbN` slot after a reboot. When Tapdeck launches a game whose saved path begins with `/media/usbN/`, it asks MiSTer Remote to **read** the matching folder in `/media/usb0` through `/media/usb7`. It uses the first slot where the already-existing file is found. It does not change any mount point or move any file.

The Android app itself writes only to its own Android app storage: its cached library, preferences, playlists and downloaded artwork.

Tapdeck Helper makes narrowly scoped changes:

- AmigaVision writes the selected title to its existing `games/Amiga/shared/ags_boot` request file.
- IGDB configuration is stored at `/media/fat/Tapdeck/igdb.json`, and the rating cache stays at `/media/fat/Tapdeck-IGDB/ratings.json`. No gamelist is edited.
- Neo Geo launching writes `/media/fat/Tapdeck/launch-neogeo.mgl` with the selected AES/MVS configuration identity and an absolute ROM path, then asks MiSTer Remote to launch it. Existing saved BIOS configurations are reused.
- Local artwork and TATE features read explicit artwork folders and MRA rotation metadata. They never edit artwork, MRAs, cores, games or display settings.
- The installer preserves previous helper executables/startup entries under `/media/fat/Tapdeck/helper-backups`, installs `/media/fat/Scripts/tapdeck-helper`, stops the three separate services and replaces only labelled Tapdeck blocks in `/media/fat/linux/user-startup.sh`. Unrelated startup commands are preserved. A rollback script restores the previous services without changing credentials, caches or BIOS settings.

The older separate helper packages are retained for rollback with their original uninstall scripts. Tapdeck Helper includes its own rollback script; see [installation and rollback](../integrations/tapdeck-helper/README.md). None of these helpers mount, unmount, format or repartition storage.
