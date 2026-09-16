# Zaparoo MiSTer console launch failure with USB game folders

## Summary

Console media indexed from a standard external MiSTer games folder resolves correctly in Zaparoo but opens only the core. Arcade `.mra` launches work.

The generated MGL writes an absolute `/media/usbN/...` game path as a five-level relative traversal. On this MiSTer it is not accepted by the console core. MiSTer does load the identical ROM when the MGL path is relative to that core's game folder.

## Environment

- Zaparoo Core 2.17.2 (MiSTer)
- ROM drive mounted at `/media/usb1`
- Game: `/media/usb1/games/NES/Mario Bros. (World).nes`
- Core: `_Console/NES`

## Reproduction

1. Launch `NES/Mario Bros.` from the Zaparoo Web UI.
2. Zaparoo resolves the title with confidence 1.00 and logs the correct full path.
3. It writes `/media/fat/.LASTLAUNCH.mgl`:

```xml
<mistergamedescription>
  <rbf>_Console/NES</rbf>
  <file delay="2" type="f" index="1" path="../../../../../media/usb1/games/NES/Mario Bros. (World).nes"/>
</mistergamedescription>
```

4. MiSTer opens the NES core but does not load the ROM.
5. Replace only the `path` attribute with the path relative to the core's game folder:

```xml
<mistergamedescription>
  <rbf>_Console/NES</rbf>
  <file delay="2" type="f" index="1" path="Mario Bros. (World).nes"/>
</mistergamedescription>
```

6. Send `load_core /media/fat/NES-test.mgl` through `/dev/MiSTer_cmd`. The game starts immediately.

## Expected behaviour

For paths inside one of a core's recognised MiSTer game folders, generated MGL paths should be relative to that folder. This should preserve subdirectories, for example:

`/media/usb1/games/NES/Hacks/Example.nes` becomes `Hacks/Example.nes`.

## Suggested implementation

In `pkg/platforms/mister/mgls.GenerateMgl`, derive a core-relative game path before formatting the `<file>` tag:

- Match the absolute media path against the standard game roots (`/media/fat/games`, `/media/usb0` through `/media/usb5`, and network roots) plus each `core.Folders` entry.
- Use the remainder after the matching core folder as the MGL `path`.
- Keep the current absolute-path traversal as a fallback for paths outside standard core folders.

This preserves Zaparoo's existing slot parameters (`delay`, `type`, `index`, reset handling) and fixes standard external USB storage without requiring symlinks or app-side launcher tables.
