#!/bin/bash

# Simple script to verify Next.js configuration and project structure.

echo "Verifying Next.js setup..."

# Check next.config.ts or next.config.mjs
if [ -f "next.config.ts" ]; then
    echo "✅ Found next.config.ts."
elif [ -f "next.config.mjs" ]; then
    echo "✅ Found next.config.mjs."
else
    echo "⚠️ Warning: No Next.js config file found."
fi

# Check for app/ directory
if [ -d "app" ]; then
    echo "✅ Found app/ folder (App Router is being used)."
else
    echo "⚠️ Warning: app/ folder not found. Are you using the Pages Router?"
fi

# Check for public/ directory
if [ -d "public" ]; then
    echo "✅ Found public/ folder."
fi

echo "Next.js configuration check complete."
