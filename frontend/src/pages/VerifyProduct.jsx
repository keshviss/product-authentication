import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Html5QrcodeScanner } from "html5-qrcode";
import { getReadContract, isContractDeployed, STATUS_NAMES } from "../utils/contract";
import { shortAddress } from "../utils/blockchain";
import StatusBadge from "../components/StatusBadge";
import SupplyProgress from "../components/SupplyProgress";
import Spinner from "../components/Spinner";
import { useToast } from "../context/ToastContext";
import {
  ShieldX,
  WifiOff,
  Camera,
  X,
  Search,
  CheckCircle,
  Info,
} from "lucide-react";

// ─── Helper ─────────────────────────────────────────────────────────────────
/**
 * Extracts a plain product ID from either a bare string or a /verify/:id URL.
 * The QR code encodes a full URL; this handles both cases.
 */
function extractProductId(rawText) {
  if (!rawText) return "";
  const trimmed = rawText.trim();
  if (trimmed.includes("/verify/")) {
    const parts = trimmed.split("/verify/");
    const id = parts[parts.length - 1].split("?")[0].split("#")[0];
    return decodeURIComponent(id).trim().toUpperCase();
  }
  return trimmed.toUpperCase();
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function VerifyProduct() {
  const { productId: urlProductId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [inputVal, setInputVal] = useState(urlProductId || "");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [connectionError, setConnectionError] = useState(false);

  // null = not searched yet | false = not found | true = authentic
  const [verifiedState, setVerifiedState] = useState(null);
  const [productData, setProductData] = useState(null);
  const [historyData, setHistoryData] = useState([]);

  // QR scanner
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef(null);

  // Tracks the last polled status so we can detect live changes
  const previousStatus = useRef(null);

  // ─── Core verification function ─────────────────────────────────────────
  const verifyId = useCallback(
    async (idToVerify, { silent = false } = {}) => {
      const cleanId = extractProductId(idToVerify);
      if (!cleanId) {
        setErrorMsg("Please enter a valid Product ID.");
        return;
      }

      setErrorMsg("");
      setConnectionError(false);

      if (!silent) {
        setLoading(true);
        setVerifiedState(null);
        setProductData(null);
        setHistoryData([]);
      }

      try {
        // First confirm Ganache is reachable and the contract is deployed
        const deployed = await isContractDeployed();
        if (!deployed) {
          throw new Error(
            "Cannot reach the smart contract on Ganache (http://127.0.0.1:8545). " +
              "Please ensure Ganache is running and the contract is deployed."
          );
        }

        const contract = getReadContract();

        // Step 1: verifyProduct() view function — free, no wallet needed
        const exists = await contract.verifyProduct(cleanId);

        if (!exists) {
          previousStatus.current = null;
          setVerifiedState(false);
        } else {
          // Step 2: Full product data
          const p = await contract.getProduct(cleanId);
          // Step 3: History (all StatusUpdated events for this product)
          const h = await contract.getProductHistory(cleanId);

          const nextProductData = {
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
          };

          // Toast when the live poll detects a status change
          if (
            silent &&
            previousStatus.current !== null &&
            previousStatus.current !== nextProductData.currentStatus
          ) {
            toast(
              `${cleanId} moved to ${STATUS_NAMES[nextProductData.currentStatus] || "a new status"}`,
              "info"
            );
          }
          previousStatus.current = nextProductData.currentStatus;

          setProductData(nextProductData);
          setHistoryData(
            h.map((item) => ({
              status: Number(item.status),
              updatedBy: item.updatedBy,
              timestamp: Number(item.timestamp),
            }))
          );
          setVerifiedState(true);
        }
      } catch (err) {
        console.error("Verification error:", err);
        setConnectionError(true);
        setErrorMsg(
          "Cannot reach the Ganache blockchain. Start Ganache and confirm the contract is deployed."
        );
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [toast]
  );

  // ─── Auto-verify from URL param ─────────────────────────────────────────
  useEffect(() => {
    if (urlProductId) {
      setInputVal(urlProductId);
      verifyId(urlProductId);
    }
  }, [urlProductId, verifyId]);

  // ─── Live polling (only when on a /verify/:id route) ────────────────────
  // Allows the page to auto-update when a distributor moves the product
  // without the customer having to refresh.
  useEffect(() => {
    if (!urlProductId) return undefined;
    const timer = window.setInterval(() => verifyId(urlProductId, { silent: true }), 6000);
    return () => window.clearInterval(timer);
  }, [urlProductId, verifyId]);

  // ─── QR scanner lifecycle ────────────────────────────────────────────────
  useEffect(() => {
    if (isScanning) {
      const scanner = new Html5QrcodeScanner(
        "qr-reader-container",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );
      scannerRef.current = scanner;

      scanner.render(
        (decodedText) => {
          const detectedId = extractProductId(decodedText);
          setInputVal(detectedId);
          setIsScanning(false);
          scanner.clear().catch(console.error);
          navigate(`/verify/${detectedId}`);
        },
        () => {
          // Normal frame errors from the scanner are expected; ignore them
        }
      );
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [isScanning, navigate]);

  // ─── Form submit ────────────────────────────────────────────────────────
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    navigate(`/verify/${extractProductId(inputVal)}`);
  };

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="verify-page">

      {/* ── Hero search area ──────────────────────────────────────────── */}
      <div className="verify-hero">
        <span className="eyebrow">ZERO TRUST · ON-CHAIN VERIFICATION</span>
        <h1>Product Authenticity Verification</h1>
        <p className="subtitle">
          Verify genuine products against the manufacturer's immutable Ethereum blockchain records.{" "}
          <strong>No crypto wallet required.</strong>
        </p>

        {/* Search form */}
        <div className="card verify-search-card">
          <form onSubmit={handleSubmit} className="verify-search-form">
            <label htmlFor="verify-input" className="sr-only">
              Enter Product ID to verify
            </label>
            <input
              id="verify-input"
              type="text"
              placeholder="Enter Product ID (e.g. PROD1001)"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              className="form-control verify-input"
              style={{ textTransform: "uppercase" }}
              autoFocus
            />
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              aria-busy={loading}
            >
              {loading ? (
                <>
                  <Spinner size="sm" /> Verifying…
                </>
              ) : (
                <>
                  <Search size={15} aria-hidden="true" /> Verify Product
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setIsScanning(!isScanning)}
              className="btn btn-outline"
            >
              {isScanning ? (
                <>
                  <X size={15} aria-hidden="true" /> Close Camera
                </>
              ) : (
                <>
                  <Camera size={15} aria-hidden="true" /> Scan QR Code
                </>
              )}
            </button>
          </form>

          {/* QR scanner box */}
          {isScanning && (
            <div className="verify-scanner-box">
              <p className="form-help">
                Point your camera or webcam at a product authenticity QR code:
              </p>
              <div id="qr-reader-container" className="qr-reader" />
            </div>
          )}
        </div>
      </div>

      {/* ── Loading ───────────────────────────────────────────────────── */}
      {loading && (
        <div className="card loading-box" style={{ textAlign: "center" }}>
          <Spinner size="lg" />
          <p style={{ marginTop: "12px" }}>
            Querying Ethereum smart contract on Ganache…
          </p>
        </div>
      )}

      {/* ── Connection / network error ────────────────────────────────── */}
      {errorMsg && (
        <div
          className={`verification-connection-card${connectionError ? " is-warning" : ""}`}
          role="alert"
        >
          <span className="verification-state-icon" aria-hidden="true">
            {connectionError ? <WifiOff size={20} /> : <ShieldX size={20} />}
          </span>
          <div>
            <h2>{connectionError ? "Cannot reach blockchain" : "Verification could not be completed"}</h2>
            <p>{errorMsg}</p>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          RESULT 1: AUTHENTIC PRODUCT (GREEN)
          verifyProduct(id) returned true on-chain
         ═══════════════════════════════════════════════════════════════════ */}
      {!loading && verifiedState === true && productData && (
        <div className="card result-card result-authentic">
          {/* Header banner */}
          <div className="result-banner result-banner-green">
            <span className="result-banner-badge">
              <CheckCircle size={18} aria-hidden="true" /> ✓ AUTHENTIC PRODUCT
            </span>
            <StatusBadge status={productData.currentStatus} />
          </div>

          {/* Product heading */}
          <div className="result-product-heading">
            <div>
              <h2>{productData.productName}</h2>
              <p className="result-product-sub">
                Brand: <strong>{productData.brand}</strong>
                {productData.model && ` · Model: ${productData.model}`}
              </p>
            </div>
          </div>

          {/* Two-column: specs table + supply chain progress */}
          <div className="result-grid">
            <div>
              <h3 className="result-section-title">Product Specifications</h3>
              <div className="table-wrap">
                <table className="data-table">
                  <tbody>
                    <tr>
                      <td><strong>Product ID</strong></td>
                      <td><code>{productData.productId}</code></td>
                    </tr>
                    <tr>
                      <td><strong>Batch Number</strong></td>
                      <td><code>{productData.batchNumber}</code></td>
                    </tr>
                    <tr>
                      <td><strong>Category</strong></td>
                      <td>{productData.category}</td>
                    </tr>
                    <tr>
                      <td><strong>Manufacturing Date</strong></td>
                      <td>{productData.manufacturingDate}</td>
                    </tr>
                    <tr>
                      <td><strong>Manufacturer Wallet</strong></td>
                      <td>
                        <span title={productData.manufacturer}>
                          <code>{shortAddress(productData.manufacturer)}</code>
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td><strong>Blockchain Verified</strong></td>
                      <td>
                        <span className="badge badge-green">
                          <CheckCircle size={12} aria-hidden="true" /> YES (On-Chain)
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              {productData.description && (
                <p className="result-description">
                  <strong>Description: </strong>
                  {productData.description}
                </p>
              )}
            </div>

            <div>
              <h3 className="result-section-title">Supply Chain Journey</h3>
              {/* SupplyProgress reads history and renders the vertical stepper */}
              <SupplyProgress
                history={historyData}
                currentStatus={productData.currentStatus}
              />
            </div>
          </div>

          {/* Disclaimer – always shown (required by the spec) */}
          <div className="result-disclaimer">
            <Info size={14} aria-hidden="true" />
            <span>
              <strong>Honest disclaimer:</strong> This confirms the Product ID matches a
              manufacturer-registered blockchain record. It does not prove the physical item is
              genuine.
            </span>
          </div>

          {/* No-wallet badge */}
          <p className="verified-no-wallet">
            <span aria-hidden="true">
              <CheckCircle size={14} />
            </span>{" "}
            Verified without a wallet. This check was a read-only blockchain query.
          </p>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          RESULT 2: PRODUCT NOT VERIFIED (RED)
          verifyProduct(id) returned false on-chain
         ═══════════════════════════════════════════════════════════════════ */}
      {!loading && verifiedState === false && (
        <div className="card result-card result-not-verified">
          <div className="result-not-verified-inner">
            <div className="result-not-verified-icon" aria-hidden="true">
              <ShieldX size={32} />
            </div>
            <h2>PRODUCT NOT VERIFIED</h2>
            <p className="result-not-verified-msg">
              This product could not be found in the manufacturer's blockchain records. It may be
              counterfeit or unregistered.
            </p>
            <div className="result-warning-box">
              <strong>Warning:</strong> The smart contract executed{" "}
              <code>verifyProduct("{inputVal}")</code> which returned <code>false</code>. Do not
              purchase or accept this product without consulting the manufacturer directly.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
