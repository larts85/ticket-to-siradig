#!/bin/bash

# Pre-push and Pre-PR verification script for the Dyarti project.

echo "Running Pre-PR verification checks..."

# Check linting
echo -e "\n🔍 Checking lint..."
if ! yarn lint; then
    echo "❌ Error: Linting found issues. Fix them before pushing."
    exit 1
fi

# Check types
echo -e "\n🔍 Checking types..."
if ! yarn tsc; then
    echo "❌ Error: TypeScript found type errors. Fix them before pushing."
    exit 1
fi

# Check tests
echo -e "\n🔍 Running all unit tests..."
if ! yarn test; then
    echo "❌ Error: Some unit tests are failing. Fix them before pushing."
    exit 1
fi

echo -e "\n✅ All checks passed! You are ready to create a PR."
