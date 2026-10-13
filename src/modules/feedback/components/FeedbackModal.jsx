import React, { useState, useEffect } from "react";
import api from "../../../services/api";

const StarRating = ({ value, onChange, label, subtitle, readOnly = false }) => {
  const [hover, setHover] = useState(0);

  return (
    <div style={{ marginBottom: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "6px" }}>
        <span style={{ fontSize: "0.9rem", fontWeight: "700", color: "#1e293b" }}>{label}</span>
        {value > 0 && (
          <span style={{ fontSize: "0.82rem", fontWeight: "700", color: "#f59e0b" }}>
            {value} / 5 Stars
          </span>
        )}
      </div>
      {subtitle && <p style={{ margin: "0 0 8px 0", fontSize: "0.8rem", color: "#64748b" }}>{subtitle}</p>}
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = (hover || value) >= star;
          return (
            <button
              key={star}
              type="button"
              disabled={readOnly}
              onMouseEnter={() => !readOnly && setHover(star)}
              onMouseLeave={() => !readOnly && setHover(0)}
              onClick={() => !readOnly && onChange && onChange(star)}
              style={{
                background: "none",
                border: "none",
                cursor: readOnly ? "default" : "pointer",
                padding: "2px",
                fontSize: "1.8rem",
                color: filled ? "#f59e0b" : "#cbd5e1",
                transition: "transform 0.15s ease, color 0.15s ease",
                transform: hover === star ? "scale(1.2)" : "scale(1)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center"
              }}
              title={`${star} Star${star > 1 ? "s" : ""}`}
            >
              ★
            </button>
          );
        })}
      </div>
    </div>
  );
};

