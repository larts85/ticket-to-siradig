#!/bin/bash

# Script to run Jest unit tests with coverage for the Dyarti project.

echo "Running unit tests with coverage..."

# Check if yarn/npm is available
if ! command -v yarn &> /dev/null; then
    echo "❌ Error: Yarn is NOT installed. Use 'npm install -g yarn' if needed."
    exit 1
fi

# Run tests
yarn test:coverage

# If successful, offer to open coverage report
if [ $? -eq 0 ]; then
    echo "✅ Tests passed! Coverage report generated in coverage/lcov-report/index.html."
    # If on macOS, we can open it
    if [[ "$OSTYPE" == "darwin"* ]]; then
        read -p "Do you want to open the coverage report? (y/n): " OPEN_REPORT
        if [ "$OPEN_REPORT" == "y" ]; then
            open coverage/lcov-report/index.html
        fi
    fi
else
    echo "❌ Some tests failed. Please check the logs."
    exit 1
fi
