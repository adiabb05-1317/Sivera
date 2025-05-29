#!/bin/bash

# Setup Pre-commit Hooks for Hexagon-A Codebase
echo "🚀 Setting up pre-commit hooks for Hexagon-A codebase..."

# Check if we're in the right directory
if [[ ! -f ".pre-commit-config.yaml" ]]; then
    echo "❌ Error: .pre-commit-config.yaml not found. Make sure you're in the root directory."
    exit 1
fi

# Install pre-commit if not already installed
if ! command -v pre-commit &> /dev/null; then
    echo "📦 Installing pre-commit..."
    pip install pre-commit
fi

# Install pre-commit hooks
echo "🔧 Installing pre-commit hooks..."
pre-commit install

# Setup Python backend dependencies
echo "🐍 Setting up Python backend dependencies..."

# Backend setup
if [[ -d "backend" ]]; then
    echo "  📁 Setting up backend..."
    cd backend
    if [[ -f "pyproject.toml" ]]; then
        # Install dev dependencies including ruff and pre-commit
        uv sync --dev
        echo "  ✅ Backend dependencies installed"
    fi
    cd ..
fi

# Flowterview-backend setup
if [[ -d "flowterview-backend" ]]; then
    echo "  📁 Setting up flowterview-backend..."
    cd flowterview-backend
    if [[ -f "pyproject.toml" ]]; then
        # Install dev dependencies including ruff and pre-commit
        uv sync --dev
        echo "  ✅ Flowterview-backend dependencies installed"
    fi
    cd ..
fi

# Setup Node.js frontend dependencies
echo "📱 Setting up Node.js frontend dependencies..."

# Frontend setup
if [[ -d "frontend" ]]; then
    echo "  📁 Setting up frontend..."
    cd frontend
    if [[ -f "package.json" ]]; then
        pnpm install
        echo "  ✅ Frontend dependencies installed"
    fi
    cd ..
fi

# Flowterview-app setup
if [[ -d "flowterview-app" ]]; then
    echo "  📁 Setting up flowterview-app..."
    cd flowterview-app
    if [[ -f "package.json" ]]; then
        pnpm install
        echo "  ✅ Flowterview-app dependencies installed"
    fi
    cd ..
fi

# Run initial pre-commit check
echo "🧪 Running initial pre-commit check..."
pre-commit run --all-files || echo "⚠️  Some files needed formatting. This is normal for the first run."

echo "✅ Pre-commit setup complete!"
echo ""
echo "📋 What was set up:"
echo "  • Ruff linting and formatting for Python backends (backend, flowterview-backend)"
echo "  • ESLint for Next.js applications (frontend, flowterview-app)"
echo "  • Prettier for frontend code formatting"
echo "  • UV lock file management for Python projects"
echo "  • General file quality checks (trailing whitespace, large files, etc.)"
echo ""
echo "🎯 Pre-commit hooks will now run automatically on every commit!"
echo "💡 To run manually: pre-commit run --all-files"
