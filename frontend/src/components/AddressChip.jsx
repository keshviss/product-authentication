import { shortAddress } from "../utils/blockchain";
import CopyButton from "./CopyButton";

/**
 * Chip displaying shortened Ethereum address, copy button, and optional role tag.
 * @param {{ address: string, role?: string, showFull?: boolean }} props
 */
export default function AddressChip({ address, role, showFull = false }) {
  if (!address) return <span style={{ color: "var(--text-muted)" }}>—</span>;

  const displayAddr = showFull ? address : shortAddress(address);

  return (
    <span className="chip" title={`Ethereum Address: ${address}`}>
      <code>{displayAddr}</code>
      {role && <span className="role-tag">{role}</span>}
      <CopyButton text={address} title="Copy address" />
    </span>
  );
}
