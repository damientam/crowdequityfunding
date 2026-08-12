#!/bin/sh
# Daily update: collect the last 7 days from EDGAR (catches up after outages),
# then commit and push only if the data actually changed.
# Note: the GitHub Actions workflow (.github/workflows/collect-daily.yml)
# already does this in the cloud — this script is for running the same thing
# from your own machine or server instead.
# Crontab example (07:15 UTC — after EDGAR's overnight indexing):
#   15 7 * * * /path/to/crowdequityfunding/collector/update-daily.sh >> "$HOME/crowdequityfunding-watch.log" 2>&1
set -eu

DIR="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$DIR/.." && pwd)"

node "$DIR/collect.js"

cd "$REPO"
if git status --porcelain data | grep -q .; then
  git add data
  git commit -m "chore: daily EDGAR data update $(date -u +%F)"
  git push || echo "push failed (data committed locally)"
else
  echo "No data change today."
fi
