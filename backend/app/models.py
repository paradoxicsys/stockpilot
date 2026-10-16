from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(primary_key=True)
    sku: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(120))
    category: Mapped[str] = mapped_column(String(50), index=True)
    quantity: Mapped[int] = mapped_column(Integer, default=0)
    reorder_level: Mapped[int] = mapped_column(Integer, default=10)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    supplier: Mapped[str | None] = mapped_column(String(120), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    movements: Mapped[list["StockMovement"]] = relationship(
        back_populates="product", cascade="all, delete-orphan", passive_deletes=True
    )

    @property
    def status(self) -> str:
        if self.quantity == 0:
            return "out_of_stock"
        if self.quantity <= self.reorder_level:
            return "low_stock"
        return "in_stock"


class StockMovement(Base):
    """Audit trail: every change to a product's quantity is recorded here."""

    __tablename__ = "stock_movements"

    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), index=True)
    delta: Mapped[int] = mapped_column(Integer)
    reason: Mapped[str] = mapped_column(String(30))
    note: Mapped[str | None] = mapped_column(String(200), nullable=True)
    quantity_after: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)

    product: Mapped[Product] = relationship(back_populates="movements")

    @property
    def sku(self) -> str:
        return self.product.sku

    @property
    def product_name(self) -> str:
        return self.product.name
