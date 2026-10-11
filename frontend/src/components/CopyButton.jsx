import { useState } from "react";

/**
 * Reusable clipboard copy button with visual confirmation.
 * @param {{ text: string, title?: string, label?: string }} props
 */
export default function CopyButton({ text, title = "Copy to clipboard", label }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e) => {
    e.stopPropagation();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn("Clipboard copy failed:", err);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="chip-copy-btn"
      title={copied ? "Copied to clipboard!" : title}
      aria-label={copied ? "Copied" : title}
    >
      {copied ? (
        <span style={{ color: "var(--green)", fontWeight: 700, fontSize: "0.8em" }}>
          ✓ {label ? "Copied" : ""}
        </span>
      ) : (
        <span aria-hidden="true" style={{ fontSize: "0.85em" }}>
          📋 {label || ""}
        </span>
      )}
    </button>
  );
}
