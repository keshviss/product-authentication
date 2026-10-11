import { useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";

/**
 * QR Code generator component with PNG download and print features.
 * Encodes: ${origin}/verify/${productId}
 */
export default function QRCode({ productId, size = 180 }) {
  const containerRef = useRef(null);

  if (!productId) return null;

  const verifyUrl = typeof window !== "undefined"
    ? `${window.location.origin}/verify/${encodeURIComponent(productId)}`
    : `/verify/${productId}`;

  // Download the rendered canvas as a PNG image
  const handleDownload = () => {
    if (!containerRef.current) return;
    const canvas = containerRef.current.querySelector("canvas");
    if (!canvas) return;

    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `${productId}-authenticity-qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print the QR code box
  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      ref={containerRef}
      className="card"
      style={{
        textAlign: "center",
        padding: "20px",
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        maxWidth: "300px",
      }}
    >
      <div style={{ marginBottom: "12px", background: "white", padding: "12px", borderRadius: "8px", border: "1px solid var(--border)" }}>
        <QRCodeCanvas
          value={verifyUrl}
          size={size}
          level="H"
          includeMargin={true}
        />
      </div>

      <div style={{ fontWeight: 700, fontSize: "1.05rem", marginBottom: "4px" }}>
        {productId}
      </div>
      <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginBottom: "14px", wordBreak: "break-all" }}>
        {verifyUrl}
      </div>

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center" }}>
        <button
          type="button"
          onClick={handleDownload}
          className="btn btn-primary"
          style={{ padding: "6px 14px", fontSize: "0.85rem" }}
        >
          ⬇ Download PNG
        </button>
        <button
          type="button"
          onClick={handlePrint}
          className="btn btn-outline"
          style={{ padding: "6px 14px", fontSize: "0.85rem" }}
        >
          🖨 Print QR
        </button>
      </div>
    </div>
  );
}
