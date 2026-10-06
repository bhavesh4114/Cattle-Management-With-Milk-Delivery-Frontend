import React, { useState, useEffect, useMemo } from "react";
import api from "../../../../services/api";

const MilkDeliveryRequestsCustomer = ({ onBack }) => {
  const [context, setContext] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ text: "", type: "" });
  const [editingId, setEditingId] = useState(null);

  // 2-day advance minimum date string (YYYY-MM-DD)
  const minDateStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split("T")[0];
  }, []);

  const [form, setForm] = useState({
    deliveryDate: minDateStr,
    requestType: "EXTRA_MILK", // "EXTRA_MILK" | "SKIP_DELIVERY"
    regularQuantity: 1,
    extraQuantity: 1,
    note: "",
    subscriptionId: null,
  });

  const showToast = (text, type = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast({ text: "", type: "" }), 4000);
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [ctxRes, reqsRes] = await Promise.all([
        api.get("/milk-delivery-requests/customer-context").catch(() => ({ data: {} })),
        api.get("/milk-delivery-requests/my").catch(() => ({ data: [] })),
      ]);

      setContext(ctxRes.data || {});
      setRequests(reqsRes.data || []);

      const regQty = ctxRes.data?.regularQuantity || 1;
      setForm((prev) => ({
        ...prev,
        regularQuantity: regQty,
        subscriptionId: ctxRes.data?.defaultSubscriptionId || null,
        deliveryDate: prev.deliveryDate || minDateStr,
      }));
    } catch (err) {
      console.error(err);
      showToast("Failed to load request data", "error");
    } finally {
      setLoading(false);
    }
  };

  // Calculated total quantity
  const totalQuantity = useMemo(() => {
    if (form.requestType === "SKIP_DELIVERY") return 0;
    const reg = parseFloat(form.regularQuantity) || 0;
    const ext = parseFloat(form.extraQuantity) || 0;
    return parseFloat((reg + ext).toFixed(2));
  }, [form.requestType, form.regularQuantity, form.extraQuantity]);

  // Check 2-day advance validity client-side
  const advanceCheck = useMemo(() => {
    if (!form.deliveryDate) return { valid: false, message: "Please select a delivery date." };
    const parts = form.deliveryDate.split("-").map(Number);
    const target = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    const now = new Date();
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const diffDays = Math.round((target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));

    if (diffDays < 0) {
      return { valid: false, message: "Delivery date cannot be in the past." };
    }
    if (diffDays < 2) {
      return {
        valid: false,
        message: `Must be submitted at least 2 days in advance (Selected date is in ${diffDays} day${diffDays === 1 ? "" : "s"}).`,
      };
    }
    return { valid: true, message: `Eligible: ${diffDays} days in advance.` };
  }, [form.deliveryDate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!advanceCheck.valid) {
      showToast(advanceCheck.message, "error");
      return;
    }
    if (form.requestType === "EXTRA_MILK" && (!form.extraQuantity || parseFloat(form.extraQuantity) <= 0)) {
      showToast("Extra milk quantity must be greater than 0", "error");
      return;
    }

    setSubmitting(true);
    try {
      if (editingId) {
        await api.put(`/milk-delivery-requests/${editingId}`, {
          deliveryDate: form.deliveryDate,
          requestType: form.requestType,
          regularQuantity: form.regularQuantity,
          extraQuantity: form.requestType === "EXTRA_MILK" ? form.extraQuantity : 0,
          note: form.note,
        });
        showToast("Request updated successfully!");
        setEditingId(null);
      } else {
        await api.post("/milk-delivery-requests", {
          deliveryDate: form.deliveryDate,
          requestType: form.requestType,
          regularQuantity: form.regularQuantity,
          extraQuantity: form.requestType === "EXTRA_MILK" ? form.extraQuantity : 0,
          note: form.note,
          subscriptionId: form.subscriptionId,
        });
        showToast("Milk delivery request submitted successfully!");
      }

      // Reset form
      setForm((prev) => ({
        ...prev,
        deliveryDate: minDateStr,
        requestType: "EXTRA_MILK",
        extraQuantity: 1,
        note: "",
      }));
      // Refresh requests list
      const updatedList = await api.get("/milk-delivery-requests/my");
      setRequests(updatedList.data || []);
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || err.message || "Submission failed", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (req) => {
    if (req.status !== "PENDING") {
      showToast(`Cannot edit request with status: ${req.status}`, "error");
      return;
    }
    setEditingId(req.id);
    const dateStr = new Date(req.deliveryDate).toISOString().split("T")[0];
    setForm({
      deliveryDate: dateStr,
      requestType: req.requestType,
      regularQuantity: req.regularQuantity,
      extraQuantity: req.extraQuantity || 1,
      note: req.note || "",
      subscriptionId: req.subscriptionId,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancel = async (id) => {
    if (!window.confirm("Are you sure you want to cancel this pending milk delivery request?")) return;
    try {
      await api.delete(`/milk-delivery-requests/${id}`);
      showToast("Request cancelled successfully");
      setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: "CANCELLED" } : r)));
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to cancel request", "error");
    }
  };

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
        return {
          bg: "#fef3c7",
          color: "#92400e",
          border: "#fde68a",
          label: "⏳ Pending Approval",
        };
      case "APPROVED":
        return {
          bg: "#dcfce7",
          color: "#166534",
          border: "#bbf7d0",
          label: "✅ Approved",
        };
      case "REJECTED":
        return {
          bg: "#fee2e2",
          color: "#991b1b",
          border: "#fecaca",
          label: "❌ Rejected",
        };
      case "CANCELLED":
        return {
          bg: "#f1f5f9",
          color: "#475569",
          border: "#e2e8f0",
          label: "Cancelled",
        };
      default:
        return {
          bg: "#f3f4f6",
          color: "#374151",
          border: "#e5e7eb",
          label: status,
        };
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
        Loading milk delivery requests...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "20px 16px", fontFamily: '"Inter", sans-serif' }}>
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

      {/* Header Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, #1e3a8a 0%, #0284c7 100%)",
          color: "white",
          borderRadius: "16px",
          padding: "24px 28px",
          marginBottom: "24px",
          boxShadow: "0 8px 24px rgba(2,132,199,0.2)",
          position: "relative",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h1 style={{ margin: "0 0 6px 0", fontSize: "1.65rem", fontWeight: "800" }}>
              🥛 Milk Delivery Request
            </h1>
            <p style={{ margin: 0, color: "#e0f2fe", fontSize: "0.95rem", maxWidth: "650px", lineHeight: "1.4" }}>
              Need extra milk for a special day, or not at home and want to skip delivery? Submit your request here{" "}
              <strong>at least 2 days in advance</strong>.
            </p>
          </div>
          {onBack && (
            <button
              onClick={onBack}
              style={{
                background: "rgba(255,255,255,0.2)",
                color: "white",
                border: "1px solid rgba(255,255,255,0.4)",
                padding: "8px 16px",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "600",
              }}
            >
              ← Back
            </button>
          )}
        </div>

        {/* 2-Day Advance Rule Notice */}
        <div
          style={{
            marginTop: "16px",
            background: "rgba(255,255,255,0.15)",
            backdropFilter: "blur(6px)",
            borderRadius: "10px",
            padding: "10px 14px",
            fontSize: "0.85rem",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span>ℹ️</span>
          <span>
            <strong>2-Day Advance Policy:</strong> Requests must be submitted at least 2 full days before the selected delivery date (Earliest date selectable: <strong>{fmtDate(minDateStr)}</strong>).
          </span>
        </div>
      </div>

      {/* Main Request Form */}
      <div
        style={{
          background: "white",
          borderRadius: "16px",
          border: "1px solid #e2e8f0",
          padding: "24px",
          marginBottom: "32px",
          boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ margin: 0, fontSize: "1.25rem", color: "#0f172a", fontWeight: "700" }}>
            {editingId ? "✏️ Edit Milk Delivery Request" : "➕ Create New Milk Delivery Request"}
          </h2>
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm({
                  deliveryDate: minDateStr,
                  requestType: "EXTRA_MILK",
                  regularQuantity: context?.regularQuantity || 1,
                  extraQuantity: 1,
                  note: "",
                  subscriptionId: context?.defaultSubscriptionId || null,
                });
              }}
              style={{
                background: "#f1f5f9",
                border: "1px solid #cbd5e1",
                padding: "6px 12px",
                borderRadius: "6px",
                fontSize: "12px",
                cursor: "pointer",
                fontWeight: "600",
              }}
            >
              Cancel Edit
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          {/* Request Type Selector */}
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "13.5px", fontWeight: "700", color: "#334155", marginBottom: "8px" }}>
              Request Type <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div
                onClick={() => setForm((prev) => ({ ...prev, requestType: "EXTRA_MILK" }))}
                style={{
                  border: form.requestType === "EXTRA_MILK" ? "2px solid #0284c7" : "1px solid #e2e8f0",
                  background: form.requestType === "EXTRA_MILK" ? "#f0f9ff" : "#f8fafc",
                  borderRadius: "12px",
                  padding: "16px",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "12px",
                }}
              >
                <div style={{ fontSize: "24px" }}>🥛</div>
                <div>
                  <div style={{ fontWeight: "700", color: "#0f172a", fontSize: "14.5px" }}>Extra Milk</div>
                  <div style={{ fontSize: "12.5px", color: "#64748b", marginTop: "2px" }}>
                    Need extra milk on a specific date for guests, events, or sweets.
                  </div>
                </div>
              </div>

              <div
                onClick={() => setForm((prev) => ({ ...prev, requestType: "SKIP_DELIVERY" }))}
                style={{
                  border: form.requestType === "SKIP_DELIVERY" ? "2px solid #ea580c" : "1px solid #e2e8f0",
                  background: form.requestType === "SKIP_DELIVERY" ? "#fff7ed" : "#f8fafc",
                  borderRadius: "12px",
                  padding: "16px",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "12px",
                }}
              >
                <div style={{ fontSize: "24px" }}>🏖️</div>
                <div>
                  <div style={{ fontWeight: "700", color: "#0f172a", fontSize: "14.5px" }}>Skip Delivery / Not at Home</div>
                  <div style={{ fontSize: "12.5px", color: "#64748b", marginTop: "2px" }}>
                    Traveling or not at home? Pause delivery for this specific date.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "18px", marginBottom: "20px" }}>
            {/* Delivery Date */}
            <div>
              <label style={{ display: "block", fontSize: "13.5px", fontWeight: "700", color: "#334155", marginBottom: "6px" }}>
                Delivery Date <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                type="date"
                min={minDateStr}
                value={form.deliveryDate}
                onChange={(e) => setForm({ ...form, deliveryDate: e.target.value })}
                required
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: advanceCheck.valid ? "1px solid #cbd5e1" : "1px solid #ef4444",
                  fontSize: "14px",
                  background: "#ffffff",
                  outline: "none",
                }}
              />
              <div
                style={{
                  fontSize: "11.5px",
                  marginTop: "4px",
                  color: advanceCheck.valid ? "#16a34a" : "#dc2626",
                  fontWeight: "600",
                }}
              >
                {advanceCheck.message}
              </div>
            </div>

            {/* Current Regular Milk Quantity */}
            <div>
              <label style={{ display: "block", fontSize: "13.5px", fontWeight: "700", color: "#334155", marginBottom: "6px" }}>
                Current Regular Quantity
              </label>
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  background: "#f8fafc",
                  fontSize: "14px",
                  color: "#334155",
                  fontWeight: "700",
                }}
              >
                {form.regularQuantity} Liter(s) ({context?.milkType || "Milk"})
              </div>
              <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "4px" }}>
                From your daily subscription
              </div>
            </div>

            {/* Extra Quantity (Only for Extra Milk) */}
            {form.requestType === "EXTRA_MILK" && (
              <div>
                <label style={{ display: "block", fontSize: "13.5px", fontWeight: "700", color: "#334155", marginBottom: "6px" }}>
                  Extra Quantity to Add <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={form.extraQuantity}
                    onChange={(e) => setForm({ ...form, extraQuantity: parseFloat(e.target.value) || 0 })}
                    required
                    style={{
                      flex: 1,
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "14px",
                      outline: "none",
                    }}
                  />
                  <span style={{ fontWeight: "700", color: "#475569" }}>Liter(s)</span>
                </div>
                {/* Presets */}
                <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
                  {[0.5, 1, 1.5, 2].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setForm({ ...form, extraQuantity: preset })}
                      style={{
                        background: form.extraQuantity === preset ? "#0284c7" : "#f1f5f9",
                        color: form.extraQuantity === preset ? "white" : "#334155",
                        border: "1px solid #cbd5e1",
                        padding: "3px 8px",
                        borderRadius: "6px",
                        fontSize: "11.5px",
                        cursor: "pointer",
                        fontWeight: "600",
                      }}
                    >
                      +{preset}L
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Dynamic Real-Time Calculation Card */}
          <div
            style={{
              background: form.requestType === "EXTRA_MILK" ? "#f0fdf4" : "#fff7ed",
              border: form.requestType === "EXTRA_MILK" ? "1px solid #bbf7d0" : "1px solid #fed7aa",
              borderRadius: "12px",
              padding: "14px 18px",
              marginBottom: "20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "10px",
            }}
          >
            <div>
              <div style={{ fontSize: "12.5px", color: "#64748b", fontWeight: "600" }}>
                Delivery Summary for {fmtDate(form.deliveryDate)}:
              </div>
              <div style={{ fontSize: "14.5px", fontWeight: "700", color: "#0f172a", marginTop: "2px" }}>
                {form.requestType === "EXTRA_MILK" ? (
                  <>
                    Regular Quantity ({form.regularQuantity}L) + Extra Quantity ({form.extraQuantity}L) ={" "}
                    <span style={{ color: "#166534", fontSize: "16px" }}>{totalQuantity} Liters Total</span>
                  </>
                ) : (
                  <>
                    <span style={{ color: "#c2410c" }}>🚫 SKIPPED – Customer Not At Home</span>
                    <span style={{ fontSize: "13px", color: "#64748b", marginLeft: "6px" }}>
                      (No milk delivered on this date, Quantity: 0L)
                    </span>
                  </>
                )}
              </div>
            </div>
            <div
              style={{
                fontSize: "1.25rem",
                fontWeight: "800",
                color: form.requestType === "EXTRA_MILK" ? "#166534" : "#c2410c",
                background: "white",
                padding: "6px 16px",
                borderRadius: "8px",
                border: "1px solid rgba(0,0,0,0.06)",
              }}
            >
              {form.requestType === "EXTRA_MILK" ? `${totalQuantity} L` : "0 L (Skipped)"}
            </div>
          </div>

          {/* Optional Note / Reason */}
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "13.5px", fontWeight: "700", color: "#334155", marginBottom: "6px" }}>
              Optional Note / Reason
            </label>
            <input
              type="text"
              placeholder={
                form.requestType === "EXTRA_MILK"
                  ? "e.g. Guests visiting, need extra milk for dessert"
                  : "e.g. Visiting hometown for 2 days"
              }
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "14px",
                outline: "none",
              }}
            />
          </div>

          <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
            <button
              type="submit"
              disabled={submitting || !advanceCheck.valid}
              style={{
                background: !advanceCheck.valid ? "#94a3b8" : form.requestType === "EXTRA_MILK" ? "#0284c7" : "#ea580c",
                color: "white",
                border: "none",
                padding: "12px 28px",
                borderRadius: "8px",
                fontSize: "14.5px",
                fontWeight: "700",
                cursor: advanceCheck.valid ? "pointer" : "not-allowed",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                transition: "all 0.15s ease",
              }}
            >
              {submitting ? "Submitting..." : editingId ? "Save Changes" : "Submit Request"}
            </button>
          </div>
        </form>
      </div>

      {/* Requests History */}
      <div
        style={{
          background: "white",
          borderRadius: "16px",
          border: "1px solid #e2e8f0",
          padding: "24px",
          boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
        }}
      >
        <h2 style={{ margin: "0 0 16px 0", fontSize: "1.25rem", color: "#0f172a", fontWeight: "700" }}>
          📜 My Milk Delivery Request History
        </h2>

        {requests.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "#64748b", background: "#f8fafc", borderRadius: "12px" }}>
            <div style={{ fontSize: "36px", marginBottom: "8px" }}>🥛</div>
            <div style={{ fontWeight: "700", color: "#334155" }}>No requests submitted yet.</div>
            <div style={{ fontSize: "13px", marginTop: "4px" }}>
              Use the form above to request extra milk or pause delivery at least 2 days ahead.
            </div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13.5px" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0", textAlign: "left", color: "#475569" }}>
                  <th style={{ padding: "12px 14px" }}>Delivery Date</th>
                  <th style={{ padding: "12px 14px" }}>Request Type</th>
                  <th style={{ padding: "12px 14px" }}>Regular Qty</th>
                  <th style={{ padding: "12px 14px" }}>Extra Qty</th>
                  <th style={{ padding: "12px 14px" }}>Total Qty</th>
                  <th style={{ padding: "12px 14px" }}>Note</th>
                  <th style={{ padding: "12px 14px" }}>Status</th>
                  <th style={{ padding: "12px 14px", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => {
                  const badge = getStatusBadge(r.status);
                  const isSkip = r.requestType === "SKIP_DELIVERY";
                  return (
                    <tr key={r.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                      <td style={{ padding: "12px 14px", fontWeight: "700", color: "#0f172a" }}>
                        📅 {fmtDate(r.deliveryDate)}
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            padding: "3px 9px",
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
                      <td style={{ padding: "12px 14px", color: "#334155" }}>{r.regularQuantity} L</td>
                      <td style={{ padding: "12px 14px", color: isSkip ? "#94a3b8" : "#0284c7", fontWeight: isSkip ? "normal" : "700" }}>
                        {isSkip ? "—" : `+${r.extraQuantity} L`}
                      </td>
                      <td style={{ padding: "12px 14px", fontWeight: "800", color: isSkip ? "#c2410c" : "#166534" }}>
                        {isSkip ? "0 L" : `${r.totalQuantity} L`}
                      </td>
                      <td style={{ padding: "12px 14px", color: "#64748b", maxWidth: "200px" }}>
                        {r.note || "—"}
                        {r.rejectedReason && (
                          <div style={{ color: "#b91c1c", fontSize: "11px", marginTop: "2px" }}>
                            Rejection Reason: {r.rejectedReason}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <span
                          style={{
                            padding: "4px 10px",
                            borderRadius: "20px",
                            fontSize: "11.5px",
                            fontWeight: "700",
                            background: badge.bg,
                            color: badge.color,
                            border: `1px solid ${badge.border}`,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "right" }}>
                        {r.status === "PENDING" && (
                          <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                            <button
                              onClick={() => handleEdit(r)}
                              style={{
                                background: "#f8fafc",
                                border: "1px solid #cbd5e1",
                                padding: "4px 10px",
                                borderRadius: "6px",
                                fontSize: "12px",
                                cursor: "pointer",
                                fontWeight: "600",
                                color: "#0f172a",
                              }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleCancel(r.id)}
                              style={{
                                background: "#fee2e2",
                                border: "1px solid #fecaca",
                                padding: "4px 10px",
                                borderRadius: "6px",
                                fontSize: "12px",
                                cursor: "pointer",
                                fontWeight: "600",
                                color: "#991b1b",
                              }}
                            >
                              Cancel
                            </button>
                          </div>
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
    </div>
  );
};

export default MilkDeliveryRequestsCustomer;
