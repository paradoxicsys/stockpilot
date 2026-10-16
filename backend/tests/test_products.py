def test_create_product(client, make_product):
    product = make_product()
    assert product["id"] > 0
    assert product["sku"] == "KB-1042"
    assert product["unit_price"] == 79.0
    assert product["status"] == "in_stock"


def test_sku_is_normalised_to_upper_case(make_product):
    assert make_product(sku="ms-2210")["sku"] == "MS-2210"


def test_duplicate_sku_is_rejected(client, make_product):
    make_product()
    response = client.post(
        "/api/products", json={"sku": "KB-1042", "name": "Duplicate", "category": "Peripherals"}
    )
    assert response.status_code == 409


def test_invalid_payload_is_rejected(client):
    response = client.post("/api/products", json={"sku": "bad sku!", "name": "", "category": "X", "quantity": -1})
    assert response.status_code == 422


def test_list_products(client, make_product):
    make_product(sku="A-1", name="Alpha")
    make_product(sku="B-1", name="Bravo")
    names = [p["name"] for p in client.get("/api/products").json()]
    assert names == ["Alpha", "Bravo"]


def test_list_filters_by_status_search_and_category(client, make_product):
    make_product(sku="IN-1", name="Plenty", quantity=100, reorder_level=10, category="Audio")
    make_product(sku="LOW-1", name="Running low", quantity=3, reorder_level=10)
    make_product(sku="OUT-1", name="Sold out", quantity=0)

    def skus(**params):
        return [p["sku"] for p in client.get("/api/products", params=params).json()]

    assert skus(status="low_stock") == ["LOW-1"]
    assert skus(status="out_of_stock") == ["OUT-1"]
    assert skus(status="in_stock") == ["IN-1"]
    assert skus(search="sold") == ["OUT-1"]
    assert skus(category="Audio") == ["IN-1"]


def test_get_product_and_404(client, make_product):
    product = make_product()
    assert client.get(f"/api/products/{product['id']}").json()["name"] == "Mechanical keyboard"
    assert client.get("/api/products/9999").status_code == 404


def test_update_product_partial(client, make_product):
    product = make_product()
    response = client.put(f"/api/products/{product['id']}", json={"name": "Keyboard v2", "unit_price": "85.50"})
    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "Keyboard v2"
    assert body["unit_price"] == 85.5
    assert body["sku"] == "KB-1042"


def test_update_quantity_is_audited_as_correction(client, make_product):
    product = make_product(quantity=40)
    client.put(f"/api/products/{product['id']}", json={"quantity": 35})
    latest = client.get("/api/movements").json()[0]
    assert latest["reason"] == "correction"
    assert latest["delta"] == -5
    assert latest["quantity_after"] == 35


def test_update_missing_product_returns_404(client):
    assert client.put("/api/products/9999", json={"name": "Ghost"}).status_code == 404


def test_delete_product(client, make_product):
    product = make_product()
    assert client.delete(f"/api/products/{product['id']}").status_code == 204
    assert client.get(f"/api/products/{product['id']}").status_code == 404
    assert client.get("/api/movements").json() == []
    assert client.delete(f"/api/products/{product['id']}").status_code == 404
