#!/bin/bash
# ==============================================================================
# VEXARO — Continuous Background Synchronization Daemon
# Executes sync_runner.sh every 20 minutes (1200 seconds)
# ==============================================================================

PROJECT_DIR="/Users/mac/.gemini/antigravity/scratch/urban-next"
cd "$PROJECT_DIR"

INTERVAL_SECONDS=1200  # 20 minutes

echo "[$(date '+%Y-%m-%d %H:%M:%S')] VEXARO sneakers sync daemon started (Interval: 20 minutes)." >> "$PROJECT_DIR/scripts/sync.log"

while true; do
    "$PROJECT_DIR/scripts/sync_runner.sh"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Next catalog update in 20 minutes..." >> "$PROJECT_DIR/scripts/sync.log"
    sleep $INTERVAL_SECONDS
done
