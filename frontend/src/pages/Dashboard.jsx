import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  getReadContract,
  getWriteContract,
  getRole,
  ROLE_NAMES,
  STATUS_NAMES,
} from "../utils/contract";
import { shortAddress } from "../utils/blockchain";
import { isAddress } from "ethers";
import { useWallet } from "../context/WalletContext";
import { useToast } from "../context/ToastContext";
import StatusBadge from "../components/StatusBadge";
import HashChip from "../components/HashChip";
import AddressChip from "../components/AddressChip";
import ProductCard from "../components/ProductCard";
import EmptyState from "../components/EmptyState";
import SkeletonCard from "../components/SkeletonCard";
import {
  BarChart2,
  ShoppingCart,
  Truck,
  Warehouse,
  Store,
  Package,
  RefreshCw,
  PackagePlus,
  ShieldCheck,
  Activity,
  UserCog,
} from "lucide-react";

// Number of products shown per table/card page
const PAGE_SIZE = 10;

// Stat card icon + colour mapping
const STAT_CONFIG = [
  { label: "Total",        key: "total",       icon: Package,    color: "var(--blue)" },
  { label: "Sold",         key: "sold",        icon: ShoppingCart, color: "var(--green)" },
  { label: "In Transit",   key: "transit",     icon: Truck,      color: "#0284c7" },
  { label: "At Distributor", key: "dist",      icon: Warehouse,  color: "var(--purple)" },
  { label: "At Retailer",  key: "retail",      icon: Store,      color: "#4f46e5" },
];

