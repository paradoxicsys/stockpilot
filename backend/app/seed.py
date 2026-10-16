"""Insert demo inventory if the products table is empty. Safe to run repeatedly."""

from decimal import Decimal

from sqlalchemy import func, select, text

from app.database import SessionLocal
from app.models import Product, StockMovement

SEED_LOCK_ID = 7_301_2025

DEMO_PRODUCTS = [
    ("KB-1042", "Mechanical keyboard", "Peripherals", 48, 15, "79.00", "KeyWorks Ltd"),
    ("MS-2210", "Wireless mouse", "Peripherals", 9, 20, "24.50", "KeyWorks Ltd"),
    ("MN-2701", '27" 4K monitor', "Displays", 14, 5, "329.00", "Pixelline"),
    ("MN-2402", '24" office monitor', "Displays", 0, 6, "149.00", "Pixelline"),
    ("LT-1400", "14\" ultrabook", "Laptops", 7, 4, "1149.00", "Northwind Computing"),
    ("LT-1600", "16\" workstation", "Laptops", 3, 4, "2199.00", "Northwind Computing"),
    ("CB-0030", "USB-C cable 2m", "Accessories", 260, 50, "9.90", "CableCo"),
    ("DK-0500", "USB-C docking station", "Accessories", 22, 10, "189.00", "CableCo"),
    ("HS-0800", "Noise-cancelling headset", "Audio", 31, 10, "139.00", "SoundForm"),
    ("WC-1080", "1080p webcam", "Audio", 5, 8, "59.00", "SoundForm"),
]


def seed() -> int:
    with SessionLocal() as db:
        if db.get_bind().dialect.name == "postgresql":
            # Replicas start together; the lock (released on commit) makes only
            # the first one seed and the rest see a non-empty table.
            db.execute(text("SELECT pg_advisory_xact_lock(:id)"), {"id": SEED_LOCK_ID})
        if db.scalar(select(func.count(Product.id))):
            return 0
        for sku, name, category, qty, reorder, price, supplier in DEMO_PRODUCTS:
            product = Product(
                sku=sku, name=name, category=category, quantity=qty,
                reorder_level=reorder, unit_price=Decimal(price), supplier=supplier,
            )
            if qty:
                product.movements.append(
                    StockMovement(delta=qty, reason="restock", note="Opening stock", quantity_after=qty)
                )
            db.add(product)
        db.commit()
        return len(DEMO_PRODUCTS)


if __name__ == "__main__":
    print(f"seeded {seed()} products")
