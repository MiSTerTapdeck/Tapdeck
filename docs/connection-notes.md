# MiSTer connection groundwork

Source inspected: https://github.com/chipster6502/MiSTer_artwork_pack/blob/main/PACK_FORMAT.md (10 September 2026).

- Artwork lives at `docs/<System>/Artwork/`, on SD or USB. Probe `/media/fat` then `/media/usb0` to `/media/usb7`; do not assume the SD card is the only location.
- `gameinfo.tsv` supplies key, name, year, genre, developer and players. It does not supply a publisher column. The detail screen therefore correctly labels the available field Developer.
- `synopsis_*.tsv` supplies descriptions. Discover available languages rather than assuming all exist.
- `index.tsv` is critical: exact key, case-insensitive indexed name, validated trailing setname, CRC+size where applicable, then unique bare-title fallback. Missing mapped artwork should fall through, not become a broken image.
- Artwork keys can change between releases. Persistent playlist/play-history identities must not be artwork keys. Sample app IDs are local fixture identifiers only.
- Game Boy/GBC, Super Game Boy and FDS require the documented sibling-folder rules.
- Discover games from the actual device’s game inventory, not artwork entries. The pack contains systems/games that may not be installed or supported by that device.
- The pack is a file format, not a phone connection/launch protocol. Device discovery, authenticated transport, inventory and launch commands remain to be chosen and tested. The format points to MiSTer_monitor as its reference resolver; inspect that implementation before deciding whether to reuse its server or create a small companion service.

No credentials were requested, no MiSTer configuration was changed and no launch protocol has been guessed in this build.
