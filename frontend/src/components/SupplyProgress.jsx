import { useEffect, useState } from "react";
import { getRole, STATUS_NAMES } from "../utils/contract";
import { shortAddress } from "../utils/blockchain";
import StatusBadge from "./StatusBadge";

/** Shows completed, current, and upcoming contract lifecycle stages. */
export default function SupplyProgress({ history = [], currentStatus = 0 }) {
  const [roles, setRoles] = useState({});

  useEffect(() => {
    let cancelled = false;
    async function loadRoles() {
      const addresses = [...new Set(history.map((item) => item.updatedBy))];
      const entries = await Promise.all(addresses.map(async (address) => {
        try { return [address, await getRole(address)]; }
        catch { return [address, "Supply Chain Partner"]; }
      }));
      if (!cancelled) setRoles(Object.fromEntries(entries));
    }
    loadRoles();
    return () => { cancelled = true; };
  }, [history]);

  const historyByStatus = new Map(history.map((item) => [Number(item.status), item]));
  return <ol className="supply-progress">{STATUS_NAMES.map((status, index) => {
    const entry = historyByStatus.get(index);
    const done = index < currentStatus;
    const current = index === currentStatus;
    return <li className={`supply-progress-step${done ? " is-complete" : ""}${current ? " is-current" : ""}`} key={status}>
      <span className="supply-progress-marker" aria-hidden="true">{done ? "✓" : index + 1}</span>
      <div className="supply-progress-copy"><div className="supply-progress-title"><strong>{status.replaceAll("_", " ")}</strong>{current && <span className="current-label">Current</span>}</div>
        {entry ? <small>{new Date(Number(entry.timestamp) * 1000).toLocaleString()}<br />{shortAddress(entry.updatedBy)} · {roles[entry.updatedBy] || "Loading role"}</small> : index === 0 ? <small>Manufacturer registration record</small> : current ? <small>Current contract state</small> : <small>Upcoming stage</small>}
        {current && <span className="sr-only"><StatusBadge status={currentStatus} /></span>}
      </div>
    </li>;
  })}</ol>;
}
