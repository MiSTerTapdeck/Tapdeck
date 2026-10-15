# Legacy IGDB metadata package — do not install

The current Tapdeck app uses **one [Tapdeck Helper package](../../tapdeck-helper/package/README.md)**. No separate IGDB metadata installation is required.

This directory is retained for historical reference and rollback. Its install script is disabled. The combined helper restores backed-up executables directly when rolling back, so disabling this installer does not remove that recovery option.

The uninstall script remains available for removing an existing old service. For an older app release, use its historical Git tag and matching setup instructions.
