import React, { useState, useEffect } from "react";
import api from "../../../services/api";

const statusColors = {
  Assigned: { bg: "#dbeafe", color: "#1d4ed8", dot: "#3b82f6" },
  ASSIGNED: { bg: "#dbeafe", color: "#1d4ed8", dot: "#3b82f6" },
  PRODUCT_COLLECTED: { bg: "#fef9c3", color: "#854d0e", dot: "#eab308" },
  OUT_FOR_DELIVERY: { bg: "#fef3c7", color: "#b45309", dot: "#f59e0b" },
  "Out for Delivery": { bg: "#fef3c7", color: "#b45309", dot: "#f59e0b" },
  ARRIVED: { bg: "#ede9fe", color: "#6d28d9", dot: "#8b5cf6" },
  DELIVERY_PENDING_CUSTOMER_CONFIRMATION: { bg: "#cffafe", color: "#0e7490", dot: "#06b6d4" },
  AWAITING_USER_CONFIRMATION: { bg: "#cffafe", color: "#0e7490", dot: "#06b6d4" },
  Delivered: { bg: "#dcfce7", color: "#15803d", dot: "#22c55e" },
  DELIVERED: { bg: "#dcfce7", color: "#15803d", dot: "#22c55e" },
  Rejected: { bg: "#fee2e2", color: "#b91c1c", dot: "#ef4444" },
};

const STATUS_FLOW = [
  "ASSIGNED",
  "PRODUCT_COLLECTED",
  "OUT_FOR_DELIVERY",
  "ARRIVED",
  "DELIVERY_PENDING_CUSTOMER_CONFIRMATION",
  "DELIVERED"
];

