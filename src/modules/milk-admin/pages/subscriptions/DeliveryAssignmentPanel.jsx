import React, { useState, useEffect } from "react";
import api from "../../../../services/api";

const statusDot = (s) => ({
  Available: { dot: "#22c55e", label: "🟢" },
  "On Leave": { dot: "#f59e0b", label: "🟡" },
  Unavailable: { dot: "#ef4444", label: "🔴" },
}[s] || { dot: "#94a3b8", label: "⚪" });

const DeliveryAssignmentPanel = ({ orderType, orderId, currentDeliveryBoyId, onAssigned }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, warning: "", boyId: null, boyName: "" });
  const [allBoysModal, setAllBoysModal] = useState({ isOpen: false });
  const [allBoys, setAllBoys] = useState([]);
  const [toast, setToast] = useState({ text: "", type: "" });
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [reassignNotes, setReassignNotes] = useState("");

  const showToast = (text, type = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast({ text: "", type: "" }), 3500);
  };

  useEffect(() => {
    fetchSuggestions();
    fetchHistory();
  }, [orderId, orderType]);

  const fetchSuggestions = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/delivery/suggest/${orderType}/${orderId}`);
      setData(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await api.get(`/delivery/history/${orderType}/${orderId}`);
      setHistory(res.data);
    } catch (e) {}
  };

  const fetchAllBoys = async () => {
    try {
      const res = await api.get("/delivery/boys");
      setAllBoys(res.data);
    } catch (e) {}
  };

  const doAssign = async (boyId, force = false) => {
    try {
      const res = await api.post(`/delivery/assign/${orderType}/${orderId}`, {
        deliveryBoyId: boyId,
        notes: reassignNotes || undefined,
        forceAssign: force,
      });
      if (res.data.needsConfirmation) {
        setConfirmModal({ isOpen: true, warning: res.data.warning, boyId, boyName: res.data.deliveryBoyName || "" });
        return;
      }
      showToast("Delivery assigned successfully! ✓");
      setReassignNotes("");
      fetchSuggestions();
      fetchHistory();
      setAllBoysModal({ isOpen: false });
      if (onAssigned) onAssigned();
    } catch (e) {
      showToast(e.response?.data?.message || "Assignment failed", "error");
    }
  };

  const fmt = (d) => d ? new Date(d).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "";

  if (loading) return <div style={{ padding: "16px", color: "#64748b", fontSize: "14px" }}>Loading delivery suggestions...</div>;
  if (!data) return null;

  const { order, suggested } = data;
  const hasCurrentAssignment = !!order.currentDeliveryBoyId;

  return (
    <div style={{ marginTop: "24px", borderTop: "2px solid #f1f5f9", paddingTop: "20px" }}>
      {toast.text && (
        <div style={{ position: "fixed", top: "20px", right: "20px", background: toast.type === "error" ? "#ef4444" : "#22c55e", color: "white", padding: "12px 24px", borderRadius: "8px", zIndex: 9999, fontWeight: "bold", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
          {toast.text}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h4 style={{ margin: 0, color: "#1e293b", fontSize: "15px", fontWeight: "700" }}>
          {hasCurrentAssignment ? "🔄 Reassign Delivery" : "🚚 Delivery Assignment"}
        </h4>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={() => { setShowHistory(!showHistory); }} style={{ padding: "5px 12px", background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: "6px", cursor: "pointer", fontSize: "12px", color: "#475569", fontWeight: "600" }}>
            📋 History ({history.length})
          </button>
          <button onClick={() => { fetchAllBoys(); setAllBoysModal({ isOpen: true }); }} style={{ padding: "5px 12px", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "6px", cursor: "pointer", fontSize: "12px", color: "#1d4ed8", fontWeight: "600" }}>
            👥 Manual Override
          </button>
        </div>
      </div>

      {/* Current Assignment Banner */}
      {hasCurrentAssignment && (
        <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px", padding: "12px 16px", marginBottom: "16px", fontSize: "13px", color: "#1d4ed8" }}>
          <strong>Currently Assigned:</strong> {suggested.find(b => b.id === order.currentDeliveryBoyId)?.name || `Boy #${order.currentDeliveryBoyId}`}
          &nbsp;·&nbsp; Status: <strong>{order.currentDeliveryStatus}</strong>
          <div style={{ marginTop: "8px" }}>
            <label style={{ fontSize: "12px", color: "#64748b", display: "block", marginBottom: "4px" }}>Reassignment reason (optional):</label>
            <input value={reassignNotes} onChange={e => setReassignNotes(e.target.value)} placeholder="e.g. Rahul on leave" style={{ width: "100%", padding: "6px 10px", border: "1px solid #bfdbfe", borderRadius: "6px", fontSize: "13px", boxSizing: "border-box" }} />
          </div>
        </div>
      )}

      {/* Customer Info */}
      <div style={{ background: "#f8fafc", borderRadius: "8px", padding: "12px 16px", marginBottom: "16px", fontSize: "13px", color: "#475569" }}>
        <strong style={{ color: "#1e293b" }}>Pincode:</strong> {order.pincode || "Not provided"}
        &nbsp;·&nbsp; <strong style={{ color: "#1e293b" }}>Milk:</strong> {order.milkType} · {order.dailyQuantity} L
      </div>

      {/* Suggested Boys */}
      <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px" }}>
        Nearby Available Delivery Boys
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "280px", overflowY: "auto" }}>
        {suggested.length === 0 && (
          <div style={{ padding: "16px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", color: "#b91c1c", fontSize: "13px" }}>
            No delivery boys available. Create staff accounts and set up their delivery profiles.
          </div>
        )}
        {suggested.map(boy => {
          const { label } = statusDot(boy.todayAvailability);
          const isCurrentlyAssigned = boy.id === order.currentDeliveryBoyId;
          const canAssign = boy.isAvailable && boy.isActive;
          return (
            <div key={boy.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: isCurrentlyAssigned ? "#f0fdf4" : "white", border: `1px solid ${isCurrentlyAssigned ? "#86efac" : "#e2e8f0"}`, borderRadius: "10px" }}>
              <div>
                <div style={{ fontWeight: "700", color: "#0f172a", fontSize: "14px" }}>
                  {label} {boy.name} {isCurrentlyAssigned && <span style={{ fontSize: "11px", color: "#16a34a", fontWeight: "600" }}>(current)</span>}
                </div>
                <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                  {boy.pincodes?.length > 0 ? boy.pincodes.join(", ") : "No area set"}
                  &nbsp;·&nbsp;
                  <span style={{ color: canAssign ? "#16a34a" : "#dc2626", fontWeight: "600" }}>{boy.todayAvailability}</span>
                  {boy.pincodeMatch && <span style={{ color: "#2563eb", fontWeight: "600" }}>&nbsp;·&nbsp;✓ Pincode Match</span>}
                </div>
              </div>
              {isCurrentlyAssigned ? (
                <span style={{ padding: "4px 12px", background: "#dcfce7", color: "#16a34a", borderRadius: "6px", fontSize: "12px", fontWeight: "700" }}>Assigned</span>
              ) : (
                <button
                  onClick={() => doAssign(boy.id)}
                  style={{ padding: "7px 16px", background: canAssign ? "#2e6f40" : "#e2e8f0", color: canAssign ? "white" : "#94a3b8", border: "none", borderRadius: "7px", cursor: "pointer", fontSize: "13px", fontWeight: "700" }}
                >
                  {canAssign ? "Assign" : "Not Available"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* History */}
      {showHistory && history.length > 0 && (
        <div style={{ marginTop: "16px", padding: "16px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: "13px", fontWeight: "700", color: "#1e293b", marginBottom: "12px" }}>Assignment History</div>
          {history.map((h, i) => (
            <div key={h.id} style={{ display: "flex", gap: "12px", marginBottom: i < history.length - 1 ? "12px" : 0, fontSize: "13px" }}>
              <div style={{ width: "2px", background: "#e2e8f0", flexShrink: 0, borderRadius: "1px", marginTop: "4px" }} />
              <div>
                <div style={{ color: "#64748b", fontSize: "12px" }}>{fmt(h.createdAt)}</div>
                <div style={{ fontWeight: "600", color: "#1e293b" }}>{h.isActive ? "✓" : "→"} Assigned to {h.deliveryBoy?.name}</div>
                {h.notes && <div style={{ color: "#64748b", fontStyle: "italic" }}>Reason: {h.notes}</div>}
                <div style={{ fontSize: "12px", color: h.isActive ? "#16a34a" : "#94a3b8" }}>Status: {h.deliveryStatus} · {h.isActive ? "Active" : "Replaced"}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Modal (pincode/availability warning) */}
      {confirmModal.isOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3000, padding: "20px" }}>
          <div style={{ background: "white", borderRadius: "12px", width: "100%", maxWidth: "400px", padding: "24px", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>
            <div style={{ fontSize: "40px", textAlign: "center", marginBottom: "12px" }}>⚠️</div>
            <h3 style={{ textAlign: "center", margin: "0 0 12px 0", color: "#1e293b" }}>Confirm Assignment</h3>
            <p style={{ color: "#475569", fontSize: "14px", textAlign: "center", lineHeight: "1.5", marginBottom: "20px" }}>{confirmModal.warning}</p>
            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={() => setConfirmModal({ isOpen: false, warning: "", boyId: null, boyName: "" })}
                style={{ flex: 1, padding: "12px", background: "white", border: "1px solid #e2e8f0", borderRadius: "8px", cursor: "pointer", fontWeight: "600", color: "#475569" }}>
                Cancel
              </button>
              <button onClick={() => { setConfirmModal({ isOpen: false, warning: "", boyId: null, boyName: "" }); doAssign(confirmModal.boyId, true); }}
                style={{ flex: 1, padding: "12px", background: "#ef4444", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "700" }}>
                Confirm Assignment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Override Modal */}
      {allBoysModal.isOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3000, padding: "20px" }}>
          <div style={{ background: "white", borderRadius: "16px", width: "100%", maxWidth: "480px", overflow: "hidden", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>
            <div style={{ background: "#f8fafc", padding: "20px 24px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, color: "#1e293b", fontWeight: "700" }}>👥 Manual Assignment Override</h3>
              <button onClick={() => setAllBoysModal({ isOpen: false })} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "20px", color: "#64748b" }}>✕</button>
            </div>
            <div style={{ padding: "20px", maxHeight: "400px", overflowY: "auto" }}>
              <p style={{ color: "#64748b", fontSize: "13px", marginTop: 0 }}>All active delivery boys are shown. Out-of-area assignments will require confirmation.</p>
              {allBoys.length === 0 && <div style={{ color: "#94a3b8", textAlign: "center", padding: "20px" }}>No delivery boys found.</div>}
              {allBoys.map(boy => {
                const { label } = statusDot(boy.todayAvailability);
                return (
                  <div key={boy.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", marginBottom: "8px", border: "1px solid #e2e8f0", borderRadius: "10px" }}>
                    <div>
                      <div style={{ fontWeight: "700", color: "#0f172a", fontSize: "14px" }}>{label} {boy.name}</div>
                      <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                        {boy.profile?.pincodes?.join(", ") || "No area"} · {boy.todayAvailability}
                      </div>
                    </div>
                    <button
                      onClick={() => doAssign(boy.id)}
                      style={{ padding: "7px 16px", background: "#2563eb", color: "white", border: "none", borderRadius: "7px", cursor: "pointer", fontSize: "13px", fontWeight: "700" }}>
                      Assign
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryAssignmentPanel;
