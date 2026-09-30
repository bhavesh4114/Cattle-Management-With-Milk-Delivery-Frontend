import { useEffect, useRef, useState } from "react";
import api from "../../../services/api";
import { useConfirm } from "../../../context/ConfirmContext";
import { hasPermission } from "../../../utils/permissions";
import ExportButtons from "../../../components/ExportButtons";

const today = () => new Date().toISOString().slice(0, 10);

const formatDate = (v) => {
  if (!v) return "-";
  return new Date(v).toLocaleDateString("en-IN");
};

const ANIMAL_TYPES = ["All Animals", "Cow", "Buffalo", "Other"];

const emptyForm = () => ({
  cowId: "",
  animalType: "Cow",
  treatedAt: today(),
  diagnosis: "",
  doctorName: "",
  medicine: "",
  cost: "",
  remarks: "",
});

const CowTreatment = ({ prefillData, onChanged }) => {
  // ── view: "list" | "form" ──────────────────────────────────────
  const [view, setView] = useState("list");
  const { confirm, customAlert } = useConfirm();

  // ── list state ─────────────────────────────────────────────────
  const [treatments, setTreatments] = useState([]);
  const [animalFilter, setAnimalFilter] = useState("All Animals");
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState("");

  // ── form state ─────────────────────────────────────────────────
  const [cows, setCows] = useState([]);
  const [form, setForm] = useState(emptyForm());
  const [editId, setEditId] = useState(null); // null = create, number = edit
  const [saving, setSaving] = useState(false);
  const [formMsg, setFormMsg] = useState({ text: "", ok: false });

  const [milkDropInfo, setMilkDropInfo] = useState(null);

  const adminData = JSON.parse(localStorage.getItem("adminData") || "{}");
  const canAdd = hasPermission(adminData, "treatments", "add");
  const canEdit = hasPermission(adminData, "treatments", "edit");
  const canDelete = hasPermission(adminData, "treatments", "delete");

  // Track if prefill was already applied
  const prefillApplied = useRef(false);

  // ── load treatments ────────────────────────────────────────────
  const loadTreatments = async () => {
    setListLoading(true);
    setListError("");
    try {
      const res = await api.get("/api/admin/treatments");
      setTreatments(res.data || []);
    } catch {
      setListError("Failed to load treatment records.");
    } finally {
      setListLoading(false);
    }
  };

  // ── load cows ──────────────────────────────────────────────────
  const loadCows = async () => {
    try {
      const res = await api.get("/api/admin/cows");
      setCows((res.data || []).filter((c) => c.status === "Active"));
    } catch {
      /* ignore */
    }
  };

  // Initial load
  useEffect(() => {
    loadTreatments();
    loadCows();
  }, []);

  // ── Handle prefillData prop (from Milk Drop Alert) ─────────────
  useEffect(() => {
    if (prefillData && !prefillApplied.current) {
      prefillApplied.current = true;
      const complaint = `Milk production dropped by ${Number(prefillData.dropPercentage || 0).toFixed(1)}% (${Number(prefillData.previousMilk || 0).toFixed(2)} L → ${Number(prefillData.currentMilk || 0).toFixed(2)} L)`;

      setMilkDropInfo({
        previousMilk: prefillData.previousMilk,
        currentMilk: prefillData.currentMilk,
        dropPercentage: prefillData.dropPercentage,
        threshold: prefillData.threshold,
      });

      // Find the matching cow to determine animalType
      const cowObj = cows.find((c) => String(c.id) === String(prefillData.cowId));
      setForm({
        ...emptyForm(),
        cowId: String(prefillData.cowId || ""),
        animalType: cowObj?.animalType || prefillData.animalType || "Cow",
        treatedAt: today(),
        diagnosis: complaint,
      });

      // Show the form automatically
      setView("form");
      setEditId(null);
    }
  }, [prefillData, cows]); // re-run when cows are loaded so animalType is correct

  // ── Filtered list ──────────────────────────────────────────────
  const filteredTreatments =
    animalFilter === "All Animals"
      ? treatments
      : treatments.filter(
        (t) =>
          (t.cow?.animalType || "Cow").toLowerCase() ===
          animalFilter.toLowerCase()
      );

  // ── Open blank create form ─────────────────────────────────────
  const handleCreate = () => {
    prefillApplied.current = false;
    setMilkDropInfo(null);
    setForm(emptyForm());
    setEditId(null);
    setFormMsg({ text: "", ok: false });
    setView("form");
  };

  // ── Open edit form ─────────────────────────────────────────────
  const handleEdit = (t) => {
    setMilkDropInfo(null);
    setEditId(t.id);
    setForm({
      cowId: String(t.cowId || ""),
      animalType: t.cow?.animalType || "Cow",
      treatedAt: t.treatedAt ? t.treatedAt.slice(0, 10) : today(),
      diagnosis: t.diagnosis || "",
      doctorName: t.doctorName || "",
      medicine: t.medicine || "",
      cost: String(t.cost || ""),
      remarks: t.remarks || "",
    });
    setFormMsg({ text: "", ok: false });
    setView("form");
  };

  // ── Delete ─────────────────────────────────────────────────────
  const handleDelete = async (t) => {
    const isConfirmed = await confirm(`Delete treatment for "${t.cow?.name || "this cow"}"?`);
    if (!isConfirmed) return;
    try {
      await api.delete(`/api/admin/treatments/${t.id}`);
      await loadTreatments();
      if (onChanged) onChanged();
    } catch {
      customAlert("Failed to delete treatment.");
    }
  };

  // ── When cow selection changes, sync animalType ────────────────
  const handleCowChange = (cowId) => {
    const c = cows.find((c) => String(c.id) === String(cowId));
    setForm((prev) => ({
      ...prev,
      cowId,
      animalType: c?.animalType || prev.animalType,
    }));
  };

  // ── Submit form ────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormMsg({ text: "", ok: false });

    const payload = {
      cowId: form.cowId,
      diagnosis: form.diagnosis,
      medicine: form.medicine,
      cost: form.cost,
      treatedAt: form.treatedAt,
      doctorName: form.doctorName || null,
      remarks: form.remarks || null,
      ...(milkDropInfo
        ? {
          milkDropSource: true,
          previousMilk: milkDropInfo.previousMilk,
          currentMilk: milkDropInfo.currentMilk,
          dropPercentage: milkDropInfo.dropPercentage,
        }
        : {}),
    };

    try {
      if (editId) {
        await api.put(`/api/admin/treatments/${editId}`, payload);
        setFormMsg({ text: "✅ Treatment updated successfully.", ok: true });
      } else {
        await api.post("/api/admin/treatments", payload);
        setFormMsg({ text: "✅ Treatment saved successfully.", ok: true });
      }
      await loadTreatments();
      if (onChanged) onChanged();

      // Go back to list after short delay
      setTimeout(() => {
        setView("list");
        setMilkDropInfo(null);
        prefillApplied.current = false;
      }, 1200);
    } catch (err) {
      setFormMsg({
        text: err?.response?.data?.message || "❌ Failed to save. Please check the form.",
        ok: false,
      });
    } finally {
      setSaving(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────
  // RENDER: LIST VIEW
  // ─────────────────────────────────────────────────────────────────
  if (view === "list") {
    return (
      <div style={{ fontFamily: "'Inter', sans-serif" }}>
        {/* Header bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
            marginBottom: "18px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "22px" }}>⊞</span>
            <h2
              style={{
                margin: 0,
                fontSize: "20px",
                fontWeight: 800,
                color: "#1e293b",
              }}
            >
              Animal Treatments
            </h2>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            {/* Animal type filter */}
            <select
              value={animalFilter}
              onChange={(e) => setAnimalFilter(e.target.value)}
              style={{
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                padding: "7px 12px",
                fontSize: "13px",
                background: "#fff",
                color: "#334155",
                cursor: "pointer",
              }}
            >
              {ANIMAL_TYPES.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>

            <ExportButtons tableId="treatment-records-table" filename="Treatment_Records" title="Animal Treatments" />
            {canAdd && (
              <button
                type="button"
                onClick={handleCreate}
                style={{
                  background: "#2e6f40",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "8px 18px",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                ＋ Create Treatment
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="cattle-table-card" style={{ padding: 0, border: "none", boxShadow: "none", background: "transparent" }}>
          {listLoading ? (
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px" }}>
              <p style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>
                Loading...
              </p>
            </div>
          ) : listError ? (
            <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px" }}>
              <p style={{ textAlign: "center", padding: "2rem", color: "#dc2626" }}>
                {listError}
              </p>
            </div>
          ) : (
            <>
              <div className="table-wrap" style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px", overflow: "hidden" }}>
              <table
                id="treatment-records-table"
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "13px",
                }}
              >
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    {["Sr No.", "Cow", "Date", "Complain", "Doctor", "Expense", "Actions"].map(
                      (h) => (
                        <th
                          key={h}
                          style={{
                            padding: "12px 14px",
                            textAlign: "left",
                            fontWeight: 700,
                            color: "#475569",
                            borderBottom: "2px solid #e2e8f0",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredTreatments.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>
                        No treatment records found.
                      </td>
                    </tr>
                  ) : (
                    filteredTreatments.map((t, idx) => (
                      <tr
                        key={t.id}
                        style={{
                          borderBottom: "1px solid #f1f5f9",
                          background: idx % 2 === 0 ? "#fff" : "#fafafa",
                        }}
                      >
                        <td
                          data-label="Sr No."
                          style={{
                            padding: "11px 14px",
                            color: "#64748b",
                            fontWeight: 600,
                          }}
                        >
                          {idx + 1}
                        </td>
                        <td
                          data-label="Cow"
                          style={{
                            padding: "11px 14px",
                            fontWeight: 700,
                            color: "#16a34a",
                          }}
                        >
                          {t.cow?.name || t.cow?.tagNo || `#${t.cowId}`}
                          {t.milkDropSource && (
                            <span
                              title="Created from Milk Drop Alert"
                              style={{
                                marginLeft: "6px",
                                fontSize: "10px",
                                background: "#fef3c7",
                                color: "#92400e",
                                borderRadius: "6px",
                                padding: "1px 6px",
                                fontWeight: 600,
                              }}
                            >
                              🥛 Alert
                            </span>
                          )}
                        </td>
                        <td data-label="Date" style={{ padding: "11px 14px", color: "#475569" }}>
                          {formatDate(t.treatedAt)}
                        </td>
                        <td
                          data-label="Complain"
                          style={{
                            padding: "11px 14px",
                            color: "#dc2626",
                            maxWidth: "260px",
                          }}
                        >
                          {t.diagnosis || "-"}
                        </td>
                        <td data-label="Doctor" style={{ padding: "11px 14px", color: "#475569" }}>
                          {t.doctorName || "-"}
                        </td>
                        <td
                          data-label="Expense"
                          style={{
                            padding: "11px 14px",
                            fontWeight: 600,
                            color: "#1e293b",
                          }}
                        >
                          {t.cost != null ? Number(t.cost).toFixed(2) : "-"}
                        </td>
                        <td data-label="Actions" style={{ padding: "11px 14px" }}>
                          <div className="row-actions" style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                            {canEdit && (
                              <button type="button"
                                className="icon-action edit"
                                title="Edit"
                                onClick={() => handleEdit(t)}
                              ><svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="14" width="14" xmlns="http://www.w3.org/2000/svg"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>
                            )}
                            {canDelete && (
                              <button type="button"
                                className="icon-action delete"
                                title="Delete"
                                onClick={() => handleDelete(t.id)}
                              ><svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="14" width="14" xmlns="http://www.w3.org/2000/svg"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                  </tbody>
                </table>
              </div>
              {!filteredTreatments.length && (
                <p className="empty-state">No treatment records found.</p>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="cattle-form-page">
            <div className="cattle-form-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>
                {editingTreatmentId ? "Edit Treatment" : "Add Treatment"}
              </h3>
              <button type="button" onClick={() => { setView("list"); setMilkDropInfo(null); prefillApplied.current = false; }} style={{ background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1", padding: "8px 12px", borderRadius: "6px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.background = "#e2e8f0"} onMouseLeave={(e) => e.currentTarget.style.background = "#f1f5f9"}>
                <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="18" width="18" xmlns="http://www.w3.org/2000/svg"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
              </button>
            </div>
            
            <section className="cattle-form-section">
              <h4>Treatment Details</h4>
              <form onSubmit={handleFormSubmit}>
                <div style={gridStyle}>
                  <div style={fieldStyle}>
                    <label style={labelStyle}>Treatment Date *</label>
                    <input
                      type="date"
                      value={form.treatedAt}
                      onChange={(e) => setForm({ ...form, treatedAt: e.target.value })}
                      required
                      style={inputStyle}
                    />
                  </div>
                  <div style={fieldStyle}>
                    <label style={labelStyle}>Select Cow *</label>
                    <select
                      value={form.cowId}
                      onChange={(e) => setForm({ ...form, cowId: e.target.value })}
                      required
                      style={inputStyle}
                    >
                      <option value="">-- Choose Cow --</option>
                      {cows.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.regNo})</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div style={gridStyle}>
                  <div style={fieldStyle}>
                    <label style={labelStyle}>Diagnosis / Complain *</label>
                    <input
                      type="text"
                      placeholder="E.g. Fever, Infection"
                      value={form.diagnosis}
                      onChange={(e) => setForm({ ...form, diagnosis: e.target.value })}
                      required
                      style={inputStyle}
                    />
                  </div>
                  <div style={fieldStyle}>
                    <label style={labelStyle}>Doctor Name</label>
                    <input
                      type="text"
                      placeholder="Vet Name"
                      value={form.doctorName}
                      onChange={(e) => setForm({ ...form, doctorName: e.target.value })}
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div style={fieldStyle}>
                  <label style={labelStyle}>Medications Prescribed</label>
                  <textarea
                    rows={2}
                    placeholder="List given medicines..."
                    value={form.medications}
                    onChange={(e) => setForm({ ...form, medications: e.target.value })}
                    style={{ ...inputStyle, resize: "vertical" }}
                  />
                </div>

                <div style={gridStyle}>
                  <div style={fieldStyle}>
                    <label style={labelStyle}>Expense (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={form.cost}
                      onChange={(e) => setForm({ ...form, cost: e.target.value })}
                      style={inputStyle}
                    />
                  </div>
                  <div style={fieldStyle}>
                    <label style={labelStyle}>Follow-up Date</label>
                    <input
                      type="date"
                      value={form.followUpDate}
                      onChange={(e) => setForm({ ...form, followUpDate: e.target.value })}
                      style={inputStyle}
                    />
                  </div>
                </div>

                <div style={fieldStyle}>
                  <label style={labelStyle}>Additional Notes</label>
                  <textarea
                    rows={2}
                    placeholder="Any specific instructions..."
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    style={{ ...inputStyle, resize: "vertical" }}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "24px" }}>
                  <button type="submit" disabled={saving} style={{
                    background: saving ? "#86efac" : "linear-gradient(135deg, #2e6f40 0%, #1a4d2e 100%)",
                    color: "#fff", border: "none", borderRadius: "10px",
                    padding: "12px 28px", fontSize: "14px", fontWeight: "bold",
                    cursor: saving ? "not-allowed" : "pointer",
                    boxShadow: "0 4px 12px rgba(46,111,64,0.2)",
                    transition: "transform 0.2s, box-shadow 0.2s"
                  }}
                  onMouseOver={(e) => { if(!saving) { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 16px rgba(46,111,64,0.3)"; } }}
                  onMouseOut={(e) => { if(!saving) { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(46,111,64,0.2)"; } }}>
                    {saving ? "Saving..." : (editingTreatmentId ? "Update Treatment" : "Save Treatment")}
                  </button>
                </div>

          {formMsg.text && (
            <div style={{
              marginTop: "16px", padding: "12px 16px",
              borderRadius: "10px", fontSize: "14px", fontWeight: 600,
              background: formMsg.ok ? "#f0fdf4" : "#fef2f2",
              color: formMsg.ok ? "#166534" : "#dc2626",
              border: `1px solid ${formMsg.ok ? "#bbf7d0" : "#fecaca"}`,
              display: "flex", alignItems: "center", gap: "8px",
            }}>
              {formMsg.text}
            </div>
          )}
        </form>
      </section>
    </div>
  );
};

// ── Inline style helpers ─────────────────────────────────────────────────────

const sectionHeadStyle = {
  fontSize: "13px",
  fontWeight: 700,
  color: "#2e6f40",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  marginBottom: "14px",
  paddingBottom: "8px",
  borderBottom: "2px solid #f0fdf4",
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: "0 24px",
};

const fieldStyle = {
  marginBottom: "18px",
};

const labelStyle = {
  display: "block",
  marginBottom: "7px",
  fontSize: "13px",
  fontWeight: 600,
  color: "#374151",
};

const inputStyle = {
  width: "100%",
  border: "1.5px solid #e2e8f0",
  borderRadius: "10px",
  padding: "11px 14px",
  fontSize: "14px",
  color: "#1e293b",
  background: "#fff",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.2s",
};

export default CowTreatment;
