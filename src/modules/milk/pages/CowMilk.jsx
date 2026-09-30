import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";
import { useConfirm } from "../../../context/ConfirmContext";
import { hasPermission } from "../../../utils/permissions";
import ExportButtons from "../../../components/ExportButtons";
import StaffMilkReportEntry from "../../milk-admin/pages/StaffMilkReportEntry";
import UserMilkOrder from "../../orders/pages/UserMilkOrder";

const ANIMAL_TYPES = ["All", "Cow", "Buffalo", "Goat", "Sheep", "Other"];

const uiIcons = {
  cow: "🐄",
  sun: "🔆",
  moon: "🌙",
  avg: "📉",
  edit: "✏️",
  delete: "🗑️"
};

const CowMilk = () => {
  const navigate = useNavigate();
  const [animalType, setAnimalType] = useState("All");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState([]);
  const [cows, setCows] = useState([]);
  const [toast, setToast] = useState({ text: "", type: "" });
  const { confirm } = useConfirm();

  const adminData = JSON.parse(localStorage.getItem("adminData") || "{}");
  const canAdd = hasPermission(adminData, "milk", "add");
  const canEdit = hasPermission(adminData, "milk", "edit");
  const canDelete = hasPermission(adminData, "milk", "delete");

  const showToast = (text, type = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast({ text: "", type: "" }), 4000);
  };

  const handleSearch = useCallback(async () => {
    if (adminData.role === 'CUSTOM') return;
    setLoading(true);
    setToast({ text: "", type: "" });
    try {
      const [cowsRes, milkRes] = await Promise.all([
        api.get("/api/admin/cows"),
        api.get(`/api/admin/milk/daily?date=${selectedDate}`)
      ]);
      
      let activeCows = cowsRes.data.filter((c) => c.status === "Active" && c.isActiveForMilk);
      setCows(activeCows);
      
      let milkData = milkRes.data;
      if (animalType !== "All") {
        const typeCows = activeCows.filter(c => (c.animalType || "").toLowerCase() === animalType.toLowerCase());
        const cowIds = typeCows.map(c => c.id);
        milkData = milkData.filter(m => cowIds.includes(m.cowId));
      }
      
      setRecords(milkData);
    } catch {
      showToast("Failed to load data.", "error");
    } finally {
      setLoading(false);
    }
  }, [selectedDate, animalType, adminData.role]);

  useEffect(() => {
    handleSearch();
  }, [handleSearch]);

  const handleDelete = async (recordId) => {
    const isConfirmed = await confirm("Are you sure you want to delete this milk record?");
    if (!isConfirmed) return;
    try {
      await api.delete(`/api/admin/milk/${recordId}`);
      showToast("Record deleted successfully!");
      handleSearch();
    } catch {
      showToast("Failed to delete record.", "error");
    }
  };

  const stats = useMemo(() => {
    let morning = 0;
    let evening = 0;
    records.forEach(r => {
      morning += parseFloat(r.morningMilk) || 0;
      evening += parseFloat(r.eveningMilk) || 0;
    });
    const total = morning + evening;
    const isTotalOnly = records.length === 1 && records[0].isTotalOnly;
    const avg = !isTotalOnly && records.length ? (total / records.length) : 0;
    return {
      totalAnimals: isTotalOnly ? 0 : records.length,
      morningMilk: morning.toFixed(2),
      eveningMilk: evening.toFixed(2),
      average: avg.toFixed(2)
    };
  }, [records]);

  if (adminData.role === 'CUSTOM') {
    const isUser = adminData.name?.toLowerCase().includes('user') || adminData.customRole?.name?.toLowerCase().includes('user');
    if (isUser) {
      return <UserMilkOrder />;
    }
    return <StaffMilkReportEntry />;
  }

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

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <h2 style={{ fontSize: "24px", fontWeight: "bold", color: "#1a2e26", margin: 0 }}>Milk Records Management</h2>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <ExportButtons tableId="milk-records-table" filename="Milk_Records" title="Milk Records" />
          {canAdd && (
            <button 
              className="primary" 
              style={{ padding: "8px 16px", borderRadius: "8px", fontWeight: "bold", background: "#198754", color: "white", border: "none", cursor: "pointer" }}
              onClick={() => navigate("/admin/cow-milk/add")}
            >
              + New Entry
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "16px" }}>
        <div style={{ background: "#fff", padding: "20px", borderRadius: "12px", display: "flex", alignItems: "center", gap: "16px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)", borderLeft: "4px solid #198754" }}>
          <div style={{ fontSize: "28px", background: "#e8f5ee", padding: "12px", borderRadius: "50%" }}>{uiIcons.cow}</div>
          <div>
            <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>Total Animals</div>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#1a2e26" }}>{stats.totalAnimals}</div>
          </div>
        </div>
        <div style={{ background: "#fff", padding: "20px", borderRadius: "12px", display: "flex", alignItems: "center", gap: "16px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)", borderLeft: "4px solid #0ea5e9" }}>
          <div style={{ fontSize: "28px", background: "#e0f2fe", padding: "12px", borderRadius: "50%" }}>{uiIcons.sun}</div>
          <div>
            <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>Morning Milk</div>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#1a2e26" }}>{stats.morningMilk} L</div>
          </div>
        </div>
        <div style={{ background: "#fff", padding: "20px", borderRadius: "12px", display: "flex", alignItems: "center", gap: "16px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)", borderLeft: "4px solid #eab308" }}>
          <div style={{ fontSize: "28px", background: "#fef9c3", padding: "12px", borderRadius: "50%" }}>{uiIcons.moon}</div>
          <div>
            <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>Evening Milk</div>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#1a2e26" }}>{stats.eveningMilk} L</div>
          </div>
        </div>
        <div style={{ background: "#fff", padding: "20px", borderRadius: "12px", display: "flex", alignItems: "center", gap: "16px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)", borderLeft: "4px solid #22c55e" }}>
          <div style={{ fontSize: "28px", background: "#dcfce7", padding: "12px", borderRadius: "50%" }}>{uiIcons.avg}</div>
          <div>
            <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>Average per Animal</div>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#1a2e26" }}>{stats.average} L</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      {adminData.role !== 'CUSTOM' && (
      <section className="cattle-toolbar">
        <h3 style={{ fontSize: "16px", color: "#198754", fontWeight: "bold", display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
          <span>🔍</span> Filter Records
        </h3>
        <div className="cattle-toolbar-actions">
          <select value={animalType} onChange={(e) => setAnimalType(e.target.value)}>
            {ANIMAL_TYPES.map((t) => <option key={t} value={t}>{t === "All" ? "All Animals" : t}</option>)}
          </select>
          <input 
            type="date" 
            value={selectedDate} 
            onChange={(e) => setSelectedDate(e.target.value)} 
          />
        </div>
      </section>
      )}

      {/* Desktop Table */}
      {adminData.role !== 'CUSTOM' && (
      <section className="cattle-table-card cow-milk-table-desktop">
        <div className="table-wrap">
          <table id="milk-records-table" style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr>
                <th>Animal</th>
                <th>Registration</th>
                <th>Date</th>
                <th>Morning</th>
                <th>Evening</th>
                <th>Total</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" style={{ textAlign: "center", padding: "2rem" }}>Loading...</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: "center", padding: "2rem" }}>No records found for this date.</td></tr>
              ) : (
                records.map((rec) => {
                  const cow = cows.find(c => c.id === rec.cowId) || {};
                  const m = parseFloat(rec.morningMilk) || 0;
                  const e = parseFloat(rec.eveningMilk) || 0;
                  const total = m + e;
                  return (
                    <tr key={rec.id} style={{ borderBottom: "1px solid #e2e8f0", background: "#fff" }}>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ color: "#198754", fontSize: "18px" }}>{uiIcons.cow}</span>
                          <div>
                            <div style={{ fontWeight: "bold", color: "#1a2e26" }}>{cow.name || "Unknown"}</div>
                            <span style={{ fontSize: "10px", background: "#e0f2fe", color: "#0ea5e9", padding: "2px 6px", borderRadius: "12px", fontWeight: "600" }}>{cow.animalType || "Cow"}</span>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px", color: "#64748b" }}>{cow.regNo || cow.tagNo || "-"}</td>
                      <td style={{ padding: "12px 16px", color: "#64748b" }}>
                        {new Date(selectedDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).replace(/ /g, "-")}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ border: "1px solid #0ea5e9", color: "#0ea5e9", padding: "4px 12px", borderRadius: "6px", fontWeight: "600", display: "inline-block", minWidth: "60px", textAlign: "center" }}>
                          {m > 0 ? `${m.toFixed(2)} L` : "- L"}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ border: "1px solid #eab308", color: "#eab308", padding: "4px 12px", borderRadius: "6px", fontWeight: "600", display: "inline-block", minWidth: "60px", textAlign: "center" }}>
                          {e > 0 ? `${e.toFixed(2)} L` : "- L"}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ border: "1px solid #22c55e", color: "#22c55e", padding: "4px 12px", borderRadius: "6px", fontWeight: "600", display: "inline-block", minWidth: "60px", textAlign: "center" }}>
                          {total > 0 ? `${total.toFixed(2)} L` : "- L"}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                          {canEdit && (
                            <button type="button"
                              style={{ background: "#fef9c3", color: "#a16207", border: "1px solid #fde68a", padding: "4px 10px", borderRadius: "4px", cursor: "pointer", fontSize: "14px", fontWeight: "600" }}
                              onClick={() => window.location.href = `/admin/cow-milk/edit/${rec.id}`}>
                              ✏️
                            </button>
                          )}
                          {canDelete && (
                            <button type="button"
                              style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fca5a5", padding: "4px 10px", borderRadius: "4px", cursor: "pointer", fontSize: "14px", fontWeight: "600" }}
                              onClick={() => handleDelete(rec.id)}>
                              🗑️
                            </button>
                          )}
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
      )}

      {/* Mobile Cards */}
      {adminData.role !== 'CUSTOM' && (
      <section className="cow-milk-cards-mobile" style={{ display: "none" }}>
        {loading ? (
          <p style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>Loading...</p>
        ) : records.length === 0 ? (
          <p style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>No records found for this date.</p>
        ) : (
          records.map((rec) => {
            const cow = cows.find(c => c.id === rec.cowId) || {};
            const m = parseFloat(rec.morningMilk) || 0;
            const e = parseFloat(rec.eveningMilk) || 0;
            const total = m + e;
            return (
              <div key={rec.id} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "16px", marginBottom: "12px" }}>
                {/* Animal Header */}
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

                {/* Date */}
                <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "10px" }}>
                  📅 {new Date(selectedDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).replace(/ /g, "-")}
                </div>

                {/* Milk Values */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "14px" }}>
                  <div style={{ background: "#eff6ff", borderRadius: "8px", padding: "10px", textAlign: "center" }}>
                    <div style={{ fontSize: "11px", color: "#0ea5e9", fontWeight: "bold", marginBottom: "4px" }}>☀️ MORNING</div>
                    <div style={{ fontWeight: "bold", color: "#0ea5e9", fontSize: "15px" }}>{m > 0 ? `${m.toFixed(2)} L` : "—"}</div>
                  </div>
                  <div style={{ background: "#fefce8", borderRadius: "8px", padding: "10px", textAlign: "center" }}>
                    <div style={{ fontSize: "11px", color: "#eab308", fontWeight: "bold", marginBottom: "4px" }}>🌙 EVENING</div>
                    <div style={{ fontWeight: "bold", color: "#eab308", fontSize: "15px" }}>{e > 0 ? `${e.toFixed(2)} L` : "—"}</div>
                  </div>
                  <div style={{ background: "#f0fdf4", borderRadius: "8px", padding: "10px", textAlign: "center" }}>
                    <div style={{ fontSize: "11px", color: "#22c55e", fontWeight: "bold", marginBottom: "4px" }}>📊 TOTAL</div>
                    <div style={{ fontWeight: "bold", color: "#22c55e", fontSize: "15px" }}>{total > 0 ? `${total.toFixed(2)} L` : "—"}</div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <button type="button"
                    onClick={() => window.history.back()} style={{ background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1", padding: "8px 12px", borderRadius: "6px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.background = "#e2e8f0"} onMouseLeave={(e) => e.currentTarget.style.background = "#f1f5f9"}>
  <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="18" width="18" xmlns="http://www.w3.org/2000/svg"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
</button>
                </div>
              </div>
            );
          })
        )}
      </section>
      )}
    </section>
  );
};

export default CowMilk;
