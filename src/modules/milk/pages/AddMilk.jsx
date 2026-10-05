import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";

const ANIMAL_TYPES = ["All", "Cow", "Buffalo", "Other"];

const uiIcons = {
  cow: "🐄"
};

const AddMilk = () => {
  const navigate = useNavigate();
  const [animalType, setAnimalType] = useState("All");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

  const [cows, setCows] = useState([]);
  const [savedRecords, setSavedRecords] = useState([]);
  const [entries, setEntries] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searched, setSearched] = useState(false);
  const [toast, setToast] = useState({ text: "", type: "" });

  const showToast = (text, type = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast({ text: "", type: "" }), 4000);
  };

  const handleSearch = useCallback(async () => {
    setLoading(true);
    setToast({ text: "", type: "" });
    setSearched(true);
    try {
      const cowsRes = await api.get("/admin/cows");
      let active = cowsRes.data.filter((c) => {
        const status = c.status || "Active";
        return status.toLowerCase() === "active" && c.isActiveForMilk;
      });
      if (animalType !== "All") {
        active = active.filter(
          (c) => (c.animalType || "").toLowerCase() === animalType.toLowerCase()
        );
      }
      console.log("ALL COWS: ", cowsRes.data.map(c => ({ name: c.name, type: c.animalType, activeForMilk: c.isActiveForMilk, status: c.status })));
      console.log("ACTIVE AFTER FILTER: ", active.map(c => ({ name: c.name, type: c.animalType, activeForMilk: c.isActiveForMilk, status: c.status })));
      setCows(active);

      const milkRes = await api.get(`/admin/milk/daily?date=${selectedDate}`);
      const existing = milkRes.data;
      setSavedRecords(existing);

      const initEntries = {};
      active.forEach((cow) => {
        const rec = existing.find((r) => r.cowId === cow.id);
        initEntries[cow.id] = {
          morningMilk: rec?.morningMilk != null ? String(rec.morningMilk) : "",
          eveningMilk: rec?.eveningMilk != null ? String(rec.eveningMilk) : "",
        };
      });
      setEntries(initEntries);
    } catch {
      showToast("Failed to load data. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  }, [animalType, selectedDate]);

  useEffect(() => { handleSearch(); }, [handleSearch]);

  const handleInputChange = (cowId, field, value) => {
    setEntries((prev) => ({ ...prev, [cowId]: { ...prev[cowId], [field]: value } }));
  };

  const calcTotal = (cowId) => {
    const m = parseFloat(entries[cowId]?.morningMilk) || 0;
    const e = parseFloat(entries[cowId]?.eveningMilk) || 0;
    return (m + e).toFixed(2);
  };

  const clearAll = () => {
    const cleared = {};
    Object.keys(entries).forEach(key => {
      cleared[key] = { morningMilk: "", eveningMilk: "" };
    });
    setEntries(cleared);
  };

  const generateSampleData = () => {
    const sample = {};
    Object.keys(entries).forEach(key => {
      sample[key] = {
        morningMilk: (Math.random() * 5 + 8).toFixed(2),
        eveningMilk: (Math.random() * 4 + 5).toFixed(2)
      };
    });
    setEntries(sample);
  };

  const handleSaveAll = async () => {
    setSaving(true);
    const payload = cows
      .map((cow) => ({
        cowId: cow.id,
        morningMilk: parseFloat(entries[cow.id]?.morningMilk) || null,
        eveningMilk: parseFloat(entries[cow.id]?.eveningMilk) || null,
        totalMilk:
          (parseFloat(entries[cow.id]?.morningMilk) || 0) +
          (parseFloat(entries[cow.id]?.eveningMilk) || 0),
      }))
      .filter((e) => e.morningMilk || e.eveningMilk);

    if (!payload.length) {
      showToast("Please enter at least one milk value.", "error");
      setSaving(false);
      return;
    }
    try {
      await api.post("/admin/milk/daily", { date: selectedDate, entries: payload });
      showToast("✅ Milk entries saved! Feed plan auto-generated for next day.");
      handleSearch();
      setTimeout(() => navigate("/admin/cow-milk"), 1000);
    } catch {
      showToast("Failed to save entries. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  // Compute column totals
  let totalMorning = 0;
  let totalEvening = 0;
  let totalCombined = 0;
  Object.keys(entries).forEach(id => {
    const m = parseFloat(entries[id]?.morningMilk) || 0;
    const e = parseFloat(entries[id]?.eveningMilk) || 0;
    totalMorning += m;
    totalEvening += e;
    totalCombined += m + e;
  });

  return (
    <section className="cattle-page">
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

      {/* Toolbar / Filters */}
      <section className="cattle-toolbar">
        <h3>Milk Entry Management</h3>
        <div className="cattle-toolbar-actions">
          <select
            value={animalType}
            onChange={(e) => setAnimalType(e.target.value)}
          >
            {ANIMAL_TYPES.map((t) => (
              <option key={t} value={t}>{t === "All" ? "All Animals" : t}</option>
            ))}
          </select>
          <input
            type="date"
            max={new Date().toISOString().split("T")[0]}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
          <button type="button" className="primary" onClick={handleSearch} disabled={loading}>
            {loading ? "Searching..." : "Search Animals"}
          </button>
        </div>
      </section>

      {/* Desktop Table Section */}
      <section className="cattle-table-card add-milk-table-desktop" style={{ overflow: "hidden" }}>
        <div className="table-wrap">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#2e6f40", color: "#fff" }}>
                <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: "600" }}>#</th>
                <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: "600" }}>Animal Details</th>
                <th style={{ padding: "12px 16px", textAlign: "center", fontWeight: "600" }}>Registration No</th>
                <th style={{ padding: "12px 16px", textAlign: "center", fontWeight: "600" }}>Morning Milk (Liters)</th>
                <th style={{ padding: "12px 16px", textAlign: "center", fontWeight: "600" }}>Evening Milk (Liters)</th>
                <th style={{ padding: "12px 16px", textAlign: "center", fontWeight: "600" }}>Total Milk</th>
              </tr>
            </thead>
            <tbody>
              {!searched ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", padding: "2rem" }}>
                    Select filters above and click Search Animals to begin.
                  </td>
                </tr>
              ) : loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", padding: "2rem" }}>
                    Loading...
                  </td>
                </tr>
              ) : cows.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", padding: "2rem" }}>
                    No animals found for the selected date and type.
                  </td>
                </tr>
              ) : (
                cows.map((cow, idx) => {
                  const total = parseFloat(calcTotal(cow.id));

                  return (
                    <tr key={cow.id} style={{ borderBottom: "1px solid #e2e8f0", background: idx % 2 === 0 ? "#fff" : "#f8fafc" }}>
                      <td style={{ padding: "12px 16px", fontWeight: "bold" }}>{idx + 1}</td>

                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ color: "#0ea5e9", fontSize: "18px" }}>{uiIcons.cow}</span>
                          <div>
                            <div style={{ fontWeight: "bold", color: "#1a2e26" }}>{cow.name || "Unknown"}</div>
                            <span style={{ fontSize: "11px", color: "#64748b" }}>
                              {cow.animalType || "Cow"}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: "12px 16px", textAlign: "center" }}>
                        <span style={{ background: "#64748b", color: "#fff", padding: "4px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: "bold" }}>
                          {cow.regNo || cow.tagNo || "-"}
                        </span>
                      </td>

                      <td style={{ padding: "12px 16px", textAlign: "center" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", border: "1px solid #cbd5e1", borderRadius: "4px", background: "#fff", overflow: "hidden" }}>
                          <input
                            type="number" min="0" step="0.01"
                            value={entries[cow.id]?.morningMilk ?? ""}
                            onChange={(e) => handleInputChange(cow.id, "morningMilk", e.target.value)}
                            style={{ width: "80px", padding: "8px", border: "none", outline: "none", textAlign: "right" }}
                          />
                          <span style={{ padding: "8px", background: "#f1f5f9", color: "#64748b", borderLeft: "1px solid #cbd5e1", fontSize: "12px" }}>L</span>
                        </div>
                      </td>

                      <td style={{ padding: "12px 16px", textAlign: "center" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", border: "1px solid #cbd5e1", borderRadius: "4px", background: "#fff", overflow: "hidden" }}>
                          <input
                            type="number" min="0" step="0.01"
                            value={entries[cow.id]?.eveningMilk ?? ""}
                            onChange={(e) => handleInputChange(cow.id, "eveningMilk", e.target.value)}
                            style={{ width: "80px", padding: "8px", border: "none", outline: "none", textAlign: "right" }}
                          />
                          <span style={{ padding: "8px", background: "#f1f5f9", color: "#64748b", borderLeft: "1px solid #cbd5e1", fontSize: "12px" }}>L</span>
                        </div>
                      </td>

                      <td style={{ padding: "12px 16px", textAlign: "center", fontWeight: "bold", color: total > 0 ? "#198754" : "#1a2e26" }}>
                        {total.toFixed(2)} L
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
            {/* Footer Row */}
            {cows.length > 0 && !loading && (
              <tfoot>
                <tr style={{ background: "#f8fafc", borderTop: "2px solid #e2e8f0" }}>
                  <td colSpan="3" style={{ padding: "16px", textAlign: "right", fontWeight: "bold" }}>Totals:</td>
                  <td style={{ padding: "16px", textAlign: "center", fontWeight: "bold" }}>{totalMorning.toFixed(2)} L</td>
                  <td style={{ padding: "16px", textAlign: "center", fontWeight: "bold" }}>{totalEvening.toFixed(2)} L</td>
                  <td style={{ padding: "16px", textAlign: "center", fontWeight: "bold", color: "#0ea5e9" }}>{totalCombined.toFixed(2)} L</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Action Buttons Row */}
        {cows.length > 0 && !loading && (
          <div style={{ padding: "16px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", flexWrap: "wrap", gap: "12px", flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={clearAll}
                style={{ border: "1px solid #eab308", color: "#eab308", background: "#fff", padding: "8px 16px", borderRadius: "4px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
              >
                🧹 Clear All
              </button>
              <button
                type="button"
                onClick={generateSampleData}
                style={{ border: "1px solid #0ea5e9", color: "#0ea5e9", background: "#fff", padding: "8px 16px", borderRadius: "4px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
              >
                🧪 Sample Data
              </button>
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>

              <button
                type="button"
                onClick={handleSaveAll}
                disabled={saving}
                style={{ background: "#198754", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "4px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontWeight: "bold" }}
              >
                💾 {saving ? "Saving..." : "Save All Entries"}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Mobile Cards Section */}
      <section className="add-milk-cards-mobile" style={{ display: "none" }}>
        {!searched ? (
          <p style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>
            Select filters above and click Search Animals to begin.
          </p>
        ) : loading ? (
          <p style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>
            Loading...
          </p>
        ) : cows.length === 0 ? (
          <p style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>
            No animals found for the selected date and type.
          </p>
        ) : (
          <div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "16px" }}>
              {cows.map((cow, idx) => {
                const total = parseFloat(calcTotal(cow.id));
                return (
                  <div key={cow.id} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "20px" }}>{uiIcons.cow}</span>
                        <div>
                          <div style={{ fontWeight: "bold", fontSize: "16px", color: "#1a2e26" }}>{cow.name || "Unknown"}</div>
                          <span style={{ fontSize: "11px", background: "#e0f2fe", color: "#0ea5e9", padding: "2px 8px", borderRadius: "12px", fontWeight: "600" }}>{cow.animalType || "Cow"}</span>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "12px", color: "#94a3b8" }}>REG NO</div>
                        <div style={{ fontWeight: "bold", color: "#475569", fontSize: "13px" }}>{cow.regNo || cow.tagNo || "-"}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px", flexWrap: "wrap" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "13px", fontWeight: "bold", color: "#475569" }}>Morning (Liters)</span>
                        <div style={{ display: "inline-flex", alignItems: "center", border: "1px solid #cbd5e1", borderRadius: "4px", background: "#fff", overflow: "hidden" }}>
                          <input
                            type="number" min="0" step="0.01"
                            value={entries[cow.id]?.morningMilk ?? ""}
                            onChange={(e) => handleInputChange(cow.id, "morningMilk", e.target.value)}
                            style={{ width: "80px", padding: "8px", border: "none", outline: "none", textAlign: "right", fontSize: "14px" }}
                          />
                          <span style={{ padding: "8px", background: "#f1f5f9", color: "#64748b", borderLeft: "1px solid #cbd5e1", fontSize: "12px" }}>L</span>
                        </div>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "13px", fontWeight: "bold", color: "#475569" }}>Evening (Liters)</span>
                        <div style={{ display: "inline-flex", alignItems: "center", border: "1px solid #cbd5e1", borderRadius: "4px", background: "#fff", overflow: "hidden" }}>
                          <input
                            type="number" min="0" step="0.01"
                            value={entries[cow.id]?.eveningMilk ?? ""}
                            onChange={(e) => handleInputChange(cow.id, "eveningMilk", e.target.value)}
                            style={{ width: "80px", padding: "8px", border: "none", outline: "none", textAlign: "right", fontSize: "14px" }}
                          />
                          <span style={{ padding: "8px", background: "#f1f5f9", color: "#64748b", borderLeft: "1px solid #cbd5e1", fontSize: "12px" }}>L</span>
                        </div>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "8px", borderTop: "1px dashed #e2e8f0" }}>
                        <span style={{ fontSize: "14px", fontWeight: "bold", color: "#1a2e26" }}>Total</span>
                        <span style={{ fontSize: "16px", fontWeight: "bold", color: total > 0 ? "#198754" : "#1a2e26" }}>{total.toFixed(2)} L</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mobile Action Buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", flexWrap: "wrap" }}>
              <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "10px", border: "1px solid #e2e8f0", marginBottom: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "14px" }}>
                  <span style={{ color: "#64748b" }}>Total Morning:</span>
                  <span style={{ fontWeight: "bold" }}>{totalMorning.toFixed(2)} L</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "14px" }}>
                  <span style={{ color: "#64748b" }}>Total Evening:</span>
                  <span style={{ fontWeight: "bold" }}>{totalEvening.toFixed(2)} L</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "8px", borderTop: "1px dashed #cbd5e1", fontSize: "16px" }}>
                  <span style={{ fontWeight: "bold", color: "#1a2e26" }}>Grand Total:</span>
                  <span style={{ fontWeight: "bold", color: "#0ea5e9" }}>{totalCombined.toFixed(2)} L</span>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <button
                  type="button"
                  onClick={clearAll}
                  style={{ border: "1px solid #eab308", color: "#eab308", background: "#fff", padding: "10px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}
                >
                  🧹 Clear All
                </button>
                <button
                  type="button"
                  onClick={generateSampleData}
                  style={{ border: "1px solid #0ea5e9", color: "#0ea5e9", background: "#fff", padding: "10px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}
                >
                  🧪 Sample Data
                </button>
              </div>

              <button
                type="button"
                onClick={handleSaveAll}
                disabled={saving}
                style={{ background: "#198754", color: "#fff", border: "none", padding: "12px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", width: "100%" }}
              >
                💾 {saving ? "Saving..." : "Save All Entries"}
              </button>
            </div>
          </div>
        )}
      </section>
    </section>
  );
};

export default AddMilk;
