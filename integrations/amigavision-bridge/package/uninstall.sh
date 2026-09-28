#!/bin/sh
# Removes only Tapdeck's managed MiSTer boot block and bridge executable.
set -eu

TARGET="/media/fat/Scripts/tapdeck-amigavision-bridge"
STARTUP="/media/fat/linux/user-startup.sh"
BEGIN="# BEGIN TAPDECK AMIGAVISION BRIDGE"
END="# END TAPDECK AMIGAVISION BRIDGE"

for pid in $(ps | grep '[t]apdeck-amigavision-bridge' | awk '{print $1}'); do
  kill "$pid" 2>/dev/null || true
done

if [ -f "$STARTUP" ] && grep -Fq "$BEGIN" "$STARTUP"; then
  cp "$STARTUP" "$STARTUP.tapdeck-backup"
  sed "/$BEGIN/,/$END/d" "$STARTUP" > "$STARTUP.tapdeck-tmp"
  mv "$STARTUP.tapdeck-tmp" "$STARTUP"
fi
rm -f "$TARGET"
echo "Tapdeck AmigaVision bridge removed."