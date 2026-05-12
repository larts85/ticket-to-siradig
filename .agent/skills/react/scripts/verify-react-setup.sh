#!/bin/bash

# Simple script to verify React version and Next.js version in the Dyarti project.

echo "Verifying React setup..."

if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found in the current directory."
    exit 1
fi

REACT_VERSION=$(grep '"react":' package.json | cut -d ':' -f 2 | tr -d '", ')
NEXT_VERSION=$(grep '"next":' package.json | cut -d ':' -f 2 | tr -d '", ')

if [[ -z "$REACT_VERSION" ]]; then
    echo "⚠️ Warning: React version not found in package.json."
else
    echo "✅ Found React: $REACT_VERSION"
fi

if [[ -z "$NEXT_VERSION" ]]; then
    echo "⚠️ Warning: Next.js version not found in package.json."
else
    echo "✅ Found Next.js: $NEXT_VERSION"
fi

# Next.js 15 requires React 19
if [[ "$NEXT_VERSION" == "15"* && "$REACT_VERSION" != "19"* ]]; then
    echo "⚠️ Potential Conflict: Next.js 15+ is optimized for React 19/18 Server Components. Ensure compatibility."
fi

echo "React setup verification complete."
