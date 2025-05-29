# Linting Setup for Hexagon-A Codebase

This document describes the comprehensive linting setup for the Hexagon-A project, which includes both Python backends and Next.js frontends.

## 🏗️ Project Structure

```
Hexagon-A/
├── backend/                 # Python FastAPI backend
├── flowterview-backend/     # Python FastAPI backend
├── frontend/               # Next.js frontend application
├── flowterview-app/        # Next.js frontend application
└── .pre-commit-config.yaml # Root pre-commit configuration
```

## 🛠️ Linting Tools

### Python Projects (backend, flowterview-backend)

- **[Ruff](https://docs.astral.sh/ruff/)**: Ultra-fast Python linter and formatter
  - Linting rules: E, F, I, N, W, B, C4, ARG, SIM
  - Auto-fixing enabled for import sorting and other issues
  - Black-compatible formatting

### Next.js Projects (frontend, flowterview-app)

- **[ESLint](https://eslint.org/)**: JavaScript/TypeScript linting
  - Next.js core web vitals rules
  - TypeScript support
- **[Prettier](https://prettier.io/)**: Code formatting for JS/TS/CSS/JSON/MD

## 🚀 Quick Setup

Run the setup script to configure everything:

```bash
./setup-precommit.sh
```

This script will:

1. Install pre-commit hooks
2. Install Python dependencies (including Ruff)
3. Install Node.js dependencies (including ESLint)
4. Run initial formatting on all files

## 📋 Manual Setup

If you prefer to set up manually:

### 1. Install Pre-commit

```bash
pip install pre-commit
pre-commit install
```

### 2. Python Backends Setup

```bash
# Backend
cd backend
uv sync --dev
cd ..

# Flowterview Backend
cd flowterview-backend
uv sync --dev
cd ..
```

### 3. Frontend Setup

```bash
# Frontend
cd frontend
pnpm install
cd ..

# Flowterview App
cd flowterview-app
pnpm install
cd ..
```

## 🎯 Usage

### Automatic Linting (Recommended)

Pre-commit hooks will automatically run when you commit:

```bash
git add .
git commit -m "Your commit message"
# Linting runs automatically and may modify files
```

### Manual Linting

#### Run all linters on all files:

```bash
pre-commit run --all-files
```

#### Run specific linters:

```bash
# Python linting only
pre-commit run ruff --all-files
pre-commit run ruff-format --all-files

# Frontend linting only
cd frontend && pnpm lint
cd flowterview-app && pnpm lint
```

#### Individual project linting:

```bash
# Python projects
cd backend && uv run ruff check .
cd backend && uv run ruff format .

cd flowterview-backend && uv run ruff check .
cd flowterview-backend && uv run ruff format .

# Next.js projects
cd frontend && pnpm lint
cd flowterview-app && pnpm lint
```

## ⚙️ Configuration

### Python Configuration (pyproject.toml)

Each Python project has Ruff configured in `pyproject.toml`:

- Line length: 100 characters
- Target Python version: 3.12
- Selected rules include import sorting, code style, and best practices

### ESLint Configuration

Next.js projects use ESLint with:

- Next.js core web vitals
- TypeScript support
- Configuration in `eslint.config.mjs`

### Pre-commit Configuration

The root `.pre-commit-config.yaml` includes:

- Ruff linting for Python files in backend directories
- ESLint for TypeScript/JavaScript files in frontend directories
- Prettier for code formatting
- General file quality checks (trailing whitespace, large files, etc.)

## 🔧 Customization

### Adding New Rules

1. **Python**: Edit `[tool.ruff.lint]` section in `pyproject.toml`
2. **Frontend**: Modify `eslint.config.mjs` in respective directories

### Excluding Files

Add patterns to `.pre-commit-config.yaml` exclude lists or create `.eslintignore`/`.ruffignore` files.

## 🐛 Troubleshooting

### Pre-commit hooks not running

```bash
pre-commit install --install-hooks
```

### ESLint errors in frontend

```bash
cd frontend && pnpm lint --fix
cd flowterview-app && pnpm lint --fix
```

### Ruff errors in Python

```bash
cd backend && uv run ruff check --fix .
cd flowterview-backend && uv run ruff check --fix .
```

### Dependencies issues

```bash
# Python
uv sync --dev

# Node.js
pnpm install
```

## 📁 Files Created/Modified

This setup creates or modifies:

- `.pre-commit-config.yaml` (root)
- `frontend/eslint.config.mjs`
- `frontend/package.json` (added ESLint)
- `flowterview-backend/.pre-commit-config.yaml`
- `setup-precommit.sh`
- `LINTING.md` (this file)

## 💡 Best Practices

1. **Always run setup script** after pulling changes that affect dependencies
2. **Commit frequently** to catch linting issues early
3. **Fix linting errors** rather than disabling rules
4. **Use auto-fix** when available (`--fix` flags)
5. **Keep configurations in sync** across similar projects

## 🎯 Benefits

- ✅ Consistent code style across all projects
- ✅ Automatic import sorting and formatting
- ✅ Early detection of potential bugs
- ✅ Improved code readability and maintainability
- ✅ Enforced best practices for Python and TypeScript
- ✅ Pre-commit hooks prevent committing poorly formatted code
