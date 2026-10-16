#!/usr/bin/env bash
# Spins up the whole Kubernetes stack on a local kind cluster - the same chart
# that runs on EKS, without an AWS bill. Requires: docker, kind, kubectl, helm.
#
#   ./scripts/local-cluster.sh          # create + deploy
#   kind delete cluster --name stockpilot
set -euo pipefail
cd "$(dirname "$0")/.."

CLUSTER=stockpilot

if ! kind get clusters | grep -qx "$CLUSTER"; then
  cat <<'KIND' | kind create cluster --name "$CLUSTER" --config=-
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
  - role: control-plane
    kubeadmConfigPatches:
      - |
        kind: InitConfiguration
        nodeRegistration:
          kubeletExtraArgs:
            node-labels: "ingress-ready=true"
    extraPortMappings:
      - { containerPort: 80, hostPort: 80, protocol: TCP }
      - { containerPort: 443, hostPort: 443, protocol: TCP }
KIND
fi

echo "==> Building and loading images"
docker compose build
kind load docker-image stockpilot-backend:local stockpilot-frontend:local --name "$CLUSTER"

./scripts/bootstrap-cluster.sh kind

echo "==> Deploying StockPilot"
kubectl apply -f k8s/namespace.yaml
helm upgrade --install stockpilot ./helm/stockpilot -n stockpilot -f helm/stockpilot/values-dev.yaml --wait --timeout 5m

echo
echo "Add '127.0.0.1 stockpilot.local' to /etc/hosts, then open http://stockpilot.local"
