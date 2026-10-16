def test_root_reports_service_and_version(client):
    body = client.get("/").json()
    assert body["service"] == "stockpilot-api"
    assert "version" in body


def test_health_is_ok(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_ready_checks_database(client):
    response = client.get("/ready")
    assert response.status_code == 200
    assert response.json()["database"] == "ok"


def test_metrics_exposed_in_prometheus_format(client):
    client.get("/api/products")
    response = client.get("/metrics")
    assert response.status_code == 200
    assert "http_requests_total" in response.text
    assert 'handler="/api/products"' in response.text
