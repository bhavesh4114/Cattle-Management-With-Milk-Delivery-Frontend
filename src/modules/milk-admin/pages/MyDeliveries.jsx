import React, { useState, useEffect } from "react";
import api from "../../../services/api";

const statusColors = {
  Assigned: { bg: "#dbeafe", color: "#1d4ed8", dot: "#3b82f6" },
  Accepted: { bg: "#e0e7ff", color: "#4338ca", dot: "#6366f1" },
  "Out for Delivery": { bg: "#fef3c7", color: "#b45309", dot: "#f59e0b" },
  QR_SCANNED: { bg: "#ccfbf1", color: "#0f766e", dot: "#14b8a6" },
  AWAITING_USER_CONFIRMATION: { bg: "#ede9fe", color: "#6d28d9", dot: "#8b5cf6" },
  PARTIALLY_DELIVERED: { bg: "#ffedd5", color: "#c2410c", dot: "#f97316" },
  Delivered: { bg: "#dcfce7", color: "#15803d", dot: "#22c55e" },
  Rejected: { bg: "#fee2e2", color: "#b91c1c", dot: "#ef4444" },
};

const STATUS_FLOW = ["Assigned", "Accepted", "Out for Delivery", "QR_SCANNED", "AWAITING_USER_CONFIRMATION", "Delivered"];

