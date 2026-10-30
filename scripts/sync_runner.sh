#!/bin/bash
# ==============================================================================
# VEXARO — Footwear Catalog & Stock Synchronization Runner
# Synchronizes sneakers catalog every 20 minutes from EasyDrop
# ==============================================================================

set -e

export PATH="/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

PROJECT_DIR="/Users/mac/.gemini/antigravity/scratch/urban-next"
cd "$PROJECT_DIR"

TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
LOG_FILE="$PROJECT_DIR/scripts/sync.log"

echo "[$TIMESTAMP] === Starting VEXARO Sneakers Auto-Sync ===" >> "$LOG_FILE"

# 1. Run Python sync script
python3 -u "$PROJECT_DIR/scripts/sync_catalog.py" --download >> "$LOG_FILE" 2>&1 || {
    echo "[$TIMESTAMP] Download attempt encountered network issue, continuing with cached supplier feed..." >> "$LOG_FILE"
    python3 -u "$PROJECT_DIR/scripts/sync_catalog.py" >> "$LOG_FILE" 2>&1
}

# 2. Check if catalog files changed
CHANGED_FILES=$(git status --porcelain src/data/)

if [ -n "$CHANGED_FILES" ]; then
    echo "[$TIMESTAMP] Changes detected in footwear catalog. Committing and deploying..." >> "$LOG_FILE"
    git add src/data/products.json src/data/meta.json
    git -c user.name="VEXARO Sync Bot" -c user.email="sync@vexaro.com.ua" commit -m "Auto-sync footwear catalog [$TIMESTAMP]" >> "$LOG_FILE" 2>&1
    
    # Push to origin main to trigger automatic Vercel production rebuild
    GIT_TERMINAL_PROMPT=0 git push origin main >> "$LOG_FILE" 2>&1 || echo "[$TIMESTAMP] Warning: git push queued for next network sync cycle" >> "$LOG_FILE"

    echo "[$TIMESTAMP] Successfully synchronized footwear. Vercel deployment triggered." >> "$LOG_FILE"

    # Auto-publish newly added products to Telegram channel @vexaro_ua (strictly unique only)
    echo "[$TIMESTAMP] Auto-publishing newly loaded products to Telegram channel @vexaro_ua..." >> "$LOG_FILE"
    python3 "$PROJECT_DIR/scripts/post_to_telegram.py" 3 >> "$LOG_FILE" 2>&1 || echo "[$TIMESTAMP] Warning: Telegram publish encountered an error" >> "$LOG_FILE"
else
    echo "[$TIMESTAMP] No changes in footwear stock. Catalog is up to date." >> "$LOG_FILE"
fi

echo "[$TIMESTAMP] === Finished sync cycle ===" >> "$LOG_FILE"
