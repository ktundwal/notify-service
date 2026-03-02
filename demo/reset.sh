#!/bin/bash
# demo/reset.sh
#
# Revert all demo changes and clean up.
# Run after the demo to restore the project to its original state.

cd "$(dirname "$0")/.." || exit 1

echo "Resetting notify-service to pre-demo state..."

# Revert all file changes
git checkout .

# Remove untracked files created by the demo (new source files, test files)
git clean -fd --exclude=node_modules --exclude='*.db'

# Clear the activity log
> agent-activity.log

# Remove any SQLite databases created during the demo
rm -f notify-service.db notify-service.db-wal notify-service.db-shm

echo "Done. Project is clean."
echo ""
git status --short
