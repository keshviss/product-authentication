import { useState } from "react";
import { Link } from "react-router-dom";
import { useWallet } from "../context/WalletContext";
import { useToast } from "../context/ToastContext";
import { getReadContract, getWriteContract, CONTRACT_ADDRESS } from "../utils/contract";
import { shortAddress } from "../utils/blockchain";
import { parseContractError } from "../utils/errors";
import ProductForm from "../components/ProductForm";
import QRCode from "../components/QRCode";
import StatusBadge from "../components/StatusBadge";
import HashChip from "../components/HashChip";

const EMPTY_PREVIEW = { productId: "PROD1006", productName: "Product name", brand: "Brand", model: "Model", batchNumber: "BATCH-01", manufacturingDate: new Date().toISOString().slice(0, 10), category: "Electronics", description: "Product description" };

function TransactionStepper({ stage, txHash, blockNumber }) {
  const steps = ["Waiting for MetaMask", "Submitted", "Confirmed"];
  const activeIndex = stage === "waiting" ? 0 : stage === "submitted" ? 1 : stage === "confirmed" ? 2 : -1;
  return <ol className={`transaction-stepper${stage === "failed" ? " is-failed" : ""}`}>{steps.map((step, index) => <li className={index < activeIndex ? "is-done" : index === activeIndex ? "is-active" : ""} key={step}><span className="transaction-step-icon" aria-hidden="true">{index < activeIndex ? "✓" : index + 1}</span><div><strong>{step}</strong>{index === 1 && txHash && <small><HashChip hash={txHash} /></small>}{index === 2 && blockNumber && <small>Block #{blockNumber}</small>}{stage === "failed" && index === 0 && <small>Transaction did not complete. Correct the issue and retry.</small>}</div></li>)}</ol>;
}

export default function RegisterProduct() {
  const { account, networkOk, role, connect, connecting } = useWallet();
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [txStage, setTxStage] = useState("");
  const [txHash, setTxHash] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [registeredData, setRegisteredData] = useState(null);
  const [preview, setPreview] = useState(EMPTY_PREVIEW);
  const [lastSubmitted, setLastSubmitted] = useState(null);
  const [batchText, setBatchText] = useState("");
  const [batchItems, setBatchItems] = useState([]);
  const [batchRunning, setBatchRunning] = useState(false);

  async function handleRegister(formData) {
    setErrorMsg(""); setRegisteredData(null); setLastSubmitted(formData); setTxHash("");
    if (!networkOk) { setErrorMsg("Switch MetaMask to Ganache Local (chain ID 1337). No transaction was sent."); setTxStage("failed"); return; }
    if (role !== "Manufacturer") { setErrorMsg(`Only a Manufacturer wallet can register products. Current role: ${role || "Customer"}.`); setTxStage("failed"); return; }
    try {
      setSubmitting(true); setTxStage("waiting");
      const reader = getReadContract();
      if (await reader.verifyProduct(formData.productId)) throw new Error("Product ID already registered");
      const writer = await getWriteContract();
      const tx = await writer.registerProduct(formData.productId, formData.productName, formData.brand, formData.model, formData.batchNumber, formData.manufacturingDate, formData.category, formData.description);
      setTxHash(tx.hash); setTxStage("submitted");
      const receipt = await tx.wait();
      const result = { ...formData, txHash: tx.hash, blockNumber: Number(receipt.blockNumber), status: 0 };
      setRegisteredData(result); setTxStage("confirmed");
      toast(`Product ${formData.productId} registered on-chain`, "success");
    } catch (err) {
      console.error("Registration transaction failed:", err);
      setErrorMsg(parseContractError(err)); setTxStage("failed"); toast(parseContractError(err), "error");
    } finally { setSubmitting(false); }
  }

  async function handleBatchRegister(event) {
    event.preventDefault();
    if (role !== "Manufacturer" || !networkOk) { setErrorMsg("Batch registration requires a Manufacturer wallet on Ganache Local."); return; }
    const rows = batchText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const parsed = rows.map((line) => line.split(",").map((cell) => cell.trim()));
    const initial = parsed.map((cells, index) => ({ index, productId: cells[0] || `Row ${index + 1}`, status: cells.length === 8 ? "Queued" : "Invalid: expected 8 comma-separated fields" }));
    setBatchItems(initial); setBatchRunning(true); setErrorMsg("");
    for (let index = 0; index < parsed.length; index += 1) {
      const cells = parsed[index];
      if (cells.length !== 8) continue;
      const [productId, productName, brand, model, batchNumber, manufacturingDate, category, description] = cells;
      const row = { productId: productId.toUpperCase(), productName, brand, model, batchNumber: batchNumber.toUpperCase(), manufacturingDate, category, description };
      setBatchItems((items) => items.map((item) => item.index === index ? { ...item, status: "Waiting for signature" } : item));
      try {
        if (await getReadContract().verifyProduct(row.productId)) throw new Error("Product ID already exists");
        const tx = await (await getWriteContract()).registerProduct(row.productId, row.productName, row.brand, row.model, row.batchNumber, row.manufacturingDate, row.category, row.description);
        setBatchItems((items) => items.map((item) => item.index === index ? { ...item, status: "Submitted", txHash: tx.hash } : item));
        const receipt = await tx.wait();
        setBatchItems((items) => items.map((item) => item.index === index ? { ...item, status: `Confirmed in block #${receipt.blockNumber}`, txHash: tx.hash } : item));
      } catch (err) {
        setBatchItems((items) => items.map((item) => item.index === index ? { ...item, status: `Failed: ${parseContractError(err)}` } : item));
      }
    }
    setBatchRunning(false);
    toast("Batch registration finished. Each product was a separate transaction.", "info");
  }

  function resetRegistration() { setRegisteredData(null); setErrorMsg(""); setTxStage(""); setTxHash(""); setLastSubmitted(null); }

  return <div className="register-page">
    <header className="page-heading"><div><span className="eyebrow">MANUFACTURER WORKFLOW</span><h1>Register a product</h1><p>Product data is written to the existing contract by a wallet-signed transaction.</p></div>{account && <span className="wallet-role-note">{shortAddress(account)} · {role || "Loading role"}</span>}</header>

    {!account ? <section className="card access-card"><h2>Connect a Manufacturer wallet</h2><p>A customer can verify without a wallet; registration requires a connected Manufacturer role.</p><button className="btn btn-primary" onClick={connect} disabled={connecting}>{connecting ? "Connecting…" : "Connect MetaMask"}</button></section> : !networkOk ? <div className="alert-error">Switch MetaMask to Ganache Local (chain ID 1337) before registering.</div> : role !== "Manufacturer" ? <div className="alert-warning">This wallet has the <strong>{role || "Customer"}</strong> role. Ask the contract admin to assign the Manufacturer role.</div> : null}

    {errorMsg && <div className="alert-error" role="alert"><strong>Registration failed.</strong> {errorMsg}{lastSubmitted && <button className="btn btn-outline btn-sm retry-button" onClick={() => handleRegister(lastSubmitted)}>Retry with same details</button>}</div>}
    {txStage && !registeredData && <TransactionStepper stage={txStage} txHash={txHash} />}

    {registeredData ? <section className="card success-screen"><div className="success-check" aria-hidden="true">✓</div><span className="eyebrow">TRANSACTION CONFIRMED</span><h2>Product registered</h2><p>Ganache mined this MetaMask-signed transaction in block #{registeredData.blockNumber}.</p><div className="success-product-summary"><div><span>Product</span><strong>{registeredData.productName} · {registeredData.brand}</strong></div><div><span>Product ID</span><strong><code>{registeredData.productId}</code></strong></div><div><span>Batch</span><strong><code>{registeredData.batchNumber}</code></strong></div><div><span>Status</span><StatusBadge status={registeredData.status} /></div><div><span>Transaction</span><HashChip hash={registeredData.txHash} /></div><div><span>Contract</span><code>{shortAddress(CONTRACT_ADDRESS)}</code></div></div><QRCode productId={registeredData.productId} size={184} /><div className="success-actions"><Link to={`/product/${registeredData.productId}`} className="btn btn-primary">View product</Link><button className="btn btn-outline" onClick={resetRegistration}>Register another</button></div></section> : account && role === "Manufacturer" && <div className="registration-layout"><section className="card"><h2>Product information</h2><p className="muted-copy">Required fields are marked with an asterisk. String data is stored by the contract.</p><ProductForm onSubmit={handleRegister} submitting={submitting} onFormChange={setPreview} /></section><aside className="card preview-card"><span className="eyebrow">LIVE PREVIEW</span><h2>{preview.productName || "Product name"}</h2><p>{preview.brand || "Brand"}{preview.model ? ` · ${preview.model}` : ""}</p><div className="preview-identity"><span>Product ID</span><code>{preview.productId || "PROD…"}</code></div><dl><div><dt>Batch</dt><dd>{preview.batchNumber || "—"}</dd></div><div><dt>Made on</dt><dd>{preview.manufacturingDate || "—"}</dd></div><div><dt>Category</dt><dd>{preview.category}</dd></div></dl><StatusBadge status={0} /><p className="form-help">Preview only. The permanent record is created after MetaMask signs and Ganache confirms the transaction.</p></aside></div>}

    {account && role === "Manufacturer" && <details className="card batch-registration"><summary>Batch registration · Demo tools</summary><p>Paste one CSV row per product using this order: ID, name, brand, model, batch, date (YYYY-MM-DD), category, description. Each row needs its own MetaMask signature and blockchain transaction.</p><form onSubmit={handleBatchRegister}><label className="form-label" htmlFor="batch-rows">Product rows</label><textarea id="batch-rows" className="form-control batch-textarea" rows="5" value={batchText} onChange={(e) => setBatchText(e.target.value)} placeholder="PROD1006, Earbuds, SoundWave, SW-1, B106, 2026-10-11, Electronics, Wireless earbuds" disabled={batchRunning} /><button className="btn btn-outline" disabled={batchRunning || !batchText.trim()}>{batchRunning ? "Registering rows…" : "Register batch one by one"}</button></form>{batchItems.length > 0 && <ol className="batch-progress">{batchItems.map((item) => <li key={item.index}><strong>{item.productId}</strong><span>{item.status}</span>{item.txHash && <HashChip hash={item.txHash} />}</li>)}</ol>}</details>}
  </div>;
}
