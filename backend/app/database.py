from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import DATABASE_URL

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, pool_pre_ping=True, connect_args=connect_args)


def enable_sqlite_foreign_keys(engine):
    """SQLite ignores ON DELETE CASCADE unless foreign keys are switched on per connection."""

    @event.listens_for(engine, "connect")
    def _fk_pragma(dbapi_conn, _record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


if DATABASE_URL.startswith("sqlite"):
    enable_sqlite_foreign_keys(engine)

SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    """FastAPI dependency: one session per request, always closed."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
