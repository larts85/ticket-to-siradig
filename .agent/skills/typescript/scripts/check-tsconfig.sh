#!/bin/bash

# Simple script to check if strict mode is enabled in tsconfig.json.

echo "Checking TypeScript configuration..."

if [ ! -f "tsconfig.json" ]; then
    echo "❌ Error: tsconfig.json not found."
    exit 1
fi

if grep -q '"strict":\s*true' tsconfig.json; then
    echo "✅ Strict mode is ENABLED in tsconfig.json."
else
    echo "⚠️ Warning: Strict mode is NOT enabled in tsconfig.json. Consider enabling it."
fi

if grep -q '"esModuleInterop":\s*true' tsconfig.json; then
    echo "✅ esModuleInterop is ENABLED."
fi

echo "TypeScript configuration check complete."
