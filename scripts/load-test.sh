#!/usr/bin/env bash
# Generates API traffic so Grafana has data and the HPA has CPU to react to.
#
#   ./scripts/load-test.sh                         # in-cluster, 3 minutes
#   DURATION=600 CONCURRENCY=40 ./scripts/load-test.sh
#
# Runs a throwaway pod inside the cluster (no local tools needed), then deletes it.
# Watch it work in another terminal:
#   kubectl get hpa -n stockpilot -w
set -euo pipefail

NAMESPACE="${NAMESPACE:-stockpilot}"
TARGET="${TARGET:-http://stockpilot-backend.${NAMESPACE}:8000}"
DURATION="${DURATION:-180}"
CONCURRENCY="${CONCURRENCY:-25}"

echo "Load testing ${TARGET} for ${DURATION}s with ${CONCURRENCY} workers..."
kubectl run stockpilot-load --rm -i --restart=Never -n "${NAMESPACE}" \
  --image=curlimages/curl:8.11.1 \
  --overrides='{"spec":{"securityContext":{"runAsNonRoot":true,"runAsUser":100,"seccompProfile":{"type":"RuntimeDefault"}},"containers":[{"name":"stockpilot-load","image":"curlimages/curl:8.11.1","stdin":true,"securityContext":{"allowPrivilegeEscalation":false,"capabilities":{"drop":["ALL"]}},"command":["sh","-c","end=$(( $(date +%s) + '"${DURATION}"' )); worker() { while [ $(date +%s) -lt $end ]; do curl -s -o /dev/null '"${TARGET}"'/api/products; curl -s -o /dev/null '"${TARGET}"'/api/products/stats; curl -s -o /dev/null '"${TARGET}"'/api/movements; curl -s -o /dev/null '"${TARGET}"'/api/products/999999; done; }; for i in $(seq '"${CONCURRENCY}"'); do worker & done; wait; echo done"]}]}}'
