from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import StockMovement
from app.schemas import MovementOut

router = APIRouter(prefix="/api/movements", tags=["movements"])


@router.get("", response_model=list[MovementOut])
def recent_movements(limit: int = Query(default=20, ge=1, le=200), db: Session = Depends(get_db)):
    stmt = (
        select(StockMovement)
        .options(joinedload(StockMovement.product))
        .order_by(StockMovement.created_at.desc(), StockMovement.id.desc())
        .limit(limit)
    )
    return db.scalars(stmt).all()
