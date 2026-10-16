# Trivy security scan

## What Trivy scans

In the `build-scan-push` job, Trivy scans both built images before anything is pushed:

- **OS packages**: Debian (backend, `python:3.12-slim`) and Alpine (frontend, `nginx-unprivileged:1.27-alpine`)
- **Language packages**: every Python package in the backend image. The frontend runtime image contains no Node packages because the multi-stage build leaves them behind.

Settings: `--severity HIGH,CRITICAL --ignore-unfixed --exit-code 1`. The pipeline fails if a HIGH or CRITICAL vulnerability **with an available fix** is found. Unfixed ones are reported but don't block, since there is nothing to upgrade to yet.

## What it found, and the fix

The first scan of the backend image **failed** with:

| Package | CVE | Severity | Problem | Fixed in |
|---------|-----|----------|---------|----------|
| starlette 0.48.0 | CVE-2025-62727 | HIGH | Denial of service: a crafted `Range` header causes excessive CPU use when serving files | 0.49.1 |
| starlette 0.48.0 | CVE-2026-48818, CVE-2026-54283 | HIGH | SSRF via UNC paths in `StaticFiles`; form-size limits ignored (DoS) | 1.1.0 / 1.3.1 |
| urllib3 2.7.0, msgpack 1.1.2 (vendored in **pip**) | CVE-2026-97687 and others | HIGH | TLS proxy override, memory exhaustion | 2.8.0 / 1.2.1 |
| setuptools 70.3.0 | CVE-2025-47273 | HIGH | Path traversal in `PackageIndex` | 78.1.1 |

Fixes:

1. Upgraded FastAPI and pinned Starlette 1.7.0, plus current SQLAlchemy, Pydantic and Uvicorn. All 21 tests still passed.
2. Turned the backend Dockerfile into a two-stage build and **removed pip from the runtime image**. The app never installs packages at runtime, so pip and its vendored urllib3/msgpack were attack surface with no benefit.

Result: **0 fixable HIGH/CRITICAL vulnerabilities** in both images. The frontend image was clean from the start because `apk upgrade` runs during the build.

## Summary (for the submission form)

> Trivy scanned the OS packages and Python dependencies inside both container images in the CI pipeline and fails the build on any fixable HIGH or CRITICAL CVE. The first backend scan failed. The worst finding was CVE-2025-62727, a HIGH-severity denial-of-service bug in Starlette (the web framework under FastAPI) where a crafted `Range` header causes excessive CPU use. Upgrading Starlette and removing pip from the runtime image fixed every finding, so both images now scan clean. A clean scan isn't proof of security: it only covers *known* CVEs in packages, not bugs in our own code, leaked secrets or misconfigurations, which is why the pipeline also runs tests and the cluster enforces non-root, restricted pods.

## Run it locally

```bash
docker compose build
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy:0.74.0 \
  image --severity HIGH,CRITICAL --ignore-unfixed stockpilot-backend:local
```
