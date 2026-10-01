# Run once from SSH: sh /path/to/uninstall.sh
set -eu
TARGET="/media/fat/Scripts/tapdeck-igdb-metadata-bridge"
STARTUP="/media/fat/linux/user-startup.sh"
BEGIN="# BEGIN TAPDECK IGDB METADATA BRIDGE"
END="# END TAPDECK IGDB METADATA BRIDGE"

for pid in $(ps | grep '[t]apdeck-igdb-metadata-bridge' | awk '{print $1}'); do
  kill "$pid" 2>/dev/null || true
done
rm -f "$TARGET"
if [ -f "$STARTUP" ]; then
  tmp="$STARTUP.tapdeck-remove"
  sed "/$BEGIN/,/$END/d" "$STARTUP" > "$tmp"
  mv "$tmp" "$STARTUP"
fi
echo "Tapdeck IGDB metadata bridge removed. Credentials at /media/fat/Tapdeck/igdb.json were left in place."
