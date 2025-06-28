FROM python:3.13-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
  PYTHONUNBUFFERED=1 \
  PIP_NO_CACHE_DIR=off \
  PIP_DISABLE_PIP_VERSION_CHECK=on

# Install system dependencies required for some Python packages
RUN apt-get update && apt-get install -y --no-install-recommends \
  build-essential \
  gcc \
  curl \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install uv
RUN pip install uv

# Copy project files
COPY pyproject.toml main.py uv.lock ./
COPY src/ ./src/
COPY storage/ ./storage/

# Install dependencies using uv
RUN uv sync

# Expose the port your application runs on
EXPOSE 8000

# Command to run the application
CMD ["uv", "run", "main.py"]