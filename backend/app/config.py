import os

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg://stockpilot:stockpilot@localhost:5432/stockpilot",
)
APP_VERSION = os.getenv("APP_VERSION", "dev")
CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",") if o.strip()]
