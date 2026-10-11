import { STATUS_NAMES } from "../utils/contract";

// Icons per status to ensure accessibility (color is not the only indicator)
const STATUS_ICONS = {
  0: "🏭",
  1: "📦",
  2: "🚚",
  3: "🏢",
  4: "🏪",
  5: "🛒",
};

const STATUS_CLASSES = {
  0: "badge-manufactured",
  1: "badge-dispatched",
  2: "badge-in-transit",
  3: "badge-distributor",
  4: "badge-retailer",
  5: "badge-sold",
};

/**
 * Renders an accessible, color-coded and icon-paired badge for a product lifecycle state.
 * @param {{ status: number|string }} props
 */
export default function StatusBadge({ status }) {
  const numericStatus =
    typeof status === "number" || typeof status === "bigint"
      ? Number(status)
      : STATUS_NAMES.indexOf(status);

  const statusName =
    numericStatus >= 0 && numericStatus < STATUS_NAMES.length
      ? STATUS_NAMES[numericStatus]
      : String(status || "UNKNOWN");

  const badgeClass = `badge ${STATUS_CLASSES[numericStatus] || "badge-manufactured"}`;
  const icon = STATUS_ICONS[numericStatus] || "🏷️";
  const label = statusName.replace(/_/g, " ");

  return (
    <span className={badgeClass} title={`Lifecycle Status: ${label}`}>
      <span aria-hidden="true" style={{ fontSize: "0.85em" }}>{icon}</span>
      <span>{label}</span>
    </span>
  );
}
