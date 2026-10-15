# MiSTer integration

[Tapdeck Helper](./tapdeck-helper/README.md) is the current installer and service. It combines AmigaVision launching, IGDB rating caching, local artwork, Neo Geo AES/MVS configuration selection and TATE metadata on port 8184. MiSTer Remote remains responsible for carrying out launches.

Install **only `tapdeck-helper/package`** for the current app. The separate `amigavision-bridge`, `igdb-metadata-bridge` and `tate-metadata-bridge` sources and binaries are retained for historical reference and rollback. Their old install scripts are disabled and direct you to Tapdeck Helper. Their removal scripts are retained for cleaning up existing installations. Do not run the old IGDB executable alongside Tapdeck Helper: both use port 8184. The new installer backs up any existing old executables/startup entries and stops those services; its rollback restores those saved files without using the old install scripts.

The included executables are MiSTer ARM installer payloads built from the Go source beside each package. SHA-256 hashes for all retained payloads are listed in [SHA256SUMS](./SHA256SUMS).

To verify a downloaded repository copy on Windows:

```powershell
Get-FileHash .\integrations\tapdeck-helper\package\tapdeck-helper -Algorithm SHA256
```

Compare the output with `SHA256SUMS`. The build/test commands and migration procedure are in the helper README.
