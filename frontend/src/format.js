const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const currencyExact = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const number = new Intl.NumberFormat("en-US");

export const fmtMoney = (v) => currency.format(v ?? 0);
export const fmtPrice = (v) => currencyExact.format(v ?? 0);
export const fmtNum = (v) => number.format(v ?? 0);

export function timeAgo(iso) {
  const then = new Date(iso.endsWith("Z") || iso.includes("+") ? iso : `${iso}Z`).getTime();
  const s = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export const STATUS_LABEL = { in_stock: "In stock", low_stock: "Low stock", out_of_stock: "Out of stock" };
