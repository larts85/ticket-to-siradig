#!/bin/bash

# Simple script to audit frontend code quality in the Dyarti project.

echo "Auditing frontend code quality..."

# Run ESLint
echo -e "\n🔍 Running ESLint..."
yarn lint

# Run TypeScript check
echo -e "\n🔍 Running TypeScript check..."
yarn tsc

# Check component organization
echo -e "\n📂 Verifying app/ folder organization..."
if [ -d "app" ]; then
    echo "✅ Found app/ folder. Ensure route segments follow Next.js 15 conventions."
else
    echo "❌ Error: app/ folder not found."
    exit 1
fi

echo -e "\n✅ Audit complete."
