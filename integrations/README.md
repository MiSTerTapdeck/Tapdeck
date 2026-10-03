# Optional MiSTer helpers

Tapdeck includes two optional MiSTer-side helpers:

- `amigavision-bridge/package` launches individual AmigaVision titles.
- `igdb-metadata-bridge/package` looks up and caches missing IGDB ratings.

The only prebuilt executables retained in this repository are the current MiSTer ARM installer payloads in those two `package` folders. Their SHA-256 hashes are listed in [SHA256SUMS](./SHA256SUMS).

To verify a downloaded repository copy on Windows:

```powershell
Get-FileHash .\integrations\amigavision-bridge\package\tapdeck-amigavision-bridge -Algorithm SHA256
Get-FileHash .\integrations\igdb-metadata-bridge\package\tapdeck-igdb-metadata-bridge -Algorithm SHA256
```

Compare the output with `SHA256SUMS`. Both helpers can also be built from their included Go source.
