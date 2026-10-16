import Icon from "./Icon.jsx";
import { STATUS_LABEL, fmtPrice } from "../format.js";

const TABS = [
  { value: "", label: "All" },
  { value: "in_stock", label: "In stock" },
  { value: "low_stock", label: "Low" },
  { value: "out_of_stock", label: "Out" },
];

function StockBar({ quantity, reorder }) {
  // Bar is full at 3x the reorder level; the tick marks the reorder point.
  const max = Math.max(reorder * 3, quantity, 1);
  return (
    <div className="stockbar" title={`Reorder at ${reorder}`}>
      <div className="stockbar-fill" style={{ width: `${(quantity / max) * 100}%` }} />
      <div className="stockbar-tick" style={{ left: `${(reorder / max) * 100}%` }} />
    </div>
  );
}

export default function ProductTable({
  products, loading, filters, setFilters, categories, counts, onQuickAdjust, onAdjust, onEdit, onDelete,
}) {
  return (
    <section className="card table-card">
      <div className="card-head">
        <div>
          <h2>Products</h2>
          <p className="muted">Stock levels against reorder points</p>
        </div>
        <div className="table-tools">
          <div className="tabs" role="tablist">
            {TABS.map((t) => (
              <button key={t.value} role="tab" aria-selected={filters.status === t.value}
                className={filters.status === t.value ? "active" : ""}
                onClick={() => setFilters((f) => ({ ...f, status: t.value }))}>
                {t.label}
                {t.value && counts ? <span className="tab-count">{counts[t.value]}</span> : null}
              </button>
            ))}
          </div>
          <select value={filters.category} aria-label="Filter by category"
            onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}>
            <option value="">All categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="table-wrap">
        <table className="products">
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th>Stock</th>
              <th className="num">Unit price</th>
              <th>Status</th>
              <th className="actions-col"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {loading && products.length === 0 &&
              [0, 1, 2, 3].map((i) => (
                <tr key={i} className="row-skeleton"><td colSpan={6}><span className="skeleton" /></td></tr>
              ))}
            {!loading && products.length === 0 && (
              <tr><td colSpan={6} className="empty">No products match these filters.</td></tr>
            )}
            {products.map((p) => (
              <tr key={p.id}>
                <td data-label="Product">
                  <div className="prod-name">{p.name}</div>
                  <div className="prod-meta"><span className="mono">{p.sku}</span>{p.supplier ? ` · ${p.supplier}` : ""}</div>
                </td>
                <td data-label="Category"><span className="chip">{p.category}</span></td>
                <td data-label="Stock">
                  <div className="stock-cell">
                    <button className="icon-btn sm" aria-label={`Remove one ${p.name}`} disabled={p.quantity === 0}
                      onClick={() => onQuickAdjust(p, -1)}><Icon name="minus" size={14} /></button>
                    <span className="qty">{p.quantity}</span>
                    <button className="icon-btn sm" aria-label={`Add one ${p.name}`}
                      onClick={() => onQuickAdjust(p, 1)}><Icon name="plus" size={14} /></button>
                    <StockBar quantity={p.quantity} reorder={p.reorder_level} />
                  </div>
                </td>
                <td data-label="Unit price" className="num">{fmtPrice(p.unit_price)}</td>
                <td data-label="Status"><span className={`pill ${p.status}`}>{STATUS_LABEL[p.status]}</span></td>
                <td className="row-actions">
                  <button className="icon-btn" aria-label={`Adjust stock for ${p.name}`} title="Adjust stock" onClick={() => onAdjust(p)}>
                    <Icon name="sliders" size={16} />
                  </button>
                  <button className="icon-btn" aria-label={`Edit ${p.name}`} title="Edit" onClick={() => onEdit(p)}>
                    <Icon name="edit" size={16} />
                  </button>
                  <button className="icon-btn danger" aria-label={`Delete ${p.name}`} title="Delete" onClick={() => onDelete(p)}>
                    <Icon name="trash" size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