const MyDeliveries = () => {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewModal, setViewModal] = useState({ isOpen: false, data: null });
  const [toast, setToast] = useState({ text: "", type: "" });
  const [alerts, setAlerts] = useState([]);
  const [profile, setProfile] = useState(null);
  const [todayStatus, setTodayStatus] = useState("Available");
  const [availModal, setAvailModal] = useState({ isOpen: false });
  const [availForm, setAvailForm] = useState({
    date: new Date().toISOString().split("T")[0],
    status: "Available",
  });
  const [qrModal, setQrModal] = useState({ isOpen: false, token: "", loading: false, error: "" });
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    customer: null,
    orders: [],
    selected: {},
    loading: false,
  });
  const [tabFilter, setTabFilter] = useState("ALL"); // "ALL", "ACTIVE", "COMPLETED"

  const showToast = (text, type = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast({ text: "", type: "" }), 4000);
  };

  useEffect(() => {
    fetchDeliveries(true);
    fetchMyProfile();
    fetchAlerts();
    const interval = setInterval(() => {
      fetchDeliveries(false);
      fetchMyProfile();
      fetchAlerts();
    }, 4000);

    const handleDeliveryUpdate = () => {
      fetchDeliveries(false);
      fetchAlerts();
    };
    window.addEventListener("delivery-status-updated", handleDeliveryUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener("delivery-status-updated", handleDeliveryUpdate);
    };
  }, []);

  const fetchAlerts = async () => {
    try {
      const res = await api.get("/alerts/my-alerts");
      setAlerts(res.data);
    } catch (e) { }
  };

  const handleDismissAlert = async (alertId) => {
    try {
      await api.patch(`/alerts/${alertId}/read`);
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    } catch (e) {
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    }
  };

  const fetchDeliveries = async (showSpinner = false) => {
    try {
      if (showSpinner) setLoading(true);
      const res = await api.get("/delivery/my-deliveries");
      setDeliveries(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  const fetchMyProfile = async () => {
    try {
      const res = await api.get("/delivery/boys/my-profile");
      const prof = res.data.profile;
      setProfile(prof);
      // Fetch today's actual availability
      const today = new Date().toISOString().split("T")[0];
      try {
        const availRes = await api.get(
          `/delivery/boys/my-availability?from=${today}T00:00:00.000Z&to=${today}T23:59:59.999Z`
        );
        const todayRecord = availRes.data?.[0];
        setTodayStatus(todayRecord?.status || prof?.dailyStatus || "Available");
      } catch {
        setTodayStatus(prof?.dailyStatus || "Available");
      }
    } catch (e) { }
  };

  const handleUpdateStatus = async (assignmentIds, newStatus, notes) => {
    try {
      let coords = {};
      if (navigator.geolocation) {
        try {
          const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { timeout: 2500 }));
          if (pos && pos.coords) {
            coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
          }
        } catch (e) { }
      }
      await Promise.all(
        assignmentIds.map((id) =>
          api.put(`/delivery/status/${id}`, { deliveryStatus: newStatus, notes: notes || undefined, ...coords })
        )
      );
      showToast(`Status updated to ${newStatus}`);
      fetchDeliveries();
      if (viewModal.isOpen) {
        setViewModal({ ...viewModal, data: { ...viewModal.data, deliveryStatus: newStatus } });
      }
    } catch (e) {
      showToast(e.response?.data?.message || "Failed to update status", "error");
    }
  };

  const handleScanQr = async (tokenOverride) => {
    try {
      setQrModal((prev) => ({ ...prev, loading: true, error: "" }));
      const token = (tokenOverride || qrModal.token).trim();
      const res = await api.post("/delivery/scan-qr", { qrToken: token });
      const selected = {};
      res.data.orders.forEach((order) => {
        selected[order.assignmentId] = true;
      });
      setQrModal({ isOpen: false, token: "", loading: false, error: "" });
      setConfirmModal({
        isOpen: true,
        customer: res.data.customer,
        orders: res.data.orders,
        selected,
        loading: false,
      });
      fetchDeliveries();
    } catch (e) {
      setQrModal((prev) => ({
        ...prev,
        loading: false,
        error: e.response?.data?.message || "Unable to scan QR.",
      }));
    }
  };

  const handleCameraScan = async () => {
    if (!("BarcodeDetector" in window)) {
      showToast("Camera QR scan is not supported in this browser. Paste the QR token instead.", "error");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      const video = document.createElement("video");
      video.srcObject = stream;
      await video.play();
      const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
      let found = "";
      for (let i = 0; i < 30 && !found; i++) {
        const codes = await detector.detect(video);
        found = codes[0]?.rawValue || "";
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
      stream.getTracks().forEach((track) => track.stop());
      if (found) {
        setQrModal((prev) => ({ ...prev, token: found }));
        handleScanQr(found);
      } else {
        showToast("QR not detected. Try again or paste the token.", "error");
      }
    } catch (e) {
      showToast("Camera permission failed. Paste the QR token instead.", "error");
    }
  };

  const handleRequestConfirmation = async () => {
    const selectedOrders = confirmModal.orders.filter((order) => confirmModal.selected[order.assignmentId]);
    if (selectedOrders.length === 0) return showToast("Select at least one delivered item.", "error");
    setConfirmModal((prev) => ({ ...prev, loading: true }));
    try {
      await Promise.all(
        selectedOrders.map((order) =>
          api.post(`/delivery/${order.orderId}/request-confirmation`, {
            orderType: order.orderType,
            itemIds: [order.assignmentId],
          })
        )
      );
      showToast("Customer confirmation requested.");
      setConfirmModal({ isOpen: false, customer: null, orders: [], selected: {}, loading: false });
      fetchDeliveries();
    } catch (e) {
      showToast(e.response?.data?.message || "Failed to request confirmation.", "error");
      setConfirmModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleSetAvailability = async () => {
    try {
      await api.post("/delivery/boys/my-availability", availForm);
      showToast(`Availability set to ${availForm.status} for ${availForm.date}`);
      setAvailModal({ isOpen: false });
      // If setting today's date, update display immediately
      const todayDate = new Date().toISOString().split("T")[0];
      if (availForm.date === todayDate) setTodayStatus(availForm.status);
      fetchMyProfile();
    } catch (e) {
      showToast("Failed to update availability", "error");
    }
  };

  if (loading) return <div style={{ padding: "24px" }}>Loading deliveries...</div>;

  const fmt = (d) =>
    d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "N/A";

  const activeCount = deliveries.filter(
    (d) => !['Delivered', 'DELIVERED', 'Rejected', 'REJECTED'].includes(d.deliveryStatus)
  ).length;
  const completedCount = deliveries.filter((d) => ['Delivered', 'DELIVERED'].includes(d.deliveryStatus)).length;

  const filteredDeliveries = deliveries.filter((d) => {
    const isDone = ['Delivered', 'DELIVERED'].includes(d.deliveryStatus);
    const isRej = ['Rejected', 'REJECTED'].includes(d.deliveryStatus);
    if (tabFilter === "ACTIVE") return !isDone && !isRej;
    if (tabFilter === "COMPLETED") return isDone;
    return true;
  });

  return (
    <div style={{ padding: "24px" }}>
      {toast.text && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            background: toast.type === "error" ? "#ef4444" : "#10b981",
            color: "white",
            padding: "12px 24px",
            borderRadius: "8px",
            zIndex: 9999,
            fontWeight: "bold",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          }}
        >
          {toast.text}
        </div>
      )}

      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <h2 style={{ fontSize: "24px", fontWeight: "bold", color: "#1e293b", margin: 0 }}>My Deliveries</h2>
          <p style={{ color: "#64748b", margin: "4px 0 0 0", fontSize: "14px" }}>
            Today's availability:{" "}
            <strong
              style={{
                color:
                  todayStatus === "Available"
                    ? "#16a34a"
                    : todayStatus === "On Leave"
                      ? "#b45309"
                      : "#dc2626",
              }}
            >
              {todayStatus === "On Leave"
                ? "🟡 On Leave"
                : todayStatus === "Unavailable"
                  ? "🔴 Unavailable"
                  : "🟢 Available"}
            </strong>
          </p>
        </div>
      </div>

      {/* Informational Assignment Alerts */}
      {alerts.length > 0 && (
        <div style={{ marginBottom: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
          {alerts.map((a) => (
            <div
              key={a.id}
              style={{
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: "12px",
                padding: "16px 20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "16px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontSize: "24px" }}>🔔</span>
                <div>
                  <div style={{ fontWeight: "700", color: "#166534", fontSize: "14.5px" }}>
                    New Deliveries Assigned
                  </div>
                  <div style={{ color: "#15803d", fontSize: "13.5px", marginTop: "2px" }}>{a.message}</div>
                </div>
              </div>
              <button
                onClick={() => handleDismissAlert(a.id)}
                style={{
                  background: "white",
                  border: "1px solid #86efac",
                  color: "#166534",
                  padding: "6px 14px",
                  borderRadius: "8px",
                  fontSize: "12.5px",
                  fontWeight: "600",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                Dismiss
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Delivery Filter Tabs */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          marginBottom: "20px",
          flexWrap: "wrap",
          borderBottom: "1px solid #e2e8f0",
          paddingBottom: "14px",
        }}
      >
        {[
          { id: "ALL", label: `📋 All Deliveries (${deliveries.length})` },
          { id: "ACTIVE", label: `🛵 Active Deliveries (${activeCount})` },
          { id: "COMPLETED", label: `✅ Completed History (${completedCount})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setTabFilter(tab.id)}
            style={{
              padding: "9px 18px",
              borderRadius: "8px",
              border: "none",
              fontSize: "13.5px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s",
              background: tabFilter === tab.id ? "#1e3a8a" : "#f1f5f9",
              color: tabFilter === tab.id ? "white" : "#475569",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Cards Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
        {filteredDeliveries.length === 0 ? (
          <div
            style={{
              gridColumn: "1/-1",
              padding: "48px 20px",
              textAlign: "center",
              background: "#f8fafc",
              borderRadius: "14px",
              border: "1px solid #e2e8f0",
              color: "#64748b",
            }}
          >
            <div style={{ fontSize: "48px", marginBottom: "12px" }}>
              {tabFilter === "COMPLETED" ? "📦" : "🚚"}
            </div>
            <div style={{ fontSize: "16px", fontWeight: "700", color: "#334155" }}>
              {tabFilter === "COMPLETED"
                ? "No completed deliveries in history yet."
                : tabFilter === "ACTIVE"
                  ? "No active deliveries right now."
                  : "No deliveries found."}
            </div>
            <div style={{ fontSize: "13.5px", marginTop: "4px" }}>
              {tabFilter === "COMPLETED"
                ? "Once deliveries are completed and confirmed, they will appear here."
                : "Deliveries assigned by Admin will show here."}
            </div>
          </div>
        ) : (
          Object.values(
            filteredDeliveries.reduce((acc, d) => {
              const status = d.deliveryStatus;
              const key = `${d.id}_${status}`;
              if (!acc[key]) {
                acc[key] = { ...d, items: [], ids: [], orderIds: [] };
              }
              acc[key].items.push(d.order);
              acc[key].ids.push(d.id);
              acc[key].orderIds.push(d.orderId);
              return acc;
            }, {})
          ).map((group) => {
            const sc = statusColors[group.deliveryStatus] || statusColors.Assigned;
            const isDelivered = ['Delivered', 'DELIVERED'].includes(group.deliveryStatus);

            return (
              <div
                key={group.ids.join("_")}
                style={{
                  border: isDelivered ? "1px solid #bbf7d0" : "1px solid #e2e8f0",
                  borderRadius: "14px",
                  padding: "18px",
                  background: isDelivered ? "#fdfefe" : "white",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                  transition: "transform 0.15s",
                  cursor: "default",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "12px",
                  }}
                >
                  <span style={{ fontWeight: "700", color: "#1e293b", fontSize: "15px" }}>
                    #{group.orderIds.join(", #")}{" "}
                    <span style={{ fontSize: "11px", fontWeight: "500", color: "#64748b" }}>
                      ({group.orderType === "trial" ? "Single Day" : "Subscription"})
                    </span>
                  </span>
                  <span
                    style={{
                      padding: "4px 10px",
                      borderRadius: "20px",
                      fontSize: "12px",
                      fontWeight: "700",
                      background: sc.bg,
                      color: sc.color,
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
                  >
                    <span
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        background: sc.dot,
                        display: "inline-block",
                      }}
                    />
                    {group.deliveryStatus}
                  </span>
                </div>

                <div style={{ fontSize: "14px", color: "#0f172a", marginBottom: "6px", fontWeight: "700" }}>
                  👤 {group.order?.customerName || "N/A"}
                </div>
                <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "8px" }}>
                  📍 {group.order?.pincode ? `${group.order.pincode} - ` : ""}
                  {group.order?.address || "N/A"}
                </div>

                <div
                  style={{
                    background: group.isSkipped ? "#fff7ed" : group.hasExtraMilk ? "#f0fdf4" : "#f8fafc",
                    border: group.isSkipped ? "1px solid #fed7aa" : group.hasExtraMilk ? "1px solid #bbf7d0" : "1px solid #e2e8f0",
                    padding: "12px",
                    borderRadius: "10px",
                    marginBottom: "12px",
                  }}
                >
                  {group.isSkipped ? (
                    <div>
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          background: "#ea580c",
                          color: "white",
                          padding: "3px 10px",
                          borderRadius: "12px",
                          fontSize: "12px",
                          fontWeight: "700",
                        }}
                      >
                        🚫 SKIPPED – Customer Not At Home
                      </div>
                      <div style={{ fontSize: "13px", color: "#9a3412", marginTop: "6px", fontWeight: "700" }}>
                        Delivery Quantity: 0 Liter (Do not deliver)
                      </div>
                      <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                        Regular Quantity was: {group.order?.dailyQuantity || 1} L (Paused by customer request)
                      </div>
                    </div>
                  ) : group.hasExtraMilk ? (
                    <div>
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          background: "#0284c7",
                          color: "white",
                          padding: "3px 10px",
                          borderRadius: "12px",
                          fontSize: "12px",
                          fontWeight: "700",
                        }}
                      >
                        🥛 Extra Milk Approved (+{group.extraQuantity}L)
                      </div>
                      <div style={{ fontSize: "14px", color: "#166534", marginTop: "6px", fontWeight: "800" }}>
                        Total Delivery: {group.effectiveQuantity} Liter(s)
                      </div>
                      <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                        Regular: {group.order?.dailyQuantity || 1}L + Extra: {group.extraQuantity}L
                      </div>
                    </div>
                  ) : (
                    group.items.map((item, idx) => (
                      <div key={idx} style={{ fontSize: "13px", color: "#334155", marginBottom: "4px" }}>
                        📦 {item?.milkType || item?.product?.name || "Milk"}:{" "}
                        <strong>
                          {item?.dailyQuantity || 1}{" "}
                          {item?.product?.unit || (item?.milkType?.toLowerCase().includes("milk") ? "L" : "Qty")}
                        </strong>
                      </div>
                    ))
                  )}
                </div>

                <div
                  style={{
                    fontSize: "12.5px",
                    color: "#64748b",
                    marginBottom: "16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                  }}
                >
                  <div>
                    📅 Scheduled: {group.deliveryDate ? fmt(group.deliveryDate) : fmt(group.order?.startDate)}
                  </div>
                  {group.deliveredAt && (
                    <div style={{ color: "#166534", fontWeight: "700" }}>
                      ✅ Completed:{" "}
                      {new Date(group.deliveredAt).toLocaleString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  )}
                </div>

                {/* Primary Action Button Based on Current Status */}
                {(() => {
                  const cur = (group.deliveryStatus || '').toUpperCase().replace(/ /g, '_');
                  if (cur === 'ASSIGNED') {
                    return (
                      <button
                        onClick={() => handleUpdateStatus(group.ids, 'PRODUCT_COLLECTED')}
                        style={{ width: "100%", padding: "10px", marginBottom: "8px", background: "#16a34a", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "700", fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", boxShadow: "0 2px 6px rgba(22,163,74,0.3)" }}
                      >
                        📦 Collect Product
                      </button>
                    );
                  }
                  if (cur === 'PRODUCT_COLLECTED') {
                    return (
                      <button
                        onClick={() => handleUpdateStatus(group.ids, 'OUT_FOR_DELIVERY')}
                        style={{ width: "100%", padding: "10px", marginBottom: "8px", background: "#2563eb", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "700", fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", boxShadow: "0 2px 6px rgba(37,99,235,0.3)" }}
                      >
                        🚚 Start Delivery
                      </button>
                    );
                  }
                  if (cur === 'OUT_FOR_DELIVERY') {
                    return (
                      <button
                        onClick={() => handleUpdateStatus(group.ids, 'ARRIVED')}
                        style={{ width: "100%", padding: "10px", marginBottom: "8px", background: "#ea580c", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "700", fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", boxShadow: "0 2px 6px rgba(234,88,12,0.3)" }}
                      >
                        📍 Arrived at Customer
                      </button>
                    );
                  }
                  if (cur === 'ARRIVED') {
                    return (
                      <button
                        onClick={() => handleUpdateStatus(group.ids, 'DELIVERY_PENDING_CUSTOMER_CONFIRMATION')}
                        style={{ width: "100%", padding: "10px", marginBottom: "8px", background: "#0d9488", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "700", fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", boxShadow: "0 2px 6px rgba(13,148,136,0.3)" }}
                      >
                        🤝 Confirm Delivery Handover
                      </button>
                    );
                  }
                  if (cur === 'DELIVERY_PENDING_CUSTOMER_CONFIRMATION' || cur === 'AWAITING_USER_CONFIRMATION') {
                    return (
                      <div style={{ padding: "8px 12px", marginBottom: "8px", background: "#ecfeff", border: "1px solid #a5f3fc", borderRadius: "8px", color: "#0e7490", fontSize: "13px", fontWeight: "700", textAlign: "center" }}>
                        ⏳ Waiting for Customer Confirmation...
                      </div>
                    );
                  }
                  if (cur === 'DELIVERED') {
                    return (
                      <div style={{ padding: "8px 12px", marginBottom: "8px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", color: "#166534", fontSize: "13px", fontWeight: "700", textAlign: "center" }}>
                        ✅ Delivered & Confirmed
                      </div>
                    );
                  }
                  return null;
                })()}

                <button
                  onClick={() => setViewModal({ isOpen: true, data: group })}
                  style={{
                    width: "100%",
                    padding: "10px",
                    background: isDelivered ? "#f0fdf4" : "#f1f5f9",
                    border: isDelivered ? "1px solid #bbf7d0" : "1px solid #cbd5e1",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontWeight: "600",
                    color: isDelivered ? "#166534" : "#334155",
                    fontSize: "14px",
                    transition: "background 0.2s",
                  }}
                >
                  View Details
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* View Details Modal */}
      {viewModal.isOpen &&
        viewModal.data &&
        (() => {
          const d = viewModal.data;
          const order = d.order;
          const isDelivered = ['Delivered', 'DELIVERED'].includes(d.deliveryStatus);
          const currentIdx = isDelivered ? STATUS_FLOW.length - 1 : STATUS_FLOW.indexOf(d.deliveryStatus?.toUpperCase());
          const canAdvance = !isDelivered && currentIdx >= 0 && currentIdx < STATUS_FLOW.length - 1;
          const nextStatus = canAdvance ? STATUS_FLOW[currentIdx + 1] : null;

          return (
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(15,23,42,0.7)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 2000,
                padding: "20px",
              }}
            >
              <div
                style={{
                  background: "white",
                  borderRadius: "16px",
                  width: "100%",
                  maxWidth: "480px",
                  overflow: "hidden",
                  boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
                }}
              >
                <div
                  style={{
                    background: isDelivered ? "#f0fdf4" : "#f8fafc",
                    padding: "20px 24px",
                    borderBottom: "1px solid #e2e8f0",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <h3 style={{ margin: 0, color: "#1e293b", fontSize: "18px", fontWeight: "700" }}>
                    Delivery #{d.orderIds.join(", #")}
                  </h3>
                  <button
                    onClick={() => setViewModal({ isOpen: false, data: null })}
                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: "22px", color: "#64748b" }}
                  >
                    ✕
                  </button>
                </div>
                <div style={{ padding: "24px", overflowY: "auto", maxHeight: "calc(90vh - 160px)" }}>
                  {/* Delivered Notice Banner */}
                  {isDelivered && (
                    <div
                      style={{
                        background: "#f0fdf4",
                        border: "1px solid #bbf7d0",
                        padding: "14px 16px",
                        borderRadius: "10px",
                        color: "#166534",
                        marginBottom: "20px",
                      }}
                    >
                      <div style={{ fontWeight: "700", fontSize: "14px" }}>
                        ✅ Delivery Completed & Confirmed
                      </div>
                      {d.deliveredAt && (
                        <div style={{ fontSize: "12.5px", marginTop: "3px", color: "#15803d" }}>
                          Delivered on{" "}
                          {new Date(d.deliveredAt).toLocaleString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Customer Info */}
                  <div style={{ marginBottom: "20px" }}>
                    <h4
                      style={{
                        margin: "0 0 12px 0",
                        color: "#64748b",
                        fontSize: "12px",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Customer Info
                    </h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "14px" }}>
                      <div>
                        <strong>Name:</strong> {order?.customerName}
                      </div>
                      <div>
                        <strong>Phone:</strong> {order?.phone}
                      </div>
                      <div>
                        <strong>Address:</strong> {order?.address}
                      </div>
                      <div>
                        <strong>Pincode:</strong> {order?.pincode || "N/A"}
                      </div>
                    </div>
                  </div>
                  <hr style={{ border: "none", borderTop: "1px solid #f1f5f9", margin: "0 0 20px 0" }} />

                  {/* Milk Info */}
                  <div style={{ marginBottom: "20px" }}>
                    <h4
                      style={{
                        margin: "0 0 12px 0",
                        color: "#64748b",
                        fontSize: "12px",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Order Info
                    </h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "14px" }}>
                      {d.items.map((item, idx) => (
                        <div key={idx} style={{ padding: "8px", background: "#f8fafc", borderRadius: "8px" }}>
                          <div style={{ fontWeight: "600", color: "#3b82f6" }}>
                            {item?.milkType || item?.product?.name || "Milk"}
                          </div>
                          <div style={{ color: "#475569" }}>
                            Quantity: {item?.dailyQuantity || 1}{" "}
                            {item?.product?.unit || (item?.milkType?.toLowerCase().includes("milk") ? "L" : "Qty")}
                          </div>
                        </div>
                      ))}
                      <div style={{ marginTop: "8px" }}>
                        <strong>Period:</strong>{" "}
                        {d.orderType === "trial"
                          ? `${fmt(order?.startDate)} → ${fmt(order?.endDate)}`
                          : `${fmt(order?.finalStartDate || order?.requestedStartDate)} → ${fmt(
                            order?.finalEndDate || order?.requestedEndDate
                          )}`}
                      </div>
                    </div>
                  </div>
                  <hr style={{ border: "none", borderTop: "1px solid #f1f5f9", margin: "0 0 20px 0" }} />

                  {/* Status Tracker */}
                  <div style={{ marginBottom: "20px" }}>
                    <h4
                      style={{
                        margin: "0 0 12px 0",
                        color: "#64748b",
                        fontSize: "12px",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      Delivery Status Timeline
                    </h4>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      {STATUS_FLOW.map((s, i) => {
                        const isDone = isDelivered || i <= currentIdx;
                        const isCurrent = !isDelivered && s === d.deliveryStatus;
                        return (
                          <div key={s} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            <div
                              style={{
                                width: "24px",
                                height: "24px",
                                borderRadius: "50%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "12px",
                                fontWeight: "700",
                                background: isCurrent
                                  ? "#2e6f40"
                                  : isDone
                                    ? "#dcfce7"
                                    : "#f1f5f9",
                                color: isCurrent ? "white" : isDone ? "#16a34a" : "#94a3b8",
                                border: isCurrent ? "none" : "1px solid #e2e8f0",
                              }}
                            >
                              {isDone ? "✓" : i + 1}
                            </div>
                            <span
                              style={{
                                fontSize: "12px",
                                color: isCurrent ? "#1e293b" : isDone ? "#16a34a" : "#94a3b8",
                                fontWeight: isCurrent ? "700" : "400",
                              }}
                            >
                              {s}
                            </span>
                            {i < STATUS_FLOW.length - 1 && <span style={{ color: "#cbd5e1" }}>→</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Action Buttons for active deliveries */}
                  {!isDelivered && d.deliveryStatus !== "Rejected" && (() => {
                    const cur = (d.deliveryStatus || '').toUpperCase().replace(/ /g, '_');
                    return (
                      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                        {cur === 'ASSIGNED' && (
                          <button
                            onClick={() => handleUpdateStatus(d.ids, 'PRODUCT_COLLECTED')}
                            style={{ flex: 1, padding: "12px", background: "#16a34a", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "700", fontSize: "14px" }}
                          >
                            📦 Collect Product
                          </button>
                        )}
                        {cur === 'PRODUCT_COLLECTED' && (
                          <button
                            onClick={() => handleUpdateStatus(d.ids, 'OUT_FOR_DELIVERY')}
                            style={{ flex: 1, padding: "12px", background: "#2563eb", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "700", fontSize: "14px" }}
                          >
                            🚚 Start Delivery
                          </button>
                        )}
                        {cur === 'OUT_FOR_DELIVERY' && (
                          <button
                            onClick={() => handleUpdateStatus(d.ids, 'ARRIVED')}
                            style={{ flex: 1, padding: "12px", background: "#ea580c", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "700", fontSize: "14px" }}
                          >
                            📍 Arrived at Customer
                          </button>
                        )}
                        {cur === 'ARRIVED' && (
                          <button
                            onClick={() => handleUpdateStatus(d.ids, 'DELIVERY_PENDING_CUSTOMER_CONFIRMATION')}
                            style={{ flex: 1, padding: "12px", background: "#0d9488", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "700", fontSize: "14px" }}
                          >
                            🤝 Confirm Delivery Handover
                          </button>
                        )}
                        {(cur === 'DELIVERY_PENDING_CUSTOMER_CONFIRMATION' || cur === 'AWAITING_USER_CONFIRMATION') && (
                          <div style={{ width: "100%", padding: "12px", background: "#ecfeff", border: "1px solid #a5f3fc", borderRadius: "8px", color: "#0e7490", fontWeight: "700", fontSize: "13px", textAlign: "center" }}>
                            ⏳ Product handed over. Waiting for customer to confirm receipt...
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {isDelivered && (
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <button
                        onClick={() => setViewModal({ isOpen: false, data: null })}
                        style={{
                          padding: "10px 20px",
                          background: "#1e3a8a",
                          color: "white",
                          border: "none",
                          borderRadius: "8px",
                          cursor: "pointer",
                          fontWeight: "600",
                          fontSize: "13.5px",
                        }}
                      >
                        Close
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

      {/* Set Availability Modal */}
      {availModal.isOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2100,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: "12px",
              width: "100%",
              maxWidth: "380px",
              padding: "24px",
            }}
          >
            <h3 style={{ margin: "0 0 16px 0", color: "#1e293b" }}>📅 Set My Availability</h3>
            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  fontWeight: "600",
                  color: "#475569",
                  fontSize: "13px",
                  marginBottom: "6px",
                }}
              >
                Date
              </label>
              <input
                type="date"
                value={availForm.date}
                onChange={(e) => setAvailForm({ ...availForm, date: e.target.value })}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  display: "block",
                  fontWeight: "600",
                  color: "#475569",
                  fontSize: "13px",
                  marginBottom: "6px",
                }}
              >
                Status
              </label>
              <div style={{ display: "flex", gap: "8px" }}>
                {["Available", "On Leave", "Unavailable"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setAvailForm({ ...availForm, status: s })}
                    style={{
                      flex: 1,
                      padding: "10px 6px",
                      border: "1px solid",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: "600",
                      transition: "all 0.15s",
                      borderColor:
                        availForm.status === s
                          ? s === "Available"
                            ? "#16a34a"
                            : s === "On Leave"
                              ? "#d97706"
                              : "#dc2626"
                          : "#cbd5e1",
                      background:
                        availForm.status === s
                          ? s === "Available"
                            ? "#dcfce7"
                            : s === "On Leave"
                              ? "#fef3c7"
                              : "#fee2e2"
                          : "white",
                      color:
                        availForm.status === s
                          ? s === "Available"
                            ? "#16a34a"
                            : s === "On Leave"
                              ? "#d97706"
                              : "#dc2626"
                          : "#64748b",
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={() => setAvailModal({ isOpen: false })}
                style={{
                  flex: 1,
                  padding: "10px",
                  background: "white",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "600",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSetAvailability}
                style={{
                  flex: 1,
                  padding: "10px",
                  background: "#2e6f40",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "700",
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Door QR Scan Modal */}
      {qrModal.isOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2200,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "420px",
              padding: "24px",
            }}
          >
            <h3 style={{ margin: "0 0 12px 0", color: "#1e293b" }}>▣ Scan Customer Door QR</h3>
            <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "16px" }}>
              Scan the permanent QR code pasted on the customer's door, or enter the token manually.
            </p>
            <button
              onClick={handleCameraScan}
              style={{
                width: "100%",
                padding: "12px",
                background: "#1e3a8a",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "700",
                fontSize: "14px",
                marginBottom: "12px",
              }}
            >
              📷 Open Camera Scanner
            </button>
            <input
              type="text"
              value={qrModal.token}
              onChange={(e) => setQrModal({ ...qrModal, token: e.target.value })}
              placeholder="Or paste Door QR Token here..."
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "14px",
                boxSizing: "border-box",
                marginBottom: "12px",
              }}
            />
            {qrModal.error && (
              <div style={{ color: "#dc2626", fontSize: "13px", marginBottom: "12px" }}>
                {qrModal.error}
              </div>
            )}
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => setQrModal({ isOpen: false, token: "", loading: false, error: "" })}
                style={{
                  flex: 1,
                  padding: "10px",
                  background: "white",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "600",
                }}
              >
                Cancel
              </button>
              <button
                disabled={qrModal.loading}
                onClick={() => handleScanQr()}
                style={{
                  flex: 1,
                  padding: "10px",
                  background: "#16a34a",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: qrModal.loading ? "not-allowed" : "pointer",
                  fontWeight: "700",
                }}
              >
                {qrModal.loading ? "Verifying..." : "Verify Token"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Select Delivered Items Confirmation Modal */}
      {confirmModal.isOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2200,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "440px",
              padding: "24px",
            }}
          >
            <h3 style={{ margin: "0 0 8px 0", color: "#1e293b" }}>☑ Select Delivered Items</h3>
            <p style={{ color: "#64748b", fontSize: "13.5px", marginBottom: "16px" }}>
              Customer: <strong>{confirmModal.customer?.name}</strong>
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
              {confirmModal.orders.map((ord) => (
                <label
                  key={ord.assignmentId}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "10px 14px",
                    background: "#f8fafc",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={Boolean(confirmModal.selected[ord.assignmentId])}
                    onChange={(e) =>
                      setConfirmModal({
                        ...confirmModal,
                        selected: {
                          ...confirmModal.selected,
                          [ord.assignmentId]: e.target.checked,
                        },
                      })
                    }
                  />
                  <span style={{ fontSize: "14px", fontWeight: "600", color: "#1e293b" }}>
                    {ord.item?.label} ({ord.item?.quantity} {ord.item?.unit || "L"})
                  </span>
                </label>
              ))}
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() =>
                  setConfirmModal({
                    isOpen: false,
                    customer: null,
                    orders: [],
                    selected: {},
                    loading: false,
                  })
                }
                style={{
                  flex: 1,
                  padding: "10px",
                  background: "white",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "600",
                }}
              >
                Cancel
              </button>
              <button
                disabled={confirmModal.loading}
                onClick={handleRequestConfirmation}
                style={{
                  flex: 1,
                  padding: "10px",
                  background: "#16a34a",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: confirmModal.loading ? "not-allowed" : "pointer",
                  fontWeight: "700",
                }}
              >
                {confirmModal.loading ? "Requesting..." : "Send to Customer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyDeliveries;
