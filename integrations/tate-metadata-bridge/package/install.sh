# Run once from SSH: sh /path/to/install.sh
set -eu

HERE=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
SOURCE="$HERE/tapdeck-tate-metadata-bridge"
TARGET_DIR="/media/fat/Scripts"
TARGET="$TARGET_DIR/tapdeck-tate-metadata-bridge"
STARTUP_DIR="/media/fat/linux"
STARTUP="$STARTUP_DIR/user-startup.sh"
BEGIN="# BEGIN TAPDECK TATE METADATA BRIDGE"
END="# END TAPDECK TATE METADATA BRIDGE"

if [ ! -f "$SOURCE" ]; then
  echo "Bridge binary is missing beside install.sh."
  exit 1
fi

mkdir -p "$TARGET_DIR" "$STARTUP_DIR"
for pid in $(ps | grep '[t]apdeck-tate-metadata-bridge' | awk '{print $1}'); do kill "$pid" 2>/dev/null || true; done
cp "$SOURCE" "$TARGET"
chmod 755 "$TARGET"

if [ ! -f "$STARTUP" ]; then : > "$STARTUP"; fi
if ! grep -Fq "$BEGIN" "$STARTUP"; then
  printf '\n%s\n' "$BEGIN" >> "$STARTUP"
  cat >> "$STARTUP" <<'BLOCK'
if [ -x /media/fat/Scripts/tapdeck-tate-metadata-bridge ]; then
  /media/fat/Scripts/tapdeck-tate-metadata-bridge >/tmp/tapdeck-tate-metadata-bridge.log 2>&1 &
fi
BLOCK
  printf '%s\n' "$END" >> "$STARTUP"
fi

"$TARGET" >/tmp/tapdeck-tate-metadata-bridge.log 2>&1 &
echo "Tapdeck TATE metadata bridge installed. It starts automatically whenever MiSTer boots."
