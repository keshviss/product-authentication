/**
 * Lightweight, accessible spinner component.
 * @param {{ size?: 'sm' | 'md' | 'lg', color?: string }} props
 */
export default function Spinner({ size = "md", color }) {
  const sizeClass = `spinner-${size}`;
  const style = color ? { borderTopColor: color } : {};

  return (
    <span
      className={`spinner ${sizeClass}`}
      style={style}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </span>
  );
}
