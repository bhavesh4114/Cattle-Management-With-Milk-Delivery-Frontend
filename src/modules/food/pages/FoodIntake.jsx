import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";
import { useConfirm } from "../../../context/ConfirmContext";
import { hasPermission } from "../../../utils/permissions";
import ExportButtons from "../../../components/ExportButtons";

const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric"
  });
};

const uiIcons = { cow: "🐄" };

const FoodIntake = () => {
  const navigate = useNavigate();
  const [intakeRecords, setIntakeRecords] = useState([]);
  const [animalFilter, setAnimalFilter] = useState("All Animals");
  const [loading, setLoading] = useState(false);
  const { confirm, customAlert } = useConfirm();

  // For the History View Modal
  const [selectedView, setSelectedView] = useState(null);

  const adminData = JSON.parse(localStorage.getItem("adminData") || "{}");
  const canAdd = hasPermission(adminData, "intake", "add");
  const canEdit = hasPermission(adminData, "intake", "edit");
  const canDelete = hasPermission(adminData, "intake", "delete");
  
  const loadRecords = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/admin/food-intake");
      setIntakeRecords(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, []);

  const animalTypes = ["Cow", "Buffalo", "Calf"];
  const filteredRecords = animalFilter === "All Animals" 
    ? intakeRecords 
    : intakeRecords.filter(r => (r.cow?.animalType || "Cow") === animalFilter);

  // Group records by Date and Cow, aggregating totals
  const grouped = {};
  filteredRecords.forEach(r => {
    const dateStr = r.recordedAt ? r.recordedAt.split("T")[0] : "no-date";
    const cowId = r.cowId || r.cow?.id || "unknown";
    const key = `${dateStr}_${cowId}`;
    
    if (!grouped[key]) {
      grouped[key] = {
        id: key,
        dateStr: dateStr,
        recordedAt: r.recordedAt,
        cow: r.cow || { name: "Unknown", animalType: "Cow", regNo: "-" },
        records: [], // store all records for this group
        morningTotal: 0,
        afternoonTotal: 0,
        eveningTotal: 0,
        remarks: [],
        recordIds: []
      };
    }
    
    grouped[key].records.push(r);
    
    grouped[key].morningTotal += parseFloat(r.morningIntake) || 0;
    grouped[key].afternoonTotal += parseFloat(r.afternoonIntake) || 0;
    grouped[key].eveningTotal += parseFloat(r.eveningIntake) || 0;
    
    if (r.notes && r.notes.trim() !== "") {
      grouped[key].remarks.push(r.notes);
    }
    grouped[key].recordIds.push(r.id);
  });
  
  const groupedArray = Object.values(grouped).sort((a, b) => new Date(b.recordedAt) - new Date(a.recordedAt));

  const handleDeleteGroup = async (recordIds) => {
    const isConfirmed = await confirm('Delete all feed records for this day?');
    if(isConfirmed) {
      try {
        const promises = recordIds.map(id => api.delete(`/api/admin/food-intake/${id}`));
        await Promise.all(promises);
        loadRecords();
      } catch(e) {
        customAlert('Error deleting records');
      }
    }
  };

  return (
    <div className="cattle-page">
        {/* Top Toolbar */}
        <div className="cattle-toolbar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "15px", background: "#fff", padding: "16px 20px", borderRadius: "12px", boxShadow: "0 2px 4px rgba(0,0,0,0.02)", marginBottom: "20px" }}>
          <div>
            <h3 style={{ margin: 0, color: "#1e293b", fontSize: "1.25rem" }}>Food Intake Records</h3>
            <p style={{ color: "#64748b", fontSize: "0.875rem", marginTop: "4px", marginBottom: "0" }}>View actual daily feed consumption records</p>
          </div>
          
          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
             <select 
               value={animalFilter} 
               onChange={e => setAnimalFilter(e.target.value)}
               style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "8px 12px", borderRadius: "8px", color: "#475569", outline: "none" }}
             >
                <option value="All Animals">All Animals</option>
                {animalTypes.map(type => (
                   <option key={type} value={type}>{type}</option>
                ))}
             </select>
             <button type="button" onClick={() => setAnimalFilter("All Animals")} style={{ background: "#fff", color: "#475569", border: "1px solid #cbd5e1", padding: "8px 16px", borderRadius: "8px", fontWeight: "600", cursor: "pointer", transition: "all 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.background = "#f1f5f9"} onMouseLeave={(e) => e.currentTarget.style.background = "#fff"}>
                Reset
             </button>
             <ExportButtons tableId="food-intake-table" filename="Food_Intake" title="Food Intake Records" />
             {canAdd && (
               <button 
                 onClick={() => navigate("/admin/food-intake/add")}
                 style={{ background: "#1f6b3a", color: "#fff", border: "none", padding: "8px 20px", borderRadius: "8px", fontWeight: "bold", fontSize: "14px", cursor: "pointer", boxShadow: "0 4px 6px -1px rgb(31 107 58 / 0.3)" }}
               >
                 + Add New Record
               </button>
             )}
          </div>
        </div>
        
        {/* Table Card */}
        <section style={{ background: "#fff", borderRadius: "16px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -2px rgba(0,0,0,0.02)", border: "1px solid #f1f5f9", overflowX: "auto", padding: "4px" }}>
          <table id="food-intake-table" style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0", minWidth: "1000px" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                <th style={{ padding: "16px 20px", textAlign: "left", fontWeight: "600", color: "#475569", borderBottom: "2px solid #e2e8f0", width: "50px", borderTopLeftRadius: "12px", textTransform: "uppercase", fontSize: "12px", letterSpacing: "0.05em" }}>#</th>
                <th style={{ padding: "16px 20px", textAlign: "left", fontWeight: "600", color: "#475569", borderBottom: "2px solid #e2e8f0", width: "220px", textTransform: "uppercase", fontSize: "12px", letterSpacing: "0.05em" }}>Animal Details</th>
                <th style={{ padding: "16px 20px", textAlign: "left", fontWeight: "600", color: "#475569", borderBottom: "2px solid #e2e8f0", width: "120px", textTransform: "uppercase", fontSize: "12px", letterSpacing: "0.05em" }}>Date</th>
                <th style={{ padding: "16px 20px", textAlign: "left", fontWeight: "600", color: "#475569", borderBottom: "2px solid #e2e8f0", width: "280px", textTransform: "uppercase", fontSize: "12px", letterSpacing: "0.05em" }}>Feed Items & Quantities</th>
                <th style={{ padding: "16px 20px", textAlign: "center", fontWeight: "600", color: "#475569", borderBottom: "2px solid #e2e8f0", textTransform: "uppercase", fontSize: "12px", letterSpacing: "0.05em" }}>Total M</th>
                <th style={{ padding: "16px 20px", textAlign: "center", fontWeight: "600", color: "#475569", borderBottom: "2px solid #e2e8f0", textTransform: "uppercase", fontSize: "12px", letterSpacing: "0.05em" }}>Total A</th>
                <th style={{ padding: "16px 20px", textAlign: "center", fontWeight: "600", color: "#475569", borderBottom: "2px solid #e2e8f0", textTransform: "uppercase", fontSize: "12px", letterSpacing: "0.05em" }}>Total E</th>
                <th style={{ padding: "16px 20px", textAlign: "center", fontWeight: "600", color: "#475569", borderBottom: "2px solid #e2e8f0", textTransform: "uppercase", fontSize: "12px", letterSpacing: "0.05em", width: "160px", borderTopRightRadius: "12px" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="8" style={{ textAlign: "center", padding: "4rem", color: "#64748b", fontSize: "15px" }}>Loading records...</td></tr>
              ) : groupedArray.length === 0 ? (
                <tr><td colSpan="8" style={{ textAlign: "center", padding: "4rem", color: "#64748b", fontSize: "15px" }}>No food intake records found.</td></tr>
              ) : (
                groupedArray.map((group, idx) => {
                  const isEven = idx % 2 === 0;
                  const rowBg = isEven ? "#ffffff" : "#f8fafc";
                  const borderBot = "1px solid #f1f5f9";

                  return (
                    <tr key={group.id} style={{ background: rowBg, transition: "background 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.background = "#f1f5f9"} onMouseLeave={(e) => e.currentTarget.style.background = rowBg}>
                      <td style={{ padding: "20px", fontWeight: "600", borderBottom: borderBot, verticalAlign: "middle", color: "#94a3b8", fontSize: "14px" }}>
                        {String(idx + 1).padStart(2, '0')}
                      </td>
                      <td style={{ padding: "20px", borderBottom: borderBot, verticalAlign: "middle" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                          <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "#e0f2fe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", color: "#0284c7" }}>
                            {uiIcons.cow}
                          </div>
                          <div>
                            <div style={{ fontWeight: "600", color: "#1e293b", fontSize: "15px", marginBottom: "2px" }}>{group.cow.name || "Unknown"}</div>
                            <span style={{ fontSize: "11px", color: "#475569", background: "#f1f5f9", padding: "3px 8px", borderRadius: "12px", fontWeight: "500", textTransform: "uppercase", letterSpacing: "0.02em" }}>
                              {group.cow.animalType || "Cow"} • {group.cow.regNo || group.cow.tagNo || "-"}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "20px", borderBottom: borderBot, verticalAlign: "middle" }}>
                        <span style={{ fontWeight: "600", color: "#1e293b", fontSize: "14px", background: "#f8fafc", border: "1px solid #e2e8f0", padding: "6px 10px", borderRadius: "8px", whiteSpace: "nowrap" }}>
                          {formatDate(group.recordedAt)}
                        </span>
                      </td>

                      {/* Aggregated Feed Items side-by-side with quantities */}
                      <td style={{ padding: "16px 20px", borderBottom: borderBot, verticalAlign: "middle" }}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                          {group.records.length > 0 ? (
                            group.records.map((r, i) => {
                              const details = [];
                              if (r.morningIntake && parseFloat(r.morningIntake) > 0) details.push(`M:${r.morningIntake}`);
                              if (r.afternoonIntake && parseFloat(r.afternoonIntake) > 0) details.push(`A:${r.afternoonIntake}`);
                              if (r.eveningIntake && parseFloat(r.eveningIntake) > 0) details.push(`E:${r.eveningIntake}`);
                              const detailStr = details.length > 0 ? ` (${details.join(", ")})` : "";
                              
                              return (
                                <span key={i} style={{ background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0", fontSize: "12px", fontWeight: "600", padding: "4px 8px", borderRadius: "6px", whiteSpace: "nowrap" }}>
                                  {r.foodItem || "Unknown"}{detailStr}
                                </span>
                              );
                            })
                          ) : (
                            <span style={{ color: "#94a3b8", fontStyle: "italic", fontSize: "13px" }}>-</span>
                          )}
                        </div>
                        {group.remarks.length > 0 && (
                          <div style={{ fontSize: "11px", color: "#64748b", marginTop: "6px", display: "flex", gap: "4px", alignItems: "center" }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "150px" }}>{group.remarks[0]} {group.remarks.length > 1 ? `(+${group.remarks.length - 1} more)` : ""}</span>
                          </div>
                        )}
                      </td>

                      {/* Aggregated Totals */}
                      <td style={{ padding: "20px", borderBottom: borderBot, textAlign: "center", color: "#334155", fontWeight: "600", fontSize: "14px", verticalAlign: "middle" }}>
                        {group.morningTotal > 0 ? `${group.morningTotal} Kg` : "-"}
                      </td>
                      <td style={{ padding: "20px", borderBottom: borderBot, textAlign: "center", color: "#334155", fontWeight: "600", fontSize: "14px", verticalAlign: "middle" }}>
                        {group.afternoonTotal > 0 ? `${group.afternoonTotal} Kg` : "-"}
                      </td>
                      <td style={{ padding: "20px", borderBottom: borderBot, textAlign: "center", color: "#334155", fontWeight: "600", fontSize: "14px", verticalAlign: "middle" }}>
                        {group.eveningTotal > 0 ? `${group.eveningTotal} Kg` : "-"}
                      </td>
                      
                      <td style={{ padding: "20px", borderBottom: borderBot, textAlign: "center", verticalAlign: "middle" }}>
                        <div style={{ display: "flex", justifyContent: "center", gap: "8px" }}>
                          {/* View Button */}
                          <button type="button" title="View History" onClick={() => setSelectedView(group)} style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: "6px", color: "#0ea5e9", cursor: "pointer", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", padding: "0", transition: "all 0.2s" }} onMouseEnter={(e) => { e.currentTarget.style.background = "#e0f2fe" }} onMouseLeave={(e) => { e.currentTarget.style.background = "#f0f9ff" }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                          </button>
                          
                          {/* Edit Button */}
                          {canEdit && (
                            <button type="button" title="Edit" onClick={() => navigate("/admin/food-intake/add", { state: { editGroup: group } })} style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "6px", color: "#d97706", cursor: "pointer", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", padding: "0", transition: "all 0.2s" }} onMouseEnter={(e) => { e.currentTarget.style.background = "#fef3c7" }} onMouseLeave={(e) => { e.currentTarget.style.background = "#fffbeb" }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            </button>
                          )}

                          {/* Delete Button */}
                          {canDelete && (
                            <button type="button" title="Delete" onClick={() => handleDeleteGroup(group.recordIds)} style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", color: "#ef4444", cursor: "pointer", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", padding: "0", transition: "all 0.2s" }} onMouseEnter={(e) => { e.currentTarget.style.background = "#fee2e2" }} onMouseLeave={(e) => { e.currentTarget.style.background = "#fef2f2" }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
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
        </section>

        {/* View Modal */}
        {selectedView && (
          <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(15, 23, 42, 0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "20px" }}>
            <div style={{ background: "#fff", borderRadius: "16px", width: "100%", maxWidth: "800px", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "90vh" }}>
              {/* Header */}
              <div style={{ padding: "20px 24px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc" }}>
                <div>
                  <h3 style={{ margin: 0, color: "#0f172a", fontSize: "1.25rem", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "20px" }}>{uiIcons.cow}</span>
                    {selectedView.cow.name || "Unknown"} Feed Details
                  </h3>
                  <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "14px" }}>
                    {formatDate(selectedView.recordedAt)} • {selectedView.cow.animalType || "Cow"} • {selectedView.cow.regNo || "-"}
                  </p>
                </div>
                <button type="button" onClick={() => setSelectedView(null)} style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", padding: "8px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }} onMouseEnter={(e) => { e.currentTarget.style.background = "#e2e8f0"; e.currentTarget.style.color = "#475569"; }} onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#94a3b8"; }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>

              {/* Body */}
              <div style={{ padding: "24px", overflowY: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                      <th style={{ padding: "12px 16px", textAlign: "left", color: "#475569", fontWeight: "600", fontSize: "13px", textTransform: "uppercase" }}>Feed Item</th>
                      <th style={{ padding: "12px 16px", textAlign: "center", color: "#475569", fontWeight: "600", fontSize: "13px", textTransform: "uppercase" }}>Morning</th>
                      <th style={{ padding: "12px 16px", textAlign: "center", color: "#475569", fontWeight: "600", fontSize: "13px", textTransform: "uppercase" }}>Afternoon</th>
                      <th style={{ padding: "12px 16px", textAlign: "center", color: "#475569", fontWeight: "600", fontSize: "13px", textTransform: "uppercase" }}>Evening</th>
                      <th style={{ padding: "12px 16px", textAlign: "center", color: "#0f172a", fontWeight: "700", fontSize: "13px", textTransform: "uppercase", background: "#f1f5f9" }}>Total</th>
                      <th style={{ padding: "12px 16px", textAlign: "left", color: "#475569", fontWeight: "600", fontSize: "13px", textTransform: "uppercase" }}>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedView.records.map((r, i) => {
                      const m = parseFloat(r.morningIntake) || 0;
                      const a = parseFloat(r.afternoonIntake) || 0;
                      const e = parseFloat(r.eveningIntake) || 0;
                      const total = m + a + e;
                      return (
                        <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "16px", fontWeight: "600", color: "#16a34a" }}>
                            <span style={{ background: "#f0fdf4", padding: "4px 8px", borderRadius: "6px", border: "1px solid #bbf7d0" }}>{r.foodItem || "Unknown"}</span>
                          </td>
                          <td style={{ padding: "16px", textAlign: "center", color: "#334155", fontWeight: "500" }}>{m > 0 ? `${m} Kg` : "-"}</td>
                          <td style={{ padding: "16px", textAlign: "center", color: "#334155", fontWeight: "500" }}>{a > 0 ? `${a} Kg` : "-"}</td>
                          <td style={{ padding: "16px", textAlign: "center", color: "#334155", fontWeight: "500" }}>{e > 0 ? `${e} Kg` : "-"}</td>
                          <td style={{ padding: "16px", textAlign: "center", color: "#0f172a", fontWeight: "700", background: "#f8fafc" }}>{total > 0 ? `${total} Kg` : "-"}</td>
                          <td style={{ padding: "16px", color: "#64748b", fontSize: "14px", fontStyle: r.notes ? "normal" : "italic" }}>{r.notes || "No remarks"}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: "#f8fafc", borderTop: "2px solid #e2e8f0" }}>
                      <td style={{ padding: "16px", fontWeight: "700", color: "#0f172a", textAlign: "right" }}>Daily Total:</td>
                      <td style={{ padding: "16px", textAlign: "center", fontWeight: "700", color: "#0ea5e9" }}>{selectedView.morningTotal > 0 ? `${selectedView.morningTotal} Kg` : "-"}</td>
                      <td style={{ padding: "16px", textAlign: "center", fontWeight: "700", color: "#f59e0b" }}>{selectedView.afternoonTotal > 0 ? `${selectedView.afternoonTotal} Kg` : "-"}</td>
                      <td style={{ padding: "16px", textAlign: "center", fontWeight: "700", color: "#8b5cf6" }}>{selectedView.eveningTotal > 0 ? `${selectedView.eveningTotal} Kg` : "-"}</td>
                      <td style={{ padding: "16px", textAlign: "center", fontWeight: "800", color: "#16a34a", fontSize: "16px" }}>{(selectedView.morningTotal + selectedView.afternoonTotal + selectedView.eveningTotal).toFixed(1)} Kg</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              
              {/* Footer */}
              <div style={{ padding: "16px 24px", borderTop: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setSelectedView(null)} style={{ background: "#1f6b3a", color: "#fff", border: "none", padding: "8px 20px", borderRadius: "8px", fontWeight: "600", cursor: "pointer", boxShadow: "0 2px 4px rgba(31, 107, 58, 0.2)" }}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default FoodIntake;
