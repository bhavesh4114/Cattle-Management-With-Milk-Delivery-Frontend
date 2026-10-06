import React, { useState, useEffect } from "react";
import api from "../../../services/api";

const statusBadges = {
  PENDING: { bg: "#fef3c7", color: "#b45309", border: "#fde68a", label: "Pending" },
  APPROVED: { bg: "#dcfce7", color: "#166534", border: "#bbf7d0", label: "Approved" },
  REJECTED: { bg: "#fee2e2", color: "#991b1b", border: "#fecaca", label: "Rejected" },
  CANCELLED: { bg: "#f1f5f9", color: "#475569", border: "#e2e8f0", label: "Cancelled" },
};

const DeliveryLeavesAdmin = ({ onNavigateToQueue }) => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [toast, setToast] = useState({ text: "", type: "" });
  const [actionLoading, setActionLoading] = useState(false);

  // Assign Affected Deliveries Modal
  const [assignModal, setAssignModal] = useState({
    isOpen: false,
    leave: null,
    loading: false,
    affectedData: null,
    selectedByDate: {},
    bulkSelectedBoyId: "",
    successResult: null,
  });

  // Rejection Dialog
  const [rejectDialog, setRejectDialog] = useState({
    isOpen: false,
    leave: null,
    reason: "",
  });

  const showToast = (text, type = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast({ text: "", type: "" }), 4000);
  };

  useEffect(() => {
    fetchLeaves();
  }, [statusFilter]);

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const url =
        statusFilter === "ALL"
          ? "/delivery/admin/leaves"
          : `/delivery/admin/leaves?status=${statusFilter}`;
      const res = await api.get(url);
      setLeaves(res.data);
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || "Failed to load leave requests", "error");
    } finally {
      setLoading(false);
    }
  };

  // Open "Assign Affected Deliveries" Modal
  const handleOpenAssignModal = async (leave) => {
    setAssignModal({
      isOpen: true,
      leave,
      loading: true,
      affectedData: null,
      selectedByDate: {},
      bulkSelectedBoyId: "",
      successResult: null,
    });

    try {
      const res = await api.get(`/delivery/admin/leaves/${leave.id}/affected-deliveries`);
      setAssignModal((prev) => ({
        ...prev,
        loading: false,
        affectedData: res.data,
      }));
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to load affected deliveries", "error");
      setAssignModal({
        isOpen: false,
        leave: null,
        loading: false,
        affectedData: null,
        selectedByDate: {},
        bulkSelectedBoyId: "",
        successResult: null,
      });
    }
  };

  const handleApplyBulk = () => {
    if (!assignModal.bulkSelectedBoyId) {
      showToast("Please choose a Delivery Boy to assign all deliveries to", "error");
      return;
    }
    const newSelected = {};
    assignModal.affectedData?.dates?.forEach((d) => {
      newSelected[d.date] = assignModal.bulkSelectedBoyId;
    });
    setAssignModal((prev) => ({ ...prev, selectedByDate: newSelected }));
    showToast("Assigned chosen Delivery Boy to all dates. Click 'Assign Deliveries' to finalize.");
  };

  const handleDateBoyChange = (dateKey, boyId) => {
    setAssignModal((prev) => ({
      ...prev,
      selectedByDate: { ...prev.selectedByDate, [dateKey]: boyId },
    }));
  };

  const handleAssignSubmit = async () => {
    if (!assignModal.leave) return;

    try {
      setActionLoading(true);
      const res = await api.post(`/delivery/admin/leaves/${assignModal.leave.id}/approve-and-assign`, {
        assignmentsByDate: assignModal.selectedByDate,
        globalDeliveryBoyId: assignModal.bulkSelectedBoyId || undefined,
      });

      setAssignModal((prev) => ({
        ...prev,
        successResult: res.data,
      }));
      showToast("Deliveries directly assigned successfully!");
      fetchLeaves();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to assign deliveries", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectDialog.leave) return;

    try {
      setActionLoading(true);
      await api.patch(`/delivery/admin/leaves/${rejectDialog.leave.id}/reject`, {
        reason: rejectDialog.reason,
      });
      showToast(`Leave for ${rejectDialog.leave.deliveryBoy?.name} rejected.`);
      setRejectDialog({ isOpen: false, leave: null, reason: "" });
      fetchLeaves();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to reject leave", "error");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
      {/* Toast Alert */}
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

      {/* Header */}
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
            🏖️ Delivery Boy Leave Management
          </h2>
          <p style={{ color: "#64748b", margin: "4px 0 0 0", fontSize: "14px" }}>
            Review leave requests and directly assign affected deliveries to replacement delivery boys.
          </p>
        </div>

        {onNavigateToQueue && (
          <button
            onClick={onNavigateToQueue}
            style={{
              background: "#f1f5f9",
              color: "#1e3a8a",
              border: "1px solid #cbd5e1",
              padding: "10px 18px",
              borderRadius: "10px",
              fontWeight: "600",
              fontSize: "13.5px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#e2e8f0")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#f1f5f9")}
          >
            🔄 View Reassignment Queue
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          marginBottom: "20px",
          borderBottom: "1px solid #e2e8f0",
          paddingBottom: "12px",
          overflowX: "auto",
        }}
      >
        {[
          { id: "PENDING", label: "Pending Approval" },
          { id: "APPROVED", label: "Approved" },
          { id: "REJECTED", label: "Rejected" },
          { id: "CANCELLED", label: "Cancelled" },
          { id: "ALL", label: "All Records" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            style={{
              padding: "8px 18px",
              borderRadius: "8px",
              border: "none",
              fontSize: "13.5px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s",
              background: statusFilter === tab.id ? "#1e3a8a" : "#f1f5f9",
              color: statusFilter === tab.id ? "white" : "#475569",
              whiteSpace: "nowrap",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Table Card */}
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
        ) : leaves.length === 0 ? (
          <div style={{ padding: "50px", textAlign: "center" }}>
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>📋</div>
            <h4 style={{ margin: "0 0 6px 0", color: "#334155" }}>No leave requests found</h4>
            <p style={{ margin: 0, color: "#94a3b8", fontSize: "14px" }}>
              There are no leave requests under status "{statusFilter}".
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#475569", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  <th style={{ padding: "14px 18px" }}>Delivery Boy</th>
                  <th style={{ padding: "14px 18px" }}>Leave Window</th>
                  <th style={{ padding: "14px 18px" }}>Duration</th>
                  <th style={{ padding: "14px 18px" }}>Reason</th>
                  <th style={{ padding: "14px 18px" }}>Applied Date</th>
                  <th style={{ padding: "14px 18px" }}>Status</th>
                  <th style={{ padding: "14px 18px", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {leaves.map((l) => {
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
                      <td style={{ padding: "16px 18px" }}>
                        <div style={{ fontWeight: "600", color: "#0f172a" }}>
                          {l.deliveryBoy?.name || "Delivery Boy"}
                        </div>
                        <div style={{ fontSize: "12.5px", color: "#64748b" }}>
                          {l.deliveryBoy?.deliveryProfile?.mobile || l.deliveryBoy?.email}
                        </div>
                        {l.deliveryBoy?.deliveryProfile?.pincodes?.length > 0 && (
                          <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>
                            Areas: {l.deliveryBoy.deliveryProfile.pincodes.slice(0, 3).join(", ")}
                          </div>
                        )}
                      </td>

                      <td style={{ padding: "16px 18px", fontWeight: "600", color: "#1e293b", fontSize: "13.5px" }}>
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

                      <td style={{ padding: "16px 18px", color: "#334155", fontSize: "13.5px", maxWidth: "240px" }}>
                        <div>{l.reason}</div>
                        {l.rejectionReason && (
                          <div style={{ color: "#dc2626", fontSize: "12px", marginTop: "4px" }}>
                            Reason: {l.rejectionReason}
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
                        {l.status === "PENDING" ? (
                          <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                            <button
                              disabled={actionLoading}
                              onClick={() => handleOpenAssignModal(l)}
                              style={{
                                background: "#10b981",
                                color: "white",
                                border: "none",
                                padding: "7px 16px",
                                borderRadius: "8px",
                                fontSize: "12.5px",
                                fontWeight: "600",
                                cursor: "pointer",
                                transition: "all 0.2s",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                              }}
                              onMouseEnter={(ev) => (ev.currentTarget.style.background = "#059669")}
                              onMouseLeave={(ev) => (ev.currentTarget.style.background = "#10b981")}
                            >
                              Approve
                            </button>

                            <button
                              disabled={actionLoading}
                              onClick={() => setRejectDialog({ isOpen: true, leave: l, reason: "" })}
                              style={{
                                background: "#fee2e2",
                                color: "#b91c1c",
                                border: "1px solid #fecaca",
                                padding: "7px 14px",
                                borderRadius: "8px",
                                fontSize: "12.5px",
                                fontWeight: "600",
                                cursor: "pointer",
                                transition: "all 0.2s",
                              }}
                              onMouseEnter={(ev) => (ev.currentTarget.style.background = "#fecaca")}
                              onMouseLeave={(ev) => (ev.currentTarget.style.background = "#fee2e2")}
                            >
                              Reject
                            </button>
                          </div>
                        ) : l.status === "APPROVED" ? (
                          <button
                            onClick={() => handleOpenAssignModal(l)}
                            style={{
                              background: "#f1f5f9",
                              color: "#1e3a8a",
                              border: "1px solid #cbd5e1",
                              padding: "6px 12px",
                              borderRadius: "6px",
                              fontSize: "12px",
                              fontWeight: "600",
                              cursor: "pointer",
                            }}
                          >
                            View / Reassign
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ================================================== */}
      {/* 2. ADMIN SELECTS REPLACEMENT DELIVERY BOY MODAL     */}
      {/* "Assign Affected Deliveries"                       */}
      {/* ================================================== */}
      {assignModal.isOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(15, 23, 42, 0.65)",
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
              maxWidth: "680px",
              maxHeight: "90vh",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                background: "#f8fafc",
                padding: "20px 24px",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <h3 style={{ margin: 0, color: "#0f172a", fontSize: "1.25rem", fontWeight: "700" }}>
                  Assign Affected Deliveries
                </h3>
                <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "13px" }}>
                  Directly assign replacement delivery boys. The Admin's selection is final.
                </p>
              </div>
              <button
                onClick={() =>
                  setAssignModal({
                    isOpen: false,
                    leave: null,
                    loading: false,
                    affectedData: null,
                    selectedByDate: {},
                    bulkSelectedBoyId: "",
                    successResult: null,
                  })
                }
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: "24px",
                  color: "#64748b",
                  cursor: "pointer",
                }}
              >
                &times;
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: "24px", overflowY: "auto", flex: 1 }}>
              {assignModal.loading ? (
                <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
                  Calculating affected deliveries and eligible staff...
                </div>
              ) : assignModal.successResult ? (
                /* ================================================== */
                /* SUCCESS VIEW (Requirement 15)                      */
                /* ================================================== */
                <div>
                  <div
                    style={{
                      background: "#f0fdf4",
                      border: "1px solid #bbf7d0",
                      borderRadius: "12px",
                      padding: "20px",
                      textAlign: "center",
                      marginBottom: "20px",
                    }}
                  >
                    <div style={{ fontSize: "36px", marginBottom: "8px" }}>✅</div>
                    <h4 style={{ margin: "0 0 6px 0", color: "#166534", fontSize: "1.2rem", fontWeight: "700" }}>
                      Direct Assignment Completed!
                    </h4>
                    <p style={{ margin: 0, color: "#15803d", fontSize: "14px", fontWeight: "600" }}>
                      {assignModal.successResult.reassignedCount} deliveries successfully assigned.
                    </p>
                    <p style={{ margin: "4px 0 0 0", color: "#166534", fontSize: "12.5px" }}>
                      Selected replacement delivery boy(s) received an alert and will see deliveries immediately.
                    </p>
                  </div>

                  {/* Summary Breakdown per date */}
                  <div
                    style={{
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: "12px",
                      padding: "16px",
                      marginBottom: "20px",
                    }}
                  >
                    <div style={{ fontSize: "12px", fontWeight: "700", textTransform: "uppercase", color: "#475569", marginBottom: "12px" }}>
                      Assignment Mapping:
                    </div>
                    {assignModal.affectedData?.dates?.map((d) => {
                      const assignedBoyId = assignModal.selectedByDate[d.date] || assignModal.bulkSelectedBoyId;
                      const boyObj = assignModal.affectedData?.allEligibleDeliveryBoys?.find(
                        (b) => String(b.id) === String(assignedBoyId)
                      );
                      const boyName = boyObj?.name || "Unassigned (Moved to Queue)";

                      return (
                        <div
                          key={d.date}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "10px 12px",
                            background: "white",
                            borderRadius: "8px",
                            border: "1px solid #e2e8f0",
                            marginBottom: "8px",
                            fontSize: "13.5px",
                          }}
                        >
                          <div>
                            <strong>{d.displayDate}</strong> ({d.count} {d.count === 1 ? "delivery" : "deliveries"})
                          </div>
                          <div style={{ fontWeight: "700", color: assignedBoyId ? "#1e3a8a" : "#d97706" }}>
                            &rarr; {boyName}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button
                      onClick={() =>
                        setAssignModal({
                          isOpen: false,
                          leave: null,
                          loading: false,
                          affectedData: null,
                          selectedByDate: {},
                          bulkSelectedBoyId: "",
                          successResult: null,
                        })
                      }
                      style={{
                        padding: "10px 24px",
                        borderRadius: "8px",
                        background: "#1e3a8a",
                        color: "white",
                        border: "none",
                        fontWeight: "600",
                        fontSize: "14px",
                        cursor: "pointer",
                      }}
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                /* ================================================== */
                /* ASSIGNMENT FORM (Requirements 1, 2, 8, 9)          */
                /* ================================================== */
                <div>
                  {/* Leave Context Box */}
                  <div
                    style={{
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: "12px",
                      padding: "16px 20px",
                      marginBottom: "20px",
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "12px",
                      fontSize: "13.5px",
                    }}
                  >
                    <div>
                      <span style={{ color: "#64748b" }}>Delivery Boy: </span>
                      <strong style={{ color: "#0f172a" }}>
                        {assignModal.affectedData?.leave?.deliveryBoyName || assignModal.leave?.deliveryBoy?.name}
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: "#64748b" }}>Leave Window: </span>
                      <strong style={{ color: "#0f172a" }}>
                        {assignModal.affectedData?.leave?.startDate} &rarr; {assignModal.affectedData?.leave?.endDate}
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: "#64748b" }}>Status: </span>
                      <span
                        style={{
                          background: "#dcfce7",
                          color: "#166534",
                          padding: "2px 8px",
                          borderRadius: "12px",
                          fontSize: "12px",
                          fontWeight: "700",
                        }}
                      >
                        {assignModal.leave?.status === "PENDING" ? "Approving" : "Approved"}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: "#64748b" }}>Affected Deliveries: </span>
                      <strong style={{ color: "#dc2626", fontSize: "15px" }}>
                        {assignModal.affectedData?.totalAffected || 0}
                      </strong>
                    </div>
                  </div>

                  {assignModal.affectedData?.totalAffected === 0 ? (
                    <div
                      style={{
                        padding: "24px",
                        textAlign: "center",
                        background: "#f0fdf4",
                        borderRadius: "12px",
                        border: "1px solid #bbf7d0",
                        marginBottom: "20px",
                      }}
                    >
                      <div style={{ fontSize: "28px", marginBottom: "6px" }}>🎉</div>
                      <div style={{ fontWeight: "700", color: "#166534", marginBottom: "4px" }}>
                        No Affected Deliveries Found
                      </div>
                      <div style={{ fontSize: "13px", color: "#15803d" }}>
                        There are no active deliveries assigned to this delivery boy during this leave window. You can safely approve the leave directly.
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* ================================================== */}
                      {/* 9. BULK ASSIGNMENT OPTION ("Assign All")           */}
                      {/* ================================================== */}
                      <div
                        style={{
                          background: "#eff6ff",
                          border: "1px solid #bfdbfe",
                          borderRadius: "12px",
                          padding: "16px 20px",
                          marginBottom: "24px",
                        }}
                      >
                        <div style={{ fontSize: "13px", fontWeight: "700", color: "#1e40af", marginBottom: "8px" }}>
                          ⚡ Bulk Assignment ("Assign All")
                        </div>
                        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                          <span style={{ fontSize: "13px", color: "#1e3a8a" }}>
                            Assign all {assignModal.affectedData?.totalAffected} affected deliveries to:
                          </span>
                          <select
                            value={assignModal.bulkSelectedBoyId}
                            onChange={(e) => setAssignModal((prev) => ({ ...prev, bulkSelectedBoyId: e.target.value }))}
                            style={{
                              flex: "1 1 200px",
                              padding: "8px 12px",
                              borderRadius: "8px",
                              border: "1px solid #93c5fd",
                              background: "white",
                              fontSize: "13px",
                              fontWeight: "600",
                              color: "#1e293b",
                            }}
                          >
                            <option value="">[ Select Delivery Boy ▼ ]</option>
                            {assignModal.affectedData?.allEligibleDeliveryBoys?.map((boy) => (
                              <option key={boy.id} value={boy.id}>
                                {boy.name} {boy.pincodes?.length ? `(${boy.pincodes.slice(0, 2).join(",")})` : ""}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={handleApplyBulk}
                            style={{
                              background: "#2563eb",
                              color: "white",
                              border: "none",
                              padding: "8px 16px",
                              borderRadius: "8px",
                              fontWeight: "600",
                              fontSize: "13px",
                              cursor: "pointer",
                            }}
                          >
                            Assign All
                          </button>
                        </div>
                      </div>

                      {/* ================================================== */}
                      {/* 8. DIFFERENT DELIVERY BOYS PER DATE BREAKDOWN      */}
                      {/* ================================================== */}
                      <div style={{ marginBottom: "16px" }}>
                        <div style={{ fontSize: "13px", fontWeight: "700", textTransform: "uppercase", color: "#475569", marginBottom: "12px", letterSpacing: "0.5px" }}>
                          Date-by-Date Reassignment
                        </div>

                        {assignModal.affectedData?.dates?.map((d) => {
                          const selectedForThisDate = assignModal.selectedByDate[d.date] || "";

                          return (
                            <div
                              key={d.date}
                              style={{
                                background: "#ffffff",
                                border: "1px solid #e2e8f0",
                                borderRadius: "10px",
                                padding: "16px 18px",
                                marginBottom: "12px",
                                boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  flexWrap: "wrap",
                                  gap: "12px",
                                  marginBottom: "10px",
                                }}
                              >
                                <div>
                                  <div style={{ fontWeight: "700", color: "#0f172a", fontSize: "14.5px" }}>
                                    📅 {d.displayDate}
                                  </div>
                                  <div style={{ fontSize: "12.5px", color: "#64748b" }}>
                                    <strong>{d.count}</strong> {d.count === 1 ? "affected delivery" : "affected deliveries"}
                                  </div>
                                </div>

                                <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: "260px" }}>
                                  <span style={{ fontSize: "12.5px", fontWeight: "600", color: "#475569" }}>
                                    Assign To:
                                  </span>
                                  <select
                                    value={selectedForThisDate}
                                    onChange={(e) => handleDateBoyChange(d.date, e.target.value)}
                                    style={{
                                      flex: 1,
                                      padding: "8px 12px",
                                      borderRadius: "8px",
                                      border: "1px solid #cbd5e1",
                                      fontSize: "13px",
                                      fontWeight: "600",
                                      color: selectedForThisDate ? "#1e3a8a" : "#64748b",
                                      background: selectedForThisDate ? "#eff6ff" : "white",
                                    }}
                                  >
                                    <option value="">[ Select Delivery Boy ▼ ]</option>
                                    {d.eligibleDeliveryBoys?.map((boy) => (
                                      <option key={boy.id} value={boy.id}>
                                        {boy.name} {boy.pincodes?.length ? `(Areas: ${boy.pincodes.slice(0, 2).join(",")})` : ""}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              {/* Deliveries Preview */}
                              {d.deliveries?.length > 0 && (
                                <div
                                  style={{
                                    background: "#f8fafc",
                                    padding: "8px 12px",
                                    borderRadius: "6px",
                                    fontSize: "12px",
                                    color: "#475569",
                                    display: "flex",
                                    flexWrap: "wrap",
                                    gap: "6px",
                                  }}
                                >
                                  {d.deliveries.slice(0, 4).map((deliv, idx) => (
                                    <span
                                      key={idx}
                                      style={{
                                        background: "white",
                                        border: "1px solid #e2e8f0",
                                        padding: "2px 8px",
                                        borderRadius: "4px",
                                      }}
                                    >
                                      #{deliv.orderId} {deliv.customerName} ({deliv.milkType} x{deliv.dailyQuantity})
                                    </span>
                                  ))}
                                  {d.deliveries.length > 4 && (
                                    <span style={{ color: "#64748b", alignSelf: "center" }}>
                                      +{d.deliveries.length - 4} more
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {/* Actions Bar */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: "24px",
                      paddingTop: "16px",
                      borderTop: "1px solid #e2e8f0",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setAssignModal({
                          isOpen: false,
                          leave: null,
                          loading: false,
                          affectedData: null,
                          selectedByDate: {},
                          bulkSelectedBoyId: "",
                          successResult: null,
                        })
                      }
                      style={{
                        padding: "10px 18px",
                        borderRadius: "8px",
                        background: "#f8fafc",
                        border: "1px solid #cbd5e1",
                        color: "#475569",
                        fontWeight: "600",
                        fontSize: "13.5px",
                        cursor: "pointer",
                      }}
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={handleAssignSubmit}
                      style={{
                        padding: "10px 24px",
                        borderRadius: "8px",
                        background: "#10b981",
                        color: "white",
                        border: "none",
                        fontWeight: "700",
                        fontSize: "14px",
                        cursor: actionLoading ? "not-allowed" : "pointer",
                        boxShadow: "0 4px 6px -1px rgba(16, 185, 129, 0.2)",
                      }}
                      onMouseEnter={(e) => !actionLoading && (e.currentTarget.style.background = "#059669")}
                      onMouseLeave={(e) => !actionLoading && (e.currentTarget.style.background = "#10b981")}
                    >
                      {actionLoading
                        ? "Assigning Deliveries..."
                        : assignModal.affectedData?.totalAffected === 0
                        ? "Approve Leave"
                        : "Assign Deliveries"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject Reason Modal */}
      {rejectDialog.isOpen && (
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
              maxWidth: "460px",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h3 style={{ margin: 0, color: "#991b1b", fontSize: "1.2rem" }}>
                Reject Leave Request
              </h3>
              <button
                onClick={() => setRejectDialog({ isOpen: false, leave: null, reason: "" })}
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

            <form onSubmit={handleRejectSubmit} style={{ padding: "24px" }}>
              <p style={{ margin: "0 0 16px 0", color: "#475569", fontSize: "14px" }}>
                Rejecting leave for <strong>{rejectDialog.leave?.deliveryBoy?.name}</strong>. Provide an optional note for the delivery boy.
              </p>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#334155", marginBottom: "6px" }}>
                  Reason for Rejection (Optional)
                </label>
                <textarea
                  rows={3}
                  value={rejectDialog.reason}
                  onChange={(e) => setRejectDialog({ ...rejectDialog, reason: e.target.value })}
                  placeholder="e.g. High delivery volume during this period, insufficient staff..."
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "14px",
                    boxSizing: "border-box",
                    fontFamily: "inherit",
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setRejectDialog({ isOpen: false, leave: null, reason: "" })}
                  style={{
                    padding: "10px 16px",
                    borderRadius: "8px",
                    background: "#f8fafc",
                    border: "1px solid #cbd5e1",
                    color: "#475569",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{
                    padding: "10px 18px",
                    borderRadius: "8px",
                    background: "#dc2626",
                    color: "white",
                    border: "none",
                    fontWeight: "600",
                    cursor: actionLoading ? "not-allowed" : "pointer",
                  }}
                >
                  {actionLoading ? "Rejecting..." : "Confirm Rejection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryLeavesAdmin;
