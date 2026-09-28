# Tapdeck AmigaVision launch bridge

This one-time MiSTer installation lets Tapdeck launch individual AmigaVision games directly.

## Install

1. Copy this folder to the MiSTer SD card, for example `/media/fat/Tapdeck-AmigaVision`.
2. Connect through SSH and run:

   ```sh
   sh /media/fat/Tapdeck-AmigaVision/install.sh
   ```

The installer copies the bridge to `/media/fat/Scripts` and adds one marked block to `/media/fat/linux/user-startup.sh`. It backs up any existing `user-startup.sh` before changing it.

The bridge discovers AmigaVision’s `games/Amiga/shared` folder across `usb0` to `usb7` on every launch. The drive can move USB ports without further setup.

## Verify

After installing, Tapdeck should launch an AmigaVision card directly from the normal MiSTer menu. Restarting MiSTer does not require any further action.

## Remove

```sh
sh /media/fat/Tapdeck-AmigaVision/uninstall.sh
```

Removal stops the bridge, removes only Tapdeck’s marked startup block, and deletes the bridge executable. A backup of `user-startup.sh` is retained.