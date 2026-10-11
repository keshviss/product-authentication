/** Placeholder card shown while chain data is loading. */
export default function SkeletonCard() {
  return (
    <div className="skeleton-card" aria-label="Loading product" role="status">
      <span className="sr-only">Loading product information</span>
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-text" />
      <div className="skeleton skeleton-text" style={{ width: "72%" }} />
    </div>
  );
}
