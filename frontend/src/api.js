// All calls use relative /api paths. Nginx (Docker) or the Ingress (Kubernetes)
// route them to the backend, so no backend hostname is baked into the bundle.

async function request(path, options = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (typeof body.detail === "string") detail = body.detail;
      else if (Array.isArray(body.detail)) detail = body.detail.map((d) => `${d.loc.at(-1)}: ${d.msg}`).join("; ");
    } catch {
      /* non-JSON error body */
    }
    throw new Error(detail);
  }
  return res.status === 204 ? null : res.json();
}

export const api = {
  listProducts: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
    return request(`/api/products${qs ? `?${qs}` : ""}`);
  },
  stats: () => request("/api/products/stats"),
  movements: (limit = 12) => request(`/api/movements?limit=${limit}`),
  createProduct: (data) => request("/api/products", { method: "POST", body: JSON.stringify(data) }),
  updateProduct: (id, data) => request(`/api/products/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteProduct: (id) => request(`/api/products/${id}`, { method: "DELETE" }),
  adjustStock: (id, data) => request(`/api/products/${id}/adjust`, { method: "POST", body: JSON.stringify(data) }),
};
