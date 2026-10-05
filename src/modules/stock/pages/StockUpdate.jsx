import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";

const StockUpdate = () => {
  const navigate = useNavigate();
  const [adjustments, setAdjustments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  const fetchAdjustments = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/stock-adjustments");
      setAdjustments(res.data.adjustments || []);
    } catch (err) {
      setMessage({ text: "Failed to load stock updates.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdjustments();
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
        <div>
          <h2 style={{ margin: 0, color: "#1e293b", fontSize: "20px", fontWeight: "700" }}>Stock Updates History</h2>
          <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "13px" }}>Log of all stock additions (Orders) and deductions (Food Intake).</p>
        </div>
        <div>
          <button type="button"
            onClick={() => window.history.back()} style={{ background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1", padding: "8px 12px", borderRadius: "6px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.background = "#e2e8f0"} onMouseLeave={(e) => e.currentTarget.style.background = "#f1f5f9"}>
  <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="18" width="18" xmlns="http://www.w3.org/2000/svg"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
</button>
        </div>
      </div>

      {message.text && (
        <div style={{ 
          background: message.type === "error" ? "#fef2f2" : "#f0fdf4", 
          color: message.type === "error" ? "#dc2626" : "#16a34a", 
          padding: "12px 16px", 
          borderRadius: "6px", 
          marginBottom: "16px", 
          border: `1px solid ${message.type === "error" ? "#fca5a5" : "#bbf7d0"}`, 
          fontWeight: "600",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          {message.type === "error" ? "⚠️" : "✅"} {message.text}
        </div>
      )}

      <section className="cattle-table-card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Item</th>
                <th>Type</th>
                <th>Quantity</th>
                <th>Previous Stock</th>
                <th>New Stock</th>
                <th>Reason / Remarks</th>
              </tr>
            </thead>
            <tbody>
              {loading && adjustments.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>Loading stock updates...</td></tr>
              ) : adjustments.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>No stock updates found.</td></tr>
              ) : (
                adjustments.map((adj) => (
                  <tr key={adj.id}>
                    <td data-label="Date">{formatDate(adj.createdAt)}</td>
                    <td data-label="Item">
                      <div style={{ fontWeight: "600", color: "#0f172a" }}>{adj.item?.name || "Unknown"}</div>
                      <div style={{ fontSize: "12px", color: "#64748b" }}>ITEM-{String(adj.itemId).padStart(3, '0')}</div>
                    </td>
                    <td data-label="Type">
                      <span style={{ 
                        background: adj.type === "Add" ? "#dcfce7" : "#fee2e2", 
                        color: adj.type === "Add" ? "#166534" : "#991b1b",
                        padding: "4px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: "600"
                      }}>
                        {adj.type === "Add" ? "Stock In" : "Stock Out"}
                      </span>
                    </td>
                    <td data-label="Quantity" style={{ fontWeight: "700", color: adj.type === "Add" ? "#16a34a" : "#dc2626" }}>
                      {adj.type === "Add" ? "+" : "-"}{Number(adj.adjustment).toFixed(2)} {adj.item?.unit}
                    </td>
                    <td data-label="Previous Stock">{Number(adj.previousStock).toFixed(2)} {adj.item?.unit}</td>
                    <td data-label="New Stock" style={{ fontWeight: "700" }}>{Number(adj.newStock).toFixed(2)} {adj.item?.unit}</td>
                    <td data-label="Reason / Remarks">
                      <div style={{ fontWeight: "600" }}>{adj.reason}</div>
                      <div style={{ fontSize: "12px", color: "#64748b" }}>{adj.remarks || "-"}</div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default StockUpdate;
