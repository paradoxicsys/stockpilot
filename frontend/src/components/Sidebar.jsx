import Icon from "./Icon.jsx";

const NAV = [
  { icon: "grid", label: "Overview", active: true },
  { icon: "box", label: "Products" },
  { icon: "swap", label: "Movements" },
  { icon: "truck", label: "Suppliers" },
  { icon: "chart", label: "Reports" },
];

export default function Sidebar({ open, onClose, apiOnline }) {
  const version = import.meta.env.VITE_APP_VERSION || "dev";
  return (
    <>
      <div className={`scrim ${open ? "show" : ""}`} onClick={onClose} />
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="brand">
          <span className="brand-mark"><Icon name="layers" size={18} /></span>
          <span>StockPilot</span>
        </div>

        <div className="workspace">
          <span className="workspace-avatar">NW</span>
          <div>
            <div className="workspace-name">Northwind Warehouse</div>
            <div className="workspace-sub">Main location</div>
          </div>
        </div>

        <nav>
          {NAV.map((item) => (
            <a key={item.label} href="#" className={`nav-item ${item.active ? "active" : ""}`}
              onClick={(e) => e.preventDefault()} aria-current={item.active ? "page" : undefined}>
              <Icon name={item.icon} />
              {item.label}
            </a>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="pipeline">
            <div className="pipeline-title">Deployment</div>
            <div className="pipeline-steps">
              {["test", "build", "scan", "deploy"].map((s) => (
                <span key={s} className="pipeline-step"><i />{s}</span>
              ))}
            </div>
            <div className="pipeline-meta">
              <span className={`dot ${apiOnline ? "ok" : "down"}`} />
              API {apiOnline ? "online" : "unreachable"}
            </div>
            <div className="pipeline-meta mono">build {version.slice(0, 7)}</div>
          </div>
        </div>
      </aside>
    </>
  );
}
