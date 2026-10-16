import { useEffect, useRef, useState } from "react";
import Icon from "./Icon.jsx";

function Modal({ title, onClose, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    ref.current?.querySelector("input, select")?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" aria-label="Close" onClick={onClose}><Icon name="close" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

const EMPTY = { sku: "", name: "", category: "", quantity: 0, reorder_level: 10, unit_price: "", supplier: "" };

export function ProductModal({ product, categories, onClose, onSave }) {
  const editing = Boolean(product);
  const [form, setForm] = useState(() => (product ? { ...product, supplier: product.supplier ?? "" } : EMPTY));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const payload = {
      sku: form.sku.trim(),
      name: form.name.trim(),
      category: form.category.trim(),
      reorder_level: Number(form.reorder_level),
      unit_price: String(form.unit_price || 0),
      supplier: form.supplier.trim() || null,
    };
    if (!editing) payload.quantity = Number(form.quantity);
    try {
      await onSave(payload);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <Modal title={editing ? `Edit ${product.name}` : "New product"} onClose={onClose}>
      <form onSubmit={submit} className="form">
        <div className="form-row">
          <label>SKU<input required value={form.sku} onChange={set("sku")} placeholder="KB-1042" pattern="[A-Za-z0-9\-]{2,32}" /></label>
          <label>Category
            <input required value={form.category} onChange={set("category")} list="category-options" placeholder="Peripherals" />
            <datalist id="category-options">{categories.map((c) => <option key={c} value={c} />)}</datalist>
          </label>
        </div>
        <label>Name<input required value={form.name} onChange={set("name")} placeholder="Mechanical keyboard" maxLength={120} /></label>
        <label>Supplier<input value={form.supplier} onChange={set("supplier")} placeholder="Optional" maxLength={120} /></label>
        <div className="form-row three">
          {!editing && <label>Opening stock<input type="number" min="0" required value={form.quantity} onChange={set("quantity")} /></label>}
          <label>Reorder level<input type="number" min="0" required value={form.reorder_level} onChange={set("reorder_level")} /></label>
          <label>Unit price ($)<input type="number" min="0" step="0.01" value={form.unit_price} onChange={set("unit_price")} placeholder="0.00" /></label>
        </div>
        {editing && <p className="muted small">Change stock with <em>Adjust stock</em> so every change is recorded.</p>}
        {error && <div className="form-error" role="alert">{error}</div>}
        <div className="modal-actions">
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn primary" disabled={saving}>{saving ? "Saving…" : editing ? "Save changes" : "Create product"}</button>
        </div>
      </form>
    </Modal>
  );
}

const REASONS = [
  { value: "restock", label: "Restock (+)", sign: 1 },
  { value: "return", label: "Customer return (+)", sign: 1 },
  { value: "sale", label: "Sale (−)", sign: -1 },
  { value: "damage", label: "Damaged / write-off (−)", sign: -1 },
];

export function AdjustModal({ product, onClose, onSave }) {
  const [reason, setReason] = useState("restock");
  const [amount, setAmount] = useState(1);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const sign = REASONS.find((r) => r.value === reason).sign;
  const after = product.quantity + sign * Number(amount || 0);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSave({ delta: sign * Number(amount), reason, note: note.trim() || null });
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <Modal title={`Adjust stock · ${product.name}`} onClose={onClose}>
      <form onSubmit={submit} className="form">
        <div className="form-row">
          <label>Reason
            <select value={reason} onChange={(e) => setReason(e.target.value)}>
              {REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </label>
          <label>Units<input type="number" min="1" required value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
        </div>
        <label>Note<input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. PO-2291 or Order #1001" maxLength={200} /></label>
        <div className={`adjust-preview ${after < 0 ? "bad" : ""}`}>
          {product.quantity} → <strong>{after}</strong> units
        </div>
        {error && <div className="form-error" role="alert">{error}</div>}
        <div className="modal-actions">
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn primary" disabled={saving || after < 0}>{saving ? "Saving…" : "Record movement"}</button>
        </div>
      </form>
    </Modal>
  );
}
