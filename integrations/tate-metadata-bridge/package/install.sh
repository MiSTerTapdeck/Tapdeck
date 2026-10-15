#!/bin/sh
# Historical installer intentionally disabled for the current app.
printf '%s\n' \
  'This separate Tapdeck helper is legacy and will not be installed.' \
  'Use integrations/tapdeck-helper/package and its install.sh instead.' \
  'For an older app release, use the matching historical Git tag.' >&2
exit 1
