import React, { useState, useEffect, useMemo } from "react";
import api from "../../../../services/api";

const MilkDeliveryRequestsAdmin = () => {
  const [requests, setRequests] = useState([]);
  const [deliveryBoys, setDeliveryBoys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ text: "", type: "" });
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("");
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Modals
  const [offerModal, setOfferModal] = useState({
    isOpen: false,
    request: null,
    availableQuantity: "",
    offeredQuantity: "",
  });

  const [assignModal, setAssignModal] = useState({
    isOpen: false,
    request: null,
    selectedBoyId: "",
  });

  const [rejectModal, setRejectModal] = useState({
    isOpen: false,
    requestId: null,
    reason: "",
  });

  const showToast = (text, type = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast({ text: "", type: "" }), 4000);
  };

  useEffect(() => {
    fetchRequests();
    fetchDeliveryBoys();
  }, [statusFilter, typeFilter, dateFilter]);

  const fetchDeliveryBoys = async () => {
    try {
      const res = await api.get("/milk-module/subscription/delivery-boys");
      setDeliveryBoys(res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

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

  // Open Offer Modal
  const openOfferModal = (req) => {
    const defaultAvail = req.extraQuantity || 1;
    setOfferModal({
      isOpen: true,
      request: req,
      availableQuantity: defaultAvail,
      offeredQuantity: defaultAvail,
    });
  };

  // Submit Offer
  const handleConfirmOffer = async () => {
    const { request, availableQuantity, offeredQuantity } = offerModal;
    if (!request) return;

    const avail = parseFloat(availableQuantity);
    const offer = parseFloat(offeredQuantity);

    if (isNaN(avail) || avail <= 0) {
      showToast("Available quantity must be greater than 0 (Cannot offer when available quantity is 0)", "error");
      return;
    }
    if (isNaN(offer) || offer <= 0) {
      showToast("Offered quantity must be greater than 0", "error");
      return;
    }
    if (offer > avail) {
      showToast(`Offered quantity (${offer}L) cannot be greater than available quantity (${avail}L)`, "error");
      return;
    }
    if (offer > request.extraQuantity) {
      showToast(`Offered quantity (${offer}L) cannot be greater than customer requested quantity (${request.extraQuantity}L)`, "error");
      return;
    }

    try {
      setActionLoading(true);
      const res = await api.patch(`/milk-delivery-requests/${request.id}/offer`, {
        availableQuantity: avail,
        offeredQuantity: offer,
      });
      showToast(`Offer of ${offer} L sent to customer successfully!`);
      setRequests((prev) => prev.map((r) => (r.id === request.id ? res.data.request : r)));
      setOfferModal({ isOpen: false, request: null, availableQuantity: "", offeredQuantity: "" });
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to submit offer", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Open Assign Modal
  const openAssignModal = (req) => {
    const regularBoyId = req.regularDeliveryBoy?.id || (deliveryBoys[0]?.id || "");
    setAssignModal({
      isOpen: true,
      request: req,
      selectedBoyId: regularBoyId ? String(regularBoyId) : "",
    });
  };

  // Submit Delivery Boy Assignment
  const handleConfirmAssign = async (deliveryBoyIdOverride = null) => {
    const { request, selectedBoyId } = assignModal;
    const boyId = deliveryBoyIdOverride || selectedBoyId;
    if (!request || !boyId) {
      showToast("Please select a delivery boy to assign", "error");
      return;
    }

    try {
      setActionLoading(true);
      const res = await api.patch(`/milk-delivery-requests/${request.id}/assign-delivery-boy`, {
        deliveryBoyId: boyId,
      });
      showToast("Delivery boy assigned successfully!");
      setRequests((prev) => prev.map((r) => (r.id === request.id ? res.data.result.request : r)));
      setAssignModal({ isOpen: false, request: null, selectedBoyId: "" });
      fetchRequests();
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to assign delivery boy", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Reject Modal
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
    const requested = requests.filter((r) => r.status === "EXTRA_REQUESTED" || r.status === "PENDING").length;
    const offered = requests.filter((r) => r.status === "ADMIN_OFFERED").length;
    const accepted = requests.filter((r) => r.status === "CUSTOMER_ACCEPTED").length;
    const assigned = requests.filter((r) =>
      ["EXTRA_ASSIGNED", "PRODUCT_COLLECTED", "OUT_FOR_DELIVERY", "ARRIVED", "DELIVERY_PENDING_CUSTOMER_CONFIRMATION", "DELIVERED", "APPROVED"].includes(r.status)
    ).length;
    return { total, requested, offered, accepted, assigned };
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
      case "EXTRA_REQUESTED":
      case "PENDING":
        return { bg: "#fef3c7", color: "#92400e", border: "#fde68a", label: "⏳ Extra Requested" };
      case "ADMIN_OFFERED":
        return { bg: "#e0f2fe", color: "#0369a1", border: "#bae6fd", label: "💬 Admin Offered – Awaiting Customer" };
      case "CUSTOMER_ACCEPTED":
        return { bg: "#e0e7ff", color: "#3730a3", border: "#c7d2fe", label: "✅ Customer Accepted – Ready to Assign" };
      case "EXTRA_REQUEST_REJECTED":
      case "REJECTED":
        return { bg: "#fee2e2", color: "#991b1b", border: "#fecaca", label: "❌ Offer Rejected" };
      case "EXTRA_ASSIGNED":
        return { bg: "#f0fdf4", color: "#166534", border: "#bbf7d0", label: "🚴 Delivery Boy Assigned" };
      case "PRODUCT_COLLECTED":
        return { bg: "#fef9c3", color: "#854d0e", border: "#fde047", label: "📦 Product Collected" };
      case "OUT_FOR_DELIVERY":
        return { bg: "#ffedd5", color: "#9a3412", border: "#fed7aa", label: "🚚 Out for Delivery" };
      case "ARRIVED":
        return { bg: "#ede9fe", color: "#5b21b6", border: "#ddd6fe", label: "📍 Delivery Boy Arrived" };
      case "DELIVERY_PENDING_CUSTOMER_CONFIRMATION":
        return { bg: "#ecfeff", color: "#155e75", border: "#a5f3fc", label: "🥛 Handover Pending Confirmation" };
      case "DELIVERED":
      case "APPROVED":
        return { bg: "#dcfce7", color: "#15803d", border: "#86efac", label: "🎉 Delivered" };
      case "CANCELLED":
        return { bg: "#f1f5f9", color: "#64748b", border: "#cbd5e1", label: "Cancelled" };
      default:
        return { bg: "#f3f4f6", color: "#374151", border: "#e5e7eb", label: status };
    }
  };

  return (
    <div style={{ padding: "24px", maxWidth: "1350px", margin: "0 auto", fontFamily: '"Inter", sans-serif' }}>
      {toast.text && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            zIndex: 9999,
            padding: "12px 20px",
            borderRadius: "10px",
            background: toast.type === "error" ? "#ef4444" : "#10b981",
            color: "white",
            fontWeight: "600",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          }}
        >
          {toast.text}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: "800", color: "#0f172a", margin: "0 0 6px 0" }}>
          🥛 Extra Milk Delivery Requests & Approval
        </h1>
        <p style={{ color: "#64748b", margin: 0, fontSize: "14px" }}>
          Check stock, offer available quantity, receive customer acceptance, and assign regular delivery boys.
        </p>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        <div style={{ background: "white", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: "12px", fontWeight: "700", color: "#64748b" }}>TOTAL REQUESTS</div>
          <div style={{ fontSize: "24px", fontWeight: "800", color: "#0f172a", marginTop: "4px" }}>{stats.total}</div>
        </div>
        <div style={{ background: "white", padding: "16px", borderRadius: "12px", border: "1px solid #fde68a" }}>
          <div style={{ fontSize: "12px", fontWeight: "700", color: "#b45309" }}>1. REQUESTED</div>
          <div style={{ fontSize: "24px", fontWeight: "800", color: "#d97706", marginTop: "4px" }}>{stats.requested}</div>
        </div>
        <div style={{ background: "white", padding: "16px", borderRadius: "12px", border: "1px solid #bae6fd" }}>
          <div style={{ fontSize: "12px", fontWeight: "700", color: "#0369a1" }}>2. OFFERED</div>
          <div style={{ fontSize: "24px", fontWeight: "800", color: "#0284c7", marginTop: "4px" }}>{stats.offered}</div>
        </div>
        <div style={{ background: "white", padding: "16px", borderRadius: "12px", border: "1px solid #c7d2fe" }}>
          <div style={{ fontSize: "12px", fontWeight: "700", color: "#4338ca" }}>3. ACCEPTED</div>
          <div style={{ fontSize: "24px", fontWeight: "800", color: "#4f46e5", marginTop: "4px" }}>{stats.accepted}</div>
        </div>
        <div style={{ background: "white", padding: "16px", borderRadius: "12px", border: "1px solid #bbf7d0" }}>
          <div style={{ fontSize: "12px", fontWeight: "700", color: "#15803d" }}>4. ASSIGNED / ACTIVE</div>
          <div style={{ fontSize: "24px", fontWeight: "800", color: "#16a34a", marginTop: "4px" }}>{stats.assigned}</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div
        style={{
          background: "white",
          padding: "16px 20px",
          borderRadius: "14px",
          border: "1px solid #e2e8f0",
          marginBottom: "20px",
          display: "flex",
          flexWrap: "wrap",
          gap: "12px",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px" }}
          >
            <option value="ALL">All Statuses</option>
            <option value="EXTRA_REQUESTED">⏳ Extra Requested</option>
            <option value="ADMIN_OFFERED">💬 Admin Offered</option>
            <option value="CUSTOMER_ACCEPTED">✅ Customer Accepted</option>
            <option value="EXTRA_ASSIGNED">🚴 Delivery Boy Assigned</option>
            <option value="DELIVERED">🎉 Delivered</option>
            <option value="EXTRA_REQUEST_REJECTED">❌ Rejected</option>
          </select>

          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            style={{ padding: "7px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px" }}
          />
          {dateFilter && (
            <button
              onClick={() => setDateFilter("")}
              style={{ background: "transparent", border: "none", color: "#64748b", cursor: "pointer", fontSize: "12px", textDecoration: "underline" }}
            >
              Clear date
            </button>
          )}
        </div>

        <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: "6px" }}>
          <input
            type="text"
            placeholder="Search customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px", minWidth: "180px" }}
          />
          <button
            type="submit"
            style={{ background: "#1e3a8a", color: "white", border: "none", padding: "8px 14px", borderRadius: "8px", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}
          >
            Search
          </button>
        </form>
      </div>

      {/* Table */}
      <div style={{ background: "white", borderRadius: "14px", border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>Loading requests...</div>
        ) : requests.length === 0 ? (
          <div style={{ padding: "48px 20px", textAlign: "center", color: "#64748b" }}>
            <div style={{ fontSize: "36px", marginBottom: "8px" }}>📝</div>
            <div style={{ fontSize: "16px", fontWeight: "700", color: "#334155" }}>No requests found</div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13.5px" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0", textAlign: "left", color: "#475569" }}>
                  <th style={{ padding: "14px 16px" }}>Customer & Location</th>
                  <th style={{ padding: "14px 16px" }}>Product</th>
                  <th style={{ padding: "14px 16px" }}>Requested Qty</th>
                  <th style={{ padding: "14px 16px" }}>Offered / Accepted</th>
                  <th style={{ padding: "14px 16px" }}>Regular Delivery Boy</th>
                  <th style={{ padding: "14px 16px" }}>Delivery Date</th>
                  <th style={{ padding: "14px 16px" }}>Status</th>
                  <th style={{ padding: "14px 16px", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => {
                  const badge = getStatusBadge(r.status);
                  const customerName = r.customer?.name || "Customer #" + r.customerId;
                  const regBoy = r.regularDeliveryBoy;
                  const isPendingOrRequested = r.status === "EXTRA_REQUESTED" || r.status === "PENDING";
                  const isAccepted = r.status === "CUSTOMER_ACCEPTED";

                  return (
                    <tr key={r.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      {/* Customer Details (Requirement 2) */}
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ fontWeight: "700", color: "#0f172a" }}>👤 {customerName}</div>
                        {r.customerAddress && (
                          <div style={{ fontSize: "12px", color: "#475569", marginTop: "2px" }}>
                            📍 {r.customerAddress} {r.customerPincode ? `(${r.customerPincode})` : ""}
                          </div>
                        )}
                        {r.customerPhone && (
                          <div style={{ fontSize: "11.5px", color: "#64748b" }}>📞 {r.customerPhone}</div>
                        )}
                      </td>

                      {/* Product (Requirement 2) */}
                      <td style={{ padding: "14px 16px", fontWeight: "600", color: "#1e293b" }}>
                        🥛 {r.productName || "Milk"}
                      </td>

                      {/* Requested Quantity (Requirement 2) */}
                      <td style={{ padding: "14px 16px", fontWeight: "800", color: "#0284c7" }}>
                        {r.extraQuantity} {r.productUnit || "L"}
                      </td>

                      {/* Offered / Accepted Quantity (Requirement 2 & 3) */}
                      <td style={{ padding: "14px 16px" }}>
                        {r.acceptedQuantity !== null && r.acceptedQuantity !== undefined ? (
                          <span style={{ fontWeight: "800", color: "#16a34a" }}>
                            ✅ Accepted: {r.acceptedQuantity} {r.productUnit || "L"}
                          </span>
                        ) : r.offeredQuantity !== null && r.offeredQuantity !== undefined ? (
                          <span style={{ fontWeight: "700", color: "#0369a1" }}>
                            💬 Offered: {r.offeredQuantity} {r.productUnit || "L"}
                          </span>
                        ) : (
                          <span style={{ color: "#94a3b8" }}>—</span>
                        )}
                      </td>

                      {/* Customer's Regular Delivery Boy (Requirement 2 & 6) */}
                      <td style={{ padding: "14px 16px" }}>
                        {regBoy ? (
                          <div>
                            <div style={{ fontWeight: "700", color: "#0f172a" }}>🚴 {regBoy.name}</div>
                            {regBoy.isOnLeave ? (
                              <div
                                style={{
                                  display: "inline-block",
                                  marginTop: "3px",
                                  padding: "2px 8px",
                                  borderRadius: "6px",
                                  background: "#fee2e2",
                                  color: "#991b1b",
                                  fontSize: "11px",
                                  fontWeight: "700",
                                }}
                              >
                                ⚠️ On Leave
                              </div>
                            ) : (
                              <div style={{ fontSize: "11px", color: "#16a34a", fontWeight: "600" }}>✓ Available</div>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: "#94a3b8", fontSize: "12px" }}>None assigned</span>
                        )}
                      </td>

                      {/* Delivery Date */}
                      <td style={{ padding: "14px 16px", fontWeight: "600", color: "#334155", whiteSpace: "nowrap" }}>
                        📅 {fmtDate(r.deliveryDate)}
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
                            border: `1px solid ${badge.border}`,
                          }}
                        >
                          {badge.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: "14px 16px", textAlign: "right", whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                          {/* Step 3: Offer Available Quantity */}
                          {isPendingOrRequested && (
                            <>
                              <button
                                onClick={() => openOfferModal(r)}
                                disabled={actionLoading}
                                style={{
                                  background: "linear-gradient(135deg, #0284c7, #0369a1)",
                                  color: "white",
                                  border: "none",
                                  padding: "6px 14px",
                                  borderRadius: "6px",
                                  fontSize: "12px",
                                  fontWeight: "700",
                                  cursor: "pointer",
                                  boxShadow: "0 2px 6px rgba(2, 132, 199, 0.3)",
                                }}
                              >
                                🥛 Offer Quantity
                              </button>
                              <button
                                onClick={() => openRejectModal(r.id)}
                                disabled={actionLoading}
                                style={{
                                  background: "#fee2e2",
                                  color: "#dc2626",
                                  border: "1px solid #fca5a5",
                                  padding: "6px 10px",
                                  borderRadius: "6px",
                                  fontSize: "12px",
                                  fontWeight: "700",
                                  cursor: "pointer",
                                }}
                              >
                                ✕
                              </button>
                            </>
                          )}

                          {/* Step 4: Admin Waiting for customer */}
                          {r.status === "ADMIN_OFFERED" && (
                            <span style={{ fontSize: "12px", color: "#64748b", fontStyle: "italic" }}>
                              Waiting for Customer acceptance...
                            </span>
                          )}

                          {/* Step 6: Customer Accepted -> Assign Delivery Boy */}
                          {isAccepted && (
                            <button
                              onClick={() => openAssignModal(r)}
                              disabled={actionLoading}
                              style={{
                                background: "linear-gradient(135deg, #4f46e5, #4338ca)",
                                color: "white",
                                border: "none",
                                padding: "7px 16px",
                                borderRadius: "6px",
                                fontSize: "12px",
                                fontWeight: "700",
                                cursor: "pointer",
                                boxShadow: "0 2px 6px rgba(79, 70, 229, 0.3)",
                              }}
                            >
                              🚴 Assign Delivery Boy
                            </button>
                          )}

                          {/* Assigned / Active */}
                          {r.assignedDeliveryBoy && (
                            <div style={{ fontSize: "12px", color: "#0f766e", fontWeight: "700" }}>
                              Assigned to: {r.assignedDeliveryBoy.name}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: OFFER AVAILABLE QUANTITY (Requirement 3) */}
      {/* ======================================================== */}
      {offerModal.isOpen && offerModal.request && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.6)",
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
              borderRadius: "16px",
              padding: "26px",
              width: "100%",
              maxWidth: "500px",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)",
            }}
          >
            <h3 style={{ margin: "0 0 8px 0", fontSize: "1.25rem", color: "#0f172a", fontWeight: "800" }}>
              🥛 Offer Available Quantity to Customer
            </h3>
            <p style={{ margin: "0 0 16px 0", fontSize: "13.5px", color: "#64748b" }}>
              Check available stock and propose an offered quantity. The customer will be asked to Accept or Reject.
            </p>

            {/* Request Summary Box */}
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "14px", marginBottom: "18px", fontSize: "13px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ color: "#64748b" }}>Customer:</span>
                <span style={{ fontWeight: "700", color: "#0f172a" }}>{offerModal.request.customer?.name}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ color: "#64748b" }}>Product:</span>
                <span style={{ fontWeight: "700", color: "#0f172a" }}>{offerModal.request.productName || "Milk"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ color: "#64748b" }}>Customer Requested Qty:</span>
                <span style={{ fontWeight: "800", color: "#0284c7", fontSize: "14px" }}>
                  {offerModal.request.extraQuantity} L
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b" }}>Delivery Date:</span>
                <span style={{ fontWeight: "700", color: "#0f172a" }}>{fmtDate(offerModal.request.deliveryDate)}</span>
              </div>
            </div>

            {/* Input: Available Quantity */}
            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#334155", marginBottom: "6px" }}>
                Available Stock / Quantity (L) <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={offerModal.availableQuantity}
                onChange={(e) => setOfferModal({ ...offerModal, availableQuantity: e.target.value })}
                placeholder="e.g. 3"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "14px",
                  outline: "none",
                  fontWeight: "700",
                }}
              />
            </div>

            {/* Input: Offered Quantity */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#334155", marginBottom: "6px" }}>
                Offered Quantity to Customer (L) <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                max={offerModal.request.extraQuantity}
                value={offerModal.offeredQuantity}
                onChange={(e) => setOfferModal({ ...offerModal, offeredQuantity: e.target.value })}
                placeholder="e.g. 3"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "14px",
                  outline: "none",
                  fontWeight: "700",
                }}
              />
              <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                ⚠️ Must be ≤ Available Quantity and ≤ Requested Quantity ({offerModal.request.extraQuantity}L).
              </div>
            </div>

            {/* Customer Message Preview */}
            <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "10px", padding: "12px", marginBottom: "20px", fontSize: "12.5px", color: "#1e40af" }}>
              💬 <strong>Customer will see:</strong> "તમારી requested quantity {offerModal.request.extraQuantity} L છે, પરંતુ હાલમાં માત્ર {offerModal.offeredQuantity || "..."} L available છે. શું તમે {offerModal.offeredQuantity || "..."} L Extra Delivery લેવા માંગો છો?"
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                onClick={() => setOfferModal({ isOpen: false, request: null, availableQuantity: "", offeredQuantity: "" })}
                style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", padding: "8px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmOffer}
                disabled={actionLoading}
                style={{ background: "linear-gradient(135deg, #0284c7, #0369a1)", color: "white", border: "none", padding: "8px 20px", borderRadius: "8px", fontSize: "13px", fontWeight: "700", cursor: "pointer" }}
              >
                {actionLoading ? "Sending..." : "Offer Available Quantity"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: ASSIGN DELIVERY BOY (Requirement 6) */}
      {/* ======================================================== */}
      {assignModal.isOpen && assignModal.request && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.6)",
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
              borderRadius: "16px",
              padding: "26px",
              width: "100%",
              maxWidth: "520px",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)",
            }}
          >
            <h3 style={{ margin: "0 0 8px 0", fontSize: "1.25rem", color: "#0f172a", fontWeight: "800" }}>
              🚴 Assign Delivery Boy for Extra Delivery
            </h3>
            <p style={{ margin: "0 0 16px 0", fontSize: "13.5px", color: "#64748b" }}>
              Customer has accepted <strong>{assignModal.request.acceptedQuantity} L</strong>. Assign Customer's regular delivery boy or an alternative available boy.
            </p>

            {/* Regular Delivery Boy Card */}
            {assignModal.request.regularDeliveryBoy ? (
              <div
                style={{
                  background: assignModal.request.regularDeliveryBoy.isOnLeave ? "#fff1f2" : "#f0fdf4",
                  border: `2px solid ${assignModal.request.regularDeliveryBoy.isOnLeave ? "#fecdd3" : "#86efac"}`,
                  borderRadius: "12px",
                  padding: "16px",
                  marginBottom: "18px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: "12px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>
                      Customer's Regular Delivery Boy
                    </div>
                    <div style={{ fontSize: "16px", fontWeight: "800", color: "#0f172a", marginTop: "2px" }}>
                      🚴 {assignModal.request.regularDeliveryBoy.name}
                    </div>
                  </div>
                  {assignModal.request.regularDeliveryBoy.isOnLeave ? (
                    <span style={{ padding: "4px 10px", borderRadius: "12px", background: "#ef4444", color: "white", fontSize: "11px", fontWeight: "800" }}>
                      ON LEAVE
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleConfirmAssign(assignModal.request.regularDeliveryBoy.id)}
                      disabled={actionLoading}
                      style={{
                        background: "#16a34a",
                        color: "white",
                        border: "none",
                        padding: "8px 16px",
                        borderRadius: "8px",
                        fontSize: "12.5px",
                        fontWeight: "700",
                        cursor: "pointer",
                      }}
                    >
                      Assign to {assignModal.request.regularDeliveryBoy.name}
                    </button>
                  )}
                </div>

                {assignModal.request.regularDeliveryBoy.isOnLeave && (
                  <div style={{ marginTop: "10px", fontSize: "12.5px", color: "#b91c1c", fontWeight: "600" }}>
                    ⚠️ {assignModal.request.regularDeliveryBoy.name} is on approved leave for this date. Cannot assign. Please select an alternative delivery boy below.
                  </div>
                )}
              </div>
            ) : (
              <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "8px", marginBottom: "16px", fontSize: "13px", color: "#64748b" }}>
                No regular delivery boy assigned to this customer yet. Please select an eligible delivery boy below.
              </div>
            )}

            {/* Select Alternative Delivery Boy */}
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#334155", marginBottom: "6px" }}>
                Select Delivery Boy:
              </label>
              <select
                value={assignModal.selectedBoyId}
                onChange={(e) => setAssignModal({ ...assignModal, selectedBoyId: e.target.value })}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "13.5px",
                  fontWeight: "600",
                  outline: "none",
                }}
              >
                <option value="">-- Choose Delivery Boy --</option>
                {deliveryBoys.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} {assignModal.request.regularDeliveryBoy?.id === b.id ? "(Regular Boy)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                onClick={() => setAssignModal({ isOpen: false, request: null, selectedBoyId: "" })}
                style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", padding: "8px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleConfirmAssign()}
                disabled={actionLoading || !assignModal.selectedBoyId}
                style={{
                  background: "linear-gradient(135deg, #4f46e5, #4338ca)",
                  color: "white",
                  border: "none",
                  padding: "8px 20px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: "700",
                  cursor: "pointer",
                }}
              >
                {actionLoading ? "Assigning..." : "Assign Selected Boy"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: REJECT MODAL */}
      {/* ======================================================== */}
      {rejectModal.isOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.6)",
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
              placeholder="e.g. Insufficient extra milk available on this date."
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
