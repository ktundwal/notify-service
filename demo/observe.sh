#!/bin/bash
# demo/observe.sh
#
# Run in a second terminal during the demo.
# Shows real-time agent team activity from the transparency hooks.

LOG="${1:-agent-activity.log}"

echo "╔══════════════════════════════════════════════════╗"
echo "║         Agent Activity Observer                  ║"
echo "║  Watching: $LOG"
echo "╠══════════════════════════════════════════════════╣"
echo "║  TASK+  = task created    SPAWN = agent started  ║"
echo "║  TASK→  = task started    STOP  = agent done     ║"
echo "║  TASK✓  = task done       MSG   = message sent   ║"
echo "║  EDIT   = file modified   WRITE = file created   ║"
echo "║  BASH   = command run     SHUT→ = shutdown       ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# Create log file if it doesn't exist
touch "$LOG"

# Tail with follow — shows new lines as they appear
tail -f "$LOG"
