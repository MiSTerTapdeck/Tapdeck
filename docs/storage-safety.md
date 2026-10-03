# Storage safety

Tapdeck never mounts, unmounts, disables, formats, partitions or otherwise changes MiSTer storage.

MiSTer can assign an external drive a different `/media/usbN` slot after a reboot. When Tapdeck launches a game whose saved path begins with `/media/usbN/`, it asks MiSTer Remote to **read** the matching folder in `/media/usb0` through `/media/usb7`. It uses the first slot where the already-existing file is found. It does not change any mount point or move any file.

The Android app itself writes only to its own Android app storage: its cached library, preferences, playlists and downloaded artwork.

The optional MiSTer helpers make narrowly-scoped changes:

- The AmigaVision helper writes the selected title to AmigaVision's existing `games/Amiga/shared/ags_boot` request file, copies its own executable to `/media/fat/Scripts`, and adds one labelled start block to `/media/fat/linux/user-startup.sh`.
- The IGDB helper copies its own executable to `/media/fat/Scripts`, stores its configuration and rating cache under `/media/fat/Tapdeck`, and adds one labelled start block to `/media/fat/linux/user-startup.sh`.

Both helper packages include an uninstall script that removes their executable and labelled startup block. Neither helper mounts or changes an SD card, USB drive, HDD, partition table or filesystem.
