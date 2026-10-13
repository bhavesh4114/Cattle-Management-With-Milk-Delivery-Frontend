import React, { useState, useEffect } from "react";
import api from "../../../services/api";

const CATEGORIES = [
  { value: "Late or incomplete delivery", label: "⏰ Late or Incomplete Delivery" },
  { value: "Wrong milk quantity", label: "🥛 Wrong Milk Quantity" },
  { value: "Product quality", label: "⚠️ Product Quality / Spoilage" },
  { value: "Missing product", label: "📦 Missing Product / Item" },
  { value: "Delivery boy behaviour", label: "🛵 Delivery Boy Behaviour" },
  { value: "Payment issue", label: "💳 Payment / Billing Issue" },
  { value: "Other", label: "📝 Other Issue" }
];

const RaiseComplaintModal = ({ isOpen, onClose, order, onComplaintSubmitted, onOpenMyComplaints }) => {
  const [category, setCategory] = useState(CATEGORIES[0].value);
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submittedComplaint, setSubmittedComplaint] = useState(null);
  const [eligibility, setEligibility] = useState(null);

  const orderType = order?.orderCategory === "sub" ? "subscription" : (order?.orderCategory || "trial");
  const orderId = order?.id;

  useEffect(() => {
    if (isOpen && orderId) {
      loadEligibility();
    } else {
      resetForm();
    }
  }, [isOpen, orderId]);

  const resetForm = () => {
    setCategory(CATEGORIES[0].value);
    setDescription("");
    setFile(null);
    setFilePreview(null);
    setError("");
    setSubmittedComplaint(null);
  };

  const loadEligibility = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/feedback-complaints/eligibility?orderType=${orderType}&orderId=${orderId}`);
      setEligibility(res.data);
      if (!res.data.isDelivered) {
        setError("Complaints can only be submitted after the delivery has been completed.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load order information.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;

    if (!selected.type.startsWith("image/")) {
      setError("Please select a valid image file (JPG, PNG, WebP).");
      return;
    }

    if (selected.size > 5 * 1024 * 1024) {
      setError("Attachment size cannot exceed 5MB.");
      return;
    }

    setError("");
    setFile(selected);
    const reader = new FileReader();
    reader.onload = () => setFilePreview(reader.result);
    reader.readAsDataURL(selected);
  };

  const removeFile = () => {
    setFile(null);
    setFilePreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!description || description.trim().length < 5) {
      setError("Please provide a detailed description (at least 5 characters).");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("orderType", orderType);
      formData.append("orderId", orderId);
      formData.append("category", category);
      formData.append("description", description.trim());
      if (file) {
        formData.append("attachment", file);
      }

      const res = await api.post("/feedback-complaints/complaint", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      setSubmittedComplaint(res.data.complaint);
      if (onComplaintSubmitted) {
        onComplaintSubmitted(res.data.complaint);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to register complaint.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2200,
        padding: "16px"
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "20px",
          maxWidth: "540px",
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          border: "1px solid #e2e8f0"
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid #f1f5f9",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "linear-gradient(135deg, #b91c1c 0%, #991b1b 100%)",
            color: "#ffffff",
            borderTopLeftRadius: "20px",
            borderTopRightRadius: "20px"
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: "800", display: "flex", alignItems: "center", gap: "8px" }}>
              <span>⚠️</span> Raise Order Complaint
            </h3>
            <p style={{ margin: "4px 0 0 0", fontSize: "0.82rem", color: "#fca5a5" }}>
              Order #{orderId} · {order?.milkType} ({orderType === "subscription" ? "Subscription" : "Single Day"})
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.2)",
              border: "none",
              color: "#ffffff",
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              cursor: "pointer",
              fontSize: "1rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: "24px" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px" }}>
              <div style={{ width: "36px", height: "36px", border: "4px solid #e2e8f0", borderTopColor: "#ef4444", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 12px" }}></div>
              <p style={{ color: "#64748b", margin: 0, fontSize: "0.9rem" }}>Checking delivery status...</p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : submittedComplaint ? (
            /* Success confirmation screen */
            <div style={{ textAlign: "center", padding: "10px 0" }}>
              <div style={{ width: "64px", height: "64px", background: "#fef2f2", color: "#dc2626", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem", margin: "0 auto 16px" }}>
                🛡️
              </div>
              <h3 style={{ margin: "0 0 8px 0", color: "#0f172a", fontSize: "1.3rem", fontWeight: "800" }}>
                Complaint Registered!
              </h3>
              <p style={{ color: "#64748b", fontSize: "0.9rem", margin: "0 0 20px 0" }}>
                Your complaint has been submitted to farm management. We will investigate and contact you shortly.
              </p>

              <div style={{ background: "#f8fafc", border: "1.5px dashed #cbd5e1", borderRadius: "14px", padding: "18px", marginBottom: "24px" }}>
                <div style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: "700", textTransform: "uppercase" }}>
                  Complaint Tracking ID
                </div>
                <div style={{ fontSize: "1.6rem", fontWeight: "900", color: "#dc2626", letterSpacing: "1px", marginTop: "4px" }}>
                  {submittedComplaint.complaintCode}
                </div>
                <div style={{ marginTop: "10px", fontSize: "0.85rem", color: "#475569" }}>
                  <strong>Category:</strong> {submittedComplaint.category}
                </div>
                <div style={{ marginTop: "4px", fontSize: "0.85rem", color: "#475569" }}>
                  <strong>Initial Status:</strong> <span style={{ background: "#fef3c7", color: "#92400e", padding: "2px 8px", borderRadius: "12px", fontWeight: "700" }}>PENDING</span>
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    flex: 1,
                    padding: "12px",
                    background: "#f1f5f9",
                    color: "#475569",
                    border: "none",
                    borderRadius: "10px",
                    fontWeight: "700",
                    cursor: "pointer"
                  }}
                >
                  Done
                </button>
                {onOpenMyComplaints && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenMyComplaints();
                    }}
                    style={{
                      flex: 1.5,
                      padding: "12px",
                      background: "#b91c1c",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "10px",
                      fontWeight: "800",
                      cursor: "pointer"
                    }}
                  >
                    View in My Complaints ➔
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Complaint Submission Form */
            <form onSubmit={handleSubmit}>
              {error && (
                <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "10px", padding: "12px", color: "#991b1b", marginBottom: "16px", fontSize: "0.88rem" }}>
                  {error}
                </div>
              )}

              {/* Order Info & Delivery Boy info banner */}
              <div style={{ background: "#f8fafc", borderRadius: "12px", padding: "14px", border: "1px solid #e2e8f0", marginBottom: "18px", fontSize: "0.86rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span style={{ color: "#64748b" }}>Product:</span>
                  <strong style={{ color: "#1e293b" }}>{order?.milkType} ({order?.dailyQuantity}L)</strong>
                </div>
                {eligibility?.deliveryBoy && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#64748b" }}>Delivery Partner:</span>
                    <strong style={{ color: "#1e293b" }}>{eligibility.deliveryBoy.name}</strong>
                  </div>
                )}
              </div>

              {/* Category Dropdown */}
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "0.88rem", fontWeight: "700", color: "#1e293b", marginBottom: "6px" }}>
                  Issue Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    borderRadius: "10px",
                    border: "1.5px solid #cbd5e1",
                    padding: "11px 14px",
                    fontSize: "0.92rem",
                    outline: "none",
                    background: "#ffffff",
                    fontWeight: "600",
                    color: "#0f172a"
                  }}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "0.88rem", fontWeight: "700", color: "#1e293b", marginBottom: "6px" }}>
                  Detailed Description *
                </label>
                <textarea
                  rows="4"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explain what went wrong (e.g., delivered after 10 AM, milk tasted sour, wrong bottle received)..."
                  required
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    borderRadius: "10px",
                    border: "1.5px solid #cbd5e1",
                    padding: "12px 14px",
                    fontSize: "0.9rem",
                    outline: "none",
                    fontFamily: "inherit",
                    resize: "vertical"
                  }}
                />
              </div>

              {/* Photo Attachment (Optional) */}
              <div style={{ marginBottom: "22px" }}>
                <label style={{ display: "block", fontSize: "0.88rem", fontWeight: "700", color: "#1e293b", marginBottom: "6px" }}>
                  Photo Proof (Optional, Max 5MB)
                </label>

                {filePreview ? (
                  <div style={{ position: "relative", borderRadius: "12px", overflow: "hidden", border: "1px solid #cbd5e1", display: "inline-block" }}>
                    <img
                      src={filePreview}
                      alt="Attachment Preview"
                      style={{ maxHeight: "150px", maxWidth: "100%", display: "block", objectFit: "cover" }}
                    />
                    <button
                      type="button"
                      onClick={removeFile}
                      style={{
                        position: "absolute",
                        top: "6px",
                        right: "6px",
                        background: "rgba(0,0,0,0.7)",
                        color: "white",
                        border: "none",
                        borderRadius: "50%",
                        width: "26px",
                        height: "26px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "12px"
                      }}
                      title="Remove image"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <label
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "2px dashed #cbd5e1",
                      borderRadius: "12px",
                      padding: "16px",
                      cursor: "pointer",
                      background: "#f8fafc",
                      transition: "border-color 0.2s"
                    }}
                  >
                    <span style={{ fontSize: "1.6rem", marginBottom: "4px" }}>📷</span>
                    <span style={{ fontSize: "0.85rem", fontWeight: "700", color: "#475569" }}>
                      Upload Photo Evidence (Milk Bottle, Packet, etc.)
                    </span>
                    <span style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "2px" }}>
                      Supports JPG, PNG, WebP up to 5MB
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleFileChange}
                      style={{ display: "none" }}
                    />
                  </label>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    flex: 1,
                    padding: "12px",
                    background: "#f1f5f9",
                    color: "#475569",
                    border: "none",
                    borderRadius: "10px",
                    fontWeight: "700",
                    cursor: "pointer"
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || (eligibility && !eligibility.isDelivered)}
                  style={{
                    flex: 2,
                    padding: "12px",
                    background: "#dc2626",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "10px",
                    fontWeight: "800",
                    fontSize: "0.95rem",
                    cursor: submitting ? "not-allowed" : "pointer",
                    boxShadow: "0 4px 12px rgba(220, 38, 38, 0.35)",
                    opacity: submitting ? 0.7 : 1
                  }}
                >
                  {submitting ? "Registering Complaint..." : "Submit Complaint ⚠️"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default RaiseComplaintModal;
