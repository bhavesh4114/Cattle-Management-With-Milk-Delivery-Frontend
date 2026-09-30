import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";
import { hasPermission } from "../../../utils/permissions";
import ExportButtons from "../../../components/ExportButtons";

const getStatus = (stock, minLevel) => {
  const current = Number(stock || 0);
  if (minLevel == null) return { text: "Not set", color: "#64748b", reason: "Not set" };
  const min = Number(minLevel);
  if (current <= min) return { text: "Low Stock", color: "#dc2626", bg: "#fef2f2", icon: "⚠️", reason: "Low Stock" };
  return { text: "Adequate", color: "#16a34a", bg: "#f0fdf4", icon: "✅", reason: "Adequate" };
};

const CurrentStock = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // History Modal State
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyData, setHistoryData] = useState([]);

  const adminData = JSON.parse(localStorage.getItem("adminData") || "{}");
  const canAdd = hasPermission(adminData, "stock", "add");

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/admin/items");
      setItems(Array.isArray(res.data) ? res.data : res.data?.items || []);
    } catch (err) {
      console.error("Error fetching items:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchHistory = async (item) => {
    setSelectedHistoryItem(item);
    setHistoryLoading(true);
    setHistoryData([]);
    try {
      const res = await api.get(`/api/admin/stock-adjustments?itemId=${item.id}`);
      setHistoryData(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error fetching history:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const summary = {
    totalItems: items.length,
    lowStock: items.filter((item) => getStatus(item.currentStock, item.minimumLevel).reason === "Low Stock").length,
  };

  return (
    <div style={{ padding: "20px", fontFamily: "'Inter', sans-serif", boxSizing: "border-box", width: "100%", overflowX: "hidden" }}>
      <div style={{ marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <div style={{ fontSize: "28px" }}>📦</div>
          <div>
            <h2 style={{ margin: 0, color: "#1e293b", fontSize: "24px", fontWeight: "800" }}>Current Stock Levels</h2>
            <p style={{ margin: 0, color: "#64748b", fontSize: "14px", marginTop: "4px" }}>Monitor inventory quantities</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <ExportButtons tableId="current-stock-table" filename="Current_Stock" title="Current Stock Levels" />
          <button onClick={() => navigate("/admin/stock-adjustments")} style={{ background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1", padding: "8px 16px", borderRadius: "8px", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", transition: "all 0.2s" }} onMouseEnter={(e) => { e.currentTarget.style.background = "#e2e8f0"; e.currentTarget.style.transform = "translateY(-1px)"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "#f1f5f9"; e.currentTarget.style.transform = "translateY(0)"; }}>
            View Adjustments
          </button>
          {canAdd && (
            <button onClick={() => navigate("/admin/stock-adjustments/new")} style={{ background: "#2e6f40", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", transition: "all 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-1px)"} onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}>
              + Manual Adjustment
            </button>
          )}
        </div>
      </div>

      <section className="cattle-table-card">
        <div className="panel-heading" style={{ padding: "16px" }}>
          <h3 style={{ margin: 0 }}>Stock Overview</h3>
        </div>
        <div className="table-wrap">
          <table id="current-stock-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Current Stock</th>
                <th>Minimum Level</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>Loading stock...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan="5" style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>No items in inventory. Add items in the Items master first.</td></tr>
              ) : (
                items.map((item) => {
                  const currentStock = Number(item.currentStock || 0);
                  const status = getStatus(currentStock, item.minimumLevel);
                  return (
                    <tr key={item.id}>
                      <td data-label="Item">
                        <div style={{ fontWeight: "600" }}>{item.name}</div>
                        <div style={{ fontSize: "12px", color: "#64748b" }}>ITEM-{String(item.id).padStart(3, '0')}</div>
                      </td>
                      <td data-label="Current Stock">
                        <span style={{ fontWeight: "700", color: "#2e6f40" }}>
                          {currentStock.toFixed(2)} {item.unit}
                        </span>
                      </td>
                      <td data-label="Minimum Level">
                        {item.minimumLevel != null ? `${Number(item.minimumLevel).toFixed(2)} ${item.unit}` : "Not set"}
                      </td>
                      <td data-label="Status">
                        {status.reason === "Not set" ? (
                          <span style={{ color: "#64748b", fontSize: "13px" }}>Not set</span>
                        ) : (
                          <span style={{ color: status.color, fontWeight: "600" }}>
                            {status.icon} {status.text}
                          </span>
                        )}
                      </td>
                      <td data-label="Actions">
                        <div className="row-actions">
                          {canAdd && (
                            <button onClick={() => navigate("/admin/stock-adjustments/new")} className="icon-action add" title="Manual Adjustment">
                              &#9878;
                            </button>
                          )}
                          <button onClick={() => fetchHistory(item)} className="icon-action view" title="View History Model">
                            👁️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "16px", marginTop: "20px", display: "inline-block", minWidth: "250px" }}>
        <h4 style={{ margin: "0 0 12px 0", color: "#334155", fontSize: "15px" }}>Summary</h4>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "14px", color: "#475569" }}>
          <span>Total Items:</span>
          <strong style={{ color: "#0f172a" }}>{summary.totalItems}</strong>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", color: "#475569" }}>
          <span>Low Stock Items:</span>
          <strong style={{ color: summary.lowStock > 0 ? "#dc2626" : "#22c55e" }}>{summary.lowStock}</strong>
        </div>
      </div>    

      {/* History Modal */}
      {selectedHistoryItem && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "20px", boxSizing: "border-box" }}>
          <div style={{ background: "#fff", borderRadius: "16px", width: "100%", maxWidth: "800px", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", display: "flex", flexDirection: "column", maxHeight: "90vh" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc", borderTopLeftRadius: "16px", borderTopRightRadius: "16px" }}>
              <div>
                <h3 style={{ margin: 0, color: "#0f172a", fontSize: "1.25rem", display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>📦</span> {selectedHistoryItem.name} History
                </h3>
                <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "14px" }}>
                  ITEM-{String(selectedHistoryItem.id).padStart(3, '0')} • Current Stock: {Number(selectedHistoryItem.currentStock).toFixed(2)} {selectedHistoryItem.unit}
                </p>
              </div>
              <button onClick={() => setSelectedHistoryItem(null)} style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", padding: "8px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }} onMouseEnter={(e) => { e.currentTarget.style.background = "#e2e8f0"; e.currentTarget.style.color = "#475569"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#94a3b8"; }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            <div style={{ padding: "24px", overflowY: "auto", flex: 1 }}>
              {historyLoading ? (
                <div style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>Loading history...</div>
              ) : historyData.length === 0 ? (
                <div style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>No stock history found for this item.</div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                      <th style={{ padding: "12px", textAlign: "left", color: "#475569", fontWeight: "600", fontSize: "13px", textTransform: "uppercase" }}>Date</th>
                      <th style={{ padding: "12px", textAlign: "left", color: "#475569", fontWeight: "600", fontSize: "13px", textTransform: "uppercase" }}>Type</th>
                      <th style={{ padding: "12px", textAlign: "right", color: "#475569", fontWeight: "600", fontSize: "13px", textTransform: "uppercase" }}>Qty</th>
                      <th style={{ padding: "12px", textAlign: "right", color: "#475569", fontWeight: "600", fontSize: "13px", textTransform: "uppercase" }}>Balance</th>
                      <th style={{ padding: "12px", textAlign: "left", color: "#475569", fontWeight: "600", fontSize: "13px", textTransform: "uppercase" }}>Reason/Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyData.map((h, i) => {
                      const isAdd = h.type === "Add";
                      return (
                        <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "12px", fontSize: "14px", color: "#334155" }}>
                            {new Date(h.createdAt).toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit' })}
                          </td>
                          <td style={{ padding: "12px" }}>
                            <span style={{ 
                              background: isAdd ? "#f0fdf4" : "#fef2f2", 
                              color: isAdd ? "#16a34a" : "#dc2626", 
                              padding: "4px 8px", borderRadius: "6px", fontSize: "12px", fontWeight: "600" 
                            }}>
                              {isAdd ? "➕ IN" : "➖ OUT"}
                            </span>
                          </td>
                          <td style={{ padding: "12px", textAlign: "right", fontWeight: "600", color: isAdd ? "#16a34a" : "#dc2626" }}>
                            {isAdd ? "+" : "-"}{Number(h.adjustment).toFixed(2)}
                          </td>
                          <td style={{ padding: "12px", textAlign: "right", fontWeight: "700", color: "#0f172a" }}>
                            {Number(h.newStock).toFixed(2)}
                          </td>
                          <td style={{ padding: "12px", fontSize: "14px", color: "#64748b" }}>
                            <div style={{ fontWeight: "600", color: "#334155", marginBottom: "2px" }}>{h.reason}</div>
                            {h.remarks && <div style={{ fontSize: "12px" }}>{h.remarks}</div>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CurrentStock;
