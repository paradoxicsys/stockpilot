import { fmtNum, timeAgo } from "../format.js";

export function CategoryPanel({ stats }) {
  const cats = stats?.categories ?? [];
  const max = Math.max(1, ...cats.map((c) => c.units));
  return (
    <section className="card">
      <div className="card-head"><h2>Units by category</h2></div>
      {cats.length === 0 && <p className="muted pad">No inventory yet.</p>}
      <ul className="bars">
        {cats.map((c) => (
          <li key={c.category}>
            <div className="bar-label">
              <span>{c.category}</span>
              <span className="muted">{fmtNum(c.units)}</span>
            </div>
            <div className="bar"><div style={{ width: `${(c.units / max) * 100}%` }} /></div>
          </li>
        ))}
      </ul>
    </section>
  );
}

const REASON_LABEL = { restock: "Restocked", sale: "Sold", return: "Returned", damage: "Written off", correction: "Corrected" };

export function ActivityFeed({ movements }) {
  return (
    <section className="card">
      <div className="card-head"><h2>Recent movements</h2></div>
      {movements.length === 0 && <p className="muted pad">No stock movements yet.</p>}
      <ul className="feed">
        {movements.map((m) => (
          <li key={m.id}>
            <span className={`delta ${m.delta > 0 ? "up" : "down"}`}>{m.delta > 0 ? `+${m.delta}` : m.delta}</span>
            <div className="feed-body">
              <div><strong>{REASON_LABEL[m.reason] ?? m.reason}</strong> {m.product_name}</div>
              <div className="muted small">
                <span className="mono">{m.sku}</span> · now {m.quantity_after}{m.note ? ` · ${m.note}` : ""}
              </div>
            </div>
            <time className="muted small" dateTime={m.created_at}>{timeAgo(m.created_at)}</time>
          </li>
        ))}
      </ul>
    </section>
  );
}
