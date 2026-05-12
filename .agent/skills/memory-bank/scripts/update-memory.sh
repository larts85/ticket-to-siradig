#!/bin/bash

# Simple script to update the Memory Bank's progress.md.

echo "Updating Memory Bank Progress Log..."

PROJECT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)

if [ ! -d "$PROJECT_ROOT/memory-bank" ]; then
    echo "❌ Error: memory-bank/ directory not found in the project root."
    exit 1
fi

PROGRESS_FILE="$PROJECT_ROOT/memory-bank/progress.md"

if [ ! -f "$PROGRESS_FILE" ]; then
    echo "⚠️ Warning: progress.md not found in memory-bank/. Initializing..."
    echo "# Memory Bank Progress Log" > "$PROGRESS_FILE"
fi

DATE=$(date +"%Y-%m-%d %H:%M:%S")

read -p "Enter milestone description: " DESCRIPTION

# Append to progress.md
echo "---" >> "$PROGRESS_FILE"
echo "### Milestone: $DATE" >> "$PROGRESS_FILE"
echo "- Description: $DESCRIPTION" >> "$PROGRESS_FILE"
echo "- Status: SUCCESS" >> "$PROGRESS_FILE"

echo "✅ Appended to progress.md."
