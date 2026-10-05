import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";
import ExportButtons from "../../../components/ExportButtons";

const StockAdjustments = () => {
  const navigate = useNavigate();
  const [adjustments, setAdjustments] = useState([]);
  const [summary, setSummary] = useState({ totalRecords: 0, stockAdded: 0, stockRemoved: 0 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
  });

  const loadAdjustments = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (filters.startDate) query.append("startDate", filters.startDate);
      if (filters.endDate) query.append("endDate", filters.endDate);
      
      const res = await api.get(`/admin/stock-adjustments?${query.toString()}`);
      setAdjustments(res.data.adjustments);
      setSummary(res.data.summary);
    } catch (error) {
      console.error("Failed to load adjustments", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdjustments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = () => {
    loadAdjustments();
  };

  const handleClear = () => {
    setFilters({ startDate: "", endDate: "" });
    setTimeout(loadAdjustments, 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return `${d.toLocaleDateString("en-GB")} ${d.toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <button onClick={() => window.history.back()} style={{ background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1", padding: "8px 12px", borderRadius: "6px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.background = "#e2e8f0"} onMouseLeave={(e) => e.currentTarget.style.background = "#f1f5f9"}>
            <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="18" width="18" xmlns="http://www.w3.org/2000/svg"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
          </button>
        </div>
        <div>
          <ExportButtons tableId="stock-adjustments-table" filename="Stock_Adjustments" title="Stock Adjustments History" />
        </div>
      </div>

      {/* Filter Section */}
      <div style={{ background: "#fff", borderRadius: "8px", border: "1px solid #e2e8f0", padding: "16px", marginBottom: "16px" }}>
        <h3 style={{ margin: "0 0 12px 0", fontSize: "14px", color: "#334155", display: "flex", alignItems: "center", gap: "8px" }}>
          <span>🔍</span> Filter Adjustments
        </h3>
        <div style={{ display: "flex", gap: "16px", alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ flex: "1", minWidth: "150px" }}>
            <label style={{ display: "block", fontSize: "12px", color: "#64748b", marginBottom: "4px", fontWeight: "600" }}>Start Date</label>
            <input 
              type="date" 
              value={filters.startDate}
              onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
              style={{ width: "100%", padding: "8px", border: "1px solid #cbd5e1", borderRadius: "6px", outline: "none", boxSizing: "border-box", fontSize: "13px" }}
            />
          </div>
          <div style={{ flex: "1", minWidth: "150px" }}>
            <label style={{ display: "block", fontSize: "12px", color: "#64748b", marginBottom: "4px", fontWeight: "600" }}>End Date</label>
            <input 
              type="date" 
              value={filters.endDate}
              onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
              style={{ width: "100%", padding: "8px", border: "1px solid #cbd5e1", borderRadius: "6px", outline: "none", boxSizing: "border-box", fontSize: "13px" }}
            />
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button 
              onClick={handleSearch}
              style={{ background: "#2e6f40", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", fontWeight: "600", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}
            >
              🔍 Search
            </button>
            <button 
              onClick={handleClear}
              style={{ background: "#64748b", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", fontWeight: "600", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}
            >
              ✕ Clear
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "16px" }}>
        <div style={{ background: "#fff", borderRadius: "8px", border: "1px solid #e2e8f0", padding: "12px 16px" }}>
          <h3 style={{ margin: "0 0 6px 0", fontSize: "13px", color: "#334155", display: "flex", alignItems: "center", gap: "6px" }}>
            <span>📋</span> Total Records
          </h3>
          <div style={{ fontSize: "22px", fontWeight: "800", color: "#2e6f40" }}>{summary.totalRecords}</div>
          <p style={{ margin: "2px 0 0 0", fontSize: "11px", color: "#64748b" }}>adjustment records found</p>
        </div>
        <div style={{ background: "#fff", borderRadius: "8px", border: "1px solid #e2e8f0", padding: "12px 16px" }}>
          <h3 style={{ margin: "0 0 6px 0", fontSize: "13px", color: "#334155", display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ color: "#16a34a" }}>➕</span> Stock Added
          </h3>
          <div style={{ fontSize: "22px", fontWeight: "800", color: "#16a34a" }}>{summary.stockAdded.toFixed(2)}</div>
          <p style={{ margin: "2px 0 0 0", fontSize: "11px", color: "#64748b" }}>total quantity added</p>
        </div>
        <div style={{ background: "#fff", borderRadius: "8px", border: "1px solid #e2e8f0", padding: "12px 16px" }}>
          <h3 style={{ margin: "0 0 6px 0", fontSize: "13px", color: "#334155", display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ color: "#dc2626" }}>➖</span> Stock Removed
          </h3>
          <div style={{ fontSize: "22px", fontWeight: "800", color: "#dc2626" }}>{summary.stockRemoved.toFixed(2)}</div>
          <p style={{ margin: "2px 0 0 0", fontSize: "11px", color: "#64748b" }}>total quantity removed</p>
        </div>
      </div>

      {/* Adjustments Table */}
      <section className="cattle-table-card">
        <div className="panel-heading" style={{ padding: "16px" }}>
          <h3 style={{ margin: 0 }}>Stock Adjustments History</h3>
        </div>
        <div className="table-wrap">
          <table id="stock-adjustments-table">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Item Details</th>
                <th>Type</th>
                <th>Previous Stock</th>
                <th>Adjustment</th>
                <th>New Stock</th>
                <th>Reason & Remarks</th>
                <th>Created By</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="8" style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>Loading history...</td></tr>
              ) : adjustments.length === 0 ? (
                <tr><td colSpan="8" style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>No adjustment records found.</td></tr>
              ) : (
                adjustments.map((adj) => (
                  <tr key={adj.id}>
                    <td data-label="Date & Time" style={{ fontWeight: "600" }}>
                      {formatDate(adj.createdAt)}
                    </td>
                    <td data-label="Item Details">
                      <div style={{ fontWeight: "bold" }}>{adj.item?.name || "Unknown Item"}</div>
                      <div style={{ fontSize: "12px", color: "#64748b" }}>ITEM-{String(adj.itemId).padStart(3, '0')} | Unit: {adj.item?.unit || "-"}</div>
                    </td>
                    <td data-label="Type">
                      {adj.type === "Add" ? (
                        <span style={{ color: "#16a34a", fontWeight: "bold" }}>+ Add</span>
                      ) : (
                        <span style={{ color: "#dc2626", fontWeight: "bold" }}>- Remove</span>
                      )}
                    </td>
                    <td data-label="Previous Stock" style={{ fontWeight: "600" }}>
                      {Number(adj.previousStock).toFixed(2)} <span style={{ fontSize: "11px", color: "#94a3b8" }}>{adj.item?.unit}</span>
                    </td>
                    <td data-label="Adjustment" style={{ fontWeight: "700", color: adj.type === "Add" ? "#16a34a" : "#dc2626" }}>
                      {adj.type === "Add" ? "+" : "-"} {Number(adj.adjustment).toFixed(2)} <span style={{ fontSize: "11px", color: "#94a3b8" }}>{adj.item?.unit}</span>
                    </td>
                    <td data-label="New Stock" style={{ fontWeight: "700" }}>
                      {Number(adj.newStock).toFixed(2)} <span style={{ fontSize: "11px", color: "#94a3b8" }}>{adj.item?.unit}</span>
                    </td>
                    <td data-label="Reason & Remarks">
                      <div style={{ fontWeight: "600", marginBottom: "4px" }}>Reason: {adj.reason}</div>
                      <div style={{ fontSize: "12px", color: "#64748b" }}>Remarks: {adj.remarks || "-"}</div>
                    </td>
                    <td data-label="Created By" style={{ fontWeight: "600" }}>
                      {adj.createdBy}
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

export default StockAdjustments;
