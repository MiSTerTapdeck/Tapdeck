# Tapdeck Helper

One MiSTer service and installer for AmigaVision launching, missing IGDB ratings, local artwork, separate Neo Geo AES/MVS configurations and TATE metadata. It listens on port **8184**. MiSTer Remote remains a separate dependency on port **8182** and carries out the launches.

## Install or migrate

**Use only this helper package for the current app.** The three separate helper packages are historical; their install scripts are disabled. Rollback uses saved binaries and does not rely on those scripts.

Copy this directory's `package` folder to the SD card as `/media/fat/Tapdeck-Helper`, then run on MiSTer:

```sh
sh /media/fat/Tapdeck-Helper/install.sh
```

Use Tapdeck 1.0.5 or later with this helper. If using a development client, reload the updated source; if using a standalone APK, build and install the updated app. Earlier app versions use ports 8183 and 8185 for AmigaVision and TATE and must be updated alongside this helper.

The installer checks that the binary can execute, backs up the installed helpers and startup file, stops the old services, and replaces only marked Tapdeck startup entries with one entry. Old executables remain on the SD card. It checks `/health` before reporting success and attempts to restore the previous services if installation fails after stopping them. Manually managed entries outside Tapdeck's marked blocks are left alone and cause migration to stop for review.

Installed binary: `/media/fat/Scripts/tapdeck-helper`. Log: `/tmp/tapdeck-helper.log`. It starts automatically after reboot. The three old helpers must remain stopped while this helper is running because the old IGDB helper also uses port 8184.

On a fresh installation, no old helper executables are installed. The `Tapdeck` data directory contains settings, generated Neo Geo launchers and installation backups. `Tapdeck-IGDB` is created when ratings are saved; this older name is retained to preserve existing caches, not to install a separate IGDB service. Old Zaparoo launcher TOMLs/default overrides, root `.tapdeck-*` test MGLs and `tapdeck-listener` files are not created.

## Features and existing data

- **IGDB:** credentials stay at `/media/fat/Tapdeck/igdb.json`; cached ratings stay at `/media/fat/Tapdeck-IGDB/ratings.json`. Migration preserves existing credentials; a fresh install requires entering them in Settings. Ratings retain the existing matching rules. The helper never edits `gamelist.xml`.
- **Local artwork:** opt in under Settings → Artwork cache. Existing phone cache remains first, followed by your local images, then Libretro. Place PNG/JPG/JPEG images in `boxart` and `snaps` beside games, named after the ROM without its extension or the displayed game title. Jaguar and Jaguar CD check both folders. No IGDB credentials are needed. Indexing retains the existing one-minute cache and only examines explicit artwork folders; it does not recursively scan the ROM collection. Existing phone artwork is not overwritten.
- **Neo Geo:** preserves the tested MGL: `_Console/NeoGeo`, setname `NeoGeo` for AES or `NeoGeoMVS` for MVS, `same_dir="1"`, file index `1`, delay `1`, and an **absolute ROM path**. Existing saved BIOS configurations stay in place. New users select the appropriate BIOS/system type once for each identity and choose Save Settings.
- **AmigaVision:** writes the native `ags_boot` request into the mounted shared directory, then launches its Amiga MGL through MiSTer Remote. USB slots 0–7 are checked on every launch. Existing `TAPDECK_AMIGAVISION_SHARED_DIR`, `TAPDECK_AMIGAVISION_MGL`, and `TAPDECK_MISTER_REMOTE_URL` environment overrides are retained.
- **TATE:** reads MRA rotation fields during library refresh, including nested arcade folders. The existing ten-minute scan cache is retained. It labels vertical games; it does not rotate the display or alter MRAs/settings.

Each feature keeps its own lock/cache. An IGDB request does not hold the Neo Geo or AmigaVision launch locks. There is no new recurring background scan.

## Health and routes

```sh
curl -s http://127.0.0.1:8184/health
```

