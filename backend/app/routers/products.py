from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import case, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.metrics import STOCK_ADJUSTMENTS
from app.models import Product, StockMovement
from app.schemas import (
    InventoryStats,
    ProductCreate,
    ProductOut,
    ProductUpdate,
    StockAdjust,
    StockStatus,
)

router = APIRouter(prefix="/api/products", tags=["products"])


def _get_or_404(db: Session, product_id: int) -> Product:
    product = db.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail=f"Product {product_id} not found")
    return product


def _commit_or_conflict(db: Session, sku: str) -> None:
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail=f"SKU {sku} already exists")


@router.get("", response_model=list[ProductOut])
def list_products(
    search: str | None = Query(default=None, max_length=100, description="Match on SKU, name or supplier"),
    category: str | None = Query(default=None, max_length=50),
    status_filter: StockStatus | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
):
    stmt = select(Product)
    if search:
        like = f"%{search.lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(Product.sku).like(like),
                func.lower(Product.name).like(like),
                func.lower(func.coalesce(Product.supplier, "")).like(like),
            )
        )
    if category:
        stmt = stmt.where(Product.category == category)
    if status_filter == "out_of_stock":
        stmt = stmt.where(Product.quantity == 0)
    elif status_filter == "low_stock":
        stmt = stmt.where(Product.quantity > 0, Product.quantity <= Product.reorder_level)
    elif status_filter == "in_stock":
        stmt = stmt.where(Product.quantity > Product.reorder_level)
    return db.scalars(stmt.order_by(Product.name)).all()


@router.get("/stats", response_model=InventoryStats)
def inventory_stats(db: Session = Depends(get_db)):
    totals = db.execute(
        select(
            func.count(Product.id),
            func.coalesce(func.sum(Product.quantity), 0),
            func.coalesce(func.sum(Product.quantity * Product.unit_price), 0),
            func.coalesce(func.sum(case((Product.quantity == 0, 1), else_=0)), 0),
            func.coalesce(
                func.sum(case(((Product.quantity > 0) & (Product.quantity <= Product.reorder_level), 1), else_=0)),
                0,
            ),
        )
    ).one()
    total, units, value, out_of_stock, low_stock = totals
    categories = db.execute(
        select(Product.category, func.count(Product.id), func.coalesce(func.sum(Product.quantity), 0))
        .group_by(Product.category)
        .order_by(func.sum(Product.quantity).desc())
    ).all()
    return InventoryStats(
        total_products=total,
        total_units=units,
        inventory_value=round(float(value), 2),
        in_stock=total - out_of_stock - low_stock,
        low_stock=low_stock,
        out_of_stock=out_of_stock,
        categories=[{"category": c, "products": n, "units": u} for c, n, u in categories],
    )


@router.get("/{product_id}", response_model=ProductOut)
def get_product(product_id: int, db: Session = Depends(get_db)):
    return _get_or_404(db, product_id)


@router.post("", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(payload: ProductCreate, db: Session = Depends(get_db)):
    product = Product(**payload.model_dump())
    db.add(product)
    if product.quantity:
        product.movements.append(
            StockMovement(delta=product.quantity, reason="restock", note="Opening stock", quantity_after=product.quantity)
        )
    _commit_or_conflict(db, payload.sku)
    db.refresh(product)
    return product


@router.put("/{product_id}", response_model=ProductOut)
def update_product(product_id: int, payload: ProductUpdate, db: Session = Depends(get_db)):
    product = _get_or_404(db, product_id)
    changes = payload.model_dump(exclude_unset=True)
    new_qty = changes.pop("quantity", None)
    for field, value in changes.items():
        setattr(product, field, value)
    if new_qty is not None and new_qty != product.quantity:
        # Manual quantity edits are still audited, as a correction.
        product.movements.append(
            StockMovement(delta=new_qty - product.quantity, reason="correction", quantity_after=new_qty)
        )
        product.quantity = new_qty
    _commit_or_conflict(db, product.sku)
    db.refresh(product)
    return product


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(product_id: int, db: Session = Depends(get_db)):
    db.delete(_get_or_404(db, product_id))
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{product_id}/adjust", response_model=ProductOut)
def adjust_stock(product_id: int, payload: StockAdjust, db: Session = Depends(get_db)):
    product = _get_or_404(db, product_id)
    new_qty = product.quantity + payload.delta
    if new_qty < 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot remove {-payload.delta} units: only {product.quantity} in stock",
        )
    product.quantity = new_qty
    product.movements.append(
        StockMovement(delta=payload.delta, reason=payload.reason, note=payload.note, quantity_after=new_qty)
    )
    db.commit()
    db.refresh(product)
    STOCK_ADJUSTMENTS.labels(reason=payload.reason).inc()
    return product
