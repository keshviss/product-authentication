import { createContext, useCallback, useContext, useState } from "react";

const ToastContext = createContext(null);
let nextToastId = 1;

/** Keeps short-lived feedback messages in one place for every page. */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((items) => items.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback((message, type = "info") => {
    const id = nextToastId++;
    setToasts((items) => [...items, { id, message, type }]);
    window.setTimeout(() => dismiss(id), 4000);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-container" aria-live="polite" aria-atomic="false">
        {toasts.map((item) => (
          <div key={item.id} className={`toast toast-${item.type}`} role={item.type === "error" ? "alert" : "status"}>
            <span aria-hidden="true">{item.type === "success" ? "✓" : item.type === "error" ? "!" : "i"}</span>
            <span className="toast-message">{item.message}</span>
            <button className="toast-close-btn" type="button" onClick={() => dismiss(item.id)} aria-label="Dismiss notification">×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const value = useContext(ToastContext);
  if (!value) throw new Error("useToast must be used inside ToastProvider");
  return value;
}
