#!/bin/sh
set -eu
HERE=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
chmod 755 "$HERE/tapdeck-helper"
exec "$HERE/tapdeck-helper" --rollback "$@"
