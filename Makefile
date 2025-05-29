# Hexagon-A Linting and Development Commands

.PHONY: help setup lint lint-python lint-frontend lint-fix install-deps clean

# Default target
help:
	@echo "🚀 Hexagon-A Development Commands"
	@echo ""
	@echo "Setup:"
	@echo "  setup          - Initial setup with pre-commit hooks and dependencies"
	@echo "  install-deps   - Install all project dependencies"
	@echo ""
	@echo "Linting:"
	@echo "  lint           - Run all linters on the entire codebase"
	@echo "  lint-python    - Run Ruff on Python backends only"
	@echo "  lint-frontend  - Run ESLint on frontend projects only"
	@echo "  lint-fix       - Run all linters with auto-fix enabled"
	@echo ""
	@echo "Maintenance:"
	@echo "  clean          - Clean build artifacts and cache files"

# Initial setup
setup:
	@echo "🚀 Setting up Hexagon-A development environment..."
	./setup-precommit.sh

# Install dependencies for all projects
install-deps:
	@echo "📦 Installing dependencies for all projects..."
	@echo "🐍 Python backends..."
	cd backend && uv sync --dev
	cd flowterview-backend && uv sync --dev
	@echo "📱 Frontend projects..."
	cd frontend && pnpm install
	cd flowterview-app && pnpm install
	@echo "✅ All dependencies installed!"

# Run all linters
lint:
	@echo "🔍 Running all linters..."
	pre-commit run --all-files

# Python linting only
lint-python:
	@echo "🐍 Running Python linters..."
	pre-commit run ruff --all-files
	pre-commit run ruff-format --all-files

# Frontend linting only
lint-frontend:
	@echo "📱 Running frontend linters..."
	cd frontend && pnpm lint
	cd flowterview-app && pnpm lint

# Auto-fix linting issues
lint-fix:
	@echo "🔧 Running linters with auto-fix..."
	cd backend && uv run ruff check --fix .
	cd backend && uv run ruff format .
	cd flowterview-backend && uv run ruff check --fix .
	cd flowterview-backend && uv run ruff format .
	cd frontend && pnpm lint --fix
	cd flowterview-app && pnpm lint --fix

# Clean build artifacts
clean:
	@echo "🧹 Cleaning build artifacts and cache files..."
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name "node_modules" -path "*/frontend/*" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name "node_modules" -path "*/flowterview-app/*" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".next" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete 2>/dev/null || true
	@echo "✅ Cleanup complete!"

# Development commands for individual projects
dev-backend:
	cd backend && uv run uvicorn main:app --reload

dev-flowterview-backend:
	cd flowterview-backend && uv run uvicorn main:app --reload

dev-frontend:
	cd frontend && pnpm dev

dev-flowterview-app:
	cd flowterview-app && pnpm dev
