#!/bin/bash

# Simple script to check test fixtures in the Dyarti project.

echo "Listing Test Fixtures..."

FIXTURES_DIR="tests/e2e/fixtures"

if [ ! -d "$FIXTURES_DIR" ]; then
    echo "❌ Error: $FIXTURES_DIR not found."
    exit 1
fi

COUNT=$(ls -1 "$FIXTURES_DIR"/*.ts 2>/dev/null | wc -l)

if [ "$COUNT" -gt 0 ]; then
    echo "✅ Found $COUNT fixture(s):"
    ls -1 "$FIXTURES_DIR"/*.ts | sort
else
    echo "⚠️ Warning: No test fixtures found in $FIXTURES_DIR."
fi

echo "Test fixture verification complete."
