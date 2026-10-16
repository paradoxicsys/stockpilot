# StockPilot backend: FastAPI + SQLAlchemy + Alembic
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# 1. Dependencies first, so this layer is cached until requirements.txt changes
COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

# 2. Migrations and application code
COPY alembic.ini .
COPY alembic ./alembic
COPY app ./app
COPY docker-entrypoint.sh .

# 3. Never run as root. A numeric UID lets Kubernetes verify runAsNonRoot.
RUN useradd --system --uid 10001 --no-create-home --shell /usr/sbin/nologin appuser \
    && chmod +x docker-entrypoint.sh
USER 10001

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=2)"

# Runs `alembic upgrade head`, then starts Uvicorn
ENTRYPOINT ["./docker-entrypoint.sh"]
