import React, { useState, useEffect } from 'react';
import api from '../../../services/api';

const StaffMilkReportsView = () => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState({ text: '', type: '' });
    const [selectedReport, setSelectedReport] = useState(null);

    const showToast = (text, type = 'success') => {
        setToast({ text, type });
        setTimeout(() => setToast({ text: '', type: '' }), 4000);
    };

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        try {
            const res = await api.get('/api/staff-milk/reports');
            setReports(res.data);
            setLoading(false);
        } catch (err) {
            console.error("Error fetching staff milk reports:", err);
            setLoading(false);
        }
    };

    const handleApprove = async (id) => {
        try {
            await api.put(`/api/staff-milk/approve-report/${id}`);
            // Update local state to reflect approval
            setReports(reports.map(report => report.id === id ? { ...report, status: 'APPROVED' } : report));
            showToast("Report approved successfully");
        } catch (err) {
            console.error("Error approving report:", err);
            showToast("Failed to approve report.", "error");
        }
    };

    const handleReject = async (id) => {
        try {
            await api.put(`/api/staff-milk/reject-report/${id}`);
            // Update local state to reflect rejection
            setReports(reports.map(report => report.id === id ? { ...report, status: 'REJECTED' } : report));
            showToast("Report rejected successfully");
        } catch (err) {
            console.error("Error rejecting report:", err);
            showToast("Failed to reject report.", "error");
        }
    };

    if (loading) {
        return <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>Loading reports...</div>;
    }

    return (
        <div style={{ background: "white", padding: "30px", borderRadius: "16px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", border: "1px solid #e2e8f0", position: 'relative' }}>
            {toast.text && (
                <div style={{ position: 'fixed', top: '20px', right: '20px', background: toast.type === 'error' ? '#ef4444' : '#22c55e', color: 'white', padding: '16px 24px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', zIndex: 1000, fontWeight: 'bold' }}>
                    {toast.text}
                </div>
            )}
            <h3 style={{ fontSize: "1.5rem", color: "#1e293b", marginBottom: "20px" }}>Staff Milk Usage Reports</h3>
            
            {reports.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8", background: "#f8fafc", borderRadius: "12px" }}>
                    No staff milk reports submitted yet.
                </div>
            ) : (
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                        <thead>
                            <tr style={{ background: "#f8fafc", textAlign: "left", color: "#475569" }}>
                                <th style={{ padding: "12px", borderBottom: "2px solid #e2e8f0" }}>Date</th>
                                <th style={{ padding: "12px", borderBottom: "2px solid #e2e8f0" }}>Received Milk</th>
                                <th style={{ padding: "12px", borderBottom: "2px solid #e2e8f0" }}>Used Milk</th>
                                <th style={{ padding: "12px", borderBottom: "2px solid #e2e8f0" }}>Remaining</th>
                                <th style={{ padding: "12px", borderBottom: "2px solid #e2e8f0" }}>Status</th>
                                <th style={{ padding: "12px", borderBottom: "2px solid #e2e8f0" }}>Details</th>
                                <th style={{ padding: "12px", borderBottom: "2px solid #e2e8f0", textAlign: "right" }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reports.map((report) => (
                                <tr key={report.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                    <td style={{ padding: "12px", color: "#334155", fontWeight: "500" }}>
                                        {new Date(report.reportDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).replace(/ /g, "-")}
                                    </td>
                                    <td style={{ padding: "12px", color: "#3b82f6", fontWeight: "600" }}>{Number(report.receivedQty).toFixed(2)} L</td>
                                    <td style={{ padding: "12px", color: "#ef4444", fontWeight: "600" }}>{Number(report.totalUsedQty).toFixed(2)} L</td>
                                    <td style={{ padding: "12px", color: "#10b981", fontWeight: "600" }}>{Number(report.remainingQty).toFixed(2)} L</td>
                                    <td style={{ padding: "12px" }}>
                                        <span style={{ 
                                            background: report.status === 'PENDING_ADMIN_REVIEW' ? '#fef3c7' : (report.status === 'REJECTED' ? '#fee2e2' : '#dcfce3'), 
                                            color: report.status === 'PENDING_ADMIN_REVIEW' ? '#d97706' : (report.status === 'REJECTED' ? '#b91c1c' : '#166534'),
                                            padding: "4px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: "bold"
                                        }}>
                                            {report.status === 'PENDING_ADMIN_REVIEW' ? 'Pending' : report.status}
                                        </span>
                                    </td>
                                    <td style={{ padding: "12px" }}>
                                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                            {report.usageDetails && Array.isArray(report.usageDetails) ? report.usageDetails.map(item => (
                                                <div key={item.id} style={{ fontSize: "12px", color: "#64748b", background: "#f8fafc", padding: "4px 8px", borderRadius: "4px" }}>
                                                    <strong>{item.type}</strong>: {item.quantity} L {item.desc ? `(${item.desc})` : ''}
                                                </div>
                                            )) : <span style={{ color: "#cbd5e1" }}>No details</span>}
                                        </div>
                                    </td>
                                    <td style={{ padding: "12px", textAlign: "right" }}>
                                        <button 
                                            onClick={() => setSelectedReport(report)}
                                            style={{ background: "#3b82f6", color: "white", border: "none", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "12px", marginRight: "8px" }}
                                        >
                                            View
                                        </button>
                                        {report.status !== 'APPROVED' && (
                                            <button 
                                                onClick={() => handleApprove(report.id)}
                                                style={{ background: "#10b981", color: "white", border: "none", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "12px", marginRight: "8px" }}
                                            >
                                                Approve
                                            </button>
                                        )}
                                        {report.status !== 'REJECTED' && (
                                            <button 
                                                onClick={() => handleReject(report.id)}
                                                style={{ background: "#ef4444", color: "white", border: "none", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "12px" }}
                                            >
                                                Reject
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* View Details Modal */}
            {selectedReport && (
                <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
                    <div style={{ background: "white", padding: "24px", borderRadius: "12px", width: "100%", maxWidth: "600px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid #e2e8f0", paddingBottom: "10px", flexShrink: 0 }}>
                            <h3 style={{ margin: 0, color: "#1e293b", fontSize: "1.25rem" }}>Milk Usage Breakdown</h3>
                            <button onClick={() => setSelectedReport(null)} style={{ background: "transparent", border: "none", fontSize: "20px", cursor: "pointer", color: "#94a3b8" }}>×</button>
                        </div>
                        
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px", background: "#f8fafc", padding: "12px", borderRadius: "8px", flexShrink: 0 }}>
                            <div>
                                <div style={{ fontSize: "12px", color: "#64748b" }}>Date</div>
                                <div style={{ fontWeight: "bold", color: "#1e293b" }}>{new Date(selectedReport.reportDate).toLocaleDateString("en-GB").replace(/\//g, "-")}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: "12px", color: "#64748b" }}>Total Used</div>
                                <div style={{ fontWeight: "bold", color: "#ef4444" }}>{Number(selectedReport.totalUsedQty).toFixed(2)} L</div>
                            </div>
                        </div>

                        <div style={{ overflowY: "auto", overflowX: "auto", flexGrow: 1 }}>
                            {selectedReport.usageDetails && Array.isArray(selectedReport.usageDetails) && selectedReport.usageDetails.length > 0 ? (
                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                                    <thead>
                                        <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
                                            <th style={{ padding: "10px", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>Type</th>
                                            <th style={{ padding: "10px", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>Quantity</th>
                                            <th style={{ padding: "10px", borderBottom: "1px solid #e2e8f0" }}>Description</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedReport.usageDetails.map((item, idx) => (
                                            <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                                <td style={{ padding: "10px", fontWeight: "600", color: "#334155", whiteSpace: "nowrap" }}>{item.type}</td>
                                                <td style={{ padding: "10px", color: "#3b82f6", fontWeight: "bold", whiteSpace: "nowrap" }}>{item.quantity} L</td>
                                                <td style={{ padding: "10px", color: "#64748b" }}>{item.desc || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div style={{ textAlign: "center", padding: "20px", color: "#94a3b8" }}>No detailed breakdown available.</div>
                            )}
                        </div>

                        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "20px", paddingTop: "16px", borderTop: "1px solid #e2e8f0", flexShrink: 0 }}>
                            <button onClick={() => setSelectedReport(null)} style={{ background: "#f1f5f9", color: "#475569", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StaffMilkReportsView;