const FeedbackModal = ({ isOpen, onClose, order, onFeedbackSubmitted }) => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [eligibility, setEligibility] = useState(null);
  const [existingFeedback, setExistingFeedback] = useState(null);

  const [rating, setRating] = useState(5);
  const [deliveryBoyRating, setDeliveryBoyRating] = useState(5);
  const [productQualityRating, setProductQualityRating] = useState(5);
  const [review, setReview] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

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
    setRating(5);
    setDeliveryBoyRating(5);
    setProductQualityRating(5);
    setReview("");
    setError("");
    setSuccessMsg("");
    setExistingFeedback(null);
  };

  const loadEligibility = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/feedback-complaints/eligibility?orderType=${orderType}&orderId=${orderId}`);
      setEligibility(res.data);
      if (res.data.hasFeedback && res.data.existingFeedback) {
        setExistingFeedback(res.data.existingFeedback);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load order eligibility details");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!rating) {
      setError("Please select an overall rating.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post("/feedback-complaints/feedback", {
        orderType,
        orderId,
        rating,
        deliveryBoyRating,
        productQualityRating,
        review
      });
      setSuccessMsg("Thank you! Your feedback has been recorded.");
      setExistingFeedback(res.data.feedback);
      if (onFeedbackSubmitted) {
        onFeedbackSubmitted(res.data.feedback);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit feedback.");
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
          maxWidth: "520px",
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
            background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
            color: "#ffffff",
            borderTopLeftRadius: "20px",
            borderTopRightRadius: "20px"
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: "800", display: "flex", alignItems: "center", gap: "8px" }}>
              <span>⭐</span> Order Feedback & Rating
            </h3>
            <p style={{ margin: "4px 0 0 0", fontSize: "0.82rem", color: "#94a3b8" }}>
              {order?.milkType || "Milk Order"} · #{orderId} ({orderType === "subscription" ? "Subscription" : "Single Day"})
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.15)",
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
              <div style={{ width: "36px", height: "36px", border: "4px solid #e2e8f0", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 12px" }}></div>
              <p style={{ color: "#64748b", margin: 0, fontSize: "0.9rem" }}>Checking order details...</p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : error && !eligibility?.isDelivered ? (
            <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "12px", padding: "16px", color: "#991b1b", fontSize: "0.9rem" }}>
              <strong>Not Eligible:</strong> {error}
            </div>
          ) : existingFeedback ? (
            /* Display Saved Feedback */
            <div>
              <div
                style={{
                  background: "#f0fdf4",
                  border: "1px solid #86efac",
                  borderRadius: "14px",
                  padding: "16px",
                  marginBottom: "20px",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px"
                }}
              >
                <div style={{ fontSize: "2rem" }}>✅</div>
                <div>
                  <h4 style={{ margin: "0 0 2px 0", color: "#166534", fontSize: "1rem", fontWeight: "700" }}>
                    Feedback Already Submitted
                  </h4>
                  <p style={{ margin: 0, color: "#15803d", fontSize: "0.82rem" }}>
                    You have already reviewed this delivery on {new Date(existingFeedback.createdAt).toLocaleDateString()}.
                  </p>
                </div>
              </div>

              <div style={{ background: "#f8fafc", borderRadius: "14px", padding: "18px", border: "1px solid #e2e8f0" }}>
                <StarRating label="Overall Rating" value={existingFeedback.rating} readOnly />
                {existingFeedback.deliveryBoyRating && (
                  <StarRating label="Delivery Boy Behaviour" value={existingFeedback.deliveryBoyRating} readOnly />
                )}
                {existingFeedback.productQualityRating && (
                  <StarRating label="Product Freshness & Quality" value={existingFeedback.productQualityRating} readOnly />
                )}

                {existingFeedback.review ? (
                  <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: "0.82rem", fontWeight: "700", color: "#475569", marginBottom: "4px" }}>
                      Your Written Review:
                    </div>
                    <p style={{ margin: 0, fontSize: "0.9rem", color: "#1e293b", fontStyle: "italic", background: "#ffffff", padding: "10px 14px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                      "{existingFeedback.review}"
                    </p>
                  </div>
                ) : (
                  <p style={{ margin: "8px 0 0 0", color: "#94a3b8", fontSize: "0.82rem", fontStyle: "italic" }}>
                    No written review was added.
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={onClose}
                style={{
                  marginTop: "20px",
                  width: "100%",
                  padding: "12px",
                  background: "#1e293b",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "10px",
                  fontWeight: "700",
                  fontSize: "0.95rem",
                  cursor: "pointer"
                }}
              >
                Close
              </button>
            </div>
          ) : (
            /* Feedback Submission Form */
            <form onSubmit={handleSubmit}>
              {error && (
                <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "10px", padding: "12px", color: "#991b1b", marginBottom: "16px", fontSize: "0.88rem" }}>
                  {error}
                </div>
              )}
              {successMsg && (
                <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "10px", padding: "12px", color: "#166534", marginBottom: "16px", fontSize: "0.88rem" }}>
                  {successMsg}
                </div>
              )}

              {/* Order Info Badge */}
              <div style={{ background: "#f8fafc", borderRadius: "10px", padding: "12px", marginBottom: "18px", border: "1px solid #e2e8f0", fontSize: "0.85rem", color: "#475569" }}>
                <div><strong>Product:</strong> {order?.milkType} ({order?.dailyQuantity}L)</div>
                {eligibility?.deliveryBoy && (
                  <div style={{ marginTop: "4px" }}>
                    <strong>Delivery Partner:</strong> {eligibility.deliveryBoy.name}
                  </div>
                )}
              </div>

              {/* 1. Overall Rating */}
              <StarRating
                label="1. Overall Delivery Experience *"
                subtitle="How satisfied are you with this overall order?"
                value={rating}
                onChange={setRating}
              />

              {/* 2. Delivery Boy Behaviour */}
              <StarRating
                label="2. Delivery Boy Behaviour & Punctuality"
                subtitle="Rate politeness, timeliness, and handover experience"
                value={deliveryBoyRating}
                onChange={setDeliveryBoyRating}
              />

              {/* 3. Product Quality */}
              <StarRating
                label="3. Product Quality & Packaging"
                subtitle="Rate milk freshness, temperature, and leak-proof packaging"
                value={productQualityRating}
                onChange={setProductQualityRating}
              />

              {/* 4. Written Review */}
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "0.88rem", fontWeight: "700", color: "#1e293b", marginBottom: "6px" }}>
                  Written Review (Optional)
                </label>
                <textarea
                  rows="3"
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  placeholder="Tell us what you loved or how we can improve..."
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    borderRadius: "10px",
                    border: "1.5px solid #cbd5e1",
                    padding: "10px 14px",
                    fontSize: "0.9rem",
                    outline: "none",
                    fontFamily: "inherit",
                    resize: "vertical"
                  }}
                />
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
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    flex: 2,
                    padding: "12px",
                    background: "#f59e0b",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "10px",
                    fontWeight: "800",
                    fontSize: "0.95rem",
                    cursor: submitting ? "not-allowed" : "pointer",
                    boxShadow: "0 4px 12px rgba(245, 158, 11, 0.35)",
                    opacity: submitting ? 0.7 : 1
                  }}
                >
                  {submitting ? "Submitting..." : "Submit Feedback ★"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default FeedbackModal;
