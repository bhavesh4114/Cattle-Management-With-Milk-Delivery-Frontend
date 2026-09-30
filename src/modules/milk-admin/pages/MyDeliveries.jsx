import React, { useState, useEffect } from "react";
import api from "../../../services/api";

const statusColors = {
  Assigned: { bg: "#dbeafe", color: "#1d4ed8", dot: "#3b82f6" },
  Accepted: { bg: "#e0e7ff", color: "#4338ca", dot: "#6366f1" },
  "Out for Delivery": { bg: "#fef3c7", color: "#b45309", dot: "#f59e0b" },
  Delivered: { bg: "#dcfce7", color: "#15803d", dot: "#22c55e" },
  Rejected: { bg: "#fee2e2", color: "#b91c1c", dot: "#ef4444" },
};

const STATUS_FLOW = ["Assigned", "Accepted", "Out for Delivery", "Delivered"];

const MyDeliveries = () => {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewModal, setViewModal] = useState({ isOpen: false, data: null });
  const [toast, setToast] = useState({ text: "", type: "" });
  const [rejectModal, setRejectModal] = useState({ isOpen: false, assignmentId: null, notes: "" });
  const [profile, setProfile] = useState(null);
  const [todayStatus, setTodayStatus] = useState('Available');
  const [availModal, setAvailModal] = useState({ isOpen: false });
  const [availForm, setAvailForm] = useState({ date: new Date().toISOString().split("T")[0], status: "Available" });

  const showToast = (text, type = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast({ text: "", type: "" }), 4000);
  };

  useEffect(() => {
    fetchDeliveries();
    fetchMyProfile();
    // Auto-refresh every 30s to reflect admin changes
    const interval = setInterval(fetchMyProfile, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDeliveries = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/delivery/my-deliveries");
      setDeliveries(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyProfile = async () => {
    try {
      const res = await api.get("/api/delivery/boys/my-profile");
      const prof = res.data.profile;
      setProfile(prof);
      // Fetch today's actual availability
      const today = new Date().toISOString().split('T')[0];
      try {
        const availRes = await api.get(`/api/delivery/boys/my-availability?from=${today}T00:00:00.000Z&to=${today}T23:59:59.999Z`);
        const todayRecord = availRes.data?.[0];
        setTodayStatus(todayRecord?.status || prof?.dailyStatus || 'Available');
      } catch {
        setTodayStatus(prof?.dailyStatus || 'Available');
      }
    } catch (e) {}
  };

  const handleUpdateStatus = async (assignmentId, newStatus, notes) => {
    try {
      await api.put(`/api/delivery/status/${assignmentId}`, { deliveryStatus: newStatus, notes: notes || undefined });
      showToast(`Status updated to ${newStatus}`);
      fetchDeliveries();
      if (viewModal.isOpen) {
        setViewModal({ ...viewModal, data: { ...viewModal.data, deliveryStatus: newStatus } });
      }
    } catch (e) {
      showToast("Failed to update status", "error");
    }
  };

  const handleSetAvailability = async () => {
    try {
      await api.post("/api/delivery/boys/my-availability", availForm);
      showToast(`Availability set to ${availForm.status} for ${availForm.date}`);
      setAvailModal({ isOpen: false });
      // If setting today's date, update display immediately
      const todayDate = new Date().toISOString().split('T')[0];
      if (availForm.date === todayDate) setTodayStatus(availForm.status);
      fetchMyProfile();
    } catch (e) {
      showToast("Failed to update availability", "error");
    }
  };

  if (loading) return <div style={{ padding: "24px" }}>Loading deliveries...</div>;

  const fmt = (d) => d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "N/A";

  return (
    <div style={{ padding: "24px" }}>
      {toast.text && (
        <div style={{ position: "fixed", top: "20px", right: "20px", background: toast.type === "error" ? "#ef4444" : "#10b981", color: "white", padding: "12px 24px", borderRadius: "8px", zIndex: 9999, fontWeight: "bold", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
          {toast.text}
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2 style={{ fontSize: "24px", fontWeight: "bold", color: "#1e293b", margin: 0 }}>My Deliveries</h2>
          <p style={{ color: "#64748b", margin: "4px 0 0 0", fontSize: "14px" }}>
            Today's availability:{" "}
            <strong style={{ color: todayStatus === "Available" ? "#16a34a" : todayStatus === "On Leave" ? "#b45309" : "#dc2626" }}>
              {todayStatus === "On Leave" ? "🟡 On Leave" : todayStatus === "Unavailable" ? "🔴 Unavailable" : "🟢 Available"}
            </strong>
          </p>
        </div>
        <button
          onClick={() => setAvailModal({ isOpen: true })}
          style={{ padding: "10px 20px", background: "#2e6f40", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", fontSize: "14px" }}
        >
          📅 Set My Availability
        </button>
      </div>

      {/* Cards Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
        {deliveries.length === 0 ? (
          <div style={{ gridColumn: "1/-1", padding: "40px", textAlign: "center", background: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0", color: "#64748b" }}>
            <div style={{ fontSize: "48px", marginBottom: "12px" }}>🚚</div>
            <div style={{ fontSize: "16px", fontWeight: "600" }}>No deliveries assigned yet.</div>
          </div>
        ) : deliveries.map((d) => {
          const sc = statusColors[d.deliveryStatus] || statusColors.Assigned;
          return (
            <div key={d.id} style={{ border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px", background: "white", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", transition: "transform 0.15s", cursor: "default" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                <span style={{ fontWeight: "700", color: "#1e293b", fontSize: "15px" }}>
                  #{d.orderId} <span style={{ fontSize: "11px", fontWeight: "500", color: "#64748b" }}>({d.orderType === "trial" ? "Trial" : "Subscription"})</span>
                </span>
                <span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "600", background: sc.bg, color: sc.color, display: "flex", alignItems: "center", gap: "5px" }}>
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: sc.dot, display: "inline-block" }} />
                  {d.deliveryStatus}
                </span>
              </div>
              <div style={{ fontSize: "14px", color: "#334155", marginBottom: "6px", fontWeight: "600" }}>👤 {d.order?.customerName || "N/A"}</div>
              <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "4px" }}>📍 {d.order?.pincode ? `${d.order.pincode} - ` : ""}{d.order?.address || "N/A"}</div>
              <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "4px" }}>📦 {d.order?.milkType}: <strong>{d.order?.dailyQuantity} L</strong></div>
              <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "16px" }}>
                📅 {d.orderType === "trial"
                  ? fmt(d.order?.startDate)
                  : fmt(d.order?.finalStartDate || d.order?.requestedStartDate)}
              </div>
              <button
                onClick={() => setViewModal({ isOpen: true, data: d })}
                style={{ width: "100%", padding: "10px", background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "8px", cursor: "pointer", fontWeight: "600", color: "#334155", fontSize: "14px", transition: "background 0.2s" }}
              >
                View Details
              </button>
            </div>
          );
        })}
      </div>

      {/* View Details Modal */}
      {viewModal.isOpen && viewModal.data && (() => {
        const d = viewModal.data;
        const order = d.order;
        const currentIdx = STATUS_FLOW.indexOf(d.deliveryStatus);
        const canAdvance = currentIdx >= 0 && currentIdx < STATUS_FLOW.length - 1;
        const nextStatus = canAdvance ? STATUS_FLOW[currentIdx + 1] : null;
        return (
          <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, padding: "20px" }}>
            <div style={{ background: "white", borderRadius: "16px", width: "100%", maxWidth: "440px", overflow: "hidden", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>
              <div style={{ background: "#f8fafc", padding: "20px 24px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0, color: "#1e293b", fontSize: "18px", fontWeight: "700" }}>Delivery #{d.orderId}</h3>
                <button onClick={() => setViewModal({ isOpen: false, data: null })} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "22px", color: "#64748b" }}>✕</button>
              </div>
              <div style={{ padding: "24px", overflowY: "auto", maxHeight: "calc(90vh - 160px)" }}>
                {/* Customer Info */}
                <div style={{ marginBottom: "20px" }}>
                  <h4 style={{ margin: "0 0 12px 0", color: "#64748b", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Customer Info</h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "14px" }}>
                    <div><strong>Name:</strong> {order?.customerName}</div>
                    <div><strong>Phone:</strong> {order?.phone}</div>
                    <div><strong>Address:</strong> {order?.address}</div>
                    <div><strong>Pincode:</strong> {order?.pincode || "N/A"}</div>
                  </div>
                </div>
                <hr style={{ border: "none", borderTop: "1px solid #f1f5f9", margin: "0 0 20px 0" }} />
                {/* Milk Info */}
                <div style={{ marginBottom: "20px" }}>
                  <h4 style={{ margin: "0 0 12px 0", color: "#64748b", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Order Info</h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "14px" }}>
                    <div><strong>Milk Type:</strong> {order?.milkType}</div>
                    <div><strong>Quantity:</strong> {order?.dailyQuantity} L/day</div>
                    <div><strong>Period:</strong> {d.orderType === "trial"
                      ? `${fmt(order?.startDate)} → ${fmt(order?.endDate)}`
                      : `${fmt(order?.finalStartDate || order?.requestedStartDate)} → ${fmt(order?.finalEndDate || order?.requestedEndDate)}`}
                    </div>
                  </div>
                </div>
                <hr style={{ border: "none", borderTop: "1px solid #f1f5f9", margin: "0 0 20px 0" }} />
                {/* Status Tracker */}
                <div style={{ marginBottom: "20px" }}>
                  <h4 style={{ margin: "0 0 12px 0", color: "#64748b", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Status</h4>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {STATUS_FLOW.map((s, i) => {
                      const isDone = i <= currentIdx;
                      const isCurrent = s === d.deliveryStatus;
                      return (
                        <div key={s} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <div style={{ width: "24px", height: "24px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "700",
                            background: isCurrent ? "#2e6f40" : isDone ? "#dcfce7" : "#f1f5f9",
                            color: isCurrent ? "white" : isDone ? "#16a34a" : "#94a3b8", border: isCurrent ? "none" : "1px solid #e2e8f0" }}>{isDone ? "✓" : i + 1}</div>
                          <span style={{ fontSize: "12px", color: isCurrent ? "#1e293b" : isDone ? "#16a34a" : "#94a3b8", fontWeight: isCurrent ? "700" : "400" }}>{s}</span>
                          {i < STATUS_FLOW.length - 1 && <span style={{ color: "#cbd5e1" }}>→</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
                {/* Action Buttons */}
                {d.deliveryStatus !== "Delivered" && d.deliveryStatus !== "Rejected" && (
                  <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                    {nextStatus && (
                      <button
                        onClick={() => { handleUpdateStatus(d.id, nextStatus); setViewModal({ ...viewModal, data: { ...d, deliveryStatus: nextStatus } }); }}
                        style={{ flex: 1, padding: "12px", background: "#2e6f40", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "700", fontSize: "14px" }}
                      >
                        {nextStatus === "Accepted" ? "✓ Accept" : nextStatus === "Out for Delivery" ? "🚚 Start Delivery" : "✅ Mark Delivered"}
                      </button>
                    )}
                    <button
                      onClick={() => { setViewModal({ isOpen: false, data: null }); setRejectModal({ isOpen: true, assignmentId: d.id, notes: "" }); }}
                      style={{ padding: "12px 16px", background: "#fee2e2", color: "#b91c1c", border: "1px solid #fca5a5", borderRadius: "8px", cursor: "pointer", fontWeight: "600", fontSize: "14px" }}
                    >
                      ✕ Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Reject Modal */}
      {rejectModal.isOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2100, padding: "20px" }}>
          <div style={{ background: "white", borderRadius: "12px", width: "100%", maxWidth: "360px", padding: "24px" }}>
            <h3 style={{ margin: "0 0 12px 0", color: "#1e293b" }}>Reject Assignment</h3>
            <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "16px" }}>Please provide a reason (optional). Admin will be notified.</p>
            <textarea
              value={rejectModal.notes}
              onChange={e => setRejectModal({ ...rejectModal, notes: e.target.value })}
              placeholder="Reason for rejection..."
              style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "14px", minHeight: "80px", resize: "vertical", boxSizing: "border-box" }}
            />
            <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
              <button onClick={() => setRejectModal({ isOpen: false, assignmentId: null, notes: "" })} style={{ flex: 1, padding: "10px", background: "white", border: "1px solid #cbd5e1", borderRadius: "8px", cursor: "pointer", fontWeight: "600" }}>Cancel</button>
              <button onClick={() => { handleUpdateStatus(rejectModal.assignmentId, "Rejected", rejectModal.notes); setRejectModal({ isOpen: false, assignmentId: null, notes: "" }); }}
                style={{ flex: 1, padding: "10px", background: "#ef4444", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "700" }}>Confirm Reject</button>
            </div>
          </div>
        </div>
      )}

      {/* Availability Modal */}
      {availModal.isOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2100, padding: "20px" }}>
          <div style={{ background: "white", borderRadius: "12px", width: "100%", maxWidth: "380px", padding: "24px" }}>
            <h3 style={{ margin: "0 0 16px 0", color: "#1e293b" }}>📅 Set My Availability</h3>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontWeight: "600", color: "#475569", fontSize: "13px", marginBottom: "6px" }}>Date</label>
              <input type="date" value={availForm.date} onChange={e => setAvailForm({ ...availForm, date: e.target.value })}
                style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #cbd5e1", boxSizing: "border-box" }} />
            </div>
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontWeight: "600", color: "#475569", fontSize: "13px", marginBottom: "6px" }}>Status</label>
              <div style={{ display: "flex", gap: "8px" }}>
                {["Available", "On Leave", "Unavailable"].map(s => (
                  <button key={s} onClick={() => setAvailForm({ ...availForm, status: s })}
                    style={{ flex: 1, padding: "10px 6px", border: "1px solid", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: "600", transition: "all 0.15s",
                      borderColor: availForm.status === s ? (s === "Available" ? "#16a34a" : s === "On Leave" ? "#d97706" : "#dc2626") : "#cbd5e1",
                      background: availForm.status === s ? (s === "Available" ? "#dcfce7" : s === "On Leave" ? "#fef3c7" : "#fee2e2") : "white",
                      color: availForm.status === s ? (s === "Available" ? "#16a34a" : s === "On Leave" ? "#d97706" : "#dc2626") : "#64748b" }}>{s}</button>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={() => setAvailModal({ isOpen: false })} style={{ flex: 1, padding: "10px", background: "white", border: "1px solid #cbd5e1", borderRadius: "8px", cursor: "pointer", fontWeight: "600" }}>Cancel</button>
              <button onClick={handleSetAvailability} style={{ flex: 1, padding: "10px", background: "#2e6f40", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "700" }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyDeliveries;
