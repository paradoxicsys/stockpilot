import Icon from "./Icon.jsx";
import { fmtMoney, fmtNum } from "../format.js";

export default function KpiCards({ stats }) {
  const needsReorder = stats ? stats.low_stock + stats.out_of_stock : 0;
  const cards = [
    { label: "Products", value: fmtNum(stats?.total_products), hint: `${stats?.categories.length ?? 0} categories`, icon: "box", tone: "teal" },
    { label: "Units on hand", value: fmtNum(stats?.total_units), hint: "across all SKUs", icon: "layers", tone: "blue" },
    { label: "Inventory value", value: fmtMoney(stats?.inventory_value), hint: "at unit cost", icon: "dollar", tone: "violet" },
    { label: "Needs reorder", value: fmtNum(needsReorder), hint: `${stats?.out_of_stock ?? 0} out of stock`, icon: "alert", tone: needsReorder ? "amber" : "teal" },
  ];
  return (
    <section className="kpis" aria-label="Key metrics">
      {cards.map((c) => (
        <article key={c.label} className="kpi card">
          <div className={`kpi-icon ${c.tone}`}><Icon name={c.icon} /></div>
          <div>
            <div className="kpi-label">{c.label}</div>
            <div className="kpi-value">{stats ? c.value : <span className="skeleton w-60" />}</div>
            <div className="kpi-hint">{c.hint}</div>
          </div>
        </article>
      ))}
    </section>
  );
}