export default function Dashboard() {
  const { account, role, contractOk } = useWallet();
  const toast = useToast();

  const [products, setProducts] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Search / filter / pagination state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [view, setView] = useState("table");   // "table" | "cards"

  // Admin panel state
  const [adminAddress, setAdminAddress] = useState("");
  const [targetAddress, setTargetAddress] = useState("");
  const [targetRole, setTargetRole] = useState("2");
  const [assigning, setAssigning] = useState(false);
  const [assignResult, setAssignResult] = useState(null);
  const [checkAddress, setCheckAddress] = useState("");
  const [checkedRole, setCheckedRole] = useState("");
  const [checkingRole, setCheckingRole] = useState(false);

  // Tracks previous statuses so we can toast when a live-poll detects a change
  const previousStatuses = useRef({});

  // ---------- data loading -------------------------------------------------
  const loadDashboardData = useCallback(
    async ({ silent = false } = {}) => {
      if (!contractOk) { setLoading(false); return; }
      try {
        if (!silent) setLoading(true);
        setError("");

        const contract = getReadContract();
        const [admin, total, registered, updates] = await Promise.all([
          contract.admin(),
          contract.getTotalProducts(),
          contract.queryFilter(contract.filters.ProductRegistered(), 0, "latest"),
          contract.queryFilter(contract.filters.ProductStatusUpdated(), 0, "latest"),
        ]);

        setAdminAddress(admin);

        // Build lookup maps from event logs: productId → txHash
        const registrationById = new Map(registered.map((log) => [log.args[0], log.transactionHash]));
        const updateById = new Map();
        updates.forEach((log) => updateById.set(log.args[0], log.transactionHash));

        // Fetch each product newest-first (by index descending)
        const fetched = [];
        for (let i = Number(total) - 1; i >= 0; i -= 1) {
          const id = await contract.getProductIdByIndex(i);
          const p = await contract.getProduct(id);
          fetched.push({
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
            exists: p.exists,
            txHash: registrationById.get(p.productId) || "",
            latestTxHash:
              updateById.get(p.productId) || registrationById.get(p.productId) || "",
          });
        }

        // Silent-refresh: detect status changes and toast
        const prior = previousStatuses.current;
        fetched.forEach((product) => {
          const oldStatus = prior[product.productId];
          if (
            silent &&
            oldStatus !== undefined &&
            oldStatus !== product.currentStatus
          ) {
            toast(
              `${product.productId} moved to ${STATUS_NAMES[product.currentStatus]}`,
              "info"
            );
          }
        });
        previousStatuses.current = Object.fromEntries(
          fetched.map((p) => [p.productId, p.currentStatus])
        );

        setProducts(fetched);

        // Build the activity feed from the most recent 8 events across all products
        const rawEvents = [
          ...registered.map((log) => ({
            type: "ProductRegistered",
            productId: log.args[0],
            actor: log.args[1],
            status: 0,
            txHash: log.transactionHash,
            block: log.blockNumber,
            timestamp: Number(log.args[2]),
          })),
          ...updates.map((log) => ({
            type: "ProductStatusUpdated",
            productId: log.args[0],
            actor: log.args[2],
            status: Number(log.args[1]),
            txHash: log.transactionHash,
            block: log.blockNumber,
            timestamp: Number(log.args[3]),
          })),
        ]
          .sort((a, b) => b.block - a.block)
          .slice(0, 8);

        // Batch-resolve roles for unique actors
        const uniqueActors = [...new Set(rawEvents.map((e) => e.actor))];
        const actorRoles = Object.fromEntries(
          await Promise.all(
            uniqueActors.map(async (address) => {
              try {
                return [address, await getRole(address)];
              } catch {
                return [address, "Account"];
              }
            })
          )
        );

        setActivity(rawEvents.map((ev) => ({ ...ev, role: actorRoles[ev.actor] })));
      } catch (err) {
        console.error("Dashboard chain read failed:", err);
        setError(
          "Could not read the product catalog. Check that Ganache is running and the contract is deployed."
        );
      } finally {
        setLoading(false);
      }
    },
    [contractOk, toast]
  );

  // Initial load
  useEffect(() => { loadDashboardData(); }, [loadDashboardData]);

  // Live polling every 6 seconds (silent – only toasts on status changes)
  useEffect(() => {
    const timer = window.setInterval(() => loadDashboardData({ silent: true }), 6000);
    return () => window.clearInterval(timer);
  }, [loadDashboardData]);

  // ---------- derived state ------------------------------------------------
  const statusCounts = useMemo(
    () =>
      STATUS_NAMES.map((name, index) => ({
        name,
        index,
        count: products.filter((p) => p.currentStatus === index).length,
      })),
    [products]
  );

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((p) => {
      const matchesQuery =
        !query ||
        p.productId.toLowerCase().includes(query) ||
        p.productName.toLowerCase().includes(query);
      return matchesQuery && (statusFilter === "all" || p.currentStatus === Number(statusFilter));
    });
  }, [products, search, statusFilter]);

  // totalPages must be derived before the pagination useEffect that references it
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));

  // Clamp page to valid range when filters change
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const visibleProducts = filteredProducts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const isAdmin =
    Boolean(account && adminAddress) &&
    account.toLowerCase() === adminAddress.toLowerCase();

  // Summary for the demo-tools switch-hint
  const latestStatus = products[0]?.currentStatus;
  const nextRoleHint =
    latestStatus === undefined || latestStatus === 0
      ? "Manufacturer"
      : latestStatus === 1
      ? "Manufacturer or Distributor"
      : latestStatus === 2
      ? "Distributor"
      : latestStatus < 5
      ? "Retailer"
      : "No further role — lifecycle is complete";

  // Stat values for the stat-card strip
  const statValues = {
    total: products.length,
    sold: statusCounts[5].count,
    transit: statusCounts[2].count,
    dist: statusCounts[3].count,
    retail: statusCounts[4].count,
  };

  // ---------- handlers -----------------------------------------------------
  async function handleAssignRole(event) {
    event.preventDefault();
    if (!isAddress(targetAddress)) {
      setAssignResult({ error: "Enter a valid Ethereum address." });
      return;
    }
    setAssigning(true);
    setAssignResult(null);
    try {
      const contract = await getWriteContract();
      const tx = await contract.assignRole(targetAddress, Number(targetRole));
      setAssignResult({
        pending: true,
        hash: tx.hash,
        address: targetAddress,
        role: ROLE_NAMES[Number(targetRole)],
      });
      const receipt = await tx.wait();
      setAssignResult({
        hash: tx.hash,
        block: receipt.blockNumber,
        address: targetAddress,
        role: ROLE_NAMES[Number(targetRole)],
      });
      setTargetAddress("");
      toast(`Role assigned: ${ROLE_NAMES[Number(targetRole)]}`, "success");
    } catch (err) {
      setAssignResult({
        error: err.reason || err.shortMessage || err.message || "Role assignment failed.",
      });
    } finally {
      setAssigning(false);
    }
  }

  async function handleRoleCheck(event) {
    event.preventDefault();
    if (!isAddress(checkAddress)) {
      setCheckedRole("Enter a valid Ethereum address.");
      return;
    }
    setCheckingRole(true);
    setCheckedRole("");
    try {
      setCheckedRole(await getRole(checkAddress));
    } catch {
      setCheckedRole("Could not read the address role from the contract.");
    } finally {
      setCheckingRole(false);
    }
  }

  // ---------- render -------------------------------------------------------
  return (
    <div>
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <header className="page-heading dashboard-heading">
        <div>
          <span className="eyebrow">ON-CHAIN PRODUCT CATALOG</span>
          <h1>Supply Chain Dashboard</h1>
          <p>
            Product state is read directly from the deployed contract
            {adminAddress ? (
              <>
                {" "}· Admin <code>{shortAddress(adminAddress)}</code>
              </>
            ) : null}
          </p>
        </div>
        <div className="heading-actions">
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => loadDashboardData()}
            disabled={loading}
          >
            <RefreshCw size={14} aria-hidden="true" />
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          {role === "Manufacturer" ? (
            <Link className="btn btn-primary" to="/register">
              <PackagePlus size={14} aria-hidden="true" /> Register product
            </Link>
          ) : (
            <button
              className="btn btn-outline"
              title="Only a Manufacturer wallet can register products"
              disabled
            >
              Register product · Manufacturer only
            </button>
          )}
        </div>
      </header>

      {error && <div className="alert-error" role="alert">{error}</div>}

      {/* ── Stat cards ───────────────────────────────────────────────────── */}
      <section className="stat-grid dashboard-stats" aria-label="Product status totals">
        {STAT_CONFIG.map(({ label, key, icon: Icon, color }) => (
          <article className="stat-card" key={label}>
            <Icon size={20} className="stat-icon" aria-hidden="true" style={{ color }} />
            <span className="stat-value">{loading ? "—" : statValues[key]}</span>
            <span className="stat-label">{label}</span>
          </article>
        ))}
      </section>

      {/* ── Status distribution bar ──────────────────────────────────────── */}
      <section className="card distribution-card">
        <div className="flex-between">
          <div>
            <h2>
              <BarChart2 size={16} style={{ verticalAlign: "middle", marginRight: 6 }} aria-hidden="true" />
              Status distribution
            </h2>
            <p>Share of products at each lifecycle stage.</p>
          </div>
          <strong>{products.length} total</strong>
        </div>
        <div
          className="dist-bar"
          role="img"
          aria-label={statusCounts
            .map((s) => `${s.name.replaceAll("_", " ")}: ${s.count}`)
            .join(", ")}
        >
          {statusCounts.map((s) => (
            <span
              key={s.index}
              className={`dist-seg dist-status-${s.index}`}
              style={{
                width: `${products.length ? (s.count / products.length) * 100 : 0}%`,
              }}
            />
          ))}
        </div>
        <div className="dist-legend">
          {statusCounts.map((s) => (
            <span className="dist-legend-item" key={s.index}>
              <i className={`dist-dot dist-status-${s.index}`} />
              {s.name.replaceAll("_", " ")} <b>{s.count}</b>
            </span>
          ))}
        </div>
      </section>

      {/* ── Product catalog ──────────────────────────────────────────────── */}
      <section className="card catalog-card">
        {/* Header */}
        <div className="flex-between catalog-heading">
          <div>
            <h2>Products</h2>
            <p>
              {filteredProducts.length} matching on-chain record
              {filteredProducts.length === 1 ? "" : "s"}
            </p>
          </div>
          {/* Table / cards view toggle */}
          <div className="view-switch" aria-label="Catalog layout">
            <button
              type="button"
              className={view === "table" ? "selected" : ""}
              onClick={() => setView("table")}
            >
              Table
            </button>
            <button
              type="button"
              className={view === "cards" ? "selected" : ""}
              onClick={() => setView("cards")}
            >
              Cards
            </button>
          </div>
        </div>

        {/* Search + filter controls */}
        <div className="catalog-controls">
          <label className="sr-only" htmlFor="product-search">
            Search products by ID or name
          </label>
          <input
            id="product-search"
            className="form-control"
            value={search}
            placeholder="Search by product ID or name"
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
          <label className="sr-only" htmlFor="status-filter">
            Filter by status
          </label>
          <select
            id="status-filter"
            className="form-control"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          >
            <option value="all">All statuses</option>
            {STATUS_NAMES.map((name, index) => (
              <option value={index} key={name}>
                {name.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </div>

        {/* Content: skeletons | empty state | table | cards */}
        {loading ? (
          <div className="skeleton-grid">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : filteredProducts.length === 0 ? (
          <EmptyState
            title={products.length ? "No matching products" : "No products yet"}
            description={
              products.length
                ? "Try changing the search text or status filter."
                : "Register your first product to create a blockchain-backed identity."
            }
            action={
              role === "Manufacturer" ? (
                <Link className="btn btn-primary" to="/register">
                  <PackagePlus size={15} aria-hidden="true" /> Register your first product
                </Link>
              ) : null
            }
          />
        ) : view === "cards" ? (
          <div className="product-card-grid">
            {visibleProducts.map((p) => (
              <ProductCard product={p} key={p.productId} />
            ))}
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Batch</th>
                  <th>Current status</th>
                  <th>Latest transaction</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {visibleProducts.map((p) => (
                  <tr key={p.productId}>
                    <td>
                      <Link to={`/product/${p.productId}`} className="table-product-link">
                        <strong>{p.productName}</strong>
                        <small>
                          {p.productId} · {p.brand}
                        </small>
                      </Link>
                    </td>
                    <td>
                      <code>{p.batchNumber}</code>
                    </td>
                    <td>
                      <StatusBadge status={p.currentStatus} />
                    </td>
                    <td>
                      <HashChip hash={p.latestTxHash} />
                    </td>
                    <td>
                      <Link className="btn btn-outline btn-sm" to={`/product/${p.productId}`}>
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && filteredProducts.length > PAGE_SIZE && (
          <nav className="pagination" aria-label="Product pages">
            <button
              className="btn btn-outline btn-sm"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </button>
            <span>
              Page {page} of {totalPages}
            </span>
            <button
              className="btn btn-outline btn-sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </button>
          </nav>
        )}
      </section>

      {/* ── Activity feed ────────────────────────────────────────────────── */}
      <section className="card activity-card">
        <div className="flex-between">
          <div>
            <h2>
              <Activity size={16} style={{ verticalAlign: "middle", marginRight: 6 }} aria-hidden="true" />
              Recent activity
            </h2>
            <p>Events read from the contract logs.</p>
          </div>
          <span className="live-label">
            <i /> Live · refreshes every 6 s
          </span>
        </div>

        {activity.length ? (
          <ol className="activity-list">
            {activity.map((event, index) => (
              <li key={`${event.txHash}-${index}`}>
                <span className="activity-mark" aria-hidden="true">
                  {event.type === "ProductRegistered" ? "+" : "↗"}
                </span>
                <div className="activity-copy">
                  <strong>
                    {event.type === "ProductRegistered"
                      ? "Product registered"
                      : `Moved to ${STATUS_NAMES[event.status]?.replaceAll("_", " ")}`}
                  </strong>
                  <span>
                    <Link to={`/product/${event.productId}`}>{event.productId}</Link>
                    {" · "}
                    {shortAddress(event.actor)} ({event.role}){" · "}
                    {new Date(event.timestamp * 1000).toLocaleString()}
                  </span>
                </div>
                <HashChip hash={event.txHash} />
              </li>
            ))}
          </ol>
        ) : (
          <EmptyState
            title="No activity yet"
            description="Product registration and status updates will appear here."
          />
        )}
      </section>

      {/* ── Demo tools ───────────────────────────────────────────────────── */}
      <details className="card demo-tools">
        <summary>Demo tools</summary>
        <p>Sample IDs are quick references only; product results still come from the blockchain.</p>
        <div className="demo-id-list">
          {["PROD1001", "PROD1002", "PROD1003", "PROD1004", "PROD1005"].map((id) => (
            <button
              type="button"
              key={id}
              className="chip"
              onClick={() => navigator.clipboard?.writeText(id)}
            >
              {id} <span aria-hidden="true">⧉</span>
            </button>
          ))}
        </div>
        <p className="switch-hint">
          Next lifecycle action: <strong>{nextRoleHint}</strong>. Switch MetaMask to an account
          assigned that role, then confirm its transaction.
        </p>
      </details>

      {/* ── Admin panel (only visible to contract admin wallet) ──────────── */}
      {isAdmin && (
        <section className="card admin-panel">
          <span className="eyebrow">ADMIN WALLET</span>
          <h2>
            <UserCog size={18} style={{ verticalAlign: "middle", marginRight: 6 }} aria-hidden="true" />
            Role management
          </h2>
          <p>Role updates are sent as a transaction signed by the contract admin.</p>

          {/* Assign role form */}
          <form className="admin-form" onSubmit={handleAssignRole}>
            <label className="form-group">
              <span className="form-label">Wallet address</span>
              <input
                className="form-control"
                value={targetAddress}
                onChange={(e) => setTargetAddress(e.target.value)}
                placeholder="0x…"
                required
              />
            </label>
            <label className="form-group">
              <span className="form-label">Role</span>
              <select
                className="form-control"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
              >
                <option value="1">Manufacturer</option>
                <option value="2">Distributor</option>
                <option value="3">Retailer</option>
              </select>
            </label>
            <button className="btn btn-primary" disabled={assigning}>
              {assigning ? "Waiting for transaction…" : "Assign role"}
            </button>
          </form>

          {assignResult &&
            (assignResult.error ? (
              <p className="alert-error" role="alert">
                {assignResult.error}
              </p>
            ) : (
              <div className="alert-success">
                <strong>
                  {assignResult.pending
                    ? "Transaction submitted; waiting for confirmation"
                    : `${assignResult.role} role assigned`}
                </strong>
                <p>
                  <AddressChip address={assignResult.address} role={assignResult.role} />
                </p>
                <p>
                  Transaction: <HashChip hash={assignResult.hash} />
                </p>
                {assignResult.block && <p>Confirmed in block #{assignResult.block}.</p>}
              </div>
            ))}

          {/* Read-only role checker */}
          <form className="role-check-form" onSubmit={handleRoleCheck}>
            <label className="form-label" htmlFor="role-check-address">
              Read-only role checker
            </label>
            <div>
              <input
                id="role-check-address"
                className="form-control"
                value={checkAddress}
                onChange={(e) => setCheckAddress(e.target.value)}
                placeholder="Check any address (0x…)"
              />
              <button className="btn btn-outline" disabled={checkingRole}>
                <ShieldCheck size={14} aria-hidden="true" />
                {checkingRole ? "Checking…" : "Check role"}
              </button>
            </div>
            {checkedRole && (
              <p role="status">
                On-chain role: <strong>{checkedRole}</strong>
              </p>
            )}
          </form>
        </section>
      )}
    </div>
  );
}
