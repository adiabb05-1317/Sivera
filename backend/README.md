# Hexagon-A Backend

FastAPI backend for the Hexagon-A project.

## Setup

1. Install dependencies using uv:

```bash
uv venv
source .venv/bin/activate  # On Unix/macOS
# or
.venv\Scripts\activate  # On Windows
uv pip install -r requirements.txt
```

## Development

Run the development server:

```bash
uvicorn src.app.main:app --reload --port 8000
```

## API Documentation

Once running, access:

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
