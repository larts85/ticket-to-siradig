#!/bin/bash

# Simple script to check Supabase migrations in the Dyarti project.

echo "Listing migrations..."

MIGRATIONS_DIR="supabase/migrations"

if [ ! -d "$MIGRATIONS_DIR" ]; then
    echo "❌ Error: $MIGRATIONS_DIR not found."
    exit 1
fi

COUNT=$(ls -1 "$MIGRATIONS_DIR"/*.sql 2>/dev/null | wc -l)

if [ "$COUNT" -gt 0 ]; then
    echo "✅ Found $COUNT migration(s):"
    ls -1 "$MIGRATIONS_DIR"/*.sql | sort
else
    echo "⚠️ Warning: No migrations found in $MIGRATIONS_DIR."
fi

echo "Migration check complete."
