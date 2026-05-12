#!/bin/bash

# Simple script to check Page Object classes in the Dyarti project.

echo "Listing Page Objects..."

PO_DIR="tests/e2e/pageObjects"

if [ ! -d "$PO_DIR" ]; then
    echo "❌ Error: $PO_DIR not found."
    exit 1
fi

COUNT=$(ls -1 "$PO_DIR"/*.ts 2>/dev/null | wc -l)

if [ "$COUNT" -gt 0 ]; then
    echo "✅ Found $COUNT Page Object(s):"
    ls -1 "$PO_DIR"/*.ts | sort
else
    echo "⚠️ Warning: No Page Objects found in $PO_DIR."
fi

echo "Page Object verification complete."
