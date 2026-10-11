import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getReadContract, getReadProvider } from "../utils/contract";
import SkeletonCard from "../components/SkeletonCard";
import { Package, Zap, Layers, ShieldCheck } from "lucide-react";

// All six lifecycle stages in order
const LIFECYCLE = ["MANUFACTURED", "DISPATCHED", "IN_TRANSIT", "AT_DISTRIBUTOR", "AT_RETAILER", "SOLD"];

export default function Home() {
  const [stats, setStats] = useState(null);
  const [statsError, setStatsError] = useState(false);

  // Load live stats from the chain (no wallet needed – read-only JsonRpcProvider)
  useEffect(() => {
    let cancelled = false;
    async function loadStats() {
      try {
        const contract = getReadContract();
        const provider = getReadProvider();
        const [total, block, registered, updated] = await Promise.all([
          contract.getTotalProducts(),
          provider.getBlockNumber(),
          contract.queryFilter(contract.filters.ProductRegistered(), 0, "latest"),
          contract.queryFilter(contract.filters.ProductStatusUpdated(), 0, "latest"),
        ]);
        if (!cancelled)
          setStats({
            products: Number(total),
            events: registered.length + updated.length,
            block,
          });
      } catch {
        if (!cancelled) setStatsError(true);
      }
    }
    loadStats();
    return () => { cancelled = true; };
  }, []);

  return (
    <>
      {/* ── Hero section ─────────────────────────────────────────────── */}
      <section className="hero hero-home">
        <div className="hero-eyebrow">
          <span className="hero-eyebrow-dot" />
          TRUST • TRANSPARENCY • TRACEABILITY
        </div>
        <h1>Blockchain-Based Product Authenticity</h1>
        <p className="subtitle">
          Verify product authenticity and trace its journey using an immutable Ethereum blockchain.
        </p>
        <div className="flex-between hero-buttons">
          <Link to="/register" className="btn btn-primary btn-lg">
            <Package size={16} aria-hidden="true" /> Register Product
          </Link>
          <Link to="/verify" className="btn btn-outline btn-lg">
            <ShieldCheck size={16} aria-hidden="true" /> Verify Product
          </Link>
        </div>
        {/* Required explanation sentence */}
        <p className="hero-note">
          Every registered product receives a blockchain-backed identity that can be verified
          throughout its supply chain.
        </p>
      </section>

      {/* ── Live chain statistics ─────────────────────────────────────── */}
      <section className="home-stats" aria-label="Live blockchain statistics">
        {stats ? (
          <>
            <div className="home-stat">
              <span className="home-stat-icon" aria-hidden="true">
                <Package size={18} />
              </span>
              <span className="home-stat-number">{stats.products}</span>
              <span className="home-stat-label">Products registered</span>
            </div>
            <div className="home-stat">
              <span className="home-stat-icon" aria-hidden="true">
                <Zap size={18} />
              </span>
              <span className="home-stat-number">{stats.events}</span>
              <span className="home-stat-label">Blockchain events</span>
            </div>
            <div className="home-stat">
              <span className="home-stat-icon" aria-hidden="true">
                <Layers size={18} />
              </span>
              <span className="home-stat-number">#{stats.block}</span>
              <span className="home-stat-label">Current block</span>
            </div>
          </>
        ) : statsError ? (
          <div className="home-stats-unavailable">
            Live chain statistics are unavailable. Start Ganache to load current values.
          </div>
        ) : (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        )}
      </section>

      {/* ── How it works ─────────────────────────────────────────────── */}
      <section className="how-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">THE PRODUCT JOURNEY</span>
            <h2>How it works</h2>
          </div>
          <p>One shared record follows the product from the factory to the customer.</p>
        </div>

        <div className="journey-steps">
          {/* Static connector links the steps without looking like a loader. */}
          <div className="journey-line" aria-hidden="true">
          </div>

          {[
            ["01", "Register", "Manufacturer creates a permanent product identity on-chain."],
            [
              "02",
              "Track",
              "Authorized partners record each next stage as a signed transaction.",
            ],
            ["03", "Verify", "Anyone can check the record without connecting a wallet."],
          ].map(([number, title, description]) => (
            <article className="journey-step card" key={number}>
              <span className="journey-number">{number}</span>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>

        {/* Animated lifecycle strip */}
        <div
          className="lifecycle-strip"
          aria-label={`Product lifecycle: ${LIFECYCLE.join(" to ")}`}
        >
          {LIFECYCLE.map((stage, index) => (
            <span className="lifecycle-stage" key={stage}>
              <span className="lifecycle-node" aria-hidden="true">
                {index === 0 ? "✓" : index + 1}
              </span>
              <span>{stage.replaceAll("_", " ")}</span>
              {index < LIFECYCLE.length - 1 && (
                <span className="lifecycle-arrow" aria-hidden="true">
                  →
                </span>
              )}
            </span>
          ))}
        </div>
      </section>

      {/* ── Customer callout ──────────────────────────────────────────── */}
      <aside className="customer-callout">
        <span className="customer-callout-icon" aria-hidden="true">
          <ShieldCheck size={22} />
        </span>
        <div>
          <strong>No wallet needed to verify</strong>
          <p>
            Customers can scan a product QR code or enter its ID. Verification reads directly from
            the blockchain and never asks for a signature.
          </p>
        </div>
        <Link to="/verify" className="btn btn-outline">
          Verify a product
        </Link>
      </aside>
    </>
  );
}
