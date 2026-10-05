import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";

const EditMilk = () => {
  const navigate = useNavigate();
  const recordId = window.location.pathname.split("/").pop();
  
  const [record, setRecord] = useState(null);
  const [morningMilk, setMorningMilk] = useState("");
  const [eveningMilk, setEveningMilk] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ text: "", type: "" });

  const showToast = (text, type = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast({ text: "", type: "" }), 4000);
  };

  useEffect(() => {
    const fetchRecord = async () => {
      try {
        const res = await api.get(`/admin/milk/${recordId}`);
        setRecord(res.data);
        setMorningMilk(res.data.morningMilk != null ? String(res.data.morningMilk) : "");
        setEveningMilk(res.data.eveningMilk != null ? String(res.data.eveningMilk) : "");
      } catch (err) {
        showToast("Failed to fetch milk record.", "error");
      }
    };
    fetchRecord();
  }, [recordId]);

  const total = (parseFloat(morningMilk) || 0) + (parseFloat(eveningMilk) || 0);

  const handleUpdate = async () => {
    setSaving(true);
    try {
      await api.put(`/admin/milk/${recordId}`, {
        morningMilk: morningMilk || "0",
        eveningMilk: eveningMilk || "0"
      });
      // Small delay so user sees success before routing
      showToast("✅ Record updated successfully!");
      setTimeout(() => {
        navigate("/admin/cow-milk");
      }, 1000);
    } catch {
      showToast("Failed to update record.", "error");
      setSaving(false);
    }
  };

  if (!record) return <div style={{ padding: "2rem", textAlign: "center" }}>Loading...</div>;

  return (
    <div style={{ padding: "0px" }}>
      {/* Toast */}
      {toast.text && (
        <div style={{
          position: "fixed", top: 18, right: 18, zIndex: 9999,
          background: toast.type === "error" ? "#fef2f2" : "#e8f5ee",
          border: `1px solid ${toast.type === "error" ? "#fca5a5" : "#b7e0c8"}`,
          color: toast.type === "error" ? "#dc2626" : "#146C43",
          borderRadius: 8, padding: "10px 16px",
          fontWeight: 600, fontSize: 14,
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        }}>
          {toast.text}
        </div>
      )}

      {/* Header */}
      <div style={{ background: "#eab308", color: "#1a2e26", padding: "16px", borderTopLeftRadius: "12px", borderTopRightRadius: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={() => navigate(-1)} style={{ background: "rgba(0,0,0,0.1)", border: "none", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "14px", fontWeight: "bold", color: "#1a2e26", display: "flex", alignItems: "center", gap: "6px" }}>
          ← Back
        </button>
        <div style={{ fontWeight: "bold", fontSize: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
          <span>✏️</span> Edit Milk Production Record
        </div>
        <div style={{ width: "80px" }}></div> {/* Placeholder to keep center alignment */}
      </div>

      <div style={{ background: "#fff", padding: "24px", borderBottomLeftRadius: "12px", borderBottomRightRadius: "12px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
        
        {/* Animal Information */}
        <div style={{ marginBottom: "24px", borderLeft: "4px solid #198754", paddingLeft: "16px" }}>
          <h4 style={{ color: "#198754", display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", marginTop: 0 }}>
            <span style={{ fontSize: "20px" }}>🐄</span> Animal Information
          </h4>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
            <div>
              <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Animal Name</div>
              <div style={{ fontWeight: "bold", color: "#1a2e26" }}>{record.cow?.name || "Unknown"}</div>
            </div>
            <div>
              <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Registration No</div>
              <div style={{ display: "inline-block", background: "#64748b", color: "#fff", fontSize: "12px", padding: "2px 8px", borderRadius: "12px" }}>
                {record.cow?.regNo || record.cow?.tagNo || "N/A"}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Animal Type</div>
              <div style={{ display: "inline-block", background: "#0ea5e9", color: "#fff", fontSize: "12px", padding: "2px 8px", borderRadius: "12px" }}>
                {record.cow?.animalType || "Cow"}
              </div>
            </div>
          </div>
          <div style={{ marginTop: "16px" }}>
            <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Record Date</div>
            <div style={{ fontWeight: "600", color: "#1a2e26" }}>
              {new Date(record.recordDate).toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
            </div>
          </div>
        </div>

        {/* Milk Quantities */}
        <div style={{ marginTop: "32px" }}>
          <h4 style={{ color: "#198754", display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", marginTop: 0 }}>
            <span style={{ fontSize: "20px" }}>💧</span> Milk Quantities
          </h4>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
            
            {/* Morning */}
            <div>
              <div style={{ color: "#0ea5e9", fontWeight: "600", marginBottom: "8px", display: "flex", alignItems: "center", gap: "4px" }}>
                🔆 Morning Milk
              </div>
              <div style={{ display: "flex", alignItems: "stretch", marginBottom: "12px" }}>
                <input 
                  type="number" 
                  min="0" step="0.01"
                  value={morningMilk}
                  onChange={(e) => setMorningMilk(e.target.value)}
                  placeholder="Enter morning milk quantity"
                  style={{ flex: 1, padding: "10px", border: "1px solid #cbd5e1", borderTopLeftRadius: "6px", borderBottomLeftRadius: "6px", outline: "none" }}
                />
                <div style={{ background: "#198754", color: "#fff", padding: "10px 16px", borderTopRightRadius: "6px", borderBottomRightRadius: "6px", fontWeight: "600", display: "flex", alignItems: "center" }}>
                  Liters
                </div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
                <span style={{ fontSize: "12px", color: "#64748b" }}>Quick input:</span>
                {[2, 3, 4, 5, 6, 8, 10].map(val => (
                  <button key={val} 
                    type="button" 
                    onClick={() => setMorningMilk(val)} style={{ background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1", padding: "4px 8px", borderRadius: "4px", cursor: "pointer", fontSize: "12px", transition: "all 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.background = "#e2e8f0"} onMouseLeave={(e) => e.currentTarget.style.background = "#f1f5f9"}>
                    {val}
                  </button>
                ))}
              </div>
            </div>

            {/* Evening */}
            <div>
              <div style={{ color: "#eab308", fontWeight: "600", marginBottom: "8px", display: "flex", alignItems: "center", gap: "4px" }}>
                🌙 Evening Milk
              </div>
              <div style={{ display: "flex", alignItems: "stretch", marginBottom: "12px" }}>
                <input 
                  type="number" 
                  min="0" step="0.01"
                  value={eveningMilk}
                  onChange={(e) => setEveningMilk(e.target.value)}
                  placeholder="Enter evening milk quantity"
                  style={{ flex: 1, padding: "10px", border: "1px solid #cbd5e1", borderTopLeftRadius: "6px", borderBottomLeftRadius: "6px", outline: "none" }}
                />
                <div style={{ background: "#198754", color: "#fff", padding: "10px 16px", borderTopRightRadius: "6px", borderBottomRightRadius: "6px", fontWeight: "600", display: "flex", alignItems: "center" }}>
                  Liters
                </div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
                <span style={{ fontSize: "12px", color: "#64748b" }}>Quick input:</span>
                {[2, 3, 4, 5, 6, 8, 10].map(val => (
                  <button key={val} 
                    type="button" 
                    onClick={() => setEveningMilk(val)} style={{ background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1", padding: "4px 8px", borderRadius: "4px", cursor: "pointer", fontSize: "12px", transition: "all 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.background = "#e2e8f0"} onMouseLeave={(e) => e.currentTarget.style.background = "#f1f5f9"}>
                    {val}
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Total */}
          <div style={{ background: "#22c55e", color: "#fff", padding: "24px", borderRadius: "8px", textAlign: "center", marginTop: "32px" }}>
            <div style={{ fontSize: "12px", fontWeight: "600", marginBottom: "8px", textTransform: "uppercase" }}>Total Milk Production</div>
            <div style={{ fontSize: "42px", fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", lineHeight: "1" }}>
              {total.toFixed(2)}
            </div>
            <div style={{ fontSize: "14px", marginTop: "4px" }}>Liters</div>
          </div>

          <div style={{ textAlign: "center", marginTop: "16px" }}>

          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "40px", paddingTop: "20px", borderTop: "1px solid #e2e8f0" }}>
          <button type="button"
            onClick={() => window.history.back()} style={{ background: "#fff", color: "#475569", border: "1px solid #cbd5e1", padding: "10px 20px", borderRadius: "8px", fontWeight: 600, cursor: "pointer" }}>
            Cancel
          </button>
          <button 
            type="button"
            onClick={handleUpdate}
            disabled={saving}
            style={{ padding: "10px 32px", border: "none", background: "#198754", color: "#fff", borderRadius: "6px", fontWeight: "bold", fontSize: "16px", cursor: "pointer" }}
          >
            {saving ? "Updating..." : "Update Record"}
          </button>
        </div>

      </div>
    </div>
  );
};

export default EditMilk;
