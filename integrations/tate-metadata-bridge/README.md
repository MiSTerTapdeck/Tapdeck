# Tapdeck TATE metadata bridge

Tapdeck cannot read MRA files directly from an Android phone. This optional MiSTer service reads each arcade MRA's `<rotation>` field during a Tapdeck library refresh and returns only the vertical-game result.

It never changes an MRA, game, core, or MiSTer setting.

## Build

```sh
GOOS=linux GOARCH=arm GOARM=7 CGO_ENABLED=0 go build -buildvcs=false -o tapdeck-tate-metadata-bridge .
```

Copy the binary to `/media/fat/Scripts/tapdeck-tate-metadata-bridge` and start it in the background. It listens on port `8185`.

Tapdeck uses it only during a library refresh. If the service is absent, the rest of the app works normally and simply has no TATE markers.
