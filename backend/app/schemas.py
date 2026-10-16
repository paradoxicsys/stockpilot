from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

StockStatus = Literal["in_stock", "low_stock", "out_of_stock"]
MovementReason = Literal["restock", "sale", "return", "damage", "correction"]


class ProductBase(BaseModel):
    sku: str = Field(min_length=2, max_length=32, pattern=r"^[A-Za-z0-9-]+$", examples=["KB-1042"])
    name: str = Field(min_length=1, max_length=120, examples=["Mechanical keyboard"])
    category: str = Field(min_length=1, max_length=50, examples=["Peripherals"])
    reorder_level: int = Field(default=10, ge=0, le=1_000_000)
    unit_price: Decimal = Field(default=Decimal("0"), ge=0, max_digits=10, decimal_places=2)
    supplier: str | None = Field(default=None, max_length=120)

    @field_validator("sku")
    @classmethod
    def normalise_sku(cls, v: str) -> str:
        return v.upper()


class ProductCreate(ProductBase):
    quantity: int = Field(default=0, ge=0, le=1_000_000)


class ProductUpdate(BaseModel):
    """All fields optional: only the fields sent are changed."""

    sku: str | None = Field(default=None, min_length=2, max_length=32, pattern=r"^[A-Za-z0-9-]+$")
    name: str | None = Field(default=None, min_length=1, max_length=120)
    category: str | None = Field(default=None, min_length=1, max_length=50)
    quantity: int | None = Field(default=None, ge=0, le=1_000_000)
    reorder_level: int | None = Field(default=None, ge=0, le=1_000_000)
    unit_price: Decimal | None = Field(default=None, ge=0, max_digits=10, decimal_places=2)
    supplier: str | None = Field(default=None, max_length=120)

    @field_validator("sku")
    @classmethod
    def normalise_sku(cls, v: str | None) -> str | None:
        return v.upper() if v else v


class ProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    sku: str
    name: str
    category: str
    quantity: int
    reorder_level: int
    unit_price: float
    supplier: str | None
    status: StockStatus
    created_at: datetime
    updated_at: datetime


class StockAdjust(BaseModel):
    delta: int = Field(ge=-1_000_000, le=1_000_000, description="Positive adds stock, negative removes it")
    reason: MovementReason
    note: str | None = Field(default=None, max_length=200)

    @field_validator("delta")
    @classmethod
    def non_zero(cls, v: int) -> int:
        if v == 0:
            raise ValueError("delta must not be zero")
        return v


class MovementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    sku: str
    product_name: str
    delta: int
    reason: str
    note: str | None
    quantity_after: int
    created_at: datetime


class CategoryStat(BaseModel):
    category: str
    products: int
    units: int


class InventoryStats(BaseModel):
    total_products: int
    total_units: int
    inventory_value: float
    in_stock: int
    low_stock: int
    out_of_stock: int
    categories: list[CategoryStat]
