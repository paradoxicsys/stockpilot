import { useCallback, useEffect, useState } from "react";
import { api } from "./api.js";
import Icon from "./components/Icon.jsx";
import Sidebar from "./components/Sidebar.jsx";
import KpiCards from "./components/KpiCards.jsx";
import ProductTable from "./components/ProductTable.jsx";
import { ActivityFeed, CategoryPanel } from "./components/SidePanels.jsx";
import { AdjustModal, ProductModal } from "./components/Modals.jsx";

export default function App() {
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState(null);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({ search: "", status: "", category: "" });
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null); // {type: "create"|"edit"|"adjust", product?}
  const [toast, setToast] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const notify = (message, tone = "ok") => {
    setToast({ message, tone });
    setTimeout(() => setToast(null), 3000);
  };

  const refresh = useCallback(async () => {
    try {
      const [p, s, m] = await Promise.all([api.listProducts(filters), api.stats(), api.movements()]);
      setProducts(p);
      setStats(s);
      setMovements(m);
      setError("");
    } catch (err) {
      setError(err.message || "Backend unreachable");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Debounce the search box so we don't call the API on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setFilters((f) => (f.search === search ? f : { ...f, search })), 250);
    return () => clearTimeout(t);
  }, [search]);

  async function run(action, success) {
    await action();
    setModal(null);
    notify(success);
    refresh();
  }

  async function quickAdjust(product, delta) {
    try {
      await api.adjustStock(product.id, { delta, reason: delta > 0 ? "restock" : "sale" });
      refresh();
    } catch (err) {
      notify(err.message, "bad");
    }
  }

  async function remove(product) {
    if (!window.confirm(`Delete ${product.name} (${product.sku})? Its movement history is deleted too.`)) return;
    try {
      await run(() => api.deleteProduct(product.id), `${product.sku} deleted`);
    } catch (err) {
      notify(err.message, "bad");
    }
  }

  const categories = stats?.categories.map((c) => c.category).sort() ?? [];
  const counts = stats && { in_stock: stats.in_stock, low_stock: stats.low_stock, out_of_stock: stats.out_of_stock };

  return (
    <div className="layout">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} apiOnline={!error && !loading} />

      <main className="main">
        <header className="topbar">
          <button className="icon-btn menu-btn" aria-label="Open navigation" onClick={() => setSidebarOpen(true)}>
            <Icon name="menu" />
          </button>
          <div className="title">
            <h1>Inventory overview</h1>
            <p className="muted">Live stock levels, reorder alerts and a full movement audit trail</p>
          </div>
          <div className="topbar-actions">
            <label className="search">
              <Icon name="search" size={16} />
              <input type="search" placeholder="Search SKU, name, supplier" value={search}
                onChange={(e) => setSearch(e.target.value)} aria-label="Search products" />
            </label>
            <button className="icon-btn" aria-label="Refresh" title="Refresh" onClick={refresh}><Icon name="refresh" /></button>
            <button className="btn primary" onClick={() => setModal({ type: "create" })}>
              <Icon name="plus" size={16} /> <span>New product</span>
            </button>
          </div>
        </header>

        {error && (
          <div className="banner" role="alert">
            <Icon name="alert" />
            <div>
              <strong>Can't reach the StockPilot API.</strong> {error}
              <div className="small">Check that the backend is running and /api is routed to it.</div>
            </div>
            <button className="btn ghost sm" onClick={refresh}>Retry</button>
          </div>
        )}

        <KpiCards stats={stats} />

        <div className="content-grid">
          <ProductTable
            products={products}
            loading={loading}
            filters={filters}
            setFilters={setFilters}
            categories={categories}
            counts={counts}
            onQuickAdjust={quickAdjust}
            onAdjust={(p) => setModal({ type: "adjust", product: p })}
            onEdit={(p) => setModal({ type: "edit", product: p })}
            onDelete={remove}
          />
          <div className="side-col">
            <CategoryPanel stats={stats} />
            <ActivityFeed movements={movements} />
          </div>
        </div>
      </main>

      {modal?.type === "create" && (
        <ProductModal categories={categories} onClose={() => setModal(null)}
          onSave={(data) => run(() => api.createProduct(data), `${data.sku.toUpperCase()} created`)} />
      )}
      {modal?.type === "edit" && (
        <ProductModal product={modal.product} categories={categories} onClose={() => setModal(null)}
          onSave={(data) => run(() => api.updateProduct(modal.product.id, data), "Product updated")} />
      )}
      {modal?.type === "adjust" && (
        <AdjustModal product={modal.product} onClose={() => setModal(null)}
          onSave={(data) => run(() => api.adjustStock(modal.product.id, data), "Stock movement recorded")} />
      )}

      {toast && <div className={`toast ${toast.tone}`} role="status">{toast.message}</div>}
    </div>
  );
}
