import { shortAddress } from "../utils/blockchain";
import CopyButton from "./CopyButton";

/**
 * Chip displaying shortened transaction hash with copy button.
 * @param {{ hash: string }} props
 */
export default function HashChip({ hash }) {
  if (!hash) return <span style={{ color: "var(--text-muted)" }}>—</span>;

  return (
    <span className="chip" title={`Transaction Hash: ${hash}`}>
      <code>{shortAddress(hash)}</code>
      <CopyButton text={hash} title="Copy transaction hash" />
    </span>
  );
}
