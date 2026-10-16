#!/usr/bin/env bash
# Installs the cluster add-ons StockPilot depends on:
#   ingress-nginx       -> implements the Ingress resource
#   metrics-server      -> CPU metrics for the HPA
#   kube-prometheus-stack -> Prometheus + Grafana
#
#   ./scripts/bootstrap-cluster.sh eks     # after terraform apply + update-kubeconfig
#   ./scripts/bootstrap-cluster.sh kind    # local kind cluster
set -euo pipefail
cd "$(dirname "$0")/.."
TARGET="${1:-eks}"

helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx >/dev/null
helm repo add metrics-server https://kubernetes-sigs.github.io/metrics-server/ >/dev/null
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts >/dev/null
helm repo update >/dev/null

if [ "$TARGET" = "eks" ]; then
  echo "==> Default gp3 StorageClass"
  kubectl apply -f k8s/storageclass-gp3.yaml
  # gp2 is no longer the default on recent EKS, but un-default it if present
  kubectl annotate storageclass gp2 storageclass.kubernetes.io/is-default-class=false --overwrite 2>/dev/null || true

  echo "==> ingress-nginx (AWS Network Load Balancer)"
  helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx -n ingress-nginx --create-namespace \
    --set controller.service.annotations."service\.beta\.kubernetes\.io/aws-load-balancer-type"=nlb \
    --wait --timeout 10m

  echo "==> metrics-server"
  helm upgrade --install metrics-server metrics-server/metrics-server -n kube-system --wait
else
  echo "==> ingress-nginx (kind host ports)"
  helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx -n ingress-nginx --create-namespace \
    --set controller.hostPort.enabled=true \
    --set controller.service.type=ClusterIP \
    --set-string controller.nodeSelector.ingress-ready=true \
    --set controller.tolerations[0].key=node-role.kubernetes.io/control-plane \
    --set controller.tolerations[0].operator=Exists \
    --set controller.tolerations[0].effect=NoSchedule \
    --wait --timeout 5m

  echo "==> metrics-server (kind kubelets use self-signed certs)"
  helm upgrade --install metrics-server metrics-server/metrics-server -n kube-system \
    --set args={--kubelet-insecure-tls} --wait
fi

echo "==> kube-prometheus-stack"
helm upgrade --install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
  -n monitoring --create-namespace -f monitoring/kube-prometheus-stack-values.yaml --wait --timeout 10m

echo "==> Add-ons ready"
