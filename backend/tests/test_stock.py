def test_adjust_stock_up_and_down(client, make_product):
    product = make_product(quantity=10, reorder_level=5)
    pid = product["id"]

    restocked = client.post(f"/api/products/{pid}/adjust", json={"delta": 15, "reason": "restock"}).json()
    assert restocked["quantity"] == 25

    sold = client.post(f"/api/products/{pid}/adjust", json={"delta": -22, "reason": "sale"}).json()
    assert sold["quantity"] == 3
    assert sold["status"] == "low_stock"


def test_cannot_remove_more_stock_than_available(client, make_product):
    product = make_product(quantity=2)
    response = client.post(f"/api/products/{product['id']}/adjust", json={"delta": -5, "reason": "sale"})
    assert response.status_code == 400
    assert client.get(f"/api/products/{product['id']}").json()["quantity"] == 2


def test_adjust_rejects_zero_delta_and_unknown_reason(client, make_product):
    pid = make_product()["id"]
    assert client.post(f"/api/products/{pid}/adjust", json={"delta": 0, "reason": "sale"}).status_code == 422
    assert client.post(f"/api/products/{pid}/adjust", json={"delta": 1, "reason": "gift"}).status_code == 422


def test_movements_feed_newest_first(client, make_product):
    pid = make_product(quantity=10)["id"]
    client.post(f"/api/products/{pid}/adjust", json={"delta": -1, "reason": "sale", "note": "Order #1001"})
    feed = client.get("/api/movements", params={"limit": 5}).json()
    assert [m["reason"] for m in feed] == ["sale", "restock"]
    assert feed[0]["sku"] == "KB-1042"
    assert feed[0]["note"] == "Order #1001"


def test_stats(client, make_product):
    make_product(sku="A-1", category="Audio", quantity=10, reorder_level=2, unit_price="5.00")
    make_product(sku="A-2", category="Audio", quantity=1, reorder_level=5, unit_price="100.00")
    make_product(sku="D-1", category="Displays", quantity=0, unit_price="300.00")

    stats = client.get("/api/products/stats").json()
    assert stats["total_products"] == 3
    assert stats["total_units"] == 11
    assert stats["inventory_value"] == 150.0
    assert (stats["in_stock"], stats["low_stock"], stats["out_of_stock"]) == (1, 1, 1)
    assert stats["categories"][0] == {"category": "Audio", "products": 2, "units": 11}


def test_stats_on_empty_inventory(client):
    stats = client.get("/api/products/stats").json()
    assert stats["total_products"] == 0
    assert stats["inventory_value"] == 0
    assert stats["categories"] == []
