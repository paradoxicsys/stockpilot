# Monitoring

| File | Purpose |
|------|---------|
| `kube-prometheus-stack-values.yaml` | Prometheus Operator + Prometheus + Grafana (+ kube-state-metrics, node-exporter) |
| `../helm/stockpilot/templates/servicemonitor.yaml` | Tells Prometheus to scrape the backend's `/metrics` |
| `../helm/stockpilot/files/grafana-dashboard.json` | "StockPilot API" dashboard, auto-loaded by the Grafana sidecar |

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm upgrade --install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
  -n monitoring --create-namespace -f monitoring/kube-prometheus-stack-values.yaml

# Prometheus targets page -> look for serviceMonitor/stockpilot/stockpilot-backend (UP)
kubectl port-forward -n monitoring svc/kube-prometheus-stack-prometheus 9090:9090
open http://localhost:9090/targets

# Grafana (admin / stockpilot-admin) -> Dashboards -> StockPilot API
kubectl port-forward -n monitoring svc/kube-prometheus-stack-grafana 3001:80
open http://localhost:3001
```

Generate traffic so the panels have data: `./scripts/load-test.sh`.

Useful PromQL:

```promql
sum by (handler) (rate(http_requests_total{job="stockpilot-backend"}[1m]))            # request rate
histogram_quantile(0.95, sum by (le) (rate(http_request_duration_seconds_bucket[5m])))  # p95 latency
sum(rate(http_requests_total{status="5xx"}[5m]))                                         # errors
sum by (reason) (increase(stockpilot_stock_adjustments_total[1h]))                       # business metric
```