const MyDeliveries = () => {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewModal, setViewModal] = useState({ isOpen: false, data: null });
  const [toast, setToast] = useState({ text: "", type: "" });
  const [rejectModal, setRejectModal] = useState({ isOpen: false, assignmentIds: [], notes: "" });
  const [profile, setProfile] = useState(null);
  const [todayStatus, setTodayStatus] = useState('Available');
  const [availModal, setAvailModal] = useState({ isOpen: false });
  const [availForm, setAvailForm] = useState({ date: new Date().toISOString().split("T")[0], status: "Available" });
  const [qrModal, setQrModal] = useState({ isOpen: false, token: "", loading: false, error: "" });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, customer: null, orders: [], selected: {}, loading: false });

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

  const handleUpdateStatus = async (assignmentIds, newStatus, notes) => {
    try {
      await Promise.all(assignmentIds.map(id => 
        api.put(`/api/delivery/status/${id}`, { deliveryStatus: newStatus, notes: notes || undefined })
      ));
      showToast(`Status updated to ${newStatus}`);
      fetchDeliveries();
      if (viewModal.isOpen) {
        setViewModal({ ...viewModal, data: { ...viewModal.data, deliveryStatus: newStatus } });
      }
    } catch (e) {
      showToast("Failed to update status", "error");
    }
  };

  const handleScanQr = async () => {
    try {
      setQrModal(prev => ({ ...prev, loading: true, error: "" }));
      const res = await api.post('/api/delivery/scan-qr', { qrToken: qrModal.token.trim() });
      const selected = {};
      res.data.orders.forEach(order => { selected[order.assignmentId] = true; });
      setQrModal({ isOpen: false, token: "", loading: false, error: "" });
      setConfirmModal({ isOpen: true, customer: res.data.customer, orders: res.data.orders, selected, loading: false });
      fetchDeliveries();
    } catch (e) {
      setQrModal(prev => ({ ...prev, loading: false, error: e.response?.data?.message || 'Unable to scan QR.' }));
    }
  };

  const handleCameraScan = async () => {
    if (!('BarcodeDetector' in window)) {
      showToast('Camera QR scan is not supported in this browser. Paste the QR token instead.', 'error');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();
      const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
      let found = "";
      for (let i = 0; i < 30 && !found; i++) {
        const codes = await detector.detect(video);
        found = codes[0]?.rawValue || "";
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      stream.getTracks().forEach(track => track.stop());
      if (found) setQrModal(prev => ({ ...prev, token: found }));
      else showToast('QR not detected. Try again or paste the token.', 'error');
    } catch (e) {
      showToast('Camera permission failed. Paste the QR token instead.', 'error');
    }
  };

  const handleRequestConfirmation = async () => {
    const selectedOrders = confirmModal.orders.filter(order => confirmModal.selected[order.assignmentId]);
    if (selectedOrders.length === 0) return showToast('Select at least one delivered item.', 'error');
    setConfirmModal(prev => ({ ...prev, loading: true }));
    try {
      await Promise.all(selectedOrders.map(order =>
        api.post(`/api/delivery/${order.orderId}/request-confirmation`, {
          orderType: order.orderType,
          itemIds: [order.assignmentId]
        })
      ));
      showToast('Customer confirmation requested.');
      setConfirmModal({ isOpen: false, customer: null, orders: [], selected: {}, loading: false });
      fetchDeliveries();
    } catch (e) {
      showToast(e.response?.data?.message || 'Failed to request confirmation.', 'error');
      setConfirmModal(prev => ({ ...prev, loading: false }));
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
        ) : Object.values(deliveries.reduce((acc, d) => {
            const customerName = d.order?.customerName || "N/A";
            const address = d.order?.address || "N/A";
            const status = d.deliveryStatus;
            const key = `${customerName}_${address}_${status}`;
            if (!acc[key]) {
                acc[key] = { ...d, items: [], ids: [], orderIds: [] };
            }
            acc[key].items.push(d.order);
            acc[key].ids.push(d.id);
            acc[key].orderIds.push(d.orderId);
            return acc;
        }, {})).map((group) => {
          const sc = statusColors[group.deliveryStatus] || statusColors.Assigned;
          return (
            <div key={group.ids.join('_')} style={{ border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px", background: "white", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", transition: "transform 0.15s", cursor: "default" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                <span style={{ fontWeight: "700", color: "#1e293b", fontSize: "15px" }}>
                  #{group.orderIds.join(', #')} <span style={{ fontSize: "11px", fontWeight: "500", color: "#64748b" }}>({group.orderType === "trial" ? "Single Day" : "Subscription"})</span>
                </span>
                <span style={{ padding: "3px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "600", background: sc.bg, color: sc.color, display: "flex", alignItems: "center", gap: "5px" }}>
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: sc.dot, display: "inline-block" }} />
                  {group.deliveryStatus}
                </span>
              </div>
              <div style={{ fontSize: "14px", color: "#334155", marginBottom: "6px", fontWeight: "600" }}>👤 {group.order?.customerName || "N/A"}</div>
              <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "8px" }}>📍 {group.order?.pincode ? `${group.order.pincode} - ` : ""}{group.order?.address || "N/A"}</div>
              
              <div style={{ background: "#f8fafc", padding: "8px", borderRadius: "8px", marginBottom: "12px" }}>
                {group.items.map((item, idx) => (
                    <div key={idx} style={{ fontSize: "13px", color: "#334155", marginBottom: "4px" }}>
                        📦 {item?.milkType}: <strong>{item?.dailyQuantity} {item?.product?.unit || (item?.milkType?.toLowerCase().includes('milk') ? 'L' : 'Qty')}</strong>
                    </div>
                ))}
              </div>

              <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "16px" }}>
                📅 {group.orderType === "trial"
                  ? fmt(group.order?.startDate)
                  : fmt(group.order?.finalStartDate || group.order?.requestedStartDate)}
              </div>
              <button
                onClick={() => setViewModal({ isOpen: true, data: group })}
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
                <h3 style={{ margin: 0, color: "#1e293b", fontSize: "18px", fontWeight: "700" }}>Delivery #{d.orderIds.join(', #')}</h3>
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
                    {d.items.map((item, idx) => (
                        <div key={idx} style={{ padding: "8px", background: "#f8fafc", borderRadius: "8px" }}>
                            <div style={{ fontWeight: "600", color: "#3b82f6" }}>{item?.milkType}</div>
                            <div style={{ color: "#475569" }}>Quantity: {item?.dailyQuantity} {item?.product?.unit || (item?.milkType?.toLowerCase().includes('milk') ? 'L' : 'Qty')}</div>
                        </div>
                    ))}
                    <div style={{ marginTop: "8px" }}><strong>Period:</strong> {d.orderType === "trial"
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
                        onClick={() => {
                          if (nextStatus === "QR_SCANNED" || nextStatus === "AWAITING_USER_CONFIRMATION") {
                            setViewModal({ isOpen: false, data: null });
                            setQrModal({ isOpen: true, token: "", loading: false, error: "" });
                          } else if (nextStatus === "Delivered") {
                            showToast("Waiting for customer confirmation.", "error");
                          } else {
                            handleUpdateStatus(d.ids, nextStatus); 
                          }
                        }}
                        style={{ flex: 1, padding: "12px", background: "#2e6f40", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "700", fontSize: "14px" }}
                      >
                        {nextStatus === "Accepted" ? "✓ Accept" : nextStatus === "Out for Delivery" ? "🚚 Start Delivery" : nextStatus === "QR_SCANNED" ? "▣ Scan Door QR" : nextStatus === "AWAITING_USER_CONFIRMATION" ? "☑ Select Delivered Items" : "Awaiting Customer"}
                      </button>
                    )}
                    <button
                      onClick={() => { setViewModal({ isOpen: false, data: null }); setRejectModal({ isOpen: true, assignmentIds: d.ids, notes: "" }); }}
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
              <button onClick={() => setRejectModal({ isOpen: false, assignmentIds: [], notes: "" })} style={{ flex: 1, padding: "10px", background: "white", border: "1px solid #cbd5e1", borderRadius: "8px", cursor: "pointer", fontWeight: "600" }}>Cancel</button>
              <button onClick={() => { handleUpdateStatus(rejectModal.assignmentIds, "Rejected", rejectModal.notes); setRejectModal({ isOpen: false, assignmentIds: [], notes: "" }); }}
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

      {/* Door QR Scan Modal */}
      {qrModal.isOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2200, padding: "20px" }}>
          <div style={{ background: "white", borderRadius: "16px", width: "100%", maxWidth: "380px", overflow: "hidden", boxShadow: "0 20px 40px rgba(0,0,0,0.25)" }}>
            <div style={{ background: "linear-gradient(135deg, #0f766e, #14b8a6)", padding: "20px 24px", color: "white", textAlign: "center" }}>
              <div style={{ fontSize: "36px", marginBottom: "8px" }}>▣</div>
              <h3 style={{ margin: 0, fontWeight: "800", fontSize: "18px" }}>Scan Door QR</h3>
              <p style={{ margin: "4px 0 0", fontSize: "13px", opacity: 0.9 }}>Scan or paste the customer's permanent QR token</p>
            </div>
            <div style={{ padding: "24px", textAlign: "center" }}>
              <button onClick={handleCameraScan} style={{ width: "100%", padding: "12px", background: "#ecfeff", color: "#0f766e", border: "1px solid #99f6e4", borderRadius: "10px", fontWeight: "800", cursor: "pointer", marginBottom: "14px" }}>
                Open Camera Scanner
              </button>
              <input
                type="text" 
                value={qrModal.token}
                onChange={e => setQrModal({ ...qrModal, token: e.target.value, error: "" })}
                placeholder="Paste QR token"
                style={{ width: "100%", boxSizing: "border-box", padding: "12px", fontSize: "14px", color: "#1e293b", border: "1px solid #cbd5e1", borderRadius: "10px", outline: "none", background: "#f8fafc" }}
              />
              {qrModal.error && <div style={{ marginTop: "10px", color: "#dc2626", fontSize: "13px", fontWeight: "600" }}>{qrModal.error}</div>}
              <div style={{ display: "flex", gap: "12px", marginTop: "32px" }}>
                <button onClick={() => setQrModal({ isOpen: false, token: "", loading: false, error: "" })} style={{ flex: 1, padding: "14px", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: "10px", fontWeight: "700", cursor: "pointer" }}>Cancel</button>
                <button onClick={handleScanQr} disabled={!qrModal.token.trim() || qrModal.loading} style={{ flex: 1, padding: "14px", background: qrModal.token.trim() ? "#10b981" : "#94a3b8", color: "white", border: "none", borderRadius: "10px", fontWeight: "800", cursor: qrModal.token.trim() ? "pointer" : "not-allowed", transition: "all 0.2s" }}>
                  {qrModal.loading ? 'Checking...' : 'Validate QR'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delivered Items Selection Modal */}
      {confirmModal.isOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2300, padding: "20px" }}>
          <div style={{ background: "white", borderRadius: "16px", width: "100%", maxWidth: "460px", overflow: "hidden", boxShadow: "0 20px 40px rgba(0,0,0,0.25)" }}>
            <div style={{ background: "#f8fafc", padding: "20px 24px", borderBottom: "1px solid #e2e8f0" }}>
              <h3 style={{ margin: 0, color: "#1e293b" }}>Select Delivered Items</h3>
              <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: "14px" }}>Customer: <strong>{confirmModal.customer?.name}</strong></p>
            </div>
            <div style={{ padding: "24px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
                {confirmModal.orders.map(order => (
                  <label key={order.assignmentId} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px", border: "1px solid #e2e8f0", borderRadius: "10px", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={!!confirmModal.selected[order.assignmentId]}
                      onChange={e => setConfirmModal(prev => ({ ...prev, selected: { ...prev.selected, [order.assignmentId]: e.target.checked } }))}
                      style={{ width: "18px", height: "18px" }}
                    />
                    <span style={{ flex: 1 }}>
                      <strong>{order.item.label}</strong>
                      <span style={{ display: "block", color: "#64748b", fontSize: "13px" }}>{order.item.quantity} {order.item.unit} · Order #{order.orderId}</span>
                    </span>
                  </label>
                ))}
              </div>
              <div style={{ display: "flex", gap: "12px" }}>
                <button onClick={() => setConfirmModal({ isOpen: false, customer: null, orders: [], selected: {}, loading: false })} style={{ flex: 1, padding: "12px", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: "10px", fontWeight: "700", cursor: "pointer" }}>Cancel</button>
                <button onClick={handleRequestConfirmation} disabled={confirmModal.loading} style={{ flex: 1, padding: "12px", background: "#2e6f40", color: "white", border: "none", borderRadius: "10px", fontWeight: "800", cursor: confirmModal.loading ? "not-allowed" : "pointer" }}>
                  {confirmModal.loading ? "Sending..." : "Request User Confirmation"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyDeliveries;
