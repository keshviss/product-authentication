import { useState, useEffect } from "react";
import StatusBadge from "./StatusBadge";
import { getRole } from "../utils/contract";
import { shortAddress } from "../utils/blockchain";

/**
 * Renders an immutable on-chain event timeline for a product.
 * @param {{ history: Array<{ status: number, updatedBy: string, timestamp: number }> }} props
 */
export default function Timeline({ history }) {
  const [rolesMap, setRolesMap] = useState({});

  useEffect(() => {
    if (!history || history.length === 0) return;

    let cancelled = false;
    async function fetchRoles() {
      const uniqueAddresses = [...new Set(history.map((h) => h.updatedBy))];
      const mapping = {};
      for (const addr of uniqueAddresses) {
        try {
          const r = await getRole(addr);
          mapping[addr] = r;
        } catch {
          mapping[addr] = "Account";
        }
      }
      if (!cancelled) setRolesMap(mapping);
    }

    fetchRoles();
    return () => {
      cancelled = true;
    };
  }, [history]);

  if (!history || history.length === 0) {
    return <div className="timeline-empty">No history events recorded.</div>;
  }

  return (
    <div className="timeline-list">
      {history.map((item, index) => {
        const dateStr = item.timestamp
          ? new Date(Number(item.timestamp) * 1000).toLocaleString()
          : "Block Timestamp";
        const updaterRole = rolesMap[item.updatedBy] || "Supply Chain Participant";

        return (
          <div
            key={index}
            className="timeline-item"
          >
            {/* Timeline node marker */}
            <div className={`timeline-marker${index === history.length - 1 ? " is-latest" : ""}`} aria-hidden="true" />

            <div
              className="timeline-card"
            >
              <div
                className="timeline-meta"
              >
                <StatusBadge status={item.status} />
                <time dateTime={item.timestamp ? new Date(Number(item.timestamp) * 1000).toISOString() : undefined}>
                  🕒 {dateStr}
                </time>
              </div>

              <div className="timeline-actor">
                <span>Updated by: </span>
                <span title={item.updatedBy} style={{ fontWeight: 600 }}>
                  {shortAddress(item.updatedBy)}
                </span>
                <span className="timeline-role">
                  {updaterRole}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
