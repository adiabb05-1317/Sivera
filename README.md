# Hexagon-A Codebase

Welcome to the Hexagon-A project! This repository contains multiple applications with a comprehensive linting setup.

## 🏗️ Project Structure

```
Hexagon-A/
├── backend/                 # Python FastAPI backend
├── flowterview-backend/     # Python FastAPI backend
├── frontend/               # Next.js frontend application
├── flowterview-app/        # Next.js frontend application
├── .pre-commit-config.yaml # Pre-commit hooks configuration
├── Makefile               # Development commands
└── LINTING.md             # Detailed linting documentation
```

## 🚀 Quick Start

### 1. Setup Development Environment

```bash
# Run the comprehensive setup script
./setup-precommit.sh

# Or use Make
make setup
```

### 2. Install Dependencies Only

```bash
make install-deps
```

## 🔍 Linting Commands

### Run All Linters

```bash
# Using pre-commit (recommended)
pre-commit run --all-files

# Using Make
make lint
```

### Run Specific Linters

```bash
# Python only (Ruff)
make lint-python

# Frontend only (ESLint)
make lint-frontend

# Auto-fix issues
make lint-fix
```

### Individual Project Linting

```bash
# Python projects
cd backend && uv run ruff check .
cd flowterview-backend && uv run ruff check .

# Next.js projects
cd frontend && pnpm lint
cd flowterview-app && pnpm lint
```

## 🛠️ Available Tools

### Python Projects (backend, flowterview-backend)

- **Ruff**: Ultra-fast Python linter and formatter
- **Rules**: Import sorting, code style, type checking, best practices
- **Configuration**: `pyproject.toml` in each directory

### Next.js Projects (frontend, flowterview-app)

- **ESLint**: TypeScript/JavaScript linting
- **Rules**: Next.js core web vitals, TypeScript best practices
- **Configuration**: `eslint.config.mjs` in each directory

## 🎯 Pre-commit Hooks

Hooks automatically run on every commit:

- ✅ Ruff linting and formatting for Python
- ✅ ESLint for Next.js applications
- ✅ YAML/JSON/TOML validation
- ✅ Trailing whitespace removal
- ✅ Large file detection
- ✅ Debug statement detection

## 🧰 Development Commands

```bash
# View all available commands
make help

# Start individual services
make dev-backend
make dev-flowterview-backend
make dev-frontend
make dev-flowterview-app

# Clean build artifacts
make clean
```

## 📖 Documentation

- [LINTING.md](./LINTING.md) - Comprehensive linting setup guide
- [Makefile](./Makefile) - All available commands

## 🎉 Benefits

- ✅ Consistent code style across all projects
- ✅ Automatic formatting and import sorting
- ✅ Early detection of bugs and issues
- ✅ Enforced best practices
- ✅ Pre-commit hooks prevent bad commits
- ✅ Fast linting with modern tools (Ruff, ESLint)

## 🤝 Contributing

1. Run `./setup-precommit.sh` after cloning
2. Make your changes
3. Pre-commit hooks will run automatically
4. Fix any linting issues before committing

---

For detailed setup instructions and troubleshooting, see [LINTING.md](./LINTING.md).
