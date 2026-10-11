import { useState, useEffect, useCallback } from "react";
import { useWallet } from "../context/WalletContext";
import {
  getReadContract,
  getReadProvider,
  CONTRACT_ADDRESS,
  STATUS_NAMES,
} from "../utils/contract";
import { GANACHE_CHAIN_ID, shortAddress } from "../utils/blockchain";
import StatusBadge from "../components/StatusBadge";
import HashChip from "../components/HashChip";
import AddressChip from "../components/AddressChip";
import Spinner from "../components/Spinner";
import {
  RefreshCw,
  Layers,
  Box,
  Zap,
  List,
  Link as ChainIcon,
  Lightbulb,
} from "lucide-react";

export default function BlockchainInfo() {
  const { account, role, contractOk } = useWallet();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const [chainInfo, setChainInfo] = useState({
    contractAddress: CONTRACT_ADDRESS,
    adminAddress: "",
    chainId: GANACHE_CHAIN_ID,
    latestBlock: 0,
    totalProducts: 0,
  });

  const [eventsList, setEventsList] = useState([]);

  // ─── Load all blockchain info ────────────────────────────────────────────
  const loadBlockchainInfo = useCallback(
    async ({ silent = false } = {}) => {
      if (!contractOk) { setLoading(false); return; }

      try {
        if (!silent) setLoading(true);
        setErrorMsg("");

        const contract = getReadContract();
        const provider = getReadProvider();

        const [admin, latestBlock, totalCount] = await Promise.all([
          contract.admin(),
          provider.getBlockNumber(),
          contract.getTotalProducts(),
        ]);

        setChainInfo({
          contractAddress: CONTRACT_ADDRESS,
          adminAddress: admin,
          chainId: GANACHE_CHAIN_ID,
          latestBlock: Number(latestBlock),
          totalProducts: Number(totalCount),
        });

        // Fetch both event types and merge them newest-first
        const [regLogs, updateLogs] = await Promise.all([
          contract.queryFilter(contract.filters.ProductRegistered(), 0, "latest"),
          contract.queryFilter(contract.filters.ProductStatusUpdated(), 0, "latest"),
        ]);

        const allEvents = [
          ...regLogs.map((log) => ({
            type: "ProductRegistered",
            productId: log.args[0],
            actor: log.args[1],
            extra: "Initial Registration (MANUFACTURED)",
            status: 0,
            blockNumber: log.blockNumber,
            txHash: log.transactionHash,
            timestamp: Number(log.args[2]),
          })),
          ...updateLogs.map((log) => ({
            type: "ProductStatusUpdated",
            productId: log.args[0],
            actor: log.args[2],
            extra: `Updated to ${STATUS_NAMES[Number(log.args[1])]}`,
            status: Number(log.args[1]),
            blockNumber: log.blockNumber,
            txHash: log.transactionHash,
            timestamp: Number(log.args[3]),
          })),
        ].sort((a, b) => b.blockNumber - a.blockNumber || b.timestamp - a.timestamp);

        setEventsList(allEvents);
      } catch (err) {
        console.error("Blockchain info query error:", err);
        setErrorMsg("Failed to query node. Make sure Ganache is running on port 8545.");
      } finally {
        setLoading(false);
      }
    },
    [contractOk]
  );

  useEffect(() => { loadBlockchainInfo(); }, [loadBlockchainInfo]);

  // Live poll every 7 seconds
  useEffect(() => {
    const timer = window.setInterval(() => loadBlockchainInfo({ silent: true }), 7000);
    return () => window.clearInterval(timer);
  }, [loadBlockchainInfo]);

  // ─── Stat cards config ───────────────────────────────────────────────────
  const stats = [
    { label: "Chain ID",        value: chainInfo.chainId,     sub: "Ganache Localhost", icon: Layers,   color: "var(--blue)" },
    { label: "Latest Block",    value: `#${chainInfo.latestBlock}`, sub: "Current Block Height", icon: Box, color: "var(--blue)" },
    { label: "Total Products",  value: chainInfo.totalProducts, sub: "Registered on Chain", icon: ChainIcon, color: "var(--green)" },
    { label: "Events Emitted",  value: eventsList.length,     sub: "Event Logs in Storage", icon: Zap,  color: "var(--purple)" },
  ];

  return (
    <div style={{ maxWidth: "960px", margin: "0 auto" }}>

      {/* ── Page header ───────────────────────────────────────────────── */}
      <div className="page-heading">
        <div>
          <span className="eyebrow">ETHEREUM · GANACHE LOCAL NODE</span>
          <h1>Blockchain Node &amp; Event Log</h1>
          <p>Real-time ledger state and event logs emitted directly by the Ethereum EVM.</p>
        </div>
        <button
          onClick={() => loadBlockchainInfo()}
          disabled={loading}
          className="btn btn-outline"
        >
          <RefreshCw size={14} aria-hidden="true" />
          {loading ? "Refreshing…" : "Refresh Ledger"}
        </button>
      </div>

      {errorMsg && <div className="alert-error" style={{ marginBottom: "20px" }}>{errorMsg}</div>}

      {/* ── Network stat cards ────────────────────────────────────────── */}
      <div className="stat-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
        {stats.map(({ label, value, sub, icon: Icon, color }) => (
          <div className="stat-card" key={label}>
            <Icon size={18} style={{ color, marginBottom: 4 }} aria-hidden="true" />
            <div className="stat-label">{label}</div>
            <div className="stat-value" style={{ color }}>{value}</div>
            <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* ── Smart contract details ────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: "24px" }}>
        <h3>
          <ChainIcon size={16} style={{ verticalAlign: "middle", marginRight: 6 }} aria-hidden="true" />
          Smart Contract Deploy Details
        </h3>
        <div className="table-wrap" style={{ marginTop: "10px" }}>
          <table className="data-table">
            <tbody>
              <tr>
                <td><strong>Contract Address</strong></td>
                <td><AddressChip address={chainInfo.contractAddress} /></td>
              </tr>
              <tr>
                <td><strong>Contract Admin (Deployer)</strong></td>
                <td>
                  {chainInfo.adminAddress
                    ? <AddressChip address={chainInfo.adminAddress} role="Admin" />
                    : "Querying…"}
                </td>
              </tr>
              <tr>
                <td><strong>Your Connected Wallet</strong></td>
                <td>
                  {account ? (
                    <span>
                      <code>{shortAddress(account)}</code>
                      <span className="role-tag" style={{ marginLeft: "6px" }}>
                        {role || "Customer"}
                      </span>
                    </span>
                  ) : (
                    <span style={{ color: "var(--muted)" }}>
                      No wallet connected (Read-only mode)
                    </span>
                  )}
                </td>
              </tr>
              <tr>
                <td><strong>JSON-RPC Endpoint</strong></td>
                <td><code>http://127.0.0.1:8545</code></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Event log table ───────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: "24px" }}>
        <div className="flex-between" style={{ marginBottom: "8px" }}>
          <h3 style={{ margin: 0 }}>
            <List size={16} style={{ verticalAlign: "middle", marginRight: 6 }} aria-hidden="true" />
            Real-Time On-Chain Event Log (EVM Logs)
          </h3>
          <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
            {eventsList.length} recorded events
          </span>
        </div>
        <p style={{ fontSize: "0.88rem", color: "var(--muted)", margin: "0 0 12px" }}>
          In Ethereum, smart contract events are indexed in bloom filters and stored in transaction
          receipts. They provide permanent audit trails without expensive contract storage writes.
        </p>

        {loading ? (
          <div className="loading-box">
            <Spinner size="md" />
            <p>Querying EVM event logs from Ganache…</p>
          </div>
        ) : eventsList.length === 0 ? (
          <div className="loading-box">No events found in this block range.</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Block #</th>
                  <th>Event Name</th>
                  <th>Product ID</th>
                  <th>Lifecycle / Action</th>
                  <th>Time</th>
                  <th>Caller Address</th>
                  <th>Transaction Hash</th>
                </tr>
              </thead>
              <tbody>
                {eventsList.map((ev, idx) => (
                  <tr key={`${ev.txHash}-${idx}`}>
                    <td><strong>#{ev.blockNumber}</strong></td>
                    <td>
                      <span
                        className={
                          ev.type === "ProductRegistered"
                            ? "badge badge-green"
                            : "badge badge-amber"
                        }
                        style={{ textTransform: "none", fontSize: "0.72rem" }}
                      >
                        {ev.type}
                      </span>
                    </td>
                    <td>
                      <a href={`/product/${encodeURIComponent(ev.productId)}`}>
                        <strong>{ev.productId}</strong>
                      </a>
                    </td>
                    <td>
                      <StatusBadge status={ev.status} />
                    </td>
                    <td>
                      <time dateTime={new Date(ev.timestamp * 1000).toISOString()}>
                        {new Date(ev.timestamp * 1000).toLocaleString()}
                      </time>
                    </td>
                    <td>
                      <AddressChip address={ev.actor} />
                    </td>
                    <td>
                      <HashChip hash={ev.txHash} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Viva concept card ─────────────────────────────────────────── */}
      <div className="card" style={{ background: "var(--purple-light)", border: "1px solid var(--purple-border)", padding: "20px" }}>
        <h4 style={{ margin: "0 0 8px", color: "var(--purple)" }}>
          <Lightbulb size={16} style={{ verticalAlign: "middle", marginRight: 6 }} aria-hidden="true" />
          Viva Concept: Why use Events instead of Array Storage?
        </h4>
        <p style={{ fontSize: "0.88rem", color: "var(--purple)", lineHeight: 1.6, margin: 0 }}>
          In Solidity, saving data to <strong>State Storage</strong> (<code>SSTORE</code>) costs{" "}
          <strong>20,000 gas</strong> per 32-byte word. Emitting an{" "}
          <strong>Event Log</strong> (<code>LOG</code> opcode) costs only{" "}
          <strong>375 gas base + 375 gas per topic + 8 gas per byte</strong>. By emitting{" "}
          <code>ProductRegistered</code> and <code>ProductStatusUpdated</code> events, our dApp
          achieves a gas-efficient, cryptographically verifiable, and permanently auditable history log.
        </p>
      </div>
    </div>
  );
}
