# Run once from SSH: sh /path/to/install.sh
set -eu

HERE=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
SOURCE="$HERE/tapdeck-igdb-metadata-bridge"
TARGET_DIR="/media/fat/Scripts"
TARGET="$TARGET_DIR/tapdeck-igdb-metadata-bridge"
STARTUP_DIR="/media/fat/linux"
STARTUP="$STARTUP_DIR/user-startup.sh"
BEGIN="# BEGIN TAPDECK IGDB METADATA BRIDGE"
END="# END TAPDECK IGDB METADATA BRIDGE"

if [ ! -f "$SOURCE" ]; then
  echo "Bridge binary is missing beside install.sh."
  exit 1
fi

mkdir -p "$TARGET_DIR" "$STARTUP_DIR" /media/fat/Tapdeck

# Stop the previous helper before replacing its executable. FAT-backed MiSTer
# storage cannot overwrite a running binary.
for pid in $(ps | grep '[t]apdeck-igdb-metadata-bridge' | awk '{print $1}'); do
  kill "$pid" 2>/dev/null || true
done

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
if [ -x /media/fat/Scripts/tapdeck-igdb-metadata-bridge ]; then
  /media/fat/Scripts/tapdeck-igdb-metadata-bridge >/tmp/tapdeck-igdb-metadata-bridge.log 2>&1 &
fi
BLOCK
  printf '%s\n' "$END" >> "$STARTUP"
fi

"$TARGET" >/tmp/tapdeck-igdb-metadata-bridge.log 2>&1 &

echo "Tapdeck IGDB metadata bridge installed. It starts automatically whenever MiSTer boots."
