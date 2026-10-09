import React, { useState, useEffect } from "react";
import api from "../../../services/api";

const statusBadges = {
  PENDING: { bg: "#fef3c7", color: "#b45309", border: "#fde68a", label: "Pending Approval" },
  APPROVED: { bg: "#dcfce7", color: "#166534", border: "#bbf7d0", label: "Approved" },
  REJECTED: { bg: "#fee2e2", color: "#991b1b", border: "#fecaca", label: "Rejected" },
  CANCELLED: { bg: "#f1f5f9", color: "#475569", border: "#e2e8f0", label: "Cancelled" },
};

const MyLeaves = () => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [toast, setToast] = useState({ text: "", type: "" });
  const [filter, setFilter] = useState("ALL");

  // Calculate minimum selectable start date: today + 1 calendar day (enforces 1-day advance rule)
  const getMinStartDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  };

  const minStartDate = getMinStartDate();

  const [form, setForm] = useState({
    startDate: minStartDate,
    endDate: minStartDate,
    reason: "",
  });

  const showToast = (text, type = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast({ text: "", type: "" }), 4000);
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const res = await api.get("/delivery/my-leaves");
      setLeaves(res.data);
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || "Failed to load leave records", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!form.startDate || !form.endDate || !form.reason.trim()) {
      setErrorMsg("Please fill out all required fields.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post("/delivery/leaves", {
        startDate: form.startDate,
        endDate: form.endDate,
        reason: form.reason,
      });

      showToast("Leave application submitted successfully!");
      setIsModalOpen(false);
      setForm({
        startDate: minStartDate,
        endDate: minStartDate,
        reason: "",
      });
      fetchLeaves();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || "Failed to apply for leave");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelLeave = async (leaveId) => {
    if (!window.confirm("Are you sure you want to cancel this leave request?")) return;

    try {
      await api.patch(`/delivery/leaves/${leaveId}/cancel`);
      showToast("Leave request cancelled.");
      fetchLeaves();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to cancel leave", "error");
    }
  };

  const filteredLeaves = leaves.filter((l) => (filter === "ALL" ? true : l.status === filter));

  const stats = {
    total: leaves.length,
    pending: leaves.filter((l) => l.status === "PENDING").length,
    approved: leaves.filter((l) => l.status === "APPROVED").length,
    rejected: leaves.filter((l) => l.status === "REJECTED").length,
  };

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
      {/* Toast Notification */}
      {toast.text && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            zIndex: 9999,
            padding: "14px 20px",
            background: toast.type === "error" ? "#ef4444" : "#10b981",
            color: "white",
            borderRadius: "10px",
            boxShadow: "0 10px 15px -3px rgba(0,0,0,0.2)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontWeight: 500,
          }}
        >
          {toast.type === "error" ? "⚠️" : "✅"} {toast.text}
        </div>
      )}

      {/* Header Toolbar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <div>
          <h2 style={{ fontSize: "1.6rem", fontWeight: "700", color: "#0f172a", margin: 0 }}>
            📅 My Leave Requests
          </h2>
          <p style={{ color: "#64748b", margin: "4px 0 0 0", fontSize: "14px" }}>
            Apply for leave in advance and track your approval status.
          </p>
        </div>

        <button
          onClick={() => {
            setErrorMsg("");
            setIsModalOpen(true);
          }}
          style={{
            background: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)",
            color: "white",
            border: "none",
            padding: "12px 22px",
            borderRadius: "10px",
            fontWeight: "600",
            fontSize: "14px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            boxShadow: "0 4px 6px -1px rgba(37, 99, 235, 0.2)",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-1px)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
        >
          <span style={{ fontSize: "16px" }}>+</span> Apply for Leave
        </button>
      </div>

      {/* Advance Rule Reminder Banner */}
      <div
        style={{
          background: "#eff6ff",
          border: "1px solid #bfdbfe",
          borderRadius: "12px",
          padding: "16px 20px",
          marginBottom: "24px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          color: "#1e40af",
        }}
      >
        <span style={{ fontSize: "20px" }}>ℹ️</span>
        <div style={{ fontSize: "13.5px", lineHeight: "1.5" }}>
          <strong>Policy Notice:</strong> Leave must be requested at least{" "}
          <strong>1 day in advance</strong> before the start date. Earliest date you can apply for is{" "}
          <strong>{minStartDate}</strong>.
        </div>
      </div>

      {/* KPI Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <div
          style={{
            background: "white",
            padding: "16px 20px",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ color: "#64748b", fontSize: "12px", fontWeight: "600", textTransform: "uppercase" }}>
            Total Requests
          </div>
          <div style={{ fontSize: "24px", fontWeight: "700", color: "#0f172a", marginTop: "4px" }}>
            {stats.total}
          </div>
        </div>

        <div
          style={{
            background: "white",
            padding: "16px 20px",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ color: "#b45309", fontSize: "12px", fontWeight: "600", textTransform: "uppercase" }}>
            Pending
          </div>
          <div style={{ fontSize: "24px", fontWeight: "700", color: "#d97706", marginTop: "4px" }}>
            {stats.pending}
          </div>
        </div>

        <div
          style={{
            background: "white",
            padding: "16px 20px",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ color: "#15803d", fontSize: "12px", fontWeight: "600", textTransform: "uppercase" }}>
            Approved
          </div>
          <div style={{ fontSize: "24px", fontWeight: "700", color: "#16a34a", marginTop: "4px" }}>
            {stats.approved}
          </div>
        </div>

        <div
          style={{
            background: "white",
            padding: "16px 20px",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ color: "#b91c1c", fontSize: "12px", fontWeight: "600", textTransform: "uppercase" }}>
            Rejected
          </div>
          <div style={{ fontSize: "24px", fontWeight: "700", color: "#dc2626", marginTop: "4px" }}>
            {stats.rejected}
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          marginBottom: "20px",
          borderBottom: "1px solid #e2e8f0",
          paddingBottom: "12px",
        }}
      >
        {["ALL", "PENDING", "APPROVED", "REJECTED", "CANCELLED"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              border: "none",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s",
              background: filter === f ? "#1e3a8a" : "#f1f5f9",
              color: filter === f ? "white" : "#475569",
            }}
          >
            {f === "ALL" ? "All Requests" : f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Leave List Card */}
      <div
        style={{
          background: "white",
          borderRadius: "14px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          overflow: "hidden",
        }}
      >
        {loading ? (
          <div style={{ padding: "48px", textAlign: "center", color: "#64748b" }}>Loading leave requests...</div>
        ) : filteredLeaves.length === 0 ? (
          <div style={{ padding: "48px", textAlign: "center" }}>
            <div style={{ fontSize: "36px", marginBottom: "12px" }}>🌴</div>
            <h4 style={{ margin: "0 0 6px 0", color: "#334155" }}>No leave records found</h4>
            <p style={{ margin: 0, color: "#94a3b8", fontSize: "14px" }}>
              {filter === "ALL"
                ? "You haven't submitted any leave requests yet."
                : `No requests with status "${filter}".`}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#475569", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  <th style={{ padding: "14px 18px" }}>Leave Period</th>
                  <th style={{ padding: "14px 18px" }}>Duration</th>
                  <th style={{ padding: "14px 18px" }}>Reason</th>
                  <th style={{ padding: "14px 18px" }}>Applied At</th>
                  <th style={{ padding: "14px 18px" }}>Status</th>
                  <th style={{ padding: "14px 18px", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeaves.map((l) => {
                  const s = new Date(l.startDate);
                  const e = new Date(l.endDate);
                  const days = Math.round((e - s) / (24 * 60 * 60 * 1000)) + 1;
                  const badge = statusBadges[l.status] || statusBadges.PENDING;

                  return (
                    <tr
                      key={l.id}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(ev) => (ev.currentTarget.style.background = "#f8fafc")}
                      onMouseLeave={(ev) => (ev.currentTarget.style.background = "transparent")}
                    >
                      <td style={{ padding: "16px 18px", fontWeight: "600", color: "#1e293b" }}>
                        {s.toISOString().split("T")[0]} &rarr; {e.toISOString().split("T")[0]}
                      </td>
                      <td style={{ padding: "16px 18px", color: "#475569", fontSize: "13.5px" }}>
                        <span
                          style={{
                            background: "#f1f5f9",
                            padding: "4px 8px",
                            borderRadius: "6px",
                            fontWeight: "600",
                          }}
                        >
                          {days} {days === 1 ? "day" : "days"}
                        </span>
                      </td>
                      <td style={{ padding: "16px 18px", color: "#334155", fontSize: "13.5px", maxWidth: "260px" }}>
                        <div>{l.reason}</div>
                        {l.rejectionReason && (
                          <div style={{ color: "#dc2626", fontSize: "12px", marginTop: "4px" }}>
                            Rejection Note: {l.rejectionReason}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "16px 18px", color: "#64748b", fontSize: "13px" }}>
                        {new Date(l.appliedAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: "16px 18px" }}>
                        <span
                          style={{
                            background: badge.bg,
                            color: badge.color,
                            border: `1px solid ${badge.border}`,
                            padding: "4px 10px",
                            borderRadius: "20px",
                            fontSize: "12px",
                            fontWeight: "600",
                            display: "inline-block",
                          }}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td style={{ padding: "16px 18px", textAlign: "right" }}>
                        {l.status === "PENDING" && (
                          <button
                            onClick={() => handleCancelLeave(l.id)}
                            style={{
                              background: "transparent",
                              color: "#dc2626",
                              border: "1px solid #fca5a5",
                              padding: "6px 12px",
                              borderRadius: "6px",
                              fontSize: "12px",
                              fontWeight: "600",
                              cursor: "pointer",
                              transition: "all 0.2s",
                            }}
                            onMouseEnter={(ev) => (ev.currentTarget.style.background = "#fee2e2")}
                            onMouseLeave={(ev) => (ev.currentTarget.style.background = "transparent")}
                          >
                            Cancel Request
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Apply Leave Modal */}
      {isModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "16px",
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "500px",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)",
              overflow: "hidden",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h3 style={{ margin: 0, fontSize: "1.25rem", color: "#0f172a" }}>📝 Apply for Leave</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: "20px",
                  color: "#64748b",
                  cursor: "pointer",
                }}
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleApply} style={{ padding: "24px" }}>
              {errorMsg && (
                <div
                  style={{
                    background: "#fee2e2",
                    border: "1px solid #fecaca",
                    color: "#991b1b",
                    padding: "12px 16px",
                    borderRadius: "8px",
                    marginBottom: "16px",
                    fontSize: "13.5px",
                  }}
                >
                  ⚠️ {errorMsg}
                </div>
              )}

              <div
                style={{
                  background: "#f8fafc",
                  padding: "12px 16px",
                  borderRadius: "8px",
                  fontSize: "12.5px",
                  color: "#475569",
                  marginBottom: "18px",
                  border: "1px solid #e2e8f0",
                }}
              >
                📌 <strong>Rule:</strong> Must be applied at least 1 day in advance. Start date cannot be earlier than{" "}
                <strong>{minStartDate}</strong>.
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>
                    Start Date *
                  </label>
                  <input
                    type="date"
                    min={minStartDate}
                    value={form.startDate}
                    onChange={(e) => {
                      const newStart = e.target.value;
                      setForm((prev) => ({
                        ...prev,
                        startDate: newStart,
                        endDate: prev.endDate < newStart ? newStart : prev.endDate,
                      }));
                    }}
                    required
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "14px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>
                    End Date *
                  </label>
                  <input
                    type="date"
                    min={form.startDate || minStartDate}
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    required
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "14px",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: "24px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>
                  Reason for Leave *
                </label>
                <textarea
                  rows={3}
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  placeholder="e.g. Family function, medical visit, personal emergency..."
                  required
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "14px",
                    boxSizing: "border-box",
                    fontFamily: "inherit",
                    resize: "vertical",
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: "10px 18px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    background: "#f8fafc",
                    color: "#475569",
                    fontWeight: "600",
                    fontSize: "14px",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: "10px 22px",
                    borderRadius: "8px",
                    border: "none",
                    background: "#1e3a8a",
                    color: "white",
                    fontWeight: "600",
                    fontSize: "14px",
                    cursor: submitting ? "not-allowed" : "pointer",
                    opacity: submitting ? 0.7 : 1,
                  }}
                >
                  {submitting ? "Submitting..." : "Submit Application"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyLeaves;
