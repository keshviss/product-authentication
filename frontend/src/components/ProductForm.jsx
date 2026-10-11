import { useState } from "react";

const INITIAL_STATE = {
  productId: "", productName: "", brand: "", model: "", batchNumber: "",
  manufacturingDate: new Date().toISOString().slice(0, 10), category: "Electronics", description: "",
};
const CATEGORIES = ["Electronics", "Accessories", "Apparel & Fashion", "Pharmaceuticals", "Automotive", "Luxury Goods", "Food & Beverage", "Other"];
const LIMITS = { productId: 32, productName: 64, brand: 48, model: 48, batchNumber: 32, manufacturingDate: 10, category: 32, description: 256 };

function validationMessage(name, value) {
  const required = { productId: "Product ID", productName: "Product name", brand: "Brand", batchNumber: "Batch number", manufacturingDate: "Manufacturing date" };
  if (required[name] && !value.trim()) return `${required[name]} is required.`;
  if (name === "productId" && value && !/^[A-Za-z0-9_-]+$/.test(value)) return "Use letters, numbers, hyphens, or underscores only.";
  if (value.length > LIMITS[name]) return `Keep this field to ${LIMITS[name]} characters or fewer.`;
  return "";
}

export default function ProductForm({ onSubmit, submitting, onFormChange, retryLabel }) {
  const [formData, setFormData] = useState(INITIAL_STATE);
  const [touched, setTouched] = useState({});
  const [formError, setFormError] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;
    const next = { ...formData, [name]: value };
    setFormData(next);
    onFormChange?.(next);
  }

  function handleSubmit(event) {
    event.preventDefault();
    const errors = Object.fromEntries(Object.keys(formData).map((key) => [key, validationMessage(key, formData[key])]));
    setTouched(Object.fromEntries(Object.keys(formData).map((key) => [key, true])));
    const firstError = Object.values(errors).find(Boolean);
    if (firstError) { setFormError(firstError); return; }
    setFormError("");
    onSubmit({ ...formData, productId: formData.productId.trim().toUpperCase(), batchNumber: formData.batchNumber.trim().toUpperCase(), ...Object.fromEntries(["productName", "brand", "model", "manufacturingDate", "category", "description"].map((key) => [key, formData[key].trim()])) });
  }

  function field(name, label, placeholder, required = false, type = "text") {
    const error = touched[name] ? validationMessage(name, formData[name]) : "";
    return <div className="form-group" key={name}><label className="form-label" htmlFor={`product-${name}`}>{label}{required && <span className="req"> *</span>}</label><input id={`product-${name}`} type={type} name={name} placeholder={placeholder} value={formData[name]} onChange={handleChange} onBlur={() => setTouched((prev) => ({ ...prev, [name]: true }))} className={`form-control${error ? " has-error" : ""}`} aria-invalid={Boolean(error)} aria-describedby={`${name}-help ${name}-error`} disabled={submitting} required={required} maxLength={LIMITS[name]} /><div className="field-meta"><span id={`${name}-error`} className="field-error" aria-live="polite">{error}</span><span id={`${name}-help`} className="char-counter">{formData[name].length}/{LIMITS[name]}</span></div></div>;
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {formError && <div className="alert-error" role="alert">{formError}</div>}
      <div className="form-row">{field("productId", "Product ID", "e.g. PROD1006", true)}{field("productName", "Product name", "e.g. Wireless earbuds", true)}</div>
      <div className="form-row">{field("brand", "Brand", "e.g. SoundWave", true)}{field("model", "Model", "e.g. SW-Pro-X")}</div>
      <div className="form-row">{field("batchNumber", "Batch number", "e.g. B106", true)}{field("manufacturingDate", "Manufacturing date", "", true, "date")}<div className="form-group"><label className="form-label" htmlFor="product-category">Category</label><select id="product-category" name="category" value={formData.category} onChange={handleChange} className="form-control" disabled={submitting}>{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select><div className="char-counter">{formData.category.length}/{LIMITS.category}</div></div></div>
      <div className="form-group"><label className="form-label" htmlFor="product-description">Description</label><textarea id="product-description" name="description" rows="3" placeholder="Short product details" value={formData.description} onChange={handleChange} className="form-control" disabled={submitting} maxLength={LIMITS.description} /><div className="char-counter">{formData.description.length}/{LIMITS.description}</div><p className="form-help">The smart contract stores this text on-chain. Concise descriptions use less gas.</p></div>
      <button type="submit" disabled={submitting} aria-busy={submitting} className="btn btn-primary btn-lg form-submit">{submitting ? "Waiting for transaction…" : retryLabel || "Register product on blockchain"}</button>
    </form>
  );
}
