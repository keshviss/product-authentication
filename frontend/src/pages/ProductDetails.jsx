import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useWallet } from "../context/WalletContext";
import {
  getReadContract,
  getWriteContract,
  getReadProvider,
  getRole,
  CONTRACT_ADDRESS,
  STATUS_NAMES,
} from "../utils/contract";
import { shortAddress } from "../utils/blockchain";
import { parseContractError } from "../utils/errors";
import StatusBadge from "../components/StatusBadge";
import Timeline from "../components/Timeline";
import QRCode from "../components/QRCode";
import HashChip from "../components/HashChip";
import AddressChip from "../components/AddressChip";
import Spinner from "../components/Spinner";
import { useToast } from "../context/ToastContext";
import {
  Package,
  Link as ChainIcon,
  Truck,
  CheckCircle,
  Lock,
  Download,
  ArrowLeft,
  FileCheck,
  RefreshCw,
} from "lucide-react";

export default function ProductDetails() {
  const { productId } = useParams();
  const { account, role, networkOk, contractOk } = useWallet();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [product, setProduct] = useState(null);
  const [history, setHistory] = useState([]);
  const [regTxInfo, setRegTxInfo] = useState(null);

  // Status-update action state
  const [updating, setUpdating] = useState(false);
  const [actionProgress, setActionProgress] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [actionTx, setActionTx] = useState(null);

  // ─── Load product data from chain ───────────────────────────────────────
  const loadProductData = useCallback(async () => {
    if (!productId) return;
    if (!contractOk) {
      setLoading(false);
      setErrorMsg("Cannot reach the blockchain. Start Ganache and deploy the contract.");
      return;
    }

    try {
      setLoading(true);
      setErrorMsg("");
      const contract = getReadContract();

      // Confirm product exists before fetching
      const exists = await contract.verifyProduct(productId);
      if (!exists) {
        setProduct(null);
        setErrorMsg(`Product ID '${productId}' does not exist on the blockchain.`);
        return;
      }

      // 1. Product struct
      const p = await contract.getProduct(productId);
      setProduct({
        productId: p.productId,
        productName: p.productName,
        brand: p.brand,
        model: p.model,
        batchNumber: p.batchNumber,
        manufacturingDate: p.manufacturingDate,
        category: p.category,
        description: p.description,
        manufacturer: p.manufacturer,
        createdAt: Number(p.createdAt),
        currentStatus: Number(p.currentStatus),
      });

      // 2. History events (on-chain struct array)
      const h = await contract.getProductHistory(productId);
      setHistory(
        h.map((item) => ({
          status: Number(item.status),
          updatedBy: item.updatedBy,
          timestamp: Number(item.timestamp),
        }))
      );

      // 3. Registration tx hash and block via event log query
      try {
        const filter = contract.filters.ProductRegistered();
        const logs = await contract.queryFilter(filter, 0, "latest");
        const match = logs.find((ev) => ev.args[0] === productId);
        if (match) {
          const provider = getReadProvider();
          const block = await provider.getBlock(match.blockNumber);
          setRegTxInfo({
            txHash: match.transactionHash,
            blockNumber: match.blockNumber,
            timestamp: block ? block.timestamp : null,
          });
        }
      } catch (err) {
        console.warn("Could not query registration logs:", err);
      }
    } catch (err) {
      console.error("Product load error:", err);
      setErrorMsg(parseContractError(err));
    } finally {
      setLoading(false);
    }
  }, [productId, contractOk]);

  useEffect(() => { loadProductData(); }, [loadProductData]);

  // ─── Role-based authorization for next status ───────────────────────────
  // Status machine: MANUFACTURED(0)→DISPATCHED(1)→IN_TRANSIT(2)→AT_DISTRIBUTOR(3)→AT_RETAILER(4)→SOLD(5)
  const currentStatus = product ? product.currentStatus : -1;
  const nextStatus = currentStatus >= 0 && currentStatus < 5 ? currentStatus + 1 : null;
  const nextStatusName = nextStatus !== null ? STATUS_NAMES[nextStatus] : null;

  let isAuthorizedForNext = false;
  let requiredRoleDescription = "";

  if (product && account && nextStatus !== null) {
    const isProductManufacturer =
      role === "Manufacturer" &&
      account.toLowerCase() === product.manufacturer.toLowerCase();

    if (nextStatus === 1) {
      isAuthorizedForNext = isProductManufacturer;
      requiredRoleDescription = "Product Manufacturer (Owner)";
    } else if (nextStatus === 2) {
      isAuthorizedForNext = isProductManufacturer || role === "Distributor";
      requiredRoleDescription = "Manufacturer or Distributor";
    } else if (nextStatus === 3) {
      isAuthorizedForNext = role === "Distributor";
      requiredRoleDescription = "Distributor";
    } else if (nextStatus === 4 || nextStatus === 5) {
      isAuthorizedForNext = role === "Retailer";
      requiredRoleDescription = "Retailer";
    }
  }

  // ─── Status update transaction ───────────────────────────────────────────
  const handleUpdateStatus = async () => {
    if (nextStatus === null) return;
    setActionError("");
    setActionSuccess("");

    if (!networkOk) {
      setActionError("Please switch MetaMask to 'Ganache Local' (Chain ID 1337).");
      return;
    }

    try {
      setUpdating(true);
      setActionProgress("Waiting for MetaMask signature…");

      const writeContract = await getWriteContract();
      const tx = await writeContract.updateProductStatus(productId, nextStatus);

      setActionProgress(`Transaction submitted: ${shortAddress(tx.hash)}. Waiting for block confirmation…`);
      setActionTx({ hash: tx.hash, status: "submitted" });

      const receipt = await tx.wait();
      setActionTx({ hash: tx.hash, status: "confirmed", block: Number(receipt.blockNumber) });
      setActionSuccess(`Lifecycle stage updated to ${nextStatusName} in block #${receipt.blockNumber}.`);
      setActionProgress("");

      // Refresh chain data and timeline
      await loadProductData();
      toast(`${productId} moved to ${nextStatusName}`, "success");
    } catch (err) {
      console.error("Status update error:", err);
      setActionError(parseContractError(err));
    } finally {
      setUpdating(false);
      setActionProgress("");
    }
  };

  // ─── CSV export ─────────────────────────────────────────────────────────
  async function downloadHistoryCsv() {
    if (!product) return;
    const contract = getReadContract();
    const [registeredEvents, updatedEvents] = await Promise.all([
      contract.queryFilter(contract.filters.ProductRegistered(), 0, "latest"),
      contract.queryFilter(contract.filters.ProductStatusUpdated(), 0, "latest"),
    ]);

    const events = [
      ...registeredEvents
        .filter((ev) => ev.args[0] === productId)
        .map((ev) => ({
          status: 0,
          actor: ev.args[1],
          timestamp: Number(ev.args[2]),
          hash: ev.transactionHash,
        })),
      ...updatedEvents
        .filter((ev) => ev.args[0] === productId)
        .map((ev) => ({
          status: Number(ev.args[1]),
          actor: ev.args[2],
          timestamp: Number(ev.args[3]),
          hash: ev.transactionHash,
        })),
    ].sort((a, b) => a.timestamp - b.timestamp);

    const quote = (v) => `"${String(v ?? "").replaceAll('"', '""')}"`;
    const rows = [["Product ID", "Status", "Updater", "Role", "Timestamp", "Transaction Hash"]];

    for (const event of events) {
      let updaterRole = "Unknown";
      try { updaterRole = await getRole(event.actor); } catch { /* role may have changed */ }
      rows.push([
        productId,
        STATUS_NAMES[event.status],
        event.actor,
        updaterRole,
        new Date(event.timestamp * 1000).toISOString(),
        event.hash,
      ]);
    }

    const csv = rows.map((row) => row.map(quote).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${productId}-history.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  // ─── Loading / error states ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className="card loading-box">
        <Spinner size="lg" />
        <p style={{ marginTop: "12px" }}>Fetching product records from Ethereum smart contract…</p>
      </div>
    );
  }

  if (errorMsg || !product) {
    return (
      <div className="card" style={{ textAlign: "center", padding: "40px" }}>
        <h2 style={{ color: "var(--red)" }}>Product Not Found</h2>
        <p style={{ color: "var(--muted)" }}>{errorMsg || "Invalid Product ID."}</p>
        <Link to="/dashboard" className="btn btn-outline" style={{ marginTop: "16px" }}>
          <ArrowLeft size={14} aria-hidden="true" /> Back to Dashboard
        </Link>
      </div>
    );
  }

  // ─── Main render ────────────────────────────────────────────────────────
  return (
    <div className="product-details-page">

      {/* ── Page header ───────────────────────────────────────────────── */}
      <div className="page-heading">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <h1 style={{ margin: 0 }}>{product.productName}</h1>
            <StatusBadge status={product.currentStatus} />
          </div>
          <p style={{ color: "var(--muted)", margin: "6px 0 0" }}>
            Product ID: <code>{product.productId}</code> | Batch:{" "}
            <code>{product.batchNumber}</code>
          </p>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={loadProductData}
            title="Refresh from chain"
          >
            <RefreshCw size={13} aria-hidden="true" /> Refresh
          </button>
          <Link to="/dashboard" className="btn btn-outline btn-sm">
            <ArrowLeft size={13} aria-hidden="true" /> Back to Catalog
          </Link>
          <Link to={`/certificate/${product.productId}`} className="btn btn-outline btn-sm">
            <FileCheck size={13} aria-hidden="true" /> Certificate
          </Link>
        </div>
      </div>

      {/* ── Main two-column grid ─────────────────────────────────────── */}
      <div className="grid-2" style={{ marginBottom: "24px" }}>

        {/* Left: Product specifications + Blockchain proof */}
        <div className="card">
          <h3>
            <Package size={16} style={{ verticalAlign: "middle", marginRight: 6 }} aria-hidden="true" />
            Product Specifications
          </h3>
          <div className="table-wrap" style={{ marginTop: "10px" }}>
            <table className="data-table">
              <tbody>
                <tr>
                  <td><strong>Brand / Model</strong></td>
                  <td>
                    {product.brand}
                    {product.model ? ` (${product.model})` : ""}
                  </td>
                </tr>
                <tr>
                  <td><strong>Category</strong></td>
                  <td>{product.category}</td>
                </tr>
                <tr>
                  <td><strong>Manufacturing Date</strong></td>
                  <td>{product.manufacturingDate}</td>
                </tr>
                <tr>
                  <td><strong>Manufacturer Wallet</strong></td>
                  <td>
                    <AddressChip address={product.manufacturer} role="Manufacturer" />
                  </td>
                </tr>
                <tr>
                  <td><strong>Description</strong></td>
                  <td>{product.description || "N/A"}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 style={{ marginTop: "24px" }}>
            <ChainIcon size={16} style={{ verticalAlign: "middle", marginRight: 6 }} aria-hidden="true" />
            Blockchain Proof of Record
          </h3>
          <div className="table-wrap" style={{ marginTop: "10px" }}>
            <table className="data-table">
              <tbody>
                <tr>
                  <td><strong>Contract Address</strong></td>
                  <td><AddressChip address={CONTRACT_ADDRESS} /></td>
                </tr>
                <tr>
                  <td><strong>Registration Tx</strong></td>
                  <td>
                    {regTxInfo ? (
                      <HashChip hash={regTxInfo.txHash} />
                    ) : (
                      <span style={{ color: "var(--muted)" }}>From Event Logs</span>
                    )}
                  </td>
                </tr>
                <tr>
                  <td><strong>Mined in Block</strong></td>
                  <td>
                    {regTxInfo ? <code>#{regTxInfo.blockNumber}</code> : "—"}
                  </td>
                </tr>
                <tr>
                  <td><strong>Record Timestamp</strong></td>
                  <td>
                    {product.createdAt
                      ? new Date(product.createdAt * 1000).toLocaleString()
                      : "—"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: QR code */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <QRCode productId={product.productId} size={180} />
          <p
            style={{
              marginTop: "12px",
              fontSize: "0.82rem",
              color: "var(--muted)",
              textAlign: "center",
              maxWidth: "260px",
            }}
          >
            Consumers scan this QR code with any device to instantly verify authenticity without
            installing MetaMask.
          </p>
        </div>
      </div>

      {/* ── Status management panel ───────────────────────────────────── */}
      <div className="card" style={{ marginBottom: "24px", background: "var(--surface-subtle)" }}>
        <h3>
          <Truck size={16} style={{ verticalAlign: "middle", marginRight: 6 }} aria-hidden="true" />
          Supply Chain Status Management
        </h3>

        {currentStatus === 5 ? (
          /* Final stage – lifecycle sealed */
          <div className="alert-success" style={{ marginTop: "12px", marginBottom: 0 }}>
            <CheckCircle size={16} style={{ verticalAlign: "middle", marginRight: 6 }} aria-hidden="true" />
            <strong>Final Stage Reached:</strong> This product has been marked as{" "}
            <strong>SOLD</strong>. Its lifecycle is complete and permanently sealed on-chain.
          </div>
        ) : (
          <div style={{ marginTop: "12px" }}>
            <p style={{ fontSize: "0.92rem", margin: "0 0 12px" }}>
              Current Status:{" "}
              <strong>{STATUS_NAMES[currentStatus]?.replaceAll("_", " ")}</strong>
              {" → "}
              Next Status:{" "}
              <strong style={{ color: "var(--blue)" }}>
                {nextStatusName?.replaceAll("_", " ")}
              </strong>
            </p>

            {isAuthorizedForNext ? (
              /* Authorized wallet: show action button */
              <div>
                <button
                  onClick={handleUpdateStatus}
                  disabled={updating}
                  className="btn btn-primary"
                  aria-busy={updating}
                >
                  {updating ? (
                    <>
                      <Spinner size="sm" /> Sending Transaction…
                    </>
                  ) : (
                    `Mark as ${nextStatusName?.replaceAll("_", " ")}`
                  )}
                </button>
                <span
                  style={{ marginLeft: "12px", fontSize: "0.85rem", color: "var(--green)" }}
                >
                  <CheckCircle size={13} style={{ verticalAlign: "middle" }} aria-hidden="true" />
                  {" "}You are authorized as <strong>{role}</strong> to perform this transition.
                </span>
              </div>
            ) : (
              /* Not authorized: explain why */
              <div className="alert-warning" style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                <Lock size={16} style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
                <div>
                  <strong>Restricted Transition:</strong> Marking as{" "}
                  <strong>{nextStatusName?.replaceAll("_", " ")}</strong> requires role:{" "}
                  <strong>{requiredRoleDescription}</strong>.
                  {account ? (
                    <span> Your current role is <strong>{role || "Customer"}</strong>.</span>
                  ) : (
                    <span> Connect an authorized wallet to update.</span>
                  )}
                </div>
              </div>
            )}

            {/* Transaction progress / result */}
            {actionProgress && (
              <div className="tx-stepper" style={{ marginTop: "12px" }}>
                <Spinner size="sm" /> <span>{actionProgress}</span>
              </div>
            )}

            {actionTx && (
              <p className="transaction-confirmation" style={{ marginTop: "10px" }}>
                {actionTx.status === "submitted"
                  ? "Submitted · waiting for confirmation"
                  : `Confirmed in block #${actionTx.block}`}{" "}
                · <HashChip hash={actionTx.hash} />
              </p>
            )}

            {actionError && (
              <div className="alert-error" style={{ marginTop: "12px" }}>{actionError}</div>
            )}
            {actionSuccess && (
              <div className="alert-success" style={{ marginTop: "12px" }}>{actionSuccess}</div>
            )}
          </div>
        )}
      </div>

      {/* ── Timeline ──────────────────────────────────────────────────── */}
      <div className="card">
        <div className="flex-between" style={{ marginBottom: "16px" }}>
          <h3 style={{ margin: 0 }}>Complete Supply Chain Event History</h3>
          <button
            type="button"
            className="btn btn-outline btn-sm export-history-button"
            onClick={downloadHistoryCsv}
          >
            <Download size={13} aria-hidden="true" /> Download history as CSV
          </button>
        </div>
        <Timeline history={history} />
      </div>
    </div>
  );
}
