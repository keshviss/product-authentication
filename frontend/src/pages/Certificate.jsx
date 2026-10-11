import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CONTRACT_ADDRESS, getReadContract, getReadProvider } from "../utils/contract";
import { shortAddress } from "../utils/blockchain";
import StatusBadge from "../components/StatusBadge";
import QRCode from "../components/QRCode";

export default function Certificate() {
  const { productId } = useParams();
  const [record, setRecord] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const contract = getReadContract();
        if (!(await contract.verifyProduct(productId))) throw new Error("No product record was found for this ID.");
        const [p, registered] = await Promise.all([
          contract.getProduct(productId),
          contract.queryFilter(contract.filters.ProductRegistered(), 0, "latest"),
        ]);
        const event = registered.find((item) => item.args[0] === productId);
        const block = event ? await getReadProvider().getBlock(event.blockNumber) : null;
        if (!cancelled) setRecord({ id: p.productId, name: p.productName, brand: p.brand, model: p.model, batch: p.batchNumber, category: p.category, manufacturer: p.manufacturer, status: Number(p.currentStatus), txHash: event?.transactionHash || "", block: event?.blockNumber || null, timestamp: block?.timestamp || Number(p.createdAt) });
      } catch (err) { if (!cancelled) setError(err.message || "Cannot reach the blockchain."); }
    }
    load();
    return () => { cancelled = true; };
  }, [productId]);

  if (error) return <section className="card"><h1>Certificate unavailable</h1><p>{error}</p><Link to={`/verify/${productId}`} className="btn btn-outline">Return to verification</Link></section>;
  if (!record) return <div className="card loading-box"><span className="spinner spinner-lg" aria-label="Loading certificate" /> <p>Reading product certificate from Ganache…</p></div>;

  return <div className="certificate-page"><div className="certificate-toolbar"><Link className="btn btn-outline" to={`/product/${productId}`}>Back to product</Link><button className="btn btn-primary" onClick={() => window.print()}>Print / Save as PDF</button></div><article className="certificate-sheet"><header className="certificate-header"><span className="certificate-seal" aria-hidden="true">✓</span><span className="eyebrow">PRODUCTCHAIN · ON-CHAIN RECORD</span><h1>Product Authenticity Certificate</h1><p>A blockchain record was found for this product identifier.</p></header><section className="certificate-product"><div><span className="certificate-label">PRODUCT ID</span><strong className="certificate-id">{record.id}</strong></div><div><span className="certificate-label">PRODUCT</span><strong>{record.name}</strong></div><div><span className="certificate-label">BRAND / MODEL</span><strong>{record.brand}{record.model ? ` · ${record.model}` : ""}</strong></div><div><span className="certificate-label">BATCH</span><strong>{record.batch}</strong></div><div><span className="certificate-label">CATEGORY</span><strong>{record.category}</strong></div><div><span className="certificate-label">CURRENT STATUS</span><StatusBadge status={record.status} /></div><div><span className="certificate-label">MANUFACTURER WALLET</span><code>{record.manufacturer}</code></div><div><span className="certificate-label">REGISTERED</span><strong>{new Date(record.timestamp * 1000).toLocaleString()}</strong></div><div><span className="certificate-label">REGISTRATION BLOCK</span><strong>{record.block ? `#${record.block}` : "On-chain event"}</strong></div></section><section className="certificate-proof"><div><span className="certificate-label">CONTRACT ADDRESS</span><code>{CONTRACT_ADDRESS}</code><span className="certificate-label">REGISTRATION TRANSACTION</span><code>{record.txHash || "Event log unavailable"}</code></div><QRCode productId={record.id} size={132} /></section><p className="certificate-disclaimer">This confirms the Product ID matches a manufacturer-registered blockchain record. It does not prove the physical item is genuine.</p><footer>Read-only certificate generated from Ganache local network · {shortAddress(CONTRACT_ADDRESS)}</footer></article></div>;
}
