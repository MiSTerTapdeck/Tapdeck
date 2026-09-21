# Tapdeck todo

## Zaparoo library maintenance

- [ ] Add **Refresh library** to Settings using Zaparoo Core's `media.generate` API.
  - Allow one, several, or all systems to be selected.
  - Use a normal targeted refresh by default; reserve `rebuild: true` for a clearly labelled troubleshooting action.
  - Display live `media.indexing` progress and provide cancel/resume controls.
  - Disable metadata imports while indexing because Zaparoo does not allow both operations simultaneously.
  - When indexing succeeds, fetch the updated Zaparoo library and atomically replace Tapdeck's saved library snapshot and backup.
  - Keep the existing Tapdeck library if indexing or the subsequent fetch fails.

- [ ] Add **Import metadata** to Settings using Zaparoo Core's scraper API.
  - Populate available sources with `scrapers` rather than hard-coding them.
  - Allow one, several, or all supported systems to be selected.
  - Default to `force: false` so records already imported by that scraper are skipped.
  - Offer a clearly labelled **Replace existing metadata** option mapped to `force: true`.
  - Start imports with `media.scrape` and display live progress from `media.scraping` or `media.scrape.status`.
  - Provide cancel and resume controls through `media.scrape.cancel` and `media.scrape.resume`.
  - Explain that Zaparoo imports metadata already present on the MiSTer and does not download metadata from the internet.
  - Refresh Tapdeck's library snapshot after a successful import so new genres, years, synopses, developers, and other fields appear immediately.

- [ ] Combine both actions into a clear workflow: **Refresh library** first, then optionally **Import metadata** for the same selected systems.
