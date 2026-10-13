import React, { useState, useEffect } from "react";
import api from "../../../services/api";

const STATUS_CONFIG = {
  PENDING: { label: "Pending", bg: "#fef3c7", color: "#92400e", step: 1 },
  IN_PROGRESS: { label: "In Progress", bg: "#dbeafe", color: "#1e40af", step: 2 },
  RESOLVED: { label: "Resolved", bg: "#dcfce7", color: "#166534", step: 3 },
  REOPENED: { label: "Reopened", bg: "#f3e8ff", color: "#6b21a8", step: 2 }
};

const MyComplaintsModal = ({ isOpen, onClose }) => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState({ text: "", type: "" });

  // Reopen state
  const [reopenTargetId, setReopenTargetId] = useState(null);
  const [reopenReason, setReopenReason] = useState("");
  const [reopening, setReopening] = useState(false);

  // Expanded complaint ID for details
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadComplaints();
    }
  }, [isOpen]);

  const loadComplaints = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/feedback-complaints/my-complaints");
      setComplaints(res.data || []);
      if (res.data?.length > 0) {
        setExpandedId(res.data[0].id);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load complaints");
    } finally {
      setLoading(false);
    }
  };

  const showToast = (text, type = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast({ text: "", type: "" }), 4000);
  };

  const handleReopen = async (complaintId) => {
    if (!reopenReason || reopenReason.trim().length < 5) {
      showToast("Please provide a reason (at least 5 characters).", "error");
      return;
    }

    setReopening(true);
    try {
      await api.post(`/feedback-complaints/my-complaints/${complaintId}/reopen`, {
        reason: reopenReason.trim()
      });
      showToast("Complaint reopened successfully. Admin notified.");
      setReopenTargetId(null);
      setReopenReason("");
      loadComplaints();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to reopen complaint", "error");
    } finally {
      setReopening(false);
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
          maxWidth: "680px",
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
            background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
            color: "#ffffff",
            borderTopLeftRadius: "20px",
            borderTopRightRadius: "20px"
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "800", display: "flex", alignItems: "center", gap: "8px" }}>
              <span>🛡️</span> My Complaints & Grievances
            </h3>
            <p style={{ margin: "4px 0 0 0", fontSize: "0.82rem", color: "#94a3b8" }}>
              Track the investigation and resolution of your reported issues
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

        {/* Content */}
        <div style={{ padding: "24px" }}>
          {toast.text && (
            <div
              style={{
                padding: "12px 16px",
                borderRadius: "10px",
                marginBottom: "16px",
                fontSize: "0.88rem",
                fontWeight: "600",
                background: toast.type === "error" ? "#fef2f2" : "#f0fdf4",
                color: toast.type === "error" ? "#991b1b" : "#166534",
                border: toast.type === "error" ? "1px solid #fca5a5" : "1px solid #86efac"
              }}
            >
              {toast.text}
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: "center", padding: "40px" }}>
              <div style={{ width: "36px", height: "36px", border: "4px solid #e2e8f0", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 12px" }}></div>
              <p style={{ color: "#64748b", margin: 0, fontSize: "0.9rem" }}>Loading your complaints...</p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : error ? (
            <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "10px", padding: "14px", color: "#991b1b" }}>
              {error}
            </div>
          ) : complaints.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <div style={{ fontSize: "3rem", marginBottom: "10px" }}>✨</div>
              <h4 style={{ margin: "0 0 6px 0", color: "#0f172a", fontSize: "1.1rem", fontWeight: "700" }}>
                No Complaints Registered
              </h4>
              <p style={{ margin: 0, color: "#64748b", fontSize: "0.88rem" }}>
                You have not raised any complaints yet. If you ever experience issues with delivery or product quality, you can raise one directly from your delivered order!
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {complaints.map((item) => {
                const conf = STATUS_CONFIG[item.status] || STATUS_CONFIG.PENDING;
                const isExpanded = expandedId === item.id;

                return (
                  <div
                    key={item.id}
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: "14px",
                      overflow: "hidden",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                      transition: "all 0.2s"
                    }}
                  >
                    {/* Complaint Item Top Bar */}
                    <div
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      style={{
                        padding: "16px 20px",
                        background: isExpanded ? "#f8fafc" : "#ffffff",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: "10px",
                        borderBottom: isExpanded ? "1px solid #e2e8f0" : "none"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <span style={{ fontSize: "1.4rem" }}>
                          {item.status === "RESOLVED" ? "✅" : item.status === "REOPENED" ? "🔄" : item.status === "IN_PROGRESS" ? "⏳" : "⚠️"}
                        </span>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                            <strong style={{ color: "#0f172a", fontSize: "1rem" }}>{item.complaintCode}</strong>
                            <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
                              • {new Date(item.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <div style={{ fontSize: "0.85rem", color: "#475569", marginTop: "2px" }}>
                            <strong>Category:</strong> {item.category}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span
                          style={{
                            background: conf.bg,
                            color: conf.color,
                            padding: "4px 10px",
                            borderRadius: "20px",
                            fontSize: "0.8rem",
                            fontWeight: "800",
                            textTransform: "uppercase"
                          }}
                        >
                          {conf.label}
                        </span>
                        <span style={{ color: "#94a3b8", fontSize: "0.85rem", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
                          ▼
                        </span>
                      </div>
                    </div>

                    {/* Expanded Detail View */}
                    {isExpanded && (
                      <div style={{ padding: "20px", background: "#ffffff" }}>
                        {/* Progress Stepper */}
                        <div style={{ marginBottom: "20px", background: "#f8fafc", padding: "14px 18px", borderRadius: "12px", border: "1px solid #f1f5f9" }}>
                          <div style={{ fontSize: "0.78rem", fontWeight: "700", color: "#64748b", textTransform: "uppercase", marginBottom: "10px" }}>
                            Investigation Progress
                          </div>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative" }}>
                            {/* Step 1 */}
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", zIndex: 2 }}>
                              <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: conf.step >= 1 ? "#3b82f6" : "#cbd5e1", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "bold" }}>
                                1
                              </div>
                              <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "#1e293b", marginTop: "4px" }}>Submitted</span>
                            </div>

                            {/* Connecting Line 1 */}
                            <div style={{ flex: 1, height: "3px", background: conf.step >= 2 ? "#3b82f6" : "#e2e8f0", margin: "0 8px", position: "relative", top: "-10px" }}></div>

                            {/* Step 2 */}
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", zIndex: 2 }}>
                              <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: conf.step >= 2 ? "#3b82f6" : "#cbd5e1", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "bold" }}>
                                2
                              </div>
                              <span style={{ fontSize: "0.75rem", fontWeight: "700", color: conf.step >= 2 ? "#1e293b" : "#94a3b8", marginTop: "4px" }}>
                                {item.status === "REOPENED" ? "Reopened" : "In Progress"}
                              </span>
                            </div>

                            {/* Connecting Line 2 */}
                            <div style={{ flex: 1, height: "3px", background: conf.step >= 3 ? "#16a34a" : "#e2e8f0", margin: "0 8px", position: "relative", top: "-10px" }}></div>

                            {/* Step 3 */}
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", zIndex: 2 }}>
                              <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: conf.step >= 3 ? "#16a34a" : "#cbd5e1", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "bold" }}>
                                3
                              </div>
                              <span style={{ fontSize: "0.75rem", fontWeight: "700", color: conf.step >= 3 ? "#16a34a" : "#94a3b8", marginTop: "4px" }}>Resolved</span>
                            </div>
                          </div>
                        </div>

                        {/* Order & Delivery Details */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "14px", fontSize: "0.85rem" }}>
                          <div style={{ background: "#f8fafc", padding: "10px 14px", borderRadius: "8px" }}>
                            <span style={{ color: "#64748b" }}>Product: </span>
                            <strong>{item.orderDetail?.milkType || "Milk"} ({item.orderDetail?.dailyQuantity}L)</strong>
                          </div>
                          {item.deliveryBoy && (
                            <div style={{ background: "#f8fafc", padding: "10px 14px", borderRadius: "8px" }}>
                              <span style={{ color: "#64748b" }}>Delivery Partner: </span>
                              <strong>{item.deliveryBoy.name}</strong>
                            </div>
                          )}
                        </div>

                        {/* Customer's Description */}
                        <div style={{ marginBottom: "14px" }}>
                          <div style={{ fontSize: "0.82rem", fontWeight: "700", color: "#475569", marginBottom: "4px" }}>
                            Your Complaint Description:
                          </div>
                          <div style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: "10px", fontSize: "0.9rem", color: "#1e293b", border: "1px solid #e2e8f0" }}>
                            {item.description}
                          </div>
                        </div>

                        {/* Photo Attachment if present */}
                        {item.attachment && (
                          <div style={{ marginBottom: "16px" }}>
                            <div style={{ fontSize: "0.82rem", fontWeight: "700", color: "#475569", marginBottom: "6px" }}>
                              Photo Evidence Attached:
                            </div>
                            <a
                              href={item.attachment}
                              target="_blank"
                              rel="noreferrer"
                              style={{ display: "inline-block", borderRadius: "10px", overflow: "hidden", border: "1px solid #cbd5e1" }}
                            >
                              <img
                                src={item.attachment}
                                alt="Complaint Attachment"
                                style={{ maxHeight: "120px", display: "block" }}
                              />
                            </a>
                          </div>
                        )}

                        {/* Admin Response / Resolution Notes */}
                        {item.resolutionNotes ? (
                          <div style={{ background: "#ecfdf5", border: "1.5px solid #a7f3d0", borderRadius: "12px", padding: "14px", marginBottom: "16px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#065f46", fontWeight: "800", fontSize: "0.88rem", marginBottom: "4px" }}>
                              <span>✅</span> Official Farm Resolution
                            </div>
                            <div style={{ color: "#047857", fontSize: "0.9rem" }}>
                              {item.resolutionNotes}
                            </div>
                            {item.resolvedAt && (
                              <div style={{ color: "#059669", fontSize: "0.75rem", marginTop: "6px" }}>
                                Resolved on: {new Date(item.resolvedAt).toLocaleString()}
                              </div>
                            )}
                          </div>
                        ) : item.adminNotes ? (
                          <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "12px", padding: "12px", marginBottom: "16px" }}>
                            <div style={{ color: "#1e40af", fontWeight: "700", fontSize: "0.85rem", marginBottom: "2px" }}>
                              Admin Note:
                            </div>
                            <div style={{ color: "#1d4ed8", fontSize: "0.88rem" }}>
                              {item.adminNotes}
                            </div>
                          </div>
                        ) : null}

                        {/* Reopen reason if previously reopened */}
                        {item.reopenReason && (
                          <div style={{ background: "#faf5ff", border: "1px solid #e9d5ff", borderRadius: "10px", padding: "10px 14px", marginBottom: "14px", fontSize: "0.85rem", color: "#6b21a8" }}>
                            <strong>Reopen Reason:</strong> {item.reopenReason}
                          </div>
                        )}

                        {/* Reopen Action for Resolved Complaints */}
                        {item.status === "RESOLVED" && (
                          <div>
                            {reopenTargetId === item.id ? (
                              <div style={{ background: "#fdf4ff", border: "1.5px solid #f0abfc", borderRadius: "12px", padding: "14px", marginTop: "10px" }}>
                                <div style={{ fontWeight: "700", color: "#86198f", fontSize: "0.88rem", marginBottom: "6px" }}>
                                  State your reason for reopening this complaint:
                                </div>
                                <textarea
                                  rows="2"
                                  value={reopenReason}
                                  onChange={(e) => setReopenReason(e.target.value)}
                                  placeholder="Explain why the resolution did not resolve your issue..."
                                  style={{
                                    width: "100%",
                                    boxSizing: "border-box",
                                    borderRadius: "8px",
                                    border: "1px solid #d8b4fe",
                                    padding: "8px 12px",
                                    fontSize: "0.88rem",
                                    fontFamily: "inherit"
                                  }}
                                />
                                <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                                  <button
                                    type="button"
                                    onClick={() => setReopenTargetId(null)}
                                    style={{
                                      padding: "8px 14px",
                                      background: "#f1f5f9",
                                      color: "#475569",
                                      border: "none",
                                      borderRadius: "8px",
                                      fontWeight: "600",
                                      cursor: "pointer"
                                    }}
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    disabled={reopening}
                                    onClick={() => handleReopen(item.id)}
                                    style={{
                                      padding: "8px 16px",
                                      background: "#9333ea",
                                      color: "#ffffff",
                                      border: "none",
                                      borderRadius: "8px",
                                      fontWeight: "700",
                                      cursor: reopening ? "not-allowed" : "pointer"
                                    }}
                                  >
                                    {reopening ? "Reopening..." : "Confirm Reopen"}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setReopenTargetId(item.id);
                                  setReopenReason("");
                                }}
                                style={{
                                  marginTop: "8px",
                                  padding: "8px 16px",
                                  background: "#fdf4ff",
                                  color: "#7e22ce",
                                  border: "1.5px solid #d8b4fe",
                                  borderRadius: "8px",
                                  fontWeight: "700",
                                  fontSize: "0.85rem",
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "6px"
                                }}
                              >
                                <span>🔄</span> Reopen Complaint
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyComplaintsModal;
