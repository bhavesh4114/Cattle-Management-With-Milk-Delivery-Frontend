import React, { useState, useEffect } from "react";
import api from "../../../services/api";

const DeliveryReassignmentQueue = () => {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ text: "", type: "" });
  const [selectedBoys, setSelectedBoys] = useState({});
  const [reassigningId, setReassigningId] = useState(null);

  const showToast = (text, type = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast({ text: "", type: "" }), 4000);
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const fetchQueue = async () => {
    try {
      setLoading(true);
      const res = await api.get("/delivery/admin/reassignments");
      setQueue(res.data);
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || "Failed to load reassignment queue", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleReassign = async (assignmentId) => {
    const selectedBoyId = selectedBoys[assignmentId];
    if (!selectedBoyId) {
      showToast("Please choose a replacement delivery boy from the dropdown", "error");
      return;
    }

    try {
      setReassigningId(assignmentId);
      const res = await api.patch(`/delivery/admin/reassign/${assignmentId}`, {
        deliveryBoyId: selectedBoyId,
        notes: "Manually reassigned from Admin Queue",
      });

      showToast(res.data.message || "Delivery reassigned successfully!");
      // Remove from queue
      setQueue((prev) => prev.filter((item) => item.id !== assignmentId));
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to reassign delivery", "error");
    } finally {
      setReassigningId(null);
    }
  };

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
      {/* Toast Notification */}
      {toast.text && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            zIndex: 9999,
            padding: "14px 20px",
            background: toast.type === "error" ? "#ef4444" : "#10b981",
            color: "white",
            borderRadius: "10px",
            boxShadow: "0 10px 15px -3px rgba(0,0,0,0.2)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontWeight: 500,
          }}
        >
          {toast.type === "error" ? "⚠️" : "✅"} {toast.text}
        </div>
      )}

      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <div>
          <h2 style={{ fontSize: "1.6rem", fontWeight: "700", color: "#0f172a", margin: 0 }}>
            🔄 Delivery Reassignment Queue
          </h2>
          <p style={{ color: "#64748b", margin: "4px 0 0 0", fontSize: "14px" }}>
            Deliveries requiring manual assignment due to delivery boy leaves or in-progress conflicts.
          </p>
        </div>

        <button
          onClick={fetchQueue}
          style={{
            background: "#f1f5f9",
            color: "#334155",
            border: "1px solid #cbd5e1",
            padding: "10px 16px",
            borderRadius: "8px",
            fontWeight: "600",
            fontSize: "13px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          🔄 Refresh Queue
        </button>
      </div>

      {/* Notice Banner */}
      <div
        style={{
          background: "#fffbeb",
          border: "1px solid #fde68a",
          borderRadius: "12px",
          padding: "16px 20px",
          marginBottom: "24px",
          display: "flex",
          alignItems: "center",
          gap: "14px",
          color: "#92400e",
        }}
      >
        <span style={{ fontSize: "24px" }}>⚠️</span>
        <div style={{ fontSize: "13.5px", lineHeight: "1.5" }}>
          <strong>Attention:</strong> These orders could not be automatically reassigned (e.g. no delivery boy
          with matching pincode was available on that date, or the delivery was already marked in-progress).
          Please select an active delivery boy to fulfill each order.
        </div>
      </div>

      {/* Table Card */}
      <div
        style={{
          background: "white",
          borderRadius: "14px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          overflow: "hidden",
        }}
      >
        {loading ? (
          <div style={{ padding: "48px", textAlign: "center", color: "#64748b" }}>Loading queue...</div>
        ) : queue.length === 0 ? (
          <div style={{ padding: "50px", textAlign: "center" }}>
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>🎉</div>
            <h4 style={{ margin: "0 0 6px 0", color: "#166534" }}>Reassignment Queue is Empty</h4>
            <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>
              All affected deliveries during approved leaves have been successfully handled!
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#475569", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  <th style={{ padding: "14px 18px" }}>Order / Customer</th>
                  <th style={{ padding: "14px 18px" }}>Delivery Date</th>
                  <th style={{ padding: "14px 18px" }}>Previous Staff</th>
                  <th style={{ padding: "14px 18px" }}>Reassignment Reason</th>
                  <th style={{ padding: "14px 18px" }}>Status</th>
                  <th style={{ padding: "14px 18px" }}>Assign Replacement</th>
                </tr>
              </thead>
              <tbody>
                {queue.map((item) => {
                  const dateStr = item.deliveryDate ? item.deliveryDate.split("T")[0] : "-";
                  const selectedBoyId = selectedBoys[item.id] || "";

                  return (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(ev) => (ev.currentTarget.style.background = "#f8fafc")}
                      onMouseLeave={(ev) => (ev.currentTarget.style.background = "transparent")}
                    >
                      {/* Customer Info */}
                      <td style={{ padding: "16px 18px" }}>
                        <div style={{ fontWeight: "700", color: "#0f172a" }}>{item.customerName}</div>
                        <div style={{ fontSize: "12px", color: "#64748b" }}>
                          {item.orderType === "trial" ? "Trial Request" : "Subscription"} #{item.orderId}
                        </div>
                        <div style={{ fontSize: "12px", color: "#475569", marginTop: "2px" }}>
                          {item.milkType} &bull; {item.dailyQuantity} L
                        </div>
                        <div style={{ fontSize: "11.5px", color: "#94a3b8", marginTop: "2px" }}>
                          📍 {item.pincode} - {item.address}
                        </div>
                      </td>

                      {/* Delivery Date */}
                      <td style={{ padding: "16px 18px", fontWeight: "600", color: "#1e293b", fontSize: "13.5px" }}>
                        {dateStr}
                      </td>

                      {/* Previous Delivery Boy */}
                      <td style={{ padding: "16px 18px", fontSize: "13px" }}>
                        <div style={{ fontWeight: "600", color: "#334155" }}>
                          {item.previousDeliveryBoy?.name || "Staff On Leave"}
                        </div>
                        <div style={{ color: "#64748b", fontSize: "11.5px" }}>
                          {item.previousDeliveryBoy?.deliveryProfile?.mobile || item.previousDeliveryBoy?.email}
                        </div>
                      </td>

                      {/* Reason */}
                      <td style={{ padding: "16px 18px", fontSize: "13px", maxWidth: "260px" }}>
                        <div
                          style={{
                            background: "#fef3c7",
                            color: "#92400e",
                            padding: "6px 10px",
                            borderRadius: "6px",
                            fontSize: "12px",
                            fontWeight: "500",
                            border: "1px solid #fde68a",
                          }}
                        >
                          {item.reassignmentReason || "Delivery boy on approved leave"}
                        </div>
                      </td>

                      {/* Current Status */}
                      <td style={{ padding: "16px 18px" }}>
                        <span
                          style={{
                            background: "#f1f5f9",
                            color: "#475569",
                            padding: "4px 8px",
                            borderRadius: "6px",
                            fontSize: "12px",
                            fontWeight: "600",
                          }}
                        >
                          {item.deliveryStatus}
                        </span>
                      </td>

                      {/* Assignment Action */}
                      <td style={{ padding: "16px 18px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <select
                            value={selectedBoyId}
                            onChange={(e) =>
                              setSelectedBoys({ ...selectedBoys, [item.id]: e.target.value })
                            }
                            style={{
                              padding: "8px 10px",
                              borderRadius: "8px",
                              border: "1px solid #cbd5e1",
                              fontSize: "13px",
                              maxWidth: "200px",
                              background: "white",
                            }}
                          >
                            <option value="">-- Select Replacement --</option>
                            {(item.availableDeliveryBoys || []).map((boy) => (
                              <option key={boy.id} value={boy.id}>
                                {boy.name} {boy.pincodeMatch ? "⭐ (Pincode match)" : ""}
                              </option>
                            ))}
                          </select>

                          <button
                            disabled={!selectedBoyId || reassigningId === item.id}
                            onClick={() => handleReassign(item.id)}
                            style={{
                              padding: "8px 14px",
                              borderRadius: "8px",
                              border: "none",
                              background: selectedBoyId ? "#2563eb" : "#cbd5e1",
                              color: "white",
                              fontWeight: "600",
                              fontSize: "12.5px",
                              cursor: selectedBoyId ? "pointer" : "not-allowed",
                              whiteSpace: "nowrap",
                              transition: "all 0.2s",
                            }}
                          >
                            {reassigningId === item.id ? "Assigning..." : "Assign"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeliveryReassignmentQueue;
