# Flowterview Backend

A FastAPI-based backend service with Supabase integration for Flowterview.

## Features

- FastAPI framework with async support
- Supabase integration for database operations
- UV package manager for dependency management
- Structured logging with loguru
- Environment-based configuration
- CORS middleware for frontend integration
- Health check and loopback endpoints

## Prerequisites

- Python 3.12 or higher
- UV package manager
- Supabase account and project

## Setup

1. Clone the repository:

```bash
git clone <repository-url>
cd flowterview-backend
```

2. Create and activate a virtual environment:

```bash
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

3. Install dependencies using UV:

```bash
uv pip install -e .
```

4. Create a `.env` file:

```bash
cp .env.example .env
```

5. Update the `.env` file with your Supabase credentials:

```
SUPABASE_URL=your_supabase_url_here
SUPABASE_KEY=your_supabase_anon_key_here
```

## Running the Application

Development mode:

```bash
uv run main.py
```

Production mode:

```bash
ENVIRONMENT=production uv run main.py
```

The server will start at `http://localhost:8000` by default.

## API Endpoints

- `GET /health` - Health check endpoint
- `POST /loopback` - Loopback endpoint for testing (echoes back received data)

## Development

- The application uses UV for dependency management
- Code formatting and linting are handled by Ruff
- Pre-commit hooks are available for code quality checks

## Project Structure

```
flowterview-backend/
├── src/
│   ├── core/
│   │   └── config.py
│   ├── lib/
│   ├── router/
│   └── utils/
│       └── logger.py
├── storage/
├── .env.example
├── main.py
├── pyproject.toml
└── README.md
```

## License

[Your License Here]
