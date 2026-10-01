# Tapdeck IGDB metadata bridge

This optional MiSTer service lets Tapdeck use your own IGDB credentials without placing the secret in the Android APK. It listens only on your local network at port `8184`.

When Tapdeck asks it to fill a missing rating, the bridge:

1. looks up the title in IGDB;
2. accepts it only when title and platform match exactly;
3. accepts only an exact title-and-platform match; and
4. saves the resulting rating in Tapdeck's shared MiSTer cache.

It never edits `gamelist.xml` files. Tapdeck merges cached ratings into its library for every system, including arcade cores.

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
