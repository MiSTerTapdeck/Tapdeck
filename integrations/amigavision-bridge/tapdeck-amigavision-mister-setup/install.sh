#!/bin/sh
# Tapdeck AmigaVision bridge installer for MiSTer.
# Run once from SSH: sh /path/to/install.sh
set -eu

HERE=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
SOURCE="$HERE/tapdeck-amigavision-bridge"
TARGET_DIR="/media/fat/Scripts"
TARGET="$TARGET_DIR/tapdeck-amigavision-bridge"
STARTUP_DIR="/media/fat/linux"
STARTUP="$STARTUP_DIR/user-startup.sh"
BEGIN="# BEGIN TAPDECK AMIGAVISION BRIDGE"
END="# END TAPDECK AMIGAVISION BRIDGE"

if [ ! -f "$SOURCE" ]; then
  echo "Bridge binary is missing beside install.sh."
  exit 1
fi

mkdir -p "$TARGET_DIR" "$STARTUP_DIR"
cp "$SOURCE" "$TARGET"
chmod 755 "$TARGET"

if [ -f "$STARTUP" ]; then
  cp "$STARTUP" "$STARTUP.tapdeck-backup"
else
  : > "$STARTUP"
fi

if ! grep -Fq "$BEGIN" "$STARTUP"; then
  printf '\n%s\n' "$BEGIN" >> "$STARTUP"
  cat >> "$STARTUP" <<'BLOCK'
if [ -x /media/fat/Scripts/tapdeck-amigavision-bridge ]; then
  /media/fat/Scripts/tapdeck-amigavision-bridge >/tmp/tapdeck-amigavision-bridge.log 2>&1 &
fi
BLOCK
  printf '%s\n' "$END" >> "$STARTUP"
fi

for pid in $(ps | grep '[t]apdeck-amigavision-bridge' | awk '{print $1}'); do
  kill "$pid" 2>/dev/null || true
done
"$TARGET" >/tmp/tapdeck-amigavision-bridge.log 2>&1 &

echo "Tapdeck AmigaVision bridge installed. It now starts automatically whenever MiSTer boots."