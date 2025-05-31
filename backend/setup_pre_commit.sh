#!/bin/bash
set -e

# Change to the script's directory
cd "$(dirname "$0")"

echo "Setting up pre-commit hooks for Ruff formatting..."

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is required but not installed."
    exit 1
fi

# Check if pip is available
if ! command -v pip &> /dev/null; then
    echo "Error: pip is required but not installed."
    exit 1
fi

# Install pre-commit and ruff if not already installed
echo "Installing pre-commit and ruff..."
pip install pre-commit ruff

# Install the pre-commit hooks
echo "Installing pre-commit hooks..."
pre-commit install --install-hooks

# Create a test commit to verify installation
echo "Set up complete. Pre-commit hooks are now installed."
echo "Ruff will format your code on every commit."
echo ""
echo "To test the setup, make a change to a Python file and commit it."
echo "The formatter should run automatically during the commit process."

exit 0
