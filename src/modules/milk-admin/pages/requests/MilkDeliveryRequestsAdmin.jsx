import React, { useState, useEffect, useMemo } from "react";
import api from "../../../../services/api";

const MilkDeliveryRequestsAdmin = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ text: "", type: "" });
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL, PENDING, APPROVED, REJECTED
  const [typeFilter, setTypeFilter] = useState("ALL"); // ALL, EXTRA_MILK, SKIP_DELIVERY
  const [dateFilter, setDateFilter] = useState("");
  const [search, setSearch] = useState("");
  const [rejectModal, setRejectModal] = useState({ isOpen: false, requestId: null, reason: "" });
  const [actionLoading, setActionLoading] = useState(false);

  const showToast = (text, type = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast({ text: "", type: "" }), 4000);
  };

  useEffect(() => {
    fetchRequests();
  }, [statusFilter, typeFilter, dateFilter]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter !== "ALL") params.status = statusFilter;
      if (typeFilter !== "ALL") params.requestType = typeFilter;
      if (dateFilter) params.date = dateFilter;
      if (search.trim()) params.search = search.trim();

      const res = await api.get("/milk-delivery-requests", { params });
      setRequests(res.data || []);
    } catch (err) {
      console.error(err);
      showToast("Failed to fetch delivery requests", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchRequests();
  };

  const handleApprove = async (id) => {
    if (!window.confirm("Approve this milk delivery request?")) return;
    try {
      setActionLoading(true);
      const res = await api.patch(`/milk-delivery-requests/${id}/approve`);
      showToast("Request approved successfully!");
      setRequests((prev) => prev.map((r) => (r.id === id ? res.data.request : r)));
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to approve request", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const openRejectModal = (id) => {
    setRejectModal({ isOpen: true, requestId: id, reason: "" });
  };

  const handleConfirmReject = async () => {
    if (!rejectModal.requestId) return;
    try {
      setActionLoading(true);
      const res = await api.patch(`/milk-delivery-requests/${rejectModal.requestId}/reject`, {
        reason: rejectModal.reason || "Rejected by Admin",
      });
      showToast("Request rejected.");
      setRequests((prev) => prev.map((r) => (r.id === rejectModal.requestId ? res.data.request : r)));
      setRejectModal({ isOpen: false, requestId: null, reason: "" });
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to reject request", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const stats = useMemo(() => {
    const total = requests.length;
    const pending = requests.filter((r) => r.status === "PENDING").length;
    const approved = requests.filter((r) => r.status === "APPROVED").length;
    const rejected = requests.filter((r) => r.status === "REJECTED").length;
    return { total, pending, approved, rejected };
  }, [requests]);

  const fmtDate = (d) => {
    if (!d) return "N/A";
    return new Date(d).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "PENDING":
        return { bg: "#fef3c7", color: "#92400e", label: "Pending" };
      case "APPROVED":
        return { bg: "#dcfce7", color: "#166534", label: "Approved" };
      case "REJECTED":
        return { bg: "#fee2e2", color: "#991b1b", label: "Rejected" };
      case "CANCELLED":
        return { bg: "#f1f5f9", color: "#64748b", label: "Cancelled" };
      default:
        return { bg: "#f3f4f6", color: "#374151", label: status };
    }
  };

  return (
    <div style={{ padding: "24px", maxWidth: "1300px", margin: "0 auto", fontFamily: '"Inter", sans-serif' }}>
      {toast.text && (
        <div
          style={{
            position: "fixed",
            top: "24px",
            right: "24px",
            background: toast.type === "error" ? "#ef4444" : "#10b981",
            color: "white",
            padding: "14px 22px",
            borderRadius: "10px",
            zIndex: 9999,
            fontWeight: "bold",
            boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
          }}
        >
          {toast.text}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ margin: "0 0 6px 0", fontSize: "1.75rem", color: "#0f172a", fontWeight: "800" }}>
          📝 Milk Delivery Requests
        </h1>
        <p style={{ margin: 0, color: "#64748b", fontSize: "0.95rem" }}>
          Manage advance customer requests for Extra Milk and Skip Delivery (Customer Not At Home).
        </p>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        <div style={{ background: "white", padding: "18px 20px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 2px 6px rgba(0,0,0,0.03)" }}>
          <div style={{ fontSize: "12.5px", color: "#64748b", fontWeight: "600" }}>Total In View</div>
          <div style={{ fontSize: "24px", fontWeight: "800", color: "#0f172a", marginTop: "4px" }}>{stats.total}</div>
        </div>
        <div
          onClick={() => setStatusFilter("PENDING")}
          style={{
            background: statusFilter === "PENDING" ? "#fffbeb" : "white",
            padding: "18px 20px",
            borderRadius: "12px",
            border: statusFilter === "PENDING" ? "2px solid #f59e0b" : "1px solid #e2e8f0",
            cursor: "pointer",
            boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
          }}
        >
          <div style={{ fontSize: "12.5px", color: "#d97706", fontWeight: "700" }}>⏳ Pending Requests</div>
          <div style={{ fontSize: "24px", fontWeight: "800", color: "#b45309", marginTop: "4px" }}>{stats.pending}</div>
        </div>
        <div
          onClick={() => setStatusFilter("APPROVED")}
          style={{
            background: statusFilter === "APPROVED" ? "#f0fdf4" : "white",
            padding: "18px 20px",
            borderRadius: "12px",
            border: statusFilter === "APPROVED" ? "2px solid #22c55e" : "1px solid #e2e8f0",
            cursor: "pointer",
            boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
          }}
        >
          <div style={{ fontSize: "12.5px", color: "#16a34a", fontWeight: "700" }}>✅ Approved Requests</div>
          <div style={{ fontSize: "24px", fontWeight: "800", color: "#15803d", marginTop: "4px" }}>{stats.approved}</div>
        </div>
        <div
          onClick={() => setStatusFilter("REJECTED")}
          style={{
            background: statusFilter === "REJECTED" ? "#fef2f2" : "white",
            padding: "18px 20px",
            borderRadius: "12px",
            border: statusFilter === "REJECTED" ? "2px solid #ef4444" : "1px solid #e2e8f0",
            cursor: "pointer",
            boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
          }}
        >
          <div style={{ fontSize: "12.5px", color: "#dc2626", fontWeight: "700" }}>❌ Rejected Requests</div>
          <div style={{ fontSize: "24px", fontWeight: "800", color: "#b91c1c", marginTop: "4px" }}>{stats.rejected}</div>
        </div>
      </div>

      {/* Filters Bar */}
      <div
        style={{
          background: "white",
          borderRadius: "14px",
          border: "1px solid #e2e8f0",
          padding: "16px 20px",
          marginBottom: "20px",
          display: "flex",
          flexWrap: "wrap",
          gap: "14px",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Status Tabs */}
        <div style={{ display: "flex", gap: "6px", background: "#f1f5f9", padding: "4px", borderRadius: "10px" }}>
          {[
            { id: "ALL", label: "All" },
            { id: "PENDING", label: "Pending" },
            { id: "APPROVED", label: "Approved" },
            { id: "REJECTED", label: "Rejected" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              style={{
                background: statusFilter === tab.id ? "white" : "transparent",
                color: statusFilter === tab.id ? "#0f172a" : "#64748b",
                border: "none",
                padding: "6px 14px",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: statusFilter === tab.id ? "700" : "500",
                cursor: "pointer",
                boxShadow: statusFilter === tab.id ? "0 2px 4px rgba(0,0,0,0.06)" : "none",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Other Filters */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
          {/* Request Type */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              fontSize: "13px",
              background: "white",
              outline: "none",
            }}
          >
            <option value="ALL">All Request Types</option>
            <option value="EXTRA_MILK">🥛 Extra Milk</option>
            <option value="SKIP_DELIVERY">🏖️ Skip Delivery</option>
          </select>

          {/* Date Filter */}
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            style={{
              padding: "7px 12px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              fontSize: "13px",
              background: "white",
              outline: "none",
            }}
          />
          {dateFilter && (
            <button
              onClick={() => setDateFilter("")}
              style={{
                background: "transparent",
                border: "none",
                color: "#64748b",
                cursor: "pointer",
                fontSize: "12px",
                textDecoration: "underline",
              }}
            >
              Clear date
            </button>
          )}

          {/* Search */}
          <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: "6px" }}>
            <input
              type="text"
              placeholder="Search customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "13px",
                outline: "none",
                minWidth: "160px",
              }}
            />
            <button
              type="submit"
              style={{
                background: "#1e3a8a",
                color: "white",
                border: "none",
                padding: "8px 14px",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              Search
            </button>
          </form>
        </div>
      </div>

      {/* Table */}
      <div
        style={{
          background: "white",
          borderRadius: "14px",
          border: "1px solid #e2e8f0",
          overflow: "hidden",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        }}
      >
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>Loading requests...</div>
        ) : requests.length === 0 ? (
          <div style={{ padding: "48px 20px", textAlign: "center", color: "#64748b" }}>
            <div style={{ fontSize: "36px", marginBottom: "8px" }}>📝</div>
            <div style={{ fontSize: "16px", fontWeight: "700", color: "#334155" }}>No requests found</div>
            <div style={{ fontSize: "13px", marginTop: "4px" }}>Try selecting another filter or clear filters.</div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13.5px" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0", textAlign: "left", color: "#475569" }}>
                  <th style={{ padding: "14px 16px" }}>Customer</th>
                  <th style={{ padding: "14px 16px" }}>Delivery Date</th>
                  <th style={{ padding: "14px 16px" }}>Request Type</th>
                  <th style={{ padding: "14px 16px" }}>Regular Qty</th>
                  <th style={{ padding: "14px 16px" }}>Extra Qty</th>
                  <th style={{ padding: "14px 16px" }}>Total Qty</th>
                  <th style={{ padding: "14px 16px" }}>Note / Reason</th>
                  <th style={{ padding: "14px 16px" }}>Status</th>
                  <th style={{ padding: "14px 16px", textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => {
                  const badge = getStatusBadge(r.status);
                  const isSkip = r.requestType === "SKIP_DELIVERY";
                  const customerName = r.customer?.name || "Customer #" + r.customerId;

                  return (
                    <tr key={r.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      {/* Customer */}
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ fontWeight: "700", color: "#0f172a" }}>👤 {customerName}</div>
                        {r.customer?.email && (
                          <div style={{ fontSize: "12px", color: "#64748b" }}>{r.customer.email}</div>
                        )}
                      </td>

                      {/* Date */}
                      <td style={{ padding: "14px 16px", fontWeight: "600", color: "#334155", whiteSpace: "nowrap" }}>
                        📅 {fmtDate(r.deliveryDate)}
                      </td>

                      {/* Request Type */}
                      <td style={{ padding: "14px 16px", whiteSpace: "nowrap" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            padding: "4px 10px",
                            borderRadius: "14px",
                            fontSize: "12px",
                            fontWeight: "700",
                            background: isSkip ? "#fff7ed" : "#f0f9ff",
                            color: isSkip ? "#c2410c" : "#0284c7",
                            border: isSkip ? "1px solid #ffedd5" : "1px solid #e0f2fe",
                          }}
                        >
                          {isSkip ? "🏖️ Skip Delivery" : "🥛 Extra Milk"}
                        </span>
                      </td>

                      {/* Regular Qty */}
                      <td style={{ padding: "14px 16px", color: "#334155", fontWeight: "600" }}>
                        {r.regularQuantity} L
                      </td>

                      {/* Extra Qty */}
                      <td style={{ padding: "14px 16px", color: isSkip ? "#94a3b8" : "#0284c7", fontWeight: isSkip ? "normal" : "700" }}>
                        {isSkip ? "—" : `+${r.extraQuantity} L`}
                      </td>

                      {/* Total Qty */}
                      <td style={{ padding: "14px 16px", fontWeight: "800", color: isSkip ? "#c2410c" : "#166534" }}>
                        {isSkip ? "0 L" : `${r.totalQuantity} L`}
                      </td>

                      {/* Note */}
                      <td style={{ padding: "14px 16px", color: "#64748b", maxWidth: "220px" }}>
                        {r.note || "—"}
                        {r.rejectedReason && (
                          <div style={{ color: "#b91c1c", fontSize: "11px", marginTop: "2px" }}>
                            Rejection Reason: {r.rejectedReason}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td style={{ padding: "14px 16px", whiteSpace: "nowrap" }}>
                        <span
                          style={{
                            padding: "4px 10px",
                            borderRadius: "20px",
                            fontSize: "12px",
                            fontWeight: "700",
                            background: badge.bg,
                            color: badge.color,
                          }}
                        >
                          {badge.label}
                        </span>
                      </td>

                      {/* Action */}
                      <td style={{ padding: "14px 16px", textAlign: "right", whiteSpace: "nowrap" }}>
                        {r.status === "PENDING" ? (
                          <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                            <button
                              onClick={() => handleApprove(r.id)}
                              disabled={actionLoading}
                              style={{
                                background: "#16a34a",
                                color: "white",
                                border: "none",
                                padding: "6px 12px",
                                borderRadius: "6px",
                                fontSize: "12px",
                                fontWeight: "700",
                                cursor: "pointer",
                                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                              }}
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => openRejectModal(r.id)}
                              disabled={actionLoading}
                              style={{
                                background: "#fee2e2",
                                color: "#b91c1c",
                                border: "1px solid #fecaca",
                                padding: "6px 12px",
                                borderRadius: "6px",
                                fontSize: "12px",
                                fontWeight: "700",
                                cursor: "pointer",
                              }}
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                            {r.status === "APPROVED" && r.approvedBy ? `By ${r.approvedBy.name}` : "Closed"}
                          </span>
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

      {/* Reject Modal */}
      {rejectModal.isOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "16px",
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: "14px",
              padding: "24px",
              width: "100%",
              maxWidth: "460px",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)",
            }}
          >
            <h3 style={{ margin: "0 0 12px 0", fontSize: "1.2rem", color: "#0f172a" }}>Reject Milk Delivery Request</h3>
            <p style={{ margin: "0 0 16px 0", fontSize: "13.5px", color: "#64748b" }}>
              Please specify the reason for rejecting this customer's milk delivery request:
            </p>
            <textarea
              rows="3"
              placeholder="e.g. Insufficient extra milk available on this date, or deadline passed."
              value={rejectModal.reason}
              onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "13.5px",
                marginBottom: "20px",
                outline: "none",
                fontFamily: "inherit",
              }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                onClick={() => setRejectModal({ isOpen: false, requestId: null, reason: "" })}
                style={{
                  background: "#f1f5f9",
                  border: "1px solid #cbd5e1",
                  padding: "8px 16px",
                  borderRadius: "8px",
                  fontSize: "13.5px",
                  cursor: "pointer",
                  fontWeight: "600",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={actionLoading}
                style={{
                  background: "#dc2626",
                  color: "white",
                  border: "none",
                  padding: "8px 18px",
                  borderRadius: "8px",
                  fontSize: "13.5px",
                  fontWeight: "700",
                  cursor: "pointer",
                }}
              >
                {actionLoading ? "Rejecting..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MilkDeliveryRequestsAdmin;
