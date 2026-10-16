# StockPilot

**StockPilot** is an inventory management app for small warehouses and shops. It tracks products, stock levels against reorder points, and an audit trail of every stock movement (restocks, sales, returns, write-offs), so you can see at a glance what's running low and what your inventory is worth.

It's also a complete DevOps capstone: the same app travels from a laptop through CI, security scanning and a container registry to an autoscaled, monitored Kubernetes cluster on AWS, provisioned with Terraform.

![StockPilot dashboard](docs/screenshots/m1-app-browser.png)

## Final deliverables

| | |
|---|---|
| 📄 [Project report (PDF, 9 pages)](Final%20Deliverables/StockPilot-Project-Report.pdf) | Architecture, every DevOps stage, evidence and rubric coverage |
| 🎬 [Demo video (3:21)](Final%20Deliverables/StockPilot-Demo-Video.mp4) | Narrated walkthrough, including a live commit-to-production deploy |
| 🖼️ [Screenshots](docs/screenshots) | Evidence for each rubric module |
| 🔒 [Trivy findings](docs/SECURITY-SCAN.md) | What the security scan found and how it was fixed |

```text
Developer ─► GitHub ─► GitHub Actions ─────────────────────────────► AWS (Terraform)
                        ├─ pytest (21 tests)                          VPC: 2 public + 2 private subnets
                        ├─ frontend build                             NAT gateway
                        ├─ docker build (backend, frontend)           EKS + managed node group
                        ├─ Trivy scan (fail on HIGH/CRITICAL)                │
                        ├─ push to GHCR  :<git-sha>                          ▼
                        └─ helm upgrade --install ──────────────────►  Kubernetes (Helm)
                                                                       ingress-nginx
                                                                     /api │  / 
                                                                 ┌────────┴───────┐
                                                              backend (HPA)    frontend
                                                              FastAPI          React + Nginx
                                                                 │
                                                              PostgreSQL (StatefulSet + EBS)
                                                                 │ /metrics
                                                              Prometheus ─► Grafana
```

## Features

- Dashboard with KPI cards: products, units on hand, inventory value, items needing reorder
- Product table with search, status tabs (in stock / low / out), category filter, quick +/- stock buttons
- Stock adjustments with a reason and note, each recorded in a movement history
- Units-by-category chart and recent-movements feed
- Responsive layout down to phone width, with loading and backend-error states

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, plain CSS, served by unprivileged Nginx |
| Backend | FastAPI, SQLAlchemy 2, Alembic, Pydantic |
| Database | PostgreSQL 16 |
| Tests | pytest + FastAPI TestClient against in-memory SQLite |
| Containers | Docker multi-stage builds, non-root users, Docker Compose |
| CI/CD | GitHub Actions, Trivy, GitHub Container Registry |
| Infrastructure | Terraform: AWS VPC, EKS, EBS CSI driver, GitHub OIDC role |
| Platform | Kubernetes, Helm, ingress-nginx, HPA + metrics-server |
| Observability | Prometheus (ServiceMonitor), Grafana (dashboard in the chart) |

## Repository layout

```text
backend/            FastAPI app (app/), Alembic migrations, pytest suite, Dockerfile
frontend/           React app (src/), Nginx config, multi-stage Dockerfile
docker-compose.yml  Full local stack: postgres + backend + frontend
terraform/          VPC + EKS + IAM (EBS CSI, GitHub OIDC deploy role)
helm/stockpilot/    Helm chart: Deployments, Services, StatefulSet, Ingress, HPA, ServiceMonitor, dashboard
k8s/                Namespace and gp3 StorageClass
monitoring/         kube-prometheus-stack values
troubleshooting/    Deliberately broken manifests for debugging practice
scripts/            Cluster bootstrap, local kind cluster, load test
.github/workflows/  CI/CD pipeline
docs/               Trivy findings write-up and submission screenshots
Final Deliverables/ Project report (PDF) and demo video
```

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Liveness: process is up |
| GET | `/ready` | Readiness: database reachable (503 if not) |
| GET | `/metrics` | Prometheus metrics |
| GET | `/api/products?search=&status=&category=` | List and filter products |
| GET | `/api/products/stats` | KPIs and units per category |
| GET | `/api/products/{id}` | One product |
| POST | `/api/products` | Create a product (409 on duplicate SKU) |
| PUT | `/api/products/{id}` | Update a product (partial) |
| DELETE | `/api/products/{id}` | Delete a product and its history |
| POST | `/api/products/{id}/adjust` | Record a stock movement `{delta, reason, note}` |
| GET | `/api/movements?limit=` | Recent stock movements |

