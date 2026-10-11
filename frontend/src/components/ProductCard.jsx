import { Link } from "react-router-dom";
import StatusBadge from "./StatusBadge";

/**
 * Reusable card displaying product metadata and current status.
 */
export default function ProductCard({ product }) {
  if (!product) return null;

  return (
    <div className="product-card">
      <div className="product-card-header">
        <h3 className="product-card-title">{product.productName}</h3>
        <StatusBadge status={product.currentStatus} />
      </div>

      <div className="product-card-meta">
        <div><strong>ID:</strong> {product.productId}</div>
        <div><strong>Brand:</strong> {product.brand} ({product.model})</div>
        <div><strong>Batch:</strong> {product.batchNumber}</div>
      </div>

      <div style={{ marginTop: "10px" }}>
        <Link
          to={`/product/${product.productId}`}
          className="btn btn-outline"
          style={{ padding: "6px 14px", fontSize: "0.85rem" }}
        >
          View Details & History &rarr;
        </Link>
      </div>
    </div>
  );
}