Health reports `service: "tapdeck-helper"`, the existing IGDB `configured` flag, and feature capabilities. This confirms the service is reachable, not that a ROM successfully booted.

| Route | Purpose |
| --- | --- |
| `GET /health` | Status, identity and IGDB configuration state |
| `POST /configure` | Save IGDB credentials |
| `POST /rating` | Find/cache a missing rating |
| `GET /ratings` | Read the rating cache |
| `GET /artwork` | Local artwork index |
| `GET /artwork/file?id=…` | Read an indexed image |
| `POST /launch/neogeo` | Select saved AES/MVS identity and launch through Remote |
| `POST /launch/amigavision` | Queue an AmigaVision title and launch through Remote |
| `GET /orientations` | Read TATE metadata |
| `POST /savestates` | Read matching save-state slots and modification dates for a supported game |
| `GET /savestates/index` | Read filenames of supported save states for list indicators |

## Save-state launch choices

Tapdeck 1.0.6 can offer dated save-state choices when Launch is tapped for SNES, Master System, NES, GBA, PSX, Game Gear, Game Boy, Game Boy Color and Virtual Boy. Install the updated helper binary as well as the updated app. The helper reads slots 1–4 from `/media/fat/savestates`, using each core's directory and the exact ROM filename without its extension. It never writes, renames or deletes a save. MGL and archive paths are excluded because their filenames need not identify the actual ROM.

Normal launch remains available while checking or if the helper is absent/outdated. A missing exact match launches normally. Selecting a save uses the existing game launch, then waits for MiSTer Remote to report the expected system/game twice and at least eight seconds to pass. It sends the restore command once; another Tapdeck launch, End action or app unmount cancels a pending restore. A 45-second limit leaves the game running normally if its identity cannot be confirmed. Remote's active-game report does not prove FPGA readiness, and a successful keyboard request does not confirm restoration. Slot 1 was manually tested on all nine systems; automatic timing and other slots need physical-device validation. Existing helper install/rollback commands apply.

As with the previous helpers, endpoints are unauthenticated HTTP available to the LAN. Use on a trusted home network; do not expose the port to the internet. Only IGDB lookups contact Twitch/IGDB externally. Secrets are not returned to the app.

## Rollback

The installer prints a specific backup directory under `/media/fat/Tapdeck/helper-backups/`. To restore the latest installation's previous helper services:

```sh
sh /media/fat/Tapdeck-Helper/rollback.sh
```

Or supply the exact backup directory printed during installation. Rollback preserves unrelated startup entries added later, restores the previous helper executables/marked startup blocks, and starts those services. Credentials, ratings, artwork and Neo Geo settings are untouched. It does not execute unrelated startup commands.

Also return the phone app to Git tag `rollback/pre-unified-helper-2026-10-15` and reload or rebuild it, because the older AmigaVision/TATE ports differ. Keep your own backup before migration; the developer's separate local snapshot is not included in release downloads.

## Build and test

Go 1.27, standard library only:

```sh
go test ./...
GOOS=linux GOARCH=arm GOARM=7 CGO_ENABLED=0 go build -buildvcs=false -o package/tapdeck-helper .
```

`go test ./...` also tests the real install/rollback logic against temporary storage and a fake process manager: migration, failed health checks, repeated installs, fresh installs, malformed/manual startup entries, preservation of unrelated startup lines and credentials, and backup boundaries. The shell scripts only locate the binary and invoke its installer/rollback commands. No Python or Bash dependency is needed for these tests.

Before release, test on a MiSTer: both AES/MVS launches, AmigaVision, existing IGDB credentials/rating cache, local boxart/snaps, TATE after refresh, reboot startup and rollback. Automated checks cannot verify FPGA ROM loading.

Save-state list indicators use GET /savestates/index: one filename-only index for the nine supported systems. No save contents are read. The app refreshes immediately when returning to a list or to the app, every three seconds while a game is running, and every minute otherwise; install the updated helper package to enable the red floppy indicator.
