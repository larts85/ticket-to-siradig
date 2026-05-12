#!/bin/bash

# Simple script to check the local development environment for the Dyarti project.

echo "Checking environment for Dyarti..."

# Check Yarn
if ! command -v yarn &> /dev/null; then
    echo "❌ Error: Yarn is NOT installed. Use 'npm install -g yarn' if needed."
    exit 1
else
    echo "✅ Yarn is installed."
fi

# Check Node (Next.js 15 requires Node 18+)
NODE_VERSION=$(node -v | cut -d 'v' -f 2)
if [[ $(echo "$NODE_VERSION < 18" | bc -l) -eq 1 ]]; then
    echo "❌ Error: Node version $NODE_VERSION is too old. Node 18+ is required for Next.js 15."
    exit 1
else
    echo "✅ Node version $NODE_VERSION is compatible."
fi

# Check if port 2024 is in use
if lsof -Pi :2024 -sTCP:LISTEN -t >/dev/null; then
    echo "✅ Port 2024 is available or already running Dyarti."
else
    echo "⚠️  Note: Port 2024 is currently idle. You might want to run 'yarn dev' or 'yarn dev:clean'."
fi

# Check env.local
if [ ! -f ".env.local" ]; then
    echo "⚠️  Warning: .env.local not found. Start from env.example if needed."
fi

echo "Environment check complete."
