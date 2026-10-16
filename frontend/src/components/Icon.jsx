// Minimal inline icon set (stroke icons, 24x24 grid) so the UI has no icon dependency.
const PATHS = {
  grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  box: "M3 7l9-4 9 4-9 4-9-4zm0 0v10l9 4 9-4V7M12 11v10",
  swap: "M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7",
  truck: "M3 6h11v9H3zM14 9h4l3 3v3h-7M7 18a2 2 0 1 0 0-.01M17 18a2 2 0 1 0 0-.01",
  chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  edit: "M4 20h4L19 9l-4-4L4 16v4z",
  trash: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-5-5",
  menu: "M4 6h16M4 12h16M4 18h16",
  close: "M6 6l12 12M18 6L6 18",
  alert: "M12 9v4M12 17h.01M10.3 3.9L2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z",
  dollar: "M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  layers: "M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5",
  refresh: "M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7",
  sliders: "M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4",
};

export default function Icon({ name, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  );
}
