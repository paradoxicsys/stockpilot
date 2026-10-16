from prometheus_client import Counter

# Business metric on top of the HTTP metrics the instrumentator provides.
STOCK_ADJUSTMENTS = Counter(
    "stockpilot_stock_adjustments_total",
    "Stock adjustments recorded, by reason",
    ["reason"],
)
