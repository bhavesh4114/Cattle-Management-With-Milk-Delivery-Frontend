import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";

const ManualAdjustment = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const adminData = JSON.parse(localStorage.getItem("adminData") || "{}");

  const [formData, setFormData] = useState({
    itemId: "",
    type: "",
    adjustment: "",
    reason: "",
    remarks: "",
    date: new Date().toISOString().split("T")[0],
    createdBy: adminData.name || "admin"
  });

  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true);
      try {
        const res = await api.get("/admin/items");
        setItems(res.data);
      } catch (err) {
        console.error("Failed to load items", err);
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.itemId) return setError("Please select an item");
    if (!formData.type) return setError("Please select adjustment type");
    if (!formData.adjustment || Number(formData.adjustment) <= 0) return setError("Please enter a valid quantity");
    if (!formData.reason) return setError("Please provide a reason for adjustment");

    setSaving(true);
    setError("");

    try {
      await api.post("/admin/stock-adjustments", {
        ...formData,
        adjustment: Number(formData.adjustment)
      });
      navigate("/admin/stock-adjustments");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save adjustment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <h2 style={{ margin: 0, color: "#1e293b", fontSize: "24px", fontWeight: "700" }}>Manual Stock Adjustment</h2>
        </div>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button type="button"
            onClick={() => window.history.back()} style={{ background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1", padding: "8px 12px", borderRadius: "6px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.background = "#e2e8f0"} onMouseLeave={(e) => e.currentTarget.style.background = "#f1f5f9"}>
  <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="18" width="18" xmlns="http://www.w3.org/2000/svg"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
</button>
        </div>
      </div>

      <div style={{ background: "#fff", borderRadius: "8px", border: "1px solid #e2e8f0", padding: "20px", width: "100%" }}>
        {error && (
          <div style={{ background: "#fef2f2", color: "#dc2626", padding: "10px", borderRadius: "6px", marginBottom: "16px", border: "1px solid #fca5a5", fontWeight: "600" }}>
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          {/* Item Info */}
          <h3 style={{ margin: "0 0 12px 0", fontSize: "15px", color: "#1e293b", display: "flex", alignItems: "center", gap: "8px", borderBottom: "1px solid #e2e8f0", paddingBottom: "8px" }}>
            <span>📦</span> Item Information
          </h3>
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>Item *</label>
            <select
              name="itemId"
              value={formData.itemId}
              onChange={handleChange}
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px", outline: "none", backgroundColor: "#fff" }}
              required
            >
              <option value="">-- Select Item --</option>
              {items.map(item => (
                <option key={item.id} value={item.id}>
                  {item.name} (Current Stock: {item.currentStock} {item.unit})
                </option>
              ))}
            </select>
          </div>

          {/* Adjustment Details */}
          <h3 style={{ margin: "0 0 12px 0", fontSize: "15px", color: "#1e293b", display: "flex", alignItems: "center", gap: "8px", borderBottom: "1px solid #e2e8f0", paddingBottom: "8px" }}>
            <span>⚖️</span> Adjustment Details
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>Adjustment Type *</label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px", outline: "none", backgroundColor: "#fff" }}
                required
              >
                <option value="">-- Select Type --</option>
                <option value="Add">➕ Add (Increase Stock)</option>
                <option value="Remove">➖ Remove (Decrease Stock)</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>Quantity *</label>
              <input
                type="number"
                name="adjustment"
                value={formData.adjustment}
                onChange={handleChange}
                min="0.01" step="0.01"
                placeholder="0"
                style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
                required
              />
            </div>
          </div>

          {/* Notes & Details */}
          <h3 style={{ margin: "0 0 12px 0", fontSize: "15px", color: "#1e293b", display: "flex", alignItems: "center", gap: "8px", borderBottom: "1px solid #e2e8f0", paddingBottom: "8px" }}>
            <span>📝</span> Notes & Details
          </h3>
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>Reason for Adjustment *</label>
            <input
              type="text"
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              placeholder="e.g. Damaged goods, Counting error, Stock correction, etc."
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
              required
            />
          </div>
          <div style={{ marginBottom: "24px" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>Additional Remarks</label>
            <textarea
              name="remarks"
              value={formData.remarks}
              onChange={handleChange}
              placeholder="Any additional details about this adjustment..."
              rows="2"
              style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px", outline: "none", resize: "vertical", boxSizing: "border-box" }}
            />
          </div>

          {/* User Info */}
          <h3 style={{ margin: "0 0 12px 0", fontSize: "15px", color: "#1e293b", display: "flex", alignItems: "center", gap: "8px", borderBottom: "1px solid #e2e8f0", paddingBottom: "8px" }}>
            <span>👤</span> User Information
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>Adjustment By</label>
              <input
                type="text"
                value={formData.createdBy}
                disabled
                style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px", outline: "none", background: "#f8fafc", boxSizing: "border-box" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "4px" }}>Adjustment Date</label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                style={{ width: "100%", padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "center", gap: "12px", flexWrap: "wrap" }}>
            <button
              type="submit"
              disabled={saving}
              style={{ background: "#2e6f40", color: "#fff", border: "none", padding: "8px 24px", borderRadius: "6px", cursor: "pointer", fontWeight: "600", fontSize: "14px", display: "flex", alignItems: "center", gap: "8px" }}
            >
              ✓ {saving ? "Applying..." : "Apply Adjustment"}
            </button>
          </div>
        </form>
      </div>

      {/* Footer Instructions */}
      <div style={{ display: "none" }}>
      </div>
      <div style={{ background: "#e0f2fe", border: "1px solid #bae6fd", color: "#0369a1", padding: "12px", borderRadius: "6px", marginTop: "16px", fontSize: "13px", fontWeight: "500", display: "flex", alignItems: "center", gap: "8px" }}>
        <span>ℹ️</span> All stock adjustments are logged in the system and can be reviewed in the Adjustment History.
      </div>
    </div>
  );
};

export default ManualAdjustment;
