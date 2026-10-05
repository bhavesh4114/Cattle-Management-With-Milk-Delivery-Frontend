import React, { useState, useEffect, useMemo } from "react";
import api from "../../../services/api";
import "../../../css/dashboard.css";

const StaffMilkReportEntry = () => {
    const [loading, setLoading] = useState(true);
    const [totalReceived, setTotalReceived] = useState(0);
    const [date, setDate] = useState("");
    const [rows, setRows] = useState([]);
    const [myReports, setMyReports] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [customOptions, setCustomOptions] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [newItemName, setNewItemName] = useState("");
    const [toast, setToast] = useState({ message: '', type: '', visible: false });

    const showToast = (message, type = 'success') => {
        setToast({ message, type, visible: true });
        setTimeout(() => {
            setToast({ message: '', type: '', visible: false });
        }, 3000);
    };

    useEffect(() => {
        fetchTotalMilk();
        fetchMyReports();
    }, []);

    const fetchTotalMilk = async () => {
        try {
            const res = await api.get('/staff-milk/today-total');
            setTotalReceived(parseFloat(res.data.total) || 0);
            setDate(res.data.date);
            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    const fetchMyReports = async () => {
        try {
            const res = await api.get('/staff-milk/my-reports');
            setMyReports(res.data);
        } catch (err) {
            console.error("Error fetching my reports:", err);
        }
    };

    const addRow = () => {
        const available = getAvailableOptions("");
        const defaultType = available.length > 0 ? available[0] : "Milk Bottle";
        setRows([...rows, {
            id: Date.now(),
            type: defaultType,
            bottleSize: "1 L",
            bottleCount: 0,
            quantity: 0,
            outputQty: 0,
            desc: ""
        }]);
    };

    const removeRow = (id) => {
        setRows(rows.filter(r => r.id !== id));
    };

    const getAvailableOptions = (currentRowType) => {
        const allOptions = ["Milk Bottle", "Ghee", "Dahi", ...customOptions, "Other"];
        const selectedTypes = rows.map(r => r.type);
        return allOptions.filter(opt =>
            opt === currentRowType ||
            !selectedTypes.includes(opt)
        );
    };

    const handleRowChange = (id, field, value) => {
        setRows(rows.map(r => {
            if (r.id === id) {
                const updated = { ...r, [field]: value };

                if (updated.type === "Milk Bottle") {
                    let sizeInLiters = 1;
                    if (updated.bottleSize === "500 ML") sizeInLiters = 0.5;
                    else if (updated.bottleSize === "250 ML") sizeInLiters = 0.25;

                    const qty = parseFloat(updated.quantity) || 0;
                    updated.bottleCount = qty / sizeInLiters;
                    updated.desc = `${updated.bottleCount || 0} × ${updated.bottleSize} bottles`;
                } else if (updated.type === "Ghee") {
                    updated.desc = `${updated.outputQty || 0} KG ghee`;
                } else if (updated.type === "Dahi") {
                    updated.desc = `${updated.outputQty || 0} L dahi`;
                } else {
                    updated.desc = `Used for ${updated.type}`;
                }

                return updated;
            }
            return r;
        }));
    };

    const previouslyUsedQty = useMemo(() => {
        if (!date || !myReports.length) return 0;
        const todayStr = new Date(date).toDateString();
        return myReports.reduce((sum, report) => {
            const reportDateStr = new Date(report.reportDate).toDateString();
            if (reportDateStr === todayStr) {
                return sum + (parseFloat(report.totalUsedQty) || 0);
            }
            return sum;
        }, 0);
    }, [myReports, date]);

    const formUsedQty = useMemo(() => {
        return rows.reduce((sum, r) => sum + (parseFloat(r.quantity) || 0), 0);
    }, [rows]);

    const totalUsed = previouslyUsedQty + formUsedQty;
    const remainingMilk = totalReceived - totalUsed;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (totalUsed > totalReceived) {
            showToast("Error: Total Used Milk cannot exceed Total Received Milk.", "error");
            return;
        }

        if (rows.length === 0) {
            showToast("Please add at least one milk usage record.", "error");
            return;
        }

        // Realistic Validation Check
        for (const row of rows) {
            const qty = parseFloat(row.quantity) || 0;
            const out = parseFloat(row.outputQty) || 0;
            
            if (row.type === "Ghee") {
                // Realistic: ~20L-25L milk for 1KG Ghee (Max ~0.06 KG per liter)
                if (out > qty * 0.06) {
                    showToast(`Unrealistic output: Max ~${(qty * 0.05).toFixed(2)} KG Ghee possible from ${qty}L milk.`, "error");
                    return;
                }
            } else if (row.type === "Dahi") {
                // Max 1L Dahi from 1L Milk (plus minor margin)
                if (out > qty * 1.05) {
                    showToast(`Unrealistic output: Cannot produce more Dahi than the milk used (${qty}L).`, "error");
                    return;
                }
            } else if (row.type.toLowerCase().includes("paneer") || row.type.toLowerCase().includes("cheese")) {
                // Max ~0.25 KG per liter
                if (out > qty * 0.25) {
                    showToast(`Unrealistic output: Max ~${(qty * 0.2).toFixed(2)} KG ${row.type} possible from ${qty}L milk.`, "error");
                    return;
                }
            } else if (row.type.toLowerCase().includes("mawa") || row.type.toLowerCase().includes("khoa")) {
                if (out > qty * 0.3) {
                    showToast(`Unrealistic output: Max ~${(qty * 0.25).toFixed(2)} KG ${row.type} possible from ${qty}L milk.`, "error");
                    return;
                }
            }
        }

        setSubmitting(true);
        try {
            await api.post('/staff-milk/submit-report', {
                receivedQty: totalReceived,
                totalUsedQty: formUsedQty,
                remainingQty: remainingMilk,
                usageDetails: rows
            });
            showToast("Report submitted successfully!", "success");
            setRows([]);
            fetchMyReports(); // Refresh the list
        } catch (err) {
            console.error(err);
            showToast("Error submitting report", "error");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div style={{ padding: "20px", textAlign: "center" }}>Loading...</div>;

    return (
        <div style={{ padding: "0px", position: "relative" }}>
            {toast.visible && (
                <div style={{
                    position: 'fixed', top: '20px', right: '20px', zIndex: 9999,
                    background: toast.type === 'error' ? '#fef2f2' : '#dcfce3',
                    color: toast.type === 'error' ? '#dc2626' : '#166534',
                    border: `1px solid ${toast.type === 'error' ? '#fca5a5' : '#86efac'}`,
                    padding: '12px 24px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                    fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px',
                    transition: 'all 0.3s ease-in-out'
                }}>
                    {toast.type === 'error' ? '⚠️' : '✅'} {toast.message}
                </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h2 style={{ margin: 0, color: "#1a2e26", fontSize: "20px", fontWeight: "bold" }}>Milk Usage Entry</h2>
                <div style={{ background: "#e0f2fe", color: "#0284c7", padding: "6px 14px", borderRadius: "20px", fontWeight: "bold", fontSize: "14px" }}>
                    {new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).replace(/ /g, "-")}
                </div>
            </div>

            <div style={{ background: "#fff", padding: "16px", borderRadius: "10px", display: "flex", alignItems: "center", gap: "16px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)", borderLeft: "5px solid #198754", marginBottom: "20px" }}>
                <div style={{ fontSize: "28px", background: "#e8f5ee", padding: "12px", borderRadius: "50%" }}>🥛</div>
                <div>
                    <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>Total Milk Received</div>
                    <div style={{ fontSize: "24px", fontWeight: "bold", color: "#1a2e26" }}>{totalReceived.toFixed(2)} L</div>
                </div>
            </div>

            <form onSubmit={handleSubmit} style={{ background: "#fff", padding: "20px", borderRadius: "10px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
                    <h3 style={{ margin: 0, fontSize: "16px", color: "#334155" }}>Usage Breakdown</h3>
                    <div style={{ display: "flex", gap: "10px" }}>
                        <button type="button" onClick={() => setShowModal(true)} style={{ background: "#e2e8f0", color: "#334155", border: "none", padding: "6px 14px", borderRadius: "6px", fontWeight: "bold", fontSize: "13px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                            + Add New Item
                        </button>
                        <button type="button" onClick={addRow} style={{ background: "#198754", color: "#fff", border: "none", padding: "6px 14px", borderRadius: "6px", fontWeight: "bold", fontSize: "13px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                            + Add Milk Usage
                        </button>
                    </div>
                </div>

                <div style={{ overflowX: "auto", marginBottom: "20px" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                        <thead>
                            <tr style={{ background: "#f8fafc", textAlign: "left", color: "#475569" }}>
                                <th style={{ padding: "12px", borderBottom: "2px solid #e2e8f0" }}>Usage Type</th>
                                <th style={{ padding: "12px", borderBottom: "2px solid #e2e8f0" }}>Milk Qty (L)</th>
                                <th style={{ padding: "12px", borderBottom: "2px solid #e2e8f0" }}>Details / Output</th>
                                <th style={{ padding: "12px", borderBottom: "2px solid #e2e8f0", textAlign: "right" }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.length === 0 ? (
                                <tr>
                                    <td colSpan="4" style={{ textAlign: "center", padding: "30px", color: "#94a3b8" }}>No usage added yet. Click "+ Add Milk Usage" to begin.</td>
                                </tr>
                            ) : (
                                rows.map((row, idx) => (
                                    <tr key={row.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                        <td style={{ padding: "10px" }}>
                                            <select
                                                value={row.type}
                                                onChange={(e) => handleRowChange(row.id, "type", e.target.value)}
                                                style={{ width: "100%", padding: "6px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", fontSize: "14px" }}
                                            >
                                                {getAvailableOptions(row.type).map(opt => (
                                                    <option key={opt} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td style={{ padding: "10px" }}>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={row.quantity}
                                                onChange={(e) => handleRowChange(row.id, "quantity", e.target.value)}
                                                style={{ width: "100%", padding: "6px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", fontSize: "14px" }}
                                                placeholder="Liters"
                                                required
                                            />
                                        </td>
                                        <td style={{ padding: "10px" }}>
                                            {row.type === "Milk Bottle" ? (
                                                <div style={{ display: "flex", gap: "8px" }}>
                                                    <select
                                                        value={row.bottleSize}
                                                        onChange={(e) => handleRowChange(row.id, "bottleSize", e.target.value)}
                                                        style={{ width: "100px", padding: "6px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", fontSize: "14px" }}
                                                    >
                                                        <option value="1 L">1 L</option>
                                                        <option value="500 ML">500 ML</option>
                                                        <option value="250 ML">250 ML</option>
                                                    </select>
                                                </div>
                                            ) : row.type === "Ghee" ? (
                                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        value={row.outputQty}
                                                        onChange={(e) => handleRowChange(row.id, "outputQty", e.target.value)}
                                                        style={{ width: "100px", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none" }}
                                                        placeholder="Output"
                                                        required
                                                    />
                                                    <span style={{ color: "#64748b", fontWeight: "600", fontSize: "14px" }}>KG</span>
                                                </div>
                                            ) : row.type === "Dahi" ? (
                                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        value={row.outputQty}
                                                        onChange={(e) => handleRowChange(row.id, "outputQty", e.target.value)}
                                                        style={{ width: "100px", padding: "8px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none" }}
                                                        placeholder="Output"
                                                    />
                                                    <span style={{ color: "#64748b", fontWeight: "600", fontSize: "14px" }}>L</span>
                                                </div>
                                            ) : (
                                                <input
                                                    type="text"
                                                    value={row.desc}
                                                    onChange={(e) => handleRowChange(row.id, "desc", e.target.value)}
                                                    style={{ width: "100%", padding: "6px", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none", fontSize: "14px" }}
                                                    placeholder="Description / Reason"
                                                    required
                                                />
                                            )}
                                        </td>
                                        <td style={{ padding: "12px", textAlign: "right" }}>
                                            <button
                                                type="button"
                                                onClick={() => removeRow(row.id)}
                                                style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fca5a5", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}
                                            >
                                                ✕
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", marginBottom: "20px", background: "#f8fafc", padding: "16px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                    <div>
                        <div style={{ color: "#64748b", fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>Total Milk Received</div>
                        <div style={{ color: "#334155", fontSize: "18px", fontWeight: "bold" }}>{totalReceived.toFixed(2)} L</div>
                    </div>
                    <div>
                        <div style={{ color: "#64748b", fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>Total Milk Used</div>
                        <div style={{ color: totalUsed > totalReceived ? "#dc2626" : "#334155", fontSize: "18px", fontWeight: "bold" }}>{totalUsed.toFixed(2)} L</div>
                    </div>
                    <div>
                        <div style={{ color: "#64748b", fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>Remaining Milk</div>
                        <div style={{ color: remainingMilk < 0 ? "#dc2626" : "#16a34a", fontSize: "18px", fontWeight: "bold" }}>{remainingMilk.toFixed(2)} L</div>
                    </div>
                </div>

                {totalUsed > totalReceived && (
                    <div style={{ background: "#fef2f2", color: "#b91c1c", padding: "10px", borderRadius: "8px", marginBottom: "16px", border: "1px solid #f87171", fontWeight: "500", fontSize: "13px" }}>
                        ⚠️ Total used milk cannot exceed total received milk. Please adjust the quantities.
                    </div>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button
                        type="submit"
                        disabled={submitting || totalUsed > totalReceived}
                        style={{
                            background: totalUsed > totalReceived ? "#94a3b8" : "#198754",
                            color: "#fff", border: "none", padding: "10px 20px", borderRadius: "8px",
                            fontWeight: "bold", fontSize: "15px", cursor: totalUsed > totalReceived ? "not-allowed" : "pointer",
                            transition: "all 0.2s"
                        }}
                    >
                        {submitting ? "Submitting..." : "Submit Milk Report"}
                    </button>
                </div>
            </form>

            {/* Past Reports Section */}
            {myReports.length > 0 && (
                <div style={{ background: "#fff", padding: "24px", borderRadius: "10px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", border: "1px solid #e2e8f0", marginTop: "30px" }}>
                    <h3 style={{ marginTop: 0, color: "#1e293b", marginBottom: "20px" }}>My Recent Reports</h3>
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                            <thead>
                                <tr style={{ background: "#f8fafc", textAlign: "left", color: "#475569" }}>
                                    <th style={{ padding: "12px", borderBottom: "2px solid #e2e8f0" }}>Date</th>
                                    <th style={{ padding: "12px", borderBottom: "2px solid #e2e8f0" }}>Received Milk</th>
                                    <th style={{ padding: "12px", borderBottom: "2px solid #e2e8f0" }}>Used Milk</th>
                                    <th style={{ padding: "12px", borderBottom: "2px solid #e2e8f0" }}>Usage Details</th>
                                    <th style={{ padding: "12px", borderBottom: "2px solid #e2e8f0" }}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {myReports.map((report) => (
                                    <tr key={report.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                        <td style={{ padding: "12px", fontWeight: "600" }}>
                                            {new Date(report.reportDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).replace(/ /g, "-")}
                                        </td>
                                        <td style={{ padding: "12px", fontWeight: "600", color: "#3b82f6" }}>{report.receivedQty} L</td>
                                        <td style={{ padding: "12px", fontWeight: "600", color: "#ef4444" }}>{report.totalUsedQty} L</td>
                                        <td style={{ padding: "12px", color: "#64748b", fontSize: "13px" }}>
                                            {(() => {
                                                let details = report.usageDetails;
                                                if (typeof details === 'string') {
                                                    try { details = JSON.parse(details); } catch(e) { details = []; }
                                                }
                                                if (Array.isArray(details) && details.length > 0) {
                                                    return (
                                                        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                                                            {details.map((u, idx) => (
                                                                <span key={idx} style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px", border: "1px solid #e2e8f0", fontSize: "12px", color: "#475569", fontWeight: "500", whiteSpace: "nowrap" }}>
                                                                    <strong style={{ color: "#0ea5e9" }}>{u.quantity}L</strong> {u.type}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    );
                                                }
                                                return "-";
                                            })()}
                                        </td>
                                        <td style={{ padding: "12px" }}>
                                            <span style={{ 
                                                background: report.status === 'PENDING_ADMIN_REVIEW' ? '#fef3c7' : '#dcfce3', 
                                                color: report.status === 'PENDING_ADMIN_REVIEW' ? '#d97706' : '#166534',
                                                padding: "4px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: "bold"
                                            }}>
                                                {report.status === 'PENDING_ADMIN_REVIEW' ? 'Pending Review' : report.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Custom Item Modal */}
            {showModal && (
                <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
                    <div style={{ background: "#fff", padding: "24px", borderRadius: "8px", width: "90%", maxWidth: "320px", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
                        <h3 style={{ marginTop: 0, marginBottom: "16px", color: "#1a2e26" }}>Add New Item</h3>
                        <input
                            type="text"
                            value={newItemName}
                            onChange={e => setNewItemName(e.target.value)}
                            placeholder="E.g. Paneer, Sweets, etc."
                            style={{ width: "100%", padding: "10px", marginBottom: "20px", border: "1px solid #cbd5e1", borderRadius: "6px", outline: "none" }}
                            autoFocus
                        />
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                            <button onClick={() => { setShowModal(false); setNewItemName(""); }} style={{ padding: "8px 16px", background: "#f1f5f9", color: "#475569", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>
                                Cancel
                            </button>
                            <button onClick={() => {
                                if (newItemName.trim()) {
                                    setCustomOptions([...customOptions, newItemName.trim()]);
                                    setNewItemName("");
                                    setShowModal(false);
                                }
                            }} style={{ padding: "8px 16px", background: "#198754", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>
                                Add Item
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StaffMilkReportEntry;
