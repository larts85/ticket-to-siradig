#!/bin/bash

# Simple script to check Node.js environment and server setup.

echo "Checking Node.js & server setup..."

# Check Node (Next.js 15 requires Node 18+)
NODE_VERSION=$(node -v | cut -d 'v' -f 2)
if [[ $(echo "$NODE_VERSION < 18" | bc -l) -eq 1 ]]; then
    echo "❌ Error: Node version $NODE_VERSION is too old. Node 18+ is required."
    exit 1
else
    echo "✅ Node version $NODE_VERSION is compatible."
fi

# Check package.json scripts
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found."
    exit 1
fi

if grep -q '"start":' package.json; then
    echo "✅ Found 'start' script in package.json."
else
    echo "⚠️ Warning: 'start' script not found. Consider adding it."
fi

if grep -q '"dev":' package.json; then
    echo "✅ Found 'dev' script in package.json."
fi

echo "Node.js & server setup check complete."
