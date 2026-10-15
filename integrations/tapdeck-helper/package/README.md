# Tapdeck Helper installer

**This is the only helper package to install for the current Tapdeck app.** No separate AmigaVision, IGDB or TATE installer is needed.

Copy this entire folder to `/media/fat/Tapdeck-Helper`, then run:

```sh
sh /media/fat/Tapdeck-Helper/install.sh
```

One service on port 8184 supplies IGDB ratings, local artwork, Neo Geo AES/MVS launching, AmigaVision launching and TATE metadata. Migration retains existing credentials, rating cache and BIOS settings. Use app version 1.0.5 or later: reload updated development source or build/install the updated standalone APK. A fresh install requires connection setup, optional IGDB credentials/local artwork, and Full Refresh for XML metadata.

On a fresh installation, the helper creates `Tapdeck` for settings/installation backups and later `Tapdeck-IGDB` for its ratings cache. The latter is a retained data-folder name, not another service to install. It does not install old Zaparoo launcher overrides, test MGLs or Amiga listener files.

The installer backs up and stops the three old services and checks the replacement before reporting success. To restore the previous services:

```sh
sh /media/fat/Tapdeck-Helper/rollback.sh
```

Also reload the app version from before consolidation when rolling back. Full behaviour, data paths and validation: [Tapdeck Helper documentation](../README.md).
