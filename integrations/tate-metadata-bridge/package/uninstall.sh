# Run once from SSH: sh /path/to/uninstall.sh
set -eu

TARGET="/media/fat/Scripts/tapdeck-tate-metadata-bridge"
STARTUP="/media/fat/linux/user-startup.sh"
BEGIN="# BEGIN TAPDECK TATE METADATA BRIDGE"
END="# END TAPDECK TATE METADATA BRIDGE"

for pid in $(ps | grep '[t]apdeck-tate-metadata-bridge' | awk '{print $1}'); do kill "$pid" 2>/dev/null || true; done
rm -f "$TARGET"
if [ -f "$STARTUP" ]; then
  tmp="$STARTUP.tapdeck-remove"
  sed "/$BEGIN/,/$END/d" "$STARTUP" > "$tmp"
  mv "$tmp" "$STARTUP"
fi
echo "Tapdeck TATE metadata bridge removed."
