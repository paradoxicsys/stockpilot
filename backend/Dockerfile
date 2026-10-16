# StockPilot backend: FastAPI + SQLAlchemy + Alembic

# ---------- Stage 1: install dependencies into a virtualenv ----------
FROM python:3.12-slim AS build
ENV PIP_NO_CACHE_DIR=1 PIP_DISABLE_PIP_VERSION_CHECK=1
RUN python -m venv /opt/venv
COPY requirements.txt .
RUN /opt/venv/bin/pip install -r requirements.txt \
    && /opt/venv/bin/pip uninstall -y pip

# ---------- Stage 2: slim runtime, no pip, no build tools ----------
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH"

# pip isn't needed at runtime; removing it also removes its vendored libraries
# from the image (fewer packages = fewer CVEs for Trivy to find).
RUN python -m pip uninstall -y pip \
    && rm -rf /usr/local/lib/python3.12/ensurepip

WORKDIR /app
COPY --from=build /opt/venv /opt/venv

# Migrations and application code
COPY alembic.ini .
COPY alembic ./alembic
COPY app ./app
COPY docker-entrypoint.sh .

# Never run as root. A numeric UID lets Kubernetes verify runAsNonRoot.
RUN useradd --system --uid 10001 --no-create-home --shell /usr/sbin/nologin appuser \
    && chmod +x docker-entrypoint.sh
USER 10001

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=2)"

# Runs `alembic upgrade head`, then starts Uvicorn
ENTRYPOINT ["./docker-entrypoint.sh"]
