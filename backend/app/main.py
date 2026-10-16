import logging

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from prometheus_fastapi_instrumentator import Instrumentator
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import APP_VERSION, CORS_ORIGINS
from app.database import get_db
from app.routers import movements, products

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
log = logging.getLogger("stockpilot")

app = FastAPI(
    title="StockPilot API",
    description="Inventory management API: products, stock levels and stock movements.",
    version=APP_VERSION,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(products.router)
app.include_router(movements.router)

# Exposes /metrics in Prometheus format. Probe and scrape traffic is excluded
# so dashboards show real user traffic only.
Instrumentator(excluded_handlers=["/metrics", "/health", "/ready"]).instrument(app).expose(
    app, include_in_schema=False
)


@app.get("/", tags=["meta"])
def root():
    return {"service": "stockpilot-api", "version": APP_VERSION, "docs": "/docs"}


@app.get("/health", tags=["meta"])
def health():
    """Liveness: the process is up and serving HTTP. Deliberately does NOT touch the DB."""
    return {"status": "ok"}


@app.get("/ready", tags=["meta"])
def ready(db: Session = Depends(get_db)):
    """Readiness: can we serve traffic right now? Requires a working DB connection."""
    try:
        db.execute(text("SELECT 1"))
    except Exception as exc:  # noqa: BLE001 - any DB failure means not ready
        log.warning("readiness check failed: %s", exc)
        return JSONResponse(status_code=503, content={"status": "not ready", "database": "unreachable"})
    return {"status": "ready", "database": "ok"}
