# Troubleshooting labs

All labs run in their own `stockpilot-lab` namespace so they never touch the real app.
Clean up with `kubectl delete namespace stockpilot-lab`.

| Lab | Symptom | Root cause | Key commands |
|-----|---------|-----------|--------------|
| `broken-image.yaml` | `ImagePullBackOff` | Image tag typo | `kubectl describe pod`, `kubectl get events` |
| `broken-service.yaml` | Service has no endpoints, requests fail | Selector doesn't match pod labels | `kubectl get pods --show-labels`, `kubectl get endpointslices` |
| `broken-readiness.yaml` | Pod `Running` but `0/1 READY` | Readiness probe hits a path that doesn't exist | `kubectl describe pod` (Events) |

## Investigation flow

```text
kubectl get pods            what state is it in?
      |
kubectl describe pod        Events at the bottom say WHY
      |
kubectl logs <pod> [-p]     app-level errors (-p = previous crashed container)
      |
kubectl get svc,endpointslices   is traffic reaching the pods?
```

## Solutions

<details><summary>Lab 1</summary>

`image: nginxinc/nginx-unprivileged:1.27-alpine`, then `kubectl apply -f ...`. Or live:
`kubectl set image deploy/inventory-worker worker=nginxinc/nginx-unprivileged:1.27-alpine -n stockpilot-lab`
</details>

<details><summary>Lab 2</summary>

Change the Service selector to `app: label-printer`. `kubectl get endpointslices -n stockpilot-lab` now lists two pod IPs.
</details>

<details><summary>Lab 3</summary>

Change the readiness probe path to `/`. The pod becomes `1/1 READY` within a few seconds.
</details>