Interactive docs: `http://localhost:8000/docs`.

---

## 1. Run locally with Docker Compose

```bash
docker compose up --build
```

| URL | What |
|-----|------|
| http://localhost:3000 | App (Nginx serves React and proxies `/api` to the backend) |
| http://localhost:8000/docs | Swagger UI |
| http://localhost:8000/metrics | Prometheus metrics |

Demo data is seeded on first start. `docker compose down -v` removes the database volume too.

Inspect the database:

```bash
docker compose exec postgres psql -U stockpilot -c 'select sku, name, quantity, reorder_level from products;'
```

## 2. Run the backend directly

```bash
cd backend
python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
export DATABASE_URL='postgresql+psycopg://stockpilot:stockpilot@localhost:5432/stockpilot'
alembic upgrade head
python -m app.seed            # optional demo data
uvicorn app.main:app --reload --port 8000
```

Frontend dev server (proxies `/api` to port 8000):

```bash
cd frontend && npm install && npm run dev   # http://localhost:5173
```

## 3. Tests

```bash
cd backend && pytest -v
```

21 tests cover health/readiness/metrics, product CRUD, validation, duplicate SKUs, filtering, stock adjustments, movements and stats. Each test gets a fresh in-memory SQLite database (`tests/conftest.py`), so the real PostgreSQL database is never touched.

## 4. CI/CD

`.github/workflows/ci-cd.yml` runs on every push and pull request to `main`:

1. **Test**: `pytest -v` and `npm run build`. A failing test stops the pipeline.
2. **Build, scan & push**: builds both images tagged with the commit SHA, scans each with Trivy (fails on fixable HIGH/CRITICAL CVEs), then pushes to `ghcr.io/<owner>/stockpilot-{backend,frontend}:<sha>`. PRs build and scan but don't push.
3. **Deploy**: `helm upgrade --install` on EKS with the new SHA, waits for the rollout, runs `helm test`, and rolls back on failure. Runs only when the repo variable `DEPLOY_ENABLED=true`.

Repository settings the deploy job needs (Settings → Secrets and variables → Actions → **Variables**). No secrets are required:

| Variable | Value |
|----------|-------|
| `DEPLOY_ENABLED` | `true` while the cluster exists, `false` after `terraform destroy` |
| `AWS_DEPLOY_ROLE_ARN` | `terraform output -raw github_deploy_role_arn` |
| `AWS_REGION` | `ap-south-1` (optional, default) |
| `EKS_CLUSTER_NAME` | `stockpilot-eks` (optional, default) |

After the first push, make both GHCR packages **public** (GitHub → your profile → Packages → package → Package settings → Change visibility) so the cluster can pull them. Alternatively, create a pull secret and set `imagePullSecrets`.

## 5. AWS infrastructure (Terraform)

> EKS, the NAT gateway and the worker nodes cost money every hour. Run `terraform destroy` when you're done.

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars   # set github_repository = "<you>/stockpilot"
terraform init
terraform plan
terraform apply                                 # ~15 minutes
$(terraform output -raw configure_kubectl)      # aws eks update-kubeconfig ...
kubectl get nodes
```

This creates a VPC (2 public + 2 private subnets in 2 AZs, one NAT gateway), an EKS cluster with a 3-node `t3.medium` managed node group in the private subnets, the EBS CSI driver for persistent volumes, and an IAM role GitHub Actions can assume through OIDC. No AWS keys are ever stored in GitHub.

## 6. Kubernetes + Helm

Install the cluster add-ons once (gp3 StorageClass, ingress-nginx, metrics-server, Prometheus + Grafana):

```bash
./scripts/bootstrap-cluster.sh eks
kubectl apply -f k8s/namespace.yaml
```

Deploy (CI does this automatically on every push to `main`):

```bash
helm upgrade --install stockpilot ./helm/stockpilot -n stockpilot \
  -f helm/stockpilot/values-eks.yaml \
  --set backend.image.repository=ghcr.io/<owner>/stockpilot-backend  --set backend.image.tag=<sha> \
  --set frontend.image.repository=ghcr.io/<owner>/stockpilot-frontend --set frontend.image.tag=<sha>

