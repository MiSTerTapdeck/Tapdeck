# Tapdeck AmigaVision bridge

This service receives a canonical AmigaVision title from Tapdeck, locates the mounted `games/Amiga/shared` folder on `usb0` through `usb7`, writes AmigaVision's native `ags_boot` request there, then starts the normal Amiga configuration through MiSTer Remote.

AmigaVision reads `ags_boot` during its own startup sequence and opens the matching canonical `RunQuiet` game or demo. No AmigaVision listener or HDF modification is required.

## Build

```sh
GOOS=linux GOARCH=arm GOARM=7 CGO_ENABLED=0 go build -buildvcs=false -o tapdeck-amigavision-bridge .
```

Copy the binary to `/media/fat/Scripts/tapdeck-amigavision-bridge` and run it as a background service. It listens on port `8183`.

The service re-discovers the USB mount on every launch, so moving AmigaVision from `usb3` to another USB slot does not require changing Tapdeck.