kubectl get pods,svc,hpa,ingress -n stockpilot
helm list -n stockpilot
helm test stockpilot -n stockpilot

# Application URL (ingress-nginx load balancer)
kubectl get svc -n ingress-nginx ingress-nginx-controller -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'
```

What the chart deploys:

| Resource | Details |
|----------|---------|
| Backend Deployment | 2 to 6 replicas (HPA at 60% CPU), liveness `/health`, readiness `/ready`, init container waits for Postgres |
| Frontend Deployment | 2 replicas, Nginx on 8080 |
| PostgreSQL StatefulSet | 1 replica, 2 Gi PVC (gp3 on EKS) |
| Services | ClusterIP for backend (8000), frontend (80), postgres (5432) |
| Ingress | `/api`, `/docs`, `/openapi.json` → backend; `/` → frontend |
| Secret | DB credentials; random password generated on install and kept across upgrades |
| ServiceMonitor + dashboard ConfigMap | Prometheus scraping and the Grafana "StockPilot API" dashboard |

All pods run as non-root with all Linux capabilities dropped, and the namespace enforces the Kubernetes `restricted` Pod Security Standard.

Rollback: `helm history stockpilot -n stockpilot`, then `helm rollback stockpilot <revision> -n stockpilot`.

### No AWS? Use a local cluster

```bash
brew install kind            # or see https://kind.sigs.k8s.io
./scripts/local-cluster.sh   # kind cluster + add-ons + chart with values-dev.yaml
echo "127.0.0.1 stockpilot.local" | sudo tee -a /etc/hosts
open http://stockpilot.local
kind delete cluster --name stockpilot
```

## 7. Autoscaling

```bash
kubectl get hpa -n stockpilot -w          # terminal 1
./scripts/load-test.sh                    # terminal 2: 3 minutes, 25 concurrent workers
```

On a local kind cluster the backend scaled from 2 to 6 pods within about a minute, then back to 2 after the load stopped.

## 8. Monitoring

See [monitoring/README.md](monitoring/README.md). In short:

```bash
kubectl port-forward -n monitoring svc/kube-prometheus-stack-prometheus 9090:9090   # /targets: stockpilot-backend UP
kubectl port-forward -n monitoring svc/kube-prometheus-stack-grafana 3001:80        # admin / stockpilot-admin
```

The **StockPilot API** dashboard shows request rate, 5xx error rate, p50/p95 latency per endpoint, status codes, stock adjustments by reason (a custom business metric), and backend CPU/memory per pod, which you can watch alongside the HPA.

## 9. Troubleshooting labs

See [troubleshooting/README.md](troubleshooting/README.md): `ImagePullBackOff` from a bad tag, a Service whose selector matches no pods, and a pod that's `Running` but never `Ready`.

## 10. Tear down

```bash
helm uninstall stockpilot -n stockpilot
cd terraform && terraform destroy
```

Then set the `DEPLOY_ENABLED` repository variable to `false`.

## Design notes

- **Liveness vs readiness.** `/health` never touches the database, so a database outage doesn't make Kubernetes restart every pod. `/ready` does check it, so pods leave the Service until they can actually serve requests.
- **Migrations on startup.** Each backend pod runs `alembic upgrade head` before starting. A Postgres advisory lock makes concurrent replicas take turns. Seeding demo data uses the same approach.
- **Smaller images, fewer CVEs.** The backend image is built in two stages and pip is removed from the runtime image. That removed every HIGH finding Trivy reported against pip's vendored libraries.
- **PostgreSQL in Kubernetes vs Amazon RDS.** Running Postgres as a StatefulSet keeps this project self-contained and cheap. In production I'd use RDS (Multi-AZ, automated backups, point-in-time recovery, managed patching) and pass its URL in through the `DATABASE_URL` secret.
